# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Performance & security tests for the classes API.

Performance: P1 index on ScheduledSession.status; P4 pagination envelope
on /api/classes/sessions/ (default limit 50) with a constant query count.
Security: sessions are private to the authenticated user.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from classes.models import ScheduledSession

User = get_user_model()


def make_user(username, role='STUDENT'):
    return User.objects.create_user(
        username=username, email=f'{username}@test.com', password='pass12345', role=role,
    )


def make_sessions(student, tutor, n):
    now = timezone.now()
    ScheduledSession.objects.bulk_create([
        ScheduledSession(
            student=student, tutor=tutor,
            scheduled_at=now + timezone.timedelta(days=i),
            duration=40, fee_amount=1000, status='PENDING',
        )
        for i in range(n)
    ])


class ScheduledSessionIndexTests(TestCase):
    """P1: status is a hot filter column and must stay indexed."""

    def test_status_field_is_indexed(self):
        self.assertTrue(ScheduledSession._meta.get_field('status').db_index)


class SessionListPaginationTests(TestCase):
    """P4: /api/classes/sessions/ returns a paginated envelope, default limit 50."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.student = make_user('student1', role='STUDENT')
        self.tutor = make_user('tutor1', role='TUTOR')

    def test_response_is_paginated_envelope(self):
        make_sessions(self.student, self.tutor, 3)
        self.client.force_authenticate(self.student)
        body = self.client.get('/api/classes/sessions/').json()
        self.assertIsInstance(body, dict)
        for key in ('count', 'next', 'previous', 'results'):
            self.assertIn(key, body)
        self.assertEqual(body['count'], 3)
        self.assertEqual(len(body['results']), 3)

    def test_default_limit_caps_results_at_50(self):
        make_sessions(self.student, self.tutor, 55)
        self.client.force_authenticate(self.student)
        body = self.client.get('/api/classes/sessions/').json()
        self.assertEqual(body['count'], 55)
        self.assertEqual(len(body['results']), 50)
        self.assertIsNotNone(body['next'])

    def test_query_count_constant_as_sessions_grow(self):
        """P3: select_related on student/tutor/tutor_profile/subject prevents N+1."""
        self.client.force_authenticate(self.student)
        make_sessions(self.student, self.tutor, 2)
        with CaptureQueriesContext(connection) as ctx_small:
            self.assertEqual(self.client.get('/api/classes/sessions/').status_code, 200)

        make_sessions(self.student, self.tutor, 10)
        with CaptureQueriesContext(connection) as ctx_large:
            self.assertEqual(self.client.get('/api/classes/sessions/').status_code, 200)

        self.assertEqual(len(ctx_small.captured_queries), len(ctx_large.captured_queries))


class SessionListSecurityTests(TestCase):
    """Sessions are per-user; anonymous access is rejected."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.student = make_user('student1', role='STUDENT')
        self.other_student = make_user('student2', role='STUDENT')
        self.tutor = make_user('tutor1', role='TUTOR')
        make_sessions(self.student, self.tutor, 2)

    def test_anonymous_rejected(self):
        res = self.client.get('/api/classes/sessions/')
        self.assertIn(res.status_code, (401, 403))

    def test_user_sees_only_own_sessions(self):
        self.client.force_authenticate(self.other_student)
        body = self.client.get('/api/classes/sessions/').json()
        self.assertEqual(body['count'], 0)

    def test_tutor_sees_sessions_they_teach(self):
        self.client.force_authenticate(self.tutor)
        body = self.client.get('/api/classes/sessions/').json()
        self.assertEqual(body['count'], 2)

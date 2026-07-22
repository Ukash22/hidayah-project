# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Performance & security tests for the tutors API.

Performance: response caching on the public list, constant query counts
(N+1 regression guards) on list and admin_list, opt-in pagination shape.
Security: admin workflow endpoints require staff; profile updates require
ownership; no credential leakage in list payloads.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from tutors.models import TutorProfile

User = get_user_model()


def make_tutor(i, status='APPROVED'):
    user = User.objects.create_user(
        username=f'tutor{i}', email=f'tutor{i}@test.com', password='pass12345',
        role='TUTOR', first_name=f'Tutor{i}', last_name='Test',
    )
    return TutorProfile.objects.create(
        user=user,
        status=status,
        subjects_to_teach='Mathematics, Quranic Recitation',
        availability_days='Monday, Wednesday',
        availability_hours='9 AM - 5 PM',
        hourly_rate=2000,
    )


def make_user(username, role='STUDENT'):
    return User.objects.create_user(
        username=username, email=f'{username}@test.com', password='pass12345', role=role,
    )


class TutorListCachingTests(TestCase):
    """P8: GET /api/tutors/ is cached for 5 minutes per query-string variant."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        for i in range(3):
            make_tutor(i)

    def test_list_populates_cache(self):
        res = self.client.get('/api/tutors/')
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(cache.get('tutor_list:'))

    def test_second_request_served_from_cache_without_db_queries(self):
        first = self.client.get('/api/tutors/')
        self.assertEqual(first.status_code, 200)
        with self.assertNumQueries(0):
            second = self.client.get('/api/tutors/')
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json(), first.json())

    def test_cache_key_varies_by_query_string(self):
        self.client.get('/api/tutors/')
        self.client.get('/api/tutors/?search=nomatchxyz')
        self.assertIsNotNone(cache.get('tutor_list:'))
        self.assertIsNotNone(cache.get('tutor_list:search=nomatchxyz'))
        self.assertNotEqual(
            len(cache.get('tutor_list:')),
            len(cache.get('tutor_list:search=nomatchxyz')),
        )

    def test_only_approved_tutors_listed(self):
        make_tutor(99, status='APPLIED')
        res = self.client.get('/api/tutors/')
        self.assertEqual(len(res.json()), 3)


class TutorListQueryCountTests(TestCase):
    """P3/P4: query count must not grow with the number of tutors (N+1 guard)."""

    def _query_count(self, client, url):
        cache.clear()
        with CaptureQueriesContext(connection) as ctx:
            res = client.get(url)
        self.assertEqual(res.status_code, 200)
        return len(ctx.captured_queries)

    def test_public_list_query_count_is_constant(self):
        client = APIClient()
        for i in range(2):
            make_tutor(i)
        count_small = self._query_count(client, '/api/tutors/')

        for i in range(2, 10):
            make_tutor(i)
        count_large = self._query_count(client, '/api/tutors/')

        self.assertEqual(count_small, count_large)

    def test_admin_list_query_count_is_constant(self):
        client = APIClient()
        client.force_authenticate(make_user('admin1', role='ADMIN'))
        for i in range(2):
            make_tutor(i)
        count_small = self._query_count(client, '/api/tutors/admin/list/')

        for i in range(2, 10):
            make_tutor(i)
        count_large = self._query_count(client, '/api/tutors/admin/list/')

        self.assertEqual(count_small, count_large)


class TutorPaginationTests(TestCase):
    """P4: pagination on /api/tutors/ is opt-in — no envelope without ?limit=."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        for i in range(5):
            make_tutor(i)

    def test_default_response_is_plain_array(self):
        res = self.client.get('/api/tutors/')
        self.assertIsInstance(res.json(), list)
        self.assertEqual(len(res.json()), 5)

    def test_limit_param_returns_paginated_envelope(self):
        res = self.client.get('/api/tutors/?limit=2')
        body = res.json()
        self.assertIsInstance(body, dict)
        self.assertEqual(body['count'], 5)
        self.assertEqual(len(body['results']), 2)


class TutorAdminEndpointSecurityTests(TestCase):
    """Admin workflow endpoints must reject anonymous and non-staff users."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.tutor = make_tutor(0, status='APPLIED')
        self.student = make_user('student1', role='STUDENT')
        self.admin = make_user('admin1', role='ADMIN')

    def test_admin_list_rejects_anonymous(self):
        res = self.client.get('/api/tutors/admin/list/')
        self.assertIn(res.status_code, (401, 403))

    def test_admin_list_rejects_student(self):
        self.client.force_authenticate(self.student)
        res = self.client.get('/api/tutors/admin/list/')
        self.assertEqual(res.status_code, 403)

    def test_admin_list_allows_staff(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get('/api/tutors/admin/list/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

    def test_admin_action_rejects_student(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(
            f'/api/tutors/admin/action/{self.tutor.id}/', {'action': 'APPROVE'}, format='json',
        )
        self.assertEqual(res.status_code, 403)
        self.tutor.refresh_from_db()
        self.assertEqual(self.tutor.status, 'APPLIED')

    def test_manage_rejects_student_wallet_credit(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(
            f'/api/tutors/{self.tutor.id}/manage/',
            {'action': 'CREDIT', 'amount': 99999, 'description': 'nope'},
            format='json',
        )
        self.assertEqual(res.status_code, 403)
        from payments.models import Wallet
        wallet = Wallet.objects.filter(user=self.tutor.user).first()
        if wallet is not None:
            self.assertEqual(float(wallet.balance), 0.0)

    def test_assign_rejects_student(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(
            '/api/tutors/assign/', {'student_id': 1, 'tutor_id': self.tutor.id}, format='json',
        )
        self.assertEqual(res.status_code, 403)

    def test_direct_update_rejects_non_staff(self):
        self.client.force_authenticate(self.student)
        res = self.client.patch(
            f'/api/tutors/{self.tutor.id}/', {'hourly_rate': 1}, format='json',
        )
        self.assertEqual(res.status_code, 403)


class TutorProfileOwnershipTests(TestCase):
    """update_profile: a tutor may only edit their own profile."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.tutor_a = make_tutor(1)
        self.tutor_b = make_tutor(2)

    def test_tutor_cannot_update_another_tutors_profile(self):
        self.client.force_authenticate(self.tutor_a.user)
        res = self.client.patch(
            f'/api/tutors/{self.tutor_b.id}/update_profile/', {'hourly_rate': 1}, format='json',
        )
        self.assertEqual(res.status_code, 403)
        self.tutor_b.refresh_from_db()
        self.assertEqual(float(self.tutor_b.hourly_rate), 2000.0)

    def test_tutor_can_update_own_profile(self):
        self.client.force_authenticate(self.tutor_a.user)
        res = self.client.patch(
            f'/api/tutors/{self.tutor_a.id}/update_profile/', {'bio': 'Updated bio'}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.tutor_a.refresh_from_db()
        self.assertEqual(self.tutor_a.bio, 'Updated bio')

    def test_anonymous_cannot_update_profile(self):
        res = self.client.patch(
            f'/api/tutors/{self.tutor_a.id}/update_profile/', {'bio': 'x'}, format='json',
        )
        self.assertIn(res.status_code, (401, 403))


class TutorRegistrationTests(TestCase):
    """Registration endpoint contract (now backed by TutorRegisterSerializer):
    201 + user/profile/slots on success; legacy {'detail': msg} on errors."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.payload = {
            'username': 'newtutor', 'email': 'newtutor@test.com', 'password': 'pass12345',
            'first_name': 'New', 'last_name': 'Tutor',
            'subjects_to_teach': 'Mathematics', 'hourly_rate': 2500,
            'availabilitySlots': [{'day': 'Monday', 'startTime': '09:00', 'endTime': '11:00'}],
        }

    def test_successful_registration_creates_user_profile_and_slots(self):
        res = self.client.post('/api/tutors/register/', self.payload, format='json')
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(username='newtutor')
        self.assertEqual(user.role, 'TUTOR')
        profile = TutorProfile.objects.get(user=user)
        self.assertEqual(profile.subjects_to_teach, 'Mathematics')
        self.assertEqual(profile.availability_days, 'Monday')
        self.assertEqual(profile.availabilities.count(), 1)

    def test_duplicate_username_rejected_with_legacy_detail_shape(self):
        self.client.post('/api/tutors/register/', self.payload, format='json')
        res = self.client.post('/api/tutors/register/', {**self.payload, 'email': 'other@test.com'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('already taken', res.json()['detail'])

    def test_missing_password_rejected(self):
        payload = {k: v for k, v in self.payload.items() if k != 'password'}
        res = self.client.post('/api/tutors/register/', payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('detail', res.json())


class TutorAvailabilityTests(TestCase):
    """PUT /api/tutors/me/availability/ — tutors edit their own slots post-registration."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.tutor = make_tutor(1)
        from tutors.models import TutorAvailability
        TutorAvailability.objects.create(tutor=self.tutor, day='MONDAY', start_time='09:00', end_time='11:00')

    def test_replace_slots(self):
        self.client.force_authenticate(self.tutor.user)
        res = self.client.put('/api/tutors/me/availability/', {'slots': [
            {'day': 'Tuesday', 'start_time': '10:00', 'end_time': '12:00'},
            {'day': 'Thursday', 'start_time': '14:00', 'end_time': '16:00'},
        ]}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.tutor.refresh_from_db()
        days = set(self.tutor.availabilities.values_list('day', flat=True))
        self.assertEqual(days, {'TUESDAY', 'THURSDAY'})
        self.assertIn('Tuesday', self.tutor.availability_days)

    def test_empty_slots_rejected_and_existing_kept(self):
        self.client.force_authenticate(self.tutor.user)
        res = self.client.put('/api/tutors/me/availability/', {'slots': []}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.tutor.availabilities.count(), 1)

    def test_anonymous_rejected(self):
        res = self.client.put('/api/tutors/me/availability/', {'slots': []}, format='json')
        self.assertIn(res.status_code, (401, 403))


class TutorPayloadLeakageTests(TestCase):
    """List payloads must not expose credentials or private financials."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        make_tutor(0)

    def test_no_password_or_wallet_in_public_list(self):
        res = self.client.get('/api/tutors/')
        body = res.content.decode().lower()
        self.assertNotIn('password', body)
        self.assertNotIn('wallet_balance', body)

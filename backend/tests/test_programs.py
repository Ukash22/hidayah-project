# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Performance & security tests for the programs API.

Performance: P8 caching of the programme catalogue (10-min TTL) with
write-through invalidation.
Security: catalogue writes are admin-only; reads are public.

Note: the catalogue is served at /api/programs/list/ (router prefix 'list').
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from programs.models import Program

User = get_user_model()


def make_user(username, role='STUDENT'):
    return User.objects.create_user(
        username=username, email=f'{username}@test.com', password='pass12345', role=role,
    )


class ProgramCachingTests(TestCase):
    """P8: GET /api/programs/list/ is cached and invalidated on writes."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        Program.objects.create(name='Hifz', program_type='ISLAMIC')

    def test_list_populates_cache(self):
        res = self.client.get('/api/programs/list/')
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(cache.get('program_list'))

    def test_second_request_served_from_cache_without_db_queries(self):
        first = self.client.get('/api/programs/list/')
        with self.assertNumQueries(0):
            second = self.client.get('/api/programs/list/')
        self.assertEqual(second.json(), first.json())

    def test_create_invalidates_cache(self):
        self.client.get('/api/programs/list/')
        self.assertIsNotNone(cache.get('program_list'))

        admin_client = APIClient()
        admin_client.force_authenticate(make_user('admin1', role='ADMIN'))
        res = admin_client.post(
            '/api/programs/list/', {'name': 'JAMB Prep', 'program_type': 'EXAM_PREP'}, format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(cache.get('program_list'))

        names = [p['name'] for p in self.client.get('/api/programs/list/').json()]
        self.assertIn('JAMB Prep', names)


class ProgramSecurityTests(TestCase):
    """Reads are public; writes require staff."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.program = Program.objects.create(name='Hifz', program_type='ISLAMIC')

    def test_anonymous_can_read(self):
        self.assertEqual(self.client.get('/api/programs/list/').status_code, 200)

    def test_anonymous_cannot_create(self):
        res = self.client.post(
            '/api/programs/list/', {'name': 'X', 'program_type': 'WESTERN'}, format='json',
        )
        self.assertIn(res.status_code, (401, 403))

    def test_student_cannot_create(self):
        self.client.force_authenticate(make_user('student1', role='STUDENT'))
        res = self.client.post(
            '/api/programs/list/', {'name': 'X', 'program_type': 'WESTERN'}, format='json',
        )
        self.assertEqual(res.status_code, 403)

    def test_student_cannot_delete(self):
        self.client.force_authenticate(make_user('student2', role='STUDENT'))
        res = self.client.delete(f'/api/programs/list/{self.program.id}/')
        self.assertEqual(res.status_code, 403)

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Performance & security tests for the students API.

Performance: P1 index on StudentProfile.payment_status.
Security: student profile endpoints require authentication.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from students.models import StudentProfile


class StudentProfileIndexTests(TestCase):
    """P1: payment_status is a hot filter column and must stay indexed."""

    def test_payment_status_field_is_indexed(self):
        self.assertTrue(StudentProfile._meta.get_field('payment_status').db_index)


class StudentEndpointSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_me_endpoint_rejects_anonymous(self):
        res = self.client.get('/api/students/me/')
        self.assertIn(res.status_code, (401, 403))


class StudentProgressViewTests(TestCase):
    """GET /api/students/me/progress/ returns attendance + score_trend."""

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.client = APIClient()
        self.student = User.objects.create_user(
            username='progstudent', email='prog@test.com', password='pass12345', role='STUDENT'
        )
        StudentProfile.objects.get_or_create(user=self.student)

    def _login(self):
        res = self.client.post('/api/auth/login/', {'username': 'progstudent', 'password': 'pass12345'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_progress_returns_expected_keys(self):
        self._login()
        res = self.client.get('/api/students/me/progress/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('attendance', res.data)
        self.assertIn('score_trend', res.data)
        self.assertIn('subject_breakdown', res.data)

    def test_progress_attendance_zero_for_new_student(self):
        self._login()
        res = self.client.get('/api/students/me/progress/')
        att = res.data['attendance']
        self.assertEqual(att['total'], 0)
        self.assertEqual(att['rate'], 0)

    def test_progress_rejects_anonymous(self):
        res = self.client.get('/api/students/me/progress/')
        self.assertIn(res.status_code, (401, 403))

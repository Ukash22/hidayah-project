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


class AdminStudentListRegressionTests(TestCase):
    """Regression tests for GET /api/students/admin/all/."""

    def setUp(self):
        from django.contrib.auth import get_user_model
        from tutors.models import TutorProfile
        User = get_user_model()
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            username='admin_reg', email='admin_reg@test.com', password='adminpass123'
        )

        # Tutor with empty subjects_to_teach (created via admin panel)
        self.tutor = User.objects.create_user(
            username='tutor_reg', email='tutor_reg@test.com', password='tutorpass123', role='TUTOR'
        )
        self.tutor_profile = TutorProfile.objects.create(
            user=self.tutor,
            status='APPROVED',
            subjects_to_teach='',
            availability_days='',
            availability_hours='',
            experience_years=0,
            mode='ONLINE',
        )

        # Student assigned to this tutor
        self.student = User.objects.create_user(
            username='student_reg', email='student_reg@test.com', password='stupass123', role='STUDENT'
        )
        self.student_profile = StudentProfile.objects.get_or_create(
            user=self.student,
            defaults={
                'approval_status': 'APPROVED',
                'payment_status': 'PAID',
                'assigned_tutor': self.tutor,
            }
        )[0]
        self.student_profile.assigned_tutor = self.tutor
        self.student_profile.save()

    def test_admin_student_list_with_empty_subjects_to_teach(self):
        """Ensure serialization does not fail with 500 when assigned tutor has empty subjects_to_teach."""
        res = self.client.post('/api/auth/login/', {'username': 'admin_reg', 'password': 'adminpass123'})
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

        res = self.client.get('/api/students/admin/all/')
        self.assertEqual(res.status_code, 200)
        data = res.data if isinstance(res.data, list) else res.data.get('results', [])
        found = next((s for s in data if s['id'] == self.student_profile.id), None)
        self.assertIsNotNone(found)
        self.assertEqual(found['assigned_tutor_details']['subjects'], '')

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
S4 — JWT storage hardening tests.

The refresh token must travel only in an httpOnly cookie (never the response
body); the refresh endpoint must accept it from the cookie; logout must clear
it. Legacy clients may still send `refresh` in the body.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.views import REFRESH_COOKIE

User = get_user_model()


class StudentRegistrationTests(TestCase):
    """Happy path through RegisterSerializer — the frontend Register wizard
    payload creates the user, profile, and subject enrollments."""

    def _payload(self, **overrides):
        base = {
            'username': 'newstudent', 'email': 'newstudent@test.com',
            'password': 'pass12345', 'role': 'STUDENT',
            'first_name': 'New', 'last_name': 'Student', 'gender': 'Male',
            'class_type': 'ONE_ON_ONE', 'level': 'PRIMARY',
            'days_per_week': 2, 'hours_per_week': 2.0,
            'preferred_days': 'Monday,Wednesday', 'preferred_time_exact': '09:00,10:00',
            'subject_enrollments': [{'subject': 'Mathematics', 'preferred_tutor_id': None}],
            'total_amount': 0,
        }
        base.update(overrides)
        return base

    def test_registration_creates_user_profile_and_enrollment(self):
        from students.models import StudentProfile, Enrollment
        from programs.models import Program, Subject
        program = Program.objects.create(name='Western', program_type='WESTERN')
        Subject.objects.create(program=program, name='Mathematics')

        res = APIClient().post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(res.status_code, 201, res.content)
        user = User.objects.get(username='newstudent')
        self.assertEqual(user.role, 'STUDENT')
        profile = StudentProfile.objects.get(user=user)
        self.assertTrue(Enrollment.objects.filter(student=profile, subject__name='Mathematics').exists())

    def test_registration_with_unknown_subject_still_succeeds(self):
        # Regression: an unknown subject used to raise inside the atomic block
        # and abort the entire registration. It must now be skipped gracefully.
        from students.models import StudentProfile
        payload = self._payload(subject_enrollments=[{'subject': 'No Such Subject', 'preferred_tutor_id': None}])
        res = APIClient().post('/api/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(StudentProfile.objects.filter(user__username='newstudent').exists())

    def test_duplicate_username_rejected(self):
        APIClient().post('/api/auth/register/', self._payload(), format='json')
        res = APIClient().post('/api/auth/register/', self._payload(email='other@test.com'), format='json')
        self.assertEqual(res.status_code, 400)


class CookieAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='student1', email='s1@test.com', password='pass12345', role='STUDENT',
        )

    def _login(self):
        return self.client.post(
            '/api/auth/login/', {'username': 'student1', 'password': 'pass12345'}, format='json',
        )

    def test_login_sets_httponly_refresh_cookie(self):
        res = self._login()
        self.assertEqual(res.status_code, 200)
        cookie = res.cookies.get(REFRESH_COOKIE)
        self.assertIsNotNone(cookie)
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['path'], '/api/auth/')

    def test_login_body_contains_access_but_never_refresh(self):
        body = self._login().json()
        self.assertIn('access', body)
        self.assertIn('user', body)
        self.assertNotIn('refresh', body)

    def test_refresh_works_from_cookie_alone(self):
        self._login()  # APIClient retains the cookie
        res = self.client.post('/api/auth/refresh/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.json())

    def test_refresh_still_accepts_body_token_for_legacy_clients(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = str(RefreshToken.for_user(self.user))
        fresh_client = APIClient()
        res = fresh_client.post('/api/auth/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.json())

    def test_refresh_without_any_token_rejected(self):
        res = APIClient().post('/api/auth/refresh/', {}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_logout_clears_cookie(self):
        self._login()
        res = self.client.post('/api/auth/logout/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        cookie = res.cookies.get(REFRESH_COOKIE)
        self.assertIsNotNone(cookie)
        self.assertEqual(cookie.value, '')

        # cookie gone -> refresh must now fail
        res = self.client.post('/api/auth/refresh/', {}, format='json')
        self.assertEqual(res.status_code, 401)

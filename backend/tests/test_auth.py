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

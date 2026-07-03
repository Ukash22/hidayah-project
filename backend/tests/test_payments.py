# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Performance & security tests for the payments API.

Performance: P8 caching of the admin analytics endpoint (5-min TTL).
Security: admin financial endpoints reject anonymous and non-staff users.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


def make_user(username, role='STUDENT'):
    return User.objects.create_user(
        username=username, email=f'{username}@test.com', password='pass12345', role=role,
    )


class AdminAnalyticsCachingTests(TestCase):
    """P8: GET /api/payments/admin/analytics/ is cached for 5 minutes."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.force_authenticate(make_user('admin1', role='ADMIN'))

    def test_first_request_populates_cache(self):
        res = self.client.get('/api/payments/admin/analytics/')
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(cache.get('admin_payment_analytics'))

    def test_second_request_served_from_cache_without_db_queries(self):
        first = self.client.get('/api/payments/admin/analytics/')
        self.assertEqual(first.status_code, 200)
        with self.assertNumQueries(0):
            second = self.client.get('/api/payments/admin/analytics/')
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json(), first.json())


class AdminFinancialSecurityTests(TestCase):
    """Financial admin endpoints must be staff-only."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.student = make_user('student1', role='STUDENT')

    def test_analytics_rejects_anonymous(self):
        res = self.client.get('/api/payments/admin/analytics/')
        self.assertIn(res.status_code, (401, 403))

    def test_analytics_rejects_student(self):
        self.client.force_authenticate(self.student)
        res = self.client.get('/api/payments/admin/analytics/')
        self.assertEqual(res.status_code, 403)

    def test_withdrawal_approval_rejects_student(self):
        self.client.force_authenticate(self.student)
        res = self.client.post('/api/payments/admin/withdrawal/approve/1/')
        self.assertEqual(res.status_code, 403)

    def test_wallet_action_rejects_student(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(
            '/api/payments/admin/wallet-action/',
            {'user_id': 1, 'action': 'CREDIT', 'amount': 1000},
            format='json',
        )
        self.assertEqual(res.status_code, 403)

    def test_transactions_list_rejects_student(self):
        self.client.force_authenticate(self.student)
        res = self.client.get('/api/payments/admin/transactions/')
        self.assertEqual(res.status_code, 403)

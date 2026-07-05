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


class WalletPolicyTests(TestCase):
    """Money-handling rules: pending withdrawals reserve funds; admin debits
    may push a balance negative (intentional clawback — decision 2026-07)."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.tutor = make_user('tutor1', role='TUTOR')

    def _wallet(self, user, balance):
        from payments.models import Wallet
        wallet, _ = Wallet.objects.get_or_create(user=user)
        wallet.balance = balance
        wallet.save()
        return wallet

    def test_withdrawal_exceeding_balance_rejected(self):
        self._wallet(self.tutor, 1000)
        self.client.force_authenticate(self.tutor)
        res = self.client.post('/api/payments/tutor/withdrawal/', {
            'amount': 5000, 'bank_name': 'GTB', 'account_number': '1', 'account_name': 'T',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_pending_withdrawals_reserve_balance(self):
        from payments.models import Withdrawal
        self._wallet(self.tutor, 10000)
        Withdrawal.objects.create(
            tutor=self.tutor, amount=8000, bank_name='GTB',
            account_number='1', account_name='T', status='PENDING',
        )
        self.client.force_authenticate(self.tutor)
        res = self.client.post('/api/payments/tutor/withdrawal/', {
            'amount': 5000, 'bank_name': 'GTB', 'account_number': '1', 'account_name': 'T',
        }, format='json')
        self.assertEqual(res.status_code, 400)

        # but a request within the available (10000 - 8000) succeeds
        res = self.client.post('/api/payments/tutor/withdrawal/', {
            'amount': 2000, 'bank_name': 'GTB', 'account_number': '1', 'account_name': 'T',
        }, format='json')
        self.assertEqual(res.status_code, 201)

    def test_admin_debit_may_push_balance_negative(self):
        from students.models import StudentProfile
        from payments.models import Wallet
        student = make_user('student1', role='STUDENT')
        profile = StudentProfile.objects.create(user=student)
        self._wallet(student, 1000)

        self.client.force_authenticate(make_user('admin1', role='ADMIN'))
        res = self.client.post('/api/payments/admin/wallet-action/', {
            'student_id': profile.id, 'action_type': 'DEDUCTION', 'amount': 3000,
            'description': 'clawback',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(float(Wallet.objects.get(user=student).balance), -2000.0)


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

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


class SessionCompletionPayoutTests(TestCase):
    """Money path: completing a session debits the student, credits the tutor
    net of commission, records both transactions, and is not repeatable."""

    def setUp(self):
        from decimal import Decimal
        from django.utils import timezone
        from tutors.models import TutorProfile
        from classes.models import ScheduledSession
        from payments.models import Wallet

        cache.clear()
        self.client = APIClient()
        self.student = make_user('student1', role='STUDENT')
        self.tutor = make_user('tutor1', role='TUTOR')
        TutorProfile.objects.create(
            user=self.tutor, subjects_to_teach='Math', availability_days='Mon',
            availability_hours='9-5', commission_percentage=Decimal('20'),
        )
        wallet, _ = Wallet.objects.get_or_create(user=self.student)
        wallet.balance = Decimal('5000')
        wallet.save()
        self.session = ScheduledSession.objects.create(
            student=self.student, tutor=self.tutor,
            scheduled_at=timezone.now(), duration=60,
            fee_amount=Decimal('1000'), status='PENDING',
        )

    def _complete(self):
        self.client.force_authenticate(self.tutor)
        return self.client.post(f'/api/classes/session/{self.session.id}/complete/', {}, format='json')

    def test_completion_math_and_state(self):
        from payments.models import Wallet, Transaction
        res = self._complete()
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body['fee'], 1000.0)
        self.assertEqual(body['commission'], 200.0)   # 20% tutor override
        self.assertEqual(body['net_payout'], 800.0)

        self.assertEqual(float(Wallet.objects.get(user=self.student).balance), 4000.0)
        self.assertEqual(float(Wallet.objects.get(user=self.tutor).balance), 800.0)

        self.session.refresh_from_db()
        self.assertEqual(self.session.status, 'COMPLETED')
        self.assertEqual(self.session.payout_status, 'RELEASED')
        self.assertEqual(float(self.session.commission_amount), 200.0)

        self.assertTrue(Transaction.objects.filter(reference=f'DEBIT-SESS-{self.session.id}').exists())
        self.assertTrue(Transaction.objects.filter(reference=f'PAYOUT-SESS-{self.session.id}').exists())

    def test_double_completion_rejected(self):
        from payments.models import Wallet
        self._complete()
        res = self._complete()
        self.assertEqual(res.status_code, 400)
        # no double payout
        self.assertEqual(float(Wallet.objects.get(user=self.tutor).balance), 800.0)

    def test_other_tutor_cannot_complete_someone_elses_session(self):
        other = make_user('tutor2', role='TUTOR')
        self.client.force_authenticate(other)
        res = self.client.post(f'/api/classes/session/{self.session.id}/complete/', {}, format='json')
        self.assertEqual(res.status_code, 403)


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

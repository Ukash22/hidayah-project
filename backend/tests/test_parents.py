# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Parent portal endpoint tests.

Covers:
  - child_detail: returns sessions and wallet data for own child
  - child_detail: rejects access to other parent's child
  - fund_child_wallet: credits child wallet and creates a transaction
  - fund_child_wallet: rejects negative/zero amounts
"""
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from students.models import StudentProfile
from payments.models import Wallet, Transaction

User = get_user_model()


class ParentDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.parent = User.objects.create_user(
            username='parent1', email='parent1@test.com', password='pass12345', role='PARENT'
        )
        self.child_user = User.objects.create_user(
            username='child1', email='child1@test.com', password='pass12345', role='STUDENT'
        )
        self.child_profile = StudentProfile.objects.create(
            user=self.child_user,
            parent=self.parent,
            enrolled_course='Quran + Mathematics',
            class_type='ONE_ON_ONE',
            payment_status='PAID',
        )
        Wallet.objects.get_or_create(user=self.child_user)

        # A second parent that must NOT access the first child
        self.other_parent = User.objects.create_user(
            username='parent2', email='parent2@test.com', password='pass12345', role='PARENT'
        )

    def _login(self, user):
        res = self.client.post('/api/auth/login/', {'username': user.username, 'password': 'pass12345'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_child_detail_returns_wallet_and_sessions(self):
        self._login(self.parent)
        res = self.client.get(f'/api/parents/dashboard/child_detail/?child_id={self.child_profile.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['id'], self.child_profile.id)
        self.assertIn('wallet_balance', res.data)
        self.assertIn('sessions', res.data)
        self.assertIn('transactions', res.data)

    def test_child_detail_rejects_wrong_parent(self):
        self._login(self.other_parent)
        res = self.client.get(f'/api/parents/dashboard/child_detail/?child_id={self.child_profile.id}')
        self.assertEqual(res.status_code, 404)

    def test_child_detail_requires_child_id(self):
        self._login(self.parent)
        res = self.client.get('/api/parents/dashboard/child_detail/')
        self.assertEqual(res.status_code, 400)


class ParentFundWalletTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.parent = User.objects.create_user(
            username='funder', email='funder@test.com', password='pass12345', role='PARENT'
        )
        self.child_user = User.objects.create_user(
            username='funded_child', email='funded_child@test.com', password='pass12345', role='STUDENT'
        )
        self.child_profile = StudentProfile.objects.create(
            user=self.child_user,
            parent=self.parent,
            enrolled_course='English',
            class_type='GROUP',
        )
        self.wallet, _ = Wallet.objects.get_or_create(user=self.child_user)

    def _login(self):
        res = self.client.post('/api/auth/login/', {'username': 'funder', 'password': 'pass12345'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_fund_credits_wallet_and_creates_transaction(self):
        self._login()
        initial = self.wallet.balance
        res = self.client.post('/api/parents/dashboard/fund_child_wallet/', {
            'child_id': self.child_profile.id,
            'amount': '5000',
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, initial + Decimal('5000'))

        tx = Transaction.objects.filter(user=self.child_user).last()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.transaction_type, 'DEPOSIT')
        self.assertEqual(tx.amount, Decimal('5000'))

    def test_fund_rejects_zero_amount(self):
        self._login()
        res = self.client.post('/api/parents/dashboard/fund_child_wallet/', {
            'child_id': self.child_profile.id,
            'amount': '0',
        })
        self.assertEqual(res.status_code, 400)

    def test_fund_rejects_wrong_parent(self):
        other_parent = User.objects.create_user(
            username='intruder', email='intruder@test.com', password='pass12345', role='PARENT'
        )
        res = self.client.post('/api/auth/login/', {'username': 'intruder', 'password': 'pass12345'})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

        res = self.client.post('/api/parents/dashboard/fund_child_wallet/', {
            'child_id': self.child_profile.id,
            'amount': '1000',
        })
        self.assertEqual(res.status_code, 404)

    def test_fund_missing_fields_rejected(self):
        self._login()
        res = self.client.post('/api/parents/dashboard/fund_child_wallet/', {})
        self.assertEqual(res.status_code, 400)

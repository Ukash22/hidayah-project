# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from students.models import StudentProfile, WalletTransaction
from decimal import Decimal

User = get_user_model()

def run_verification():
    print("Starting Admin Control Room Verification...")

    # 1. Setup Admin User
    admin_email = "admin@example.com"
    password = "adminpassword123"
    
    try:
        admin = User.objects.get(email=admin_email)
        admin.set_password(password)
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()
        print(f"Admin user ready: {admin_email}")
    except User.DoesNotExist:
        print("Admin user not found. Please create one.")
        return

    # 2. Setup Test Student
    student_email = "teststudent_wallet@example.com"
    try:
        student_user = User.objects.get(email=student_email)
    except User.DoesNotExist:
        student_user = User.objects.create_user(
            username="teststudent_wallet",
            email=student_email,
            password="password123",
            first_name="Wallet",
            last_name="Tester"
        )
    
    profile, _ = StudentProfile.objects.get_or_create(user=student_user)
    profile.approval_status = 'APPROVED'
    initial_balance = Decimal('0.00')
    profile.wallet_balance = initial_balance
    profile.save()
    print(f"Test Student ready: {student_email} (Balance: {profile.wallet_balance})")

    # Fix Allowed Hosts for Test Client
    from django.conf import settings
    if 'testserver' not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS = settings.ALLOWED_HOSTS + ['testserver']

    # 3. Simulate Admin Login (Get Token)
    client = APIClient()
    response = client.post('/api/auth/login/', {
        'username': admin.username,
        'password': password
    })
    
    if response.status_code != 200:
        print(f"Login failed: {getattr(response, 'data', response.content)}")
        return
        
    token = response.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    print("Admin Logged In")

    # 4. Test: List Students
    print("\nTesting Student List...")
    response = client.get('/api/students/admin/all/')
    if response.status_code == 200:
        students = response.json()
        print(f"Fetched {len(students)} students.")
        found = any(s['user_details']['email'] == student_email for s in students)
        if found:
            print("Test student found in list.")
        else:
            print("Test student NOT found in admin list.")
    else:
        print(f"Student list failed: {response.status_code}")

    # 5. Test: Wallet Deposit (Add 5000)
    print("\nTesting Wallet Credit...")
    deposit_amount = 5000
    response = client.post('/api/payments/admin/wallet-action/', {
        'student_id': profile.id,
        'amount': deposit_amount,
        'action_type': 'DEPOSIT',
        'description': 'Test Deposit'
    })
    
    if response.status_code == 200:
        print(f"Deposit successful: {response.data}")
        profile.refresh_from_db()
        if profile.wallet_balance == initial_balance + deposit_amount:
            print(f"Balance verified: {profile.wallet_balance}")
        else:
            print(f"Balance Mismatch: Expected {initial_balance + deposit_amount}, Got {profile.wallet_balance}")
    else:
        print(f"Deposit failed: {response.data}")

    # 6. Test: Transaction History
    print("\nTesting Transaction List...")
    response = client.get('/api/payments/admin/transactions/')
    if response.status_code == 200:
        txs = response.json()
        print(f"Fetched {len(txs)} transactions.")
        found_tx = any(t['description'] == 'ADMIN: Test Deposit' and t['student_email'] == student_email for t in txs)
        if found_tx:
            print("Transaction record found.")
        else:
            print("Transaction record NOT found.")
    else:
        print(f"Transaction list failed: {response.status_code}")

    print("\nVerification Complete.")

if __name__ == "__main__":
    run_verification()

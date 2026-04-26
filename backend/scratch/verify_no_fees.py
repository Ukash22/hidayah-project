# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
import sys
import json
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from students.models import StudentProfile
from payments.models import PricingTier
from rest_framework.test import APIClient

User = get_user_model()

def run_verification():
    print("Starting Fee Removal Verification...")

    # Fix Allowed Hosts
    from django.conf import settings
    if 'testserver' not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS = settings.ALLOWED_HOSTS + ['testserver']

    # 1. Setup Data
    email = "test_nofee@example.com"
    username = "test_nofee"
    password = "password123"

    print(f"\n1. Registering new student: {username}")
    client = APIClient()
    
    # Clean up old test user
    User.objects.filter(username=username).delete()

    data = {
        "username": username,
        "email": email,
        "password": password,
        "first_name": "NoFee",
        "last_name": "Tester",
        "days_per_week": 3,
        "hours_per_week": 1,
        "class_type": "ONE_ON_ONE",
        "dob": "1990-01-01",
        "gender": "Male"
    }

    response = client.post('/api/auth/register/', data)
    if response.status_code != 201:
        print(f"Registration failed: {getattr(response, 'data', response.content)}")
        return

    user = User.objects.get(username=username)
    profile = StudentProfile.objects.get(user=user)
    
    print(f"Registered. Checking initial stored amount...")
    
    # Calculation Check
    # One-on-One = 3000/hr. 3 days * 1 hr * 4 weeks = 12 hrs
    # 12 * 3000 = 36,000
    # One-Time Fees used to be 20,000. So Old Total = 56,000.
    
    pricing = PricingTier.objects.get(class_type='ONE_ON_ONE')
    expected_tuition = 3 * 1 * 4 * pricing.hourly_rate 
    
    print(f"   Expected Tuition: {expected_tuition}")
    print(f"   Stored Total: {profile.total_amount}")
    
    if profile.total_amount == expected_tuition:
        print(f"SUCCESS: Total amount matches Tuition Only ({profile.total_amount})")
    else:
        print(f"FAILED: Total amount {profile.total_amount} != Expected {expected_tuition}")
        return

    print("\n2. Simulating Admin Approval (PDF Generation Logic Check)...")
    
    # We need admin access
    try:
        admin = User.objects.get(email="admin@example.com")
        client.force_authenticate(user=admin)
        
        response = client.post(f'/api/students/approve-student/{user.id}/')
        
        if response.status_code == 200:
            print("Approval API call successful.")
            profile.refresh_from_db()
            print(f"Approval Status: {profile.approval_status}")
            print(f"Admission Letter Generated: {profile.admission_letter}")
        else:
            print(f"Approval failed: {getattr(response, 'data', response.content)}")
            
    except Exception as e:
        print(f"verification error: {e}")

    print("\nVerification Complete.")

if __name__ == "__main__":
    run_verification()

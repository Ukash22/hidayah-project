# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from students.models import StudentProfile, WalletTransaction
from payments.models import PricingTier

User = get_user_model()

def verify_termly_fees():
    print("Starting Termly Fees & Payment Link Verification...")

    # Fix Allowed Hosts for Test Client
    from django.conf import settings
    if 'testserver' not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS = settings.ALLOWED_HOSTS + ['testserver']

    # 1. Setup Admin
    admin_email = "admin@example.com"
    admin = User.objects.get(email=admin_email)
    
    # Clean up old test student
    User.objects.filter(username="test_termly_student").delete()
    
    # 2. Test Registration with Termly Fees
    client = APIClient()
    reg_data = {
        "username": "test_termly_student",
        "email": "termly@example.com",
        "password": "password123",
        "first_name": "Termly",
        "last_name": "Student",
        "dob": "2000-01-01",
        "gender": "Male",
        "country": "Nigeria",
        "days_per_week": 3,
        "hours_per_week": 1,
        "class_type": "ONE_ON_ONE"
    }
    
    print("\nTesting Registration...")
    response = client.post('/api/auth/register/', reg_data)
    if response.status_code == 201:
        print("Registration successful.")
        user = User.objects.get(username="test_termly_student")
        profile = user.student_profile
        
        # Calculate expected (3 * 1 * 3 * 4 * 3000) = 108,000 NOT REALLY
        # Wait: hours_per_week * days_per_week * 4 = 1 * 3 * 4 = 12
        # monthly = 12 * 3000 = 36,000
        # termly = 36,000 * 3 = 108,000
        expected_first_payment = Decimal('108000.00')
        
        print(f"Stored Amount: {profile.total_amount}")
        if profile.total_amount == expected_first_payment:
            print(f"SUCCESS: Termly fee calculated correctly: {profile.total_amount}")
        else:
            print(f"FAILURE: Expected {expected_first_payment}, got {profile.total_amount}")
    else:
        print(f"Registration failed: {response.data}")
        return

    # 3. Test Approval and PDF Generation
    print("\nTesting Approval & PDF Generation...")
    client.force_authenticate(user=admin)
    response = client.post(f'/api/auth/approve-student/{user.id}/')
    
    if response.status_code == 200:
        print("Approval successful.")
        profile.refresh_from_db()
        if profile.admission_letter:
            print(f"Admission letter generated: {profile.admission_letter}")
            # Check if file exists
            full_path = os.path.join(os.getcwd(), 'media', profile.admission_letter.name)
            if os.path.exists(full_path):
                print(f"PDF file exists at {full_path}")
            else:
                print(f"PDF file NOT found at {full_path}")
        else:
            print("FAILURE: Admission letter path not stored in profile.")
    else:
        print(f"Approval failed: {response.data}")

    print("\nVerification Complete.")

if __name__ == "__main__":
    verify_termly_fees()

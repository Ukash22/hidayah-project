import os
import sys
import django
import json
from decimal import Decimal

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.serializers import RegisterSerializer
from students.models import StudentProfile

User = get_user_model()

def test_registration_price_sync():
    print("Starting Price Sync Verification...")
    
    # Clean up existing test user
    test_username = 'sync_test_user'
    User.objects.filter(username=test_username).delete()
    
    # Simulate 3 subjects, Primary (1500/hr), 3 hours total
    # Expected Total = 1500 * 3 * 4 = 18,000
    payload = {
        "username": test_username,
        "email": "sync@test.com",
        "password": "testpassword123",
        "first_name": "Sync",
        "last_name": "Tester",
        "dob": "2010-01-01",
        "level": "PRIMARY", 
        "days_per_week": 3,
        "hours_per_week": 3.0,
        "total_amount": 18000.00,
        "subject_enrollments": [
            {"subject": "Mathematics"},
            {"subject": "English Language"},
            {"subject": "Science"}
        ]
    }
    
    serializer = RegisterSerializer(data=payload)
    if not serializer.is_valid():
        print(f"Serializer Error: {serializer.errors}")
        return

    user = serializer.save()
    profile = StudentProfile.objects.get(user=user)
    
    print(f"User Created: {user.username}")
    print(f"Profile Total Amount: {profile.total_amount}")
    print(f"Enrolled Subjects: {profile.enrolled_course}")
    
    # Verify the amount matches exactly what was sent
    assert profile.total_amount == Decimal('18000.00'), f"Price mismatch! Expected 18000, got {profile.total_amount}"
    
    print("SUCCESS: Price Synchronization is working! Backend trusts the frontend total.")

if __name__ == "__main__":
    try:
        test_registration_price_sync()
    except Exception as e:
        print(f"Test Failed: {e}")

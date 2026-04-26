# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from payments.models import Payment
from students.models import StudentProfile

User = get_user_model()

def check_recent_users():
    print(f"--- Checking Last 5 Users ---")
    users = User.objects.all().order_by('-date_joined')[:5]
    
    for user in users:
        print(f"\nUser: {user.username} (Role: {user.role}, ID: {user.id})")
        try:
            profile = StudentProfile.objects.get(user=user)
            print(f"  Profile Ref: {profile.payment_reference}")
            print(f"  Profile Status: {profile.payment_status}")
            
            # Check payments
            payments = Payment.objects.filter(student=user)
            print(f"  Payments count: {payments.count()}")
            for p in payments:
                 print(f"    - ID: {p.id}, Txn: {p.transaction_id}, Status: {p.status}")

        except StudentProfile.DoesNotExist:
            print("  No Student Profile found")
            
if __name__ == "__main__":
    check_recent_users()

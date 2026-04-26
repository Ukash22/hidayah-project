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

User = get_user_model()

def check_admin_users():
    print(f"--- Checking Admin/Staff Users ---")
    admins = User.objects.filter(is_superuser=True)
    staff = User.objects.filter(is_staff=True)
    
    print(f"Total Superusers: {admins.count()}")
    for user in admins:
        print(f"Superuser: {user.username} | Role: {user.role} | Is Staff: {user.is_staff}")
        if user.role != 'ADMIN':
            print("  ⚠️ Superuser does NOT have 'ADMIN' role! This causes frontend redirect issues.")

    print(f"\nTotal Staff: {staff.count()}")
    for user in staff:
        if not user.is_superuser:
            print(f"Staff: {user.username} | Role: {user.role}")

if __name__ == "__main__":
    check_admin_users()

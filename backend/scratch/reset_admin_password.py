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

def reset_admin_password():
    try:
        user = User.objects.get(username='admin')
        user.set_password('admin123')
        user.save()
        print(f"Password for user '{user.username}' reset to 'admin123'")
        
        # Verify role just in case
        if user.role != 'ADMIN':
            user.role = 'ADMIN'
            user.save()
            print("Fixed role to ADMIN")
            
    except User.DoesNotExist:
        print("User 'admin' not found!")

if __name__ == "__main__":
    reset_admin_password()

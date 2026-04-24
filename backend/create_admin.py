import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

def create_or_update_admin():
    username = 'admin'
    password = 'Hidaya123#'
    email = 'admin@hidayah.com'
    
    try:
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'is_active': True,
                'is_staff': True,
                'is_superuser': True,
                'role': 'ADMIN'
            }
        )
        
        if not created:
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.role = 'ADMIN'
            user.save()
            print(f"Successfully updated admin user: {username}")
        else:
            user.set_password(password)
            user.save()
            print(f"Successfully created admin user: {username}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_or_update_admin()

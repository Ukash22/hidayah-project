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
        print(f"Checking for user: {username}...")
        user = User.objects.filter(username=username).first()
        
        if not user:
            print(f"User {username} not found. Creating...")
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            created = True
        else:
            print(f"User {username} found. Updating password and roles...")
            user.set_password(password)
            created = False
            
        user.role = 'ADMIN'
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()
        
        status = "created" if created else "updated"
        print(f"Successfully {status} admin user: {username} with role {user.role}")
        print(f"User details: ID={user.id}, Active={user.is_active}, Staff={user.is_staff}, Super={user.is_superuser}")
            
    except Exception as e:
        print(f"FAILED to handle admin user: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_or_update_admin()

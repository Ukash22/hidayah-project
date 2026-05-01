# type: ignore
# pylint: skip-file
import os
import django
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

User = get_user_model()

username = os.getenv('ADMIN_USERNAME', 'admin')
email = os.getenv('ADMIN_EMAIL', 'admin@hidayah.com')
password = os.getenv('ADMIN_PASSWORD', 'AdminPassword123!')

if not User.objects.filter(username=username).exists():
    print(f"Creating superuser {username}...")
    User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        role='ADMIN'
    )
    print("Superuser created successfully.")
else:
    print(f"Superuser {username} already exists. Updating password/role...")
    user = User.objects.get(username=username)
    user.set_password(password)
    user.role = 'ADMIN'
    user.is_superuser = True
    user.is_staff = True
    user.save()
    print("Superuser updated successfully.")

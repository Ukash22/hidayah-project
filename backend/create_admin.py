# type: ignore
# pylint: skip-file
import os
from dotenv import load_dotenv

load_dotenv()

import django
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

User = get_user_model()

username = os.getenv('ADMIN_USERNAME', 'admin')
email = os.getenv('ADMIN_EMAIL', 'admin@hidayah.com')
password = os.getenv('ADMIN_PASSWORD')

# Look for an existing admin user by username or email (case-insensitive)
user = User.objects.filter(username__iexact=username).first()
if not user and email:
    user = User.objects.filter(email__iexact=email).first()

if not user:
    initial_password = password or 'admin1234..,,'
    print(f"Creating superuser {username} ({email})...")
    User.objects.create_superuser(
        username=username,
        email=email,
        password=initial_password,
        role='ADMIN',
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )
    print(f"Superuser {username} created successfully.")
else:
    if password:
        print(f"Superuser {user.username} found. Updating credentials, email, and active status...")
        user.username = username
        if email:
            user.email = email
        user.set_password(password)
        user.role = 'ADMIN'
        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        user.save()
        print(f"Superuser {username} updated successfully.")
    else:
        user.role = 'ADMIN'
        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        user.save()
        print(f"Superuser {username} found. Account flags verified (password unchanged because ADMIN_PASSWORD is not set).")



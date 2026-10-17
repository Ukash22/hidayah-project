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

username = os.getenv('ADMIN_USERNAME') or 'admin'
email    = os.getenv('ADMIN_EMAIL')    or 'admin@hidayah.com'
password = os.getenv('ADMIN_PASSWORD') or 'admin1234..,,Hidayah'

# Strip accidental whitespace from env values
username = username.strip()
email    = email.strip()
password = password.strip()

print(f"[create_admin] Using username='{username}' email='{email}' (password hidden)")

# Look for an existing admin user by username or email (case-insensitive)
user = User.objects.filter(username__iexact=username).first()
if not user and email:
    user = User.objects.filter(email__iexact=email).first()

if not user:
    print(f"[create_admin] Creating superuser {username} ({email})...")
    User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        role='ADMIN',
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )
    print(f"[create_admin] Superuser {username} created successfully.")
else:
    print(f"[create_admin] Found existing user '{user.username}' (id={user.pk}). Resetting credentials...")
    user.username    = username
    user.email       = email
    user.role        = 'ADMIN'
    user.is_superuser = True
    user.is_staff    = True
    user.is_active   = True
    user.set_password(password)
    user.save()
    print(f"[create_admin] Superuser '{username}' updated — password reset, is_active=True, is_superuser=True.")

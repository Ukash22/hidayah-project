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
password = os.getenv('ADMIN_PASSWORD')

# Never fall back to a hardcoded password: this script runs on every deploy
# (build.sh) and would otherwise RESET the admin password to a publicly
# visible default. Without ADMIN_PASSWORD set we do nothing.
if not password:
    print("ADMIN_PASSWORD not set - skipping admin creation/update.")
    raise SystemExit(0)

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

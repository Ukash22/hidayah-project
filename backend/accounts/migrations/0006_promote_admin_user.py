# type: ignore
import os
from django.db import migrations
from django.contrib.auth.hashers import make_password

def promote_admin(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    username = (os.getenv('ADMIN_USERNAME') or 'admin').strip()
    email = (os.getenv('ADMIN_EMAIL') or 'admin@hidayah.com').strip()
    password = (os.getenv('ADMIN_PASSWORD') or 'admin1234..,,Hidayah').strip()

    # Search for existing user by username or email
    user = User.objects.filter(username__iexact=username).first()
    if not user and email:
        user = User.objects.filter(email__iexact=email).first()

    if not user:
        user = User(
            username=username,
            email=email,
        )

    user.username = username
    if email:
        user.email = email
    user.role = 'ADMIN'
    user.is_superuser = True
    user.is_staff = True
    user.is_active = True
    user.password = make_password(password)
    user.save()
    print(f"[migration 0006] Superuser '{username}' ({email}) ensured with ADMIN role, staff, superuser, and active flags.")

def rollback_admin(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_notification_link'),
    ]

    operations = [
        migrations.RunPython(promote_admin, rollback_admin),
    ]

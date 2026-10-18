# type: ignore
# This migration is idempotent — it always resets the admin password
# to match the ADMIN_PASSWORD env var (falls back to admin1234..,,Hidayah).
# This fixes the issue where user id=4 (username=admin) was registered as a
# STUDENT with a different password before migration 0006 ran.
import os
from django.db import migrations
from django.contrib.auth.hashers import make_password

def reset_admin_password(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    username = (os.getenv('ADMIN_USERNAME') or 'admin').strip()
    email = (os.getenv('ADMIN_EMAIL') or 'admin@hidayah.com').strip()
    password = (os.getenv('ADMIN_PASSWORD') or 'admin1234..,,Hidayah').strip()

    # Find admin user by role first (most reliable), then by username/email
    user = (
        User.objects.filter(role='ADMIN').first() or
        User.objects.filter(username__iexact=username).first() or
        User.objects.filter(email__iexact=email).first()
    )

    if user:
        user.username = username
        user.email = email
        user.role = 'ADMIN'
        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        user.password = make_password(password)
        user.save()
        print(f"[migration 0007] Admin '{username}' password reset to ADMIN_PASSWORD env var value.")
    else:
        print(f"[migration 0007] No admin user found to reset.")

def rollback(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_promote_admin_user'),
    ]

    operations = [
        migrations.RunPython(reset_admin_password, rollback),
    ]

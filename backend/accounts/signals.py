import os
from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from .models import User
from payments.models import Wallet

@receiver(post_migrate)
def ensure_superuser_exists(sender, **kwargs):
    """
    Ensure the superuser/admin exists with correct role and flags on every deploy/migration.
    This guarantees admin bootstrap even if build.sh or external scripts are bypassed on Render.
    """
    if sender.name != 'accounts':
        return

    username = (os.getenv('ADMIN_USERNAME') or 'admin').strip()
    email = (os.getenv('ADMIN_EMAIL') or 'admin@hidayah.com').strip()
    password = (os.getenv('ADMIN_PASSWORD') or 'admin1234..,,Hidayah').strip()

    user = (
        User.objects.filter(username__iexact=username).first()
        or (User.objects.filter(email__iexact=email).first() if email else None)
        or User.objects.filter(role='ADMIN').first()
    )

    if not user:
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='ADMIN',
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        print(f"[accounts.post_migrate] Superuser '{username}' created successfully.")
    else:
        user.username = username
        user.email = email
        user.role = 'ADMIN'
        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        user.set_password(password)
        user.save()
        print(f"[accounts.post_migrate] Superuser '{username}' updated — flags set and password synchronized.")


@receiver(post_save, sender=User)
def create_user_wallet(sender, instance, created, **kwargs):
    if created:
        Wallet.objects.get_or_create(user=instance)
        if instance.role == 'STUDENT':
            from students.models import StudentProfile
            StudentProfile.objects.get_or_create(
                user=instance,
                defaults={
                    'approval_status': 'APPROVED',
                    'payment_status': 'UNPAID',
                    'enrolled_course': 'General Studies',
                }
            )
        # NOTE: TUTOR profile creation is intentionally NOT handled here.
        #
        # Admin-created tutors: AdminUserManagementSerializer.create() calls
        #   TutorProfile.objects.get_or_create() after User.objects.create_user(),
        #   so the profile is always provisioned for that path.
        #
        # Public tutor registration: TutorRegisterSerializer.create() runs
        #   TutorProfile.objects.create() with the applicant's real submitted data
        #   inside a transaction.atomic() block.  If this signal also created a
        #   profile here, the serializer's create() would hit a OneToOneField
        #   unique constraint and roll back the entire registration as HTTP 400.
        #
        # Result: do nothing for TUTOR users in this signal.

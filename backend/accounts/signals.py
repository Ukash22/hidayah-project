from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from payments.models import Wallet

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

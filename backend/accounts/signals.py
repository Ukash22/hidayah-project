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
        elif instance.role == 'TUTOR':
            # Ensure every tutor user always has a TutorProfile,
            # regardless of which code path created the user.
            from tutors.models import TutorProfile
            TutorProfile.objects.get_or_create(
                user=instance,
                defaults={
                    'status': 'APPROVED',
                    'subjects_to_teach': '',
                    'availability_days': '',
                    'availability_hours': '',
                    'experience_years': 0,
                    'mode': 'ONLINE',
                }
            )

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

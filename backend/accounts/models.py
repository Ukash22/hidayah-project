# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('TUTOR', 'Tutor'),
        ('STUDENT', 'Student'),
        ('PARENT', 'Parent'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='STUDENT')
    phone = models.CharField(max_length=20, blank=True, null=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=(('Male', 'Male'), ('Female', 'Female')), blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    timezone = models.CharField(max_length=100, blank=True, null=True)
    preferred_language = models.CharField(max_length=50, default='English')
    admission_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    is_parent_account = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = 'ADMIN'
        if self.role == 'ADMIN':
            self.is_staff = True
            self.is_superuser = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    link = models.CharField(max_length=255, blank=True, null=True, help_text="Optional link to action")

    @staticmethod
    def create(user, title, message, link=None):
        return Notification.objects.create(user=user, title=title, message=message, link=link)

    @classmethod
    def notify_admins(cls, title, message, link=None):
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admins = User.objects.filter(
                models.Q(role='ADMIN') | models.Q(is_superuser=True) | models.Q(is_staff=True)
            ).distinct()
            notifications = [
                cls(user=admin, title=title, message=message, link=link)
                for admin in admins
            ]
            if notifications:
                cls.objects.bulk_create(notifications)
            return len(notifications)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("notify_admins failed: %s", e)
            return 0

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"

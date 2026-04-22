# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models
from django.conf import settings

class ParentProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='parent_profile')
    phone = models.CharField(max_length=20)
    address = models.TextField()
    
    def __str__(self):
        return f"Parent: {self.user.get_full_name()}"

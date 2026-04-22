# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models
from django.conf import settings

class TutorRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_tutor_requests')
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_tutor_requests')
    subject = models.ForeignKey('programs.Subject', on_delete=models.SET_NULL, null=True, blank=True)
    
    preferred_time = models.CharField(max_length=100, help_text="e.g. Mon/Wed 4pm")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Request from {self.student.get_full_name()} to {self.tutor.get_full_name()}"

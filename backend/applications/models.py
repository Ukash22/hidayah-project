# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models
from django.conf import settings

class TrialApplication(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    
    # Preferences
    course_interested = models.CharField(max_length=200, default='Quranic Recitation')
    preferred_tutor = models.CharField(max_length=200, blank=True, null=True, help_text="Tutor chosen by user during request")
    preferred_day = models.CharField(max_length=50, blank=True, null=True)
    preferred_time = models.CharField(max_length=50, blank=True, null=True)
    preferred_time_exact = models.CharField(max_length=50, blank=True, null=True, help_text="Specific time if known")
    
    message = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Scheduled Class Details (Approved)
    assigned_tutor = models.CharField(max_length=100, blank=True, null=True)
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_trials')
    scheduled_at = models.DateTimeField(blank=True, null=True)
    duration = models.IntegerField(default=40, help_text="Duration in minutes")
    reminder_sent = models.BooleanField(default=False)
    is_started = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} - {self.email} ({self.status})"

class ZoomClass(models.Model):
    application = models.OneToOneField(TrialApplication, on_delete=models.CASCADE, related_name='zoom_class')
    meeting_id = models.CharField(max_length=100)
    join_url = models.URLField(max_length=500)
    start_url = models.URLField(max_length=1000)
    password = models.CharField(max_length=50, blank=True, null=True)
    whiteboard_url = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Zoom Class for {self.application.first_name}"

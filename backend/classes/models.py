# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models
from django.conf import settings

class ScheduledSession(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('RESCHEDULED', 'Rescheduled'),
        ('CANCELLED', 'Cancelled'),
    )

    PAYOUT_STATUS_CHOICES = (
        ('NONE', 'Not Applicable'),
        ('PENDING', 'Pending Release'),
        ('RELEASED', 'Released to Tutor'),
    )
    
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_sessions')
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tutor_sessions')
    subject = models.ForeignKey('programs.Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='scheduled_sessions')
    
    scheduled_at = models.DateTimeField()
    duration = models.IntegerField(default=40, help_text="Duration in minutes")
    is_trial = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Financial Snapshots
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    admin_percentage_at_completion = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    payout_status = models.CharField(max_length=20, choices=PAYOUT_STATUS_CHOICES, default='NONE')
    
    reminder_sent = models.BooleanField(default=False)
    meeting_link = models.URLField(blank=True, null=True)
    whiteboard_link = models.URLField(blank=True, null=True)
    completion_notes = models.TextField(blank=True, null=True)
    is_started = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.get_full_name()} with {self.tutor.get_full_name()} - {self.scheduled_at}"


class RescheduleRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    
    INITIATED_BY_CHOICES = (
        ('STUDENT', 'Student'),
        ('TUTOR', 'Tutor'),
    )
    
    session = models.ForeignKey(ScheduledSession, on_delete=models.CASCADE, related_name='reschedule_requests', null=True, blank=True)
    trial = models.ForeignKey('applications.TrialApplication', on_delete=models.CASCADE, related_name='reschedule_requests', null=True, blank=True)
    initiated_by = models.CharField(max_length=20, choices=INITIATED_BY_CHOICES)
    requested_date = models.DateField()
    requested_time = models.TimeField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    def __str__(self):
        return f"Reschedule by {self.initiated_by} - {self.session}"


class WhiteboardSession(models.Model):
    session = models.ForeignKey(ScheduledSession, on_delete=models.CASCADE, related_name='whiteboard_sessions')
    saved_image = models.ImageField(upload_to='whiteboards/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Booking(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_bookings')
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tutor_bookings')
    subject = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    schedule = models.TextField(blank=True, null=True, help_text="JSON list of {day, time} objects")
    hours_per_week = models.IntegerField(default=1)
    hours_per_session = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    learning_level = models.CharField(max_length=100, blank=True, null=True, default='Primary School')
    class_structure = models.CharField(max_length=50, blank=True, null=True, default='One-on-One')
    preferred_start_date = models.DateField(blank=True, null=True)
    
    approved = models.BooleanField(default=False)
    paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.username} requests {self.subject} with {self.tutor.username}"

    def save(self, *args, **kwargs):
        """Auto-calculate price based on tutor rate, session duration, and schedule count (4-week block)"""
        if not self.price or self.price == 0:
            import json
            from decimal import Decimal
            
            # 1. Get tutor's hourly rate (Default to 1500 if not set)
            tutor_rate = Decimal('1500.00')
            if hasattr(self.tutor, 'tutor_profile') and self.tutor.tutor_profile.hourly_rate:
                tutor_rate = self.tutor.tutor_profile.hourly_rate
            
            # 2. Extract number of days from JSON schedule
            days_count = 1
            if self.schedule:
                try:
                    data = json.loads(self.schedule)
                    if isinstance(data, list):
                        days_count = len(data) if data else 1
                except:
                    pass
            
            # 3. Calculate price: rate * hours_per_session * days * 4 weeks
            hours = self.hours_per_session or Decimal('1.0')
            self.price = tutor_rate * hours * Decimal(str(days_count)) * Decimal('4.00')
            
        super().save(*args, **kwargs)

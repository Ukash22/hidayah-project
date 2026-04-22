# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models
from django.conf import settings
from django.utils import timezone

class StudentProfile(models.Model):
    APPROVAL_STATUS_CHOICES = (
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')
    parent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='child_students')
    relationship = models.CharField(max_length=255, blank=True, null=True, help_text="Relationship to parent (e.g. Mother, Father)")
    
    # Status & Admission
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='PENDING')
    payment_status = models.CharField(max_length=20, default='UNPAID', choices=(('UNPAID', 'Unpaid'), ('PAID', 'Paid'), ('PARTIAL', 'Partial')))
    admission_letter = models.FileField(upload_to='admission_letters/', null=True, blank=True)
    admission_date = models.DateField(null=True, blank=True)
    # Location & Level
    state = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True, help_text="Full residential address")
    level = models.CharField(max_length=255, blank=True, null=True, 
                             choices=(('PRIMARY', 'Primary'), ('SECONDARY', 'Secondary'), 
                                      ('JUNIOR_WAEC', 'Junior WAEC (BECE)'),
                                      ('JAMB', 'JAMB'), ('WAEC', 'WAEC'), ('NECO', 'NECO')))
    
    preferred_mode = models.CharField(max_length=20, default='ONLINE', 
                                      choices=(('ONLINE', 'Online'), ('PHYSICAL', 'Physical')))
                                      
    target_exam_type = models.CharField(max_length=20, null=True, blank=True,
                                        choices=(('JAMB', 'JAMB'), ('WAEC', 'WAEC'), ('NECO', 'NECO'), ('BECE', 'BECE')))
    target_exam_year = models.CharField(max_length=10, null=True, blank=True)
    enrolled_courses = models.ManyToManyField('programs.Subject', blank=True, related_name='enrolled_students')
    enrolled_course = models.CharField(max_length=200, default='General Studies', blank=True, null=True)
    
    # New Enrollment Preferences
    days_per_week = models.IntegerField(default=3)
    preferred_days = models.CharField(max_length=200, blank=True, null=True, help_text="Comma-separated days e.g. Monday, Wednesday")
    preferred_time = models.CharField(max_length=255, blank=True, null=True)
    preferred_time_exact = models.CharField(max_length=255, blank=True, null=True)
    class_type = models.CharField(max_length=20, default='ONE_ON_ONE', choices=(('ONE_ON_ONE', 'One-on-One Class'), ('GROUP', 'Group Class')))
    
    # Financials
    @property
    def wallet_balance(self):
        from payments.models import Wallet
        wallet, _ = Wallet.objects.get_or_create(user=self.user)
        return wallet.balance
    hours_per_week = models.DecimalField(max_digits=5, decimal_places=2, default=1.0, help_text="Hours per class session")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total calculated registration/first month fee")
    payment_reference = models.CharField(max_length=255, unique=True, null=True, blank=True, help_text="Unique payment reference for initial fee")
    
    # Tutor & Connectivity
    preferred_tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='preferred_students', limit_choices_to={'role': 'TUTOR'})
    assigned_tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_students', limit_choices_to={'role': 'TUTOR'})
    meeting_link = models.URLField(blank=True, null=True, help_text="Zoom/Meet link for classes")
    whiteboard_link = models.URLField(blank=True, null=True, help_text="Excalidraw/Whiteboard link for classes")
    meeting_link_approved = models.BooleanField(default=True, help_text="If tutor sets link, admin must approve")
    
    def __str__(self):
        return f"Profile of {self.user.username} ({self.approval_status})"
    
    @property
    def active_enrollments(self):
        return self.enrollments.filter(status='APPROVED')

    def calculate_total_amount(self):
        """Calculate total amount based on all active enrollments' monthly rates"""
        total = 0
        active_enrs = self.active_enrollments.all()
        if not active_enrs.exists():
            # If no enrollments yet, don't zero out the amount set at registration
            return self.total_amount
            
        for enrollment in active_enrs:
            total += enrollment.monthly_rate
        self.total_amount = total # Monthly Only
        return self.total_amount

class Enrollment(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='enrollments')
    subject = models.ForeignKey('programs.Subject', on_delete=models.CASCADE)
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'TUTOR'})
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=3000.00)
    hours_per_week = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    days_per_week = models.IntegerField(default=3)
    preferred_days = models.CharField(max_length=200, blank=True, null=True, help_text="e.g. Monday, Wednesday")
    preferred_time = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. 10:00 AM")
    
    schedule = models.TextField(blank=True, null=True, help_text="JSON list of {day, time} objects")
    preferred_start_date = models.DateField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    enrolled_at = models.DateTimeField(auto_now_add=True)

    @property
    def weekly_rate(self):
        # Use days_per_week * hours_per_week, which should be updated based on schedule in the view
        return self.hourly_rate * self.hours_per_week * self.days_per_week

    @property
    def monthly_rate(self):
        return self.weekly_rate * 4

    @property
    def termly_rate(self):
        return self.monthly_rate * 3

    def __str__(self):
        return f"{self.student.user.username} - {self.subject.name} ({self.status})"



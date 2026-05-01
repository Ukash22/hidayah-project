# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.db import models
from django.conf import settings

class TutorProfile(models.Model):
    STATUS_CHOICES = (
        ('APPLIED', 'Applied'),
        ('INTERVIEW_SCHEDULED', 'Interview Scheduled'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    
    DEVICE_CHOICES = (
        ('COMPUTER', 'Computer'),
        ('PHONE', 'Phone'),
        ('BOTH', 'Both'),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tutor_profile')
    
    # Status & Admin Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='APPLIED', db_index=True)
    interview_at = models.DateTimeField(null=True, blank=True)
    interview_link = models.URLField(blank=True, null=True)
    appointment_letter = models.FileField(upload_to='appointment_letters/', blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True, help_text="Short biography or teaching philosophy")
    
    # Personal & Professional
    age = models.IntegerField(null=True, blank=True)
    address = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='tutor_images/', blank=True, null=True, max_length=500)
    short_recitation = models.FileField(upload_to='tutor_recitations/', blank=True, null=True, max_length=500)
    cv_resume = models.FileField(upload_to='tutor_credentials/', blank=True, null=True, max_length=500)
    credentials = models.FileField(upload_to='tutor_credentials/', blank=True, null=True, max_length=500) # Certificates
    experience_years = models.IntegerField(default=0)
    subjects_to_teach = models.TextField(help_text="Comma separated subjects")
    languages = models.TextField(default='English')
    
    # Online Experience
    has_online_exp = models.BooleanField(default=False)
    intro_video = models.FileField(upload_to='tutor_videos/', blank=True, null=True, max_length=500)
    intro_video_url = models.URLField(blank=True, null=True, help_text="Legacy URL field")
    
    # Technical Requirement
    device_type = models.CharField(max_length=20, choices=DEVICE_CHOICES, default='COMPUTER')
    network_type = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. Fiber, 4G, 5G")
    
    # Availability
    availability_days = models.TextField(help_text="e.g. Monday, Wednesday, Friday")
    availability_hours = models.TextField(help_text="e.g. 9 AM - 5 PM UTC")
    
    # Financials & Wallet
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=1500.00, db_index=True)
    @property
    def wallet_balance(self):
        from payments.models import Wallet
        wallet, _ = Wallet.objects.get_or_create(user=self.user)
        return wallet.balance
    commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Custom commission % (Override global/subject defaults)")
    
    # Privacy & Contact (Admin Only)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    personal_gmail = models.EmailField(blank=True, null=True)
    
    # Account Status
    is_blocked = models.BooleanField(default=False)
    is_public = models.BooleanField(default=False, db_index=True, help_text="Display on public home page")
    
    # Meeting Links
    live_class_link = models.URLField(blank=True, null=True, help_text="Permanent link for regular students")
    trial_class_link = models.URLField(blank=True, null=True, help_text="Permanent link for trial classes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Job Preferences
    mode = models.CharField(max_length=20, default='ONLINE', db_index=True,
                            choices=(('ONLINE', 'Online'), ('PHYSICAL', 'Physical'), ('BOTH', 'Both')))
    rate_per_month = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, db_index=True, help_text="Monthly rate for standard commitment")
    
    # Location
    state = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    city = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    
    # Education & Subjects
    qualification = models.CharField(max_length=200, blank=True, null=True)
    subjects = models.ManyToManyField('programs.Subject', blank=True, related_name='tutors')
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.status}) - {self.mode}"

class TutorAvailability(models.Model):
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='availabilities')
    day = models.CharField(max_length=20, choices=(
        ('MONDAY', 'Monday'), ('TUESDAY', 'Tuesday'), ('WEDNESDAY', 'Wednesday'),
        ('THURSDAY', 'Thursday'), ('FRIDAY', 'Friday'), ('SATURDAY', 'Saturday'), ('SUNDAY', 'Sunday')
    ))
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    def __str__(self):
        return f"{self.tutor.user.get_full_name()} - {self.day}: {self.start_time} to {self.end_time}"





class TutorDiscipline(models.Model):
    DISCIPLINE_TYPES = (
        ('WARNING', 'Warning'),
        ('QUERY', 'Query Letter'),
        ('EXPULSION', 'Expulsion'),
    )
    
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='disciplinary_records')
    discipline_type = models.CharField(max_length=20, choices=DISCIPLINE_TYPES)
    subject = models.CharField(max_length=200)
    content = models.TextField()
    pdf_letter = models.FileField(upload_to='disciplinary_letters/', blank=True, null=True)
    date_issued = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.tutor.get_full_name()} - {self.discipline_type} - {self.date_issued.date()}"

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Direct check of tutor data structure
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tutors.models import TutorProfile

print("Checking tutor data structure...")
print("=" * 50)

tutors = TutorProfile.objects.all()[:3]

for profile in tutors:
    print(f"\nTutor ID: {profile.id}")
    print(f"User ID: {profile.user.id}")
    print(f"Name: {profile.user.get_full_name()}")
    print(f"Email: {profile.user.email}")
    print(f"Status: {profile.status}")
    print(f"Created: {profile.created_at}")
    print(f"Experience: {profile.experience_years}")
    print(f"Subjects: {profile.subjects_to_teach}")
    print(f"Device: {profile.device_type}")
    print(f"Network: {profile.network_type}")
    print(f"Has Online Exp: {profile.has_online_exp}")

print("\n" + "=" * 50)
print(f"\nTotal tutors: {TutorProfile.objects.count()}")
print(f"Applied: {TutorProfile.objects.filter(status='APPLIED').count()}")
print(f"Interview Scheduled: {TutorProfile.objects.filter(status='INTERVIEW_SCHEDULED').count()}")
print(f"Approved: {TutorProfile.objects.filter(status='APPROVED').count()}")
print(f"Rejected: {TutorProfile.objects.filter(status='REJECTED').count()}")

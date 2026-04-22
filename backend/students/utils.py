# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from decimal import Decimal
from django.conf import settings
from .models import Enrollment
from core.utils.pdf_generator import generate_admission_letter

def update_student_admission_letter(profile):
    """
    Recalculates total monthly fees based on all enrollments (PENDING or APPROVED)
    and regenerates the admission letter PDF.
    """
    user = profile.user
    enrollment_data = []
    total_monthly = Decimal('0')
    
    # We include PENDING and APPROVED enrollments in the letter 
    # so the student knows what they are paying for in the initial admission phase.
    all_enrollments = profile.enrollments.filter(status__in=['PENDING', 'APPROVED'])
    
    for enr in all_enrollments:
        # We only count APPROVED or PENDING for the total payment calculation
        # If the student is in the admission portal, they pay for everything they've "enrolled" in.
        enrollment_data.append({
            'subject_name': enr.subject.name,
            'tutor_name': f"{enr.tutor.first_name} {enr.tutor.last_name}" if enr.tutor else "TBA",
            'hourly_rate': float(enr.hourly_rate),
            'weekly_rate': float(enr.weekly_rate),
            'monthly_rate': float(enr.monthly_rate),
            'hours_per_week': float(enr.hours_per_week),
            'days': enr.preferred_days or "TBA",
            'time': enr.preferred_time or "TBA",
        })
        total_monthly += enr.monthly_rate

    profile.total_amount = total_monthly
    
    payment_url = f"{settings.FRONTEND_URL}/admission-portal"
    letter_path = generate_admission_letter(user, profile, {
        'enrollments': enrollment_data,
        'total_payment': float(total_monthly),
    }, payment_url=payment_url)
    
    profile.admission_letter = letter_path
    profile.save()
    return profile.admission_letter.url if profile.admission_letter else None

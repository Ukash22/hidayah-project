import json
import datetime
from decimal import Decimal
from django.utils import timezone
from .models import Wallet, Transaction
from students.models import StudentProfile, Enrollment
from classes.models import ScheduledSession, Booking
from programs.models import Subject
from .logic import get_commission_rate
from classes.scheduler import generate_recurring_sessions

def fulfill_all_student_enrollments(student_user):
    """
    Called when a student first settles their admission fee.
    Generates the first 4 weeks of sessions for all their APPROVED enrollments.
    """
    try:
        profile = StudentProfile.objects.get(user=student_user)
        enrollments = Enrollment.objects.filter(student=profile, status='APPROVED')
        
        for enrollment in enrollments:
            # Check if sessions already exist to avoid duplication
            if ScheduledSession.objects.filter(student=student_user, subject=enrollment.subject).exists():
                continue
                
            # Generate 4 weeks of sessions
            generate_recurring_sessions(
                student=student_user,
                tutor=enrollment.tutor,
                subject_obj=enrollment.subject,
                schedule_data=enrollment.schedule,
                fee_per_session=Decimal("0"), # Admission covers initial month
                weeks=4,
                start_date=enrollment.preferred_start_date
            )
            
        return {"success": True, "count": enrollments.count()}
    except Exception as e:
        print(f"Fulfillment failed: {e}")
        return {"success": False, "error": str(e)}

def process_payment(booking):
    """
    Process payment for a booking:
    1. Calculate commission and credit tutor.
    2. Update StudentProfile (tutor, course, status).
    3. Create Enrollment record.
    4. Generate initial ScheduledSessions (4 weeks) based on the booking schedule.
    5. Mark booking as paid.
    """
    # 1. Get Dynamic Commission Rate
    rate = get_commission_rate(booking) 
    commission = (booking.price * rate) / Decimal("100.00")
    tutor_amount = booking.price - commission

    # 1. Update tutor wallet
    wallet, created = Wallet.objects.get_or_create(user=booking.tutor)
    wallet.balance += tutor_amount
    wallet.save()

    # Save transaction (credit)
    Transaction.objects.create(
        user=booking.tutor,
        amount=tutor_amount,
        transaction_type='SESSION_PAYOUT',
        description=f'Payment for Booking: {booking.subject}'
    )

    # 2. Update Student Profile
    try:
        profile = StudentProfile.objects.get(user=booking.student)
        profile.assigned_tutor = booking.tutor
        profile.payment_status = 'PAID'
        
        # Try to find the Subject object to associate correctly
        subject_obj = Subject.objects.filter(name__icontains=booking.subject).first()
        if subject_obj:
            if not profile.enrolled_courses.filter(id=subject_obj.id).exists():
                profile.enrolled_courses.add(subject_obj)
            profile.enrolled_course = subject_obj.name
        else:
            # Fatal for enrollment creation if subject doesn't exist
            logger.error(f"Cannot fulfill enrollment: Subject '{booking.subject}' not found.")
            profile.enrolled_course = booking.subject
            profile.save()
            booking.paid = True
            booking.save()
            return
            
        profile.save()

        # 3. Create Enrollment Record
        # Calculate an estimated hourly rate for the record
        est_hourly = 3000
        if booking.hours_per_week and booking.hours_per_week > 0:
            # Assume price is for 1 month (4 weeks)
            est_hourly = booking.price / (Decimal(str(booking.hours_per_week)) * Decimal('4'))

        # Check for existing enrollment to avoid duplicates
        enrollment, created = Enrollment.objects.get_or_create(
            student=profile,
            subject=subject_obj,
            tutor=booking.tutor,
            defaults={
                'hourly_rate': est_hourly,
                'hours_per_week': booking.hours_per_week or 1,
                'days_per_week': booking.days_per_week or 1,
                'schedule': booking.schedule,
                'status': 'APPROVED',
                'preferred_days': booking.preferred_days,
                'preferred_start_date': booking.preferred_start_date
            }
        )

        # 4. Generate Initial Scheduled Sessions (4 Weeks)
        # Calculate per-session fee if applicable
        generate_recurring_sessions(
            student=booking.student,
            tutor=booking.tutor,
            subject_obj=subject_obj,
            schedule_data=booking.schedule,
            weeks=4,
            start_date=booking.preferred_start_date
        )

    except StudentProfile.DoesNotExist:
        pass

    # 5. Mark booking as paid
    booking.paid = True
    booking.save()
    
    return True

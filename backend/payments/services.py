import json
import datetime
from decimal import Decimal
from django.utils import timezone
from .models import Wallet, Transaction
from students.models import StudentProfile, Enrollment
from classes.models import ScheduledSession, Booking
from programs.models import Subject
import logging
from .logic import get_commission_rate
from classes.scheduler import generate_recurring_sessions

logger = logging.getLogger(__name__)

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
        if not subject_obj:
            # Fallback: Create placeholder subject so enrollment is NOT skipped
            # Need to provide a Program as it's a required field
            from programs.models import Program
            default_program, _ = Program.objects.get_or_create(
                name="General Education",
                defaults={'program_type': 'WESTERN'}
            )
            
            subject_obj, _ = Subject.objects.get_or_create(
                name=booking.subject,
                defaults={
                    'admin_percentage': 20,
                    'program': default_program
                }
            )
            logger.info(f"Using placeholder/new subject '{booking.subject}' to ensure enrollment fulfillment.")

        if not profile.enrolled_courses.filter(id=subject_obj.id).exists():
            profile.enrolled_courses.add(subject_obj)
        profile.enrolled_course = subject_obj.name
            
        profile.save()

        # 3. Create Enrollment Record
        # Calculate an estimated hourly rate for the record
        est_hourly = 3000
        if booking.hours_per_week and booking.hours_per_week > 0:
            # Assume price is for 1 month (4 weeks)
            est_hourly = booking.price / (Decimal(str(booking.hours_per_week)) * Decimal('4'))

        # Check for existing enrollment or create new one
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
        
        # If it was already existing as PENDING, force it to APPROVED now that payment is done
        if not created and enrollment.status != 'APPROVED':
            enrollment.status = 'APPROVED'
            enrollment.save()

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

    # 5. Mark booking as paid and archived
    booking.paid = True
    booking.approved = True # Ensure it's approved if paid
    booking.save()
    
    # 6. Final safety check on profile
    if profile.payment_status != 'PAID':
        profile.payment_status = 'PAID'
        profile.save()
    
    logger.info(f"Successfully processed payment for booking {booking.id}. Enrollment created and sessions generated.")
    return True

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

def _notify_whatsapp_payment_confirmed(student_phone, student_name, subject, amount_str):
    """Non-blocking WhatsApp notification — stub if whatsapp service not configured."""
    try:
        from applications.whatsapp_service import notify_payment_confirmed
        notify_payment_confirmed(
            to_phone=student_phone,
            student_name=student_name,
            subject=subject,
            amount=amount_str,
        )
    except Exception as e:
        logger.debug(f"WhatsApp notify_payment_confirmed skipped: {e}")

def _notify_whatsapp_tutor_new_booking(tutor_phone, tutor_name, student_name, subject):
    """Non-blocking WhatsApp notification — stub if whatsapp service not configured."""
    try:
        from applications.whatsapp_service import notify_tutor_new_booking
        notify_tutor_new_booking(
            to_phone=tutor_phone,
            tutor_name=tutor_name,
            student_name=student_name,
            subject=subject,
        )
    except Exception as e:
        logger.debug(f"WhatsApp notify_tutor_new_booking skipped: {e}")

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
        logger.exception("Payment fulfillment failed")
        return {"success": False, "error": str(e)}

def fulfill_and_generate_sessions_for_booking(booking):
    """
    Fulfill an approved and paid booking:
    1. Update StudentProfile (assigned_tutor, enrolled_courses, payment_status='PAID') if exists.
    2. Create / update Enrollment record.
    3. Generate initial ScheduledSessions (4 weeks) with accurate per-session fee.
    4. Mark booking.paid = True, booking.approved = True.
    5. Send notifications to student and tutor.
    Returns True on success, False on failure.
    """
    from decimal import Decimal
    from programs.models import Subject, Program
    from classes.models import ScheduledSession
    from django.db import transaction as db_transaction

    if not booking.tutor:
        logger.warning(f"Cannot generate sessions for booking {booking.id} — no tutor assigned.")
        return False

    if not booking.paid:
        logger.warning(f"Cannot generate sessions for booking {booking.id} — booking not paid.")
        return False

    sessions_generated = 0

    try:
        with db_transaction.atomic():
            # --- Subject lookup / auto-creation ---
            subject_obj = Subject.objects.filter(name__icontains=booking.subject).first()
            if not subject_obj:
                default_program, _ = Program.objects.get_or_create(
                    name="General Education",
                    defaults={'program_type': 'WESTERN'}
                )
                subject_obj, _ = Subject.objects.get_or_create(
                    name=booking.subject,
                    defaults={'admin_percentage': 20, 'program': default_program}
                )
                logger.info(f"Auto-created subject '{booking.subject}' for booking {booking.id}.")

            # --- Parse schedule ---
            days_list = []
            if booking.schedule:
                try:
                    sched_data = json.loads(booking.schedule) if isinstance(booking.schedule, str) else booking.schedule
                    if isinstance(sched_data, list):
                        days_list = [d.get('day', '') for d in sched_data if isinstance(d, dict) and d.get('day')]
                except (ValueError, TypeError):
                    logger.warning("Malformed schedule JSON on booking %s", booking.pk)

            days_per_week = len(days_list) if days_list else 1
            preferred_days_str = ", ".join(days_list) if days_list else "Days TBA"

            # --- Update StudentProfile (best-effort — does NOT block session generation) ---
            profile = None
            try:
                profile = StudentProfile.objects.get(user=booking.student)
                profile.assigned_tutor = booking.tutor
                profile.payment_status = 'PAID'
                if not profile.enrolled_courses.filter(id=subject_obj.id).exists():
                    profile.enrolled_courses.add(subject_obj)
                profile.enrolled_course = subject_obj.name
                profile.save()
            except StudentProfile.DoesNotExist:
                logger.warning(f"StudentProfile not found for booking {booking.id} — skipping profile update.")

            # --- Create / update Enrollment (only if profile exists) ---
            if profile:
                est_hourly = Decimal('3000')
                if booking.hours_per_week and Decimal(str(booking.hours_per_week)) > 0:
                    try:
                        est_hourly = Decimal(str(booking.price)) / (Decimal(str(booking.hours_per_week)) * Decimal('4'))
                    except Exception:
                        pass

                enrollment, _ = Enrollment.objects.get_or_create(
                    student=profile,
                    subject=subject_obj,
                    tutor=booking.tutor,
                    defaults={
                        'hourly_rate': est_hourly,
                        'hours_per_week': booking.hours_per_week or 1,
                        'days_per_week': days_per_week,
                        'schedule': booking.schedule,
                        'status': 'APPROVED',
                        'preferred_days': preferred_days_str,
                        'preferred_start_date': booking.preferred_start_date,
                    }
                )
                enrollment.status = 'APPROVED'
                enrollment.tutor = booking.tutor
                enrollment.auto_renew = getattr(booking, 'auto_renew', False)
                enrollment.save()

            # --- Generate ScheduledSessions (4 weeks) if not already created ---
            existing_count = ScheduledSession.objects.filter(
                student=booking.student,
                tutor=booking.tutor,
                subject=subject_obj,
                status='PENDING'
            ).count()

            if existing_count == 0:
                total_sessions = max(1, days_per_week * 4)
                fee_per_session = Decimal(str(booking.price)) / Decimal(str(total_sessions))

                new_sessions = generate_recurring_sessions(
                    student=booking.student,
                    tutor=booking.tutor,
                    subject_obj=subject_obj,
                    schedule_data=booking.schedule,
                    fee_per_session=fee_per_session,
                    weeks=4,
                    start_date=booking.preferred_start_date
                )
                sessions_generated = len(new_sessions)
                logger.info(f"Generated {sessions_generated} sessions for booking {booking.id}")
            else:
                sessions_generated = existing_count
                logger.info(f"Sessions already exist for booking {booking.id} ({existing_count} pending) — skipping.")

            # --- Mark booking fully confirmed ---
            booking.paid = True
            booking.approved = True
            booking.tutor_declined = False
            booking.save()

    except Exception as exc:
        logger.exception(f"fulfill_and_generate_sessions_for_booking failed for booking {booking.id}: {exc}")
        return False

    # --- Notifications (outside atomic so errors don't roll back sessions) ---
    try:
        from accounts.models import Notification
        tutor_name = booking.tutor.get_full_name() or booking.tutor.username
        student_name = booking.student.get_full_name() or booking.student.username
        Notification.create(
            user=booking.student,
            title="Classes Scheduled & Ready!",
            message=f"Your booking for {booking.subject} with {tutor_name} is confirmed! {sessions_generated} class sessions have been scheduled.",
            link="/student/classes"
        )
        Notification.create(
            user=booking.tutor,
            title="New Student Classes Scheduled",
            message=f"Classes with {student_name} for {booking.subject} have been generated ({sessions_generated} sessions) and added to your schedule.",
            link="/tutor/schedule"
        )
    except Exception as ne:
        logger.warning(f"Notification error on booking {booking.id}: {ne}")

    # --- WhatsApp notifications (non-blocking) ---
    try:
        student_phone = getattr(booking.student, 'phone_number', None)
        if not student_phone and profile:
            student_phone = getattr(profile, 'phone_number', None)
        tutor_phone = getattr(booking.tutor, 'phone_number', None)
        if student_phone:
            _notify_whatsapp_payment_confirmed(
                student_phone=student_phone,
                student_name=booking.student.get_full_name() or booking.student.email,
                subject=booking.subject,
                amount_str=f"₦{booking.price:,.0f}",
            )
        if tutor_phone:
            _notify_whatsapp_tutor_new_booking(
                tutor_phone=tutor_phone,
                tutor_name=booking.tutor.get_full_name() or booking.tutor.email,
                student_name=booking.student.get_full_name() or booking.student.email,
                subject=booking.subject,
            )
    except Exception as wa_err:
        logger.warning(f"WhatsApp notification skipped for booking {booking.id}: {wa_err}")

    return True


def process_payment(booking):
    """
    Process payment for a booking:
    1. Mark booking as paid (funds held in platform escrow).
    2. If booking is ALREADY approved (by tutor or admin), immediately generate classes.
    3. If booking is NOT yet approved, notify tutor & admin to approve or assign a tutor.
       Classes will generate upon approval/assignment.
    """
    booking.paid = True
    booking.save()

    # If already approved and tutor is assigned, fulfill immediately
    if booking.approved and booking.tutor:
        fulfill_and_generate_sessions_for_booking(booking)
    else:
        # Awaiting tutor approval or admin assignment
        try:
            from accounts.models import Notification
            student_name = booking.student.get_full_name() or booking.student.username
            tutor_name = booking.tutor.get_full_name() if booking.tutor else "TBA"

            Notification.create(
                user=booking.student,
                title="Payment Confirmed — Awaiting Tutor Approval",
                message=f"Payment for {booking.subject} received! Wait for approval of your tutor. If the tutor is busy, admin will assign a new tutor for you.",
                link="/student/overview"
            )

            if booking.tutor:
                Notification.create(
                    user=booking.tutor,
                    title="Paid Booking Request",
                    message=f"{student_name} has paid for {booking.subject} and is waiting for your approval.",
                    link="/tutor/requests"
                )

            Notification.notify_admins(
                title="New Paid Booking Awaiting Approval",
                message=f"{student_name} paid ₦{booking.price:,.2f} for {booking.subject} (Tutor: {tutor_name}). Awaiting confirmation or tutor assignment.",
                link="/admin/bookings"
            )
        except Exception as ne:
            logger.warning(f"Notification error on booking payment {booking.id}: {ne}")

    return True

from decimal import Decimal
from django.db import transaction
from django.conf import settings
from .models import Wallet, Transaction, PlatformSettings, Payment
from classes.models import ScheduledSession, Booking
from django.utils import timezone
import logging
from applications.email_service import send_payment_confirmation_email, send_class_access_email

logger = logging.getLogger(__name__)

def get_commission_rate(session):
    """
    Priority:
    1. Tutor Override (TutorProfile.commission_percentage)
    2. Subject Rate (Subject.admin_percentage)
    3. Global Default (settings.DEFAULT_COMMISSION_PERCENTAGE)
    """
    from programs.models import Subject
    
    tutor_profile = getattr(session.tutor, 'tutor_profile', None)
    if tutor_profile and tutor_profile.commission_percentage is not None:
        return tutor_profile.commission_percentage
    
    # Handle both ForeignKey (Object) and CharField (String) subjects
    subject_obj = None
    if session.subject:
        if isinstance(session.subject, str):
            # Try to find the subject object by name
            subject_obj = Subject.objects.filter(name__icontains=session.subject).first()
        else:
            # It's already a Subject object
            subject_obj = session.subject

    if subject_obj and hasattr(subject_obj, 'admin_percentage') and subject_obj.admin_percentage is not None:
        return subject_obj.admin_percentage
    
    return PlatformSettings.get_settings().default_commission_percentage

@transaction.atomic
def process_session_completion(session_id, actual_duration_minutes=None):
    """
    When tutor marks class done:
    1. Debit student wallet immediately.
    2. Record commission snapshot on the session.
    3. Set payout_status to PENDING_REVIEW (admin must approve before tutor is credited).
    """
    from django.utils import timezone as tz
    session = ScheduledSession.objects.select_for_update().get(pk=session_id)

    if session.status == 'COMPLETED' and session.payout_status == 'RELEASED':
        return {"success": False, "message": "Payout already processed."}

    fee = session.fee_amount or Decimal("0.00")
    if fee <= 0:
        session.status = 'COMPLETED'
        session.payout_status = 'NONE'
        if actual_duration_minutes:
            session.actual_duration_minutes = actual_duration_minutes
        session.completed_at = tz.now()
        session.save()
        return {"success": True, "message": "Session completed (Free)."}

    # 1. Get Commission Rate & Calculate
    rate = get_commission_rate(session)
    commission = (fee * rate) / Decimal("100.00")
    net_payout = fee - commission

    # 2. Debit Student Wallet immediately
    student_wallet, _ = Wallet.objects.get_or_create(user=session.student)
    student_wallet.balance -= fee
    student_wallet.save()

    Transaction.objects.create(
        user=session.student,
        amount=fee,
        transaction_type='SESSION_DEBIT',
        description=f"Class session fee: {session.subject.name if session.subject else 'General'} with {session.tutor.get_full_name()}",
        reference=f"DEBIT-SESS-{session.id}"
    )

    # 3. Record financial snapshot & mark PENDING_REVIEW (tutor credited after admin review)
    session.status = 'COMPLETED'
    session.commission_amount = commission
    session.admin_percentage_at_completion = rate
    session.payout_status = 'PENDING_REVIEW'
    if actual_duration_minutes:
        session.actual_duration_minutes = actual_duration_minutes
    session.completed_at = tz.now()
    session.save()

    # Notify admin
    try:
        from accounts.models import Notification
        tutor_name = session.tutor.get_full_name() or session.tutor.username
        subject_name = session.subject.name if session.subject else 'General'
        duration_str = f"{actual_duration_minutes} min" if actual_duration_minutes else f"{session.duration} min (scheduled)"
        Notification.notify_admins(
            title="Class Completed — Payout Pending Review",
            message=f"{tutor_name} completed a {subject_name} class ({duration_str}). Fee: ₦{fee:,.2f} | Net to tutor: ₦{net_payout:,.2f}. Please review and release.",
            link="/admin/payouts"
        )
    except Exception as ne:
        logger.warning(f"Completion notification failed: {ne}")

    return {
        "success": True,
        "fee": float(fee),
        "commission": float(commission),
        "net_payout": float(net_payout),
        "student_balance": float(student_wallet.balance),
        "payout_status": "PENDING_REVIEW",
        "message": "Session completed. Payout is pending admin review."
    }


@transaction.atomic
def release_session_payout(session_id, admin_user):
    """
    Admin-triggered: Credit tutor wallet after reviewing completed session.
    """
    session = ScheduledSession.objects.select_for_update().get(pk=session_id)

    if session.payout_status != 'PENDING_REVIEW':
        return {"success": False, "message": f"Cannot release — payout status is '{session.payout_status}'."}

    fee = session.fee_amount or Decimal("0.00")
    commission = session.commission_amount or Decimal("0.00")
    net_payout = fee - commission

    # Credit Tutor Wallet
    tutor_wallet, _ = Wallet.objects.get_or_create(user=session.tutor)
    tutor_wallet.balance += net_payout
    tutor_wallet.save()

    Transaction.objects.create(
        user=session.tutor,
        amount=net_payout,
        transaction_type='SESSION_PAYOUT',
        description=f"Released payout: {session.subject.name if session.subject else 'General'} with {session.student.get_full_name()} (Fee: ₦{fee}, Comm: ₦{commission})",
        reference=f"PAYOUT-SESS-{session.id}"
    )

    session.payout_status = 'RELEASED'
    session.save()

    # Notify tutor
    try:
        from accounts.models import Notification
        Notification.create(
            user=session.tutor,
            title="Payout Released 💰",
            message=f"₦{net_payout:,.2f} has been credited to your wallet for the {session.subject.name if session.subject else 'General'} class.",
            link="/tutor/wallet"
        )
    except Exception as ne:
        logger.warning(f"Payout release notification failed: {ne}")

    return {
        "success": True,
        "net_payout": float(net_payout),
        "tutor_balance": float(tutor_wallet.balance)
    }

@transaction.atomic
def complete_payment_flow(user, amount, reference, gateway_ref=None):
    """
    Unified logic to complete ANY payment (Deposit, Initial Fee, or Booking):
    1. Lock and update Payment record.
    2. Credit User Wallet (with locking).
    3. Record Transaction.
    4. If it's a Booking, trigger full booking fulfillment.
    5. If it's an UNPAID student, mark as PAID/APPROVED.
    """
    from students.models import StudentProfile
    from .services import process_payment # Late import to avoid circular dependency
    
    # 1. Get and Lock Payment
    try:
        payment = Payment.objects.select_for_update().get(transaction_id=reference)
    except Payment.DoesNotExist:
        # Fallback for references from older sessions or external triggers
        payment = Payment.objects.create(
            student=user,
            amount=amount,
            status='PENDING',
            payment_method='PAYSTACK',
            transaction_id=reference
        )

    if payment.status == 'COMPLETED':
        return {"success": True, "message": "Already processed", "already_done": True}

    # 2. Update Payment Status
    payment.status = 'COMPLETED'
    payment.completed_at = timezone.now()
    if gateway_ref:
        payment.gateway_reference = gateway_ref
    payment.save()

    # 3. Handle Special Booking Flow
    is_booking = reference.startswith('BOOKING-')
    if is_booking:
        try:
            from .services import process_payment
            # Nested atomic ensures this check doesn't sink the whole payment
            with transaction.atomic():
                booking_id = reference.split('-')[1]
                booking = Booking.objects.select_for_update().get(id=booking_id)
                if not booking.paid:
                    process_payment(booking)
        except Exception as e:
            logger.error(f"Booking fulfillment failed for {reference}: {e}")

    # 4. Credit Wallet (Standard for all payments)
    wallet, _ = Wallet.objects.select_for_update().get_or_create(user=user)
    
    # Fallback to recorded amount if passed amount is 0 (useful for Mock Mode)
    final_amount = amount if Decimal(str(amount)) > 0 else payment.amount
    
    wallet.balance += Decimal(str(final_amount))
    wallet.save()

    # 5. Record Transaction
    Transaction.objects.create(
        user=user,
        amount=final_amount,
        transaction_type='DEPOSIT',
        description=f"Verified Payment: {reference}",
        reference=reference
    )

    # Dispatch Notifications
    try:
        from accounts.models import Notification
        user_display = user.get_full_name() or user.username
        Notification.notify_admins(
            title="New Payment Received",
            message=f"{user_display} completed a payment of ₦{final_amount:,.2f} (Ref: {reference}).",
            link="/admin/payments"
        )
        Notification.create(
            user=user,
            title="Payment Confirmed",
            message=f"Your payment of ₦{final_amount:,.2f} (Ref: {reference}) was successful.",
            link="/student/wallet" if getattr(user, 'role', '') == 'STUDENT' else "/tutor/wallet"
        )
    except Exception as ne:
        logger.warning(f"Payment notification failed for {user.username}: {ne}")

    # 6. Update Student Admission Status & Handle Pending Bookings
    try:
        profile = StudentProfile.objects.get(user=user)
        if profile.payment_status != 'PAID':
            profile.payment_status = 'PAID'
            profile.save()
            
            # [NEW] Fulfill all initial enrollments (Admission Fee Trigger)
            try:
                with transaction.atomic():
                    from .services import fulfill_all_student_enrollments
                    fulfill_all_student_enrollments(user)
            except Exception as e:
                logger.error(f"Initial enrollment fulfillment failed for {user.username}: {e}")
            
        # [NEW LOGIC] Check for and fulfill pending bookings now that balance is updated
        from classes.models import Booking
        pending_bookings = Booking.objects.filter(student=user, approved=True, paid=False).order_by('created_at')
        
        for pending in pending_bookings:
            if wallet.balance >= pending.price:
                try:
                    with transaction.atomic():
                        # Deduct from wallet
                        wallet.balance -= pending.price
                        wallet.save()
                        
                        # Fulfill using existing service logic
                        from .services import process_payment
                        process_payment(pending)
                        
                        # Record the debit transaction
                        Transaction.objects.create(
                            user=user,
                            amount=pending.price,
                            transaction_type='SESSION_DEBIT',
                            description=f"Automated Fulfillment: {pending.subject}",
                            reference=f"AUTO-{pending.id}"
                        )
                except Exception as e:
                    logger.error(f"Auto-fulfillment of pending booking {pending.id} failed: {e}")
                    
    except StudentProfile.DoesNotExist:
        logger.warning(f"StudentProfile not found for {user.username}. Skipping post-payment automation.")
    except Exception as e:
        import traceback
        logger.error(f"Post-payment automation failed for {user.username}: {e}\n{traceback.format_exc()}")

    # [NEW] Send Payment Confirmation Email in Background
    def _send_emails_async(user_id, payment_id, is_booking):
        from django.contrib.auth import get_user_model
        from students.models import StudentProfile
        from classes.models import ScheduledSession
        User = get_user_model()
        try:
            usr = User.objects.get(id=user_id)
            pmt = Payment.objects.get(id=payment_id)
            prof = StudentProfile.objects.get(user=usr)
            
            send_payment_confirmation_email(usr, pmt, prof)
            
            if is_booking or (prof.payment_status == 'PAID' and prof.enrollments.exists()):
                session = ScheduledSession.objects.filter(student=usr).order_by('-created_at').first()
                zoom_link = session.meeting_link if session else prof.meeting_link
                if zoom_link:
                    send_class_access_email(usr, prof, zoom_link)
        except Exception as e:
            logger.error(f"Post-payment email async thread failed: {e}")

    import threading
    threading.Thread(target=_send_emails_async, args=(user.id, payment.id, is_booking)).start()

    return {"success": True, "payment": payment}

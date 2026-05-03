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
def process_session_completion(session_id):
    """
    Automated logic to:
    1. Debit student wallet
    2. Calculate dynamic commission
    3. Credit tutor wallet
    4. Record transactions
    """
    session = ScheduledSession.objects.select_for_update().get(pk=session_id)
    
    if session.status == 'COMPLETED' and session.payout_status == 'RELEASED':
        return {"success": False, "message": "Payout already processed."}

    fee = session.fee_amount or Decimal("0.00")
    if fee <= 0:
        session.status = 'COMPLETED'
        session.payout_status = 'NONE'
        session.save()
        return {"success": True, "message": "Session completed (Free)."}

    # 1. Get Commission Rate & Calculate
    rate = get_commission_rate(session)
    commission = (fee * rate) / Decimal("100.00")
    net_payout = fee - commission

    # 2. Debit Student Wallet
    student_wallet, _ = Wallet.objects.get_or_create(user=session.student)
    if student_wallet.balance < fee:
        # We allow it for now or error? 
        # Requirement check: "Should we allow a student's wallet to go negative?"
        # Let's log it but allow for now to prevent blocking classes, 
        # or we could raise an error if the policy is strict.
        pass

    student_wallet.balance -= fee
    student_wallet.save()

    Transaction.objects.create(
        user=session.student,
        amount=fee,
        transaction_type='SESSION_DEBIT',
        description=f"Class session fee: {session.subject.name if session.subject else 'General'} with {session.tutor.get_full_name()}",
        reference=f"DEBIT-SESS-{session.id}"
    )

    # 3. Credit Tutor Wallet
    tutor_wallet, _ = Wallet.objects.get_or_create(user=session.tutor)
    tutor_wallet.balance += net_payout
    tutor_wallet.save()

    Transaction.objects.create(
        user=session.tutor,
        amount=net_payout,
        transaction_type='SESSION_PAYOUT',
        description=f"Class payout: {session.subject.name if session.subject else 'General'} with {session.student.get_full_name()} (Fee: ₦{fee}, Comm: ₦{commission})",
        reference=f"PAYOUT-SESS-{session.id}"
    )

    # 4. Record Internal Commission (Optional: track system revenue)
    # We can create a transaction for the system user or just log it in the session.
    
    # 5. Update Session
    session.status = 'COMPLETED'
    session.commission_amount = commission
    session.admin_percentage_at_completion = rate
    session.payout_status = 'RELEASED'
    session.save()

    return {
        "success": True,
        "fee": float(fee),
        "commission": float(commission),
        "net_payout": float(net_payout),
        "student_balance": float(student_wallet.balance),
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
        logger.error(f"Post-payment automation failed for {user.username}: {e}")

    # [NEW] Send Payment Confirmation Email
    try:
        profile = StudentProfile.objects.get(user=user)
        send_payment_confirmation_email(user, payment, profile)
        
        # If classes were generated, send access email
        if is_booking or (profile.payment_status == 'PAID' and profile.enrollments.exists()):
            # Find a meeting link if available
            session = ScheduledSession.objects.filter(student=user).order_by('-created_at').first()
            zoom_link = session.meeting_link if session else profile.meeting_link
            if zoom_link:
                send_class_access_email(user, profile, zoom_link)
    except Exception as e:
        logger.error(f"Post-payment email failed for {user.username}: {e}")

    return {"success": True, "payment": payment}

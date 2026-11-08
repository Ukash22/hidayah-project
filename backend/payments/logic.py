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
def process_session_completion(session_id, actual_duration_minutes=None, completion_notes=None):
    """
    When tutor marks class done:
    1. Records actual minutes taken and tutor notes.
    2. Calculates fee & platform share based on tutor rate / session fee.
    3. If session is part of a prepaid booking or admission, funds are already in platform escrow
       (student is not double debited). Only debits student if pay-per-class without prior booking.
    4. Sets payout_status to PENDING_REVIEW for Admin verification.
    """
    from django.utils import timezone as tz
    session = ScheduledSession.objects.select_for_update().get(pk=session_id)

    if session.status == 'COMPLETED':
        return {"success": False, "message": "Session already completed."}

    # Tutor's hourly rate (defaults to 3000 if not set)
    tutor_profile = getattr(session.tutor, 'tutor_profile', None)
    hourly_rate = Decimal(str(getattr(tutor_profile, 'hourly_rate', 3000) or 3000))

    # Sanitize and determine actual minutes taken
    duration_mins = actual_duration_minutes if actual_duration_minutes and actual_duration_minutes > 0 else (session.duration or 60)
    if duration_mins > 360:
        duration_mins = 360

    fee = session.fee_amount or Decimal("0.00")
    if fee <= 0:
        # Calculate fee from tutor's hourly rate and actual duration
        fee = (hourly_rate * Decimal(str(duration_mins))) / Decimal("60.00")
        session.fee_amount = fee

    # 1. Get Commission Rate & Calculate
    rate = get_commission_rate(session)
    commission = (fee * rate) / Decimal("100.00")
    net_payout = fee - commission

    # 2. Check if student already prepaid for this booking / admission
    # If prepaid, money is already held by the platform in escrow.
    is_prepaid = Booking.objects.filter(student=session.student, tutor=session.tutor, paid=True).exists()
    student_profile = getattr(session.student, 'student_profile', None)
    if student_profile and student_profile.payment_status == 'PAID':
        is_prepaid = True

    student_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=session.student)

    if not is_prepaid:
        # Only debit student wallet if pay-as-you-go session not covered by prepaid booking
        student_wallet.balance -= fee
        student_wallet.save()

        Transaction.objects.create(
            user=session.student,
            amount=fee,
            transaction_type='SESSION_DEBIT',
            description=f"Class session fee: {session.subject.name if session.subject else 'General'} with {session.tutor.get_full_name()} ({duration_mins} mins)",
            reference=f"DEBIT-SESS-{session.id}"
        )

    # 3. Record financial snapshot & mark PENDING_REVIEW (tutor credited after admin verification)
    session.status = 'COMPLETED'
    session.commission_amount = commission
    session.admin_percentage_at_completion = rate
    session.payout_status = 'PENDING_REVIEW'
    session.actual_duration_minutes = duration_mins
    if completion_notes:
        session.completion_notes = completion_notes
    session.completed_at = tz.now()
    session.save()

    # Notify admin
    try:
        from accounts.models import Notification
        tutor_name = session.tutor.get_full_name() or session.tutor.username
        subject_name = session.subject.name if session.subject else 'General'
        Notification.notify_admins(
            title="Class Completed — Pending Verification",
            message=f"{tutor_name} completed {subject_name} class ({duration_mins} mins). Fee: ₦{fee:,.2f} | Platform share: ₦{commission:,.2f} | Net to tutor: ₦{net_payout:,.2f}. Please review and verify payout.",
            link="/admin/payouts"
        )
    except Exception as ne:
        logger.warning(f"Completion notification failed: {ne}")

    return {
        "success": True,
        "fee": float(fee),
        "commission": float(commission),
        "net_payout": float(net_payout),
        "actual_duration_minutes": duration_mins,
        "student_balance": float(student_wallet.balance),
        "payout_status": "PENDING_REVIEW",
        "message": "Class finished. Actual duration recorded and submitted for admin verification."
    }


@transaction.atomic
def release_session_payout(session_id, admin_user, approved_payout=None):
    """
    Admin-triggered: Verify completed class session and release net payout to tutor's wallet.
    The remaining platform share remains safely in the platform account.
    """
    session = ScheduledSession.objects.select_for_update().get(pk=session_id)

    if session.payout_status != 'PENDING_REVIEW':
        return {"success": False, "message": f"Cannot release — payout status is '{session.payout_status}'."}

    fee = session.fee_amount or Decimal("0.00")
    commission = session.commission_amount or Decimal("0.00")
    
    if approved_payout is not None and Decimal(str(approved_payout)) >= 0:
        net_payout = Decimal(str(approved_payout))
        commission = fee - net_payout if fee > net_payout else Decimal("0.00")
    else:
        net_payout = fee - commission

    # Credit Tutor Wallet
    tutor_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=session.tutor)
    tutor_wallet.balance += net_payout
    tutor_wallet.save()

    # Record payout transaction for Tutor
    duration_str = f"{session.actual_duration_minutes or session.duration} mins"
    Transaction.objects.create(
        user=session.tutor,
        amount=net_payout,
        transaction_type='SESSION_PAYOUT',
        description=f"Verified class payout: {session.subject.name if session.subject else 'General'} with {session.student.get_full_name()} ({duration_str}). Fee: ₦{fee:,.2f}, Platform Share: ₦{commission:,.2f}",
        reference=f"PAYOUT-SESS-{session.id}"
    )

    # Record platform share retained
    if commission > 0:
        Transaction.objects.create(
            user=admin_user,
            amount=commission,
            transaction_type='COMMISSION',
            description=f"Platform commission retained from session #{session.id} (Tutor: {session.tutor.get_full_name()})",
            reference=f"COMM-SESS-{session.id}-{int(timezone.now().timestamp())}"
        )

    session.commission_amount = commission
    session.payout_status = 'RELEASED'
    session.save()

    # Notify tutor
    try:
        from accounts.models import Notification
        Notification.create(
            user=session.tutor,
            title="Payout Verified & Released 💰",
            message=f"₦{net_payout:,.2f} has been verified by Admin and credited to your wallet for the {session.subject.name if session.subject else 'General'} class ({duration_str}).",
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
    2. If it's a Booking:
       - Funds stay in the PLATFORM (Escrow).
       - Fulfill booking (create enrollment + 4-week sessions with fee_per_session).
       - Record student purchase transaction (SESSION_DEBIT).
    3. If it's a Wallet Deposit/Top-up or Admission:
       - Credit User Wallet (with locking).
       - Record DEPOSIT Transaction.
    4. If it's an UNPAID student, mark as PAID/APPROVED.
    """
    from students.models import StudentProfile
    from .services import process_payment
    
    # 1. Get and Lock Payment
    try:
        payment = Payment.objects.select_for_update().get(transaction_id=reference)
    except Payment.DoesNotExist:
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

    final_amount = amount if Decimal(str(amount)) > 0 else payment.amount

    # 3. Handle Booking Flow (Payment goes to Platform Escrow, not spendable wallet deposit)
    is_booking = reference.startswith('BOOKING-')
    if is_booking:
        try:
            booking_id = reference.split('-')[1]
            booking = Booking.objects.select_for_update().get(id=booking_id)
            if not booking.paid:
                process_payment(booking)
            
            # Record student purchase transaction
            Transaction.objects.create(
                user=user,
                amount=final_amount,
                transaction_type='SESSION_DEBIT',
                description=f"Course Booking Payment: {booking.subject} (Ref: {reference})",
                reference=reference
            )
        except Exception as e:
            logger.error(f"Booking fulfillment failed for {reference}: {e}")
    else:
        # 4. Top-up / Admission Fee: Credit User Wallet
        wallet, _ = Wallet.objects.select_for_update().get_or_create(user=user)
        wallet.balance += Decimal(str(final_amount))
        wallet.save()

        Transaction.objects.create(
            user=user,
            amount=final_amount,
            transaction_type='DEPOSIT',
            description=f"Verified Payment / Deposit: {reference}",
            reference=reference
        )

    # Dispatch Notifications
    try:
        from accounts.models import Notification
        user_display = user.get_full_name() or user.username
        Notification.notify_admins(
            title="New Payment Received",
            message=f"{user_display} completed a payment of ₦{final_amount:,.2f} (Ref: {reference}). Funds received by platform.",
            link="/admin/payments"
        )
        Notification.create(
            user=user,
            title="Payment Confirmed",
            message=f"Your payment of ₦{final_amount:,.2f} (Ref: {reference}) was successful.",
            link="/student/classes" if getattr(user, 'role', '') == 'STUDENT' else "/tutor/wallet"
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
            
        # Check for and fulfill unpaid bookings now that balance is updated
        # (Only for non-booking payments — wallet top-ups. For booking payments, 
        # process_payment handles fulfillment directly.)
        if not is_booking:
            user_wallet, _ = Wallet.objects.get_or_create(user=user)
            pending_bookings = Booking.objects.filter(student=user, paid=False).order_by('created_at')
            
            for pending in pending_bookings:
                if user_wallet.balance >= pending.price:
                    try:
                        with transaction.atomic():
                            # Deduct from wallet
                            user_wallet.balance -= pending.price
                            user_wallet.save()
                            
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


@transaction.atomic
def check_and_process_auto_renewal(student_user, booking_id=None):
    """
    Monthly Auto-Renewal Service:
    Checks if student has auto_renew enabled on their booking(s).
    If renewal conditions are met (all current sessions completed or month elapsed):
    - Verifies student wallet balance.
    - If balance is sufficient: deducts booking fee, generates the next 4 weeks of sessions,
      and notifies both student and tutor.
    - If insufficient balance: notifies student to fund wallet.
    """
    from classes.models import Booking, ScheduledSession
    from classes.scheduler import generate_recurring_sessions
    from accounts.models import Notification

    bookings_query = Booking.objects.select_for_update().filter(student=student_user, paid=True, auto_renew=True)
    if booking_id:
        bookings_query = bookings_query.filter(id=booking_id)

    results = []
    wallet, _ = Wallet.objects.select_for_update().get_or_create(user=student_user)

    for booking in bookings_query:
        # Check if student still has pending/upcoming sessions for this booking
        pending_sessions = ScheduledSession.objects.filter(
            student=student_user,
            tutor=booking.tutor,
            status='PENDING'
        ).count()

        # If more than 1 pending session remains, renewal is not yet due
        if pending_sessions > 1:
            results.append({
                "booking_id": booking.id,
                "renewed": False,
                "message": f"Renewal not yet due. {pending_sessions} upcoming sessions remaining."
            })
            continue

        # Check wallet balance
        price = booking.price
        if wallet.balance < price:
            # Insufficient funds - notify student
            Notification.create(
                user=student_user,
                title="Auto-Renewal Notice: Insufficient Balance ⚠️",
                message=f"Your monthly auto-renewal for {booking.subject} (₦{price:,.2f}) couldn't be processed. Please fund your wallet to continue classes without interruption.",
                link="/student/finance"
            )
            results.append({
                "booking_id": booking.id,
                "renewed": False,
                "message": f"Insufficient wallet balance: ₦{wallet.balance:,.2f} available, ₦{price:,.2f} required."
            })
            continue

        # Sufficient balance: Deduct from wallet and process renewal
        wallet.balance -= price
        wallet.save()

        # Record debit transaction
        ref = f"AUTORENEW-{booking.id}-{int(timezone.now().timestamp())}"
        Transaction.objects.create(
            user=student_user,
            amount=price,
            transaction_type='SESSION_DEBIT',
            description=f"Monthly Auto-Renewal: {booking.subject} with {booking.tutor.get_full_name()}",
            reference=ref
        )

        Payment.objects.create(
            student=student_user,
            amount=price,
            status='COMPLETED',
            payment_method='WALLET',
            transaction_id=ref,
            completed_at=timezone.now(),
            payment_metadata={"booking_id": booking.id, "type": "AUTO_RENEWAL"}
        )

        # Generate next 4 weeks of sessions
        import json
        days_count = 1
        if booking.schedule:
            try:
                sched_data = json.loads(booking.schedule) if isinstance(booking.schedule, str) else booking.schedule
                if isinstance(sched_data, list):
                    days_count = len(sched_data) if sched_data else 1
            except Exception:
                days_count = 1

        total_sessions = max(1, days_count * 4)
        fee_per_session = Decimal(str(price)) / Decimal(str(total_sessions))

        from programs.models import Subject
        subject_obj = Subject.objects.filter(name__icontains=booking.subject).first()

        new_sessions = generate_recurring_sessions(
            student=student_user,
            tutor=booking.tutor,
            subject_obj=subject_obj,
            schedule_data=booking.schedule,
            fee_per_session=fee_per_session,
            weeks=4,
            start_date=timezone.now().date()
        )

        # Notify student & tutor
        Notification.create(
            user=student_user,
            title="Monthly Classes Auto-Renewed! 🎉",
            message=f"Your {booking.subject} classes have been renewed for the next 4 weeks ({len(new_sessions)} sessions scheduled).",
            link="/student/classes"
        )
        Notification.create(
            user=booking.tutor,
            title="Student Auto-Renewed Classes 📚",
            message=f"{student_user.get_full_name()} has auto-renewed {booking.subject} for the next 4 weeks.",
            link="/tutor/schedule"
        )

        results.append({
            "booking_id": booking.id,
            "renewed": True,
            "sessions_count": len(new_sessions),
            "fee_per_session": float(fee_per_session),
            "new_balance": float(wallet.balance)
        })

    return results


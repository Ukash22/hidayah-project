# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
import os

def send_admission_letter_email(user, student_profile):
    """
    Send admission letter email immediately after registration
    Includes PDF attachment and payment instructions
    """
    subject = f"Welcome to Hidayah e Madarasah - Admission Letter for {user.first_name}"
    
    # Email body with payment instructions
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    Congratulations! Your registration at Hidayah e Madarasah International has been successfully completed.
    
    ADMISSION DETAILS:
    - Student Name: {user.first_name} {user.last_name}
    - Admission Number: {user.admission_number}
    - Class Type: {student_profile.get_class_type_display()}
    - Days per Week: {student_profile.days_per_week}
    
    PAYMENT INFORMATION:
    - Total Amount Due: {student_profile.total_amount} (calculated at {student_profile.hours_per_week} hrs/session)
    - Payment Reference: {student_profile.payment_reference}
    
    PAYMENT INSTRUCTIONS:
    Please complete your payment to unlock access to:
    - Live Zoom classes
    - Learning materials
    - Curriculum content
    - Assigned tutor information
    
    Your admission letter is attached to this email. You can also download it from your student dashboard.
    
    Once payment is confirmed, you will receive another email with your class access details.
    
    Login to your portal: {settings.FRONTEND_URL}/login
    Username: {user.username}
    Password: The password you set during registration
    
    JazakAllahu Khairan,
    Hidayah e Madarasah International Team
    """
    
    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.EMAIL_HOST_USER,
        to=[user.email],
    )
    
    # Attach admission letter PDF if it exists
    if student_profile.admission_letter:
        try:
            pdf_path = student_profile.admission_letter.path
            if os.path.exists(pdf_path):
                email.attach_file(pdf_path)
        except Exception as e:
            print(f"Error attaching PDF: {e}")
    
    email.send(fail_silently=False)
    return True


def send_payment_confirmation_email(user, payment, student_profile):
    """
    Send payment confirmation email after successful payment
    """
    subject = f"Payment Confirmed - Hidayah e Madarasah"
    
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    Your payment has been successfully confirmed!
    
    PAYMENT DETAILS:
    - Amount Paid: {payment.amount}
    - Payment Method: {payment.get_payment_method_display()}
    - Transaction ID: {payment.transaction_id}
    - Payment Reference: {student_profile.payment_reference}
    - Date: {payment.completed_at}
    
    Your account has been activated and you now have access to:
    - Live Zoom classes (when tutor is assigned)
    - Learning materials
    - Curriculum content
    - Assigned tutor information
    
    Login to your portal to get started: {settings.FRONTEND_URL}/login
    
    JazakAllahu Khairan,
    Hidayah e Madarasah International Team
    """
    
    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.EMAIL_HOST_USER,
        to=[user.email],
    )
    
    email.send(fail_silently=False)
    return True


def send_class_access_email(user, student_profile, zoom_link):
    """
    Send Zoom link and class access email after tutor assignment
    Only sent to paid students
    """
    subject = f"Your Class is Ready - Hidayah e Madarasah"
    
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    Great news! Your tutor has been assigned and your class is ready to begin.
    
    CLASS DETAILS:
    - Tutor: [Tutor name will be visible in dashboard]
    - Zoom Meeting Link: {zoom_link}
    
    You can now access:
    - Live Zoom classes
    - Learning materials
    - Curriculum content
    - Your assigned tutor's profile
    
    Login to your portal: {settings.FRONTEND_URL}/login
    
    May Allah bless your learning journey!
    
    JazakAllahu Khairan,
    Hidayah e Madarasah International Team
    """
    
    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.EMAIL_HOST_USER,
        to=[user.email],
    )
    
    email.send(fail_silently=False)
    return True


def send_password_reset_email(user, reset_link):
    """
    Send password reset link to user
    """
    subject = "Reset Your Password - Hidayah e Madarasah"
    
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    You requested a password reset for your Hidayah e Madarasah account.
    
    Click the link below to reset your password:
    {reset_link}
    
    If you did not request this, please ignore this email.
    
    JazakAllahu Khairan,
    Hidayah e Madarasah Team
    """
    
    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.EMAIL_HOST_USER,
        to=[user.email],
    )
    
    email.send(fail_silently=False)
    return True

def send_tutor_interview_email(user, profile, interview_link):
    interview_time_str = profile.interview_at.strftime('%Y-%m-%d %H:%M UTC') if profile.interview_at else "Agreed time"
    
    subject = "Interview Invitation - Hidayah International e-Madarasah"
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    We have reviewed your application and are impressed with your profile. We would like to invite you for an online interview.
    
    INTERVIEW DETAILS:
    - Position: Online Tutor
    - Scheduled Time: {interview_time_str}
    - Meeting Link: {interview_link}
    
    Please join the meeting at the scheduled time. If you have any technical issues, please reply to this email.
    
    JazakAllahu Khairan,
    Hidayah Recruitment Team
    """
    
    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.EMAIL_HOST_USER,
        to=[user.email],
    )
    email.send(fail_silently=False)
    return True


def send_tutor_approval_email(user, profile):
    subject = "Application Approved - Hidayah International e-Madarasah"
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    Congratulations! We are pleased to inform you that your application to join Hidayah International e-Madarasah as a Tutor has been approved.
    
    Your official Letter of Appointment is attached to this email.
    
    NEXT STEPS:
    1. Login to your dashboard: {settings.FRONTEND_URL}/login
    2. Complete your profile (Bio, Image, Video)
    3. Wait for student assignment
    
    We are excited to have you on our team!
    
    JazakAllahu Khairan,
    Hidayah Management Team
    """
    
    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.EMAIL_HOST_USER,
        to=[user.email],
    )
    
    if profile.appointment_letter:
        try:
            pdf_path = profile.appointment_letter.path
            if os.path.exists(pdf_path):
                email.attach_file(pdf_path)
        except Exception as e:
            print(f"Error attaching Appointment Letter: {e}")

    email.send(fail_silently=False)
    return True


def send_tutor_rejection_email(user, reason):
    subject = "Application Status - Hidayah International e-Madarasah"
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    Thank you for your interest in joining Hidayah International e-Madarasah.
    
    After careful review of your application, we regret to inform you that we will not be proceeding with your application at this time.
    
    REASON:
    {reason}
    
    We appreciate your time and wish you the best in your future endeavors.
    
    JazakAllahu Khairan,
    Hidayah Recruitment Team
    """
    
    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.EMAIL_HOST_USER,
        to=[user.email],
    )
    email.send(fail_silently=False)
    return True

def send_withdrawal_status_email(user, transaction):
    """Notify tutor about withdrawal request status update"""
    subject = f"Withdrawal Request {transaction.status.title()} - Hidayah"
    
    status_msg = "approved and processed" if transaction.status == 'COMPLETED' else "rejected"
    
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    Your withdrawal request for N{transaction.amount:,.2f} has been {status_msg}.
    
    DETAILS:
    - Amount: N{transaction.amount:,.2f}
    - Status: {transaction.status}
    - Date: {transaction.created_at.strftime('%Y-%m-%d')}
    
    JazakAllahu Khairan,
    Hidayah Financial Team
    """
    
    email = EmailMessage(subject, message, settings.EMAIL_HOST_USER, [user.email])
    email.send(fail_silently=False)
    return True

def send_complaint_update_email(user, complaint, is_new=False):
    """Notify user about complaint filing or resolution"""
    subject = f"{'New' if is_new else 'Updated'} Complaint Status - Hidayah"
    
    header = "Your complaint has been filed and is under review." if is_new else "An admin has responded to your complaint."
    
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    {header}
    
    COMPLAINT DETAILS:
    - Subject: {complaint.subject}
    - Status: {complaint.status}
    {f'- Admin Response: {complaint.admin_response}' if complaint.admin_response else ''}
    
    Please login to your dashboard to view more details.
    
    JazakAllahu Khairan,
    Hidayah Support Team
    """
    
    email = EmailMessage(subject, message, settings.EMAIL_HOST_USER, [user.email])
    email.send(fail_silently=False)
    return True

def send_reschedule_notification(recipient_user, request_obj):
    """Notify tutor or student about a reschedule request or approval"""
    subject = f"Class Reschedule Update - Hidayah"
    
    message = f"""
    Assalamu Alaikum {recipient_user.first_name},
    
    There is an update regarding a class rescheduling.
    
    DETAILS:
    - Original Time: {request_obj.session.scheduled_at}
    - Requested New Time: {request_obj.new_time}
    - Reason: {request_obj.reason}
    - Status: {request_obj.status}
    
    Please check your portal for further actions.
    
    JazakAllahu Khairan,
    Hidayah Academic Team
    """
    
    email = EmailMessage(subject, message, settings.EMAIL_HOST_USER, [recipient_user.email])
    email.send(fail_silently=False)
    return True

def send_tutor_discipline_email(user, discipline_record, pdf_path=None):
    """Notify tutor about disciplinary action with optional PDF attachment"""
    subject = f"IMPORTANT: Official {discipline_record.action_type} - Hidayah"
    
    message = f"""
    Assalamu Alaikum {user.first_name},
    
    Hidayah Management has issued an official {discipline_record.action_type} regarding: {discipline_record.subject}.
    
    Attached to this email is the formal correspondence detailing the case and any required actions on your part.
    
    JazakAllahu Khairan,
    Hidayah Management Board
    """
    
    email = EmailMessage(subject, message, settings.EMAIL_HOST_USER, [user.email])
    
    if pdf_path:
        full_path = os.path.join(settings.MEDIA_ROOT, pdf_path)
        if os.path.exists(full_path):
            email.attach_file(full_path)
    
    email.send(fail_silently=False)
    return True

def send_class_reminder_email(user, session, is_tutor=False):
    """Notify student and tutor about an upcoming class."""
    subject = f"Reminder: Upcoming Class in 30 Minutes! - {session.subject.name if session.subject else 'Class'}"
    
    role = "Tutor" if is_tutor else "Student"
    other_party = session.student.get_full_name() if is_tutor else session.tutor.get_full_name()
    
    room_url = session.meeting_link
    if not room_url:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        room_url = f"{frontend_url}/live/class-room-{session.id}-{session.student.id}"

    message = f"""
    Assalamu Alaikum {user.first_name},
    
    This is a quick reminder that your upcoming class is starting soon!
    
    CLASS DETAILS:
    - Subject: {session.subject.name if session.subject else 'Regular Class'}
    - Time: {session.scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}
    - Your { 'Student' if is_tutor else 'Tutor' }: {other_party}
    
    HOW TO JOIN:
    1. Log in to your {role} Dashboard at {settings.FRONTEND_URL}
    2. Look for the "Live Class Now Active" banner
    3. Click "Join Live Class" or use the direct link below:
    
    Direct Class Link: {room_url}
    
    Please ensure you are in a quiet environment and ready to learn.
    
    JazakAllahu Khairan,
    Hidayah Academic Team
    """
    
    email = EmailMessage(subject, message, settings.EMAIL_HOST_USER, [user.email])
    email.send(fail_silently=False)
    return True

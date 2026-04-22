# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta

from .models import ScheduledSession, RescheduleRequest
from .serializers import ScheduledSessionSerializer, RescheduleRequestSerializer
from applications.email_service import send_reschedule_notification


class BackfillSessionsView(APIView):
    """Admin: Backfill 4 weeks of sessions for all PAID students who have no sessions."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        from students.models import StudentProfile, Enrollment
        from classes.scheduler import generate_recurring_sessions
        from decimal import Decimal

        student_id = request.data.get('student_id')  # Optional: target one student
        force = request.data.get('force', False)

        profiles = StudentProfile.objects.filter(payment_status='PAID')
        if student_id:
            profiles = profiles.filter(user__id=student_id)

        results = []
        total_sessions = 0

        for profile in profiles:
            user = profile.user
            enrollments = Enrollment.objects.filter(student=profile, status='APPROVED')

            for enrollment in enrollments:
                if not force:
                    existing = ScheduledSession.objects.filter(
                        student=user, subject=enrollment.subject
                    ).exists()
                    if existing:
                        continue

                if not enrollment.schedule or not enrollment.tutor:
                    continue

                sessions = generate_recurring_sessions(
                    student=user,
                    tutor=enrollment.tutor,
                    subject_obj=enrollment.subject,
                    schedule_data=enrollment.schedule,
                    fee_per_session=Decimal("0"),
                    weeks=4
                )
                count = len(sessions)
                total_sessions += count
                results.append({
                    "student": user.get_full_name(),
                    "subject": enrollment.subject.name if enrollment.subject else "N/A",
                    "sessions_created": count
                })

        return Response({
            "success": True,
            "total_sessions_created": total_sessions,
            "details": results
        })


class StudentRescheduleRequestView(APIView):
    def post(self, request):
        from applications.models import TrialApplication
        
        session_id = request.data.get('session_id')
        session_type = request.data.get('session_type', 'REGULAR')
        requested_date = request.data.get('requested_date')
        requested_time = request.data.get('requested_time')
        reason = request.data.get('reason')
        
        if session_type == 'TRIAL':
            session_obj = get_object_or_404(TrialApplication, pk=session_id, email=request.user.email)
            tutor_user = session_obj.tutor
        else:
            session_obj = get_object_or_404(ScheduledSession, pk=session_id, student=request.user)
            tutor_user = session_obj.tutor
        
        reschedule_request = RescheduleRequest.objects.create(
            session=session_obj if session_type == 'REGULAR' else None,
            trial=session_obj if session_type == 'TRIAL' else None,
            initiated_by='STUDENT',
            requested_date=requested_date,
            requested_time=requested_time,
            reason=reason
        )
        
        # Notify tutor
        if tutor_user:
            send_reschedule_notification(tutor_user, reschedule_request)
            
        return Response({
            "message": "Reschedule request submitted",
            "request_id": reschedule_request.id
        })


class TutorRescheduleRequestView(APIView):
    """Tutor: Request to reschedule a class (1-hour notice required)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        session_id = request.data.get('session_id')
        requested_date = request.data.get('requested_date')
        requested_time = request.data.get('requested_time')
        reason = request.data.get('reason')
        
        session = get_object_or_404(ScheduledSession, pk=session_id, tutor=request.user)
        
        # Enforce 1-hour notice
        time_until_class = session.scheduled_at - timezone.now()
        if time_until_class < timedelta(hours=1):
            return Response({
                "error": "Reschedule requests must be made at least 1 hour before class"
            }, status=400)
        
        reschedule_request = RescheduleRequest.objects.create(
            session=session,
            initiated_by='TUTOR',
            requested_date=requested_date,
            requested_time=requested_time,
            reason=reason
        )
        
        # Notify student
        send_reschedule_notification(session.student, reschedule_request)
        return Response({
            "message": "Reschedule request submitted",
            "request_id": reschedule_request.id
        })


class AdminRescheduleApprovalView(APIView):
    """Admin or Tutor: Approve/reject reschedule requests"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, request_id):
        reschedule_request = get_object_or_404(RescheduleRequest, pk=request_id)
        action = request.data.get('action')  # 'APPROVE', 'REJECT'
        
        # Check permissions: Admin can approve any, Tutor can only approve student requests
        if not request.user.is_staff:
            if reschedule_request.initiated_by != 'STUDENT':
                return Response({"error": "Unauthorized"}, status=403)
            if reschedule_request.session.tutor != request.user:
                return Response({"error": "Unauthorized"}, status=403)
        
        if action == 'APPROVE':
            # Update the session
            session = reschedule_request.session
            new_datetime = datetime.combine(
                reschedule_request.requested_date,
                reschedule_request.requested_time
            )
            session.scheduled_at = new_datetime
            session.status = 'RESCHEDULED'
            session.save()
            
            reschedule_request.status = 'APPROVED'
            reschedule_request.processed_at = timezone.now()
            reschedule_request.save()
            
            # Notify both
            send_reschedule_notification(session.student, reschedule_request)
            if session.tutor:
                send_reschedule_notification(session.tutor, reschedule_request)
            
            return Response({"message": "Reschedule approved"})
        
        elif action == 'REJECT':
            reschedule_request.status = 'REJECTED'
            reschedule_request.admin_notes = request.data.get('notes', '')
            reschedule_request.processed_at = timezone.now()
            reschedule_request.save()
            
            # Notify requester
            requester = reschedule_request.session.student if reschedule_request.initiated_by == 'STUDENT' else reschedule_request.session.tutor
            send_reschedule_notification(requester, reschedule_request)
            
            return Response({"message": "Reschedule rejected"})
        
        return Response({"error": "Invalid action"}, status=400)


class AdminClassListView(APIView):
    """Admin: View all scheduled sessions (Global Class Management)"""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        sessions = ScheduledSession.objects.all().select_related('student', 'tutor').order_by('scheduled_at')
        return Response(ScheduledSessionSerializer(sessions, many=True).data)

class SessionStartView(APIView):
    """Tutor: Mark a regular session as started"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, session_id):
        session = get_object_or_404(ScheduledSession, pk=session_id, tutor=request.user)
        session.is_started = True
        session.save()
        return Response({"message": "Session marked as started", "is_started": True})

class TrialStartView(APIView):
    """Tutor: Mark a trial session as started"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, trial_id):
        from applications.models import TrialApplication
        trial = get_object_or_404(TrialApplication, pk=trial_id, tutor=request.user)
        trial.is_started = True
        trial.save()
        return Response({"message": "Trial session marked as started", "is_started": True})

class AdminUnifiedClassListView(APIView):
    """Admin: View combined list of Regular and Trial sessions with live status"""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        now = timezone.now()
        
        # 1. Regular Sessions
        regular_sessions = ScheduledSession.objects.all().select_related('student', 'tutor', 'subject').order_by('-scheduled_at')
        
        # 2. Trial Sessions (from applications)
        from applications.models import TrialApplication
        trial_sessions = TrialApplication.objects.filter(status='approved', scheduled_at__isnull=False).select_related('tutor').order_by('-scheduled_at')
        
        combined = []
        
        # Helper to check if live
        def check_is_live(sched_at, duration_mins):
            if not sched_at: return False
            end_at = sched_at + timedelta(minutes=duration_mins)
            # Active if now is between start-5min and end+5min for buffer
            return (sched_at - timedelta(minutes=5)) <= now <= (end_at + timedelta(minutes=5))

        for s in regular_sessions:
            combined.append({
                'id': f"reg_{s.id}",
                'db_id': s.id,
                'type': 'REGULAR',
                'student_name': s.student.get_full_name(),
                'student_email': s.student.email,
                'student_phone': s.student.phone,
                'country': s.student.country,
                'timezone': s.student.timezone,
                'gender': s.student.gender,
                'tutor_name': s.tutor.get_full_name() if s.tutor else 'Unassigned',
                'subject': s.subject.name if s.subject else 'General',
                'scheduled_at': s.scheduled_at,
                'duration': s.duration,
                'status': s.status,
                'is_live': check_is_live(s.scheduled_at, s.duration),
                'is_started': s.is_started,
                'meeting_link': s.meeting_link,
                'whiteboard_link': s.whiteboard_link
            })
            
        for t in trial_sessions:
            combined.append({
                'id': f"trial_{t.id}",
                'db_id': t.id,
                'type': 'TRIAL',
                'student_name': f"{t.first_name} {t.last_name or ''}".strip(),
                'student_email': t.email,
                'student_phone': t.phone,
                'country': t.country,
                'timezone': getattr(t, 'timezone', 'N/A'),
                'gender': getattr(t, 'gender', 'N/A'),
                'tutor_name': t.tutor.get_full_name() if t.tutor else (t.assigned_tutor or 'N/A'),
                'subject': t.course_interested,
                'scheduled_at': t.scheduled_at,
                'duration': t.duration,
                'status': 'APPROVED', # All fetched trials are approved
                'is_live': check_is_live(t.scheduled_at, t.duration),
                'is_started': t.is_started,
                'meeting_link': getattr(t.zoom_class, 'join_url', None) if hasattr(t, 'zoom_class') else None,
                'whiteboard_link': getattr(t.zoom_class, 'whiteboard_url', None) if hasattr(t, 'zoom_class') else None
            })
            
        # Re-sort combined list by scheduled_at
        combined.sort(key=lambda x: x['scheduled_at'] if x['scheduled_at'] else timezone.now(), reverse=True)
        
        return Response(combined)


class BookingRequestView(APIView):
    """Student: Create and view class bookings"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import json
        from tutors.models import TutorProfile
        from .models import Booking
        
        tutor_id = request.data.get('tutor_id')
        subject = request.data.get('subject')
        schedule = request.data.get('schedule', [])
        preferred_start_date = request.data.get('preferred_start_date')
        learning_level = request.data.get('learning_level', 'Primary School')
        class_structure = request.data.get('class_structure', 'One-on-One')
        hours_per_session = request.data.get('hours_per_session', 1.0)
        
        
        
        tutor_profile = get_object_or_404(TutorProfile, pk=tutor_id)
        
        # 1. CHECK CONFLICTS FIRST
        from .utils import check_tutor_conflict, calculate_schedule_hours
        has_conflict, conflict_msg = check_tutor_conflict(tutor_profile.user, schedule)
        
        if has_conflict:
            return Response({"error": f"{conflict_msg} Please choose another time or another tutor."}, status=400)
            
        # 2. CALCULATE PRICE & HOURS
        # Calculate exactly based on From to To time ranges
        hours_per_week = calculate_schedule_hours(schedule)
        
        from decimal import Decimal
        # Price calculation: monthly estimate (4 weeks)
        total_price = Decimal(str(tutor_profile.hourly_rate)) * hours_per_week * Decimal('4.0')
        
        booking = Booking.objects.create(
            student=request.user,
            tutor=tutor_profile.user,
            subject=subject,
            price=total_price,
            schedule=json.dumps(schedule) if isinstance(schedule, list) else json.dumps([]),
            hours_per_week=hours_per_week,
            hours_per_session=hours_per_session,
            learning_level=learning_level,
            class_structure=class_structure,
            preferred_start_date=preferred_start_date,
            approved=True # AUTO-APPROVE
        )
        return Response({"message": "Booking successful and automatically approved", "id": booking.id}, status=201)

    def get(self, request):
        from .models import Booking
        from .serializers import BookingSerializer
        bookings = Booking.objects.filter(student=request.user).order_by('-created_at')
        return Response(BookingSerializer(bookings, many=True).data)

class BookingApprovalView(APIView):
    """Tutor: Approve student bookings"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import Booking
        from .serializers import BookingSerializer
        status_filter = request.query_params.get('status', 'pending')
        
        if status_filter == 'active':
            # Approved and Paid
            bookings = Booking.objects.filter(tutor=request.user, approved=True, paid=True).order_by('-created_at')
        elif status_filter == 'approved':
             # Approved but not yet paid
             bookings = Booking.objects.filter(tutor=request.user, approved=True, paid=False).order_by('-created_at')
        else:
            # Pending Tutor Approval
            bookings = Booking.objects.filter(tutor=request.user, approved=False).order_by('-created_at')
            
        return Response(BookingSerializer(bookings, many=True).data)

    def post(self, request, booking_id):
        from .models import Booking
        booking = get_object_or_404(Booking, id=booking_id, tutor=request.user)
        action = request.resolver_match.url_name
        
        if 'approve' in action:
            booking.approved = True
            booking.save()
            return Response({"message": "Booking approved. Student notified."})
        elif 'reject' in action:
            # Instead of deleting, mark it so we can keep records or just delete if preferred
            booking.delete() 
            return Response({"message": "Booking rejected."})
        
        return Response({"error": "Invalid action"}, status=400)


class AdminBookingRequestView(APIView):
    """Admin: Get all pending bookings or approve/reject them"""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from .models import Booking
        from .serializers import BookingSerializer
        status_filter = request.query_params.get('status', 'pending')
        
        if status_filter == 'pending':
            bookings = Booking.objects.filter(approved=False).order_by('-created_at')
        elif status_filter == 'approved':
             bookings = Booking.objects.filter(approved=True, paid=False).order_by('-created_at')
        elif status_filter == 'active':
             bookings = Booking.objects.filter(approved=True, paid=True).order_by('-created_at')
        else:
            bookings = Booking.objects.all().order_by('-created_at')
            
        return Response(BookingSerializer(bookings, many=True).data)

    def post(self, request, booking_id):
        from .models import Booking
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        booking = get_object_or_404(Booking, id=booking_id)
        
        # 1. Handle Updates (Tutor/Subject Reassignment)
        new_tutor_id = request.data.get('tutor_id')
        new_subject = request.data.get('subject')
        
        if new_tutor_id:
            try:
                new_tutor = User.objects.get(id=new_tutor_id, role='TUTOR')
                booking.tutor = new_tutor
            except User.DoesNotExist:
                return Response({"error": "Tutor not found"}, status=404)
        
        if new_subject:
            booking.subject = new_subject
            
        if new_tutor_id or new_subject:
            booking.save()

        # 2. Handle Action (Approve/Reject)
        action = request.data.get('action') # 'approve' or 'reject'

        if action == 'approve':
            booking.approved = True
            booking.save()
            return Response({"message": "Booking approved by Admin", "approved": True})
        elif action == 'reject':
            booking.delete()
            return Response({"message": "Booking rejected by Admin", "approved": False})
        
        if new_tutor_id or new_subject:
             return Response({"message": "Booking updated successfully", "booking": BookingSerializer(booking).data})
             
        return Response({"error": "Invalid action or no update provided"}, status=400)
class SessionCompleteView(APIView):
    """Tutor: Mark a session as COMPLETED and trigger automated commission/payout logic"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        from payments.logic import process_session_completion
        
        try:
            # Re-fetch ensure tutor is owner
            session = get_object_or_404(ScheduledSession, pk=session_id)
            if not request.user.is_staff and session.tutor != request.user:
                return Response({"error": "Unauthorized"}, status=403)
            
            # Use centralized logic
            result = process_session_completion(session_id)
            
            if not result.get("success", False):
                return Response({"error": result.get("message", "Payout failed")}, status=400)
            
            return Response({
                "message": "Session completed successfully",
                "fee": result["fee"],
                "commission": result["commission"],
                "net_payout": result["net_payout"],
                "student_balance": result.get("student_balance"),
                "tutor_balance": result.get("tutor_balance")
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=500)
class UserSessionListView(APIView):
    """
    Unified view for Student and Tutor to see their scheduled classes (regular & trial).
    Used by the main dashboards to populate the 'Upcoming Classes' and 'Classroom' sections.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        
        # 1. Fetch Regular Sessions
        if user.role == 'TUTOR':
            regular_sessions = ScheduledSession.objects.filter(tutor=user)
        else:
            regular_sessions = ScheduledSession.objects.filter(student=user)
            
        regular_sessions = regular_sessions.select_related('student', 'tutor', 'subject').order_by('scheduled_at')
        
        combined = []
        
        # [ACCESS CONTROL] Students must have paid to see their classes
        if user.role == 'STUDENT':
            from students.models import StudentProfile
            try:
                profile = StudentProfile.objects.get(user=user)
                if profile.payment_status != 'PAID':
                    return Response(combined)  # Unpaid students see empty list
            except StudentProfile.DoesNotExist:
                return Response(combined)
                
        # 2. Fetch Trial Sessions (if any)
        from applications.models import TrialApplication
        if user.role == 'TUTOR':
            trial_sessions = TrialApplication.objects.filter(tutor=user, status='approved', scheduled_at__isnull=False)
        else:
            trial_sessions = TrialApplication.objects.filter(email=user.email, status='approved', scheduled_at__isnull=False)
            
        combined = []
        
        # Helper to check if live
        def check_is_live(sched_at, duration_mins):
            if not sched_at: return False
            end_at = sched_at + timedelta(minutes=duration_mins)
            return (sched_at - timedelta(minutes=10)) <= now <= (end_at + timedelta(minutes=10))

        for s in regular_sessions:
            combined.append({
                'id': f"reg_{s.id}",
                'db_id': s.id,
                'type': 'REGULAR',
                'student_name': s.student.get_full_name(),
                'tutor_name': s.tutor.get_full_name() if s.tutor else 'Unassigned',
                'subject': s.subject.name if s.subject else 'General',
                'scheduled_at': s.scheduled_at,
                'duration': s.duration,
                'status': s.status,
                'is_live': check_is_live(s.scheduled_at, s.duration),
                'is_started': s.is_started,
                'meeting_link': s.meeting_link,
                'whiteboard_link': s.whiteboard_link
            })
            
        for t in trial_sessions:
            combined.append({
                'id': f"trial_{t.id}",
                'db_id': t.id,
                'type': 'TRIAL',
                'student_name': f"{t.first_name} {t.last_name or ''}".strip(),
                'tutor_name': t.tutor.get_full_name() if t.tutor else 'Unassigned',
                'subject': t.course_interested or "Trial session",
                'scheduled_at': t.scheduled_at,
                'duration': t.duration,
                'status': 'APPROVED',
                'is_live': check_is_live(t.scheduled_at, t.duration),
                'is_started': t.is_started,
                'meeting_link': getattr(t.zoom_class, 'join_url', None) if hasattr(t, 'zoom_class') else None,
                'whiteboard_link': getattr(t.zoom_class, 'whiteboard_url', None) if hasattr(t, 'zoom_class') else None
            })
            
        combined.sort(key=lambda x: x['scheduled_at'] if x['scheduled_at'] else now)
        return Response(combined)

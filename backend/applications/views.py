# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import TrialApplication, ZoomClass
from .serializers import TrialApplicationSerializer
from .live_class_service import LiveClassService

class ApplicationCreateView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TrialApplicationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class ApproveApplicationView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            application = TrialApplication.objects.get(pk=pk)
            if application.status == 'approved':
                return Response({"error": "Already approved"}, status=status.HTTP_400_BAD_REQUEST)
            
            # 1. Get Details from Admin Request
            tutor_id = request.data.get('tutor_id')
            tutor_name = request.data.get('tutor_name', 'an Expert Tutor')
            
            from django.contrib.auth import get_user_model
            User = get_user_model()
            tutor_user = None
            if tutor_id:
                try:
                    from tutors.models import TutorProfile
                    tP = TutorProfile.objects.get(id=tutor_id)
                    tutor_user = tP.user
                    tutor_name = f"{tutor_user.first_name} {tutor_user.last_name}"
                except (User.DoesNotExist, TutorProfile.DoesNotExist):
                    pass

            start_time = request.data.get('start_time') # Format: YYYY-MM-DDTHH:MM:SSZ
            duration = int(request.data.get('duration', 40))
            
            application.assigned_tutor = tutor_name
            application.tutor = tutor_user
            application.scheduled_at = start_time
            application.duration = duration
            application.status = 'approved'
            application.save()
            
            # 2. Handle Meeting Link (Zoom or Manual)
            generate_zoom = request.data.get('generate_zoom', True)
            manual_link = request.data.get('meeting_link', '')
            zoom_data = None
            
            if generate_zoom:
                topic = f"Trial Class: {application.first_name} with {tutor_name}"
                description = f"Course: {application.course_interested}. Student: {application.first_name} {application.last_name or ''}"
                
                meeting_data = LiveClassService.create_meeting(topic)
                if not meeting_data:
                    return Response({"error": "Failed to create meeting room"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            if meeting_data or manual_link:
                ZoomClass.objects.update_or_create(
                    application=application,
                    defaults={
                        "meeting_id": meeting_data.get('id') if meeting_data else "",
                        "join_url": meeting_data.get('join_url') if meeting_data else manual_link,
                        "start_url": meeting_data.get('start_url') if meeting_data else manual_link,
                        "password": meeting_data.get('password', "") if meeting_data else "",
                        "whiteboard_url": meeting_data.get('whiteboard_url', "") if meeting_data else ""
                    }
                )

                
                # 4. Update Application Status & Schedule Details
                application.status = 'approved'
                application.assigned_tutor = tutor_name
                application.scheduled_at = start_time
                application.duration = duration
                application.save()
                
                # 5. Send Email
                email_sent = False
                email_error = None
                try:
                    formatted_time = start_time.replace('T', ' ') if start_time else 'To be scheduled'
                    join_link = meeting_data.get('join_url') if meeting_data else manual_link
                    whiteboard_link = meeting_data.get('whiteboard_url') if meeting_data else ""
                    
                    subject = "Your Free Trial Class Confirmation - Hidayah e Madarasah"
                    message = f"""Assalamu Alaikum {application.first_name},
                    
Your free trial class has been scheduled!

📅 Class Details:
----------------
Tutor: {tutor_name}
Topic: {application.course_interested}
Date & Time: {formatted_time} (UTC)
Duration: {duration} Minutes

🔴 Join Class Directly:
{join_link}

🎨 Whiteboard Link (if applicable):
{whiteboard_link}

You can also join via your Student Dashboard:
Link: https://hidayah-frontend.onrender.com/student

Note: Joining the class will deduct the session fee from your wallet.

Best Regards,
Hidayah e Madarasah Team"""
                    send_mail(
                        subject, 
                        message, 
                        settings.EMAIL_HOST_USER, 
                        [application.email],
                        fail_silently=False
                    )
                    email_sent = True
                except Exception as e:
                    email_error = str(e)
                    print(f"Email Error: {e}")
                
            return Response({
                "message": "Application approved.",
                "zoom_link": meeting_data.get('join_url') if meeting_data else manual_link,
                "whiteboard_link": meeting_data.get('whiteboard_url') if meeting_data else "",
                "password": meeting_data.get('password', "") if meeting_data else "",
                "email_sent": email_sent,
                "email_error": email_error
            }, status=status.HTTP_200_OK)
                
        except TrialApplication.DoesNotExist:
            return Response({"error": "Application not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ApplicationUpdateView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        try:
            application = TrialApplication.objects.get(pk=pk)
            
            # Update fields if present in request
            if 'tutor_name' in request.data:
                application.assigned_tutor = request.data['tutor_name']
            
            if 'tutor_id' in request.data:
                tutor_id = request.data['tutor_id']
                if tutor_id:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    try:
                        tutor_user = User.objects.get(id=tutor_id)
                        application.tutor = tutor_user
                        application.assigned_tutor = f"{tutor_user.first_name} {tutor_user.last_name}"
                    except User.DoesNotExist:
                        pass
                else:
                    application.tutor = None
            if 'start_time' in request.data:
                start_time = request.data['start_time']
                # Clean for Zoom/Django compatibility
                if start_time and 'T' in start_time:
                    start_time = start_time.split('.')[0]
                    if not start_time.endswith('Z'):
                        start_time += 'Z'
                application.scheduled_at = start_time
                application.reminder_sent = False
            if 'duration' in request.data:
                application.duration = int(request.data['duration'])
            
            application.save()
            return Response(TrialApplicationSerializer(application).data)
            
        except TrialApplication.DoesNotExist:
            return Response({"error": "Application not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ApplicationListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        applications = TrialApplication.objects.all().order_by('-created_at')
        serializer = TrialApplicationSerializer(applications, many=True)
        return Response(serializer.data)

class MyClassesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            from students.models import StudentProfile
            from classes.models import ScheduledSession
            from .serializers import TrialApplicationSerializer
            from classes.serializers import ScheduledSessionSerializer

            profile = StudentProfile.objects.get(user=request.user)
            
            # 1. Fetch Trial Classes
            trials = TrialApplication.objects.filter(
                email=request.user.email, 
                status='approved'
            ).order_by('-scheduled_at')
            trial_data = TrialApplicationSerializer(trials, many=True).data
            
            # 2. Fetch Regular Sessions
            sessions = ScheduledSession.objects.filter(
                student=request.user,
                status='PENDING'
            ).order_by('-scheduled_at')
            session_data = ScheduledSessionSerializer(sessions, many=True).data
            
            # Map Session data to match TrialApplication format for frontend consistency
            unified_classes = []
            for t in trial_data:
                t['type'] = 'TRIAL'
                unified_classes.append(t)
            
            for s in session_data:
                unified_classes.append({
                    'id': s['id'],
                    'course': profile.enrolled_course or 'Regular Class',
                    'scheduled_at': s['scheduled_at'],
                    'assigned_tutor': s['tutor_name'],
                    'zoom_join_url': "PROTECTED",
                    'type': 'REGULAR'
                })
            
            # Payment Gating Logic
            is_paid = profile.payment_status == 'PAID'
            
            for item in unified_classes:
                # Always hide URL, force use of Join Endpoint for deduction 
                # Trials don't need deduction usually but we use Join Endpoint for logging
                if item.get('zoom_join_url') != "PAYMENT_REQUIRED":
                     item['zoom_join_url'] = "PROTECTED" 
                
                # Only lock regular classes if unpaid; Trials are always visible
                if not is_paid and item.get('type') != 'TRIAL':
                    item['assigned_tutor'] = "LOCKED"
                    # Also lock join url if it's a regular class and unpaid
                    item['zoom_join_url'] = "PAYMENT_REQUIRED"
            
            return Response({
                "classes": unified_classes,
                "is_paid": is_paid
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class RejectApplicationView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            application = TrialApplication.objects.get(pk=pk)
            application.status = 'rejected'
            application.save()
            
            # Send Rejection Email
            try:
                subject = "Update regarding your Trial Class at Hidayah e Madarasah International"
                message = f"Assalamu Alaikum {application.first_name},\n\nThank you for your interest. Unfortunately, we are unable to approve your trial class at this time.\n\nBest Regards,\nHidayah Admin"
                send_mail(subject, message, settings.EMAIL_HOST_USER, [application.email])
            except Exception as e:
                print(f"Email Error: {e}")
                
            return Response({"message": "Application rejected and email sent."}, status=status.HTTP_200_OK)
        except TrialApplication.DoesNotExist:
            return Response({"error": "Application not found"}, status=status.HTTP_404_NOT_FOUND)

class TutorScheduleView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'TUTOR' and not request.user.is_staff:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        
        from classes.models import ScheduledSession
        from classes.serializers import ScheduledSessionSerializer

        # 1. Get trials assigned to this tutor
        trials = TrialApplication.objects.filter(tutor=request.user, status='approved').order_by('scheduled_at')
        trial_data = TrialApplicationSerializer(trials, many=True).data
        
        # Add Zoom Start URL for trials
        for trial, t_data in zip(trials, trial_data):
            try:
                zoom = trial.zoom_class
                t_data['zoom_start_url'] = zoom.start_url
                t_data['whiteboard_url'] = zoom.whiteboard_url
                t_data['meeting_id'] = zoom.meeting_id
            except:
                t_data['zoom_start_url'] = None
                t_data['whiteboard_url'] = None
            t_data['type'] = 'TRIAL'
            t_data['student_name'] = f"{t_data.get('first_name', '')} {t_data.get('last_name', '')}".strip()
            
            # Find student ID by email if they already have an account
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                student_user = User.objects.get(email=trial.email)
                t_data['student'] = student_user.id
            except:
                t_data['student'] = None

        # 2. Get regular sessions
        sessions = ScheduledSession.objects.filter(tutor=request.user).order_by('scheduled_at')
        session_data = ScheduledSessionSerializer(sessions, many=True).data

        unified_schedule = list(trial_data)
        for i, s in enumerate(session_data):
            # Fetch subject name from the queryset object to avoid n+1 overhead
            subject_name = 'Regular Class'
            if sessions[i].subject:
                subject_name = sessions[i].subject.name
            
            # Fetch schedule info from student profile
            schedule_days = ""
            schedule_time = ""
            try:
                profile = sessions[i].student.student_profile
                schedule_days = profile.preferred_days or ""
                schedule_time = profile.preferred_time or ""
            except:
                pass
            
            unified_schedule.append({
                'id': s['id'],
                'student': sessions[i].student.id,
                'first_name': s['student_name'].split(' ')[0] if s.get('student_name') else 'Student',
                'last_name': ' '.join(s['student_name'].split(' ')[1:]) if s.get('student_name') else '',
                'student_name': s.get('student_name', 'Student'),
                'scheduled_at': s['scheduled_at'],
                'course_interested': subject_name,
                'schedule_days': schedule_days,
                'schedule_time': schedule_time,
                'zoom_start_url': s['meeting_link'],
                'type': 'REGULAR'
            })
            
        return Response(unified_schedule)
@method_decorator(csrf_exempt, name='dispatch')
class JoinClassView(views.APIView):
    """
    Deduct balance and return Zoom Link.
    Cost calculated based on duration and student's rate.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            from students.models import StudentProfile
            from payments.models import PricingTier, Wallet, Transaction
            from classes.models import ScheduledSession
            from decimal import Decimal
            from django.shortcuts import get_object_or_404
            
            user = request.user
            profile = StudentProfile.objects.get(user=user)
            
            # 1. Identify the Session (Trial or Regular)
            session_obj = None
            course_name = "Class Session"
            zoom_url = ""
            whiteboard_url = ""
            duration_minutes = 40

            try:
                # Try TrialApplication
                session_obj = TrialApplication.objects.get(pk=pk, email=user.email)
                course_name = session_obj.course_interested or "Trial Session"
                duration_minutes = session_obj.duration or 40
                zoom_url = session_obj.zoom_class.join_url if hasattr(session_obj, 'zoom_class') else ""
                whiteboard_url = session_obj.zoom_class.whiteboard_url if hasattr(session_obj, 'zoom_class') else ""
            except TrialApplication.DoesNotExist:
                # Try ScheduledSession
                session_obj = get_object_or_404(ScheduledSession, pk=pk, student=user)
                course_name = profile.enrolled_course or "Regular Class"
                duration_minutes = session_obj.duration or 40
                
                # Jitsi Fallback if meeting link is blank
                zoom_url = session_obj.meeting_link or profile.meeting_link
                if not zoom_url:
                    # Generate a unique room name for internal Live Class
                    room_id = f"class-room-{session_obj.id}-{session_obj.student.id}"
                    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                    zoom_url = f"{frontend_url}/live/{room_id}"
                
                whiteboard_url = session_obj.whiteboard_link or profile.whiteboard_link
            
            # 2. Check Balance (₦1,000 Minimum to JOIN Regular classes)
            # Trials are FREE - bypass balance check
            is_trial = isinstance(session_obj, TrialApplication)
            if not is_trial and profile.wallet_balance < 1000:
                 return Response({
                     "error": "Minimum balance of ₦1,000 required to join regular classes. Please top up your wallet.",
                     "balance": float(profile.wallet_balance)
                 }, status=402)
                 
            # 3. NO DEDUCTION HERE anymore. Deduction happens at completion.
            
            return Response({
                "join_url": zoom_url,
                "whiteboard_url": whiteboard_url,
                "balance": float(profile.wallet_balance)
            })
            
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
@method_decorator(csrf_exempt, name='dispatch')
class CompleteSessionView(views.APIView):
    """
    Tutor marks session as COMPLETED.
    Deduct from student wallet, calculate commission, and set payout to PENDING.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'TUTOR' and not request.user.is_staff:
             return Response({"error": "Only tutors or admins can complete sessions"}, status=403)
             
        try:
            from classes.models import ScheduledSession
            from students.models import StudentProfile
            from payments.models import PricingTier, Wallet, Transaction
            from decimal import Decimal
            from django.utils import timezone
            
            session = get_object_or_404(ScheduledSession, pk=pk)
            
            if session.status == 'COMPLETED':
                return Response({"error": "Session already marked as completed"}, status=400)
            
            # 1. Update Session Status
            session.status = 'COMPLETED'
            session.completion_notes = request.data.get('notes', '')
            actual_duration = int(request.data.get('actual_duration', session.duration))
            
            # 2. Calculate Base Cost
            profile = StudentProfile.objects.get(user=session.student)
            
            # Determine hourly rate
            hourly_rate = Decimal('3000') # Absolute fallback
            if profile.assigned_tutor and hasattr(profile.assigned_tutor, 'tutor_profile'):
                hourly_rate = profile.assigned_tutor.tutor_profile.hourly_rate
            else:
                try:
                    pricing = PricingTier.objects.get(class_type=profile.class_type, is_active=True)
                    hourly_rate = pricing.hourly_rate
                except:
                    pass
            
            fee_amount = (Decimal(str(actual_duration)) / Decimal('60')) * hourly_rate
            
            # 3. Calculate Commission
            admin_percentage = Decimal('5.00')
            if session.subject:
                admin_percentage = session.subject.admin_percentage
            
            commission_amount = (fee_amount * admin_percentage) / Decimal('100')
            
            # 4. Deduct from Student Wallet
            # Note: Even if balance is insufficient, we deduct (can go negative or we error?)
            # The User said: "until he make his account sufficient to take the class"
            # So if they started with 1000 and finished a class that costs 1200, we deduct.
            profile.wallet_balance -= fee_amount
            profile.save()
            
            # Store snapshots in Session
            session.fee_amount = fee_amount
            session.commission_amount = commission_amount
            session.admin_percentage_at_completion = admin_percentage
            session.payout_status = 'PENDING'
            session.save()
            
            # Record student transaction
            Transaction.objects.create(
                user=profile.user,
                amount=fee_amount,
                transaction_type='SESSION_DEBIT',
                description=f"Class Fee: {session.subject.name if session.subject else 'General'} ({actual_duration} mins)",
            )
            
            return Response({
                "success": True,
                "fee_amount": float(fee_amount),
                "commission_amount": float(commission_amount),
                "tutor_share": float(fee_amount - commission_amount),
                "payout_status": "PENDING"
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class AdminReleasePayoutView(views.APIView):
    """
    Admin reviews and releases PENDING payout to Tutor's wallet.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            from classes.models import ScheduledSession
            from students.models import StudentProfile
            from payments.models import Wallet, Transaction
            from django.shortcuts import get_object_or_404
            
            session = get_object_or_404(ScheduledSession, pk=pk)
            
            if session.payout_status != 'PENDING':
                return Response({"error": "Payout is not in PENDING state"}, status=400)
            
            # 1. Calculate Tutor Share
            tutor_share = session.fee_amount - session.commission_amount
            
            # 2. Add to Tutor's Wallet
            # Assuming Tutor has a StudentProfile for wallet (common in this codebase)
            # If not, we should check TutorProfile. We'll use StudentProfile for now as a general wallet.
            try:
                tutor_profile = StudentProfile.objects.get(user=session.tutor)
                tutor_profile.wallet_balance += tutor_share
                tutor_profile.save()
                
                # Record tutor transaction
                Transaction.objects.create(
                    user=tutor_profile.user,
                    amount=tutor_share,
                    transaction_type='DEPOSIT', # Using DEPOSIT for tutor earnings
                    description=f"Earnings: Session {session.id} ({session.subject.name if session.subject else 'Class'})",
                )
            except StudentProfile.DoesNotExist:
                return Response({"error": "Tutor does not have a wallet profile (StudentProfile)"}, status=400)
            
            # 3. Update Session
            session.payout_status = 'RELEASED'
            session.save()
            
            return Response({
                "message": "Payout released successfully",
                "amount": float(tutor_share)
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class PendingPayoutsView(views.APIView):
    """
    List all sessions with PENDING payout status.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from classes.models import ScheduledSession
        from classes.serializers import ScheduledSessionSerializer
        
        sessions = ScheduledSession.objects.filter(payout_status='PENDING').order_by('-scheduled_at')
        return Response(ScheduledSessionSerializer(sessions, many=True).data)

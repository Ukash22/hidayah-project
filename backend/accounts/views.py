# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import Notification
from .serializers import UserSerializer, RegisterSerializer, NotificationSerializer, PendingStudentSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')[:20]
        return Response(NotificationSerializer(notifications, many=True).data)

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.is_read = True
            notification.save()
            return Response({"message": "Marked as read"})
        except Notification.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        username_or_email = request.data.get('username')
        password = request.data.get('password')
        
        # Try authenticating with username
        user = authenticate(username=username_or_email, password=password)
        
        # If that fails, try authenticating with email
        if not user and '@' in username_or_email:
            try:
                user_obj = User.objects.get(email__iexact=username_or_email)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass

        if user:
            if not user.is_active:
                return Response({'error': 'User account is disabled.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        return Response({'error': 'Invalid Credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class TutorListView(generics.ListAPIView):
    def get_queryset(self):
        return User.objects.filter(role='TUTOR')

class PendingStudentListView(generics.ListAPIView):
    permission_classes = (permissions.IsAdminUser,)
    serializer_class = PendingStudentSerializer

    def get_queryset(self):
        # Return students with PENDING approval status
        from students.models import StudentProfile
        return User.objects.filter(student_profile__approval_status='PENDING')

class ApproveStudentView(APIView):
    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, pk):
        try:
            from students.models import StudentProfile
            from payments.models import PricingTier
            from core.utils.pdf_generator import generate_admission_letter
            from applications.email_service import send_admission_letter_email
            from decimal import Decimal
            
            profile = StudentProfile.objects.get(user__id=pk)
            user = profile.user
            
            # Update Status
            profile.approval_status = 'APPROVED'
            profile.save()
            
            # NEW: Handle Multiple Enrollments
            from students.models import Enrollment
            from programs.models import Subject
            
            # 1. Sync legacy enrolled_courses to Enrollment model if not already done
            for subj in profile.enrolled_courses.all():
                Enrollment.objects.get_or_create(
                    student=profile,
                    subject=subj,
                    defaults={'status': 'APPROVED', 'tutor': profile.assigned_tutor}
                )
            
            # If enrollments empty but legacy course name exists
            if not profile.enrollments.exists() and profile.enrolled_course:
                try:
                    # Try to find subject by name
                    subj = Subject.objects.filter(name__icontains=profile.enrolled_course).first()
                    if subj:
                        Enrollment.objects.create(
                            student=profile,
                            subject=subj,
                            status='APPROVED',
                            tutor=profile.assigned_tutor
                        )
                except:
                    pass

            # 2. Build Fee Breakdown for PDF
            enrollment_data = []
            total_first_payment = Decimal('0')
            
            active_enrollments = profile.enrollments.all()
            for enr in active_enrollments:
                # Update enrollment rate if tutor assigned
                if enr.tutor and hasattr(enr.tutor, 'tutor_profile'):
                    enr.hourly_rate = enr.tutor.tutor_profile.hourly_rate
                    enr.save()
                
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
                total_first_payment += enr.monthly_rate
            
            # Fallback if no enrollments yet (legacy mode)
            if not enrollment_data:
                hourly_rate = Decimal('3000')
                if profile.assigned_tutor and hasattr(profile.assigned_tutor, 'tutor_profile'):
                    hourly_rate = profile.assigned_tutor.tutor_profile.hourly_rate
                
                weekly_hours = Decimal(str(profile.hours_per_week)) * Decimal(str(profile.days_per_week))
                weekly_rate = hourly_rate * weekly_hours
                monthly_rate = weekly_rate * Decimal('4')
                total_first_payment = monthly_rate # Only 1 Month
                
                enrollment_data.append({
                    'subject_name': profile.enrolled_course or "General",
                    'tutor_name': f"{profile.assigned_tutor.first_name} {profile.assigned_tutor.last_name}" if profile.assigned_tutor else "TBA",
                    'hourly_rate': float(hourly_rate),
                    'weekly_rate': float(weekly_rate),
                    'monthly_rate': float(monthly_rate),
                    'hours_per_week': float(weekly_hours),
                })

            profile.total_amount = total_first_payment
            profile.save()
            
            payment_url = f"http://localhost:5173/admission-portal"
            
            # Generate PDF
            try:
                letter_path = generate_admission_letter(user, profile, {
                    'enrollments': enrollment_data,
                    'total_payment': float(total_first_payment),
                }, payment_url=payment_url)
                profile.admission_letter = letter_path
                profile.save()
                
                # Send Email
                send_admission_letter_email(user, profile)
                
            except Exception as e:
                print(f"Error in approval PDF/Email: {e}")
                return Response({"message": "Approved but failed to generate/send letter", "error": str(e)}, status=status.HTTP_200_OK)

            return Response({"message": f"Student {user.username} approved successfully and notified."})
            
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class RequestPasswordResetView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            users = User.objects.filter(email=email)
            if not users.exists():
                return Response({"message": "Password reset link sent to your email."})
            
            user = users.first()
            
            # Generate Token
            from django.contrib.auth.tokens import PasswordResetTokenGenerator
            from django.utils.encoding import smart_bytes
            from django.utils.http import urlsafe_base64_encode
            
            uidb64 = urlsafe_base64_encode(smart_bytes(user.id))
            token = PasswordResetTokenGenerator().make_token(user)
            
            # Construct Link (Point to Frontend)
            # Assuming Frontend runs on localhost:5173 for dev
            reset_link = f"http://localhost:5173/reset-password/{uidb64}/{token}"
            
            # Send Email
            from applications.email_service import send_password_reset_email
            send_password_reset_email(user, reset_link)
            
            return Response({"message": "Password reset link sent to your email."})
            
        except User.DoesNotExist:
            # Don't reveal user existence
            return Response({"message": "Password reset link sent to your email."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SetNewPasswordView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        try:
            password = request.data.get('password')
            token = request.data.get('token')
            uidb64 = request.data.get('uidb64')
            
            if not all([password, token, uidb64]):
                 return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)
            
            from django.contrib.auth.tokens import PasswordResetTokenGenerator
            from django.utils.encoding import smart_str
            from django.utils.http import urlsafe_base64_decode
            
            id = smart_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(id=id)
            
            if not PasswordResetTokenGenerator().check_token(user, token):
                return Response({"error": "Invalid or expired token"}, status=status.HTTP_401_UNAUTHORIZED)
                
            user.set_password(password)
            user.save()
            
            return Response({"message": "Password reset successful! You can now login."})
            
        except Exception as e:
            return Response({"error": "Something went wrong"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

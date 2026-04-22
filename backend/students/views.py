# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import StudentProfile
from .serializers import StudentProfileSerializer

class StudentProfileDetailView(generics.RetrieveAPIView):
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        profile, _ = StudentProfile.objects.get_or_create(user=self.request.user)
        return profile

class ParentPortalView(generics.ListAPIView):
    """View for parents to see their linked students"""
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    

class AdminStudentViewSet(generics.ListAPIView):
    """Admin view to list all APPROVED students (Active)"""
    # Note: We use List because retrieval/update logic can be handled via sub-views or a ViewSet
    # For now, let's keep it simple: List, and specific Detail/Update views
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return StudentProfile.objects.filter(payment_status='PAID')

class AdminStudentDetailView(generics.RetrieveUpdateAPIView):
    """Admin view to Retrieve and Update Student details (Tutor, Class Type, etc)"""
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_update(self, serializer):
        old_tutor = self.get_object().assigned_tutor
        instance = serializer.save()
        new_tutor = instance.assigned_tutor
        
        # If the tutor has changed, synchronize all pending sessions
        if old_tutor != new_tutor and new_tutor:
            from classes.utils import sync_student_tutor_change
            sync_student_tutor_change(instance.user, new_tutor)

class PromoteStudentView(generics.GenericAPIView):
    """Admin view to promote a Student to a Tutor (Under Review)"""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        from django.contrib.auth import get_user_model
        from tutors.models import TutorProfile
        User = get_user_model()
        user_to_promote = get_object_or_404(User, pk=pk, role='STUDENT')

        # 1. Change Role
        user_to_promote.role = 'TUTOR'
        user_to_promote.save()

        # 2. Check if TutorProfile already exists to prevent duplicate key errors
        tutor_profile, created = TutorProfile.objects.get_or_create(
            user=user_to_promote,
            defaults={
                'status': 'PENDING',  # This puts them 'Under Review'
                'experience_years': 0,
                'hourly_rate': 1500.00
            }
        )
        
        # If it was existing, ensure it's put under review
        if not created and tutor_profile.status != 'PENDING':
             tutor_profile.status = 'PENDING'
             tutor_profile.save()

        return Response({"message": f"{user_to_promote.first_name} has been promoted to Tutor and is Under Review."})


class TutorAssignedStudentsView(generics.ListAPIView):
    """View for Tutors to see students assigned to them"""
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return StudentProfile.objects.filter(assigned_tutor=self.request.user)

class EnrollInCourseView(generics.CreateAPIView):
    """Allow students to enroll in another course from dashboard"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        import json
        from .models import StudentProfile, Enrollment
        from programs.models import Subject
        from core.utils.pdf_generator import generate_admission_letter
        from decimal import Decimal
        from django.shortcuts import get_object_or_404
        
        subject_id = request.data.get('subject_id')
        schedule = request.data.get('schedule', [])
        preferred_start_date = request.data.get('preferred_start_date')
        
        from classes.utils import calculate_schedule_hours
        
        # Calculate days and hours based on schedule
        num_sessions = len(schedule) if isinstance(schedule, list) else 1
        days = num_sessions if num_sessions > 0 else 1
        
        # Exact hour calculation using from/to difference
        total_weekly_hours = calculate_schedule_hours(schedule)
        # We need "hours per session" to maintain db backwards compatibility
        # So we take total weekly hours divided by number of days (sessions)
        hours = total_weekly_hours / Decimal(str(days))
        
        tutor_id = request.data.get('tutor_id')
        
        user = request.user
        profile = StudentProfile.objects.get(user=user)
        subject = get_object_or_404(Subject, pk=subject_id)
        
        # Check if already enrolled
        if Enrollment.objects.filter(student=profile, subject=subject, status__in=['PENDING', 'APPROVED']).exists():
            return Response({"error": "Already enrolled in this course"}, status=400)
            
        # Get Tutor Rate
        from django.contrib.auth import get_user_model
        User = get_user_model()
        tutor = None
        rate = Decimal('3000.00') # Absolute fallback
        
        if tutor_id:
            tutor = get_object_or_404(User, pk=tutor_id)
            if hasattr(tutor, 'tutor_profile'):
                rate = tutor.tutor_profile.hourly_rate
        else:
            tutor = profile.assigned_tutor
            if tutor and hasattr(tutor, 'tutor_profile'):
                rate = tutor.tutor_profile.hourly_rate

        enrollment = Enrollment.objects.create(
            student=profile,
            subject=subject,
            tutor=tutor,
            hourly_rate=rate,
            hours_per_week=hours, # Hours per session
            days_per_week=days, # Sessions per week
            schedule=json.dumps(schedule) if isinstance(schedule, list) else json.dumps([]),
            preferred_start_date=preferred_start_date,
            status='PENDING'
        )
        
        # 1.5 Create TutorRequest so it shows in Tutor Dashboard
        from scheduling.models import TutorRequest
        if tutor:
            # Summary of schedule for the request list
            schedule_summary = f"{len(schedule)} sessions/week"
            if isinstance(schedule, list) and len(schedule) > 0:
                schedule_summary = ", ".join([f"{s.get('day')} at {s.get('time')}" for s in schedule[:2]]) + ("..." if len(schedule) > 2 else "")

            TutorRequest.objects.create(
                student=user,
                tutor=tutor,
                subject=subject,
                preferred_time=schedule_summary,
                status='PENDING'
            )

        # 1.6 Notify Admin
        from notifications.models import Notification
        admins = User.objects.filter(role='ADMIN')
        for admin in admins:
            Notification.objects.create(
                user=admin,
                title="New Enrollment Request",
                message=f"Student {user.get_full_name()} requested enrollment in {subject.name} with {tutor.get_full_name() if tutor else 'TBA'}.",
                link="/admin/enrollments" # Placeholder for admin check
            )
        
        # 3. REGENERATE PDF to reflect changes via shared utility
        from .utils import update_student_admission_letter
        update_student_admission_letter(profile)
        
        return Response({
            "message": f"Successfully requested enrollment in {subject.name}. Waiting for tutor approval.",
            "admission_letter_url": profile.admission_letter.url if profile.admission_letter else None
        })


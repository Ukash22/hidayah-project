# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import TutorRequest
from .serializers import TutorRequestSerializer
from classes.models import ScheduledSession
from applications.live_class_service import LiveClassService

class IsStudentOrTutor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated

class TutorRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TutorRequestSerializer
    permission_classes = [IsStudentOrTutor]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'STUDENT':
            return TutorRequest.objects.filter(student=user)
        elif user.role == 'TUTOR':
            return TutorRequest.objects.filter(tutor=user)
        elif user.role == 'ADMIN':
            return TutorRequest.objects.all()
        return TutorRequest.objects.none()

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_request(self, request, pk=None):
        tutor_request = self.get_object()
        
        # Check permissions: Only Tutor or Admin can approve
        if request.user != tutor_request.tutor and request.user.role != 'ADMIN':
            return Response({'error': 'Not authorized to approve this request'}, status=status.HTTP_403_FORBIDDEN)
            
        tutor_request.status = 'APPROVED'
        tutor_request.save()
        
        # Auto-generate Class Session (One sample session for now, logic can be expanded)
        # In real world, we might need a separate endpoint to schedule specific dates
        # But per requirements: "When tutor approves schedule: System automatically: Generate Zoom..."
        
        # We need to parse preferred_time to get actual datetime, or just create a placeholder session
        # For MVP, we creates a session scheduled for "Tomorrow same time" or similar if parsing fails, 
        # but better to just create the session record and let Tutor update the exact time
        
        # Generate Live Class and Whiteboard
        topic = f"Regular Class: {tutor_request.student.get_full_name()} with {tutor_request.tutor.get_full_name()}"
        meeting_data = LiveClassService.create_meeting(topic)
        meeting_link = meeting_data.get('join_url')
        whiteboard_link = meeting_data.get('whiteboard_url')

        # Link Tutor to Student Profile and update Enrollment status
        from students.models import StudentProfile, Enrollment
        from students.utils import update_student_admission_letter
        try:
            profile = StudentProfile.objects.get(user=tutor_request.student)
            
            # Update the specific Enrollment record
            enrollment = Enrollment.objects.filter(student=profile, subject=tutor_request.subject).first()
            if enrollment:
                enrollment.status = 'APPROVED'
                enrollment.tutor = tutor_request.tutor
                enrollment.save()

            # If student doesn't have an assigned tutor, or if it's currently null, assign this one as primary
            if not profile.assigned_tutor:
                profile.assigned_tutor = tutor_request.tutor
            
            # Update links (usually student profile holds the 'active' room links)
            profile.meeting_link = meeting_link
            profile.whiteboard_link = whiteboard_link
            
            # Regenerate Admission Letter and Update Total Amount
            update_student_admission_letter(profile)
            
            profile.save()
        except StudentProfile.DoesNotExist:
            pass

        ScheduledSession.objects.create(
            student=tutor_request.student,
            tutor=tutor_request.tutor,
            scheduled_at=timezone.now() + timezone.timedelta(days=1), # Placeholder: 24h from now
            status='PENDING',
            meeting_link=meeting_link,
            whiteboard_link=whiteboard_link
        )
        
        return Response({'status': 'Request approved, tutor assigned, and session created'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_request(self, request, pk=None):
        tutor_request = self.get_object()
        reason = request.data.get('reason', '')
        
        if request.user != tutor_request.tutor and request.user.role != 'ADMIN':
             return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
             
        tutor_request.status = 'REJECTED'
        tutor_request.rejection_reason = reason
        tutor_request.save()
        
        # Should send email notification here (via notifications app or signal)
        
        return Response({'status': 'Request rejected'}, status=status.HTTP_200_OK)

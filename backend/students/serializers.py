# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import StudentProfile

from accounts.serializers import UserSerializer
from tutors.serializers import PublicTutorSerializer

class EnrollmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    tutor_name = serializers.SerializerMethodField()
    
    class Meta:
        from .models import Enrollment
        model = Enrollment
        fields = ('id', 'subject', 'subject_name', 'tutor', 'tutor_name', 'tutor_class_link', 'hourly_rate', 'hours_per_week', 'days_per_week', 'preferred_days', 'preferred_time', 'weekly_rate', 'monthly_rate', 'status', 'upcoming_sessions_count', 'upcoming_sessions')

    def get_upcoming_sessions_count(self, obj):
        from classes.models import ScheduledSession
        from django.utils import timezone
        return ScheduledSession.objects.filter(
            student=obj.student.user,
            subject=obj.subject,
            status='PENDING',
            scheduled_at__gte=timezone.now()
        ).count()

    def get_tutor_name(self, obj):
        if obj.tutor:
            return f"{obj.tutor.first_name} {obj.tutor.last_name}"
        return "TBA"

    tutor_class_link = serializers.SerializerMethodField()
    def get_tutor_class_link(self, obj):
        if obj.tutor and hasattr(obj.tutor, 'tutor_profile'):
            return obj.tutor.tutor_profile.live_class_link
        return None

    upcoming_sessions = serializers.SerializerMethodField()
    def get_upcoming_sessions(self, obj):
        from classes.models import ScheduledSession
        from django.utils import timezone
        sessions = ScheduledSession.objects.filter(
            student=obj.student.user,
            subject=obj.subject,
            status='PENDING',
            scheduled_at__gte=timezone.now()
        ).order_by('scheduled_at')[:5] # Show next 5 sessions
        
        return [{
            'id': s.id,
            'scheduled_at': s.scheduled_at,
            'meeting_link': s.meeting_link,
            'whiteboard_link': s.whiteboard_link,
            'is_started': s.is_started
        } for s in sessions]

class StudentProfileSerializer(serializers.ModelSerializer):
    admission_letter_url = serializers.SerializerMethodField()
    user = UserSerializer(read_only=True)
    user_details = UserSerializer(source='user', read_only=True)
    preferred_tutor_details = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    assigned_tutor_details = serializers.SerializerMethodField()
    enrollments = EnrollmentSerializer(many=True, read_only=True)
    wallet_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = (
            'id', 'payment_status', 'address', 'admission_letter', 'admission_letter_url', 
            'enrolled_course', 'days_per_week', 'hours_per_week', 'preferred_days', 
            'preferred_time', 'preferred_time_exact', 'class_type', 'level',
            'target_exam_type', 'target_exam_year', 'relationship',
            'user', 'user_details', 'assigned_tutor', 'assigned_tutor_details', 'preferred_tutor', 'preferred_tutor_details', 'meeting_link', 'whiteboard_link', 'meeting_link_approved',
            'full_name', 'total_amount', 'payment_reference', 'wallet_balance', 'approval_status',
            'enrollments'
        )
        
    def get_admission_letter_url(self, obj):
        if obj.admission_letter:
            from django.conf import settings
            return f"{settings.BACKEND_URL}{obj.admission_letter.url}"
        return None
    
    def get_assigned_tutor_details(self, obj):
        if obj.assigned_tutor and hasattr(obj.assigned_tutor, 'tutor_profile'):
            tp = obj.assigned_tutor.tutor_profile
            return {
                'id': tp.id,
                'user_id': obj.assigned_tutor.id,
                'full_name': f"{obj.assigned_tutor.first_name} {obj.assigned_tutor.last_name}",
                'image': tp.image.url if tp.image else None,
                'bio': tp.bio,
                'rating': 5.0, # Placeholder
                'subjects': tp.subjects_to_teach or tp.subjects or "",
                'live_class_link': tp.live_class_link
            }
        return None

    def get_preferred_tutor_details(self, obj):
        if obj.preferred_tutor and hasattr(obj.preferred_tutor, 'tutor_profile'):
            return {
                'id': obj.preferred_tutor.id,
                'full_name': f"{obj.preferred_tutor.first_name} {obj.preferred_tutor.last_name}",
            }
        return None

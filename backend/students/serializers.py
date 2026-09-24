# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import StudentProfile

from accounts.serializers import UserSerializer
from tutors.serializers import PublicTutorSerializer, resolve_media_url
from django.contrib.auth import get_user_model

User = get_user_model()


class FlexibleTutorRelatedField(serializers.PrimaryKeyRelatedField):
    """PrimaryKeyRelatedField that gracefully accepts None/empty string and
    can resolve either a User ID or a TutorProfile ID."""

    def get_queryset(self):
        return User.objects.filter(role='TUTOR')

    def to_internal_value(self, data):
        if data in ('', 0, '0', None, 'null'):
            return None
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError:
            from tutors.models import TutorProfile
            try:
                tp = TutorProfile.objects.filter(id=int(data)).select_related('user').first()
                if tp and tp.user and tp.user.role == 'TUTOR':
                    return tp.user
            except (ValueError, TypeError):
                pass
            raise


class EnrollmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    tutor_name = serializers.SerializerMethodField()
    upcoming_sessions_count = serializers.SerializerMethodField()

    class Meta:
        from .models import Enrollment
        model = Enrollment
        fields = ('id', 'subject', 'subject_name', 'tutor', 'tutor_name', 'tutor_class_link', 'hourly_rate', 'hours_per_week', 'days_per_week', 'preferred_days', 'preferred_time', 'weekly_rate', 'monthly_rate', 'status', 'upcoming_sessions_count', 'upcoming_sessions')

    def _cached_sessions(self, obj):
        """Run the session query once and cache it on the enrollment instance."""
        if not hasattr(obj, '_upcoming_sessions_cache'):
            from classes.models import ScheduledSession
            from django.utils import timezone
            obj._upcoming_sessions_cache = list(
                ScheduledSession.objects.filter(
                    student=obj.student.user,
                    subject=obj.subject,
                    status='PENDING',
                    scheduled_at__gte=timezone.now()
                ).order_by('scheduled_at')[:5]
            )
        return obj._upcoming_sessions_cache

    def get_upcoming_sessions_count(self, obj):
        return len(self._cached_sessions(obj))

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
        sessions = self._cached_sessions(obj)
        tutor_link = None
        if obj.tutor and hasattr(obj.tutor, 'tutor_profile'):
            tutor_link = obj.tutor.tutor_profile.live_class_link
        return [{
            'id': s.id,
            'scheduled_at': s.scheduled_at,
            'meeting_link': s.meeting_link or tutor_link,
            'whiteboard_link': s.whiteboard_link or tutor_link,
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

    assigned_tutor = FlexibleTutorRelatedField(required=False, allow_null=True)
    preferred_tutor = FlexibleTutorRelatedField(required=False, allow_null=True)
    level = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    meeting_link = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    whiteboard_link = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    class_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    days_per_week = serializers.IntegerField(required=False, default=3)
    hours_per_week = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=1.0)
    enrolled_course = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
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
        # Clients only read admission_letter_url; serialising the raw FileField
        # crashes when Cloudinary isn't configured (e.g. local dev without creds).
        extra_kwargs = {'admission_letter': {'write_only': True}}

    def get_admission_letter_url(self, obj):
        if obj.admission_letter:
            from django.conf import settings
            try:
                return f"{settings.BACKEND_URL}{obj.admission_letter.url}"
            except Exception:
                # Storage backend unavailable/misconfigured — degrade to no link
                return None
        return None
    
    def get_assigned_tutor_details(self, obj):
        if obj.assigned_tutor and hasattr(obj.assigned_tutor, 'tutor_profile'):
            tp = obj.assigned_tutor.tutor_profile
            return {
                'id': tp.id,
                'user_id': obj.assigned_tutor.id,
                'full_name': f"{obj.assigned_tutor.first_name} {obj.assigned_tutor.last_name}",
                'image': resolve_media_url(tp.image),
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

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import ScheduledSession, RescheduleRequest, Booking, Batch

class BookingSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    tutor_name = serializers.SerializerMethodField()
    student_email = serializers.EmailField(source='student.email', read_only=True)
    tutor_class_link = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    approval_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ('created_at',)

    def get_tutor_name(self, obj):
        if obj.tutor:
            return obj.tutor.get_full_name() or obj.tutor.username
        return "Unassigned (Admin Assigning)"

    def get_status(self, obj):
        if obj.paid and obj.approved:
            return 'ACTIVE'
        if obj.paid and not obj.approved:
            if getattr(obj, 'tutor_declined', False):
                return 'TUTOR_BUSY_AWAITING_ADMIN'
            return 'AWAITING_APPROVAL'
        if not obj.paid and obj.approved:
            return 'APPROVED_PENDING_PAYMENT'
        return 'PENDING_PAYMENT'

    def get_status_display(self, obj):
        if obj.paid and obj.approved:
            return 'Active'
        if obj.paid and not obj.approved:
            if getattr(obj, 'tutor_declined', False):
                return 'Tutor Busy — Admin Assigning'
            return 'Wait for tutor approval or admin'
        if not obj.paid and obj.approved:
            return 'Pending Payment'
        return 'Pending Payment'

    def get_approval_message(self, obj):
        if obj.paid and not obj.approved:
            if getattr(obj, 'tutor_declined', False):
                return "Your requested tutor is currently busy. An Admin will assign a replacement tutor for your class shortly."
            return "Wait for approval of your tutor or admin. If the tutor is busy, admin will assign a new tutor for you."
        if not obj.paid:
            return "Pending payment. Please complete payment to confirm your booking and generate class links."
        return None

    def get_tutor_class_link(self, obj):
        if obj.tutor and hasattr(obj.tutor, 'tutor_profile') and obj.tutor.tutor_profile.live_class_link:
            return obj.tutor.tutor_profile.live_class_link
        # Fallback to first pending session's generated meeting link
        first_session = ScheduledSession.objects.filter(
            student=obj.student, tutor=obj.tutor, status='PENDING'
        ).order_by('scheduled_at').first()
        if first_session and first_session.meeting_link:
            return first_session.meeting_link
        return None

class ScheduledSessionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    tutor_name = serializers.CharField(source='tutor.get_full_name', read_only=True)
    tutor_class_link = serializers.SerializerMethodField()
    
    class Meta:
        model = ScheduledSession
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'reminder_sent')

    def get_tutor_class_link(self, obj):
        if hasattr(obj.tutor, 'tutor_profile'):
            return obj.tutor.tutor_profile.live_class_link
        return None


class RescheduleRequestSerializer(serializers.ModelSerializer):
    session_details = ScheduledSessionSerializer(source='session', read_only=True)

    class Meta:
        model = RescheduleRequest
        fields = '__all__'
        read_only_fields = ('created_at', 'processed_at')


class BatchSerializer(serializers.ModelSerializer):
    tutor_name = serializers.CharField(source='tutor.get_full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)
    student_count = serializers.IntegerField(source='students.count', read_only=True)
    students_detail = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ['id', 'name', 'description', 'tutor', 'tutor_name',
                  'subject', 'subject_name', 'students', 'students_detail',
                  'student_count', 'is_active', 'created_at']
        read_only_fields = ['created_at']

    def get_students_detail(self, obj):
        return [
            {'id': s.id, 'name': s.get_full_name(), 'email': s.email}
            for s in obj.students.all()
        ]


class SchemeOfWorkSerializer(serializers.ModelSerializer):
    tutor_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    batch_name = serializers.SerializerMethodField()

    class Meta:
        from .models import SchemeOfWork
        model = SchemeOfWork
        fields = [
            'id', 'tutor', 'tutor_name', 'student', 'student_name',
            'batch', 'batch_name', 'subject', 'subject_name',
            'week_number', 'topic', 'learning_objectives',
            'is_completed', 'completed_at', 'tutor_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['tutor', 'completed_at', 'created_at', 'updated_at']

    def get_tutor_name(self, obj):
        if not obj.tutor:
            return None
        return obj.tutor.get_full_name() or obj.tutor.username

    def get_student_name(self, obj):
        if not obj.student:
            return None
        return obj.student.get_full_name() or obj.student.username

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_batch_name(self, obj):
        return obj.batch.name if obj.batch else None

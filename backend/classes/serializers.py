# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import ScheduledSession, RescheduleRequest, Booking, Batch

class BookingSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    tutor_name = serializers.CharField(source='tutor.get_full_name', read_only=True)
    student_email = serializers.EmailField(source='student.email', read_only=True)
    tutor_class_link = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ('created_at',)

    def get_status(self, obj):
        if obj.paid:
            return 'ACTIVE'
        if obj.approved:
            return 'APPROVED'
        return 'PENDING'

    def get_tutor_class_link(self, obj):
        if hasattr(obj.tutor, 'tutor_profile'):
            return obj.tutor.tutor_profile.live_class_link
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
    tutor_name = serializers.CharField(source='tutor.get_full_name', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True, default=None)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)
    batch_name = serializers.CharField(source='batch.name', read_only=True, default=None)

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

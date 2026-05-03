# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import ScheduledSession, RescheduleRequest, Booking

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

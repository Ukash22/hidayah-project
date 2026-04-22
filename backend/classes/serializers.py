# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import ScheduledSession, RescheduleRequest, Booking

class BookingSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    tutor_name = serializers.CharField(source='tutor.get_full_name', read_only=True)
    student_email = serializers.EmailField(source='student.email', read_only=True)
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

class ScheduledSessionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    tutor_name = serializers.CharField(source='tutor.get_full_name', read_only=True)
    
    class Meta:
        model = ScheduledSession
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'reminder_sent')


class RescheduleRequestSerializer(serializers.ModelSerializer):
    session_details = ScheduledSessionSerializer(source='session', read_only=True)
    
    class Meta:
        model = RescheduleRequest
        fields = '__all__'
        read_only_fields = ('created_at', 'processed_at')

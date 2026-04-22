# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import TrialApplication, ZoomClass

class TrialApplicationSerializer(serializers.ModelSerializer):
    zoom_join_url = serializers.CharField(source='zoom_class.join_url', read_only=True)
    zoom_start_url = serializers.CharField(source='zoom_class.start_url', read_only=True)
    zoom_password = serializers.CharField(source='zoom_class.password', read_only=True)
    whiteboard_url = serializers.CharField(source='zoom_class.whiteboard_url', read_only=True)

    class Meta:
        model = TrialApplication
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'country', 
            'course_interested', 'preferred_tutor', 'preferred_day', 'preferred_time', 'preferred_time_exact', 'message', 
            'status', 'created_at', 'zoom_join_url', 'zoom_start_url', 'zoom_password', 'whiteboard_url',
            'assigned_tutor', 'scheduled_at', 'duration'
        ]
        read_only_fields = ['status', 'created_at', 'zoom_join_url', 'zoom_start_url', 'zoom_password']

class ZoomClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZoomClass
        fields = '__all__'

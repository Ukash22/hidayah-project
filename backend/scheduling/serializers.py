# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import TutorRequest
from students.models import StudentProfile
from tutors.models import TutorProfile

class TutorRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    tutor_name = serializers.CharField(source='tutor.get_full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
    class Meta:
        model = TutorRequest
        fields = ['id', 'student', 'student_name', 'tutor', 'tutor_name', 
                  'subject', 'subject_name', 'preferred_time', 'status', 
                  'rejection_reason', 'created_at']
        read_only_fields = ['student', 'status', 'rejection_reason'] # Student is set from request.user

    def create(self, validated_data):
        # Ensure student is set to current user
        request = self.context.get('request')
        if request and hasattr(request.user, 'student_profile'):
             # We might need to handle if user doesn't have student_profile but request implies it
             pass
        validated_data['student'] = request.user
        return super().create(validated_data)

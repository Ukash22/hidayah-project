# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import Complaint

class ComplaintSerializer(serializers.ModelSerializer):
    filed_by_name = serializers.CharField(source='filed_by.get_full_name', read_only=True)
    filed_against_name = serializers.CharField(source='filed_against.get_full_name', read_only=True)
    filed_by_role = serializers.CharField(source='filed_by.role', read_only=True)
    filed_against_role = serializers.CharField(source='filed_against.role', read_only=True)
    
    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ('created_at', 'resolved_at')

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import LearningMaterial

class LearningMaterialSerializer(serializers.ModelSerializer):
    tutor_name = serializers.CharField(source='tutor.get_full_name', read_only=True)



    class Meta:
        model = LearningMaterial
        fields = ['id', 'tutor_name', 'title', 'description', 'material_type', 'file', 'external_url', 'thumbnail', 'is_public', 'assigned_students', 'created_at', 'updated_at']
        read_only_fields = ('tutor', 'created_at', 'updated_at')


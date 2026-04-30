# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import Program, Subject

class SubjectSerializer(serializers.ModelSerializer):
    program_type = serializers.CharField(source='program.program_type', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    
    class Meta:
        model = Subject
        fields = ['id', 'program', 'name', 'slug', 'program_type', 'program_name', 'admin_percentage']


class ProgramSerializer(serializers.ModelSerializer):
    subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = Program
        fields = ['id', 'name', 'program_type', 'description', 'subjects']

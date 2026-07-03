# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.core.cache import cache
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from .models import Program, Subject
from .serializers import ProgramSerializer, SubjectSerializer

class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def list(self, request, *args, **kwargs):
        cached = cache.get('program_list')
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        cache.set('program_list', response.data, timeout=600)
        return response

    def perform_create(self, serializer):
        super().perform_create(serializer)
        cache.delete('program_list')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        cache.delete('program_list')

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        cache.delete('program_list')


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    filterset_fields = ['program__program_type']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

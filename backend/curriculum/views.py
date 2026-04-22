# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import LearningMaterial
from .serializers import LearningMaterialSerializer

class LearningMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = LearningMaterialSerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return LearningMaterial.objects.none()
            
        role = getattr(user, 'role', '')
        if user.is_staff or role == 'ADMIN':
            return LearningMaterial.objects.all()
            
        if role == 'TUTOR':
            return LearningMaterial.objects.filter(tutor=user)
            
        if role == 'STUDENT':
            from students.models import StudentProfile
            from django.db.models import Q
            try:
                profile = StudentProfile.objects.get(user=user)
                from payments.models import Wallet
                wallet, _ = Wallet.objects.get_or_create(user=user)
                if wallet.balance > 0:
                    # Students see PUBLIC materials OR materials assigned to THEM specifically OR materials from their TUTOR
                    return LearningMaterial.objects.filter(
                        Q(is_public=True) | 
                        Q(assigned_students=user) | 
                        Q(tutor=profile.assigned_tutor)
                    ).distinct()
                return LearningMaterial.objects.none()
            except StudentProfile.DoesNotExist:
                return LearningMaterial.objects.none()
                
        return LearningMaterial.objects.none()

    def perform_create(self, serializer):
        serializer.save(tutor=self.request.user)

    @action(detail=True, methods=['post'], url_path='bulk-assign')
    def bulk_assign(self, request, pk=None):
        material = self.get_object()
        student_ids = request.data.get('students', [])
        
        if not isinstance(student_ids, list):
            return Response({"error": "student_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Add students to the ManyToMany relationship
        for s_id in student_ids:
            try:
                student = User.objects.get(pk=s_id)
                material.assigned_students.add(student)
            except User.DoesNotExist:
                continue
                
        return Response({"status": f"Successfully assigned material to {len(student_ids)} students"}, status=status.HTTP_200_OK)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

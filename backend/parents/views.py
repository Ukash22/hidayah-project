# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import ParentProfile
from students.models import StudentProfile
from classes.models import ScheduledSession
from payments.models import Payment
from rest_framework_simplejwt.tokens import RefreshToken

class ParentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ParentProfile.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def child_dashboard(self, request):
        from students.serializers import StudentProfileSerializer
        children = StudentProfile.objects.filter(parent=request.user)
        serializer = StudentProfileSerializer(children, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def impersonate_child(self, request):
        child_id = request.data.get('child_id')
        if not child_id:
            return Response({"error": "Child ID required"}, status=400)
            
        try:
            # Note: Depending on frontend passed id, it could be Profile ID or User ID.
            # Assuming profile ID is what the frontend has.
            student_profile = StudentProfile.objects.get(id=child_id, parent=request.user)
            child_user = student_profile.user
            
            refresh = RefreshToken.for_user(child_user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "student_id": student_profile.id,
                "student_name": child_user.get_full_name()
            })
        except StudentProfile.DoesNotExist:
            return Response({"error": "Unauthorized or child not found"}, status=403)

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Complaint
from .serializers import ComplaintSerializer
from accounts.models import Notification

User = get_user_model()

from applications.email_service import send_complaint_update_email


class FileComplaintView(APIView):
    """Student or Tutor: File a complaint"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        filed_against_id = request.data.get('filed_against_id')
        subject = request.data.get('subject')
        description = request.data.get('description')
        
        filed_against = get_object_or_404(User, pk=filed_against_id)
        
        complaint = Complaint.objects.create(
            filed_by=request.user,
            filed_against=filed_against,
            subject=subject,
            description=description
        )
        
        
        # Notify user (and admin in a real scenario, but here we focus on the filer)
        send_complaint_update_email(request.user, complaint, is_new=True)
        Notification.create(request.user, "Complaint Filed", f"Your complaint regarding {subject} has been filed successfully.")
        return Response({
            "message": "Complaint filed successfully",
            "complaint_id": complaint.id
        })
    
    def get(self, request):
        """Get complaints filed by or against the user"""
        filed_by_me = Complaint.objects.filter(filed_by=request.user)
        filed_against_me = Complaint.objects.filter(filed_against=request.user)
        
        return Response({
            "filed_by_me": ComplaintSerializer(filed_by_me, many=True).data,
            "filed_against_me": ComplaintSerializer(filed_against_me, many=True).data
        })


class AdminComplaintManagementView(APIView):
    """Admin: View and manage all complaints"""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get all complaints"""
        complaints = Complaint.objects.all().order_by('-created_at')
        return Response(ComplaintSerializer(complaints, many=True).data)
    
    def post(self, request, complaint_id):
        """Respond to or resolve a complaint"""
        complaint = get_object_or_404(Complaint, pk=complaint_id)
        
        # If 'response' is provided, we save it and mark as RESOLVED
        admin_response = request.data.get('response') or request.data.get('admin_response')
        
        if admin_response:
            complaint.admin_response = admin_response
            complaint.status = 'RESOLVED'
            complaint.resolved_at = timezone.now()
            complaint.save()
            
            # Notify the filer
            send_complaint_update_email(complaint.filed_by, complaint)
            Notification.create(complaint.filed_by, "Complaint Resolved", f"Your complaint regarding {complaint.subject} has been resolved. Response: {admin_response[:50]}...")
            
            return Response({"message": "Complaint resolved with response"})
        
        # Fallback for explicit action
        action = request.data.get('action')
        if action == 'RESOLVE':
            complaint.status = 'RESOLVED'
            complaint.resolved_at = timezone.now()
            complaint.save()
            
            # Notify the filer
            send_complaint_update_email(complaint.filed_by, complaint)
            Notification.create(complaint.filed_by, "Complaint Resolved", f"Your complaint regarding {complaint.subject} has been marked as resolved.")
            
            return Response({"message": "Complaint marked as resolved"})
            
        return Response({"error": "Admin response or action required"}, status=400)

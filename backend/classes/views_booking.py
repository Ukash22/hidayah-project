from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Booking
from .serializers import BookingSerializer

class BookingRequestView(APIView):
    """Student: Request a class with a tutor"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BookingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(student=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        """Get all bookings for the current user (as student)"""
        bookings = Booking.objects.filter(student=request.user).order_by('-created_at')
        return Response(BookingSerializer(bookings, many=True).data)

class BookingApprovalView(APIView):
    """Tutor: Approve or Reject a class request"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id, tutor=request.user)
        action = request.data.get('action') # 'approve' or 'reject'

        if action == 'approve':
            booking.approved = True
            booking.save()
            return Response({"message": "Booking approved", "approved": True})
        elif action == 'reject':
            booking.delete() # Or mark as rejected if we add a status field
            return Response({"message": "Booking rejected", "approved": False})
        
        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        """Get all bookings for the current tutor"""
        bookings = Booking.objects.filter(tutor=request.user).order_by('-created_at')
        return Response(BookingSerializer(bookings, many=True).data)

class AdminBookingRequestView(APIView):
    """Admin: Get all pending bookings or approve/reject them"""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get('status', 'pending')
        # Here we just filter by approved flag
        if status_filter == 'pending':
            bookings = Booking.objects.filter(approved=False).order_by('-created_at')
        else:
            bookings = Booking.objects.filter(approved=True).order_by('-created_at')
        return Response(BookingSerializer(bookings, many=True).data)

    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id)
        action = request.data.get('action') # 'approve' or 'reject'

        if action == 'approve':
            booking.approved = True
            booking.save()
            return Response({"message": "Booking approved by Admin", "approved": True})
        elif action == 'reject':
            booking.delete()
            return Response({"message": "Booking rejected by Admin", "approved": False})
        
        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import logging
from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import ParentProfile
from students.models import StudentProfile
from classes.models import ScheduledSession
from payments.models import Payment, Wallet, Transaction
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

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

    @action(detail=False, methods=['get'])
    def child_detail(self, request):
        """Expanded child view: profile + recent sessions + wallet transactions."""
        child_id = request.query_params.get('child_id')
        if not child_id:
            return Response({"error": "child_id query param required"}, status=400)
        try:
            profile = StudentProfile.objects.select_related('user').get(
                id=child_id, parent=request.user
            )
        except StudentProfile.DoesNotExist:
            return Response({"error": "Child not found"}, status=404)

        child_user = profile.user

        # Last 15 sessions (any status)
        sessions = ScheduledSession.objects.filter(student=child_user).select_related(
            'tutor', 'subject'
        ).order_by('-scheduled_at')[:15]

        sessions_data = [{
            'id': s.id,
            'subject': s.subject.name if s.subject else 'General',
            'tutor': s.tutor.get_full_name(),
            'scheduled_at': s.scheduled_at,
            'duration': s.duration,
            'status': s.status,
            'is_trial': s.is_trial,
        } for s in sessions]

        # Wallet balance + last 15 transactions
        wallet, _ = Wallet.objects.get_or_create(user=child_user)
        transactions = Transaction.objects.filter(user=child_user).order_by('-created_at')[:15]
        transactions_data = [{
            'id': t.id,
            'amount': float(t.amount),
            'transaction_type': t.transaction_type,
            'description': t.description,
            'created_at': t.created_at,
        } for t in transactions]

        return Response({
            'id': profile.id,
            'full_name': child_user.get_full_name(),
            'admission_number': child_user.admission_number if hasattr(child_user, 'admission_number') else None,
            'enrolled_course': profile.enrolled_course,
            'class_type': profile.class_type,
            'payment_status': profile.payment_status,
            'approval_status': profile.approval_status,
            'wallet_balance': float(wallet.balance),
            'sessions': sessions_data,
            'transactions': transactions_data,
        })

    @action(detail=False, methods=['post'])
    def fund_child_wallet(self, request):
        """Parent directly deposits funds into a child's wallet (no Paystack needed)."""
        child_id = request.data.get('child_id')
        raw_amount = request.data.get('amount')

        if not child_id or raw_amount is None:
            return Response({"error": "child_id and amount are required"}, status=400)

        try:
            amount = Decimal(str(raw_amount))
        except InvalidOperation:
            return Response({"error": "Invalid amount"}, status=400)

        if amount <= 0:
            return Response({"error": "Amount must be positive"}, status=400)

        try:
            profile = StudentProfile.objects.select_related('user').get(
                id=child_id, parent=request.user
            )
        except StudentProfile.DoesNotExist:
            return Response({"error": "Child not found"}, status=404)

        child_user = profile.user
        wallet, _ = Wallet.objects.get_or_create(user=child_user)
        wallet.balance += amount
        wallet.save()

        Transaction.objects.create(
            user=child_user,
            amount=amount,
            transaction_type='DEPOSIT',
            description=f"Parent top-up from {request.user.get_full_name()}",
            reference=f"PARENT-{request.user.id}-{timezone.now().timestamp()}"
        )

        logger.info("Parent %s funded child %s wallet: +%s", request.user.id, child_user.id, amount)
        return Response({
            "success": True,
            "new_balance": float(wallet.balance),
            "message": f"₦{amount:,.0f} added to {child_user.get_full_name()}'s wallet"
        })

    @action(detail=False, methods=['post'])
    def impersonate_child(self, request):
        child_id = request.data.get('child_id')
        if not child_id:
            return Response({"error": "Child ID required"}, status=400)

        try:
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

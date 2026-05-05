# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.conf import settings
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

from .models import Payment, PricingTier, Wallet, Transaction, Withdrawal
from .serializers import PaymentSerializer, PricingTierSerializer, WalletSerializer, TransactionSerializer, WithdrawalSerializer
from .paystack_service import PaystackService
from .services import process_payment
from .logic import process_session_completion, complete_payment_flow
from students.models import StudentProfile
from classes.models import Booking
from applications.email_service import send_payment_confirmation_email
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth

User = get_user_model()

class InitiatePaymentView(APIView):
    """Initialize a Paystack payment for a student"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        from decimal import Decimal
        import uuid
        
        amount_to_charge = None
        custom_amount = request.data.get('amount')
        
        try:
            profile = StudentProfile.objects.get(user=user)
            
            if custom_amount:
                try:
                    amount_to_charge = Decimal(str(custom_amount))
                    if amount_to_charge < 100:
                        return Response({"error": "Minimum amount is ₦100"}, status=status.HTTP_400_BAD_REQUEST)
                except:
                    return Response({"error": "Invalid amount format"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                amount_to_charge = profile.total_amount

            # Student logic: determine reference
            if profile.payment_status == 'PAID' or custom_amount:
                ref = f"TOPUP-{uuid.uuid4().hex[:8].upper()}"
                payment = Payment.objects.create(
                    student=user, status='PENDING', amount=amount_to_charge,
                    payment_method='PAYSTACK', transaction_id=ref
                )
            else:
                ref = profile.payment_reference
                payment, created = Payment.objects.get_or_create(
                    student=user, status='PENDING', transaction_id=ref,
                    defaults={'amount': amount_to_charge, 'payment_method': 'PAYSTACK'}
                )
                if not created:
                    payment.amount = amount_to_charge
                    payment.save()
            
            metadata = {
                "student_id": user.id,
                "student_name": user.get_full_name(),
                "class_type": profile.class_type,
                "type": "WALLET_TOPUP" if profile.payment_status == 'PAID' or custom_amount else "INITIAL_FEE"
            }
            
        except StudentProfile.DoesNotExist:
            # Fallback for Tutors/Admins or incomplete student profiles
            if not custom_amount:
                return Response({"error": "Please specify an amount to fund your wallet"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                amount_to_charge = Decimal(str(custom_amount))
                if amount_to_charge < 100:
                    return Response({"error": "Minimum amount is ₦100"}, status=status.HTTP_400_BAD_REQUEST)
            except:
                return Response({"error": "Invalid amount format"}, status=status.HTTP_400_BAD_REQUEST)

            ref = f"TOPUP-{uuid.uuid4().hex[:8].upper()}"
            payment = Payment.objects.create(
                student=user, status='PENDING', amount=amount_to_charge,
                payment_method='PAYSTACK', transaction_id=ref
            )
            metadata = {"user_id": user.id, "type": "WALLET_TOPUP"}

        # Initialize Paystack payment
        result = PaystackService.initialize_payment(
            email=user.email, amount=amount_to_charge, reference=ref, metadata=metadata
        )
        
        if result["success"]:
            if result.get("access_code"):
                payment.gateway_reference = result["access_code"]
            payment.save()
            
            return Response({
                "success": True,
                "authorization_url": result["authorization_url"],
                "reference": result["reference"],
                "amount": float(amount_to_charge)
            })
        else:
            return Response({"error": result.get("message", "Payment initialization failed")}, status=status.HTTP_400_BAD_REQUEST)


class VerifyPaymentView(APIView):
    """Verify a Paystack payment"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, reference):
        user = request.user
        
        try:
            print(f"DEBUG: Verifying payment ref: {reference} for user {user.username}")
            
            # Verify payment with Paystack
            result = PaystackService.verify_payment(reference)
            print(f"DEBUG: Paystack/Mock Verification Result: {result}")
            
            if not result["success"]:
                return Response({
                    "error": result.get("message", "Verification failed")
                }, status=status.HTTP_400_BAD_REQUEST)
            if result["verified"]:
                # Use the unified flow for atomicity and profile updates
                amount = Decimal(str(result["amount"]))
                # If Paystack returns 0 (mock mode), fallback to payment amount
                if amount == 0 and getattr(settings, 'PAYSTACK_MOCK_MODE', False):
                    try:
                        p = Payment.objects.get(transaction_id=reference)
                        amount = p.amount
                    except: pass

                flow_result = complete_payment_flow(
                    user=user,
                    amount=amount,
                    reference=reference,
                    gateway_ref=str(result.get("transaction_id", ""))
                )

                if flow_result.get("success"):
                    return Response({
                        "success": True,
                        "verified": True,
                        "message": flow_result.get("message", "Payment verified and processed successfully"),
                        "amount": float(amount),
                        "paid_at": result.get("paid_at")
                    })
                else:
                    error_msg = flow_result.get("message", "Processing failed")
                    logger.error(f"Payment flow failed for {reference}: {error_msg}")
                    return Response({"error": error_msg}, status=400)
            else:
                return Response({
                    "success": True,
                    "verified": False,
                    "message": "Payment not successful"
                })
                
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(APIView):
    """Handle Paystack webhook events"""
    permission_classes = []
    
    def post(self, request):
        payload = request.body.decode('utf-8')
        signature = request.META.get('HTTP_X_PAYSTACK_SIGNATURE', '')
        
        result = PaystackService.process_webhook(payload, signature)
        
        if not result["success"]:
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)
        
        event = result["event"]
        data = result["data"]
        if event == "charge.success":
            reference = data.get("reference")
            amount_kobo = data.get("amount") # Paystack sends in kobo
            amount = Decimal(str(amount_kobo)) / 100
            
            try:
                # 1. Get User from Payment record
                payment = Payment.objects.get(transaction_id=reference)
                user = payment.student
                
                # 2. Trigger Unified Flow
                complete_payment_flow(
                    user=user,
                    amount=amount,
                    reference=reference,
                    gateway_ref=str(data.get("id", ""))
                )
                        
            except Payment.DoesNotExist:
                logger.error(f"Webhook received for unknown payment: {reference}")
                pass
        
        return Response({"status": "success"})


class PaymentStatusView(APIView):
    """Get payment status for current student"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        wallet, _ = Wallet.objects.get_or_create(user=user)
        payments = Payment.objects.filter(student=user).order_by('-created_at')
        
        try:
            profile = StudentProfile.objects.get(user=user)
            
            # Sum up all approved but unpaid bookings for this student
            unpaid_bookings_total = Booking.objects.filter(student=user, approved=True, paid=False).aggregate(total=Sum('price'))['total'] or 0.0
            
            return Response({
                "payment_status": profile.payment_status,
                "total_amount": float(profile.total_amount),
                "unpaid_bookings_total": float(unpaid_bookings_total),
                "wallet_balance": float(wallet.balance),
                "payment_reference": profile.payment_reference,
                "payments": PaymentSerializer(payments, many=True).data
            })
        except StudentProfile.DoesNotExist:
            # Handle cases like Tutors or Admins viewing their wallet, 
            # or Students who haven't completed registration profile sync.
            return Response({
                "payment_status": "PAID", # Neutral status
                "total_amount": 0.0,
                "wallet_balance": float(wallet.balance),
                "payment_reference": "N/A",
                "payments": PaymentSerializer(payments, many=True).data
            })


class PricingTiersView(APIView):
    """Get all pricing tiers"""
    
    def get(self, request):
        tiers = PricingTier.objects.filter(is_active=True)
        return Response(PricingTierSerializer(tiers, many=True).data)

class AdminWalletActionView(APIView):
    """Admin view to manually Credit/Debit a student wallet"""
    permission_classes = [IsAuthenticated] # Should be IsAdminUser, adding check in method
    
    def post(self, request):
        if not request.user.is_staff:
             return Response({"error": "Unauthorized"}, status=403)
             
        student_id = request.data.get('student_id')
        amount = request.data.get('amount')
        action_type = request.data.get('action_type') # 'DEPOSIT' or 'DEDUCTION'
        description = request.data.get('description', 'Manual Admin Action')
        
        if not all([student_id, amount, action_type]):
             return Response({"error": "Missing required fields"}, status=400)
             
        from decimal import Decimal
        from students.models import StudentProfile, WalletTransaction
        
        try:
            user = User.objects.get(student_profile__id=student_id)
            wallet, _ = Wallet.objects.get_or_create(user=user)
            amount_dec = Decimal(str(amount))
            
            if action_type == 'DEPOSIT':
                wallet.balance += amount_dec
                t_type = 'DEPOSIT'
            elif action_type == 'DEDUCTION':
                wallet.balance -= amount_dec
                t_type = 'SESSION_DEBIT'
            else:
                 return Response({"error": "Invalid action type"}, status=400)
            
            wallet.save()
            
            Transaction.objects.create(
                user=user,
                amount=amount_dec,
                transaction_type=t_type,
                description=f"ADMIN: {description}",
                reference=f"ADMIN-{timezone.now().timestamp()}"
            )
            
            return Response({
                "success": True, 
                "new_balance": float(wallet.balance),
                "message": f"Wallet {action_type} successful"
            })
            
        except User.DoesNotExist:
             return Response({"error": "Student user not found"}, status=404)
        except Exception as e:
             return Response({"error": str(e)}, status=500)

class AdminTransactionListView(APIView):
    """Admin view to list GLOBAL transactions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.is_staff:
             return Response({"error": "Unauthorized"}, status=403)
             
        # Get last 50 transactions
        transactions = Transaction.objects.select_related('user').all().order_by('-created_at')[:50]
        
        data = []
        for t in transactions:
            data.append({
                "id": t.id,
                "user_name": t.user.get_full_name() or t.user.username,
                "user_email": t.user.email,
                "amount": float(t.amount),
                "type": t.transaction_type,
                "description": t.description,
                "date": t.created_at.isoformat() if t.created_at else None,
                "reference": t.reference
            })
            
        return Response(data)

class StudentWalletTransactionView(APIView):
    """View for students to see their OWN transactions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Record last 20 transactions for user
            transactions = Transaction.objects.filter(user=request.user).order_by('-created_at')[:20]
            
            data = []
            for t in transactions:
                data.append({
                    "id": t.id,
                    "amount": float(t.amount),
                    "transaction_type": t.transaction_type,
                    "description": t.description,
                    "timestamp": t.created_at.isoformat() if t.created_at else None,
                    "reference": t.reference
                })
            return Response(data)
        except Exception:
            return Response([], status=200) # Empty list if error

class InitiateBookingPaymentView(APIView):
    """Student: Initialize Paystack payment for a specific Booking"""
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id, student=request.user, approved=True)
        
        if booking.paid:
            return Response({"error": "Booking is already paid"}, status=status.HTTP_400_BAD_REQUEST)

        ref = f"BOOKING-{booking.id}-{int(timezone.now().timestamp())}"
        
        # Create Payment record for better tracking
        Payment.objects.create(
            student=request.user,
            amount=booking.price,
            payment_method='PAYSTACK',
            transaction_id=ref,
            status='PENDING'
        )
        
        result = PaystackService.initialize_payment(
            email=request.user.email,
            amount=booking.price,
            reference=ref,
            metadata={
                "booking_id": booking.id,
                "type": "CLASS_BOOKING"
            }
        )

        if result["success"]:
            return Response(result)
        return Response({"error": result.get("message")}, status=status.HTTP_400_BAD_REQUEST)

class VerifyBookingPaymentView(APIView):
    """Student: Verify Paystack payment for a Booking"""
    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        result = PaystackService.verify_payment(reference)
        
        if result["success"] and result["verified"]:
            # Extract booking_id from reference or metadata if available
            # For simplicity, let's assume reference BOOKING-{id}-...
            try:
                booking_id = reference.split('-')[1]
                booking = Booking.objects.get(id=booking_id)
                
                if not booking.paid:
                    process_payment(booking)
                
                return Response({"success": True, "message": "Payment verified and booking updated"})
            except:
                return Response({"error": "Invalid booking reference"}, status=400)
                
        return Response({"error": "Payment verification failed"}, status=400)

class TutorWalletView(APIView):
    """Tutor: View wallet balance and transaction history"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        transactions = Transaction.objects.filter(user=request.user).order_by('-created_at')
        
        return Response({
            "balance": wallet.balance,
            "transactions": TransactionSerializer(transactions, many=True).data
        })

class WithdrawalRequestView(APIView):
    """Tutor: Request a withdrawal"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount')
        bank_name = request.data.get('bank_name')
        account_number = request.data.get('account_number')
        account_name = request.data.get('account_name')
        
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        
        if not amount or float(amount) <= 0:
            return Response({"error": "Invalid amount"}, status=400)
            
        if wallet.balance < Decimal(str(amount)):
            return Response({"error": "Insufficient balance"}, status=400)
            
        withdrawal = Withdrawal.objects.create(
            tutor=request.user, 
            amount=amount,
            bank_name=bank_name,
            account_number=account_number,
            account_name=account_name
        )
        return Response(WithdrawalSerializer(withdrawal).data, status=201)

    def get(self, request):
        withdrawals = Withdrawal.objects.filter(tutor=request.user).order_by('-created_at')
        return Response(WithdrawalSerializer(withdrawals, many=True).data)

class AdminWithdrawalApprovalView(APIView):
    """Admin: Approve withdrawal requests"""
    permission_classes = [IsAuthenticated]

    def post(self, request, withdrawal_id):
        if not request.user.is_staff:
            return Response({"error": "Unauthorized"}, status=403)
            
        withdrawal = get_object_or_404(Withdrawal, id=withdrawal_id)
        if withdrawal.status == 'APPROVED':
            return Response({"error": "Already approved"}, status=400)
            
        wallet = Wallet.objects.get(user=withdrawal.tutor)
        if wallet.balance < withdrawal.amount:
            return Response({"error": "Tutor has insufficient balance now"}, status=400)
            
        # Deduct wallet
        wallet.balance -= withdrawal.amount
        wallet.save()
        
        # Approve withdrawal
        withdrawal.status = 'APPROVED'
        withdrawal.save()
        
        # Record debit transaction
        Transaction.objects.create(
            user=withdrawal.tutor,
            amount=withdrawal.amount,
            transaction_type='WITHDRAWAL',
            description=f'Withdrawal to {withdrawal.bank_name} ({withdrawal.account_number})'
        )
        
        return Response({"message": "Withdrawal approved and processed"})

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Unauthorized"}, status=403)
        withdrawals = Withdrawal.objects.filter(status='PENDING').order_by('-created_at')
        return Response(WithdrawalSerializer(withdrawals, many=True).data)


class AdminPaymentAnalyticsView(APIView):
    """Admin: Comprehensive payment analytics — totals, status breakdown, and time-series charts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Unauthorized"}, status=403)

        from django.db.models import Sum, Count
        from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
        from datetime import timedelta
        from decimal import Decimal

        now = timezone.now()
        all_payments = Payment.objects.all()

        # --- Summary Totals ---
        totals = all_payments.aggregate(
            total_revenue=Sum('amount'),
            total_count=Count('id'),
        )
        status_breakdown = {}
        for s in ['COMPLETED', 'FAILED', 'REFUNDED', 'PENDING']:
            qs = all_payments.filter(status=s).aggregate(total=Sum('amount'), count=Count('id'))
            status_breakdown[s.lower()] = {
                'total': float(qs['total'] or 0),
                'count': qs['count'] or 0,
            }

        # --- Aggregated Class Stats (Completed vs Total) ---
        from classes.models import ScheduledSession
        class_stats = ScheduledSession.objects.aggregate(
            total=Count('id'),
            completed=Count('id', filter=models.Q(status='COMPLETED')),
            total_fees=Sum('fee_amount', filter=models.Q(status='COMPLETED')),
            total_commissions=Sum('commission_amount', filter=models.Q(status='COMPLETED'))
        )

        # --- Daily chart (last 30 days) ---
        daily = (
            all_payments.filter(status='COMPLETED', created_at__gte=now - timedelta(days=30))
            .annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('day')
        )
        daily_data = [{"date": d['day'].strftime('%b %d'), "revenue": float(d['total']), "count": d['count']} for d in daily]

        # --- Weekly chart (last 12 weeks) ---
        weekly = (
            all_payments.filter(status='COMPLETED', created_at__gte=now - timedelta(weeks=12))
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('week')
        )
        weekly_data = [{"date": w['week'].strftime('Wk %W %b'), "revenue": float(w['total']), "count": w['count']} for w in weekly]

        # --- Monthly chart (last 12 months) ---
        monthly = (
            all_payments.filter(status='COMPLETED', created_at__gte=now - timedelta(days=366))
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('month')
        )
        monthly_data = [{"date": m['month'].strftime('%b %Y'), "revenue": float(m['total']), "count": m['count']} for m in monthly]

        # --- Recent payment history (last 100) ---
        recent = all_payments.select_related('student').order_by('-created_at')[:100]
        history = []
        for p in recent:
            history.append({
                "id": p.id,
                "student": p.student.get_full_name() or p.student.username,
                "student_email": p.student.email,
                "country": getattr(p.student, 'country', ''),
                "amount": float(p.amount),
                "status": p.status,
                "method": p.payment_method,
                "reference": p.transaction_id,
                "ref": p.transaction_id,
                "created_at": p.created_at,
                "date": p.created_at,
                "completed_at": p.completed_at,
            })

        # --- Wallet Aggregates ---
        student_wallets = Wallet.objects.filter(user__role='STUDENT').aggregate(total=Sum('balance'))
        tutor_wallets = Wallet.objects.filter(user__role='TUTOR').aggregate(total=Sum('balance'))
        
        # --- Withdrawal Stats ---
        pending_withdrawals = Withdrawal.objects.filter(status='PENDING').aggregate(total=Sum('amount'), count=Count('id'))

        return Response({
            "total_revenue": float(totals['total_revenue'] or 0),
            "platform_revenue": float(class_stats['total_commissions'] or 0),
            "net_to_tutors": float((class_stats['total_fees'] or 0) - (class_stats['total_commissions'] or 0)),
            "total_transactions": totals['total_count'] or 0,
            "total_classes": class_stats['total'] or 0,
            "completed_classes": class_stats['completed'] or 0,
            "status_breakdown": status_breakdown,
            "wallet_stats": {
                "student_total": float(student_wallets['total'] or 0),
                "tutor_total": float(tutor_wallets['total'] or 0),
            },
            "withdrawal_stats": {
                "pending_amount": float(pending_withdrawals['total'] or 0),
                "pending_count": pending_withdrawals['count'] or 0,
            },
            "daily": daily_data,
            "weekly": weekly_data,
            "monthly": monthly_data,
            "history": history,
        })


class TutorFinancialsView(APIView):
    """Tutor: Overview of earnings, classes, and payout status"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from classes.models import ScheduledSession
        from django.db.models import Sum, Count

        # Filter by the logged-in tutor
        sessions = ScheduledSession.objects.filter(tutor=request.user)
        
        # Summary Stats
        stats = sessions.aggregate(
            total_classes=Count('id'),
            completed_classes=Count('id', filter=models.Q(status='COMPLETED')),
            gross_earnings=Sum('fee_amount', filter=models.Q(status='COMPLETED')),
            net_earnings=Sum('fee_amount', filter=models.Q(status='COMPLETED')) - Sum('commission_amount', filter=models.Q(status='COMPLETED')),
            total_commission=Sum('commission_amount', filter=models.Q(status='COMPLETED'))
        )

        # Recent completed classes with details
        completed_history = sessions.filter(status='COMPLETED').select_related('student', 'subject').order_by('-scheduled_at')[:20]
        history_data = []
        for s in completed_history:
            history_data.append({
                "id": s.id,
                "date": s.scheduled_at,
                "student": s.student.get_full_name(),
                "subject": s.subject.name if s.subject else "General",
                "fee": float(s.fee_amount),
                "commission": float(s.commission_amount),
                "net": float(s.fee_amount - s.commission_amount)
            })

        from .models import Wallet
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        return Response({
            "wallet_balance": float(wallet.balance),
            "total_classes": stats['total_classes'] or 0,
            "completed_classes": stats['completed_classes'] or 0,
            "gross_earnings": float(stats['gross_earnings'] or 0),
            "net_earnings": float(stats['net_earnings'] or 0),
            "total_commission": float(stats['total_commission'] or 0),
            "history": history_data
        })

class AdminFinancialStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from classes.models import ScheduledSession
        # 1. Overall Payment Totals
        stats = Payment.objects.aggregate(
            total_revenue=Sum('amount', filter=Q(status='COMPLETED')),
            total_pending=Sum('amount', filter=Q(status='PENDING')),
            total_failed=Sum('amount', filter=Q(status='FAILED')),
            total_refunded=Sum('amount', filter=Q(status='REFUNDED')),
            count_completed_payments=Count('id', filter=Q(status='COMPLETED')),
        )

        # 2. Class-based Financials (Commissions & Tutor Payouts)
        class_stats = ScheduledSession.objects.filter(status='COMPLETED').aggregate(
            platform_revenue=Sum('commission_amount'),
            total_gross=Sum('fee_amount'),
            total_classes=Count('id')
        )
        
        # Calculate net to tutors
        gross = class_stats['total_gross'] or 0
        comm = class_stats['platform_revenue'] or 0
        net_to_tutors = gross - comm

        # Ensure values are not None
        for key in stats:
            if stats[key] is None: stats[key] = 0
            
        final_totals = {
            **stats,
            "platform_revenue": float(comm),
            "net_to_tutors": float(net_to_tutors),
            "completed_classes": class_stats['total_classes'] or 0,
            "total_classes": ScheduledSession.objects.count()
        }

        # Chart Data ... (rest is fine)

        # Chart Data - Daily (Last 14 days)
        daily_data = Payment.objects.filter(
            status='COMPLETED', 
            completed_at__gte=timezone.now() - timezone.timedelta(days=14)
        ).annotate(
            day=TruncDay('completed_at')
        ).values('day').annotate(
            amount=Sum('amount')
        ).order_by('day')

        # Weekly (Last 8 weeks)
        weekly_data = Payment.objects.filter(
            status='COMPLETED',
            completed_at__gte=timezone.now() - timezone.timedelta(weeks=8)
        ).annotate(
            week=TruncWeek('completed_at')
        ).values('week').annotate(
            amount=Sum('amount')
        ).order_by('week')

        # Monthly (Last 12 months)
        monthly_data = Payment.objects.filter(
            status='COMPLETED',
            completed_at__gte=timezone.now() - timezone.timedelta(days=365)
        ).annotate(
            month=TruncMonth('completed_at')
        ).values('month').annotate(
            amount=Sum('amount')
        ).order_by('month')

        # 3. Wallet Aggregates
        student_wallets = Wallet.objects.filter(user__role='STUDENT').aggregate(total=Sum('balance'))
        tutor_wallets = Wallet.objects.filter(user__role='TUTOR').aggregate(total=Sum('balance'))
        
        # 4. Withdrawal Stats
        pending_withdrawals = Withdrawal.objects.filter(status='PENDING').aggregate(total=Sum('amount'), count=Count('id'))

        # Recent History
        recent_payments = Payment.objects.all().order_by('-created_at')[:20]
        history = [{
            "id": p.id,
            "student": p.student.get_full_name(),
            "amount": float(p.amount),
            "status": p.status,
            "method": p.payment_method,
            "ref": p.transaction_id,
            "date": p.created_at.isoformat() if p.created_at else None,
        } for p in recent_payments]

        return Response({
            "totals": final_totals,
            "wallet_stats": {
                "student_total": float(student_wallets['total'] or 0),
                "tutor_total": float(tutor_wallets['total'] or 0),
            },
            "withdrawal_stats": {
                "pending_amount": float(pending_withdrawals['total'] or 0),
                "pending_count": pending_withdrawals['count'] or 0,
            },
            "charts": {
                "daily": list(daily_data),
                "weekly": list(weekly_data),
                "monthly": list(monthly_data)
            },
            "history": history
        })

class AdminPlatformSettingsView(APIView):
    """Admin view to get or update global platform settings"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        from .models import PlatformSettings
        from .serializers import PlatformSettingsSerializer
        settings = PlatformSettings.get_settings()
        return Response(PlatformSettingsSerializer(settings).data)
        
    def patch(self, request):
        from .models import PlatformSettings
        from .serializers import PlatformSettingsSerializer
        settings = PlatformSettings.get_settings()
        serializer = PlatformSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

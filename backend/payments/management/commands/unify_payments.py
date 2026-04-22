from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from students.models import StudentProfile, WalletTransaction
from tutors.models import TutorProfile, TutorTransaction
from payments.models import Wallet, Transaction
from decimal import Decimal

User = get_user_model()

class Command(BaseCommand):
    help = 'Unify all student and tutor wallets into the payments.Wallet model and migrate history.'

    def handle(self, *args, **options):
        self.stdout.write("Starting wallet unification...")

        with transaction.atomic():
            # 1. Ensure Wallets for all users
            for user in User.objects.all():
                Wallet.objects.get_or_create(user=user)

            # 2. Migrate Student Balances
            students = StudentProfile.objects.all()
            for profile in students:
                wallet = Wallet.objects.get(user=profile.user)
                if profile.wallet_balance > 0:
                    wallet.balance += profile.wallet_balance
                    wallet.save()
                    self.stdout.write(f"Migrated ₦{profile.wallet_balance} for student {profile.user.username}")
                    # Zero it out
                    profile.wallet_balance = 0
                    profile.save()

            # 3. Migrate Tutor Balances
            tutors = TutorProfile.objects.all()
            for profile in tutors:
                wallet = Wallet.objects.get(user=profile.user)
                if profile.wallet_balance > 0:
                    wallet.balance += profile.wallet_balance
                    wallet.save()
                    self.stdout.write(f"Migrated ₦{profile.wallet_balance} for tutor {profile.user.username}")
                    # Zero it out
                    profile.wallet_balance = 0
                    profile.save()

            # 4. Migrate Student History
            student_txs = WalletTransaction.objects.all()
            for tx in student_txs:
                # Map student wallet transaction types to unified ones
                # ('DEPOSIT', 'Deposit'), ('DEDUCTION', 'Class Deduction'), ('FEE', 'One-Time Fee'), ('REFUND', 'Refund')
                tx_type = 'DEPOSIT' if tx.transaction_type == 'DEPOSIT' else 'SESSION_DEBIT'
                if tx.transaction_type == 'REFUND': tx_type = 'REFUND'
                
                # Check if already migrated by checking reference
                if not Transaction.objects.filter(reference=f"MIG-S-{tx.id}").exists():
                    Transaction.objects.create(
                        user=tx.student.user,
                        amount=tx.amount,
                        transaction_type=tx_type,
                        description=f"[MIGRATED] {tx.description}",
                        reference=f"MIG-S-{tx.id}",
                        created_at=tx.timestamp
                    )

            # 5. Migrate Tutor History
            tutor_txs = TutorTransaction.objects.all()
            for tx in tutor_txs:
                # ('EARNING', 'Earning'), ('WITHDRAWAL', 'Withdrawal'), ('DEDUCTION', 'Deduction'), ('BONUS', 'Bonus')
                tx_type = 'SESSION_PAYOUT' if tx.transaction_type == 'EARNING' else 'WITHDRAWAL'
                if tx.transaction_type == 'BONUS': tx_type = 'DEPOSIT'
                
                if not Transaction.objects.filter(reference=f"MIG-T-{tx.id}").exists():
                    Transaction.objects.create(
                        user=tx.tutor,
                        amount=tx.amount,
                        transaction_type=tx_type,
                        description=f"[MIGRATED] {tx.description}",
                        reference=f"MIG-T-{tx.id}",
                        created_at=tx.created_at
                    )

        self.stdout.write(self.style.SUCCESS('Successfully unified all wallets and transactions!'))

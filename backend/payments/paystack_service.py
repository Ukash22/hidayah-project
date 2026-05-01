# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Paystack Payment Service
Handles payment initialization, verification, and webhook processing
"""
import requests
from django.conf import settings
from decimal import Decimal

class PaystackService:
    BASE_URL = "https://api.paystack.co"
    
    @staticmethod
    def initialize_payment(email, amount, reference, metadata=None):
        """
        Initialize a Paystack payment transaction
        """
        # MOCK MODE CHECK
        if getattr(settings, 'PAYSTACK_MOCK_MODE', False):
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://hidayah-frontend.onrender.com')
            print(f"MOCK PAYSTACK: Initializing payment for {email} (Ref: {reference})")
            return {
                "success": True,
                "authorization_url": f"{frontend_url}/payment/callback?reference={reference}",
                "access_code": f"mock_access_code_{reference}",
                "reference": reference
            }

        url = f"{PaystackService.BASE_URL}/transaction/initialize"
        
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        
        # Convert amount to kobo (Paystack uses kobo, not naira)
        amount_in_kobo = int(Decimal(amount) * 100)
        
        payload = {
            "email": email,
            "amount": amount_in_kobo,
            "reference": reference,
            "callback_url": f"{settings.FRONTEND_URL}/payment/callback",
        }
        
        if metadata:
            payload["metadata"] = metadata
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status"):
                return {
                    "success": True,
                    "authorization_url": data["data"]["authorization_url"],
                    "access_code": data["data"]["access_code"],
                    "reference": data["data"]["reference"]
                }
            else:
                return {
                    "success": False,
                    "message": data.get("message", "Payment initialization failed")
                }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "message": f"Network error: {str(e)}"
            }
    
    @staticmethod
    def verify_payment(reference):
        """
        Verify a payment transaction
        """
        # MOCK MODE CHECK
        if getattr(settings, 'PAYSTACK_MOCK_MODE', False):
            print(f"MOCK PAYSTACK: Verifying payment {reference}")
            from django.utils import timezone
            return {
                "success": True,
                "verified": True,
                "amount": Decimal("0.00"), # Amount doesn't verify in mock easily without db lookup, but view handles it
                "reference": reference,
                "transaction_id": f"mock_trans_{reference}",
                "paid_at": timezone.now().isoformat(),
                "customer_email": "mock@test.com"
            }

        url = f"{PaystackService.BASE_URL}/transaction/verify/{reference}"
        
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") and data.get("data"):
                transaction = data["data"]
                return {
                    "success": True,
                    "verified": transaction["status"] == "success",
                    "amount": Decimal(transaction["amount"]) / 100,  # Convert from kobo to naira
                    "reference": transaction["reference"],
                    "transaction_id": transaction["id"],
                    "paid_at": transaction.get("paid_at"),
                    "customer_email": transaction["customer"]["email"]
                }
            else:
                return {
                    "success": False,
                    "verified": False,
                    "message": data.get("message", "Verification failed")
                }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "verified": False,
                "message": f"Network error: {str(e)}"
            }
    
    @staticmethod
    def process_webhook(payload, signature):
        """
        Process Paystack webhook events
        
        Args:
            payload: Webhook payload
            signature: Paystack signature header
            
        Returns:
            dict with event details
        """
        import hmac
        import hashlib
        
        # Verify webhook signature
        computed_signature = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        if computed_signature != signature:
            return {
                "success": False,
                "message": "Invalid signature"
            }
        
        import json
        event_data = json.loads(payload)
        
        return {
            "success": True,
            "event": event_data.get("event"),
            "data": event_data.get("data")
        }

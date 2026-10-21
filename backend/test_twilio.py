"""
Quick test script for Twilio WhatsApp service.
Run from backend directory:
    python test_twilio.py
"""
import os, sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

from django.conf import settings
from core.utils.whatsapp_service import (
    normalize_phone_number,
    notify_payment_confirmed,
    notify_booking_approved,
    notify_tutor_new_booking,
)

SEP = "=" * 60
print(SEP)
print("TWILIO WHATSAPP SERVICE TEST")
print(SEP)

# 1. Credentials
print("\n[1] Credentials loaded from settings:")
sid = settings.TWILIO_ACCOUNT_SID
tok = settings.TWILIO_AUTH_TOKEN
frm = settings.TWILIO_WHATSAPP_NUMBER
print(f"  ACCOUNT_SID  : {sid[:8]}...{sid[-4:]}")
print(f"  AUTH_TOKEN   : {tok[:4]}...{tok[-4:]}")
print(f"  FROM_NUMBER  : {frm}")

# 2. Template SIDs
print("\n[2] Content Template SIDs (None = fallback to free-form):")
for name in ['PAYMENT_CONFIRMED','BOOKING_APPROVED','SESSION_REMINDER','TUTOR_NEW_BOOKING','WALLET_TOPUP']:
    val = getattr(settings, f'TWILIO_TEMPLATE_{name}', None)
    print(f"  {name:<25} : {val or '[not set - will use free-form fallback]'}")

# 3. Normalizer
print("\n[3] Phone normalizer:")
for n in ["07062566616","2347062566616","+2347062566616"]:
    print(f"  {n!r:25} -> {normalize_phone_number(n)!r}")

# 4. Live send test
print("\n[4] Sending test notification (notify_payment_confirmed)...")
# Change this to your phone number to actually receive the message
TEST_PHONE = "07062566616"

ok, result = notify_payment_confirmed(
    to_phone=TEST_PHONE,
    student_name="Ahmad",
    subject="Quran Recitation",
    amount="\u20a615,000",
)

print(f"\n  Target phone : {TEST_PHONE} -> {normalize_phone_number(TEST_PHONE)}")
print(f"  Status       : {'SUCCESS' if ok else 'FAILED'}")
print(f"  Result       : {result}")
print()
print(SEP)

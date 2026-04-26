# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import sys
import django

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_email():
    print(f"Testing Email Service with {settings.EMAIL_HOST_USER}...")
    try:
        subject = "Test Email From Hidayah"
        message = "This is a test email to verify SMTP configuration."
        recipient = settings.EMAIL_HOST_USER # Send to self
        
        send_mail(subject, message, settings.EMAIL_HOST_USER, [recipient])
        print("Success! Email sent successfully.")
    except Exception as e:
        print(f"Failed to send email: {e}")

if __name__ == "__main__":
    test_email()

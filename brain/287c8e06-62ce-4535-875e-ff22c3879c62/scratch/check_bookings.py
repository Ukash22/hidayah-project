import os
import django
import sys
import json

# Set up Django environment
sys.path.append(r'c:\Users\USER\Desktop\hidayah\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from classes.models import Booking
from classes.serializers import BookingSerializer

User = get_user_model()
target_email = 'tb@gmail.com'

try:
    user = User.objects.get(email=target_email)
    print(f"User: {user.username}, ID: {user.id}")
    
    bookings = Booking.objects.filter(student=user)
    print(f"Found {bookings.count()} bookings")
    
    for b in bookings:
        serializer = BookingSerializer(b)
        print(f"Booking ID: {b.id}, Status: {serializer.data.get('status')}, Paid: {b.paid}, Approved: {b.approved}")
        print(f"Data: {json.dumps(serializer.data, indent=2)}")
        
except Exception as e:
    print(f"Error: {e}")

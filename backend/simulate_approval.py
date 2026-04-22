# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import sys
import django
import json

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import RequestFactory
from applications.views import ApproveApplicationView
from accounts.models import User
from applications.models import TrialApplication

def simulate_approval():
    print("Simulating Approval for ID 1...")
    
    # 1. Get or Create an admin user
    admin_user = User.objects.filter(role='ADMIN').first()
    if not admin_user:
        print("No admin user found.")
        return

    # 2. Get the application
    app = TrialApplication.objects.filter(status='pending').first()
    if not app:
        print("No pending application found to test.")
        return
    
    # 3. Create a mock request
    factory = RequestFactory()
    data = {
        "tutor_name": "Sheikh Ahmad",
        "start_time": "2026-01-20T10:00:00Z",
        "duration": 40
    }
    request = factory.post(f'/api/admin/applications/{app.id}/approve/', 
                          data=json.dumps(data), 
                          content_type='application/json')
    request.user = admin_user
    
    # 4. Call the view
    view = ApproveApplicationView.as_view()
    try:
        response = view(request, pk=app.id)
        print(f"Status Code: {response.status_code}")
        print(f"Response Data: {response.data}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    simulate_approval()

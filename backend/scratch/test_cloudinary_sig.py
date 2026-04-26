import urllib.request
import json

try:
    req = urllib.request.Request('http://localhost:8000/api/tutors/cloudinary_signature/?folder=tutor_images')
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print("cloud_name:", data.get('cloud_name'))
    print("api_key:", data.get('api_key'))
    print("signature:", data.get('signature'))
    print("timestamp:", data.get('timestamp'))
    if not data.get('cloud_name') or data.get('cloud_name') == 'None':
        print("\n*** ERROR: cloud_name is None — CLOUDINARY_CLOUD_NAME not loaded from .env ***")
    else:
        print("\n*** Credentials look good! ***")
except Exception as e:
    print("Request failed:", e)

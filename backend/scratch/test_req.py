import urllib.request
import json
try:
    req = urllib.request.Request('http://localhost:8000/api/tutors/cloudinary_signature/')
    res = urllib.request.urlopen(req)
    print(res.status, res.read().decode('utf-8'))
except Exception as e:
    print(e)

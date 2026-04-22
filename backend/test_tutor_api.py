# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import requests

# Test the tutor list endpoint
url = "http://localhost:8000/api/tutors/admin/list/"

print("Testing tutor list endpoint...")
print(f"URL: {url}\n")

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Number of tutors returned: {len(data)}")
        if len(data) > 0:
            print("\nFirst tutor:")
            print(data[0])
    elif response.status_code == 401:
        print("Authentication required - this is expected for admin endpoints")
    else:
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"Error: {e}")

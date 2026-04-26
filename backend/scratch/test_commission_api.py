import requests

def test_subjects_api():
    base_url = "http://localhost:8000/api/programs/subjects/"
    try:
        response = requests.get(base_url)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            subjects = response.data if hasattr(response, 'data') else response.json()
            if subjects:
                print("First subject fields:", subjects[0].keys())
                if 'admin_percentage' in subjects[0]:
                    print(f"SUCCESS: 'admin_percentage' found. Value: {subjects[0]['admin_percentage']}")
                else:
                    print("FAILURE: 'admin_percentage' missing from response.")
            else:
                print("No subjects found in DB.")
    except Exception as e:
        print(f"Error connecting to API: {e}")

if __name__ == "__main__":
    test_subjects_api()

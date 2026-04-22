# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import smtplib
import os
from dotenv import load_dotenv

# Load .env
env_path = os.path.join(os.getcwd(), '.env')
load_dotenv(env_path)

host = "smtp.gmail.com"
port = 587
user = os.getenv("EMAIL_HOST_USER")
password = os.getenv("EMAIL_HOST_PASSWORD")

print(f"Testing SMTP with User: {user}")
print(f"Password length: {len(password) if password else 0}")

try:
    server = smtplib.SMTP(host, port)
    server.set_debuglevel(1)
    server.starttls()
    server.login(user, password)
    print("SMTP Login Successful!")
    server.quit()
except Exception as e:
    print(f"SMTP Login Failed: {e}")

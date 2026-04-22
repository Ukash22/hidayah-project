# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file

import smtplib
import os
from dotenv import load_dotenv

load_dotenv()

host = "smtp.gmail.com"
port = 465
user = os.getenv("EMAIL_HOST_USER")
password = os.getenv("EMAIL_HOST_PASSWORD")

print(f"Testing SMTP SSL with User: {user}")

try:
    server = smtplib.SMTP_SSL(host, port, timeout=10)
    server.login(user, password)
    print("SMTP SSL Login Successful!")
    server.quit()
except Exception as e:
    print(f"SMTP SSL Login Failed: {e}")

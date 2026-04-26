# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import time
import subprocess
import sys

def run_reminders():
    print("--- Starting Hidayah Reminder Service ---")
    venv_python = os.path.join("venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = "python" # Fallback
        
    while True:
        try:
            print(f"[{time.strftime('%H:%M:%S')}] Checking for upcoming classes...")
            result = subprocess.run([venv_python, "manage.py", "send_reminders"], capture_output=True, text=True)
            print(result.stdout)
            if result.stderr:
                print(f"Errors: {result.stderr}")
        except Exception as e:
            print(f"Critical error in reminder loop: {e}")
            
        # Sleep for 5 minutes
        time.sleep(300)

if __name__ == "__main__":
    run_reminders()

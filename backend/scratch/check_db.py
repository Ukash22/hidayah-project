# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import django
import sqlite3

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from applications.models import TrialApplication

def check_db():
    print("Checking database columns for TrialApplication...")
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.execute("PRAGMA table_info(applications_trialapplication)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Columns: {columns}")
    
    print("\nChecking migrations table...")
    cursor = conn.execute("SELECT name FROM django_migrations WHERE app='applications'")
    migrations = [row[0] for row in cursor.fetchall()]
    print(f"Applied migrations for 'applications': {migrations}")
    conn.close()

if __name__ == "__main__":
    check_db()

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import django
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def run_migrate():
    print("Attempting to run migrate applications...")
    try:
        call_command('migrate', 'applications', verbosity=3)
        print("\nMigration finished.")
    except Exception as e:
        print(f"\nMigration failed with error: {e}")

if __name__ == "__main__":
    run_migrate()

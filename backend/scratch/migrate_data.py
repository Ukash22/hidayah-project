import os
import django
from django.core.management import call_command
from django.db.models.signals import post_save, pre_save, m2m_changed
from django.dispatch import receiver

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def disable_signals():
    """Temporarily disconnect all post_save signals to allow loaddata without auto-creation conflicts"""
    print("Disabling signals...")
    post_save.receivers = []
    pre_save.receivers = []
    m2m_changed.receivers = []

def migrate():
    disable_signals()
    
    print("Flushing PostgreSQL database...")
    call_command('flush', '--no-input')
    
    print("Loading data from SQLite dump (53 records)...")
    try:
        # We need to use -Xutf8 in the shell, but call_command uses internal Django logic
        call_command('loaddata', 'db_dump.json')
        print("Data loaded successfully!")
    except Exception as e:
        print(f"Error during loaddata: {e}")
        
    print("Resetting PostgreSQL sequences...")
    from django.db import connection
    with connection.cursor() as cursor:
        for table in connection.introspection.table_names():
            # Check if the table has an 'id' column
            columns = [col.name for col in connection.introspection.get_table_description(cursor, table)]
            if 'id' in columns:
                # Check for serial column
                cursor.execute(f"SELECT pg_get_serial_sequence('{table}', 'id');")
                seq = cursor.fetchone()[0]
                if seq:
                    cursor.execute(f"SELECT setval('{seq}', coalesce(max(id), 1), max(id) IS NOT null) FROM {table};")
                
    print("Migration finished!")

if __name__ == '__main__':
    migrate()

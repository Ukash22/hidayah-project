# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import django
from django.utils.text import slugify

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from programs.models import Program, Subject

def populate_nigerian_subjects():
    print("Starting population of Nigerian subjects...")
    
    # Create or get the Western Education program
    program, created = Program.objects.get_or_create(
        name="Nigerian Secondary Education",
        defaults={
            "program_type": "WESTERN",
            "description": "Standard Nigerian curriculum for WAEC, NECO, and JAMB preparation."
        }
    )
    
    if created:
        print(f"Created program: {program.name}")
    else:
        print(f"Using existing program: {program.name}")

    subjects = [
        "Mathematics",
        "English Language",
        "Biology",
        "Chemistry",
        "Physics",
        "Economics",
        "Government",
        "Literature in English",
        "Civic Education",
        "Islamic Studies",
        "Christian Religious Studies",
        "Agricultural Science",
        "Geography",
        "Commerce",
        "Financial Accounting",
        "Data Processing",
        "Computer Studies",
        "Yoruba",
        "Igbo",
        "Hausa",
        "Further Mathematics",
        "Technical Drawing",
        "Marketing",
        "Insurance",
    ]

    for subject_name in subjects:
        subj, s_created = Subject.objects.get_or_create(
            program=program,
            name=subject_name,
            defaults={"slug": slugify(subject_name)}
        )
        if s_created:
            print(f"Added subject: {subject_name}")
        else:
            print(f"Subject already exists: {subject_name}")

    print("Population complete!")

if __name__ == "__main__":
    populate_nigerian_subjects()

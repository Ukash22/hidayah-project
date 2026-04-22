import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from programs.models import Program, Subject
from django.utils.text import slugify

ISLAMIC_SUBJECTS = [
    'Quranic Recitation',
    'Arabic Foundation',
    'Islamic Studies',
    'Hifz Program',
    'Tajweed',
    'Islamic Jurisprudence (Fiqh)',
    'Hadith Studies',
    'Tafsir',
    'Islamic History',
    'Arabic Grammar (Nahw)',
]

def run():
    # Ensure ISLAMIC program exists
    program, created = Program.objects.get_or_create(
        program_type='ISLAMIC',
        defaults={'name': 'Islamic Education', 'description': 'Comprehensive Islamic Studies'}
    )
    if created:
        print(f"Created Program: {program.name}")

    count = 0
    for subj_name in ISLAMIC_SUBJECTS:
        subj, subj_created = Subject.objects.get_or_create(
            program=program,
            name=subj_name,
            defaults={'slug': slugify(subj_name)}
        )
        if subj_created:
            print(f"Added Subject: {subj_name}")
            count += 1
    
    print(f"Successfully added {count} Islamic subjects.")

if __name__ == '__main__':
    run()

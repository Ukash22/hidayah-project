import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.utils.text import slugify
from programs.models import Program, Subject

def seed_subjects():
    # Define Programs
    programs_data = [
        ('Islamic Education', 'ISLAMIC'),
        ('Western Education', 'WESTERN'),
        ('Exam Preparation', 'EXAM_PREP'),
    ]

    programs = {}
    for name, p_type in programs_data:
        p, _ = Program.objects.get_or_create(name=name, program_type=p_type)
        programs[p_type] = p
        print(f"Program ensured: {name} ({p_type})")

    # Define Subjects
    subjects_data = {
        'ISLAMIC': [
            'Quranic Recitation', 'Arabic Foundation', 'Islamic Studies', 'Hifz Program', 
            'Tajweed', 'Islamic Jurisprudence (Fiqh)', 'Hadith Studies', 'Tafsir', 
            'Islamic History', 'Arabic Grammar (Nahw)'
        ],
        'WESTERN': [
            'Mathematics', 'English Language', 'Basic Science', 'Biology', 'Chemistry', 
            'Physics', 'Further Mathematics', 'Economics', 'Government', 
            'Literature in English', 'Geography', 'Agricultural Science', 
            'Computer Science', 'Civic Education'
        ],
        'EXAM_PREP': [
            'JAMB (UTME)', 'WAEC (SSCE)', 'NECO (SSCE)', 'Junior WAEC (BECE)', 
            'Mathematics (Exam Prep)', 'English Language (Exam Prep)', 
            'Science (Exam Prep)', 'Commercial (Exam Prep)', 'Arts (Exam Prep)'
        ]
    }

    sub_count = 0
    for p_type, names in subjects_data.items():
        p = programs[p_type]
        for name in names:
            s_slug = slugify(name)
            # Handle duplicates if any (though names should be unique here)
            s, created = Subject.objects.get_or_create(slug=s_slug, defaults={'name': name, 'program': p})
            if created:
                sub_count += 1
                print(f"  + Subject added: {name} ({s_slug})")
            else:
                # Update name/program if it already exist by slug
                s.name = name
                s.program = p
                s.save()
                print(f"  - Subject updated: {name}")

    print(f"\nSeed completed! {sub_count} new subjects added.")

if __name__ == "__main__":
    seed_subjects()

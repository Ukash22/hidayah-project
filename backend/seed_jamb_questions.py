# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import django
import time
import random

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from exams.models import Exam, Question
from programs.models import Subject
from ai_engine.services import generate_ai_questions

def seed_jamb():
    print("Starting Massive JAMB Data Seeding (2015-2024)...")
    
    subjects = [
        "Mathematics", 
        "English Language", 
        "Physics", 
        "Chemistry", 
        "Biology", 
        "Economics", 
        "Government", 
        "Literature in English", 
        "Geography", 
        "Agricultural Science", 
        "Computer Science", 
        "Civic Education"
    ]
    
    years = list(range(2015, 2025)) # 2015 to 2024
    
    for subject_name in subjects:
        # Ensure subject exists
        subject, created = Subject.objects.get_or_create(
            name=subject_name,
            defaults={'level': 'SECONDARY'} # Standard for JAMB
        )
        if created:
            print(f"Created Subject: {subject_name}")
            
        for year in years:
            title = f"JAMB {subject_name} {year}"
            
            # Check if exam already exists
            exam = Exam.objects.filter(title=title).first()
            if exam and exam.questions.count() >= 5:
                # print(f"Skipping {title} (Already seeded)")
                continue
                
            print(f"Generating questions for: {title}...")
            
            try:
                # Use AI service to generate UTME-standard questions
                # If OPENAI_API_KEY is not set, it uses the high-quality mock bank in services.py
                questions_data = generate_ai_questions(subject_name, "JAMB", str(year), num_questions=10)
                
                if not exam:
                    exam = Exam.objects.create(
                        title=title,
                        exam_type="JAMB",
                        subject=subject,
                        duration_minutes=60,
                        year=year,
                        is_active=True
                    )
                
                for q in questions_data:
                    Question.objects.get_or_create(
                        exam=exam,
                        text=q["text"],
                        defaults={
                            "option_a": q["options"][0],
                            "option_b": q["options"][1],
                            "option_c": q["options"][2],
                            "option_d": q["options"][3],
                            "correct_option": q["answer"]
                        }
                    )
                
                print(f"   Saved {len(questions_data)} questions for {title}")
                
            except Exception as e:
                print(f"   Failed to seed {title}: {e}")
                
            # Avoid hitting rate limits if using real OpenAI
            if os.getenv("OPENAI_API_KEY"):
                time.sleep(1)

    # Second Pass: BECE (Junior WAEC)
    print("Starting BECE (Junior WAEC) Data Seeding (2015-2024)...")
    for subject_name in subjects:
        subject, _ = Subject.objects.get_or_create(name=subject_name, defaults={'level': 'SECONDARY'})
        for year in years:
            title = f"BECE {subject_name} {year}"
            exam = Exam.objects.filter(title=title).first()
            if exam and exam.questions.count() >= 5:
                continue
                
            print(f"Generating questions for: {title}...")
            try:
                questions_data = generate_ai_questions(subject_name, "BECE", str(year), num_questions=10)
                if not exam:
                    exam = Exam.objects.create(title=title, exam_type="BECE", subject=subject, duration_minutes=60, year=year, is_active=True)
                
                for q in questions_data:
                    Question.objects.get_or_create(exam=exam, text=q["text"], defaults={
                        "option_a": q["options"][0], "option_b": q["options"][1], "option_c": q["options"][2], "option_d": q["options"][3], "correct_option": q["answer"]
                    })
                print(f"   Saved {len(questions_data)} questions for {title}")
            except Exception as e:
                print(f"   Failed to seed {title}: {e}")
            if os.getenv("OPENAI_API_KEY"): time.sleep(1)

    print("\nMassive Seeding Complete! JAMB and BECE Portals are now live.")

if __name__ == "__main__":
    seed_jamb()

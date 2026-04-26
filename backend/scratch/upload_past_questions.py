# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from exams.models import Exam, Question
from programs.models import Subject

def upload_questions():
    print("Starting upload of past questions...")

    # Define some exams with years
    exam_data = [
        {
            "title": "JAMB Mathematics 2021",
            "exam_type": "JAMB",
            "subject_name": "Mathematics",
            "questions": [
                {
                    "text": "Find the value of x if 2x + 5 = 15",
                    "a": "3",
                    "b": "5",
                    "c": "10",
                    "d": "7.5",
                    "correct": "B"
                },
                {
                    "text": "What is the square root of 144?",
                    "a": "10",
                    "b": "11",
                    "c": "12",
                    "d": "13",
                    "correct": "C"
                }
            ]
        },
        {
            "title": "JAMB English Language 2021",
            "exam_type": "JAMB",
            "subject_name": "English Language",
            "questions": [
                {
                    "text": "Choose the word most nearly opposite in meaning to: GENUINE",
                    "a": "Fake",
                    "b": "Real",
                    "c": "Pure",
                    "d": "Authentic",
                    "correct": "A"
                },
                {
                    "text": "The students _______ their exams yesterday.",
                    "a": "write",
                    "b": "wrote",
                    "c": "writted",
                    "d": "have written",
                    "correct": "B"
                }
            ]
        },
        {
            "title": "WAEC Biology 2022",
            "exam_type": "WAEC",
            "subject_name": "Biology",
            "questions": [
                {
                    "text": "Which of the following is the 'powerhouse' of the cell?",
                    "a": "Nucleus",
                    "b": "Ribosome",
                    "c": "Mitochondrion",
                    "d": "Golgi apparatus",
                    "correct": "C"
                },
                {
                    "text": "The process by which plants make their own food is called ______",
                    "a": "Respiration",
                    "b": "Transpiration",
                    "c": "Photosynthesis",
                    "d": "Osmosis",
                    "correct": "C"
                }
            ]
        }
    ]

    for data in exam_data:
        try:
            subject = Subject.objects.get(name=data["subject_name"])
            # Extract year from title if not explicitly provided
            year = int(data["title"][-4:]) if data["title"][-4:].isdigit() else None
            
            exam, created = Exam.objects.get_or_create(
                title=data["title"],
                exam_type=data["exam_type"],
                subject=subject,
                defaults={
                    "duration_minutes": 60,
                    "year": year
                }
            )
            
            if created:
                print(f"Created Exam: {exam.title}")
            else:
                print(f"Exam already exists: {exam.title}")

            for q_data in data["questions"]:
                Question.objects.get_or_create(
                    exam=exam,
                    text=q_data["text"],
                    defaults={
                        "option_a": q_data["a"],
                        "option_b": q_data["b"],
                        "option_c": q_data["c"],
                        "option_d": q_data["d"],
                        "correct_option": q_data["correct"]
                    }
                )
            print(f"  Uploaded questions for {exam.title}")

        except Subject.DoesNotExist:
            print(f"Error: Subject '{data['subject_name']}' not found. Please run add_nigerian_subjects.py first.")

    print("Upload complete!")

if __name__ == "__main__":
    upload_questions()

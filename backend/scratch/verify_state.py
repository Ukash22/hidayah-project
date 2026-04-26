import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from programs.models import Subject
subjects = list(Subject.objects.select_related('program').all())
islamic = [s for s in subjects if s.program.program_type == 'ISLAMIC']
western = [s for s in subjects if s.program.program_type == 'WESTERN']
print(f'Total subjects: {len(subjects)}')
print(f'Islamic ({len(islamic)}): {[s.name for s in islamic]}')
print(f'Western ({len(western)}): {[s.name for s in western[:5]]}... ')

from exams.models import Exam, ExamAssignment
print(f'Total exams: {Exam.objects.count()}')
print(f'Total assignments: {ExamAssignment.objects.count()}')
exams = list(Exam.objects.values('id', 'title', 'exam_type', 'is_active')[:5])
for e in exams:
    print(f'  Exam: {e}')

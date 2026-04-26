import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from programs.models import Subject
subjects = Subject.objects.select_related('program').all()
western = [s for s in subjects if s.program.program_type == 'WESTERN']
islamic = [s for s in subjects if s.program.program_type == 'ISLAMIC']
print(f"WESTERN subjects: {len(western)}")
print(f"ISLAMIC subjects: {len(islamic)}")
print("Islamic list:", [s.name for s in islamic])

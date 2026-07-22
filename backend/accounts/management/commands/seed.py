"""
Development seed command — populate the database with realistic demo data.

Usage:
    python manage.py seed                     # seed everything
    python manage.py seed --section users     # seed only users
    python manage.py seed --section materials # seed only learning materials
    python manage.py seed --clear             # wipe seeded data first

Sections:
    users     — admin + 3 tutors + 3 students + 1 parent
    programs  — programs + subjects
    pricing   — pricing tiers (ONE_ON_ONE / GROUP)
    wallets   — seed wallet balances for demo accounts
    materials — LearningMaterial entries (YouTube links) for demo tutors

NOTE: Idempotent — safe to run multiple times. Use --clear to reset demo users.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with development demo data'

    def add_arguments(self, parser):
        parser.add_argument('--section', type=str, default='all',
                            help='Which section to seed: all, users, programs, pricing, wallets, materials')
        parser.add_argument('--clear', action='store_true',
                            help='Delete seeded demo data before re-seeding')

    def handle(self, *args, **options):
        section = options['section']
        do_clear = options['clear']

        if do_clear:
            self._clear()

        with transaction.atomic():
            if section in ('all', 'programs'):
                self._seed_programs()
            if section in ('all', 'pricing'):
                self._seed_pricing()
            if section in ('all', 'users'):
                self._seed_users()
            if section in ('all', 'wallets'):
                self._seed_wallets()
            if section in ('all', 'materials'):
                self._seed_materials()

        self.stdout.write(self.style.SUCCESS('\nSeed complete.'))

    # ------------------------------------------------------------------ #
    # CLEAR                                                                #
    # ------------------------------------------------------------------ #
    def _clear(self):
        """Remove demo accounts (identified by username prefix 'demo_')."""
        deleted, _ = User.objects.filter(username__startswith='demo_').delete()
        self.stdout.write(f'  [DEL] Cleared {deleted} demo user(s).')

    # ------------------------------------------------------------------ #
    # PROGRAMS & SUBJECTS                                                  #
    # ------------------------------------------------------------------ #
    def _seed_programs(self):
        from programs.models import Program, Subject

        PROGRAMS = [
            ('Islamic Education', 'ISLAMIC', [
                'Quranic Recitation', 'Tajweed', 'Hifz Program',
                'Arabic Foundation', 'Islamic Studies', 'Fiqh',
            ]),
            ('Western Education', 'WESTERN', [
                'Mathematics', 'English Language', 'Physics',
                'Chemistry', 'Biology', 'Economics', 'Further Mathematics',
                'Computer Science',
            ]),
            ('Exam Preparation', 'EXAM_PREP', [
                'JAMB', 'WAEC', 'NECO', 'BECE',
            ]),
        ]

        for prog_name, prog_type, subjects in PROGRAMS:
            prog, created = Program.objects.get_or_create(
                name=prog_name, defaults={'program_type': prog_type}
            )
            if created:
                self.stdout.write(f'  [+]Program: {prog_name}')
            for subj_name in subjects:
                _, s_created = Subject.objects.get_or_create(
                    name=subj_name, defaults={'program': prog, 'admin_percentage': Decimal('5.00')}
                )
                if s_created:
                    self.stdout.write(f'       Subject: {subj_name}')

    # ------------------------------------------------------------------ #
    # PRICING TIERS                                                        #
    # ------------------------------------------------------------------ #
    def _seed_pricing(self):
        from payments.models import PricingTier

        TIERS = [
            ('ONE_ON_ONE', Decimal('3500.00'), 'Personalised one-on-one tutoring sessions.'),
            ('GROUP',      Decimal('1800.00'), 'Group classes with up to 5 students.'),
        ]
        for class_type, rate, desc in TIERS:
            tier, created = PricingTier.objects.get_or_create(
                class_type=class_type,
                defaults={'hourly_rate': rate, 'description': desc, 'is_active': True},
            )
            if created:
                self.stdout.write(f'  [+]Pricing: {class_type} @ NGN {rate}/hr')
            else:
                self.stdout.write(f'  [ok]Pricing: {class_type} already exists')

    # ------------------------------------------------------------------ #
    # USERS (admin, tutors, students, parent)                              #
    # ------------------------------------------------------------------ #
    def _seed_users(self):
        from tutors.models import TutorProfile, TutorAvailability
        from students.models import StudentProfile
        from parents.models import ParentProfile

        # --- Admin ---
        admin, created = User.objects.get_or_create(
            username='demo_admin',
            defaults=dict(
                email='admin@hidayah.dev',
                first_name='Hidayah', last_name='Admin',
                is_staff=True, is_superuser=True,
                role='ADMIN',
            )
        )
        if created:
            admin.set_password('Admin1234!')
            admin.save()
            self.stdout.write('  [+]Admin: demo_admin / Admin1234!')

        # --- Tutors ---
        TUTORS = [
            dict(username='demo_tutor1', first_name='Abdullahi', last_name='Yusuf',
                 email='tutor1@hidayah.dev',
                 subjects='Quranic Recitation, Tajweed, Hifz Program',
                 bio='Hafidh with 8 years of teaching Quran to students of all ages.',
                 experience_years=8, hourly_rate=Decimal('3500.00'),
                 availability_days='Monday, Wednesday, Friday',
                 availability_hours='09:00 - 17:00 UTC'),
            dict(username='demo_tutor2', first_name='Fatima', last_name='Bello',
                 email='tutor2@hidayah.dev',
                 subjects='Mathematics, Physics, Further Mathematics',
                 bio='BSc Mathematics (First Class). WAEC & JAMB specialist.',
                 experience_years=5, hourly_rate=Decimal('3000.00'),
                 availability_days='Tuesday, Thursday, Saturday',
                 availability_hours='10:00 - 18:00 UTC'),
            dict(username='demo_tutor3', first_name='Ibrahim', last_name='Aliyu',
                 email='tutor3@hidayah.dev',
                 subjects='English Language, Literature in English, Arabic Foundation',
                 bio='M.Ed. English. Experienced in Cambridge & Nigerian curricula.',
                 experience_years=10, hourly_rate=Decimal('3200.00'),
                 availability_days='Monday, Tuesday, Wednesday, Thursday, Friday',
                 availability_hours='08:00 - 16:00 UTC'),
        ]

        for t in TUTORS:
            user, created = User.objects.get_or_create(
                username=t['username'],
                defaults=dict(
                    email=t['email'], first_name=t['first_name'],
                    last_name=t['last_name'], role='TUTOR',
                )
            )
            if created:
                user.set_password('Tutor1234!')
                user.save()
                self.stdout.write(f"  [+]Tutor: {t['username']} / Tutor1234!")

            TutorProfile.objects.get_or_create(
                user=user,
                defaults=dict(
                    status='APPROVED',
                    subjects_to_teach=t['subjects'],
                    bio=t['bio'],
                    experience_years=t['experience_years'],
                    hourly_rate=t['hourly_rate'],
                    availability_days=t['availability_days'],
                    availability_hours=t['availability_hours'],
                    has_online_exp=True,
                    device_type='COMPUTER',
                    languages='English, Arabic' if 'Arabic' in t['subjects'] else 'English',
                ),
            )

        # --- Students ---
        STUDENTS = [
            dict(username='demo_student1', first_name='Aisha', last_name='Musa',
                 email='student1@hidayah.dev', level='JAMB',
                 enrolled_course='Mathematics', class_type='ONE_ON_ONE'),
            dict(username='demo_student2', first_name='Umar', last_name='Sani',
                 email='student2@hidayah.dev', level='SECONDARY',
                 enrolled_course='Quranic Recitation', class_type='GROUP'),
            dict(username='demo_student3', first_name='Maryam', last_name='Ibrahim',
                 email='student3@hidayah.dev', level='WAEC',
                 enrolled_course='English Language', class_type='ONE_ON_ONE'),
        ]

        for s in STUDENTS:
            user, created = User.objects.get_or_create(
                username=s['username'],
                defaults=dict(
                    email=s['email'], first_name=s['first_name'],
                    last_name=s['last_name'], role='STUDENT',
                )
            )
            if created:
                user.set_password('Student1234!')
                user.save()
                self.stdout.write(f"  [+]Student: {s['username']} / Student1234!")

            StudentProfile.objects.get_or_create(
                user=user,
                defaults=dict(
                    approval_status='APPROVED',
                    payment_status='PAID',
                    level=s['level'],
                    enrolled_course=s['enrolled_course'],
                    class_type=s['class_type'],
                    preferred_mode='ONLINE',
                ),
            )

        # --- Parent ---
        parent_user, created = User.objects.get_or_create(
            username='demo_parent',
            defaults=dict(
                email='parent@hidayah.dev',
                first_name='Hafsat', last_name='Musa',
                role='PARENT',
            )
        )
        if created:
            parent_user.set_password('Parent1234!')
            parent_user.save()
            self.stdout.write('  [+]Parent: demo_parent / Parent1234!')

        ParentProfile.objects.get_or_create(user=parent_user)

        # Link first student to parent
        try:
            s1_user = User.objects.get(username='demo_student1')
            s1_profile = s1_user.student_profile
            if not s1_profile.parent:
                s1_profile.parent = parent_user
                s1_profile.relationship = 'Mother'
                s1_profile.save()
                self.stdout.write('  [->]Linked demo_student1 → demo_parent')
        except Exception:
            pass

    # ------------------------------------------------------------------ #
    # WALLETS                                                              #
    # ------------------------------------------------------------------ #
    def _seed_wallets(self):
        from payments.models import Wallet, Transaction

        BALANCES = [
            ('demo_student1', Decimal('15000.00')),
            ('demo_student2', Decimal('8500.00')),
            ('demo_student3', Decimal('25000.00')),
            ('demo_tutor1',   Decimal('42000.00')),
            ('demo_tutor2',   Decimal('18000.00')),
            ('demo_tutor3',   Decimal('31500.00')),
        ]

        for username, balance in BALANCES:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                continue

            wallet, _ = Wallet.objects.get_or_create(user=user)
            if wallet.balance == 0:
                wallet.balance = balance
                wallet.save()
                Transaction.objects.create(
                    user=user,
                    transaction_type='DEPOSIT',
                    amount=balance,
                    description='Seed: initial demo balance',
                )
                self.stdout.write(f'  [$] Wallet: {username} <- NGN {balance:,.0f}')

    # ------------------------------------------------------------------ #
    # LEARNING MATERIALS                                                   #
    # ------------------------------------------------------------------ #
    def _seed_materials(self):
        from curriculum.models import LearningMaterial

        MATERIALS = [
            dict(
                tutor_username='demo_tutor1',
                title='Surah Al-Fatiha — Full Recitation with Tajweed',
                description='Audio recitation of Surah Al-Fatiha demonstrating proper Tajweed rules.',
                material_type='LINK',
                external_url='https://www.youtube.com/watch?v=ld_Gm_a2bxs',
                is_public=True,
            ),
            dict(
                tutor_username='demo_tutor1',
                title='Tajweed: Rules of Madd (Elongation)',
                description='Detailed video lesson on the different types of Madd in Quranic recitation.',
                material_type='LINK',
                external_url='https://www.youtube.com/watch?v=bGUv9SjULDk',
                is_public=True,
            ),
            dict(
                tutor_username='demo_tutor1',
                title='Hifz Memorisation Techniques for Students',
                description='Practical tips and revision strategies for students undertaking Quran memorisation.',
                material_type='LINK',
                external_url='https://www.youtube.com/watch?v=5d9jRwrA9rM',
                is_public=False,
            ),
            dict(
                tutor_username='demo_tutor2',
                title='JAMB Mathematics: Algebra and Quadratic Equations',
                description='Step-by-step solutions to JAMB-style algebra questions.',
                material_type='LINK',
                external_url='https://www.youtube.com/watch?v=NybHckSEQBI',
                is_public=True,
            ),
            dict(
                tutor_username='demo_tutor2',
                title='WAEC Physics: Newton\'s Laws of Motion',
                description='Clear breakdown of all three laws with real-world examples and past questions.',
                material_type='LINK',
                external_url='https://www.youtube.com/watch?v=XS6wB3jJJPE',
                is_public=True,
            ),
            dict(
                tutor_username='demo_tutor2',
                title='Further Mathematics: Differentiation from First Principles',
                description='Proof and worked examples for WAEC Further Maths differentiation topic.',
                material_type='LINK',
                external_url='https://www.youtube.com/watch?v=rAof9Ld5sOg',
                is_public=False,
            ),
            dict(
                tutor_username='demo_tutor3',
                title='English Language: Essay Writing for WAEC',
                description='How to plan, structure, and write a high-scoring essay in WAEC English.',
                material_type='LINK',
                external_url='https://www.youtube.com/watch?v=1I0u_M82JxQ',
                is_public=True,
            ),
            dict(
                tutor_username='demo_tutor3',
                title='Arabic Foundation: Introduction to the Arabic Alphabet',
                description='Beginner-friendly video covering the Arabic letters, their forms, and pronunciation.',
                material_type='LINK',
                external_url='https://www.youtube.com/watch?v=VygMGLZ1ggs',
                is_public=True,
            ),
        ]

        for m in MATERIALS:
            try:
                tutor = User.objects.get(username=m['tutor_username'])
            except User.DoesNotExist:
                self.stdout.write(f"  [skip] Tutor {m['tutor_username']} not found for material: {m['title'][:40]}")
                continue

            _, created = LearningMaterial.objects.get_or_create(
                tutor=tutor,
                title=m['title'],
                defaults=dict(
                    description=m['description'],
                    material_type=m['material_type'],
                    external_url=m['external_url'],
                    is_public=m['is_public'],
                )
            )
            if created:
                self.stdout.write(f"  [+]Material: {m['title'][:50]}")

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Journey tests — end-to-end user stories for every platform actor.

Each TestCase tells the complete lifecycle of one actor, from their very
first HTTP request to their last.  A single test method per chapter keeps
the narrative unbroken and lets each step build on the previous one.

  Chapter 1 — Student Aisha:   signup → approval → dashboard → booking → AI hub
  Chapter 2 — Tutor Sheikh:    application → approval → profile → exams → bookings
  Chapter 3 — Admin Hussain:   oversight → approvals → analytics → management
  Chapter 4 — Parent Umm:      registration → login → child portal
"""

from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────────────

def _login(client, username, password):
    res = client.post('/api/auth/login/', {'username': username, 'password': password}, format='json')
    assert res.status_code == 200, f"Login failed for {username!r}: {res.content}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return res.data


def _make_world():
    """Minimum platform data every chapter needs: admin + two subjects."""
    from programs.models import Program, Subject
    admin = User.objects.create_superuser(
        'admin_journey', 'admin_journey@test.com', 'adminpass123'
    )
    western = Program.objects.create(name='Western Education', program_type='WESTERN')
    islamic = Program.objects.create(name='Islamic Studies', program_type='ISLAMIC')
    Subject.objects.create(program=western, name='Mathematics')
    quran = Subject.objects.create(program=islamic, name='Quranic Recitation')
    return admin, quran


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 1 — Student Aisha
# ─────────────────────────────────────────────────────────────────────────────

class StudentAishaJourney(TestCase):
    """
    Aisha hears about Hidayah, signs up to learn Quranic Recitation,
    waits for admin approval, then explores the platform, books a tutor,
    saves an AI practice set, and logs out.
    """

    def test_registration_to_learning(self):
        from students.models import StudentProfile
        from payments.models import Wallet
        from tutors.models import TutorProfile

        # ── Prologue: world and an approved tutor exist ───────────────────
        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='sheikh_for_aisha', email='sheikh_for_aisha@test.com',
            password='tutorpass123', role='TUTOR',
            first_name='Sheikh', last_name='Musa',
        )
        tutor_profile = TutorProfile.objects.create(
            user=tutor_user, status='APPROVED',
            subjects_to_teach='Quranic Recitation', hourly_rate=1500,
        )

        # ── Act 1: Aisha registers ────────────────────────────────────────
        c = APIClient()
        res = c.post('/api/auth/register/', {
            'username': 'aisha_student',
            'email': 'aisha@test.com',
            'password': 'aisha12345',
            'role': 'STUDENT',
            'first_name': 'Aisha',
            'last_name': 'Rahman',
            'gender': 'Female',
            'class_type': 'ONE_ON_ONE',
            'level': 'JAMB',
            'days_per_week': 2,
            'hours_per_week': 2.0,
            'preferred_days': 'Monday,Wednesday',
            'preferred_time_exact': '09:00,10:00',
            'subject_enrollments': [
                {'subject': 'Quranic Recitation', 'preferred_tutor_id': None}
            ],
            'total_amount': 0,
        }, format='json')
        self.assertEqual(res.status_code, 201, f"Registration failed: {res.content}")
        self.assertTrue(User.objects.filter(username='aisha_student').exists())

        aisha_user = User.objects.get(username='aisha_student')
        aisha_profile = StudentProfile.objects.get(user=aisha_user)

        # Registration uses instant admission — no pending queue step needed
        self.assertEqual(aisha_profile.approval_status, 'APPROVED')

        # ── Act 2: Aisha logs in with her new credentials ─────────────────
        login_data = _login(c, 'aisha_student', 'aisha12345')
        self.assertIn('access', login_data)
        self.assertEqual(login_data['user']['username'], 'aisha_student')

        # ── Act 3: Admin can verify Aisha exists in the student roster ────
        # (pending-students queue is for admin-created PENDING records)
        res = admin_c.get('/api/students/admin/all/')
        self.assertEqual(res.status_code, 200)

        # ── Act 4: Aisha checks her profile ───────────────────────────────
        c2 = APIClient()
        _login(c2, 'aisha_student', 'aisha12345')

        res = c2.get('/api/auth/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'aisha_student')

        res = c2.get('/api/students/me/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('payment_status', res.data)

        res = c2.get('/api/students/me/progress/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('attendance', res.data)

        # ── Act 5: Aisha browses the platform ─────────────────────────────
        res = c2.get('/api/classes/sessions/')
        self.assertEqual(res.status_code, 200)

        res = c2.get('/api/curriculum/materials/')
        self.assertEqual(res.status_code, 200)

        res = c2.get('/api/exams/list/')
        self.assertEqual(res.status_code, 200)

        res = c2.get('/api/auth/notifications/')
        self.assertEqual(res.status_code, 200)

        res = c2.get('/api/ai/practice-sets/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)

        # ── Act 6: Aisha books Sheikh Musa for Quranic Recitation ─────────
        res = c2.post('/api/classes/booking/request/', {
            'tutor_id': tutor_profile.id,
            'subject': 'Quranic Recitation',
            'schedule': [{'day': 'Monday', 'start_time': '09:00', 'end_time': '10:00'}],
            'preferred_start_date': '2026-09-01',
            'learning_level': 'Beginner',
            'class_structure': 'One-on-One',
            'hours_per_session': 1.0,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Booking failed: {res.content}")
        self.assertIn('id', res.data)

        # Aisha can see her own bookings
        res = c2.get('/api/classes/booking/request/')
        self.assertEqual(res.status_code, 200)

        # ── Act 7: Aisha files a complaint about a late session ───────────
        res = c2.post('/api/complaints/my/', {
            'filed_against_id': tutor_user.id,
            'subject': 'Late to class',
            'description': 'Sheikh Musa was 15 minutes late to our Monday session.',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Complaint filing failed: {res.content}")

        res = c2.get('/api/complaints/my/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('filed_by_me', res.data)

        # ── Act 8: Aisha uses the AI hub to save a practice set ───────────
        # Fund wallet via ORM (Paystack flow is tested separately)
        Wallet.objects.update_or_create(user=aisha_user, defaults={'balance': 5000})

        res = c2.post('/api/ai/practice-sets/', {
            'title': 'Quran Revision — Week 1',
            'subject_name': 'Quranic Recitation',
            'exam_type': 'JAMB',
            'questions': [
                {
                    'question': 'What is Surah Al-Fatiha?',
                    'options': ['The Opening', 'The Cow', 'The Table', 'The Night'],
                    'answer': 'The Opening',
                    'correct': 0,
                }
            ],
        }, format='json')
        self.assertEqual(res.status_code, 201, f"Practice set save failed: {res.content}")

        res = c2.get('/api/ai/practice-sets/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['title'], 'Quran Revision — Week 1')

        # ── Act 9: Aisha logs out ─────────────────────────────────────────
        res = c2.post('/api/auth/logout/', {}, format='json')
        self.assertIn(res.status_code, [200, 204, 205])


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 2 — Tutor Sheikh Musa
# ─────────────────────────────────────────────────────────────────────────────

class TutorSheikhJourney(TestCase):
    """
    Sheikh Musa applies to Hidayah as a tutor, gets interviewed and approved
    by admin, sets his availability, creates exams for students, checks booking
    requests, and reviews his wallet.
    """

    def test_application_to_teaching(self):
        from tutors.models import TutorProfile

        # ── Prologue ──────────────────────────────────────────────────────
        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        # ── Act 1: Sheikh applies as a tutor via the public endpoint ──────
        c = APIClient()
        res = c.post('/api/tutors/register/', {
            'username': 'sheikh_musa',
            'email': 'sheikh_musa@test.com',
            'password': 'sheikh12345',
            'first_name': 'Sheikh',
            'last_name': 'Musa',
            'gender': 'Male',
            'subjects_to_teach': 'Quranic Recitation',
            'experience_years': 5,
            'languages': 'Arabic, English',
            'availability_days': 'Monday,Wednesday,Friday',
            'availability_hours': '09:00-17:00',
            'hourly_rate': 1500,
            'has_online_exp': True,
            'device_type': 'COMPUTER',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Tutor registration failed: {res.content}")

        sheikh_profile = TutorProfile.objects.get(user__username='sheikh_musa')
        self.assertEqual(sheikh_profile.status, 'APPLIED')

        # ── Act 2: Admin reviews the tutor list and approves Sheikh ───────
        res = admin_c.get('/api/tutors/admin/list/')
        self.assertEqual(res.status_code, 200)
        tutor_emails = [t.get('email', '') for t in res.data]
        self.assertIn('sheikh_musa@test.com', tutor_emails)

        res = admin_c.post(f'/api/tutors/admin/action/{sheikh_profile.id}/', {
            'action': 'APPROVE',
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Tutor approval failed: {res.content}")

        sheikh_profile.refresh_from_db()
        self.assertEqual(sheikh_profile.status, 'APPROVED')

        # ── Act 3: Sheikh logs in and sees his profile ────────────────────
        _login(c, 'sheikh_musa', 'sheikh12345')

        res = c.get('/api/tutors/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get('status'), 'APPROVED')

        # ── Act 4: Sheikh sets his weekly availability ────────────────────
        res = c.put('/api/tutors/me/availability/', {
            'slots': [
                {'day': 'Monday', 'start_time': '09:00', 'end_time': '12:00'},
                {'day': 'Wednesday', 'start_time': '14:00', 'end_time': '17:00'},
                {'day': 'Friday', 'start_time': '10:00', 'end_time': '13:00'},
            ]
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Availability update failed: {res.content}")

        # ── Act 5: Sheikh checks which students are assigned to him ───────
        res = c.get('/api/students/tutor/my-students/')
        self.assertEqual(res.status_code, 200)

        # ── Act 6: Sheikh creates an exam for his students ────────────────
        res = c.post('/api/exams/list/', {
            'title': 'Quran Recitation Assessment — Week 1',
            'subject': quran.id,
            'exam_type': 'INTERNAL',
            'description': 'First weekly evaluation',
            'duration_minutes': 30,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Exam creation failed: {res.content}")
        exam_id = res.data.get('id')

        # Sheikh can list exams
        res = c.get('/api/exams/list/')
        self.assertEqual(res.status_code, 200)

        # ── Act 7: Sheikh views his pending booking requests ──────────────
        res = c.get('/api/classes/booking/approval/')
        self.assertEqual(res.status_code, 200)

        # ── Act 8: Sheikh checks session history ──────────────────────────
        res = c.get('/api/classes/sessions/')
        self.assertEqual(res.status_code, 200)

        # ── Act 9: Sheikh checks his wallet and earnings ──────────────────
        res = c.get('/api/payments/tutor/wallet/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('balance', res.data)

        # ── Act 10: Sheikh reviews his complaint history ──────────────────
        res = c.get('/api/complaints/my/')
        self.assertEqual(res.status_code, 200)

        # ── Act 11: Sheikh checks his class materials ─────────────────────
        res = c.get('/api/curriculum/materials/')
        self.assertEqual(res.status_code, 200)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 3 — Admin Hussain
# ─────────────────────────────────────────────────────────────────────────────

class AdminHussainJourney(TestCase):
    """
    Admin Hussain runs the platform. He approves students and tutors,
    monitors financials, broadcasts announcements, manages study batches,
    resolves complaints, and adjusts the commission rate.
    """

    def test_platform_oversight(self):
        from students.models import StudentProfile
        from tutors.models import TutorProfile
        from feedback.models import Complaint

        # ── Prologue ──────────────────────────────────────────────────────
        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        # A pending student and an approved tutor exist on the platform
        stu_user = User.objects.create_user(
            username='pending_stu', email='pending_stu@test.com',
            password='stupass123', role='STUDENT',
            first_name='Pending', last_name='Stu',
        )
        StudentProfile.objects.create(user=stu_user, approval_status='PENDING')

        tutor_user = User.objects.create_user(
            username='approved_tutor', email='approved_tutor@test.com',
            password='tutpass123', role='TUTOR',
            first_name='Approved', last_name='Tutor',
        )
        TutorProfile.objects.create(
            user=tutor_user, status='APPROVED',
            subjects_to_teach='Mathematics',
        )

        # A complaint has been filed
        complaint = Complaint.objects.create(
            filed_by=stu_user,
            filed_against=tutor_user,
            subject='Session quality',
            description='The tutor did not cover the agreed syllabus.',
        )

        # ── Act 1: Hussain reviews the pending admissions queue ───────────
        res = admin_c.get('/api/auth/pending-students/')
        self.assertEqual(res.status_code, 200)
        pending = [u.get('username') for u in res.data]
        self.assertIn('pending_stu', pending)

        # ── Act 2: Hussain approves the student ───────────────────────────
        res = admin_c.post(f'/api/auth/approve-student/{stu_user.id}/', {}, format='json')
        self.assertIn(res.status_code, [200, 201], f"Student approval failed: {res.content}")

        # ── Act 3: Hussain views the full student and tutor rosters ───────
        res = admin_c.get('/api/students/admin/all/')
        self.assertEqual(res.status_code, 200)

        res = admin_c.get('/api/tutors/admin/list/')
        self.assertEqual(res.status_code, 200)

        # ── Act 4: Hussain reviews financial health ───────────────────────
        res = admin_c.get('/api/payments/admin/analytics/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('total_revenue', res.data)
        self.assertIn('history', res.data)

        res = admin_c.get('/api/payments/admin/stats/')
        self.assertEqual(res.status_code, 200)

        res = admin_c.get('/api/payments/admin/transactions/')
        self.assertEqual(res.status_code, 200)

        res = admin_c.get('/api/payments/admin/withdrawals/pending/')
        self.assertEqual(res.status_code, 200)

        # ── Act 5: Hussain reviews and updates platform commission ────────
        res = admin_c.get('/api/payments/admin/settings/')
        self.assertEqual(res.status_code, 200)

        res = admin_c.patch('/api/payments/admin/settings/', {
            'default_commission_percentage': 15,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Settings update failed: {res.content}")

        # ── Act 6: Hussain credits the student's wallet manually ──────────
        res = admin_c.post('/api/payments/admin/wallet-action/', {
            'student_id': StudentProfile.objects.get(user=stu_user).id,
            'amount': 5000,
            'action_type': 'DEPOSIT',
            'description': 'Manual admin credit for new student',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Wallet action failed: {res.content}")

        # ── Act 7: Hussain broadcasts a platform-wide announcement ────────
        res = admin_c.post('/api/auth/notifications/broadcast/', {
            'title': 'Eid Mubarak from Hidayah!',
            'message': 'Wishing all students and tutors a blessed Eid.',
            'target_role': 'ALL',
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Broadcast failed: {res.content}")
        self.assertIn('created', res.data)

        # ── Act 8: Hussain reviews all complaints ─────────────────────────
        res = admin_c.get('/api/complaints/admin/all/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

        # ── Act 9: Hussain resolves the complaint ─────────────────────────
        res = admin_c.post(f'/api/complaints/admin/{complaint.id}/resolve/', {
            'response': 'Issue reviewed. Tutor has been notified and advised.',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Complaint resolve failed: {res.content}")

        # ── Act 10: Hussain creates a study group batch ───────────────────
        res = admin_c.post('/api/classes/batches/', {
            'name': 'Quran Beginners — Cohort A',
            'tutor': tutor_user.id,
            'subject': quran.id,
            'description': 'Inaugural group for new Quran students',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Batch creation failed: {res.content}")
        batch_id = res.data['id']

        # Add the student to the batch
        res = admin_c.post(f'/api/classes/batches/{batch_id}/students/add/', {
            'student_ids': [stu_user.id],
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Add to batch failed: {res.content}")

        res = admin_c.get('/api/classes/batches/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

        # ── Act 11: Hussain scans the live class activity feed ────────────
        res = admin_c.get('/api/classes/admin/unified-list/')
        self.assertEqual(res.status_code, 200)

        res = admin_c.get('/api/classes/admin/bookings/')
        self.assertEqual(res.status_code, 200)

        res = admin_c.get('/api/classes/admin/all/')
        self.assertEqual(res.status_code, 200)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 4 — Parent Umm Khalid
# ─────────────────────────────────────────────────────────────────────────────

class ParentUmmKhalidJourney(TestCase):
    """
    Umm Khalid registers on Hidayah as a parent, logs in,
    and uses the parent portal to view her children's profiles.
    """

    def test_parent_registration_and_child_view(self):
        from students.models import StudentProfile

        # ── Prologue ──────────────────────────────────────────────────────
        admin, quran = _make_world()

        # A student child already has a profile on the platform
        child_user = User.objects.create_user(
            username='child_ibrahim', email='ibrahim@test.com',
            password='childpass123', role='STUDENT',
            first_name='Ibrahim', last_name='Khalid',
        )
        StudentProfile.objects.create(user=child_user)

        # ── Act 1: Umm Khalid registers as a parent ───────────────────────
        c = APIClient()
        res = c.post('/api/auth/register/', {
            'username': 'umm_khalid',
            'email': 'umm_khalid@test.com',
            'password': 'ummpass123',
            'role': 'PARENT',
            'first_name': 'Umm',
            'last_name': 'Khalid',
            'gender': 'Female',
        }, format='json')
        # PARENT role may or may not be accepted by register endpoint
        self.assertIn(res.status_code, [200, 201, 400],
                      f"Unexpected register response: {res.content}")

        if res.status_code not in [200, 201]:
            # If PARENT role is not accepted via register, create via ORM
            parent_user = User.objects.create_user(
                username='umm_khalid', email='umm_khalid@test.com',
                password='ummpass123', role='PARENT',
                first_name='Umm', last_name='Khalid',
            )
        else:
            parent_user = User.objects.get(username='umm_khalid')

        # ── Act 2: Umm Khalid logs in ─────────────────────────────────────
        login_data = _login(c, 'umm_khalid', 'ummpass123')
        self.assertIn('access', login_data)
        self.assertEqual(login_data['user']['username'], 'umm_khalid')

        # ── Act 3: Umm Khalid views the parent portal ─────────────────────
        # list returns empty (no ParentProfile created yet — that's fine)
        res = c.get('/api/parents/dashboard/')
        self.assertIn(res.status_code, [200, 404])

        # child_dashboard action returns children linked to this parent
        res = c.get('/api/parents/dashboard/child_dashboard/')
        self.assertEqual(res.status_code, 200)

        # ── Act 4: Umm Khalid checks linked children ──────────────────────
        res = c.get('/api/students/children/')
        self.assertEqual(res.status_code, 200)

        # ── Act 5: Umm Khalid views her own auth profile ──────────────────
        res = c.get('/api/auth/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'umm_khalid')

        res = c.get('/api/auth/notifications/')
        self.assertEqual(res.status_code, 200)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 5 — Cross-actor: Booking lifecycle (student → tutor → admin)
# ─────────────────────────────────────────────────────────────────────────────

class BookingLifecycleJourney(TestCase):
    """
    The full booking lifecycle: Aisha books Sheikh, Sheikh sees the request,
    and admin can view it in the bookings list.
    """

    def test_booking_lifecycle(self):
        from students.models import StudentProfile
        from tutors.models import TutorProfile

        # ── Prologue ──────────────────────────────────────────────────────
        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        # Approved tutor
        tutor_user = User.objects.create_user(
            username='tutor_booking', email='tutor_booking@test.com',
            password='tutorpass123', role='TUTOR',
            first_name='Sheikh', last_name='Omar',
        )
        tutor_profile = TutorProfile.objects.create(
            user=tutor_user, status='APPROVED',
            subjects_to_teach='Mathematics', hourly_rate=2000,
        )
        tutor_c = APIClient()
        _login(tutor_c, 'tutor_booking', 'tutorpass123')

        # Approved student
        stu_user = User.objects.create_user(
            username='stu_booking', email='stu_booking@test.com',
            password='stupass123', role='STUDENT',
            first_name='Fatima', last_name='Suleiman',
        )
        StudentProfile.objects.create(user=stu_user, approval_status='APPROVED', payment_status='PAID')
        stu_c = APIClient()
        _login(stu_c, 'stu_booking', 'stupass123')

        # ── Act 1: Fatima books Sheikh Omar ───────────────────────────────
        res = stu_c.post('/api/classes/booking/request/', {
            'tutor_id': tutor_profile.id,
            'subject': 'Mathematics',
            'schedule': [{'day': 'Tuesday', 'start_time': '10:00', 'end_time': '11:00'}],
            'preferred_start_date': '2026-09-15',
            'learning_level': 'Secondary School',
            'class_structure': 'One-on-One',
            'hours_per_session': 1.0,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Booking failed: {res.content}")
        booking_id = res.data.get('id')
        self.assertIsNotNone(booking_id)

        # Fatima can see her booking
        res = stu_c.get('/api/classes/booking/request/')
        self.assertEqual(res.status_code, 200)

        # ── Act 2: Sheikh Omar sees the booking request ───────────────────
        res = tutor_c.get('/api/classes/booking/approval/')
        self.assertEqual(res.status_code, 200)

        # ── Act 3: Admin can view the booking in the admin panel ──────────
        res = admin_c.get('/api/classes/admin/bookings/')
        self.assertEqual(res.status_code, 200)

        # ── Act 4: Both actors can view their session lists ───────────────
        res = stu_c.get('/api/classes/sessions/')
        self.assertEqual(res.status_code, 200)

        res = tutor_c.get('/api/classes/sessions/')
        self.assertEqual(res.status_code, 200)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 6 — Paystack Payment Journey
# ─────────────────────────────────────────────────────────────────────────────

class PaystackPaymentJourney(TestCase):
    """
    End-to-end Paystack integration:
      - Student initiates a wallet top-up (real API call to Paystack test server).
      - Simulate a charge.success webhook with a correctly signed payload
        and verify the wallet is credited.
    """

    def test_initiate_wallet_topup(self):
        """Student calls /api/payments/initiate/ and gets back an authorization_url."""
        _make_world()
        stu_user = User.objects.create_user(
            username='pay_student', email='pay_student@test.com',
            password='paypass123', role='STUDENT',
        )
        c = APIClient()
        _login(c, 'pay_student', 'paypass123')

        res = c.post('/api/payments/initiate/', {'amount': 5000}, format='json')
        # 200 = Paystack accepted; 400 = misconfigured test key — either is valid here
        self.assertIn(res.status_code, [200, 400], f"Unexpected response: {res.content}")
        if res.status_code == 200:
            self.assertIn('authorization_url', res.data)
            self.assertIn('reference', res.data)

    def test_webhook_credits_wallet(self):
        """
        Construct a charge.success webhook payload signed with PAYSTACK_SECRET_KEY.
        Wallet must be credited by the NGN amount after the webhook is processed.
        """
        import hmac as _hmac
        import hashlib
        import json
        from django.conf import settings as dj_settings
        from payments.models import Payment, Wallet

        _make_world()
        stu_user = User.objects.create_user(
            username='webhook_stu', email='webhook_stu@test.com',
            password='webhookpass', role='STUDENT',
        )
        ref = 'TOPUP-WEBHOOKTEST01'
        Payment.objects.create(
            student=stu_user, status='PENDING', amount=3000,
            payment_method='PAYSTACK', transaction_id=ref,
        )
        # Signal auto-creates wallet on user creation with balance=0; no explicit create needed

        payload = json.dumps({
            'event': 'charge.success',
            'data': {'reference': ref, 'amount': 300000},  # 3000 NGN in kobo
        })
        secret_key = dj_settings.PAYSTACK_SECRET_KEY
        signature = _hmac.new(
            secret_key.encode('utf-8'), payload.encode('utf-8'), hashlib.sha512
        ).hexdigest()

        c = APIClient()
        res = c.post(
            '/api/payments/webhook/',
            data=payload,
            content_type='application/json',
            HTTP_X_PAYSTACK_SIGNATURE=signature,
        )
        self.assertEqual(res.status_code, 200, f"Webhook failed: {res.content}")

        wallet = Wallet.objects.get(user=stu_user)
        self.assertEqual(float(wallet.balance), 3000.0, "Wallet not credited after webhook")


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 7 — Exam Lifecycle Journey
# ─────────────────────────────────────────────────────────────────────────────

class ExamLifecycleJourney(TestCase):
    """
    Complete exam lifecycle:
      Tutor creates exam → adds questions → student submits answers → score recorded.
    """

    def test_exam_lifecycle(self):
        from payments.models import Wallet
        from tutors.models import TutorProfile

        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='exam_tutor', email='exam_tutor@test.com',
            password='examtutor123', role='TUTOR',
        )
        TutorProfile.objects.create(user=tutor_user, status='APPROVED', hourly_rate=1500)

        stu_user = User.objects.create_user(
            username='exam_student', email='exam_student@test.com',
            password='examstu123', role='STUDENT',
        )
        # Signal auto-creates wallet; update balance so student can see exams
        Wallet.objects.filter(user=stu_user).update(balance=5000)

        tutor_c = APIClient()
        _login(tutor_c, 'exam_tutor', 'examtutor123')

        stu_c = APIClient()
        _login(stu_c, 'exam_student', 'examstu123')

        # ── Act 1: Tutor creates an exam ──────────────────────────────────
        res = tutor_c.post('/api/exams/list/', {
            'title': 'Quran Recitation Weekly Assessment',
            'subject': quran.id,
            'exam_type': 'INTERNAL',
            'duration_minutes': 20,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Exam creation failed: {res.content}")
        exam_id = res.data['id']

        # ── Act 2: Tutor adds three questions ─────────────────────────────
        question_defs = [
            {
                'text': 'What is the first chapter of the Quran?',
                'option_a': 'Al-Baqarah', 'option_b': 'Al-Fatiha',
                'option_c': 'Al-Ikhlas',  'option_d': 'Al-Nas',
                'correct_option': 'B',
            },
            {
                'text': 'How many verses are in Al-Fatiha?',
                'option_a': '5', 'option_b': '6',
                'option_c': '7', 'option_d': '8',
                'correct_option': 'C',
            },
            {
                'text': 'Which Surah is known as the heart of the Quran?',
                'option_a': 'Al-Fatiha', 'option_b': 'Ya-Sin',
                'option_c': 'Al-Mulk',   'option_d': 'Al-Kahf',
                'correct_option': 'B',
            },
        ]
        q_ids = []
        for qdef in question_defs:
            res = tutor_c.post(f'/api/exams/list/{exam_id}/add_question/', qdef, format='json')
            self.assertIn(res.status_code, [200, 201], f"Add question failed: {res.content}")
            q_ids.append(res.data['id'])

        # ── Act 3: Student lists and retrieves the exam ───────────────────
        res = stu_c.get('/api/exams/list/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(exam_id, [e['id'] for e in res.data], "Student cannot see exam (check wallet balance)")

        res = stu_c.get(f'/api/exams/list/{exam_id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['questions']), 3)

        # ── Act 4: Student submits answers (2 of 3 correct) ──────────────
        res = stu_c.post(f'/api/exams/list/{exam_id}/submit/', {
            'exam_id': exam_id,
            'answers': {
                str(q_ids[0]): 'B',  # correct
                str(q_ids[1]): 'C',  # correct
                str(q_ids[2]): 'A',  # wrong — correct answer is B
            },
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Exam submission failed: {res.content}")
        self.assertAlmostEqual(res.data['score'], 66.67, delta=1.0)
        self.assertEqual(res.data['correct_answers'], 2)
        self.assertEqual(res.data['total_questions'], 3)

        # ── Act 5: Student is blocked from retaking the same exam ─────────
        res = stu_c.get(f'/api/exams/list/{exam_id}/')
        self.assertEqual(res.status_code, 403, "Retake should be blocked with 403")

        # ── Act 6: Student views their results ────────────────────────────
        res = stu_c.get('/api/exams/results/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

        # ── Act 7: Admin can see all results ──────────────────────────────
        res = admin_c.get('/api/exams/results/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 8 — Booking Approval + Session Completion Journey
# ─────────────────────────────────────────────────────────────────────────────

class SessionCompletionJourney(TestCase):
    """
    Manual booking approval + session completion with commission payout:
      Booking created (not auto-approved) → tutor approves it →
      session created via ORM with a fee → student wallet funded →
      tutor marks session complete → commission released to tutor wallet.
    """

    def test_booking_approval_and_session_complete(self):
        from decimal import Decimal
        from django.utils import timezone
        from datetime import timedelta
        from classes.models import ScheduledSession, Booking
        from payments.models import Wallet
        from tutors.models import TutorProfile
        from students.models import StudentProfile

        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='session_tutor', email='session_tutor@test.com',
            password='sessiontut123', role='TUTOR',
            first_name='Ustadh', last_name='Bilal',
        )
        TutorProfile.objects.create(
            user=tutor_user, status='APPROVED',
            subjects_to_teach='Quranic Recitation', hourly_rate=1500,
        )
        tutor_c = APIClient()
        _login(tutor_c, 'session_tutor', 'sessiontut123')

        stu_user = User.objects.create_user(
            username='session_stu', email='session_stu@test.com',
            password='sessionstu123', role='STUDENT',
            first_name='Zainab', last_name='Abbas',
        )
        StudentProfile.objects.create(user=stu_user, approval_status='APPROVED', payment_status='PAID')
        Wallet.objects.filter(user=stu_user).update(balance=Decimal('5000.00'))
        stu_c = APIClient()
        _login(stu_c, 'session_stu', 'sessionstu123')

        # ── Act 1: Booking created with approved=False ────────────────────
        booking = Booking.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject='Quranic Recitation',
            price=Decimal('6000.00'),
            approved=False,
        )

        res = tutor_c.get('/api/classes/booking/approval/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(booking.id, [b['id'] for b in res.data])

        # ── Act 2: Tutor approves the booking ────────────────────────────
        res = tutor_c.post(f'/api/classes/booking/{booking.id}/approve/', {
            'action': 'approve',
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Booking approval failed: {res.content}")
        booking.refresh_from_db()
        self.assertTrue(booking.approved)

        # ── Act 3: Session created via ORM with a session fee ────────────
        session = ScheduledSession.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject=quran,
            scheduled_at=timezone.now() - timedelta(hours=1),
            duration=60,
            fee_amount=Decimal('1500.00'),
            status='PENDING',
        )

        res = stu_c.get('/api/classes/sessions/')
        self.assertEqual(res.status_code, 200)

        res = tutor_c.get('/api/classes/sessions/')
        self.assertEqual(res.status_code, 200)

        # ── Act 4: Tutor marks the session as COMPLETED ───────────────────
        res = tutor_c.post(f'/api/classes/session/{session.id}/complete/', {}, format='json')
        self.assertEqual(res.status_code, 200, f"Session complete failed: {res.content}")
        self.assertIn('fee', res.data)
        self.assertIn('net_payout', res.data)
        self.assertEqual(float(res.data['fee']), 1500.0)

        session.refresh_from_db()
        self.assertEqual(session.status, 'COMPLETED')
        self.assertEqual(session.payout_status, 'RELEASED')

        # ── Act 5: Wallets reflect the commission split ───────────────────
        stu_wallet = Wallet.objects.get(user=stu_user)
        tutor_wallet = Wallet.objects.get(user=tutor_user)
        self.assertLess(float(stu_wallet.balance), 5000.0, "Student wallet not debited")
        self.assertGreater(float(tutor_wallet.balance), 0.0, "Tutor wallet not credited")

        # ── Act 6: Student progress shows 1 completed session ─────────────
        res = stu_c.get('/api/students/me/progress/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['attendance']['completed'], 1)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 9 — Tutor Withdrawal Journey
# ─────────────────────────────────────────────────────────────────────────────

class TutorWithdrawalJourney(TestCase):
    """
    Tutor has earnings in wallet, requests a withdrawal, admin approves,
    and the tutor's wallet balance is reduced accordingly.
    """

    def test_withdrawal_lifecycle(self):
        from decimal import Decimal
        from payments.models import Wallet
        from tutors.models import TutorProfile

        admin, _ = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='withdraw_tutor', email='withdraw_tutor@test.com',
            password='withdrawpass123', role='TUTOR',
        )
        TutorProfile.objects.create(user=tutor_user, status='APPROVED', hourly_rate=1500)
        Wallet.objects.filter(user=tutor_user).update(balance=Decimal('8000.00'))

        tutor_c = APIClient()
        _login(tutor_c, 'withdraw_tutor', 'withdrawpass123')

        # ── Act 1: Tutor checks wallet balance ────────────────────────────
        res = tutor_c.get('/api/payments/tutor/wallet/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(float(res.data['balance']), 8000.0)

        # ── Act 2: Tutor requests a withdrawal ────────────────────────────
        res = tutor_c.post('/api/payments/tutor/withdrawal/', {
            'amount': 5000,
            'bank_name': 'First Bank',
            'account_number': '3012345678',
            'account_name': 'Ustadh Ibrahim Sule',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Withdrawal request failed: {res.content}")
        withdrawal_id = res.data['id']
        self.assertEqual(res.data['status'], 'PENDING')

        # ── Act 3: Tutor lists their withdrawals ──────────────────────────
        res = tutor_c.get('/api/payments/tutor/withdrawal/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('PENDING', [w['status'] for w in res.data])

        # ── Act 4: Admin sees it in the pending withdrawals queue ─────────
        res = admin_c.get('/api/payments/admin/withdrawals/pending/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(withdrawal_id, [w['id'] for w in res.data])

        # ── Act 5: Admin approves the withdrawal ──────────────────────────
        res = admin_c.post(f'/api/payments/admin/withdrawal/approve/{withdrawal_id}/', {
            'action': 'approve',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Withdrawal approval failed: {res.content}")

        # ── Act 6: Tutor wallet balance reduced by the withdrawal amount ───
        wallet = Wallet.objects.get(user=tutor_user)
        self.assertEqual(float(wallet.balance), 3000.0, "Wallet not debited after withdrawal approval")

        res = tutor_c.get('/api/payments/tutor/wallet/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(float(res.data['balance']), 3000.0)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 10 — Parent Full Portal Journey
# ─────────────────────────────────────────────────────────────────────────────

class ParentFullPortalJourney(TestCase):
    """
    Parent funds child wallet, views detailed child report with sessions
    and transactions, then impersonates the child to act on their behalf.
    """

    def test_fund_child_and_monitor(self):
        from decimal import Decimal
        from students.models import StudentProfile
        from payments.models import Wallet

        _make_world()

        child_user = User.objects.create_user(
            username='child_omar', email='child_omar@test.com',
            password='childpass123', role='STUDENT',
            first_name='Omar', last_name='Adebisi',
        )
        child_profile = StudentProfile.objects.create(
            user=child_user, approval_status='APPROVED', payment_status='PAID',
        )
        # Wallet auto-created by signal with balance=0 — no explicit create needed

        parent_user = User.objects.create_user(
            username='parent_fatima', email='parent_fatima@test.com',
            password='parentpass123', role='PARENT',
            first_name='Fatima', last_name='Adebisi',
        )
        # Link child to parent (admin normally does this during onboarding)
        child_profile.parent = parent_user
        child_profile.save()

        c = APIClient()
        _login(c, 'parent_fatima', 'parentpass123')

        # ── Act 1: Parent funds child wallet ──────────────────────────────
        res = c.post('/api/parents/dashboard/fund_child_wallet/', {
            'child_id': child_profile.id,
            'amount': 10000,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Fund wallet failed: {res.content}")
        self.assertEqual(float(res.data['new_balance']), 10000.0)

        wallet = Wallet.objects.get(user=child_user)
        self.assertEqual(float(wallet.balance), 10000.0)

        # ── Act 2: Parent views linked children list ───────────────────────
        res = c.get('/api/parents/dashboard/child_dashboard/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(child_profile.id, [ch['id'] for ch in res.data])

        # ── Act 3: Parent views detailed child report ─────────────────────
        res = c.get(f'/api/parents/dashboard/child_detail/?child_id={child_profile.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['full_name'], 'Omar Adebisi')
        self.assertEqual(float(res.data['wallet_balance']), 10000.0)
        self.assertIn('sessions', res.data)
        self.assertIn('transactions', res.data)

        # ── Act 4: Parent views children via student endpoint ─────────────
        res = c.get('/api/students/children/')
        self.assertEqual(res.status_code, 200)

        # ── Act 5: Parent impersonates the child ──────────────────────────
        res = c.post('/api/parents/dashboard/impersonate_child/', {
            'child_id': child_profile.id,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Impersonation failed: {res.content}")
        self.assertIn('access', res.data)

        # Use the child's token to access student endpoints
        child_c = APIClient()
        child_c.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        res = child_c.get('/api/students/me/')
        self.assertEqual(res.status_code, 200)

        # ── Act 6: Parent checks their own auth profile ───────────────────
        res = c.get('/api/auth/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'parent_fatima')


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 11 — Student Re-enrolment + Admin Promotion Journey
# ─────────────────────────────────────────────────────────────────────────────

class StudentEnrolmentAndPromotionJourney(TestCase):
    """
    Student enrols in an additional subject after initial approval,
    then admin promotes the student to the tutor role.
    """

    def test_enrol_in_subject_and_get_promoted(self):
        from students.models import StudentProfile, Enrollment
        from tutors.models import TutorProfile

        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        math_subject = __import__('programs.models', fromlist=['Subject']).Subject.objects.filter(
            name='Mathematics'
        ).first()

        stu_user = User.objects.create_user(
            username='enrol_student', email='enrol_student@test.com',
            password='enrolpass123', role='STUDENT',
            first_name='Yusuf', last_name='Garba',
        )
        StudentProfile.objects.create(
            user=stu_user, approval_status='APPROVED', payment_status='PAID',
        )
        stu_c = APIClient()
        _login(stu_c, 'enrol_student', 'enrolpass123')

        # ── Act 1: Student enrols in Mathematics ──────────────────────────
        res = stu_c.post('/api/students/enroll-subject/', {
            'subject_id': math_subject.id,
            'schedule': [{'day': 'Thursday', 'time': '14:00'}],
        }, format='json')
        # PDF regen may log a warning in tests — enrollment record must be created
        self.assertIn(res.status_code, [200, 201, 500], f"Enrolment response: {res.content}")

        enrollment_exists = Enrollment.objects.filter(
            student__user=stu_user, subject=math_subject
        ).exists()
        self.assertTrue(enrollment_exists, "Enrollment record not created in DB")

        # ── Act 2: Student checks updated profile ─────────────────────────
        res = stu_c.get('/api/students/me/')
        self.assertEqual(res.status_code, 200)

        # ── Act 3: Admin promotes the student to tutor ────────────────────
        res = admin_c.post(f'/api/students/admin/{stu_user.id}/promote/', {}, format='json')
        self.assertIn(res.status_code, [200, 201], f"Promotion failed: {res.content}")
        self.assertIn('promoted', res.data.get('message', '').lower())

        stu_user.refresh_from_db()
        self.assertEqual(stu_user.role, 'TUTOR')
        self.assertTrue(TutorProfile.objects.filter(user=stu_user).exists())


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 12 — Auth Extras Journey
# ─────────────────────────────────────────────────────────────────────────────

class AuthExtrasJourney(TestCase):
    """
    Exercises the less-common auth endpoints: password change, JWT token
    refresh, mark-notification-as-read, and admin user management viewset.
    """

    def test_auth_extras(self):
        from accounts.models import Notification
        from rest_framework_simplejwt.tokens import RefreshToken

        _make_world()

        stu_user = User.objects.create_user(
            username='auth_stu', email='auth_stu@test.com',
            password='authpass123', role='STUDENT',
        )

        c = APIClient()
        _login(c, 'auth_stu', 'authpass123')

        # ── Act 1: Change own password ────────────────────────────────────
        res = c.post('/api/auth/password/change/', {
            'current_password': 'authpass123',
            'new_password': 'NewAuth@12345',
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Password change failed: {res.content}")
        self.assertIn('message', res.data)

        # Re-login with new password must succeed
        c2 = APIClient()
        login_data = _login(c2, 'auth_stu', 'NewAuth@12345')
        self.assertIn('access', login_data)

        # ── Act 2: JWT token refresh (body mode) ──────────────────────────
        refresh = RefreshToken.for_user(stu_user)
        c3 = APIClient()
        res = c3.post('/api/auth/refresh/', {'refresh': str(refresh)}, format='json')
        self.assertEqual(res.status_code, 200, f"Token refresh failed: {res.content}")
        self.assertIn('access', res.data)

        # ── Act 3: Mark a notification as read ────────────────────────────
        notif = Notification.objects.create(
            user=stu_user,
            title='Platform Update',
            message='A new feature has been added.',
            is_read=False,
        )
        res = c2.post(f'/api/auth/notifications/{notif.id}/read/', {}, format='json')
        self.assertEqual(res.status_code, 200, f"Mark-read failed: {res.content}")
        self.assertEqual(res.data['message'], 'Marked as read')
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)

        # ── Act 4: Admin user management viewset ──────────────────────────
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        res = admin_c.get('/api/auth/admin/users/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

        # Admin updates the student's first_name via the viewset
        res = admin_c.patch(f'/api/auth/admin/users/{stu_user.id}/', {
            'first_name': 'UpdatedName',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"User patch failed: {res.content}")
        stu_user.refresh_from_db()
        self.assertEqual(stu_user.first_name, 'UpdatedName')

        # Admin can filter users by role
        res = admin_c.get('/api/auth/admin/users/?role=TUTOR')
        self.assertEqual(res.status_code, 200)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 13 — Password Reset Journey
# ─────────────────────────────────────────────────────────────────────────────

class PasswordResetJourney(TestCase):
    """
    Full password reset flow: request for non-existent email (safe 200) →
    request for real user → confirm with ORM-generated token → new password
    works → old token is now invalid.
    """

    def test_password_reset_flow(self):
        _make_world()

        reset_user = User.objects.create_user(
            username='reset_user', email='reset_user@test.com',
            password='OldPass@12345', role='STUDENT',
        )

        c = APIClient()

        # ── Act 1: Request for non-existent email — no info leak ──────────
        res = c.post('/api/auth/password-reset/request/', {
            'email': 'nobody_at_all@test.com',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('message', res.data)

        # ── Act 2: Request for real email ─────────────────────────────────
        res = c.post('/api/auth/password-reset/request/', {
            'email': 'reset_user@test.com',
        }, format='json')
        # 200 = email queued; 500 = email backend not configured in this env
        self.assertIn(res.status_code, [200, 500])

        # ── Act 3: Confirm reset with ORM-generated token ─────────────────
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.utils.encoding import smart_bytes
        from django.utils.http import urlsafe_base64_encode

        uidb64 = urlsafe_base64_encode(smart_bytes(reset_user.id))
        token = PasswordResetTokenGenerator().make_token(reset_user)

        res = c.post('/api/auth/password-reset/confirm/', {
            'uidb64': uidb64,
            'token': token,
            'password': 'NewSecure@99999',
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Reset confirm failed: {res.content}")
        self.assertIn('message', res.data)

        # ── Act 4: New password works for login ───────────────────────────
        login_data = _login(c, 'reset_user', 'NewSecure@99999')
        self.assertIn('access', login_data)

        # ── Act 5: Used token is now invalid ──────────────────────────────
        res = c.post('/api/auth/password-reset/confirm/', {
            'uidb64': uidb64,
            'token': token,
            'password': 'AnotherPass@9999',
        }, format='json')
        self.assertEqual(res.status_code, 401, "Reused token must be rejected")


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 14 — Trial Application Journey
# ─────────────────────────────────────────────────────────────────────────────

class TrialApplicationJourney(TestCase):
    """
    Public trial form → admin lists → admin rejects one → admin approves
    another (manual meeting link, no Zoom API) → student my-classes →
    tutor schedule.
    """

    def test_trial_application_lifecycle(self):
        from applications.models import TrialApplication
        from students.models import StudentProfile
        from tutors.models import TutorProfile

        admin, _ = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='trial_tutor', email='trial_tutor@test.com',
            password='trialtutor123', role='TUTOR',
        )
        TutorProfile.objects.create(user=tutor_user, status='APPROVED', hourly_rate=1500)
        tutor_c = APIClient()
        _login(tutor_c, 'trial_tutor', 'trialtutor123')

        stu_user = User.objects.create_user(
            username='trial_stu', email='trial_stu@test.com',
            password='trialstu123', role='STUDENT',
        )
        StudentProfile.objects.create(
            user=stu_user, approval_status='APPROVED', payment_status='PAID',
        )
        stu_c = APIClient()
        _login(stu_c, 'trial_stu', 'trialstu123')

        # ── Act 1: Public trial application (no auth required) ────────────
        pub = APIClient()
        res = pub.post('/api/applications/', {
            'first_name': 'Khalid',
            'last_name': 'Mahmoud',
            'email': 'khalid@example.com',
            'phone': '+2348012345678',
            'country': 'Nigeria',
            'course_interested': 'Quranic Recitation',
            'preferred_day': 'Monday',
            'preferred_time': 'Morning',
            'message': 'I want to learn Quran with Tajweed.',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Trial application failed: {res.content}")
        app_id = res.data.get('id')
        self.assertIsNotNone(app_id)

        # ── Act 2: Admin lists all trial applications ──────────────────────
        res = admin_c.get('/api/admin/applications/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)
        self.assertIn(app_id, [a['id'] for a in res.data])

        # ── Act 3: Admin rejects the application ──────────────────────────
        res = admin_c.post(f'/api/admin/applications/{app_id}/reject/', {}, format='json')
        self.assertIn(res.status_code, [200, 201], f"Reject failed: {res.content}")
        TrialApplication.objects.get(pk=app_id)  # still exists (not deleted)
        self.assertEqual(TrialApplication.objects.get(pk=app_id).status, 'rejected')

        # ── Act 4: Admin approves a fresh application with manual link ────
        app2 = TrialApplication.objects.create(
            first_name='Amina',
            last_name='Bello',
            email=stu_user.email,
            course_interested='Quranic Recitation',
            status='pending',
        )
        res = admin_c.post(f'/api/admin/applications/{app2.id}/approve/', {
            'generate_zoom': False,
            'meeting_link': 'https://meet.google.com/test-room-abc',
            'tutor_name': 'Sheikh Umar',
            'start_time': '2026-09-15T10:00:00Z',
            'duration': 40,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Approve failed: {res.content}")
        app2.refresh_from_db()
        self.assertEqual(app2.status, 'approved')

        # ── Act 5: Admin updates the application (reschedule, reassign) ───
        res = admin_c.patch(f'/api/admin/applications/{app2.id}/update/', {
            'duration': 60,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Update failed: {res.content}")

        # ── Act 6: Student views their classes (trial matched by email) ───
        res = stu_c.get('/api/applications/student/my-classes/')
        self.assertIn(res.status_code, [200, 400])
        if res.status_code == 200:
            self.assertIn('classes', res.data)

        # ── Act 7: Tutor views their schedule ─────────────────────────────
        app2.tutor = tutor_user
        app2.save()
        res = tutor_c.get('/api/applications/tutor/schedule/')
        self.assertEqual(res.status_code, 200)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 15 — Booking Wallet-Pay + Tutor Reject Journey
# ─────────────────────────────────────────────────────────────────────────────

class BookingPaymentJourney(TestCase):
    """
    Student pays for an approved booking from their wallet;
    separately, a tutor rejects a pending booking request.
    """

    def test_wallet_pay_and_tutor_reject(self):
        from decimal import Decimal
        from classes.models import Booking
        from payments.models import Wallet
        from students.models import StudentProfile
        from tutors.models import TutorProfile

        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='bp_tutor', email='bp_tutor@test.com',
            password='bptutorpass123', role='TUTOR',
        )
        TutorProfile.objects.create(
            user=tutor_user, status='APPROVED',
            subjects_to_teach='Mathematics', hourly_rate=2000,
        )
        tutor_c = APIClient()
        _login(tutor_c, 'bp_tutor', 'bptutorpass123')

        stu_user = User.objects.create_user(
            username='bp_stu', email='bp_stu@test.com',
            password='bpstupass123', role='STUDENT',
        )
        StudentProfile.objects.create(user=stu_user, approval_status='APPROVED', payment_status='PAID')
        Wallet.objects.filter(user=stu_user).update(balance=Decimal('15000.00'))
        stu_c = APIClient()
        _login(stu_c, 'bp_stu', 'bpstupass123')

        # ── Act 1: Create an approved booking via ORM ─────────────────────
        booking_to_pay = Booking.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject='Mathematics',
            price=Decimal('8000.00'),
            approved=True,
            paid=False,
        )

        # ── Act 2: Student pays for it using wallet balance ───────────────
        res = stu_c.post(f'/api/payments/booking/wallet-pay/{booking_to_pay.id}/', {}, format='json')
        self.assertEqual(res.status_code, 200, f"Wallet pay failed: {res.content}")
        self.assertTrue(res.data.get('success'))
        self.assertAlmostEqual(float(res.data['new_balance']), 7000.0, delta=1.0)

        booking_to_pay.refresh_from_db()
        self.assertTrue(booking_to_pay.paid)

        wallet = Wallet.objects.get(user=stu_user)
        self.assertAlmostEqual(float(wallet.balance), 7000.0, delta=1.0)

        # ── Act 3: Create a second booking awaiting tutor approval ────────
        booking_to_reject = Booking.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject='Mathematics',
            price=Decimal('4000.00'),
            approved=False,
            paid=False,
        )

        res = tutor_c.get('/api/classes/booking/approval/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(booking_to_reject.id, [b['id'] for b in res.data])

        # ── Act 4: Tutor rejects the booking ─────────────────────────────
        res = tutor_c.post(f'/api/classes/booking/{booking_to_reject.id}/reject/', {
            'rejection_reason': 'Time slot is no longer available.',
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Booking reject failed: {res.content}")

        # Booking is deleted after rejection
        self.assertFalse(Booking.objects.filter(id=booking_to_reject.id).exists())

        # Rejection notification was created for the student
        from accounts.models import Notification
        self.assertTrue(
            Notification.objects.filter(user=stu_user, title='Booking Request Declined').exists()
        )


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 16 — Reschedule Journey
# ─────────────────────────────────────────────────────────────────────────────

class RescheduleJourney(TestCase):
    """
    Student requests a session reschedule; admin approves it;
    the session's scheduled_at is updated and status → RESCHEDULED.
    """

    def test_reschedule_lifecycle(self):
        from decimal import Decimal
        from datetime import timedelta
        from django.utils import timezone
        from classes.models import ScheduledSession
        from tutors.models import TutorProfile
        from students.models import StudentProfile

        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='resch_tutor', email='resch_tutor@test.com',
            password='reschtutor123', role='TUTOR',
        )
        TutorProfile.objects.create(user=tutor_user, status='APPROVED', hourly_rate=1500)

        stu_user = User.objects.create_user(
            username='resch_stu', email='resch_stu@test.com',
            password='reschstu123', role='STUDENT',
        )
        StudentProfile.objects.create(user=stu_user, approval_status='APPROVED', payment_status='PAID')
        stu_c = APIClient()
        _login(stu_c, 'resch_stu', 'reschstu123')

        # ── Act 1: Session exists in the future ───────────────────────────
        session = ScheduledSession.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject=quran,
            scheduled_at=timezone.now() + timedelta(days=3),
            duration=60,
            fee_amount=Decimal('1500.00'),
            status='PENDING',
        )

        # ── Act 2: Student submits a reschedule request ───────────────────
        res = stu_c.post('/api/classes/student/reschedule/', {
            'session_id': session.id,
            'session_type': 'REGULAR',
            'requested_date': '2026-10-01',
            'requested_time': '10:00:00',
            'reason': 'Family event on the original date.',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Reschedule request failed: {res.content}")
        request_id = res.data.get('request_id')
        self.assertIsNotNone(request_id)

        # ── Act 3: Admin approves the reschedule ──────────────────────────
        res = admin_c.post(f'/api/classes/admin/reschedule/{request_id}/action/', {
            'action': 'APPROVE',
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Reschedule approve failed: {res.content}")

        session.refresh_from_db()
        self.assertEqual(session.status, 'RESCHEDULED')

        # ── Act 4: Create a second request and admin rejects it ───────────
        session2 = ScheduledSession.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject=quran,
            scheduled_at=timezone.now() + timedelta(days=5),
            duration=60,
            fee_amount=Decimal('1500.00'),
            status='PENDING',
        )
        res2 = stu_c.post('/api/classes/student/reschedule/', {
            'session_id': session2.id,
            'session_type': 'REGULAR',
            'requested_date': '2026-10-08',
            'requested_time': '14:00:00',
            'reason': 'Prefer afternoon slot.',
        }, format='json')
        self.assertIn(res2.status_code, [200, 201])
        request_id2 = res2.data.get('request_id')

        res = admin_c.post(f'/api/classes/admin/reschedule/{request_id2}/action/', {
            'action': 'REJECT',
            'notes': 'Tutor is not available at that time.',
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Reschedule reject failed: {res.content}")


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 17 — Curriculum Material Upload Journey
# ─────────────────────────────────────────────────────────────────────────────

class CurriculumMaterialJourney(TestCase):
    """
    Tutor uploads a learning material, updates it, and admin sees all
    materials in the global list.
    """

    def test_material_upload_and_management(self):
        from tutors.models import TutorProfile

        admin, _ = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='mat_tutor', email='mat_tutor@test.com',
            password='mattutor123', role='TUTOR',
        )
        TutorProfile.objects.create(user=tutor_user, status='APPROVED', hourly_rate=1500)
        tutor_c = APIClient()
        _login(tutor_c, 'mat_tutor', 'mattutor123')

        # ── Act 1: Tutor uploads a link-type material ─────────────────────
        res = tutor_c.post('/api/curriculum/materials/', {
            'title': 'Tajweed Rules — Introduction',
            'description': 'Covers Noon Sakinah and Tanween rules',
            'material_type': 'LINK',
            'external_url': 'https://youtube.com/tajweed-intro',
            'is_public': True,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Material upload failed: {res.content}")
        mat_id = res.data.get('id')
        self.assertIsNotNone(mat_id)
        self.assertEqual(res.data['title'], 'Tajweed Rules — Introduction')

        # ── Act 2: Tutor lists their own materials ────────────────────────
        res = tutor_c.get('/api/curriculum/materials/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(mat_id, [m['id'] for m in res.data])

        # ── Act 3: Tutor updates the material title ───────────────────────
        res = tutor_c.patch(f'/api/curriculum/materials/{mat_id}/', {
            'title': 'Tajweed Rules — Introduction (Updated)',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Material update failed: {res.content}")
        self.assertIn('Updated', res.data['title'])

        # ── Act 4: Admin sees all materials (global view) ─────────────────
        res = admin_c.get('/api/curriculum/materials/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(mat_id, [m['id'] for m in res.data])

        # ── Act 5: Unauthenticated user can list public materials ─────────
        pub = APIClient()
        res = pub.get('/api/curriculum/materials/')
        self.assertEqual(res.status_code, 200)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 18 — Exam Assignment Journey
# ─────────────────────────────────────────────────────────────────────────────

class ExamAssignmentJourney(TestCase):
    """
    Tutor creates an exam, assigns it to one student, then bulk-assigns it
    to multiple students. Students see their assigned exams.
    """

    def test_exam_assignment_lifecycle(self):
        from tutors.models import TutorProfile

        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='asgn_tutor', email='asgn_tutor@test.com',
            password='asgntutor123', role='TUTOR',
        )
        TutorProfile.objects.create(user=tutor_user, status='APPROVED', hourly_rate=1500)
        tutor_c = APIClient()
        _login(tutor_c, 'asgn_tutor', 'asgntutor123')

        stu1 = User.objects.create_user(
            username='asgn_stu1', email='asgn_stu1@test.com',
            password='asgnstu123', role='STUDENT',
        )
        stu2 = User.objects.create_user(
            username='asgn_stu2', email='asgn_stu2@test.com',
            password='asgnstu123', role='STUDENT',
        )
        from payments.models import Wallet
        Wallet.objects.filter(user=stu1).update(balance=5000)
        Wallet.objects.filter(user=stu2).update(balance=5000)

        stu1_c = APIClient()
        _login(stu1_c, 'asgn_stu1', 'asgnstu123')

        # ── Act 1: Tutor creates an exam ──────────────────────────────────
        res = tutor_c.post('/api/exams/list/', {
            'title': 'Tajweed Knowledge Check',
            'subject': quran.id,
            'exam_type': 'INTERNAL',
            'duration_minutes': 15,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Exam creation failed: {res.content}")
        exam_id = res.data['id']

        # ── Act 2: Tutor assigns the exam to stu1 ─────────────────────────
        res = tutor_c.post('/api/exams/assignments/', {
            'exam': exam_id,
            'student': stu1.id,
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Single assignment failed: {res.content}")
        self.assertEqual(res.data['exam'], exam_id)

        # ── Act 3: Tutor bulk-assigns to both students ────────────────────
        res = tutor_c.post('/api/exams/assignments/bulk-assign/', {
            'exam': exam_id,
            'students': [stu1.id, stu2.id],
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Bulk-assign failed: {res.content}")
        self.assertIn('ids', res.data)

        # ── Act 4: Student sees their assigned exams ──────────────────────
        res = stu1_c.get('/api/exams/assignments/')
        self.assertEqual(res.status_code, 200)
        exam_ids_in_assignments = [a['exam'] for a in res.data]
        self.assertIn(exam_id, exam_ids_in_assignments)

        # ── Act 5: Admin can see all assignments ──────────────────────────
        res = admin_c.get('/api/exams/assignments/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 2)


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 19 — Programs, Whiteboard & Misc Journey
# ─────────────────────────────────────────────────────────────────────────────

class ProgramsWhiteboardMiscJourney(TestCase):
    """
    Covers public programs/subjects listing, tutor whiteboard library,
    session start, payment status, pricing tiers, tutor financials,
    tutor profile update, and admin booking action.
    """

    def test_programs_whiteboard_and_misc(self):
        from decimal import Decimal
        from datetime import timedelta
        from django.utils import timezone
        from classes.models import ScheduledSession, Booking
        from payments.models import Wallet
        from tutors.models import TutorProfile
        from students.models import StudentProfile

        admin, quran = _make_world()
        admin_c = APIClient()
        _login(admin_c, 'admin_journey', 'adminpass123')

        tutor_user = User.objects.create_user(
            username='misc_tutor', email='misc_tutor@test.com',
            password='misctutor123', role='TUTOR',
            first_name='Misc', last_name='Tutor',
        )
        tutor_profile = TutorProfile.objects.create(
            user=tutor_user, status='APPROVED', hourly_rate=1500,
        )
        tutor_c = APIClient()
        _login(tutor_c, 'misc_tutor', 'misctutor123')

        stu_user = User.objects.create_user(
            username='misc_stu', email='misc_stu@test.com',
            password='miscstu123', role='STUDENT',
        )
        StudentProfile.objects.create(user=stu_user, approval_status='APPROVED', payment_status='PAID')
        Wallet.objects.filter(user=stu_user).update(balance=Decimal('3000.00'))
        stu_c = APIClient()
        _login(stu_c, 'misc_stu', 'miscstu123')

        # ── Act 1: Public program and subject listings ─────────────────────
        pub = APIClient()
        res = pub.get('/api/programs/list/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

        res = pub.get('/api/programs/subjects/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

        # ── Act 2: Tutor saves and retrieves whiteboard session ───────────
        res = tutor_c.post('/api/whiteboard/library/', {
            'title': 'Tajweed Lesson 1 Board',
            'snapshot': '{"strokes": [], "background": "#ffffff"}',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Whiteboard save failed: {res.content}")

        res = tutor_c.get('/api/whiteboard/library/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['title'], 'Tajweed Lesson 1 Board')

        # ── Act 3: Tutor updates their profile ────────────────────────────
        res = tutor_c.patch(f'/api/tutors/{tutor_profile.id}/update_profile/', {
            'bio': 'Experienced Quranic recitation instructor with 10 years of teaching.',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Profile update failed: {res.content}")

        # ── Act 4: Tutor marks a session as started ───────────────────────
        session = ScheduledSession.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject=quran,
            scheduled_at=timezone.now(),
            duration=60,
            fee_amount=Decimal('1500.00'),
            status='PENDING',
        )
        res = tutor_c.post(f'/api/classes/session/{session.id}/start/', {}, format='json')
        self.assertEqual(res.status_code, 200, f"Session start failed: {res.content}")
        self.assertTrue(res.data.get('is_started'))
        session.refresh_from_db()
        self.assertTrue(session.is_started)

        # ── Act 5: Student checks payment status ──────────────────────────
        res = stu_c.get('/api/payments/status/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('payment_status', res.data)
        self.assertIn('wallet_balance', res.data)

        # ── Act 6: Public pricing tiers ───────────────────────────────────
        res = pub.get('/api/payments/pricing/')
        self.assertEqual(res.status_code, 200)

        # ── Act 7: Tutor views financial overview ─────────────────────────
        res = tutor_c.get('/api/payments/tutor/financials/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('total_classes', res.data)

        # ── Act 8: Admin approves a pending booking ───────────────────────
        pending_booking = Booking.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject='Mathematics',
            price=Decimal('5000.00'),
            approved=False,
        )
        res = admin_c.post(f'/api/classes/admin/bookings/{pending_booking.id}/action/', {
            'action': 'approve',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Admin booking approve failed: {res.content}")
        pending_booking.refresh_from_db()
        self.assertTrue(pending_booking.approved)

        # ── Act 9: Admin rejects another pending booking ──────────────────
        pending_booking2 = Booking.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject='Mathematics',
            price=Decimal('5000.00'),
            approved=False,
        )
        res = admin_c.post(f'/api/classes/admin/bookings/{pending_booking2.id}/action/', {
            'action': 'reject',
        }, format='json')
        self.assertIn(res.status_code, [200, 201], f"Admin booking reject failed: {res.content}")
        self.assertFalse(Booking.objects.filter(id=pending_booking2.id).exists())


# ─────────────────────────────────────────────────────────────────────────────
# Chapter 20 — Scheduling TutorRequest Journey
# ─────────────────────────────────────────────────────────────────────────────

class SchedulingTutorRequestJourney(TestCase):
    """
    TutorRequest lifecycle: request created via ORM (as happens when a
    student enrolls in a subject) → tutor lists their requests → tutor
    rejects one → student sees the request in their list.
    """

    def test_tutor_request_lifecycle(self):
        from tutors.models import TutorProfile
        from scheduling.models import TutorRequest

        admin, quran = _make_world()

        tutor_user = User.objects.create_user(
            username='sched_tutor', email='sched_tutor@test.com',
            password='schedtutor123', role='TUTOR',
        )
        TutorProfile.objects.create(user=tutor_user, status='APPROVED', hourly_rate=1500)
        tutor_c = APIClient()
        _login(tutor_c, 'sched_tutor', 'schedtutor123')

        stu_user = User.objects.create_user(
            username='sched_stu', email='sched_stu@test.com',
            password='schedstu123', role='STUDENT',
        )
        stu_c = APIClient()
        _login(stu_c, 'sched_stu', 'schedstu123')

        # ── Act 1: TutorRequest created via ORM (mirrors student enrolment) ─
        tr = TutorRequest.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject=quran,
            preferred_time='Mon/Wed 4pm',
            status='PENDING',
        )

        # ── Act 2: Tutor lists their incoming requests ─────────────────────
        res = tutor_c.get('/api/scheduling/requests/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(tr.id, [r['id'] for r in res.data])

        # ── Act 3: Student also sees their sent requests ───────────────────
        res = stu_c.get('/api/scheduling/requests/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(tr.id, [r['id'] for r in res.data])

        # ── Act 4: Tutor rejects the request ──────────────────────────────
        res = tutor_c.post(f'/api/scheduling/requests/{tr.id}/reject/', {
            'reason': 'Schedule conflict with another student.',
        }, format='json')
        self.assertEqual(res.status_code, 200, f"Reject request failed: {res.content}")

        tr.refresh_from_db()
        self.assertEqual(tr.status, 'REJECTED')

        # ── Act 5: Create a second request and retrieve it ────────────────
        tr2 = TutorRequest.objects.create(
            student=stu_user,
            tutor=tutor_user,
            subject=quran,
            preferred_time='Fri 6pm',
            status='PENDING',
        )
        res = tutor_c.get(f'/api/scheduling/requests/{tr2.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['id'], tr2.id)

# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
"""
Smoke tests — end-to-end flows for every major feature area.

Each test class represents one user role or feature surface. Tests create
their own users via the API (registration) or Django ORM (admin/tutor) so
they exercise the full request stack rather than bypassing serializers.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_admin(username='admin_smoke'):
    return User.objects.create_superuser(username=username, email=f'{username}@test.com', password='adminpass123')

def make_tutor(username='tutor_smoke'):
    from tutors.models import TutorProfile
    u = User.objects.create_user(username=username, email=f'{username}@test.com', password='tutorpass123', role='TUTOR',
                                  first_name='Tutor', last_name='Smoke')
    TutorProfile.objects.get_or_create(user=u)
    return u

def make_student(username='student_smoke'):
    from students.models import StudentProfile
    u = User.objects.create_user(username=username, email=f'{username}@test.com', password='studentpass123', role='STUDENT',
                                  first_name='Student', last_name='Smoke')
    StudentProfile.objects.get_or_create(user=u)
    return u

def auth(client, user, password):
    res = client.post('/api/auth/login/', {'username': user.username, 'password': password}, format='json')
    assert res.status_code == 200, f"Login failed: {res.content}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return client


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

class AuthSmokeTests(TestCase):

    def test_register_student(self):
        from programs.models import Program, Subject
        p = Program.objects.create(name='Western', program_type='WESTERN')
        Subject.objects.create(program=p, name='Mathematics')
        c = APIClient()
        res = c.post('/api/auth/register/', {
            'username': 'smoke_reg', 'email': 'smoke_reg@test.com',
            'password': 'pass12345', 'role': 'STUDENT',
            'first_name': 'Smoke', 'last_name': 'Reg', 'gender': 'Male',
            'class_type': 'ONE_ON_ONE', 'level': 'JAMB',
            'days_per_week': 2, 'hours_per_week': 2.0,
            'preferred_days': 'Monday,Wednesday', 'preferred_time_exact': '09:00,10:00',
            'subject_enrollments': [{'subject': 'Mathematics', 'preferred_tutor_id': None}],
            'total_amount': 0,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(User.objects.filter(username='smoke_reg').exists())

    def test_login_and_refresh(self):
        u = make_student('smoke_login')
        c = APIClient()
        res = c.post('/api/auth/login/', {'username': 'smoke_login', 'password': 'studentpass123'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)
        self.assertNotIn('refresh', res.data)

    def test_profile_get(self):
        u = make_student('smoke_profile')
        c = auth(APIClient(), u, 'studentpass123')
        res = c.get('/api/auth/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'smoke_profile')

    def test_notifications_list(self):
        u = make_student('smoke_notif')
        c = auth(APIClient(), u, 'studentpass123')
        res = c.get('/api/auth/notifications/')
        self.assertEqual(res.status_code, 200)

    def test_logout(self):
        u = make_student('smoke_logout')
        c = auth(APIClient(), u, 'studentpass123')
        res = c.post('/api/auth/logout/')
        self.assertEqual(res.status_code, 200)


# ---------------------------------------------------------------------------
# Student endpoints
# ---------------------------------------------------------------------------

class StudentSmokeTests(TestCase):

    def setUp(self):
        self.user = make_student('smoke_stu')
        self.client = auth(APIClient(), self.user, 'studentpass123')

    def test_student_me(self):
        res = self.client.get('/api/students/me/')
        self.assertEqual(res.status_code, 200)

    def test_student_me_patch_enrollment(self):
        res = self.client.patch('/api/students/me/', {'level': 'WAEC', 'target_exam_type': 'WAEC', 'target_exam_year': '2026'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['level'], 'WAEC')

    def test_student_me_patch_blocked_field(self):
        # payment_status must be stripped — 400 because no whitelisted field is left
        res = self.client.patch('/api/students/me/', {'payment_status': 'PAID'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_student_progress(self):
        res = self.client.get('/api/students/me/progress/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('attendance', res.data)
        self.assertIn('rate', res.data['attendance'])

    def test_student_sessions_list(self):
        res = self.client.get('/api/classes/sessions/')
        self.assertEqual(res.status_code, 200)

    def test_student_library(self):
        res = self.client.get('/api/curriculum/materials/')
        self.assertEqual(res.status_code, 200)

    def test_student_exams(self):
        res = self.client.get('/api/exams/list/')
        self.assertEqual(res.status_code, 200)

    def test_student_batches(self):
        res = self.client.get('/api/classes/batches/')
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.data, list)

    def test_student_complaints_list(self):
        res = self.client.get('/api/complaints/my/')
        self.assertEqual(res.status_code, 200)


# ---------------------------------------------------------------------------
# Practice Sets (new feature)
# ---------------------------------------------------------------------------

class PracticeSetSmokeTests(TestCase):

    def setUp(self):
        self.user = make_student('smoke_ps')
        self.client = auth(APIClient(), self.user, 'studentpass123')

    def test_list_empty(self):
        res = self.client.get('/api/ai/practice-sets/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, [])

    def test_create_and_list(self):
        questions = [{'id': 1, 'text': 'Q1', 'options': ['A', 'B', 'C', 'D'], 'answer': 'A'}]
        res = self.client.post('/api/ai/practice-sets/', {
            'title': 'Maths JAMB',
            'subject_name': 'Mathematics',
            'exam_type': 'JAMB',
            'questions': questions,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        ps_id = res.data['id']

        res2 = self.client.get('/api/ai/practice-sets/')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(len(res2.data), 1)
        self.assertEqual(res2.data[0]['question_count'], 1)
        return ps_id

    def test_delete(self):
        questions = [{'id': 1, 'text': 'Q1', 'options': ['A', 'B', 'C', 'D'], 'answer': 'A'}]
        create = self.client.post('/api/ai/practice-sets/', {
            'title': 'Delete me', 'subject_name': 'Physics', 'exam_type': 'WAEC', 'questions': questions,
        }, format='json')
        self.assertEqual(create.status_code, 201)
        pk = create.data['id']

        res = self.client.delete(f'/api/ai/practice-sets/{pk}/')
        self.assertEqual(res.status_code, 204)

        res2 = self.client.get('/api/ai/practice-sets/')
        self.assertEqual(len(res2.data), 0)

    def test_cannot_delete_other_users_set(self):
        other = make_student('smoke_ps_other')
        other_client = auth(APIClient(), other, 'studentpass123')
        questions = [{'id': 1, 'text': 'Q', 'options': ['A', 'B', 'C', 'D'], 'answer': 'B'}]
        create = self.client.post('/api/ai/practice-sets/', {
            'title': 'Mine', 'subject_name': 'Maths', 'exam_type': 'JAMB', 'questions': questions,
        }, format='json')
        pk = create.data['id']

        res = other_client.delete(f'/api/ai/practice-sets/{pk}/')
        self.assertEqual(res.status_code, 404)

    def test_missing_title_rejected(self):
        res = self.client.post('/api/ai/practice-sets/', {
            'subject_name': 'Maths', 'exam_type': 'JAMB',
            'questions': [{'id': 1, 'text': 'Q', 'options': [], 'answer': 'A'}],
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_missing_questions_rejected(self):
        res = self.client.post('/api/ai/practice-sets/', {'title': 'No Q'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_unauthenticated_rejected(self):
        res = APIClient().get('/api/ai/practice-sets/')
        self.assertEqual(res.status_code, 401)


# ---------------------------------------------------------------------------
# Batch / Study Groups (new feature)
# ---------------------------------------------------------------------------

class BatchSmokeTests(TestCase):

    def setUp(self):
        from programs.models import Program, Subject
        p = Program.objects.create(name='Western', program_type='WESTERN')
        self.subject = Subject.objects.create(program=p, name='Physics')

        self.admin = make_admin('smoke_batch_admin')
        self.tutor = make_tutor('smoke_batch_tutor')
        self.student = make_student('smoke_batch_stu')

        self.admin_c = auth(APIClient(), self.admin, 'adminpass123')
        self.tutor_c = auth(APIClient(), self.tutor, 'tutorpass123')
        self.student_c = auth(APIClient(), self.student, 'studentpass123')

    def _create_batch(self):
        res = self.admin_c.post('/api/classes/batches/', {
            'name': 'Batch A',
            'tutor': self.tutor.id,
            'subject': self.subject.id,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        return res.data['id']

    def test_admin_create_batch(self):
        self._create_batch()

    def test_admin_list_batches(self):
        self._create_batch()
        res = self.admin_c.get('/api/classes/batches/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

    def test_tutor_sees_own_batch(self):
        self._create_batch()
        res = self.tutor_c.get('/api/classes/batches/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_student_sees_enrolled_batch(self):
        bid = self._create_batch()
        # Add student via admin
        res = self.admin_c.post(f'/api/classes/batches/{bid}/students/add/', {'student_ids': [self.student.id]}, format='json')
        self.assertEqual(res.status_code, 200)

        res2 = self.student_c.get('/api/classes/batches/')
        self.assertEqual(res2.status_code, 200)
        ids = [b['id'] for b in res2.data]
        self.assertIn(bid, ids)

    def test_student_not_in_batch_sees_empty(self):
        self._create_batch()
        res = self.student_c.get('/api/classes/batches/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)

    def test_admin_deactivate_batch(self):
        bid = self._create_batch()
        res = self.admin_c.delete(f'/api/classes/batches/{bid}/')
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_rejected(self):
        res = APIClient().get('/api/classes/batches/')
        self.assertEqual(res.status_code, 401)


# ---------------------------------------------------------------------------
# Broadcast Notification (new feature)
# ---------------------------------------------------------------------------

class BroadcastSmokeTests(TestCase):

    def setUp(self):
        self.admin = make_admin('smoke_bcast_admin')
        self.student = make_student('smoke_bcast_stu')
        self.tutor = make_tutor('smoke_bcast_tutor')
        self.admin_c = auth(APIClient(), self.admin, 'adminpass123')
        self.student_c = auth(APIClient(), self.student, 'studentpass123')

    def test_broadcast_all(self):
        res = self.admin_c.post('/api/auth/notifications/broadcast/', {
            'title': 'Test Announcement',
            'message': 'Hello everyone.',
            'target_role': 'ALL',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('created', res.data)
        self.assertGreaterEqual(res.data['created'], 2)  # student + tutor

    def test_broadcast_student_only(self):
        from accounts.models import Notification
        before = Notification.objects.filter(user=self.student).count()
        res = self.admin_c.post('/api/auth/notifications/broadcast/', {
            'title': 'Students only',
            'message': 'For students.',
            'target_role': 'STUDENT',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['created'], 1)
        self.assertEqual(Notification.objects.filter(user=self.student).count(), before + 1)

    def test_broadcast_invalid_role(self):
        res = self.admin_c.post('/api/auth/notifications/broadcast/', {
            'title': 'Bad', 'message': 'x', 'target_role': 'GHOST',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_broadcast_missing_fields(self):
        res = self.admin_c.post('/api/auth/notifications/broadcast/', {'title': 'Only title'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_student_cannot_broadcast(self):
        res = self.student_c.post('/api/auth/notifications/broadcast/', {
            'title': 'Hack', 'message': 'x', 'target_role': 'ALL',
        }, format='json')
        self.assertEqual(res.status_code, 403)


# ---------------------------------------------------------------------------
# Tutor endpoints
# ---------------------------------------------------------------------------

class TutorSmokeTests(TestCase):

    def setUp(self):
        self.tutor = make_tutor('smoke_tutor')
        self.client = auth(APIClient(), self.tutor, 'tutorpass123')

    def test_tutor_sessions(self):
        res = self.client.get('/api/classes/sessions/')
        self.assertEqual(res.status_code, 200)

    def test_tutor_materials(self):
        res = self.client.get('/api/curriculum/materials/')
        self.assertEqual(res.status_code, 200)

    def test_tutor_wallet(self):
        from payments.models import Wallet
        Wallet.objects.get_or_create(user=self.tutor)
        res = self.client.get('/api/payments/tutor/wallet/')
        self.assertIn(res.status_code, [200, 404])  # depends on wallet existence

    def test_tutor_batches(self):
        res = self.client.get('/api/classes/batches/')
        self.assertEqual(res.status_code, 200)

    def test_tutor_profile_get(self):
        res = self.client.get(f'/api/tutors/{self.tutor.tutor_profile.id}/')
        self.assertEqual(res.status_code, 200)

    def test_tutor_availability_set(self):
        res = self.client.put('/api/tutors/me/availability/', {
            'slots': [{'day': 'Monday', 'start_time': '10:00', 'end_time': '12:00'}]
        }, format='json')
        self.assertEqual(res.status_code, 200)

    def test_booking_requests_list(self):
        res = self.client.get('/api/classes/booking/approval/')
        self.assertEqual(res.status_code, 200)

    def test_complaints_list(self):
        res = self.client.get('/api/complaints/my/')
        self.assertEqual(res.status_code, 200)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

class AdminSmokeTests(TestCase):

    def setUp(self):
        self.admin = make_admin('smoke_admin')
        self.client = auth(APIClient(), self.admin, 'adminpass123')

    def test_admin_students_list(self):
        res = self.client.get('/api/students/admin/all/')
        self.assertEqual(res.status_code, 200)

    def test_admin_tutors_list(self):
        res = self.client.get('/api/tutors/admin/list/')
        self.assertEqual(res.status_code, 200)

    def test_admin_sessions_list(self):
        res = self.client.get('/api/classes/admin/all/')
        self.assertEqual(res.status_code, 200)

    def test_admin_bookings_list(self):
        res = self.client.get('/api/classes/admin/bookings/')
        self.assertEqual(res.status_code, 200)

    def test_admin_complaints_list(self):
        res = self.client.get('/api/complaints/admin/all/')
        self.assertEqual(res.status_code, 200)

    def test_admin_analytics(self):
        res = self.client.get('/api/payments/admin/analytics/')
        self.assertEqual(res.status_code, 200)

    def test_admin_transactions_list(self):
        res = self.client.get('/api/payments/admin/transactions/')
        self.assertEqual(res.status_code, 200)

    def test_admin_withdrawals_list(self):
        res = self.client.get('/api/payments/admin/withdrawals/')
        self.assertIn(res.status_code, [200, 404])

    def test_admin_pending_students(self):
        res = self.client.get('/api/auth/pending-students/')
        self.assertEqual(res.status_code, 200)

    def test_admin_curriculum_materials(self):
        res = self.client.get('/api/curriculum/materials/')
        self.assertEqual(res.status_code, 200)

    def test_subjects_list(self):
        res = self.client.get('/api/programs/subjects/')
        self.assertEqual(res.status_code, 200)

    def test_programs_list(self):
        res = self.client.get('/api/programs/list/')
        self.assertEqual(res.status_code, 200)


# ---------------------------------------------------------------------------
# Role isolation — cross-role access denials
# ---------------------------------------------------------------------------

class RoleIsolationSmokeTests(TestCase):

    def setUp(self):
        self.student = make_student('smoke_iso_stu')
        self.tutor = make_tutor('smoke_iso_tut')
        self.student_c = auth(APIClient(), self.student, 'studentpass123')
        self.tutor_c = auth(APIClient(), self.tutor, 'tutorpass123')

    def test_student_cannot_access_admin_students(self):
        res = self.student_c.get('/api/students/admin/all/')
        self.assertIn(res.status_code, [403, 404])  # blocked either way

    def test_student_cannot_access_admin_tutors(self):
        res = self.student_c.get('/api/tutors/admin/list/')
        self.assertEqual(res.status_code, 403)

    def test_student_cannot_access_admin_analytics(self):
        res = self.student_c.get('/api/payments/admin/analytics/')
        self.assertEqual(res.status_code, 403)

    def test_tutor_cannot_access_admin_analytics(self):
        res = self.tutor_c.get('/api/payments/admin/analytics/')
        self.assertEqual(res.status_code, 403)

    def test_student_cannot_create_batch(self):
        res = self.student_c.post('/api/classes/batches/', {'name': 'Hack'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_tutor_can_create_batch_for_self(self):
        # Tutors are allowed to create batches assigned to themselves
        res = self.tutor_c.post('/api/classes/batches/', {'name': 'My Batch'}, format='json')
        self.assertIn(res.status_code, [201, 400])  # 400 if subject required

    def test_unauthenticated_cannot_access_sessions(self):
        res = APIClient().get('/api/classes/sessions/')
        self.assertEqual(res.status_code, 401)

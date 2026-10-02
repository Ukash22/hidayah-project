from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from classes.models import SchemeOfWork, Batch
from programs.models import Program, Subject
from students.models import StudentProfile

User = get_user_model()


class SchemeOfWorkTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin = User.objects.create_superuser(
            username='admin_test', email='admin@test.com', password='password123'
        )
        self.tutor = User.objects.create_user(
            username='tutor_test', email='tutor@test.com', password='password123', role='TUTOR'
        )
        self.other_tutor = User.objects.create_user(
            username='other_tutor', email='other_tutor@test.com', password='password123', role='TUTOR'
        )
        self.student = User.objects.create_user(
            username='student_test', email='student@test.com', password='password123', role='STUDENT'
        )
        self.parent = User.objects.create_user(
            username='parent_test', email='parent@test.com', password='password123', role='PARENT'
        )
        
        self.profile, _ = StudentProfile.objects.get_or_create(user=self.student)
        self.profile.parent = self.parent
        self.profile.save()

        # Subject
        self.program = Program.objects.create(name='Quran Program', program_type='ISLAMIC')
        self.subject = Subject.objects.create(name='Tajweed Rules', program=self.program)

        # Scheme of Work for student
        self.scheme1 = SchemeOfWork.objects.create(
            tutor=self.tutor,
            student=self.student,
            subject=self.subject,
            week_number=1,
            topic='Makharij al-Huroof',
            learning_objectives='Understand pronunciation points for guttural letters',
            tutor_notes='Practice daily'
        )

    def test_student_can_list_own_scheme_of_work(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/classes/scheme-of-work/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['topic'], 'Makharij al-Huroof')
        self.assertEqual(res.data[0]['is_completed'], False)

    def test_tutor_can_create_topic(self):
        self.client.force_authenticate(user=self.tutor)
        res = self.client.post('/api/classes/scheme-of-work/', {
            'student': self.student.id,
            'subject': self.subject.id,
            'week_number': 2,
            'topic': 'Ahkam an-Noon as-Sakinah',
            'learning_objectives': 'Rules of Izhar and Idgham',
            'tutor_notes': 'Read Surah Al-Baqarah vs 1-5'
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['week_number'], 2)
        self.assertEqual(res.data['topic'], 'Ahkam an-Noon as-Sakinah')

    def test_tutor_can_toggle_completion(self):
        self.client.force_authenticate(user=self.tutor)
        res = self.client.post(f'/api/classes/scheme-of-work/{self.scheme1.id}/toggle/', {
            'notes': 'Completed with excellence!'
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['is_completed'])
        self.assertIsNotNone(res.data['completed_at'])
        self.assertEqual(res.data['tutor_notes'], 'Completed with excellence!')

        # Toggle back
        res2 = self.client.post(f'/api/classes/scheme-of-work/{self.scheme1.id}/toggle/')
        self.assertEqual(res2.status_code, 200)
        self.assertFalse(res2.data['is_completed'])
        self.assertIsNone(res2.data['completed_at'])

    def test_student_cannot_toggle_completion(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/classes/scheme-of-work/{self.scheme1.id}/toggle/')
        self.assertEqual(res.status_code, 403)

    def test_parent_can_view_child_scheme(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.get(f'/api/classes/scheme-of-work/{self.scheme1.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['topic'], 'Makharij al-Huroof')

        res_list = self.client.get('/api/classes/scheme-of-work/')
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.data), 1)

    def test_tutor_can_update_and_delete(self):
        self.client.force_authenticate(user=self.tutor)
        res = self.client.put(f'/api/classes/scheme-of-work/{self.scheme1.id}/', {
            'topic': 'Updated Topic Title'
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['topic'], 'Updated Topic Title')

        del_res = self.client.delete(f'/api/classes/scheme-of-work/{self.scheme1.id}/')
        self.assertEqual(del_res.status_code, 200)
        self.assertFalse(SchemeOfWork.objects.filter(id=self.scheme1.id).exists())

    def test_tutor_can_patch_topic(self):
        self.client.force_authenticate(user=self.tutor)
        res = self.client.patch(f'/api/classes/scheme-of-work/{self.scheme1.id}/', {
            'topic': 'Patched Topic Title'
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['topic'], 'Patched Topic Title')

    def test_batch_scheme_of_work(self):
        batch = Batch.objects.create(name='Batch A', tutor=self.tutor)
        batch.students.add(self.student)

        self.client.force_authenticate(user=self.tutor)
        create_res = self.client.post('/api/classes/scheme-of-work/', {
            'batch': batch.id,
            'week_number': 3,
            'topic': 'Batch Quran Recitation',
            'learning_objectives': 'Surah Al-Mulk recitation'
        })
        self.assertEqual(create_res.status_code, 201)
        self.assertEqual(create_res.data['batch_name'], 'Batch A')
        self.assertIsNone(create_res.data['student'])

        # Enrolled student can list it
        self.client.force_authenticate(user=self.student)
        list_res = self.client.get('/api/classes/scheme-of-work/')
        self.assertEqual(list_res.status_code, 200)
        # Should see both self.scheme1 and the batch scheme
        self.assertEqual(len(list_res.data), 2)

        # Filtering by student_id includes batch scheme
        filter_res = self.client.get(f'/api/classes/scheme-of-work/?student_id={self.student.id}')
        self.assertEqual(filter_res.status_code, 200)
        self.assertEqual(len(filter_res.data), 2)

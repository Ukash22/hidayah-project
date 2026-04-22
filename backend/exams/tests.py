# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from programs.models import Program, Subject
from exams.models import Exam, Question, ExamResult
from exams.serializers import ExamSerializer, ExamSubmissionSerializer, ExamResultSerializer, QuestionSerializer

User = get_user_model()

class ExamAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', 
            password='testpassword',
            role='STUDENT'
        )
        self.admin = User.objects.create_superuser(
            username='adminuser',
            password='adminpassword',
            email='admin@test.com'
        )
        self.admin.role = 'ADMIN'
        self.admin.save()

        self.program = Program.objects.create(name='Test Program', program_type='WESTERN')
        self.subject = Subject.objects.create(name='Mathematics', program=self.program)
        
        self.exam = Exam.objects.create(
            title='JAMB Math 2021',
            exam_type='JAMB',
            subject=self.subject,
            year=2021,
            duration_minutes=60
        )
        
        self.question = Question.objects.create(
            exam=self.exam,
            text='What is 2+2?',
            option_a='1',
            option_b='2',
            option_c='3',
            option_d='4',
            correct_option='D'
        )
        
        self.client.force_authenticate(user=self.user)

    def test_get_exams_list(self):
        response = self.client.get('/api/exams/list/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'JAMB Math 2021')

    def test_submit_exam(self):
        url = f'/api/exams/list/{self.exam.id}/submit/'
        data = {
            'exam_id': self.exam.id,
            'answers': {
                str(self.question.id): 'D'
            }
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['score'], 100.0)
        self.assertEqual(response.data['correct_answers'], 1)

    def test_add_question_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = f'/api/exams/list/{self.exam.id}/add_question/'
        data = {
            'text': 'What is 5x5?',
            'option_a': '10',
            'option_b': '20',
            'option_c': '25',
            'option_d': '30',
            'correct_option': 'C'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Question.objects.filter(exam=self.exam).count(), 2)

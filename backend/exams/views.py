# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Exam, Question, ExamResult, ExamAssignment
from .serializers import ExamSerializer, ExamSubmissionSerializer, ExamResultSerializer, QuestionSerializer, ExamAssignmentSerializer

class ExamViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Exam.objects.none()
            
        role = getattr(user, 'role', '')
        if user.is_staff or role == 'ADMIN':
            return Exam.objects.all()
            
        if role == 'TUTOR':
            # Tutors see all exams (to assign them) but we might want to flag their own
            return Exam.objects.all()

        if role == 'STUDENT':
            from students.models import StudentProfile
            try:
                from payments.models import Wallet
                wallet, _ = Wallet.objects.get_or_create(user=user)
                if wallet.balance > 0:
                    return Exam.objects.filter(is_active=True)
                return Exam.objects.none()
            except StudentProfile.DoesNotExist:
                return Exam.objects.none()
                
        return Exam.objects.none()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        
        # If student, check if they've already taken this exam
        if getattr(user, 'role', '') == 'STUDENT' and not user.is_staff:
            has_result = ExamResult.objects.filter(student=user, exam=instance).exists()
            if has_result:
                return Response(
                    {"error": "You have already completed this examination. Retakes are not allowed."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        exam = serializer.save(tutor=user)
        
        # Notify Admin if a Tutor creates an exam
        if getattr(user, 'role', '') == 'TUTOR':
            from notifications.models import Notification
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admins = User.objects.filter(role='ADMIN')
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    title="New Exam Created by Tutor",
                    message=f"Tutor {user.get_full_name()} created a new exam: {exam.title}. Please review and modify if needed.",
                    link=f"/admin/exams/"
                )

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_exam(self, request, pk=None):
        exam = self.get_object()
        user = request.user

        # Prevent double submission
        if ExamResult.objects.filter(student=user, exam=exam).exists():
            return Response({"error": "Result already exists for this examination."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ExamSubmissionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        user_answers = serializer.validated_data['answers']
        questions = exam.questions.all()
        total_questions = questions.count()
        correct_count = 0
        
        for q in questions:
            user_choice = user_answers.get(str(q.id))
            if user_choice and user_choice.upper() == q.correct_option.upper():
                correct_count += 1
                
        score = (correct_count / total_questions * 100) if total_questions > 0 else 0
        
        result = ExamResult.objects.create(
            student=user,
            exam=exam,
            score=score,
            total_questions=total_questions
        )

        # Mark all assignments for this student and exam as completed
        ExamAssignment.objects.filter(student=user, exam=exam).update(is_completed=True)
        
        return Response({
            'score': score,
            'correct_answers': correct_count,
            'total_questions': total_questions,
            'result_id': result.id
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='add_question')
    def add_question(self, request, pk=None):
        exam = self.get_object()
        serializer = QuestionSerializer(data=request.data)
        if serializer.is_valid():
            question = serializer.save(exam=exam)
            
            # Notify Admin if a Tutor adds a question
            user = self.request.user
            if getattr(user, 'role', '') == 'TUTOR':
                from notifications.models import Notification
                from django.contrib.auth import get_user_model
                User = get_user_model()
                admins = User.objects.filter(role='ADMIN')
                for admin in admins:
                    Notification.objects.create(
                        user=admin,
                        title="New Question Added",
                        message=f"Tutor {user.get_full_name()} added a question to '{exam.title}': {question.text[:50]}...",
                        link=f"/admin/exams/"
                    )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ExamAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ExamAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', '')
        if user.is_staff or role == 'ADMIN':
            return ExamAssignment.objects.all()
        if role == 'TUTOR':
            return ExamAssignment.objects.filter(tutor=user)
        if role == 'STUDENT':
            return ExamAssignment.objects.filter(student=user)
        return ExamAssignment.objects.none()

    def perform_create(self, serializer):
        # Allow Admin to specify a tutor, otherwise default to self
        tutor = self.request.user
        if self.request.user.role == 'ADMIN' and self.request.data.get('tutor'):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                tutor = User.objects.get(pk=self.request.data.get('tutor'))
            except User.DoesNotExist:
                pass
        serializer.save(tutor=tutor)

    @action(detail=False, methods=['post'], url_path='bulk-assign')
    def bulk_assign(self, request):
        exam_id = request.data.get('exam')
        student_ids = request.data.get('students', [])
        
        if not exam_id or not student_ids:
            return Response({"error": "Exam ID and Student IDs are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            exam = Exam.objects.get(pk=exam_id)
        except Exam.DoesNotExist:
            return Response({"error": "Exam not found"}, status=status.HTTP_404_NOT_FOUND)
            
        assignments = []
        for s_id in student_ids:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                student = User.objects.get(pk=s_id)
                asgn, created = ExamAssignment.objects.get_or_create(
                    exam=exam,
                    student=student,
                    tutor=request.user,
                    defaults={'is_completed': False}
                )
                assignments.append(asgn.id)
            except User.DoesNotExist:
                continue
                
        return Response({"status": f"Successfully assigned exam to {len(assignments)} students", "ids": assignments}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='mark_completed')
    def mark_completed(self, request, pk=None):
        assignment = self.get_object()
        assignment.is_completed = True
        assignment.save()
        return Response({'status': 'assignment marked as completed'})

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

class ExamResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ExamResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'ADMIN':
            return ExamResult.objects.all()
        return ExamResult.objects.filter(student=self.request.user)

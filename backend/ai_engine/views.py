# type: ignore
# pyre-ignore-all-errors
# pylint: disable=import-error
import logging
logger = logging.getLogger(__name__)

from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from .models import AIGeneratedQuestion, PracticeSet
from .services import generate_ai_questions
from programs.models import Subject
from students.models import StudentProfile


class AIQuestionViewSet(viewsets.ViewSet):
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
            
        if not user.is_staff and getattr(user, 'role', '') == 'STUDENT':
            try:
                profile = StudentProfile.objects.get(user=user)
                from django.conf import settings as _s
                if profile.wallet_balance < _s.MIN_WALLET_BALANCE_FOR_AI:
                    return Response({'error': f'Insufficient wallet balance to access AI tools. Minimum NGN {int(_s.MIN_WALLET_BALANCE_FOR_AI):,} required.'}, status=status.HTTP_402_PAYMENT_REQUIRED)
            except StudentProfile.DoesNotExist:
                return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)
                
        subject_id = request.data.get('subject_id')
        exam_type = request.data.get('exam_type')
        year_range = request.data.get('year_range')
        
        if not all([subject_id, exam_type, year_range]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            subject = Subject.objects.get(id=subject_id)
            questions = generate_ai_questions(subject.name, exam_type, year_range)
            
            # Optionally store it
            ai_record = AIGeneratedQuestion.objects.create(
                subject=subject,
                exam_type=exam_type,
                year_range=year_range,
                content=questions
            )
            
            return Response({
                'id': ai_record.id,
                'questions': questions
            }, status=status.HTTP_201_CREATED)
            
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("AI question generation failed")
            return Response({'error': 'Question generation failed. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PracticeSetView(APIView):
    """GET /api/ai/practice-sets/         — list own sets
       POST /api/ai/practice-sets/        — save a new set
       DELETE /api/ai/practice-sets/<id>/ — delete own set
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sets = PracticeSet.objects.filter(owner=request.user)
        data = [
            {
                'id': s.id,
                'title': s.title,
                'subject_name': s.subject_name,
                'exam_type': s.exam_type,
                'question_count': len(s.questions) if isinstance(s.questions, list) else 0,
                'questions': s.questions,
                'created_at': s.created_at,
            }
            for s in sets
        ]
        return Response(data)

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        questions = request.data.get('questions')
        if not title:
            return Response({'error': 'title is required.'}, status=400)
        if not questions or not isinstance(questions, list):
            return Response({'error': 'questions must be a non-empty list.'}, status=400)
        ps = PracticeSet.objects.create(
            owner=request.user,
            title=title,
            subject_name=request.data.get('subject_name', ''),
            exam_type=request.data.get('exam_type', ''),
            questions=questions,
        )
        return Response({'id': ps.id, 'title': ps.title}, status=201)

    def delete(self, request, pk=None):
        try:
            ps = PracticeSet.objects.get(pk=pk, owner=request.user)
            ps.delete()
            return Response(status=204)
        except PracticeSet.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

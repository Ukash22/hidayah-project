# type: ignore
# pyre-ignore-all-errors
# pylint: disable=import-error
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import AIGeneratedQuestion
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
                if profile.wallet_balance < 1000:
                    return Response({'error': 'Insufficient wallet balance to access AI tools. Minimum ₦1,000 required.'}, status=status.HTTP_402_PAYMENT_REQUIRED)
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
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

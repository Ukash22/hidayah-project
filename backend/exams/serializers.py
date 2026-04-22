# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
from rest_framework import serializers
from .models import Exam, Question, ExamResult, ExamAssignment

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option']

class ExamSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.IntegerField(source='questions.count', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
    class Meta:
        model = Exam
        fields = ['id', 'title', 'exam_type', 'subject', 'subject_name', 'year', 'duration_minutes', 'question_count', 'questions']

class ExamSubmissionSerializer(serializers.Serializer):
    exam_id = serializers.IntegerField()
    answers = serializers.DictField(
        child=serializers.CharField(max_length=1),
        help_text="Dictionary mapping question ID to selected option (A, B, C, D)"
    )

class ExamResultSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    
    class Meta:
        model = ExamResult
        fields = ['id', 'student', 'student_name', 'exam', 'exam_title', 'score', 'total_questions', 'date_taken']

class ExamAssignmentSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    tutor_name = serializers.CharField(source='tutor.get_full_name', read_only=True)

    class Meta:
        model = ExamAssignment
        fields = ['id', 'exam', 'exam_title', 'student', 'student_name', 'tutor', 'tutor_name', 'due_date', 'is_completed', 'created_at']
        read_only_fields = ('tutor', 'created_at')

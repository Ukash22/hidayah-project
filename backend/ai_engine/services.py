# type: ignore
# pyre-ignore-all-errors
# pylint: skip-file
import os
import json
import random
from openai import OpenAI

def generate_ai_questions(subject_name, exam_type, year_range, num_questions=10):
    """
    Service to generate questions using AI.
    Will fetch real questions via OpenAI if OPENAI_API_KEY is in environment.
    Otherwise, returns varied mock questions by shuffling a bank.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            client = OpenAI(api_key=api_key)
            prompt = (
                f"You are a JAMB (Joint Admissions and Matriculation Board) examiner. "
                f"Generate {num_questions} authentic UTME-standard multiple-choice questions for the subject '{subject_name}'. "
                f"These questions should be modeled after the JAMB curriculum from '{year_range}'. "
                f"Each question must have exactly 4 options (A, B, C, D). "
                f"Provide clear, academic-level questions suitable for university entrance in Nigeria. "
                f"Format the output ONLY as a JSON array of objects: "
                f"[{{ 'text': '...', 'options': ['A', 'B', 'C', 'D'], 'answer': 'B' }}]. "
                f"No intro, no markdown, just raw JSON."
            )
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert JAMB UTME question setter. Output valid JSON array only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
            )
            
            content = response.choices[0].message.content.strip()
            if content.startswith("```json"): content = content[7:]
            if content.startswith("```"): content = content[3:]
            if content.endswith("```"): content = content[:-3]
                
            questions = json.loads(content.strip())
            for idx, q in enumerate(questions): q["id"] = idx + 1
            return questions
        except Exception as e:
            print(f"AI Generation Failed: {e}")
            pass
            
    # Mock data expanded for UTME subjects
    subjects_map = {
        "Mathematics": [
            {"text": "Find the value of x if log10(x) = 2.", "options": ["10", "100", "2", "1"], "answer": "B"},
            {"text": "Solve: 2x - 3 > 5.", "options": ["x > 1", "x > 4", "x < 4", "x > 8"], "answer": "B"},
            {"text": "What is the gradient of the line y = 3x + 5?", "options": ["5", "3", "-3", "0"], "answer": "B"},
            {"text": "Find the 5th term of the sequence 2, 4, 8, 16...", "options": ["20", "24", "32", "64"], "answer": "C"},
        ],
        "English Language": [
            {"text": "Choose the most suitable option to complete the sentence: 'The man was ______ of murder.'", "options": ["accused", "charged", "convicted", "sentenced"], "answer": "A"},
            {"text": "What is the antonym of 'Obscure'?", "options": ["Hidden", "Clear", "Vague", "Dark"], "answer": "B"},
            {"text": "Select the correct spelling.", "options": ["Questionaire", "Questionnaire", "Questionaire", "Questionaire"], "answer": "B"},
        ],
        "Physics": [
            {"text": "Newton's first law of motion is also known as the law of ______", "options": ["Acceleration", "Inertia", "Action", "Gravity"], "answer": "B"},
            {"text": "The unit of electric current is ______", "options": ["Volt", "Ohm", "Ampere", "Watt"], "answer": "C"},
            {"text": "Light travels fastest in ______", "options": ["Water", "Glass", "Vacuum", "Air"], "answer": "C"},
        ],
        "Chemistry": [
            {"text": "Which of these is a noble gas?", "options": ["Oxygen", "Nitrogen", "Neon", "Chlorine"], "answer": "C"},
            {"text": "The atomic number of Carbon is ______", "options": ["12", "6", "14", "8"], "answer": "B"},
            {"text": "Ethanoic acid is also known as ______", "options": ["Formic acid", "Acetic acid", "Citric acid", "Hydrochloric acid"], "answer": "B"},
        ],
        "Biology": [
            {"text": "The study of heredity is called ______", "options": ["Ecology", "Genetics", "Evolution", "Physiology"], "answer": "B"},
            {"text": "Which organ is responsible for pumping blood?", "options": ["Lungs", "Brain", "Heart", "Kidney"], "answer": "C"},
            {"text": "The basic unit of life is the ______", "options": ["Tissue", "Organ", "Cell", "System"], "answer": "C"},
        ]
    }

    base_questions = subjects_map.get(subject_name, [
        {"text": f"Evaluate the core principles of {subject_name} in relation to {exam_type} standards.", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "A"},
        {"text": f"Which of the following describes the secondary phase of {subject_name}?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "B"},
    ])
    
    random.shuffle(base_questions)
    questions = base_questions[:num_questions]
    for idx, q in enumerate(questions): q["id"] = idx + 1
    return questions

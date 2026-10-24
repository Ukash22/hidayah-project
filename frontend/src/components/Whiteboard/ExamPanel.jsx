import React, { useState } from 'react';
import { FileText, Send, Clock, Edit3, X, CheckCircle2, BookOpen } from 'lucide-react';
import { useToast, useConfirm } from '../../context/ToastContext';

const ExamPanel = ({ role, onAssignExam, onClose }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState('templates');
    const [customQuestion, setCustomQuestion] = useState('');
    const [duration, setDuration] = useState(5); // in minutes
    const [mcqAnswers, setMcqAnswers] = useState({}); // student MCQ answers

    const isTutorOrAdmin = role === 'TUTOR' || role === 'ADMIN';

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const generateTextElement = (text, x, y, size = 20, color = "#000000") => ({
        id: generateId(),
        type: "text",
        x, y,
        width: text.length * (size * 0.6),
        height: size * 1.5,
        text,
        fontSize: size,
        fontFamily: 1,
        textAlign: "left",
        verticalAlign: "top",
        strokeColor: color,
        backgroundColor: "transparent",
        fillStyle: "hachure",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000000),
        isDeleted: false,
    });

    const generateBox = (x, y, width, height, strokeColor = "#cbd5e1", bgColor = "transparent") => ({
        id: generateId(),
        type: "rectangle",
        x, y, width, height,
        strokeColor,
        backgroundColor: bgColor,
        fillStyle: "hachure",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [],
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000000),
        isDeleted: false,
    });

    const templates = [
        {
            id: 'algebra_1',
            title: 'Algebra Pop Quiz',
            icon: '📐',
            description: '3 basic algebraic equations to solve for x.',
            generate: () => [
                generateTextElement("ALGEBRA POP QUIZ", 100, 50, 36, "#1e293b"),
                generateTextElement("Solve for x. Show your working in the boxes.", 100, 100, 16, "#64748b"),
                generateTextElement("1)  2x + 5 = 15", 100, 180, 24, "#0f172a"),
                generateBox(100, 220, 300, 150),
                generateTextElement("2)  3(x - 4) = 12", 450, 180, 24, "#0f172a"),
                generateBox(450, 220, 300, 150),
                generateTextElement("3)  x/2 + 7 = 10", 100, 420, 24, "#0f172a"),
                generateBox(100, 460, 300, 150),
            ]
        },
        {
            id: 'geometry_1',
            title: 'Geometry Basics',
            icon: '📏',
            description: 'Calculate areas and perimeters.',
            generate: () => [
                generateTextElement("GEOMETRY QUIZ", 100, 50, 36, "#1e293b"),
                generateTextElement("Calculate and write the final answers.", 100, 100, 16, "#64748b"),
                generateTextElement("1) Area of a rectangle with length 8 and width 3?", 100, 180, 20, "#0f172a"),
                generateBox(100, 220, 400, 100),
                generateTextElement("2) Perimeter of a square with side 5?", 100, 360, 20, "#0f172a"),
                generateBox(100, 400, 400, 100),
            ]
        },
        {
            id: 'mcq_1',
            title: 'Multiple Choice Quiz (MCQ)',
            icon: '🔘',
            description: '5 objective questions — students circle A, B, C, or D.',
            generate: () => [
                generateTextElement("MULTIPLE CHOICE QUIZ", 100, 40, 34, "#1e293b"),
                generateTextElement("Circle the correct answer for each question.", 100, 88, 15, "#64748b"),
                generateTextElement("1)  What is 7 x 8?", 100, 145, 20, "#0f172a"),
                generateTextElement("A) 54       B) 56       C) 48       D) 63", 130, 178, 17, "#334155"),
                generateBox(100, 140, 680, 65, "#cbd5e1"),
                generateTextElement("2)  Which planet is closest to the Sun?", 100, 230, 20, "#0f172a"),
                generateTextElement("A) Venus    B) Mars     C) Mercury  D) Earth", 130, 263, 17, "#334155"),
                generateBox(100, 225, 680, 65, "#cbd5e1"),
                generateTextElement("3)  What is the chemical symbol for water?", 100, 315, 20, "#0f172a"),
                generateTextElement("A) O2       B) H2O      C) CO2      D) NaCl", 130, 348, 17, "#334155"),
                generateBox(100, 310, 680, 65, "#cbd5e1"),
                generateTextElement("4)  Who wrote Romeo and Juliet?", 100, 400, 20, "#0f172a"),
                generateTextElement("A) Dickens  B) Shakespeare  C) Chaucer  D) Austen", 130, 432, 17, "#334155"),
                generateBox(100, 395, 680, 65, "#cbd5e1"),
                generateTextElement("5)  What is the square root of 144?", 100, 485, 20, "#0f172a"),
                generateTextElement("A) 11       B) 14       C) 12       D) 13", 130, 517, 17, "#334155"),
                generateBox(100, 480, 680, 65, "#cbd5e1"),
                generateTextElement("My Answers:  1)___  2)___  3)___  4)___  5)___", 100, 575, 18, "#7c3aed"),
                generateBox(90, 568, 700, 50, "#7c3aed", "#f5f3ff"),
            ]
        },
        {
            id: 'islamic_studies',
            title: 'Islamic Studies Quiz',
            icon: '☪️',
            description: 'Questions on Quran, Hadith, and Islamic history.',
            generate: () => [
                generateTextElement("ISLAMIC STUDIES QUIZ", 100, 40, 34, "#1e293b"),
                generateTextElement("Answer in the boxes below. Write clearly.", 100, 90, 15, "#64748b"),
                generateTextElement("1)  Name the first Surah of the Holy Quran.", 100, 150, 20, "#0f172a"),
                generateBox(100, 185, 680, 80),
                generateTextElement("2)  How many pillars of Islam are there? List them.", 100, 290, 20, "#0f172a"),
                generateBox(100, 325, 680, 110),
                generateTextElement("3)  Who was the first Caliph after Prophet Muhammad (SAW)?", 100, 460, 20, "#0f172a"),
                generateBox(100, 495, 680, 80),
            ]
        },
        {
            id: 'blank_canvas',
            title: 'Blank Exam Canvas',
            icon: '📄',
            description: 'A clean slate with a bold EXAM header.',
            generate: () => [
                generateTextElement("STUDENT EXAM - DO NOT ERASE THIS HEADER", 100, 50, 24, "#ef4444"),
                generateBox(80, 30, 800, 70, "#ef4444", "#fef2f2")
            ]
        }
    ];

    const handleAssignTemplate = async (template) => {
        if (await confirm(`Assign "${template.title}" to all students for ${duration} minutes? This will clear their current boards.`, { confirmLabel: 'Assign' })) {
            const elements = template.generate();
            onAssignExam(elements, duration);
            onClose();
        }
    };

    const handleAssignCustom = async () => {
        if (!customQuestion.trim()) return toast.error("Please enter a question.");
        if (await confirm(`Assign custom question to all students for ${duration} minutes?`, { confirmLabel: 'Assign' })) {
            const elements = [
                generateTextElement("CUSTOM EXAM QUESTION", 100, 50, 28, "#1e293b"),
                generateTextElement(customQuestion, 100, 120, 24, "#0f172a"),
                generateTextElement("Write your answer below:", 100, 250, 16, "#64748b"),
                generateBox(100, 280, 600, 300)
            ];
            onAssignExam(elements, duration);
            onClose();
        }
    };

    if (!isTutorOrAdmin) {
        // Student view
        return (
            <div className="fixed left-4 top-20 bottom-4 w-72 bg-white/95 backdrop-blur-3xl rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden flex flex-col z-[2000]">
                <div className="p-4 bg-gradient-to-r from-violet-600 to-purple-700 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2 text-white">
                        <div className="p-1.5 bg-white/20 rounded-xl"><BookOpen size={20} /></div>
                        <h3 className="font-bold tracking-tight">My Exam</h3>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
                        <p className="font-bold text-violet-800 text-sm mb-2">📋 Exam Tips</p>
                        <ul className="text-xs text-violet-700 space-y-1.5">
                            <li>✏️ Use <strong>Draw</strong> tool to write answers on the board</li>
                            <li>📝 Use <strong>Text</strong> tool to type responses</li>
                            <li>🧮 Open <strong>Calc</strong> for complex calculations</li>
                            <li>⏱️ Watch the <strong>red timer</strong> at the top</li>
                            <li>🚫 Do NOT clear your board during the exam</li>
                            <li>🖊️ Use pen-size buttons to adjust writing thickness</li>
                        </ul>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                        <p className="font-bold text-emerald-800 text-sm mb-3">🔘 Quick MCQ Answer Sheet</p>
                        <p className="text-[11px] text-emerald-600 mb-3">Tap your answer for each question (Q1–Q5):</p>
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(q => (
                                <div key={q} className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-600 w-5">{q})</span>
                                    <div className="flex gap-1">
                                        {['A', 'B', 'C', 'D'].map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setMcqAnswers(prev => ({ ...prev, [q]: opt }))}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                    mcqAnswers[q] === opt
                                                        ? 'bg-emerald-600 text-white shadow'
                                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-400'
                                                }`}
                                            >{opt}</button>
                                        ))}
                                    </div>
                                    {mcqAnswers[q] && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
                                </div>
                            ))}
                        </div>
                        {Object.keys(mcqAnswers).length > 0 && (
                            <div className="mt-3 p-2 bg-emerald-100 rounded-xl">
                                <p className="text-[11px] font-bold text-emerald-700">
                                    Answers: {[1,2,3,4,5].map(q => `${q})${mcqAnswers[q] || '?'}`).join('  ')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed left-4 top-20 bottom-4 w-80 bg-white/95 backdrop-blur-3xl rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden flex flex-col z-[2000] transition-all transform origin-left">
            <div className="p-4 bg-gradient-to-r from-rose-500 to-red-600 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2 text-white">
                    <div className="p-1.5 bg-white/20 rounded-xl"><FileText size={20} /></div>
                    <h3 className="font-bold tracking-tight">Assign Exam</h3>
                </div>
                <button onClick={onClose} aria-label="Close panel" className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all">
                    <X size={18} />
                </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Clock size={16} className="text-slate-500" />
                    Duration:
                </div>
                <div className="flex items-center gap-2">
                    <select 
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-rose-600 outline-none focus:border-rose-500 shadow-sm"
                    >
                        <option value={1}>1 min</option>
                        <option value={3}>3 min</option>
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                    </select>
                </div>
            </div>

            <div className="flex overflow-x-auto p-2 gap-1 bg-white border-b border-slate-100 scrollbar-hide">
                <button 
                    onClick={() => setActiveTab('templates')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'templates' ? 'bg-rose-50 text-rose-600 shadow-sm border border-rose-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                    <CheckCircle2 size={16}/> Templates
                </button>
                <button 
                    onClick={() => setActiveTab('custom')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'custom' ? 'bg-rose-50 text-rose-600 shadow-sm border border-rose-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                    <Edit3 size={16}/> Custom
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                {activeTab === 'templates' && (
                    <div className="flex flex-col gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Select an exam to assign</p>
                        {templates.map(template => (
                            <div key={template.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-rose-300 hover:shadow-md transition-all group">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{template.icon}</span>
                                    <h4 className="font-bold text-slate-800 text-sm">{template.title}</h4>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 mb-3">{template.description}</p>
                                <button 
                                    onClick={() => handleAssignTemplate(template)}
                                    className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <Send size={14} /> Assign to Class
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'custom' && (
                    <div className="flex flex-col gap-4 h-full">
                         <div className="space-y-2 flex-1 flex flex-col">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type your question</label>
                            <textarea 
                                value={customQuestion}
                                onChange={(e) => setCustomQuestion(e.target.value)}
                                placeholder="E.g., What is the capital of France? Draw it or write it out."
                                className="flex-1 w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:border-rose-500 resize-none shadow-sm"
                            />
                        </div>
                        <button 
                            onClick={handleAssignCustom}
                            className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
                        >
                            <Send size={16} /> Assign Custom Exam
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamPanel;

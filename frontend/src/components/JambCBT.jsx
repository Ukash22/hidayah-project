import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, ChevronLeft, ChevronRight, Calculator, 
    RotateCcw, Sparkles, Send, CheckCircle2, AlertCircle,
    BookOpen, Home, Settings, Info, X, GraduationCap
} from 'lucide-react';
import axios from 'axios';

const JAMB_BLUE = "#0047AB";
const JAMB_LIGHT_BLUE = "#E0EEFF";

const JambCBT = ({ token, studentProfile }) => {
    const examType = studentProfile?.target_exam_type || (studentProfile?.level === 'JUNIOR_WAEC' ? 'BECE' : 'JAMB');
    const examYear = studentProfile?.target_exam_year || '2024';

    // State management
    const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
    const [questions, setQuestions] = useState({}); // { subjectName: [questions] }
    const [userAnswers, setUserAnswers] = useState({}); // { subjectName: { questionId: answer } }
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(120 * 60); // 120 minutes
    const [isStarted, setIsStarted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcValue, setCalcValue] = useState('0');
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [results, setResults] = useState(null);

    const timerRef = useRef(null);

    // Filter "Exam Preparation" subjects from profile
    useEffect(() => {
        if (studentProfile?.enrollments) {
            const jambSubjs = studentProfile.enrollments
                .filter(enr => enr.subject_name.includes('JAMB') || enr.subject_name.includes('Mathematics') || enr.subject_name.includes('English'))
                .map(enr => enr.subject_name);
            
            // Default subjects if none found
            const defaults = jambSubjs.length > 0 ? jambSubjs : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
            setSelectedSubjects(defaults.slice(0, 4));
        }
    }, [studentProfile]);

    // Timer logic
    useEffect(() => {
        if (isStarted && timeLeft > 0 && !isFinished) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            submitExam();
        }
        return () => clearInterval(timerRef.current);
    }, [isStarted, timeLeft, isFinished]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startPractice = async (isAI = false) => {
        setLoading(true);
        try {
            const newQuestions = {};
            const initialAnswers = {};

            for (const subject of selectedSubjects) {
                if (isAI) {
                    const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/ai/questions/generate/`, {
                        subject_id: 1, 
                        subject_name: subject,
                        exam_type: examType,
                        year_range: `${examYear}`
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    newQuestions[subject] = res.data.questions;
                } else {
                    const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/ai/questions/generate/`, {
                        subject_id: 1,
                        subject_name: subject,
                        exam_type: examType,
                        year_range: `${examYear}`
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    newQuestions[subject] = res.data.questions;
                }
                initialAnswers[subject] = {};
            }

            setQuestions(newQuestions);
            setUserAnswers(initialAnswers);
            setIsStarted(true);
            setIsFinished(false);
            setTimeLeft(120 * 60);
            setCurrentQuestionIndex(0);
            setActiveSubjectIndex(0);
        } catch (err) {
            console.error("Failed to load questions", err);
            alert("Unable to load questions. Please check your internet or wallet balance.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option) => {
        const currentSubject = selectedSubjects[activeSubjectIndex];
        const currentQuestion = questions[currentSubject][currentQuestionIndex];
        
        setUserAnswers(prev => ({
            ...prev,
            [currentSubject]: {
                ...prev[currentSubject],
                [currentQuestion.id]: option
            }
        }));
    };

    const submitExam = () => {
        clearInterval(timerRef.current);
        const finalResults = {};
        let totalScore = 0;

        selectedSubjects.forEach(subject => {
            const subjectQuestions = questions[subject] || [];
            const answers = userAnswers[subject] || {};
            let correctCount = 0;

            subjectQuestions.forEach(q => {
                if (answers[q.id] === q.answer) {
                    correctCount++;
                }
            });

            const score = Math.round((correctCount / subjectQuestions.length) * 100);
            finalResults[subject] = {
                correct: correctCount,
                total: subjectQuestions.length,
                score: score
            };
            totalScore += score;
        });

        setResults({
            breakdown: finalResults,
            average: Math.round(totalScore / selectedSubjects.length)
        });
        setIsFinished(true);
    };

    // Calculator Logic
    const handleCalc = (val) => {
        if (val === 'C') setCalcValue('0');
        else if (val === '=') {
            try { setCalcValue(eval(calcValue).toString()); } catch { setCalcValue('Error'); }
        } else {
            setCalcValue(prev => prev === '0' ? val : prev + val);
        }
    };

    if (!isStarted && !isFinished) {
        return (
            <div className="bg-white rounded-[2rem] p-10 shadow-2xl border border-slate-100 max-w-4xl mx-auto text-slate-800">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <GraduationCap size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-blue-900 uppercase">{examType} CBT Simulator</h2>
                        <p className="text-slate-500 font-bold">Standard {examType} Practice Environment ({examYear})</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-10 mb-10">
                    <div className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-blue-600">Selected Subjects</h3>
                        <div className="space-y-2">
                            {selectedSubjects.map((subj, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">{i+1}</div>
                                    <span className="font-bold text-slate-700">{subj}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-[2rem] p-8 border border-blue-100">
                        <h3 className="text-xs font-black uppercase tracking-widest text-blue-700 mb-4">Exam Guidelines</h3>
                        <ul className="space-y-3 text-xs font-bold text-blue-900/70">
                            <li className="flex gap-2"><Clock size={14} className="shrink-0" /> Duration: 120 Minutes (Total)</li>
                            <li className="flex gap-2"><BookOpen size={14} className="shrink-0" /> Questions: Standard {examType} Format</li>
                            <li className="flex gap-2"><Calculator size={14} className="shrink-0" /> Built-in Calculator allowed</li>
                            <li className="flex gap-2"><Sparkles size={14} className="shrink-0" /> AI-Powered Question Variability</li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={() => startPractice(false)}
                        disabled={loading}
                        className="flex-1 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
                    >
                        {loading ? 'Preparing...' : 'Start Past Questions Mode'}
                    </button>
                    <button 
                        onClick={() => startPractice(true)}
                        disabled={loading}
                        className="flex-1 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:scale-[1.02] text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3"
                    >
                        <Sparkles size={16} /> AI Practice Engine
                    </button>
                </div>
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 max-w-4xl mx-auto text-slate-800">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 uppercase">Exam Completed!</h2>
                    <p className="text-slate-500 font-bold mt-2">Here is your performance breakdown</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-10">
                    {selectedSubjects.map((subject, i) => (
                        <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-black text-slate-700 uppercase text-xs">{subject}</h4>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${results.breakdown[subject].score >= 50 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {results.breakdown[subject].score}%
                                </span>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-black text-slate-900">{results.breakdown[subject].correct}</span>
                                <span className="text-slate-400 font-bold mb-1">/ {results.breakdown[subject].total} Correct</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full mt-4 overflow-hidden">
                                <div 
                                    className={`h-full ${results.breakdown[subject].score >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                    style={{ width: `${results.breakdown[subject].score}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-blue-600 rounded-3xl p-8 text-white text-center mb-10">
                    <p className="text-blue-100 font-black uppercase text-xs tracking-widest mb-2">Overall Average</p>
                    <h3 className="text-6xl font-black tracking-tighter">{results.average}%</h3>
                </div>

                <button 
                    onClick={() => { setIsStarted(false); setIsFinished(false); }}
                    className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                >
                    Back to Portal
                </button>
            </div>
        );
    }

    const currentSubject = selectedSubjects[activeSubjectIndex];
    const currentQuestions = questions[currentSubject] || [];
    const currentQuestion = currentQuestions[currentQuestionIndex];
    const userAnswersForSubj = userAnswers[currentSubject] || {};

    return (
        <div className="min-h-screen bg-slate-100 fixed inset-0 z-[100] flex flex-col font-sans">
            {/* JAMB Top Bar */}
            <div className="bg-[#0047AB] text-white px-6 py-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#0047AB] font-black text-xl">H</div>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter leading-none">HIDAYAH CBT</h1>
                        <p className="text-[10px] font-bold text-blue-200 tracking-widest uppercase">Exam Preparation Portal</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="hidden md:flex gap-4">
                        {selectedSubjects.map((s, i) => (
                            <button 
                                key={i}
                                onClick={() => { setActiveSubjectIndex(i); setCurrentQuestionIndex(0); }}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubjectIndex === i ? 'bg-white text-[#0047AB]' : 'text-blue-100 hover:bg-blue-800'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 bg-black/20 px-4 py-2 rounded-xl border border-white/10">
                        <Clock size={18} className="text-white" />
                        <span className="text-xl font-mono font-black tabular-nums">{formatTime(timeLeft)}</span>
                    </div>

                    <button 
                        onClick={() => setShowCalculator(!showCalculator)}
                        className={`p-2 rounded-lg transition-all ${showCalculator ? 'bg-white text-[#0047AB]' : 'bg-blue-800 text-white'}`}
                    >
                        <Calculator size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Right Side - Question Content */}
                <div className="flex-1 bg-white p-6 md:p-12 overflow-y-auto">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {currentSubject} - Question {currentQuestionIndex + 1}
                            </span>
                            <span className="text-slate-400 font-bold text-xs">Total: {currentQuestions.length}</span>
                        </div>

                        {currentQuestion ? (
                            <div className="space-y-10">
                                <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed">
                                    {currentQuestion.text}
                                </h3>

                                <div className="grid gap-3">
                                    {currentQuestion.options.map((opt, i) => {
                                        const label = String.fromCharCode(65 + i);
                                        const isSelected = userAnswersForSubj[currentQuestion.id] === label;
                                        return (
                                            <button 
                                                key={i}
                                                onClick={() => handleAnswer(label)}
                                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all group ${isSelected ? 'bg-blue-50 border-blue-600 shadow-md' : 'border-slate-100 hover:border-blue-200'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                                    {label}
                                                </div>
                                                <span className={`font-bold text-lg ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                <RotateCcw size={48} className="animate-spin" />
                                <p className="font-bold">Syncing questions...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Left Side - Question Grid (Fixed Width) */}
                <div className="hidden lg:flex flex-col w-[350px] bg-slate-50 border-l border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Info size={16} className="text-blue-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Navigation Grid</h4>
                    </div>

                    <div className="flex-1 overflow-y-auto grid grid-cols-5 gap-2 content-start pr-2">
                        {currentQuestions.map((q, i) => {
                            const isAnswered = !!userAnswersForSubj[q.id];
                            const isCurrent = currentQuestionIndex === i;
                            return (
                                <button 
                                    key={i}
                                    onClick={() => setCurrentQuestionIndex(i)}
                                    className={`h-11 rounded-xl font-black text-xs transition-all border-2 ${
                                        isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 
                                        isAnswered ? 'bg-emerald-500 border-emerald-500 text-white' : 
                                        'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Answered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-white border-2 border-slate-200 rounded-full" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Pending</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => { if(window.confirm('Are you sure you want to end this practice session?')) submitExam(); }}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
                        >
                            <Send size={14} /> Submit Final
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-white border-t border-slate-200 p-4 md:px-12 flex justify-between items-center relative z-10">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="px-6 py-3 rounded-xl border-2 border-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest disabled:opacity-30 flex items-center gap-2 hover:bg-slate-50 transition-all"
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <button 
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(currentQuestions.length - 1, prev + 1))}
                        disabled={currentQuestionIndex === currentQuestions.length - 1}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>

                <div className="hidden sm:flex flex-wrap gap-2">
                    {selectedSubjects.map((s, i) => (
                        <div key={i} className={`h-1.5 w-12 rounded-full transition-all ${activeSubjectIndex === i ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        System Status: <span className="text-emerald-500">Connected</span>
                    </p>
                </div>
            </div>

            {/* Calculator Overlay */}
            {showCalculator && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="fixed top-24 right-8 w-64 bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-white/10 z-[200]"
                >
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">JAMB Calculator</span>
                        <button onClick={() => setShowCalculator(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 mb-6 text-right">
                        <span className="text-2xl font-mono text-white tabular-nums">{calcValue}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {['7','8','9','/','4','5','6','*','1','2','3','-','0','C','=','+'].map(btn => (
                            <button 
                                key={btn}
                                onClick={() => handleCalc(btn)}
                                className={`h-12 rounded-lg font-bold transition-all ${btn === '=' ? 'bg-blue-600 text-white col-span-1' : btn === 'C' ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                            >
                                {btn}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Mobile Subject Switcher */}
            <div className="md:hidden flex bg-blue-900 overflow-x-auto p-2 gap-2">
                {selectedSubjects.map((s, i) => (
                    <button 
                        key={i}
                        onClick={() => { setActiveSubjectIndex(i); setCurrentQuestionIndex(0); }}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeSubjectIndex === i ? 'bg-white text-[#0047AB]' : 'text-blue-100'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default JambCBT;

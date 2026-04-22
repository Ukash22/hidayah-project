import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Calculator from '../components/Calculator';

const CBTInterface = () => {
    const { id } = useParams(); // Can be "1,2,3,4"
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [exams, setExams] = useState([]);
    const [activeExamIdx, setActiveExamIdx] = useState(0);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState({}); // { examId: { questionId: answer } }
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [scoreData, setScoreData] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const getAuthHeader = () => {
        const token = localStorage.getItem('access') || localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    // Fisher-Yates Shuffle Utility
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    useEffect(() => {
        const fetchExams = async () => {
            setIsLoading(true);
            setLoadError(null);
            const ids = id.split(',').filter(Boolean);
            try {
                const promises = ids.map(eid =>
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/${eid}/`, {
                        headers: getAuthHeader()
                    })
                );
                const results = await Promise.all(promises);
                const loadedExams = results.map(r => {
                    const data = r.data;
                    // Randomize questions for this student session
                    if (data.questions && data.questions.length > 0) {
                        data.questions = shuffleArray(data.questions);
                    }
                    return data;
                });

                // Filter out exams with no questions and warn
                const validExams = loadedExams.filter(e => e.questions && e.questions.length > 0);
                if (validExams.length === 0) {
                    setLoadError('No questions have been added to this exam yet. Please contact your tutor.');
                } else {
                    setExams(validExams);
                    const totalMinutes = validExams.reduce((acc, curr) => acc + curr.duration_minutes, 0);
                    setTimeLeft(totalMinutes * 60);
                }
            } catch (err) {
                console.error("Failed to load exams", err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setLoadError('Access denied. Please ensure you are logged in and have sufficient wallet balance (₦1,000 minimum) to access CBT exams.');
                } else if (err.response?.status === 404) {
                    setLoadError('Exam not found. It may have been removed or the link is incorrect.');
                } else {
                    setLoadError('Failed to load exam. Please check your connection and try again.');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchExams();
    }, [id]);

    const handleSubmit = useCallback(async () => {
        if (isFinished) return;
        setIsSubmitting(true);
        try {
            const results = [];
            let totalCorrect = 0;
            let totalQuestions = 0;

            // Submit each exam individually to the backend
            for (const exam of exams) {
                const examAnswers = answers[exam.id] || {};
                
                // Call the backend submission endpoint
                try {
                    const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/${exam.id}/submit/`, {
                        exam_id: exam.id,
                        answers: examAnswers
                    }, { headers: getAuthHeader() });
                    
                    // The backend returns score, correct_answers, and total_questions
                    const { score, correct_answers, total_questions } = res.data;
                    totalCorrect += correct_answers;
                    totalQuestions += total_questions;
                    
                    results.push({
                        title: exam.title,
                        score: correct_answers,
                        total: total_questions,
                        percentage: score
                    });
                } catch (e) {
                    console.error(`Failed to submit exam ${exam.id}`, e);
                    // Fallback to local marking if API fails (but we should probably warn)
                    let examCorrect = 0;
                    exam.questions.forEach(q => {
                        if (examAnswers[q.id] === q.correct_option) examCorrect++;
                    });
                    totalCorrect += examCorrect;
                    totalQuestions += exam.questions.length;
                    results.push({
                        title: exam.title,
                        score: examCorrect,
                        total: exam.questions.length,
                        percentage: (examCorrect / exam.questions.length) * 100
                    });
                }
            }

            setScoreData({
                totalScore: totalCorrect,
                totalQuestions,
                percentage: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
                breakdown: results
            });
            setIsFinished(true);
        } catch (err) {
            console.error("Submission failed", err);
            alert("Examination submission failed. Please check your internet connection.");
        } finally {
            setIsSubmitting(false);
        }
    }, [exams, answers, isFinished]);

    useEffect(() => {
        if (timeLeft <= 0 && exams.length > 0 && !isFinished) {
            handleSubmit();
            return;
        }
        if (isFinished) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, exams, isFinished, handleSubmit]);

    if (isLoading || isSubmitting) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#1e293b] text-white gap-6">
            <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="font-display text-xl animate-pulse text-slate-300">
                {isSubmitting ? 'Synchronizing Academic Records...' : 'Initializing Exam Engine...'}
            </p>
        </div>
    );

    if (loadError) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#1e293b] text-white gap-6 p-8">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-2xl font-black text-amber-500">Cannot Load Exam</h2>
            <p className="text-slate-400 text-center max-w-md leading-relaxed">{loadError}</p>
            <div className="flex gap-4 mt-4">
                <button
                    onClick={() => window.history.back()}
                    className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all"
                >
                    ← Go Back
                </button>
                <button
                    onClick={() => window.location.href = '/student'}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all"
                >
                    Dashboard
                </button>
            </div>
        </div>
    );

    const currentExam = exams[activeExamIdx];
    const currentQuestion = currentExam.questions[currentQuestionIdx];

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    if (isFinished && scoreData) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="container pt-32 pb-20">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl p-12 border border-slate-100 mb-8 overflow-hidden relative text-slate-900">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32"></div>
                            <h1 className="text-4xl font-display text-primary mb-2">Examination Result</h1>
                            <p className="text-slate-500 mb-12">Performance breakdown for {searchParams.get('type')} {searchParams.get('year')}</p>

                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="text-center md:text-left">
                                    <div className="text-8xl font-black text-primary mb-2">{Math.round(scoreData.percentage)}%</div>
                                    <div className="text-lg font-bold text-slate-400 uppercase tracking-widest">Aggregate Score</div>
                                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                                        <button onClick={() => navigate('/student?tab=assessments')} className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">Finish Session & View History →</button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {scoreData.breakdown.map((res, i) => (
                                        <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-slate-700">{res.title}</span>
                                                <span className="font-black text-primary">{res.score}/{res.total}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 transition-all" style={{ width: `${res.percentage}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1e293b] text-slate-200 font-sans flex flex-col">
            {/* JAMB Header */}
            <div className="bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <span className="text-2xl font-black tracking-tighter text-white">HITIS <span className="text-amber-500 underline decoration-4 underline-offset-4">CBT</span></span>
                    <div className="h-8 w-[2px] bg-slate-700"></div>
                    <div className="flex items-center gap-3">
                        {exams.map((exam, i) => (
                            <button
                                key={exam.id}
                                onClick={() => { setActiveExamIdx(i); setCurrentQuestionIdx(0); }}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeExamIdx === i ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                            >
                                {exam.subject_name.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <button
                        onClick={() => setShowCalculator(!showCalculator)}
                        className={`p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all ${showCalculator ? 'text-amber-500' : 'text-slate-400'}`}
                        title="Calculator"
                    >
                        🧮
                    </button>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Time Remaining</span>
                        <span className={`font-mono text-2xl font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Question Area */}
                <div className="flex-1 p-12 overflow-y-auto relative">
                    {showCalculator && (
                        <div className="absolute top-4 right-4 z-[60] animate-in zoom-in-95 duration-200">
                            <div className="flex justify-end mb-2">
                                <button onClick={() => setShowCalculator(false)} className="bg-red-500 text-white w-6 h-6 rounded-full text-xs font-black">×</button>
                            </div>
                            <Calculator />
                        </div>
                    )}

                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-4 mb-12">
                            <span className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-xl text-amber-500 border border-slate-700">
                                {currentQuestionIdx + 1}
                            </span>
                            <div>
                                <h1 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Question Navigation</h1>
                                <p className="text-slate-400 text-xs font-bold">{currentExam.title}</p>
                            </div>
                        </div>

                        <div className="prose prose-invert prose-lg mb-12">
                            <h2 className="text-2xl font-bold leading-relaxed">{currentQuestion.text}</h2>
                        </div>

                        <div className="grid gap-4">
                            {['a', 'b', 'c', 'd'].map(opt => {
                                const key = opt.toUpperCase();
                                const isSelected = answers[currentExam.id]?.[currentQuestion.id] === key;
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => setAnswers({
                                            ...answers,
                                            [currentExam.id]: {
                                                ...(answers[currentExam.id] || {}),
                                                [currentQuestion.id]: key
                                            }
                                        })}
                                        className={`group relative flex items-center gap-6 p-6 rounded-3xl border-2 text-left transition-all ${isSelected ? 'bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-300'}`}
                                    >
                                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${isSelected ? 'bg-white text-amber-500' : 'bg-slate-700 group-hover:bg-slate-600'}`}>
                                            {key}
                                        </span>
                                        <span className="font-bold">{currentQuestion[`option_${opt}`]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-16 flex justify-between border-t border-slate-800 pt-8">
                            <button
                                disabled={currentQuestionIdx === 0}
                                onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                                className="px-8 py-4 rounded-2xl bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-700 transition-all disabled:opacity-20"
                            >
                                ← Previous
                            </button>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleSubmit}
                                    className="px-8 py-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-black uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-all"
                                >
                                    End Session
                                </button>
                                {currentQuestionIdx === currentExam.questions.length - 1 ? (
                                    activeExamIdx < exams.length - 1 ? (
                                        <button
                                            onClick={() => { setActiveExamIdx(prev => prev + 1); setCurrentQuestionIdx(0); }}
                                            className="px-12 py-4 rounded-2xl bg-amber-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-500/20 hover:-translate-y-1 transition-all"
                                        >
                                            Next Subject →
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSubmit}
                                            className="px-12 py-4 rounded-2xl bg-green-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-green-600/20 hover:-translate-y-1 transition-all"
                                        >
                                            Finish Examination
                                        </button>
                                    )
                                ) : (
                                    <button
                                        onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                                        className="px-12 py-4 rounded-2xl bg-amber-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-500/20 hover:-translate-y-1 transition-all"
                                    >
                                        Next Question →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side Grid - Question Navigator */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 p-8 overflow-y-auto hidden xl:block">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Navigation Grid</h3>
                    <div className="grid grid-cols-4 gap-3">
                        {currentExam.questions.map((q, idx) => {
                            const isAnswered = !!answers[currentExam.id]?.[q.id];
                            const isCurrent = currentQuestionIdx === idx;
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIdx(idx)}
                                    className={`w-full aspect-square rounded-xl text-xs font-black transition-all border-2 ${isCurrent ? 'bg-amber-500 border-amber-500 text-white scale-110 shadow-lg' : isAnswered ? 'bg-slate-700 border-slate-700 text-slate-100' : 'bg-transparent border-slate-800 text-slate-600 hover:border-slate-700'}`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-12 space-y-4">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                            Current Question
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                            <span className="w-3 h-3 bg-slate-700 rounded-full"></span>
                            Answered
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                            <span className="w-3 h-3 border border-slate-800 rounded-full"></span>
                            Unanswered
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CBTInterface;

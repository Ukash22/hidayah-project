import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const AIHub = () => {
    const [subjects, setSubjects] = useState([]);
    const [selection, setSelection] = useState({ subject_id: '', exam_type: 'JAMB', year_range: '2010-2023' });
    const [generated, setGenerated] = useState(null);
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);
    const [score, setScore] = useState(0);

    const getAuthHeader = () => {
        const token = localStorage.getItem('token') || localStorage.getItem('access');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    useEffect(() => {
        const fetchState = async () => {
            try {
                const [subjRes, profRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/programs/subjects/`, { headers: getAuthHeader() }),
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/me/`, { headers: getAuthHeader() })
                ]);
                setSubjects(subjRes.data);
                setProfile(profRes.data);
            } catch (err) {
                console.error("Failed to load AI Hub state", err);
            }
        };
        fetchState();
    }, []);

    const handleGenerate = async () => {
        setLoading(true);
        setGenerated(null);
        setUserAnswers({});
        setIsSubmitted(false);
        setShowAnswers(false);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/ai/questions/generate/`, selection);
            setGenerated(res.data.questions);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = (questionId, optionKey) => {
        if (isSubmitted) return;
        setUserAnswers({
            ...userAnswers,
            [questionId]: optionKey
        });
    };

    const handleSubmit = () => {
        let correctCount = 0;
        generated.forEach(q => {
            if (userAnswers[q.id] === q.answer) {
                correctCount++;
            }
        });
        setScore((correctCount / generated.length) * 100);
        setIsSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="container pt-32 pb-20">
                {(profile && profile.wallet_balance < 1000) ? (
                    <div className="max-w-3xl mx-auto py-24 text-center bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 opacity-50"></div>
                        <div className="relative z-10 px-10">
                            <div className="w-40 h-40 bg-indigo-50 rounded-full flex items-center justify-center text-8xl mx-auto mb-10 animate-pulse shadow-inner ring-8 ring-indigo-50/50">🤖</div>
                            <h3 className="text-5xl font-display font-bold text-slate-900 mb-6">AI Hub Restricted</h3>
                            <p className="text-slate-500 mb-12 font-medium leading-relaxed italic text-xl max-w-xl mx-auto">
                                To unlock our advanced AI Question Generator and personalized learning simulations, a minimum wallet balance of ₦1,000 is required.
                            </p>
                            <div className="flex flex-col md:flex-row gap-6 justify-center">
                                <button
                                    onClick={() => window.location.href = '/payment'}
                                    className="bg-slate-900 hover:bg-black text-white px-14 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all active:scale-95 group-hover:-translate-y-1"
                                >
                                    Refill Wallet →
                                </button>
                                <button
                                    onClick={() => window.location.href = '/student'}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-14 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-95"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 h-fit sticky top-32">
                            <h2 className="text-2xl font-display text-primary mb-8">AI Question Generator</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Subject</label>
                                    <select
                                        className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100"
                                        value={selection.subject_id}
                                        onChange={(e) => setSelection({ ...selection, subject_id: e.target.value })}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Exam Category</label>
                                    <div className="flex gap-2">
                                        {['JAMB', 'WAEC', 'NECO'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setSelection({ ...selection, exam_type: type })}
                                                className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold text-xs ${selection.exam_type === type ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-50 bg-slate-50 text-slate-400'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !selection.subject_id}
                                    className="btn btn-primary w-full py-4 mt-8 disabled:opacity-50"
                                >
                                    {loading ? '🧠 Generating...' : '✨ Create Questions'}
                                </button>
                            </div>

                            {isSubmitted && (
                                <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Final Result</span>
                                    <div className={`text-5xl font-black mb-4 ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                        {Math.round(score)}%
                                    </div>
                                    <button
                                        onClick={() => setShowAnswers(!showAnswers)}
                                        className="w-full py-3 rounded-xl border-2 border-primary text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary/5 transition-all"
                                    >
                                        {showAnswers ? 'Hide Corrections' : 'Show Correct Answers'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            {generated ? (
                                <div className="space-y-8">
                                    {generated.map((q, idx) => (
                                        <div key={idx} className={`bg-white p-8 rounded-[2rem] shadow-sm transition-all border-2 ${isSubmitted ? (userAnswers[q.id] === q.answer ? 'border-green-100 bg-green-50/20' : 'border-red-100 bg-red-50/20') : 'border-transparent'}`}>
                                            <div className="flex justify-between items-start mb-6">
                                                <p className="font-bold text-lg text-slate-800 flex-1">{idx + 1}. {q.text}</p>
                                                {isSubmitted && (
                                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${userAnswers[q.id] === q.answer ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                        {userAnswers[q.id] === q.answer ? '✓' : '✗'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.options.map((opt, i) => {
                                                    const optionKey = ['A', 'B', 'C', 'D'][i];
                                                    const isSelected = userAnswers[q.id] === optionKey;
                                                    const isCorrect = q.answer === optionKey;

                                                    let style = "bg-slate-50 border-slate-100 text-slate-600";
                                                    if (isSelected) style = "bg-primary text-white border-primary shadow-lg shadow-primary/20";
                                                    if (isSubmitted && isSelected && !isCorrect) style = "bg-red-500 text-white border-red-500";
                                                    if (isSubmitted && isCorrect && (showAnswers || isSelected)) style = "bg-green-600 text-white border-green-600 shadow-lg shadow-green-200";

                                                    return (
                                                        <button
                                                            key={i}
                                                            disabled={isSubmitted}
                                                            onClick={() => handleSelectOption(q.id, optionKey)}
                                                            className={`p-5 rounded-2xl text-sm border-2 transition-all flex items-center gap-4 text-left font-medium ${style} ${!isSubmitted && 'hover:border-primary/30 hover:bg-slate-100'}`}
                                                        >
                                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${isSelected ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                                                {optionKey}
                                                            </span>
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {!isSubmitted && (
                                        <div className="pt-8 flex justify-center">
                                            <button
                                                onClick={handleSubmit}
                                                disabled={Object.keys(userAnswers).length < generated.length}
                                                className="btn btn-secondary px-12 py-5 text-lg shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50"
                                            >
                                                Submit All Answers & Mark
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-24 text-center">
                                    <div className="text-8xl mb-8 animate-bounce">🤖</div>
                                    <h3 className="text-3xl font-display text-slate-800 mb-4 font-black">Ready to Learn?</h3>
                                    <p className="text-slate-500 text-lg max-w-md mx-auto">Select a subject and exam type to generate a personalized practice session with our AI.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIHub;

import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PageHeader } from '../components/layout';

const AIHub = () => {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [selection, setSelection] = useState({ subject_id: '', exam_type: 'JAMB', year_range: '2010-2023' });
    const [generated, setGenerated] = useState(null);
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);
    const [score, setScore] = useState(0);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
        const fetchState = async () => {
            try {
                const [subjRes, profRes] = await Promise.all([
                    api.get(`/api/programs/subjects/`),
                    api.get(`/api/students/me/`)
                ]);
                setSubjects(subjRes.data);
                setProfile(profRes.data);
            } catch (err) {
                console.error('Failed to load AI Hub state', err);
            } finally {
                setProfileLoading(false);
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
            const res = await api.post(`/api/ai/questions/generate/`, selection);
            setGenerated(res.data.questions);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = (questionId, optionKey) => {
        if (isSubmitted) return;
        setUserAnswers({ ...userAnswers, [questionId]: optionKey });
    };

    const handleSubmit = () => {
        let correctCount = 0;
        generated.forEach(q => {
            if (userAnswers[q.id] === q.answer) correctCount++;
        });
        setScore((correctCount / generated.length) * 100);
        setIsSubmitted(true);
    };

    // Wallet gate
    if (!profileLoading && profile && profile.wallet_balance < 1000) {
        return (
            <>
                <title>AI Hub — Hidayah</title>
                <PageHeader title="AI Hub" description="AI-generated practice questions tailored to your exam." />
                <div className="max-w-2xl mx-auto py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-10">
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner">
                            🤖
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">AI Hub Restricted</h3>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            A minimum wallet balance of ₦1,000 is required to unlock the AI Question Generator and personalised practice sessions.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => navigate('/payment')}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                            >
                                Top Up Wallet →
                            </button>
                            <button
                                onClick={() => navigate('/student/overview')}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <title>AI Hub — Hidayah</title>
            <PageHeader
                title="AI Hub"
                description="Generate personalised practice questions using AI. Select a subject and start a session."
            />

            <div className="grid md:grid-cols-3 gap-8">
                {/* Config sidebar */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit sticky top-6">
                    <h2 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                        <Bot size={16} className="text-indigo-500" />
                        Question Generator
                    </h2>
                    <div className="space-y-5">
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-2">Subject</label>
                            <select
                                className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200 font-medium text-slate-800 text-sm outline-none focus:border-indigo-400"
                                value={selection.subject_id}
                                onChange={(e) => setSelection({ ...selection, subject_id: e.target.value })}
                            >
                                <option value="">Select Subject</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-2">Exam Category</label>
                            <div className="flex gap-2">
                                {['JAMB', 'WAEC', 'NECO'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelection({ ...selection, exam_type: type })}
                                        className={`flex-1 py-2.5 rounded-xl border-2 transition-all font-bold text-xs ${
                                            selection.exam_type === type
                                                ? 'border-amber-400 bg-amber-50 text-amber-700'
                                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !selection.subject_id}
                            className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition-all shadow-md shadow-indigo-600/20"
                        >
                            {loading ? '🧠 Generating…' : '✨ Create Questions'}
                        </button>
                    </div>

                    {isSubmitted && (
                        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Your Score</p>
                            <div className={`text-4xl font-bold mb-4 ${score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                {Math.round(score)}%
                            </div>
                            <button
                                onClick={() => setShowAnswers(!showAnswers)}
                                className="w-full py-2.5 rounded-xl border-2 border-indigo-200 text-indigo-600 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all"
                            >
                                {showAnswers ? 'Hide Corrections' : 'Show Correct Answers'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Questions area */}
                <div className="md:col-span-2">
                    {generated ? (
                        <div className="space-y-6">
                            {generated.map((q, idx) => (
                                <div
                                    key={idx}
                                    className={`bg-white p-6 rounded-2xl shadow-sm transition-all border-2 ${
                                        isSubmitted
                                            ? userAnswers[q.id] === q.answer
                                                ? 'border-emerald-200 bg-emerald-50/30'
                                                : 'border-red-200 bg-red-50/20'
                                            : 'border-slate-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="font-bold text-slate-800 flex-1 leading-relaxed">{idx + 1}. {q.text}</p>
                                        {isSubmitted && (
                                            <span className={`ml-3 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${userAnswers[q.id] === q.answer ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                                {userAnswers[q.id] === q.answer ? '✓' : '✗'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {q.options.map((opt, i) => {
                                            const optionKey = ['A', 'B', 'C', 'D'][i];
                                            const isSelected = userAnswers[q.id] === optionKey;
                                            const isCorrect = q.answer === optionKey;

                                            let style = 'bg-slate-50 border-slate-200 text-slate-700';
                                            if (isSelected && !isSubmitted) style = 'bg-indigo-600 text-white border-indigo-600 shadow-md';
                                            if (isSubmitted && isSelected && !isCorrect) style = 'bg-red-500 text-white border-red-500';
                                            if (isSubmitted && isCorrect && (showAnswers || isSelected)) style = 'bg-emerald-600 text-white border-emerald-600 shadow-md';

                                            return (
                                                <button
                                                    key={i}
                                                    disabled={isSubmitted}
                                                    onClick={() => handleSelectOption(q.id, optionKey)}
                                                    className={`p-4 rounded-xl text-sm border-2 transition-all flex items-center gap-3 text-left font-medium ${style} ${!isSubmitted && 'hover:border-indigo-300 hover:bg-slate-100'}`}
                                                >
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-white shadow-sm text-slate-600'}`}>
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
                                <div className="flex justify-center pt-4">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={Object.keys(userAnswers).length < generated.length}
                                        className="px-10 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white rounded-xl font-bold text-sm uppercase tracking-wide transition-all shadow-lg shadow-amber-500/20"
                                    >
                                        Submit All Answers →
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-20 text-center">
                            <div className="flex justify-center mb-6">
                                <Bot size={64} className="text-indigo-200" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Learn?</h3>
                            <p className="text-slate-400 max-w-sm mx-auto">
                                Select a subject and exam type on the left, then click Create Questions to generate a personalised practice session.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AIHub;

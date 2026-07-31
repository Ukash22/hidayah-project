import React, { useState, useEffect, useCallback } from 'react';
import { Bot, BookMarked, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import { PageHeader } from '../components/layout';
import { useToast } from '../context/ToastContext';

const AIHub = () => {
    const navigate = useNavigate();
    const toast = useToast();

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

    // Practice sets
    const [practiceSets, setPracticeSets] = useState([]);
    const [view, setView] = useState('generate'); // 'generate' | 'my-sets'
    const [saveModal, setSaveModal] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [saving, setSaving] = useState(false);
    const [reviewSet, setReviewSet] = useState(null); // set being reviewed in my-sets view

    const fetchSets = useCallback(() => {
        api.get('/api/ai/practice-sets/').then(r => setPracticeSets(r.data)).catch(() => {});
    }, []);

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
        fetchSets();
    }, [fetchSets]);

    const handleGenerate = async () => {
        setLoading(true);
        setGenerated(null);
        setUserAnswers({});
        setIsSubmitted(false);
        setShowAnswers(false);
        setReviewSet(null);
        try {
            const res = await api.post(`/api/ai/questions/generate/`, selection);
            setGenerated(res.data.questions);
            setView('generate');
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

    const openSaveModal = () => {
        const subjectLabel = subjects.find(s => String(s.id) === String(selection.subject_id))?.name || '';
        setSaveTitle(`${subjectLabel} ${selection.exam_type} Practice`.trim());
        setSaveModal(true);
    };

    const handleSave = async () => {
        if (!saveTitle.trim()) { toast.error('Enter a title.'); return; }
        setSaving(true);
        try {
            const subjectLabel = subjects.find(s => String(s.id) === String(selection.subject_id))?.name || '';
            await api.post('/api/ai/practice-sets/', {
                title: saveTitle.trim(),
                subject_name: subjectLabel,
                exam_type: selection.exam_type,
                questions: generated,
            });
            toast.success('Saved to My Practice Sets.');
            setSaveModal(false);
            setSaveTitle('');
            fetchSets();
        } catch (err) {
            toast.error(getApiError(err, 'Failed to save.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSet = async (id) => {
        try {
            await api.delete(`/api/ai/practice-sets/${id}/`);
            toast.success('Practice set deleted.');
            if (reviewSet?.id === id) setReviewSet(null);
            fetchSets();
        } catch (err) {
            toast.error(getApiError(err, 'Failed to delete.'));
        }
    };

    const activeQuestions = view === 'my-sets' && reviewSet ? reviewSet.questions : generated;

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
                actions={
                    <button
                        onClick={() => { setView(v => v === 'my-sets' ? 'generate' : 'my-sets'); setReviewSet(null); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide border transition-all ${view === 'my-sets' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                    >
                        <BookMarked size={13} />
                        My Sets {practiceSets.length > 0 && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${view === 'my-sets' ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'}`}>{practiceSets.length}</span>}
                    </button>
                }
            />

            {view === 'my-sets' ? (
                /* ── My Practice Sets view ── */
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                        {practiceSets.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
                                <BookMarked size={36} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500 font-semibold text-sm">No saved sets yet.</p>
                                <p className="text-[11px] text-slate-400 mt-1">Generate questions and save them here.</p>
                            </div>
                        ) : practiceSets.map(s => (
                            <div
                                key={s.id}
                                onClick={() => setReviewSet(s)}
                                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 cursor-pointer transition-all shadow-sm hover:border-indigo-300 ${reviewSet?.id === s.id ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{s.title}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                                            {s.subject_name} · {s.exam_type} · {s.question_count}Q
                                        </p>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDeleteSet(s.id); }}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="md:col-span-2">
                        {reviewSet ? (
                            <div className="space-y-5">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{reviewSet.title}</h3>
                                    <button onClick={() => setReviewSet(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 transition-all"><X size={13} /></button>
                                </div>
                                {reviewSet.questions.map((q, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border-2 border-slate-200 dark:border-slate-700">
                                        <p className="font-bold text-slate-800 dark:text-slate-200 mb-4 leading-relaxed">{idx + 1}. {q.text}</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {q.options.map((opt, i) => {
                                                const optionKey = ['A', 'B', 'C', 'D'][i];
                                                const isCorrect = q.answer === optionKey;
                                                return (
                                                    <div key={i} className={`p-4 rounded-xl text-sm border-2 flex items-center gap-3 font-medium ${isCorrect ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${isCorrect ? 'bg-white/20' : 'bg-white dark:bg-slate-700 shadow-sm text-slate-600 dark:text-slate-300'}`}>{optionKey}</span>
                                                        {opt}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-20 text-center">
                                <BookMarked size={48} className="mx-auto text-indigo-200 mb-4" />
                                <p className="text-slate-400 font-semibold">Select a set on the left to review its questions.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* ── Generate view ── */
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Config sidebar */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit sticky top-6">
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2">
                            <Bot size={16} className="text-indigo-500" />
                            Question Generator
                        </h2>
                        <div className="space-y-5">
                            <div>
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-2">Subject</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-indigo-400"
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
                                                    : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:border-slate-200'
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

                            {generated && !isSubmitted && (
                                <button
                                    onClick={openSaveModal}
                                    className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <BookMarked size={13} /> Save to My Sets
                                </button>
                            )}
                        </div>

                        {isSubmitted && (
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Your Score</p>
                                <div className={`text-4xl font-bold mb-4 ${score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {Math.round(score)}%
                                </div>
                                <button
                                    onClick={() => setShowAnswers(!showAnswers)}
                                    className="w-full py-2.5 rounded-xl border-2 border-indigo-200 text-indigo-600 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all mb-3"
                                >
                                    {showAnswers ? 'Hide Corrections' : 'Show Correct Answers'}
                                </button>
                                <button
                                    onClick={openSaveModal}
                                    className="w-full py-2.5 rounded-xl border-2 border-indigo-100 text-indigo-500 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <BookMarked size={13} /> Save Questions
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
                                        className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm transition-all border-2 ${
                                            isSubmitted
                                                ? userAnswers[q.id] === q.answer
                                                    ? 'border-emerald-200 bg-emerald-50/30'
                                                    : 'border-red-200 bg-red-50/20'
                                                : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 flex-1 leading-relaxed">{idx + 1}. {q.text}</p>
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

                                                let style = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                                                if (isSelected && !isSubmitted) style = 'bg-indigo-600 text-white border-indigo-600 shadow-md';
                                                if (isSubmitted && isSelected && !isCorrect) style = 'bg-red-500 text-white border-red-500';
                                                if (isSubmitted && isCorrect && (showAnswers || isSelected)) style = 'bg-emerald-600 text-white border-emerald-600 shadow-md';

                                                return (
                                                    <button
                                                        key={i}
                                                        disabled={isSubmitted}
                                                        onClick={() => handleSelectOption(q.id, optionKey)}
                                                        className={`p-4 rounded-xl text-sm border-2 transition-all flex items-center gap-3 text-left font-medium ${style} ${!isSubmitted && 'hover:border-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                                    >
                                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-white dark:bg-slate-700 shadow-sm text-slate-600 dark:text-slate-300'}`}>
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
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-20 text-center">
                                <div className="flex justify-center mb-6">
                                    <Bot size={64} className="text-indigo-200" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Ready to Learn?</h3>
                                <p className="text-slate-400 max-w-sm mx-auto">
                                    Select a subject and exam type on the left, then click Create Questions to generate a personalised practice session.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Save modal */}
            {saveModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <BookMarked size={16} className="text-indigo-500" /> Save Practice Set
                            </h3>
                            <button onClick={() => setSaveModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 transition-all"><X size={13} /></button>
                        </div>
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-2">Title</label>
                        <input
                            value={saveTitle}
                            onChange={e => setSaveTitle(e.target.value)}
                            placeholder="e.g. Physics JAMB Practice"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-400 mb-5 transition-all"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setSaveModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving || !saveTitle.trim()} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold uppercase tracking-wide transition-all">
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AIHub;

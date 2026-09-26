import React, { useState, useEffect, useMemo } from 'react';
import { 
    CheckCircle2, Circle, Clock, BookOpen, Plus, Sparkles, 
    Check, Trash2, Edit2, ChevronDown, ChevronUp, AlertCircle, 
    FileText, Calendar, Filter, X
} from 'lucide-react';
import api, { asList, getApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function SchemeOfWorkView({ 
    studentId = null, 
    batchId = null, 
    subjectId = null, 
    isTutor = false,
    title = "Scheme of Work",
    subtitle = "Weekly curriculum roadmap and progress tracker"
}) {
    const toast = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'PENDING'

    // Add / Edit Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('ADD'); // 'ADD' | 'EDIT'
    const [activeItem, setActiveItem] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    // Form fields
    const [formWeek, setFormWeek] = useState(1);
    const [formTopic, setFormTopic] = useState('');
    const [formObjectives, setFormObjectives] = useState('');
    const [formNotes, setFormNotes] = useState('');

    // Fetch scheme of work items
    const fetchItems = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (studentId) params.student_id = studentId;
            if (batchId) params.batch_id = batchId;
            if (subjectId) params.subject_id = subjectId;

            const res = await api.get('/api/classes/scheme-of-work/', { params });
            setItems(asList(res.data));
        } catch (err) {
            console.error("Failed to load scheme of work:", err);
            setError(getApiError(err, 'Failed to load scheme of work.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [studentId, batchId, subjectId]);

    // Metrics
    const total = items.length;
    const completedList = useMemo(() => items.filter(i => i.is_completed), [items]);
    const completedCount = completedList.length;
    const pendingCount = total - completedCount;
    const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    // Filtered list
    const filteredItems = useMemo(() => {
        if (filter === 'COMPLETED') return items.filter(i => i.is_completed);
        if (filter === 'PENDING') return items.filter(i => !i.is_completed);
        return items;
    }, [items, filter]);

    // Handle toggle complete
    const handleToggle = async (item) => {
        if (!isTutor) return;
        
        // Optimistic UI update
        const prevCompleted = item.is_completed;
        const nextCompleted = !prevCompleted;
        
        setItems(prev => prev.map(i => i.id === item.id ? { 
            ...i, 
            is_completed: nextCompleted, 
            completed_at: nextCompleted ? new Date().toISOString() : null 
        } : i));

        try {
            const res = await api.post(`/api/classes/scheme-of-work/${item.id}/toggle/`);
            // Update with actual response data
            setItems(prev => prev.map(i => i.id === item.id ? res.data : i));
            toast?.success?.(
                nextCompleted 
                    ? `Week ${item.week_number} marked as completed!` 
                    : `Week ${item.week_number} marked as pending.`
            );
        } catch (err) {
            // Revert optimistic update
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: prevCompleted } : i));
            toast?.error?.(getApiError(err, 'Failed to update topic status.'));
        }
    };

    // Open Add Modal
    const openAddModal = () => {
        setModalMode('ADD');
        setActiveItem(null);
        const nextWeek = items.length > 0 ? Math.max(...items.map(i => i.week_number)) + 1 : 1;
        setFormWeek(nextWeek);
        setFormTopic('');
        setFormObjectives('');
        setFormNotes('');
        setShowModal(true);
    };

    // Open Edit Modal
    const openEditModal = (item) => {
        setModalMode('EDIT');
        setActiveItem(item);
        setFormWeek(item.week_number);
        setFormTopic(item.topic);
        setFormObjectives(item.learning_objectives || '');
        setFormNotes(item.tutor_notes || '');
        setShowModal(true);
    };

    // Handle Form Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formTopic.trim()) {
            toast?.error?.('Please enter a topic title.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                week_number: parseInt(formWeek, 10) || 1,
                topic: formTopic.trim(),
                learning_objectives: formObjectives.trim(),
                tutor_notes: formNotes.trim(),
            };

            if (studentId) payload.student = studentId;
            if (batchId) payload.batch = batchId;
            if (subjectId) payload.subject = subjectId;

            if (modalMode === 'ADD') {
                const res = await api.post('/api/classes/scheme-of-work/', payload);
                setItems(prev => [...prev, res.data].sort((a, b) => a.week_number - b.week_number));
                toast?.success?.('New topic added to Scheme of Work!');
            } else {
                const res = await api.put(`/api/classes/scheme-of-work/${activeItem.id}/`, payload);
                setItems(prev => prev.map(i => i.id === activeItem.id ? res.data : i));
                toast?.success?.('Topic updated successfully!');
            }
            setShowModal(false);
        } catch (err) {
            toast?.error?.(getApiError(err, 'Failed to save topic.'));
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Delete
    const handleDelete = async (item) => {
        if (!window.confirm(`Delete Week ${item.week_number}: "${item.topic}"?`)) return;
        try {
            await api.delete(`/api/classes/scheme-of-work/${item.id}/`);
            setItems(prev => prev.filter(i => i.id !== item.id));
            toast?.success?.('Topic deleted.');
        } catch (err) {
            toast?.error?.(getApiError(err, 'Failed to delete topic.'));
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. HERO PROGRESS CARD */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-900/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-primary-light text-xs font-bold tracking-widest uppercase">
                            <Sparkles size={14} className="text-amber-400" />
                            Academic Curriculum Tracker
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{title}</h2>
                        <p className="text-slate-400 text-sm max-w-md">
                            {subtitle}
                        </p>
                    </div>

                    {/* Progress Card Container */}
                    <div className="w-full md:w-72 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <span className="text-xs text-slate-400 font-semibold block">Curriculum Covered</span>
                                <span className="text-2xl font-black text-white">{progressPercent}%</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                                {completedCount} / {total} Achieved
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div 
                                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-primary rounded-full transition-all duration-700 ease-out shadow-sm shadow-emerald-500/50"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
                    <div className="bg-white/5 rounded-2xl p-3 sm:p-4 text-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Topics</span>
                        <span className="text-xl sm:text-2xl font-black text-white">{total}</span>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 sm:p-4 text-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">Achieved</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-400">{completedCount}</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 sm:p-4 text-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">Remaining</span>
                        <span className="text-xl sm:text-2xl font-black text-amber-400">{pendingCount}</span>
                    </div>
                </div>
            </div>

            {/* 2. CONTROLS & FILTER BAR */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            filter === 'ALL' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        All ({total})
                    </button>
                    <button
                        onClick={() => setFilter('PENDING')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            filter === 'PENDING' 
                                ? 'bg-white text-amber-600 shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        In Progress ({pendingCount})
                    </button>
                    <button
                        onClick={() => setFilter('COMPLETED')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            filter === 'COMPLETED' 
                                ? 'bg-white text-emerald-600 shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Completed ({completedCount})
                    </button>
                </div>

                {/* Tutor Add Button */}
                {isTutor && (
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                    >
                        <Plus size={16} /> Add Weekly Topic
                    </button>
                )}
            </div>

            {/* 3. SYLLABUS TIMELINE LIST */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
                {loading ? (
                    <div className="py-16 text-center space-y-3">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-slate-400 text-sm font-semibold">Loading syllabus scheme...</p>
                    </div>
                ) : error ? (
                    <div className="py-12 text-center space-y-3 text-red-500">
                        <AlertCircle size={32} className="mx-auto text-red-400" />
                        <p className="text-sm font-bold">{error}</p>
                        <button onClick={fetchItems} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200">Retry</button>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-16 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
                            <BookOpen size={28} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 text-base">No topics in this view</h4>
                            <p className="text-slate-400 text-xs max-w-sm mx-auto">
                                {isTutor 
                                    ? "Start by adding the first week's learning topic above." 
                                    : "Your teacher has not uploaded the topics for this view yet."}
                            </p>
                        </div>
                        {isTutor && (
                            <button
                                onClick={openAddModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary-dark transition"
                            >
                                <Plus size={14} /> Add First Topic
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredItems.map((item, index) => {
                            const isCurrentFocus = !item.is_completed && items.filter(i => !i.is_completed)[0]?.id === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-start gap-4 ${
                                        item.is_completed
                                            ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                                            : isCurrentFocus
                                                ? 'bg-blue-50/40 border-blue-300 shadow-md shadow-blue-500/5 ring-1 ring-blue-300'
                                                : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
                                    }`}
                                >
                                    {/* Action Toggle Button / Check Status */}
                                    <div className="pt-0.5">
                                        {isTutor ? (
                                            <button
                                                type="button"
                                                onClick={() => handleToggle(item)}
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                                    item.is_completed
                                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-300 hover:bg-emerald-600 scale-105'
                                                        : 'border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-transparent hover:text-emerald-400'
                                                }`}
                                                title={item.is_completed ? "Click to mark incomplete" : "Click to mark complete"}
                                            >
                                                <Check size={18} strokeWidth={3} className={item.is_completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'} />
                                            </button>
                                        ) : (
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                item.is_completed
                                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                                                    : isCurrentFocus
                                                        ? 'bg-blue-500 text-white animate-pulse'
                                                        : 'border-2 border-slate-200 text-slate-300'
                                            }`}>
                                                {item.is_completed ? <Check size={18} strokeWidth={3} /> : <Circle size={10} />}
                                            </div>
                                        )}
                                    </div>

                                    {/* Topic Content Body */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                                Week {item.week_number}
                                            </span>

                                            {item.is_completed && (
                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Completed
                                                </span>
                                            )}

                                            {isCurrentFocus && (
                                                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Clock size={12} /> Current Focus
                                                </span>
                                            )}

                                            {item.subject_name && (
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    • {item.subject_name}
                                                </span>
                                            )}
                                        </div>

                                        <h4 className={`text-base font-bold transition-all ${
                                            item.is_completed 
                                                ? 'text-slate-600 line-through decoration-slate-300' 
                                                : 'text-slate-900'
                                        }`}>
                                            {item.topic}
                                        </h4>

                                        {item.learning_objectives && (
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-line">
                                                {item.learning_objectives}
                                            </p>
                                        )}

                                        {item.tutor_notes && (
                                            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
                                                <FileText size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-bold block text-[11px] text-amber-800">Teacher's Note:</span>
                                                    {item.tutor_notes}
                                                </div>
                                            </div>
                                        )}

                                        {item.completed_at && (
                                            <span className="text-[10px] text-slate-400 mt-2 block">
                                                Achieved on {new Date(item.completed_at).toLocaleDateString(undefined, {
                                                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                                })}
                                            </span>
                                        )}
                                    </div>

                                    {/* Tutor Actions Menu */}
                                    {isTutor && (
                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                                title="Edit topic"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Delete topic"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 4. ADD / EDIT TOPIC MODAL (Tutors only) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
                        >
                            <X size={18} />
                        </button>

                        <div className="mb-6">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">
                                {modalMode === 'ADD' ? 'New Curriculum Item' : 'Update Topic'}
                            </span>
                            <h3 className="text-xl font-black text-slate-900">
                                {modalMode === 'ADD' ? 'Add Weekly Topic' : 'Edit Scheme Topic'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                                        Week #
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="52"
                                        value={formWeek}
                                        onChange={(e) => setFormWeek(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900 outline-none focus:border-primary focus:bg-white"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                                        Topic Title *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Introduction to Algebra"
                                        value={formTopic}
                                        onChange={(e) => setFormTopic(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900 outline-none focus:border-primary focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                                    Learning Objectives / Subtopics
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Key concepts to cover, expected outcomes, or practice exercises..."
                                    value={formObjectives}
                                    onChange={(e) => setFormObjectives(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-primary focus:bg-white resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                                    Tutor Note / Homework (Optional)
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Remarks on performance, assigned exercises, etc."
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-primary focus:bg-white resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition shadow-md shadow-primary/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : modalMode === 'ADD' ? 'Add Topic' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

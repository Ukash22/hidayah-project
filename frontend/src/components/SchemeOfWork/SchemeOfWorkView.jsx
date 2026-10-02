import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    CheckCircle2, Circle, Clock, BookOpen, Plus, Sparkles, 
    Check, Trash2, Edit2, AlertCircle, FileText, Filter, X,
    Search, Layers
} from 'lucide-react';
import api, { asList, getApiError } from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';

export default function SchemeOfWorkView({ 
    studentId = null, 
    batchId = null, 
    subjectId = null, 
    isTutor = false,
    title = "Scheme of Work",
    subtitle = "Weekly curriculum roadmap and progress tracker"
}) {
    const toast = useToast();
    const confirm = useConfirm();
    
    // Core state
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'
    const [selectedSubject, setSelectedSubject] = useState('ALL'); // 'ALL' | subject_name
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectsList, setSubjectsList] = useState([]);

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
    const [formSubjectId, setFormSubjectId] = useState('');

    // Load available subjects for selector dropdown
    useEffect(() => {
        let mounted = true;
        api.get('/api/programs/subjects/')
            .then(res => {
                if (mounted) {
                    setSubjectsList(asList(res.data));
                }
            })
            .catch(() => {});
        return () => { mounted = false; };
    }, []);

    // Fetch scheme of work items
    const fetchItems = useCallback(async () => {
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
    }, [studentId, batchId, subjectId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Discovered unique subjects from items
    const distinctSubjectNames = useMemo(() => {
        const names = new Set();
        items.forEach(i => {
            if (i.subject_name) names.add(i.subject_name);
        });
        return Array.from(names);
    }, [items]);

    // Items filtered by subject first (for metrics & display)
    const subjectScopedItems = useMemo(() => {
        if (selectedSubject === 'ALL') return items;
        return items.filter(i => i.subject_name === selectedSubject);
    }, [items, selectedSubject]);

    // Metrics for the currently selected subject scope
    const total = subjectScopedItems.length;
    const completedList = useMemo(() => subjectScopedItems.filter(i => i.is_completed), [subjectScopedItems]);
    const completedCount = completedList.length;
    const pendingCount = total - completedCount;
    const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    // Filtered list applying status filter + search query
    const filteredItems = useMemo(() => {
        let list = subjectScopedItems;
        if (statusFilter === 'COMPLETED') list = list.filter(i => i.is_completed);
        if (statusFilter === 'PENDING') list = list.filter(i => !i.is_completed);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(i => 
                (i.topic && i.topic.toLowerCase().includes(q)) ||
                (i.learning_objectives && i.learning_objectives.toLowerCase().includes(q)) ||
                (i.tutor_notes && i.tutor_notes.toLowerCase().includes(q)) ||
                (`week ${i.week_number}`.includes(q))
            );
        }
        return list;
    }, [subjectScopedItems, statusFilter, searchQuery]);

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
        // Compute next week number based on current subject scope
        const currentWeeks = subjectScopedItems.map(i => i.week_number);
        const nextWeek = currentWeeks.length > 0 ? Math.max(...currentWeeks) + 1 : 1;
        
        setFormWeek(nextWeek);
        setFormTopic('');
        setFormObjectives('');
        setFormNotes('');
        
        // Default subject: either subjectId prop or selected subject if matched
        let defaultSub = subjectId || '';
        if (!defaultSub && selectedSubject !== 'ALL') {
            const match = subjectsList.find(s => s.name === selectedSubject);
            if (match) defaultSub = match.id;
        }
        setFormSubjectId(defaultSub);
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
        setFormSubjectId(item.subject || subjectId || '');
        setShowModal(true);
    };

    // Handle Form Submit (Add or Edit)
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

            if (formSubjectId) {
                payload.subject = formSubjectId;
            } else if (subjectId) {
                payload.subject = subjectId;
            }

            if (modalMode === 'ADD') {
                if (studentId) payload.student = studentId;
                if (batchId) payload.batch = batchId;
                const res = await api.post('/api/classes/scheme-of-work/', payload);
                setItems(prev => [...prev, res.data].sort((a, b) => a.week_number - b.week_number));
                toast?.success?.('New topic added to Scheme of Work!');
            } else {
                const res = await api.patch(`/api/classes/scheme-of-work/${activeItem.id}/`, payload);
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
        const ok = await confirm(`Are you sure you want to delete Week ${item.week_number}: "${item.topic}"?`, {
            danger: true,
            confirmLabel: 'Delete Topic'
        });
        if (!ok) return;
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

            {/* 2. CONTROLS, FILTERS & SEARCH BAR */}
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                    {/* Status Filter Pills */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                statusFilter === 'ALL' 
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' 
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            All ({total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('PENDING')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                statusFilter === 'PENDING' 
                                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' 
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            In Progress ({pendingCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('COMPLETED')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                statusFilter === 'COMPLETED' 
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            Completed ({completedCount})
                        </button>
                    </div>

                    {/* Right side: Search & Tutor Add Button */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 sm:w-60">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search topics..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-primary transition"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Tutor Add Button */}
                        {isTutor && (
                            <button
                                type="button"
                                onClick={openAddModal}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 whitespace-nowrap"
                            >
                                <Plus size={16} /> Add Weekly Topic
                            </button>
                        )}
                    </div>
                </div>

                {/* Subject Tabs Filter (if multiple subjects exist) */}
                {distinctSubjectNames.length > 1 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto pb-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                            <Layers size={13} /> Subject:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedSubject('ALL')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                selectedSubject === 'ALL'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                        >
                            All Subjects
                        </button>
                        {distinctSubjectNames.map(subName => (
                            <button
                                key={subName}
                                type="button"
                                onClick={() => setSelectedSubject(subName)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                    selectedSubject === subName
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                            >
                                {subName}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. SYLLABUS TIMELINE LIST */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-6">
                {loading ? (
                    <div className="py-16 text-center space-y-3">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-slate-400 text-sm font-semibold">Loading syllabus scheme...</p>
                    </div>
                ) : error ? (
                    <div className="py-12 text-center space-y-3 text-red-500">
                        <AlertCircle size={32} className="mx-auto text-red-400" />
                        <p className="text-sm font-bold">{error}</p>
                        <button 
                            onClick={fetchItems} 
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            Retry
                        </button>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-16 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
                            <BookOpen size={28} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">No topics in this view</h4>
                            <p className="text-slate-400 text-xs max-w-sm mx-auto">
                                {isTutor 
                                    ? "Start by adding the first week's learning topic above." 
                                    : "Your teacher has not uploaded the topics for this view yet."}
                            </p>
                        </div>
                        {isTutor && (
                            <button
                                type="button"
                                onClick={openAddModal}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary-dark transition"
                            >
                                <Plus size={14} /> Add First Topic
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredItems.map((item) => {
                            const isCurrentFocus = !item.is_completed && filteredItems.filter(i => !i.is_completed)[0]?.id === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-start gap-4 ${
                                        item.is_completed
                                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/50 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30'
                                            : isCurrentFocus
                                                ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700/60 shadow-md shadow-blue-500/5 ring-1 ring-blue-300 dark:ring-blue-700'
                                                : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
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
                                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-300 dark:shadow-none hover:bg-emerald-600 scale-105'
                                                        : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-transparent hover:text-emerald-400'
                                                }`}
                                                title={item.is_completed ? "Click to mark incomplete" : "Click to mark complete"}
                                            >
                                                <Check size={18} strokeWidth={3} className={item.is_completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'} />
                                            </button>
                                        ) : (
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                item.is_completed
                                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-none'
                                                    : isCurrentFocus
                                                        ? 'bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                                                        : 'border-2 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                                            }`}>
                                                {item.is_completed ? <Check size={18} strokeWidth={3} /> : <Circle size={10} />}
                                            </div>
                                        )}
                                    </div>

                                    {/* Topic Content Body */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                Week {item.week_number}
                                            </span>

                                            {item.is_completed && (
                                                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Completed
                                                </span>
                                            )}

                                            {isCurrentFocus && (
                                                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Clock size={12} /> Current Focus
                                                </span>
                                            )}

                                            {item.subject_name && (
                                                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                                    • {item.subject_name}
                                                </span>
                                            )}

                                            {item.batch_name && (
                                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                                                    Batch: {item.batch_name}
                                                </span>
                                            )}
                                        </div>

                                        <h4 className={`text-base font-bold transition-all ${
                                            item.is_completed 
                                                ? 'text-slate-600 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600' 
                                                : 'text-slate-900 dark:text-slate-100'
                                        }`}>
                                            {item.topic}
                                        </h4>

                                        {item.learning_objectives && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed whitespace-pre-line">
                                                {item.learning_objectives}
                                            </p>
                                        )}

                                        {item.tutor_notes && (
                                            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                                                <FileText size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-bold block text-[11px] text-amber-800 dark:text-amber-300">Teacher's Note:</span>
                                                    {item.tutor_notes}
                                                </div>
                                            </div>
                                        )}

                                        {item.completed_at && (
                                            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 block">
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
                                                type="button"
                                                onClick={() => openEditModal(item)}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                title="Edit topic"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(item)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
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
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
                >
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Close"
                        >
                            <X size={18} />
                        </button>

                        <div className="mb-6">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">
                                {modalMode === 'ADD' ? 'New Curriculum Item' : 'Update Topic'}
                            </span>
                            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                                {modalMode === 'ADD' ? 'Add Weekly Topic' : 'Edit Scheme Topic'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                                        Week #
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="52"
                                        value={formWeek}
                                        onChange={(e) => setFormWeek(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                                        Topic Title *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Introduction to Tajweed"
                                        value={formTopic}
                                        onChange={(e) => setFormTopic(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800"
                                    />
                                </div>
                            </div>

                            {/* Subject Selector */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                                    Subject (Optional)
                                </label>
                                <select
                                    value={formSubjectId}
                                    onChange={(e) => setFormSubjectId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-primary"
                                >
                                    <option value="">General / Default Subject</option>
                                    {subjectsList.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                                    Learning Objectives / Subtopics
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Key concepts to cover, expected outcomes, or practice exercises..."
                                    value={formObjectives}
                                    onChange={(e) => setFormObjectives(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800 resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                                    Tutor Note / Homework (Optional)
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Remarks on performance, assigned exercises, etc."
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-800 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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

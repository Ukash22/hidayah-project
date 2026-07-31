import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import api, { asList, getApiError } from '../../services/api';
import { PageHeader } from '../../components/layout';
import { StatusBadge, getCountryFlag, getLocalTime } from './adminHelpers';
import { SkeletonCard } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

function BatchesTab() {
    const toast = useToast();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [tutors, setTutors] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [form, setForm] = useState({ name: '', description: '', tutor: '', subject: '' });
    const [creating, setCreating] = useState(false);
    const [addingStudentId, setAddingStudentId] = useState('');

    const fetchBatches = useCallback(async () => {
        try {
            const res = await api.get('/api/classes/batches/?active=false');
            setBatches(asList(res.data));
        } catch { /* silent */ } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchBatches();
        Promise.all([
            api.get('/api/tutors/admin/list/'),
            api.get('/api/programs/subjects/'),
            api.get('/api/students/admin/list/'),
        ]).then(([t, s, st]) => {
            setTutors(asList(t.data));
            setSubjects(asList(s.data));
            setAllStudents(asList(st.data));
        }).catch(() => {});
    }, [fetchBatches]);

    const handleCreate = async () => {
        if (!form.name || !form.tutor) { toast.error('Name and tutor are required'); return; }
        setCreating(true);
        try {
            await api.post('/api/classes/batches/', form);
            toast.success('Batch created');
            setShowCreate(false);
            setForm({ name: '', description: '', tutor: '', subject: '' });
            fetchBatches();
        } catch (err) { toast.error(getApiError(err, 'Failed to create batch')); }
        finally { setCreating(false); }
    };

    const handleAddStudent = async (batchId) => {
        if (!addingStudentId) return;
        try {
            await api.post(`/api/classes/batches/${batchId}/students/add/`, { student_ids: [addingStudentId] });
            toast.success('Student added');
            setAddingStudentId('');
            fetchBatches();
        } catch (err) { toast.error(getApiError(err, 'Failed to add student')); }
    };

    const handleRemoveStudent = async (batchId, studentId) => {
        try {
            await api.post(`/api/classes/batches/${batchId}/students/remove/`, { student_ids: [studentId] });
            toast.success('Student removed');
            fetchBatches();
        } catch (err) { toast.error(getApiError(err, 'Failed to remove student')); }
    };

    const handleToggleActive = async (batch) => {
        try {
            await api.put(`/api/classes/batches/${batch.id}/`, { is_active: !batch.is_active });
            toast.success(batch.is_active ? 'Batch deactivated' : 'Batch reactivated');
            fetchBatches();
        } catch (err) { toast.error(getApiError(err, 'Failed to update batch')); }
    };

    if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => setShowCreate(v => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all shadow-md"
                >
                    <Plus size={14} /> New Batch
                </button>
            </div>

            {showCreate && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Create Study Batch</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-1">Batch Name</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. JAMB 2025 — Group A"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-400" />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-1">Tutor</label>
                            <select value={form.tutor} onChange={e => setForm(f => ({ ...f, tutor: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-400">
                                <option value="">Select tutor…</option>
                                {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name || t.username}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-1">Subject (optional)</label>
                            <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-400">
                                <option value="">All subjects</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 block mb-1">Description</label>
                            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Optional notes"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-400" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleCreate} disabled={creating}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all">
                            {creating ? 'Creating…' : 'Create Batch'}
                        </button>
                        <button onClick={() => setShowCreate(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {batches.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 text-center">
                    <Users size={40} className="mx-auto text-slate-300 mb-4" />
                    <p className="font-semibold text-slate-500">No study batches yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Create one to group students under a tutor.</p>
                </div>
            ) : batches.map(batch => (
                <div key={batch.id} className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm transition-all ${batch.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-60'}`}>
                    <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => setExpanded(expanded === batch.id ? null : batch.id)}>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                                <Users size={18} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{batch.name}</p>
                                <p className="text-[11px] text-slate-400 font-semibold">
                                    Tutor: {batch.tutor_name} · {batch.subject_name || 'All subjects'} · {batch.student_count} student{batch.student_count !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={e => { e.stopPropagation(); handleToggleActive(batch); }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${batch.is_active ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                {batch.is_active ? 'Deactivate' : 'Reactivate'}
                            </button>
                            {expanded === batch.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                    </div>

                    {expanded === batch.id && (
                        <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-4">
                            {batch.description && <p className="text-[12px] text-slate-500">{batch.description}</p>}

                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">Students ({batch.student_count})</p>
                                <div className="space-y-2">
                                    {batch.students_detail?.map(s => (
                                        <div key={s.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s.name}</p>
                                                <p className="text-[10px] text-slate-400">{s.email}</p>
                                            </div>
                                            <button onClick={() => handleRemoveStudent(batch.id, s.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <select value={addingStudentId} onChange={e => setAddingStudentId(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400">
                                    <option value="">Add a student…</option>
                                    {allStudents
                                        .filter(s => !batch.students_detail?.find(bd => bd.id === s.id))
                                        .map(s => <option key={s.id} value={s.id}>{s.full_name || s.username}</option>)}
                                </select>
                                <button onClick={() => handleAddStudent(batch.id)} disabled={!addingStudentId}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all">
                                    Add
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function AdminClasses() {
    const navigate = useNavigate();
    const [allClasses, setAllClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('regular');

    const fetchClasses = useCallback(async () => {
        try {
            const res = await api.get('/api/classes/admin/unified-list/');
            setAllClasses(asList(res.data));
        } catch (err) {
            console.error('Classes fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchClasses(); }, [fetchClasses]);

    const regularClasses = allClasses.filter(c => c.type !== 'TRIAL');
    const trialClasses = allClasses.filter(c => c.type === 'TRIAL');
    const liveClasses = (view === 'regular' ? regularClasses : trialClasses).filter(c => c.is_live);
    const displayClasses = view === 'regular' ? regularClasses : trialClasses;

    if (loading && view !== 'batches') return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Classes — Hidayah Admin</title>
            <PageHeader title="Academic Schedule" description="Platform-wide class management, live session monitoring, and study batch groups." />

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit mb-6 gap-1">
                {['regular', 'trials', 'batches'].map(v => (
                    <button key={v} onClick={() => setView(v)}
                        className={`px-5 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all ${view === v ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-600'}`}>
                        {v === 'regular' ? `Regular (${regularClasses.length})` : v === 'trials' ? `Trials (${trialClasses.length})` : 'Study Batches'}
                    </button>
                ))}
            </div>

            {view === 'batches' ? <BatchesTab /> : (
                <>
                    {liveClasses.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-card-lg p-5 md:p-8 mb-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                                </div>
                                <h3 className="text-[11px] font-bold text-red-600 uppercase tracking-[0.2em]">Live Session Monitor ({liveClasses.length})</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {liveClasses.map(liveCls => (
                                    <div key={liveCls.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-500/10 flex items-center justify-between group hover:shadow-xl transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-2xl">📹</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{liveCls.student_name}</p>
                                                <p className="text-[11px] text-red-500 font-semibold uppercase tracking-tighter">Tr. {liveCls.tutor_name}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/live/${liveCls.db_id || liveCls.id}`)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide hover:bg-red-700 transition-all shadow-lg"
                                        >
                                            Monitor
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-slate-900 rounded-card shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-500 text-[11px] uppercase font-semibold tracking-wide border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-6 py-5">Flag</th>
                                        <th className="px-4 py-5">Schedule</th>
                                        <th className="px-4 py-5">Student & Region</th>
                                        <th className="px-4 py-5">Course & Tutor</th>
                                        <th className="px-4 py-5 text-center">Status</th>
                                        <th className="px-6 py-5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {displayClasses.length === 0 ? (
                                        <tr><td colSpan="6" className="p-32 text-center text-slate-500 italic">No {view === 'regular' ? 'regular classes' : 'trial sessions'} found.</td></tr>
                                    ) : displayClasses.map(cls => (
                                        <tr key={cls.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all ${cls.is_live ? 'bg-red-500/5' : ''}`}>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                                                        {getCountryFlag(cls.country)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{new Date(cls.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                <div className="text-[11px] text-emerald-500 font-semibold uppercase tracking-tight mt-1">{new Date(cls.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 text-[13px] flex items-center gap-2 uppercase tracking-tight">
                                                    {cls.student_name}
                                                    <span className={cls.gender === 'Female' ? 'text-pink-400' : 'text-blue-400'}>{cls.gender === 'Female' ? '♀' : '♂'}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-semibold uppercase mt-1">
                                                    {cls.timezone || 'UTC'} · <span className="text-emerald-500">{getLocalTime(cls.timezone)}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="text-[12px] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-tight">{cls.subject || 'General Study'}</div>
                                                <div className="flex items-center gap-2 mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 w-fit rounded-lg">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Tr. {cls.tutor_name}</div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <StatusBadge
                                                    status={
                                                        cls.status === 'COMPLETED' ? 'COMPLETED' :
                                                        cls.is_live ? (cls.is_started ? 'LIVE_STARTED' : 'LIVE_WAITING') :
                                                        new Date(cls.scheduled_at) > new Date() ? 'UPCOMING' : 'ENDED'
                                                    }
                                                />
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex justify-center">
                                                    <button
                                                        onClick={() => navigate(`/live/${cls.db_id || cls.id}`)}
                                                        className={`px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all shadow-lg flex items-center gap-2 ${cls.is_live ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/30' : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-900/20'}`}
                                                    >
                                                        <span>📹</span>
                                                        <span>{cls.is_live ? 'Monitor' : 'Room Link'}</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

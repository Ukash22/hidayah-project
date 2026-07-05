import { useState, useEffect, useCallback } from 'react';
import api, { asList } from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

export default function AdminCurriculum() {
    const toast = useToast();
    const confirm = useConfirm();
    const [programs, setPrograms] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showProgramModal, setShowProgramModal] = useState(false);
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [programForm, setProgramForm] = useState({ name: '', program_type: 'WESTERN', description: '' });
    const [subjectForm, setSubjectForm] = useState({ name: '', program: '', admin_percentage: 5.00 });
    const [saving, setSaving] = useState(false);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [savingStatus, setSavingStatus] = useState({});

    const fetchAll = useCallback(async () => {
        try {
            const [progRes, subjRes, matRes] = await Promise.all([
                api.get('/api/programs/list/'),
                api.get('/api/programs/subjects/'),
                api.get('/api/curriculum/materials/'),
            ]);
            setPrograms(asList(progRes.data));
            setSubjects(asList(subjRes.data));
            setMaterials(asList(matRes.data));
        } catch (err) {
            console.error('Curriculum fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreateProgram = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/api/programs/list/', programForm);
            toast.success('Program Created Successfully!');
            setShowProgramModal(false);
            setProgramForm({ name: '', program_type: 'WESTERN', description: '' });
            fetchAll();
        } catch (err) {
            toast.error('Failed to create program: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProgram = async (id) => {
        if (!await confirm('Permanently delete this program and all its subjects?', { confirmLabel: 'Delete', danger: true })) return;
        try {
            await api.delete(`/api/programs/list/${id}/`);
            fetchAll();
        } catch { toast.error('Failed to delete program'); }
    };

    const handleAddSubject = async (e) => {
        e.preventDefault();
        if (!subjectForm.name || !subjectForm.program) {
            toast.error('Subject Name and Program are required');
            return;
        }
        setSaving(true);
        try {
            await api.post('/api/programs/subjects/', subjectForm);
            toast.success('Subject Added Successfully!');
            setShowSubjectModal(false);
            setSubjectForm({ name: '', program: '', admin_percentage: 5.00 });
            fetchAll();
        } catch (err) {
            toast.error('Failed to add subject: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSubject = async (id) => {
        if (!await confirm('Permanently delete this subject?', { confirmLabel: 'Delete', danger: true })) return;
        try {
            await api.delete(`/api/programs/subjects/${id}/`);
            fetchAll();
        } catch { toast.error('Failed to delete subject'); }
    };

    const handleUpdateSubjectCommission = async (id, val) => {
        setSavingStatus(prev => ({ ...prev, [id]: 'saving' }));
        try {
            await api.patch(`/api/programs/subjects/${id}/`, { admin_percentage: val });
            setSavingStatus(prev => ({ ...prev, [id]: 'success' }));
            fetchAll();
            setTimeout(() => setSavingStatus(prev => ({ ...prev, [id]: 'idle' })), 2000);
        } catch {
            setSavingStatus(prev => ({ ...prev, [id]: 'idle' }));
            toast.error('Failed to update commission.');
        }
    };

    const handleToggleMaterialPublic = async (mat) => {
        try {
            await api.patch(`/api/curriculum/materials/${mat.id}/`, { is_public: !mat.is_public });
            fetchAll();
        } catch { toast.error('Failed to update status'); }
    };

    const handleDeleteMaterial = async (id) => {
        if (!await confirm('Delete this material?', { confirmLabel: 'Delete', danger: true })) return;
        try {
            await api.delete(`/api/curriculum/materials/${id}/`);
            fetchAll();
        } catch { toast.error('Failed to delete'); }
    };

    const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()));

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Curriculum — Hidayah Admin</title>
            <PageHeader title="Curriculum Management" description="Manage programs, subjects, and shared educational materials." />

            <div className="space-y-12">
                {/* Programs */}
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Education Programs</h3>
                            <p className="text-[10px] text-slate-500 font-bold">Categories for grouping subjects (Islamic, Western, Exams).</p>
                        </div>
                        <button onClick={() => setShowProgramModal(true)} className="px-4 py-2 bg-indigo-900 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2">
                            📂 New Program
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {programs.length === 0 ? (
                            <div className="col-span-full p-8 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-500 italic">No programs defined.</div>
                        ) : programs.map(p => (
                            <div key={p.id} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.name}</h4>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{p.program_type}</span>
                                </div>
                                <button onClick={() => handleDeleteProgram(p.id)} className="text-slate-300 hover:text-red-500 transition-colors">🗑️</button>
                            </div>
                        ))}
                    </div>
                </section>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Subjects */}
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Platform Curriculum (Subjects)</h3>
                            <p className="text-[10px] text-slate-500 font-bold">Manage subjects available for enrollment and tutor expertise.</p>
                        </div>
                        <button onClick={() => { fetchAll(); setShowSubjectModal(true); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide hover:bg-primary transition-all shadow-lg flex items-center gap-2">
                            ➕ Add New Subject
                        </button>
                    </div>
                    <div className="relative mb-4 max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
                        <input type="text" placeholder="Search subjects..." value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary/10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSubjects.length === 0 ? (
                            <div className="col-span-full p-12 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-500 italic">
                                {subjects.length === 0 ? 'No subjects found. Click "Add New Subject" to start.' : 'No subjects match your search.'}
                            </div>
                        ) : filteredSubjects.map(subj => {
                            const status = savingStatus[subj.id] || 'idle';
                            return (
                                <div key={subj.id} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm group hover:shadow-md transition-all ${status === 'success' ? 'border-emerald-300' : 'border-slate-100 dark:border-slate-800 hover:border-primary/20'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="text-[9px] font-bold text-primary uppercase tracking-tighter mb-1 bg-primary/5 px-2 py-0.5 rounded-full w-fit">{subj.program_name || 'Program'}</div>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{subj.name}</h4>
                                        </div>
                                        <button onClick={() => handleDeleteSubject(subj.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">🗑️</button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            disabled={status === 'saving'}
                                            defaultValue={subj.admin_percentage}
                                            onBlur={(e) => { if (e.target.value !== String(subj.admin_percentage)) handleUpdateSubjectCommission(subj.id, e.target.value); }}
                                            className={`flex-1 border rounded-xl px-3 py-1.5 text-xs font-bold transition-all outline-none ${status === 'saving' ? 'bg-white dark:bg-slate-900 opacity-50 cursor-wait' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20'}`}
                                            placeholder="Commission %"
                                        />
                                        <span className={`text-[10px] font-bold transition-colors ${status === 'success' ? 'text-emerald-500' : 'text-primary'}`}>
                                            {status === 'saving' ? '...' : status === 'success' ? '✨ Saved!' : `${subj.admin_percentage}%`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Materials */}
                <section>
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Shared Educational Materials</h3>
                        <p className="text-[10px] text-slate-500 font-bold">Files uploaded by tutors for student access.</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden overflow-x-auto">
                        <table className="w-full text-left min-w-[560px]">
                            <thead className="bg-slate-50/50 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="py-2 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Material</th>
                                    <th className="py-2 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                                    <th className="py-2 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Owner</th>
                                    <th className="py-2 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {materials.length === 0 ? (
                                    <tr><td colSpan="4" className="p-12 text-center text-slate-500 italic">No materials found.</td></tr>
                                ) : materials.map(mat => (
                                    <tr key={mat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                        <td className="py-3 px-6">
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{mat.title}</div>
                                            <div className="text-[9px] text-slate-500">{new Date(mat.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="py-3 px-6">
                                            <span className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full uppercase">{mat.material_type}</span>
                                        </td>
                                        <td className="py-3 px-6">
                                            <div className="text-[11px] text-slate-600 font-medium">Tr. {mat.tutor_name}</div>
                                            <div className={`text-[9px] font-bold uppercase ${mat.is_public ? 'text-emerald-500' : 'text-slate-300'}`}>{mat.is_public ? 'Public' : 'Private'}</div>
                                        </td>
                                        <td className="py-3 px-6">
                                            <div className="flex justify-center items-center gap-3">
                                                <a href={mat.file} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-secondary transition-colors" title="View File">👁</a>
                                                <button onClick={() => handleToggleMaterialPublic(mat)} className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${mat.is_public ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-emerald-500 text-white'}`}>
                                                    {mat.is_public ? 'Make Private' : 'Make Public'}
                                                </button>
                                                <button onClick={() => handleDeleteMaterial(mat.id)} className="text-slate-300 hover:text-red-500 transition-colors">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Program Modal */}
            {showProgramModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-8">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-widest">New Program</h3>
                        <form onSubmit={handleCreateProgram} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Program Name</label>
                                <input required value={programForm.name} onChange={e => setProgramForm({...programForm, name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</label>
                                <select value={programForm.program_type} onChange={e => setProgramForm({...programForm, program_type: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold bg-white dark:bg-slate-900">
                                    <option value="WESTERN">Western</option>
                                    <option value="ISLAMIC">Islamic</option>
                                    <option value="EXAM_PREP">Exam Prep</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowProgramModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-indigo-900 text-white text-sm font-bold uppercase hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                    {saving ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Subject Modal */}
            {showSubjectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-8">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-widest">Add Subject</h3>
                        <form onSubmit={handleAddSubject} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject Name</label>
                                <input required value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Program</label>
                                <select required value={subjectForm.program} onChange={e => setSubjectForm({...subjectForm, program: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold bg-white dark:bg-slate-900">
                                    <option value="">Select Program</option>
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Commission (%)</label>
                                <input type="number" step="0.01" value={subjectForm.admin_percentage} onChange={e => setSubjectForm({...subjectForm, admin_percentage: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowSubjectModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold uppercase hover:bg-primary transition-colors disabled:opacity-50">
                                    {saving ? 'Adding...' : 'Add Subject'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

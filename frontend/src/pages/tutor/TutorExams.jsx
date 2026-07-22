import { useState, useEffect, useCallback } from 'react';
import api, { asList, getApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

const BLANK_EXAM = { title: '', exam_type: 'INTERNAL', subject: '', year: new Date().getFullYear(), duration_minutes: 60, assigned_students: [] };

export default function TutorExams() {
    const { token } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const [exams, setExams] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [examFormData, setExamFormData] = useState(BLANK_EXAM);
    const [selectedExam, setSelectedExam] = useState(null);
    const [selectedStudentsForBulk, setSelectedStudentsForBulk] = useState([]);
    const [saving, setSaving] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [examRes, asgRes, subRes, studRes] = await Promise.all([
                api.get(`/api/exams/list/`),
                api.get(`/api/exams/assignments/`),
                api.get(`/api/programs/subjects/`),
                api.get(`/api/students/tutor/my-students/`),
            ]);
            setExams(Array.isArray(examRes.data?.results) ? examRes.data.results : (asList(examRes.data)));
            setAssignments(Array.isArray(asgRes.data?.results) ? asgRes.data.results : (asList(asgRes.data)));
            setSubjects(Array.isArray(subRes.data?.results) ? subRes.data.results : (asList(subRes.data)));
            setAssignedStudents(asList(studRes.data));
        } catch (err) {
            console.error('Exams fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSaveExam = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let examId = examFormData.id;
            if (examFormData.id) {
                await api.patch(`/api/exams/list/${examFormData.id}/`, examFormData);
            } else {
                const res = await api.post(`/api/exams/`, {
                    ...examFormData,
                    assigned_students: selectedStudentsForBulk
                });
                examId = res.data.id;
            }
            if (selectedStudentsForBulk.length > 0 && examId) {
                await api.post(`/api/exams/assignments/bulk-assign/`, {
                    exam: examId, students: selectedStudentsForBulk
                });
            }
            toast.success('Exam saved successfully!');
            setShowCreateModal(false);
            setSelectedStudentsForBulk([]);
            fetchData();
        } catch (err) {
            toast.error('Error saving exam: ' + (getApiError(err, 'Error')));
        } finally {
            setSaving(false);
        }
    };

    const handleBulkAssign = async (examId) => {
        if (selectedStudentsForBulk.length === 0) return;
        setAssigning(true);
        try {
            await api.post(`/api/exams/assignments/bulk-assign/`, {
                exam: examId, students: selectedStudentsForBulk
            });
            toast.success(`Exam assigned to ${selectedStudentsForBulk.length} students!`);
            setSelectedStudentsForBulk([]);
            fetchData();
        } catch (err) {
            toast.error('Assignment failed: ' + (getApiError(err, 'Error')));
        } finally {
            setAssigning(false);
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            await api.post(`/api/exams/list/${selectedExam.id}/add_question/`, data);
            toast.success('Question added!');
            e.target.reset();
            const updated = await api.get(`/api/exams/list/${selectedExam.id}/`);
            setSelectedExam(updated.data);
            fetchData();
        } catch (err) {
            toast.error('Error adding question: ' + (getApiError(err, 'Error')));
        }
    };

    const handleDeleteQuestion = async (qId) => {
        if (!await confirm('Delete this question?', { confirmLabel: 'Delete', danger: true })) return;
        await api.delete(`/api/exams/questions/${qId}/`);
        const updated = await api.get(`/api/exams/list/${selectedExam.id}/`);
        setSelectedExam(updated.data);
        fetchData();
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Exams — Hidayah</title>
            <PageHeader
                title="Academic Engine"
                description="Design assessments and track student mastery."
                actions={
                    <button
                        onClick={() => { setExamFormData(BLANK_EXAM); setShowCreateModal(true); }}
                        className="bg-primary text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >+ Create New Exam</button>
                }
            />

            {/* Exam grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {exams.map(exam => (
                    <div key={exam.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <span className="text-[11px] bg-slate-50 dark:bg-slate-800/60 text-slate-500 px-2 py-1 rounded-lg font-semibold uppercase border border-slate-100 dark:border-slate-800">{exam.question_count || 0} Questions</span>
                        </div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-primary-soft rounded-2xl flex items-center justify-center text-xl border border-blue-100">📝</div>
                            <div className="flex gap-2">
                                <button onClick={() => { setExamFormData({ ...exam, assigned_students: [] }); setShowCreateModal(true); }} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-slate-500 hover:text-primary transition-colors text-xs border border-slate-100 dark:border-slate-800" title="Edit">✏️</button>
                                <button onClick={() => { setSelectedExam(exam); setShowQuestionModal(true); }} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors text-xs border border-slate-100 dark:border-slate-800" title="Questions">📂</button>
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{exam.title}</h3>
                        <p className="text-[11px] text-primary font-semibold uppercase tracking-wide mb-6">{exam.subject_name || 'General'} • {exam.duration_minutes} Mins</p>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Bulk Assign To</label>
                                <div className="max-h-24 overflow-y-auto space-y-2 p-1">
                                    {assignedStudents.map(student => {
                                        const sId = student.user_details?.id || student.id;
                                        return (
                                            <label key={sId} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentsForBulk.includes(sId)}
                                                    onChange={e => {
                                                        if (e.target.checked) setSelectedStudentsForBulk([...selectedStudentsForBulk, sId]);
                                                        else setSelectedStudentsForBulk(selectedStudentsForBulk.filter(id => id !== sId));
                                                    }}
                                                    className="h-3 w-3 rounded border-slate-300 text-primary"
                                                />
                                                <span className="text-[10px] font-bold text-slate-500">{student.full_name || student.user_details?.first_name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <button
                                disabled={assigning || selectedStudentsForBulk.length === 0}
                                onClick={() => handleBulkAssign(exam.id)}
                                className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-semibold text-[11px] uppercase tracking-wide hover:bg-primary transition-all active:scale-95 disabled:opacity-50"
                            >
                                {assigning ? 'Assigning...' : `Assign to ${selectedStudentsForBulk.length} Selected`}
                            </button>
                        </div>
                    </div>
                ))}
                {exams.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 font-bold">No exams created yet.</p>
                    </div>
                )}
            </div>

            {/* Assignments table */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-card border border-slate-100 dark:border-slate-800 shadow-sm">
                <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full shadow-lg shadow-primary/20"></span>
                    Current Assignments
                </h3>
                <div className="overflow-hidden bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                                <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Exam</th>
                                <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Assigned On</th>
                                <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Status</th>
                                <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {assignments.length > 0 ? assignments.map(asgn => (
                                <tr key={asgn.id} className="hover:bg-white transition-colors">
                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">{asgn.student_name}</td>
                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{asgn.exam_title}</td>
                                    <td className="px-6 py-4 text-[10px] text-slate-500 font-bold">{new Date(asgn.assigned_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[9px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter ${asgn.status === 'COMPLETED' ? 'bg-primary-soft text-primary border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                            {asgn.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-[11px] font-bold text-primary">
                                        {asgn.score !== null ? `${asgn.score}%` : '--'}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic font-bold">No exams assigned yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Exam Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl bg-black/60">
                    <div className="bg-white dark:bg-slate-900 rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl p-12 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-8 right-8 w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">✕</button>
                        <h3 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100 mb-2">{examFormData.id ? 'Edit' : 'New'} Assessment</h3>
                        <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide mb-10">Configure your academic evaluation parameters.</p>

                        <form className="space-y-8" onSubmit={handleSaveExam}>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide ml-1">Title</label>
                                    <input required value={examFormData.title} onChange={e => setExamFormData({ ...examFormData, title: e.target.value })} className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-bold placeholder:text-slate-300 focus:border-primary/50 transition-all" placeholder="Final Term Exam" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide ml-1">Subject</label>
                                    <select value={examFormData.subject} onChange={e => setExamFormData({ ...examFormData, subject: e.target.value })} required className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-bold focus:border-primary/50 transition-all text-xs">
                                        <option value="">Select Subject...</option>
                                        {subjects.filter(s => s.program_type === 'ISLAMIC').length > 0 && (
                                            <optgroup label="── Islamic Education">
                                                {subjects.filter(s => s.program_type === 'ISLAMIC').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </optgroup>
                                        )}
                                        {subjects.filter(s => s.program_type !== 'ISLAMIC').length > 0 && (
                                            <optgroup label="── Academic / Western">
                                                {subjects.filter(s => s.program_type !== 'ISLAMIC').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide ml-1">Type</label>
                                    <select value={examFormData.exam_type} onChange={e => setExamFormData({ ...examFormData, exam_type: e.target.value })} className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-bold focus:border-primary/50 transition-all text-xs">
                                        <option value="INTERNAL">Internal</option>
                                        <option value="JAMB">JAMB Simulation</option>
                                        <option value="WAEC">WAEC Simulation</option>
                                        <option value="NECO">NECO Simulation</option>
                                        <option value="PRIMARY">Common Entrance</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide ml-1">Year</label>
                                    <input type="number" value={examFormData.year} onChange={e => setExamFormData({ ...examFormData, year: e.target.value })} className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-bold focus:border-primary/50 transition-all" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide ml-1">Mins</label>
                                    <input type="number" value={examFormData.duration_minutes} onChange={e => setExamFormData({ ...examFormData, duration_minutes: e.target.value })} className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-bold focus:border-primary/50 transition-all" />
                                </div>
                            </div>

                            {!examFormData.id && (
                                <div className="space-y-3">
                                    <label className="text-[11px] font-semibold uppercase text-primary tracking-wide ml-1">Assign To (Optional)</label>
                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto flex flex-wrap gap-3">
                                        {assignedStudents.map(student => {
                                            const sId = student.id || student.user_details?.id;
                                            const isSelected = selectedStudentsForBulk.includes(sId);
                                            return (
                                                <button key={sId} type="button" onClick={() => {
                                                    if (isSelected) setSelectedStudentsForBulk(selectedStudentsForBulk.filter(id => id !== sId));
                                                    else setSelectedStudentsForBulk([...selectedStudentsForBulk, sId]);
                                                }} className={`px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all border ${isSelected ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-primary/30'}`}>
                                                    {student.full_name || student.user_details?.first_name}
                                                </button>
                                            );
                                        })}
                                        {assignedStudents.length === 0 && <p className="text-[11px] font-semibold text-slate-500 italic uppercase">No students available.</p>}
                                    </div>
                                </div>
                            )}

                            <button type="submit" disabled={saving} className="w-full bg-primary text-white py-5 rounded-2xl font-bold uppercase tracking-[0.3em] text-xs shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : (examFormData.id ? 'Save Changes →' : 'Deploy Assessment →')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Question Manager Modal */}
            {showQuestionModal && selectedExam && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl bg-black/80">
                    <div className="bg-white dark:bg-slate-900 rounded-card-lg w-full max-w-5xl max-h-[90vh] p-12 relative border border-slate-100 dark:border-slate-800 shadow-2xl overflow-y-auto">
                        <button onClick={() => setShowQuestionModal(false)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-xl">✕</button>

                        <div className="mb-12">
                            <h2 className="text-4xl font-display font-bold text-slate-900 dark:text-slate-100 mb-2">{selectedExam.title}</h2>
                            <p className="text-primary text-[11px] font-semibold uppercase tracking-wide">Question Bank • {selectedExam.subject_name}</p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-16">
                            <div className="space-y-8">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                    Add Question
                                </h3>
                                <form className="space-y-6" onSubmit={handleAddQuestion}>
                                    <div className="space-y-3">
                                        <label htmlFor="text" className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide ml-1">Question Content</label>
                                        <textarea id="text" required name="text" rows="4" className="w-full px-6 py-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 focus:bg-white focus:border-primary/30 outline-none transition-all font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-300 leading-relaxed" placeholder="Formulate the assessment query here..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {['A', 'B', 'C', 'D'].map(opt => (
                                            <div key={opt} className="space-y-2">
                                                <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide ml-1">Option {opt}</label>
                                                <input required name={`option_${opt.toLowerCase()}`} className="w-full px-5 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 outline-none focus:border-primary/30 transition-all font-bold text-slate-700 dark:text-slate-300 text-xs" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-3">
                                        <label htmlFor="correct_option" className="text-[11px] font-semibold uppercase text-primary tracking-wide ml-1">Correct Answer</label>
                                        <select id="correct_option" name="correct_option" className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 outline-none focus:border-primary/50 transition-all font-bold text-slate-900 dark:text-slate-100 text-xs">
                                            <option value="A">Choice A</option>
                                            <option value="B">Choice B</option>
                                            <option value="C">Choice C</option>
                                            <option value="D">Choice D</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full bg-primary text-white py-5 rounded-2xl font-bold uppercase tracking-[0.3em] text-xs shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
                                        Add to Bank →
                                    </button>
                                </form>
                            </div>

                            <div className="space-y-8">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                                    Questions ({selectedExam.questions?.length || 0})
                                </h3>
                                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
                                    {(selectedExam.questions || []).map((q, i) => (
                                        <div key={q.id} className="bg-slate-50 dark:bg-slate-800/60 p-8 rounded-card-lg border border-slate-100 dark:border-slate-800 group hover:border-primary/20 transition-all">
                                            <div className="flex justify-between items-start mb-6">
                                                <span className="w-10 h-10 rounded-2xl bg-primary-soft flex items-center justify-center text-[10px] font-bold text-primary border border-blue-100">{i + 1}</span>
                                                <button onClick={() => handleDeleteQuestion(q.id)} className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">✕</button>
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">{q.text}</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['A', 'B', 'C', 'D'].map(opt => (
                                                    <div key={opt} className={`px-4 py-3 rounded-xl text-[11px] font-semibold uppercase tracking-wide ${q.correct_option === opt ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800'}`}>
                                                        {opt}: {(q[`option_${opt.toLowerCase()}`] || '').slice(0, 20)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedExam.questions || selectedExam.questions.length === 0) && (
                                        <div className="py-24 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide italic">No questions yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import api, { asList, getApiError } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar as IconCalendar, Clock as IconClock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { EmptyState, SkeletonCard, FetchError } from '../../components/ui';

const ComplaintModal = lazy(() => import('../../components/ComplaintModal'));

export default function TutorSchedule() {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const confirm = useConfirm();

    const [schedule, setSchedule] = useState([]);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [tutorProfile, setTutorProfile] = useState(null);
    const [exams, setExams] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [assignments, setAssignments] = useState([]);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoadError(false);
        try {
            const [schRes, studRes, profileRes] = await Promise.all([
                api.get(`/api/classes/sessions/`),
                api.get(`/api/students/tutor/my-students/`),
                api.get(`/api/tutors/me/`),
            ]);
            setSchedule(asList(schRes.data));
            setAssignedStudents(asList(studRes.data));
            setTutorProfile(profileRes.data);

            api.get(`/api/exams/list/`)
                .then(r => setExams(Array.isArray(r.data?.results) ? r.data.results : (asList(r.data)))).catch(() => {});
            api.get(`/api/curriculum/materials/`)
                .then(r => setMaterials(asList(r.data))).catch(() => {});
            api.get(`/api/exams/assignments/`)
                .then(r => setAssignments(Array.isArray(r.data?.results) ? r.data.results : (asList(r.data)))).catch(() => {});
        } catch (err) {
            console.error('Schedule fetch failed', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleJoinClass = useCallback(async (session) => {
        const sessionId = session.db_id || session.id;
        if (!sessionId) { toast.error('Invalid session ID'); return; }
        try {
            const isTrial = session.type === 'TRIAL' || !!session.zoom_start_url;
            const endpoint = isTrial
                ? `/api/classes/trial/${sessionId}/start/`
                : `/api/classes/session/${sessionId}/start/`;
            await api.post(endpoint, {});
        } catch (_e) { /* non-fatal */ }
        navigate(`/live/${sessionId}`);
    }, [getAuthHeader, navigate]);

    const handleComplete = useCallback(async (session) => {
        const sessionId = session.db_id || session.id;
        if (!await confirm('Mark this session as COMPLETED? Commission will be deducted and net amount credited to your wallet.', { confirmLabel: 'Mark Complete' })) return;
        try {
            const res = await api.post(`/api/classes/session/${sessionId}/complete/`, {});
            toast.success(`Session completed! Net payout: ₦${res.data.net_payout}`);
            fetchData();
        } catch (err) {
            toast.error('Failed to complete session: ' + (getApiError(err, 'Error')));
        }
    }, [getAuthHeader, fetchData, confirm, toast]);

    const handleAssignItem = async (type, id, studentId) => {
        if (assigning) return;
        setAssigning(true);
        try {
            if (type === 'exam') {
                const isAssigned = assignments.some(a => a.student === studentId && a.exam === id);
                if (isAssigned) { toast.info('Already assigned.'); return; }
                await api.post(`/api/exams/assignments/bulk-assign/`, { exam: id, students: [studentId] });
            } else {
                await api.post(`/api/curriculum/materials/${id}/bulk-assign/`, { students: [studentId] });
            }
            fetchData();
        } catch (_err) { toast.error('Assignment failed'); }
        finally { setAssigning(false); }
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    if (loadError) return (
        <FetchError message="Couldn't load your schedule. Please check your connection." onRetry={() => { setLoading(true); fetchData(); }} />
    );

    const activeClass = schedule.find(cls => {
        if (!cls.scheduled_at) return false;
        const t = new Date(cls.scheduled_at).getTime();
        const now = Date.now();
        return now >= t - 30 * 60 * 1000 && now <= t + 60 * 60 * 1000;
    });

    const trials = schedule.filter(s => s.type === 'TRIAL');
    const regular = schedule.filter(s => s.type !== 'TRIAL');

    return (
        <>
            <title>Schedule — Hidayah</title>
            <PageHeader title="Schedule" description="Your upcoming sessions and student assignments." />

            {activeClass && (
                <div className="bg-gradient-to-r from-primary to-indigo-700 rounded-card p-6 shadow-2xl shadow-primary/20 border border-blue-400/30 flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white text-xl">🔔</div>
                        <div>
                            <h4 className="text-white font-bold text-lg">Live Class Now Active!</h4>
                            <p className="text-white/80 text-sm font-medium">
                                {activeClass.course_interested || 'Class'} with {activeClass.student_name || 'your student'} is scheduled now.
                            </p>
                        </div>
                    </div>
                    <button onClick={() => handleJoinClass(activeClass)} className="bg-white dark:bg-slate-900 text-primary hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all w-full md:w-auto text-center shadow-2xl flex-shrink-0">
                        Join Class Now
                    </button>
                </div>
            )}

            {/* Stats */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all">
                    <div className="w-12 h-12 bg-primary-soft rounded-2xl flex items-center justify-center text-xl mb-6 border border-blue-100">📅</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">My Schedule</h3>
                    <p className="text-slate-500 text-sm">You have {schedule.length} upcoming classes.</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-600/30 transition-all">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl mb-6 border border-indigo-100">🎓</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">My Students</h3>
                    <p className="text-slate-500 text-sm">You are teaching {assignedStudents.length} students.</p>
                </div>
                <div className="bg-gradient-to-br from-primary to-indigo-900 p-8 rounded-3xl border border-blue-500/30 md:col-span-2 relative overflow-hidden shadow-2xl">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl mb-6 border border-white/20">💰</div>
                            <h3 className="text-lg font-bold text-white mb-1">Total Balance</h3>
                            <p className="text-4xl font-bold text-white">₦{parseFloat(tutorProfile?.wallet_balance || 0).toLocaleString()}</p>
                        </div>
                        <Link to="/tutor/wallet" className="bg-white dark:bg-slate-900 text-primary px-6 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-lg">
                            View Wallet
                        </Link>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                </div>
            </div>

            {/* Trial Classes */}
            <h2 className="text-2xl font-display text-slate-900 dark:text-slate-100 mb-8 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-primary rounded-full shadow-lg shadow-primary/20"></span>
                Upcoming Trial Classes
            </h2>
            <div className="space-y-4 mb-16">
                {trials.length > 0 ? trials.map((trial, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card-lg p-5 md:p-8 md:p-10 flex flex-col xl:flex-row justify-between items-center gap-8 hover:border-primary/30 transition-all shadow-sm">
                        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left w-full xl:w-auto">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/60 rounded-card flex items-center justify-center text-4xl border border-slate-100 dark:border-slate-800 flex-shrink-0">📖</div>
                            <div>
                                <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">TRIAL CLASS</p>
                                <h4 className="text-2xl md:text-3xl font-display font-bold text-slate-900 dark:text-slate-100 mb-3">{trial.student_name || trial.first_name}</h4>
                                <div className="flex flex-wrap gap-3 font-semibold text-[11px] text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl w-fit">
                                    <span className="flex items-center gap-2"><IconCalendar size={12} className="text-primary" /> {trial.scheduled_at ? new Date(trial.scheduled_at).toLocaleDateString() : 'Pending'}</span>
                                    <span className="flex items-center gap-2"><IconClock size={12} className="text-indigo-600" /> {trial.scheduled_at ? new Date(trial.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</span>
                                    <span className="flex items-center gap-2">📍 {trial.country || 'Global'}</span>
                                    <span className="flex items-center gap-2">📚 {trial.course_interested}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                            {trial.zoom_start_url ? (
                                <>
                                    <button onClick={() => navigate(`/live/${trial.id}`)} className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 px-6 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all shadow-sm whitespace-nowrap">Whiteboard</button>
                                    <button onClick={() => handleJoinClass(trial)} className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all whitespace-nowrap">Start Class →</button>
                                </>
                            ) : (
                                <span className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest border border-slate-200 dark:border-slate-700 w-full text-center">Room Pending</span>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="bg-white dark:bg-slate-900 rounded-card border border-dashed border-slate-200 dark:border-slate-700">
                        <EmptyState icon={IconCalendar} title="No trial classes yet" description="Trial classes assigned to you will appear here." />
                    </div>
                )}
            </div>

            {/* Regular Sessions */}
            <h2 className="text-2xl font-display text-slate-900 dark:text-slate-100 mb-8 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/20"></span>
                My Regular Students
            </h2>
            <div className="grid gap-6">
                {regular.length > 0 ? regular.map((session, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card-lg p-5 md:p-8 md:p-10 flex flex-col xl:flex-row justify-between items-center gap-8 hover:border-primary/30 transition-all shadow-sm">
                        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left w-full xl:w-auto">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/60 rounded-card flex items-center justify-center text-4xl border border-slate-100 dark:border-slate-800 flex-shrink-0">🎓</div>
                            <div>
                                <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">{session.course_interested || 'REGULAR CLASS'}</p>
                                <h4 className="text-2xl md:text-3xl font-display font-bold text-slate-900 dark:text-slate-100 mb-3">{session.student_name}</h4>
                                <div className="flex flex-wrap gap-3 font-semibold text-[11px] text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl w-fit">
                                    <span className="flex items-center gap-2"><IconCalendar size={12} className="text-primary" /> {new Date(session.scheduled_at).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-2"><IconClock size={12} className="text-indigo-600" /> {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap justify-center xl:justify-end gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                            <button
                                onClick={() => { setSelectedStudent({ id: session.student, user_details: { first_name: session.student_name } }); setShowComplaintModal(true); }}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-6 py-4 rounded-2xl font-semibold uppercase text-[11px] tracking-wide transition-all shadow-sm whitespace-nowrap"
                            >Report</button>
                            <button
                                onClick={() => { setSelectedStudentForAssign(session.student_data || { id: session.student, full_name: session.student_name }); setShowAssignmentModal(true); }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-6 py-4 rounded-2xl font-semibold uppercase text-[11px] tracking-wide transition-all shadow-sm whitespace-nowrap"
                            >Assign</button>
                            {session.status !== 'COMPLETED' ? (
                                <button onClick={() => handleComplete(session)} className="bg-primary-soft hover:bg-blue-100 text-primary border border-blue-100 px-6 py-4 rounded-2xl font-semibold uppercase text-[11px] tracking-wide transition-all shadow-sm whitespace-nowrap">Mark Done ✅</button>
                            ) : (
                                <span className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 px-6 py-4 rounded-2xl font-semibold uppercase text-[11px] tracking-wide border border-slate-100 dark:border-slate-800 whitespace-nowrap flex items-center justify-center">Completed</span>
                            )}
                            <button onClick={() => handleJoinClass(session)} className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-semibold uppercase text-[11px] sm:text-xs tracking-wide shadow-lg shadow-primary/20 active:scale-95 transition-all whitespace-nowrap">
                                Enter Class ↗
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="py-10 text-center text-slate-500 font-medium italic bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        No regular classes found in your schedule.
                    </div>
                )}
            </div>

            {/* Complaint Modal */}
            <Suspense fallback={null}>
                <ComplaintModal
                    isOpen={showComplaintModal}
                    onClose={() => { setShowComplaintModal(false); setSelectedStudent(null); }}
                    filedAgainstId={selectedStudent?.user_details?.id}
                    filedAgainstName={`${selectedStudent?.user_details?.first_name || ''}`}
                    token={token}
                />
            </Suspense>

            {/* Assignment Modal */}
            {showAssignmentModal && selectedStudentForAssign && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-[110] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 rounded-card-lg w-full max-w-2xl p-10 relative border border-slate-100 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <button onClick={() => setShowAssignmentModal(false)} className="absolute top-8 right-8 w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">✕</button>

                        <div className="mb-10">
                            <h2 className="text-3xl font-display text-slate-900 dark:text-slate-100 font-bold mb-2 flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-primary rounded-full"></span>
                                Assignment Hub
                            </h2>
                            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide">Provisioning resources for {selectedStudentForAssign.full_name}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-10 pr-2">
                            {selectedStudentForAssign.id ? (
                                <>
                                    <div className="space-y-5">
                                        <h3 className="text-[11px] font-semibold text-primary uppercase tracking-wide ml-2">Academic Assessments</h3>
                                        <div className="grid gap-3">
                                            {exams.map(exam => {
                                                const isAssigned = assignments.some(a => a.student === selectedStudentForAssign.id && a.exam === exam.id);
                                                return (
                                                    <div
                                                        key={exam.id}
                                                        className={`p-6 rounded-card border transition-all cursor-pointer flex items-center justify-between group ${isAssigned ? 'bg-primary-soft border-blue-100' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 hover:border-primary/20'}`}
                                                        onClick={() => handleAssignItem('exam', exam.id, selectedStudentForAssign.id)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${isAssigned ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800'}`}>
                                                                {isAssigned ? '✓' : '📝'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">{exam.title}</p>
                                                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{exam.subject_name || 'General'}</p>
                                                            </div>
                                                        </div>
                                                        {isAssigned && <span className="text-[11px] font-semibold text-primary uppercase tracking-wide bg-primary-soft px-3 py-1 rounded-full border border-blue-100">Active</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <h3 className="text-[11px] font-semibold text-primary uppercase tracking-wide ml-2">Learning Assets</h3>
                                        <div className="grid gap-3">
                                            {materials.map(mat => {
                                                const isAssigned = mat.assigned_students?.includes(selectedStudentForAssign.id);
                                                return (
                                                    <div
                                                        key={mat.id}
                                                        className={`p-6 rounded-card border transition-all cursor-pointer flex items-center justify-between group ${isAssigned ? 'bg-primary-soft border-blue-100' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 hover:border-primary/20'}`}
                                                        onClick={() => handleAssignItem('material', mat.id, selectedStudentForAssign.id)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${isAssigned ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800'}`}>
                                                                {isAssigned ? '✓' : '📚'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">{mat.title}</p>
                                                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{mat.material_type}</p>
                                                            </div>
                                                        </div>
                                                        {isAssigned && <span className="text-[11px] font-semibold text-primary uppercase tracking-wide bg-primary-soft px-3 py-1 rounded-full border border-blue-100">Assigned</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-24 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide italic">Student registration required for assignments.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setShowAssignmentModal(false)} className="w-full bg-primary text-white py-5 rounded-2xl font-bold uppercase tracking-[0.3em] text-xs shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
                                Done →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

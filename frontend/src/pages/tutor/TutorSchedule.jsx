import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar as IconCalendar, Clock as IconClock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import { EmptyState } from '../../components/ui';

const ComplaintModal = lazy(() => import('../../components/ComplaintModal'));

export default function TutorSchedule() {
    const { token, user } = useAuth();
    const navigate = useNavigate();

    const [schedule, setSchedule] = useState([]);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [tutorProfile, setTutorProfile] = useState(null);
    const [exams, setExams] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [assignments, setAssignments] = useState([]);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [schRes, studRes, profileRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/sessions/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/tutor/my-students/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/me/`, { headers: getAuthHeader() }),
            ]);
            setSchedule(Array.isArray(schRes.data) ? schRes.data : []);
            setAssignedStudents(Array.isArray(studRes.data) ? studRes.data : []);
            setTutorProfile(profileRes.data);

            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/`, { headers: getAuthHeader() })
                .then(r => setExams(Array.isArray(r.data?.results) ? r.data.results : (Array.isArray(r.data) ? r.data : []))).catch(() => {});
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/`, { headers: getAuthHeader() })
                .then(r => setMaterials(Array.isArray(r.data) ? r.data : [])).catch(() => {});
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/assignments/`, { headers: getAuthHeader() })
                .then(r => setAssignments(Array.isArray(r.data?.results) ? r.data.results : (Array.isArray(r.data) ? r.data : []))).catch(() => {});
        } catch (err) {
            console.error('Schedule fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleJoinClass = useCallback(async (session) => {
        const sessionId = session.db_id || session.id;
        if (!sessionId) { alert("Invalid session ID"); return; }
        try {
            const isTrial = session.type === 'TRIAL' || !!session.zoom_start_url;
            const endpoint = isTrial
                ? `${import.meta.env.VITE_API_BASE_URL}/api/classes/trial/${sessionId}/start/`
                : `${import.meta.env.VITE_API_BASE_URL}/api/classes/session/${sessionId}/start/`;
            await axios.post(endpoint, {}, { headers: getAuthHeader() });
        } catch (_e) { /* non-fatal */ }
        navigate(`/live/${sessionId}`);
    }, [getAuthHeader, navigate]);

    const handleComplete = useCallback(async (session) => {
        const sessionId = session.db_id || session.id;
        if (!window.confirm("Mark this session as COMPLETED? Commission will be deducted and net amount credited to your wallet.")) return;
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/classes/session/${sessionId}/complete/`, {}, { headers: getAuthHeader() });
            alert(`✅ Session completed!\nGross Fee: ₦${res.data.fee}\nCommission: ₦${res.data.commission}\nYour Net Payout: ₦${res.data.net_payout}`);
            fetchData();
        } catch (err) {
            alert("Failed to complete session: " + (err.response?.data?.error || "Error"));
        }
    }, [getAuthHeader, fetchData]);

    const handleAssignItem = async (type, id, studentId) => {
        if (assigning) return;
        setAssigning(true);
        try {
            if (type === 'exam') {
                const isAssigned = assignments.some(a => a.student === studentId && a.exam === id);
                if (isAssigned) { alert("Already assigned."); return; }
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/assignments/bulk-assign/`, { exam: id, students: [studentId] }, { headers: getAuthHeader() });
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/${id}/bulk-assign/`, { students: [studentId] }, { headers: getAuthHeader() });
            }
            fetchData();
        } catch (_err) { alert("Assignment failed"); }
        finally { setAssigning(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
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
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-6 shadow-2xl shadow-blue-600/20 border border-blue-400/30 flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white text-xl">🔔</div>
                        <div>
                            <h4 className="text-white font-black text-lg">Live Class Now Active!</h4>
                            <p className="text-white/80 text-sm font-medium">
                                {activeClass.course_interested || 'Class'} with {activeClass.student_name || 'your student'} is scheduled now.
                            </p>
                        </div>
                    </div>
                    <button onClick={() => handleJoinClass(activeClass)} className="bg-white text-blue-600 hover:bg-slate-50 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all w-full md:w-auto text-center shadow-2xl flex-shrink-0">
                        Join Class Now
                    </button>
                </div>
            )}

            {/* Stats */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-600/30 transition-all">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-xl mb-6 border border-blue-100">📅</div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">My Schedule</h3>
                    <p className="text-slate-400 text-sm">You have {schedule.length} upcoming classes.</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-600/30 transition-all">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl mb-6 border border-indigo-100">🎓</div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">My Students</h3>
                    <p className="text-slate-400 text-sm">You are teaching {assignedStudents.length} students.</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-8 rounded-3xl border border-blue-500/30 md:col-span-2 relative overflow-hidden shadow-2xl">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl mb-6 border border-white/20">💰</div>
                            <h3 className="text-lg font-bold text-white mb-1">Total Balance</h3>
                            <p className="text-4xl font-black text-white">₦{parseFloat(tutorProfile?.wallet_balance || 0).toLocaleString()}</p>
                        </div>
                        <Link to="/tutor/wallet" className="bg-white text-blue-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg">
                            View Wallet
                        </Link>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                </div>
            </div>

            {/* Trial Classes */}
            <h2 className="text-2xl font-display text-slate-900 mb-8 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-blue-600 rounded-full shadow-lg shadow-blue-600/20"></span>
                Upcoming Trial Classes
            </h2>
            <div className="space-y-4 mb-16">
                {trials.length > 0 ? trials.map((trial, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 flex flex-col xl:flex-row justify-between items-center gap-8 hover:border-blue-600/30 transition-all shadow-sm">
                        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left w-full xl:w-auto">
                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl border border-slate-100 flex-shrink-0">📖</div>
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">TRIAL CLASS</p>
                                <h4 className="text-2xl md:text-3xl font-display font-black text-slate-900 mb-3">{trial.student_name || trial.first_name}</h4>
                                <div className="flex flex-wrap gap-3 font-bold text-[10px] text-slate-400 uppercase bg-slate-50 p-3 rounded-2xl w-fit">
                                    <span className="flex items-center gap-2"><IconCalendar size={12} className="text-blue-600" /> {trial.scheduled_at ? new Date(trial.scheduled_at).toLocaleDateString() : 'Pending'}</span>
                                    <span className="flex items-center gap-2"><IconClock size={12} className="text-indigo-600" /> {trial.scheduled_at ? new Date(trial.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</span>
                                    <span className="flex items-center gap-2">📍 {trial.country || 'Global'}</span>
                                    <span className="flex items-center gap-2">📚 {trial.course_interested}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                            {trial.zoom_start_url ? (
                                <>
                                    <button onClick={() => navigate(`/live/${trial.id}`)} className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm whitespace-nowrap">Whiteboard</button>
                                    <button onClick={() => handleJoinClass(trial)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-blue-600/20 active:scale-95 transition-all whitespace-nowrap">Start Class →</button>
                                </>
                            ) : (
                                <span className="bg-slate-50 text-slate-400 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest border border-slate-200 w-full text-center">Room Pending</span>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="bg-white rounded-[2rem] border border-dashed border-slate-200">
                        <EmptyState icon={IconCalendar} title="No trial classes yet" description="Trial classes assigned to you will appear here." />
                    </div>
                )}
            </div>

            {/* Regular Sessions */}
            <h2 className="text-2xl font-display text-slate-900 mb-8 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/20"></span>
                My Regular Students
            </h2>
            <div className="grid gap-6">
                {regular.length > 0 ? regular.map((session, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 flex flex-col xl:flex-row justify-between items-center gap-8 hover:border-blue-600/30 transition-all shadow-sm">
                        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left w-full xl:w-auto">
                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl border border-slate-100 flex-shrink-0">🎓</div>
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{session.course_interested || 'REGULAR CLASS'}</p>
                                <h4 className="text-2xl md:text-3xl font-display font-black text-slate-900 mb-3">{session.student_name}</h4>
                                <div className="flex flex-wrap gap-3 font-bold text-[10px] text-slate-400 uppercase bg-slate-50 p-3 rounded-2xl w-fit">
                                    <span className="flex items-center gap-2"><IconCalendar size={12} className="text-blue-600" /> {new Date(session.scheduled_at).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-2"><IconClock size={12} className="text-indigo-600" /> {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap justify-center xl:justify-end gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                            <button
                                onClick={() => { setSelectedStudent({ id: session.student, user_details: { first_name: session.student_name } }); setShowComplaintModal(true); }}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm whitespace-nowrap"
                            >Report</button>
                            <button
                                onClick={() => { setSelectedStudentForAssign(session.student_data || { id: session.student, full_name: session.student_name }); setShowAssignmentModal(true); }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm whitespace-nowrap"
                            >Assign</button>
                            {session.status !== 'COMPLETED' ? (
                                <button onClick={() => handleComplete(session)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm whitespace-nowrap">Mark Done ✅</button>
                            ) : (
                                <span className="bg-slate-50 text-slate-400 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-slate-100 whitespace-nowrap flex items-center justify-center">Completed</span>
                            )}
                            <button onClick={() => handleJoinClass(session)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] shadow-lg shadow-blue-600/20 active:scale-95 transition-all whitespace-nowrap">
                                Enter Class ↗
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="py-10 text-center text-slate-400 font-medium italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
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
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 relative border border-slate-100 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <button onClick={() => setShowAssignmentModal(false)} className="absolute top-8 right-8 w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">✕</button>

                        <div className="mb-10">
                            <h2 className="text-3xl font-display text-slate-900 font-black mb-2 flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-blue-600 rounded-full"></span>
                                Assignment Hub
                            </h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Provisioning resources for {selectedStudentForAssign.full_name}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-10 pr-2">
                            {selectedStudentForAssign.id ? (
                                <>
                                    <div className="space-y-5">
                                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] ml-2">Academic Assessments</h3>
                                        <div className="grid gap-3">
                                            {exams.map(exam => {
                                                const isAssigned = assignments.some(a => a.student === selectedStudentForAssign.id && a.exam === exam.id);
                                                return (
                                                    <div
                                                        key={exam.id}
                                                        className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group ${isAssigned ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 hover:border-blue-600/20'}`}
                                                        onClick={() => handleAssignItem('exam', exam.id, selectedStudentForAssign.id)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${isAssigned ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                                                {isAssigned ? '✓' : '📝'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{exam.title}</p>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{exam.subject_name || 'General'}</p>
                                                            </div>
                                                        </div>
                                                        {isAssigned && <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Active</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] ml-2">Learning Assets</h3>
                                        <div className="grid gap-3">
                                            {materials.map(mat => {
                                                const isAssigned = mat.assigned_students?.includes(selectedStudentForAssign.id);
                                                return (
                                                    <div
                                                        key={mat.id}
                                                        className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group ${isAssigned ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 hover:border-blue-600/20'}`}
                                                        onClick={() => handleAssignItem('material', mat.id, selectedStudentForAssign.id)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${isAssigned ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                                                {isAssigned ? '✓' : '📚'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{mat.title}</p>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{mat.material_type}</p>
                                                            </div>
                                                        </div>
                                                        {isAssigned && <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Assigned</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-24 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Student registration required for assignments.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-10 pt-8 border-t border-slate-100">
                            <button onClick={() => setShowAssignmentModal(false)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all">
                                Done →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

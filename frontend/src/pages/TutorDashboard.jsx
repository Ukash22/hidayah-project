import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import TutorWallet from '../components/TutorWallet';
import ComplaintModal from '../components/ComplaintModal';
import { uploadMultipleToCloudinary } from '../services/cloudinaryService';

const TutorDashboard = () => {
    const { user, token } = useAuth();
    const [schedule, setSchedule] = useState([]);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [requests, setRequests] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [complaints, setComplaints] = useState({ filed_by_me: [], filed_against_me: [] });
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState(new URLSearchParams(location.search).get('tab') || 'schedule');
    const [activeRequestSubTab, setActiveRequestSubTab] = useState('pending');
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [mediaFiles, setMediaFiles] = useState({ intro_video: null, short_recitation: null });
    const [mediaUploading, setMediaUploading] = useState(false);
    const [mediaUploadMsg, setMediaUploadMsg] = useState('');
    const [tutorProfile, setTutorProfile] = useState(null);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [financials, setFinancials] = useState(null);
    const [exams, setExams] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [showExamModal, setShowExamModal] = useState(false);
    const [assigningExam, setAssigningExam] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [showCreateExamModal, setShowCreateExamModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [selectedExamForQuestions, setSelectedExamForQuestions] = useState(null);
    const [examFormData, setExamFormData] = useState({ title: '', exam_type: 'INTERNAL', subject: '', year: new Date().getFullYear(), duration_minutes: 60 });
    const [selectedStudentsForBulk, setSelectedStudentsForBulk] = useState([]);
    const [selectedStudentsForMaterial, setSelectedStudentsForMaterial] = useState([]);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
    const [assigningSpecific, setAssigningSpecific] = useState(false);

    const getAuthHeader = () => {
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchData = async () => {
        if (!token) return;
        try {
            const [schRes, studRes, compRes, matRes, reqRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/sessions/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/tutor/my-students/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/complaints/my/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/booking/approval/`, { headers: getAuthHeader() })
            ]);
            setSchedule(schRes.data);
            setAssignedStudents(studRes.data);
            setComplaints(compRes.data);
            setMaterials(matRes.data);
            setRequests(reqRes.data);

            // Fetch Exams, Assignments, Subjects independently to prevent one failure from blocking others
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/`, { headers: getAuthHeader() })
                .then(res => setExams(res.data?.results || res.data)).catch(e => console.error("Exams fetch failed", e));
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/assignments/`, { headers: getAuthHeader() })
                .then(res => setAssignments(res.data?.results || res.data)).catch(e => console.error("Assignments fetch failed", e));
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/programs/subjects/`, { headers: getAuthHeader() })
                .then(res => setSubjects(res.data?.results || res.data)).catch(e => console.error("Subjects fetch failed", e));

            // If Admin, fetch all students
            if (user?.role === 'ADMIN') {
                try {
                    const allStudRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/admin/all/`, { headers: getAuthHeader() });
                    setAssignedStudents(allStudRes.data);
                } catch (e) { console.error("All students fetch failed", e); }
            }

            // Fetch my profile
            const profileRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/me/`, { headers: getAuthHeader() });
            setTutorProfile(profileRes.data);


            // Fetch notifications
            try {
                const notifRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounts/notifications/`, { headers: getAuthHeader() });
                setNotifications(notifRes.data.slice(0, 3));
            } catch (e) { console.error("Notif fetch failed", e); }

            // Fetch Financials
            fetchTutorFinancials();
        } catch (err) {
            console.error("Failed to fetch tutor data", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTutorFinancials = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/tutor/financials/`, { headers: getAuthHeader() });
            setFinancials(res.data);
        } catch (err) {
            console.error("Failed to fetch financials", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const handleFileComplaint = (student) => {
        setSelectedStudent(student);
        setShowComplaintModal(true);
    };

    const getStatusBadge = (status) => {
        const colors = {
            OPEN: 'bg-yellow-100 text-yellow-800',
            UNDER_REVIEW: 'bg-blue-100 text-blue-800',
            RESOLVED: 'bg-green-100 text-green-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const handleApproveRequest = async (id) => {
        if (!window.confirm("Approve this student's request? Student will be prompted to pay.")) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/classes/booking/${id}/approve/`, {}, { headers: getAuthHeader() });
            alert("✅ Request approved! Awaiting student payment.");
            fetchData();
        } catch (err) {
            alert("Failed to approve: " + (err.response?.data?.error || "Error"));
        }
    };

    const handleRejectRequest = async (id) => {
        const reason = window.prompt("Enter rejection reason:");
        if (reason === null) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/classes/booking/${id}/reject/`, { rejection_reason: reason }, { headers: getAuthHeader() });
            alert("❌ Request rejected.");
            fetchData();
        } catch (err) {
            alert("Failed to reject: " + (err.response?.data?.error || "Error"));
        }
    };

    const handleCompleteSession = async (sessionId) => {
        if (!window.confirm("Mark this session as COMPLETED? Commission will be deducted and net amount credited to your wallet.")) return;

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/classes/session/${sessionId}/complete/`, {}, { headers: getAuthHeader() });
            
            alert(`✅ Session completed!\nGross Fee: ₦${res.data.fee}\nCommission: ₦${res.data.commission}\nYour Net Payout: ₦${res.data.net_payout}\nNew Balance: ₦${res.data.new_balance.toLocaleString()}`);
            fetchData();
        } catch (err) {
            alert("Failed to complete session: " + (err.response?.data?.error || "Error"));
        }
    };

    const handleCreateUpdateExam = async (e) => {
        e.preventDefault();
        try {
            let examId = examFormData.id;
            if (examFormData.id) {
                await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/${examFormData.id}/`, examFormData, { headers: getAuthHeader() });
            } else {
                const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/`, examFormData, { headers: getAuthHeader() });
                examId = res.data.id;
            }

            if (examFormData.assigned_students && examFormData.assigned_students.length > 0) {
                try {
                    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/assignments/bulk-assign/`, {
                        exam: examId,
                        students: examFormData.assigned_students
                    }, { headers: getAuthHeader() });
                    alert(`✅ Exam saved and assigned to ${examFormData.assigned_students.length} students!`);
                } catch (assignErr) {
                    alert('Exam saved, but assignment failed: ' + (assignErr.response?.data?.error || "Error"));
                }
            } else {
                alert("✅ Exam saved successfully!");
            }
            setShowCreateExamModal(false);
            fetchData();
        } catch (err) {
            alert("Error saving exam: " + (err.response?.data?.error || "Error"));
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/${selectedExamForQuestions.id}/add_question/`, data, { headers: getAuthHeader() });
            alert("✅ Question added!");
            e.target.reset();
            // Refresh the exam list to get updated count and questions
            fetchData();
            // Refresh current selected exam questions locally
            const updatedExam = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/${selectedExamForQuestions.id}/`, { headers: getAuthHeader() });
            setSelectedExamForQuestions(updatedExam.data);
        } catch (err) {
            alert("Error adding question: " + (err.response?.data?.error || "Error"));
        }
    };

    const handleDeleteQuestion = async (qId) => {
        if (!window.confirm("Delete this question?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/exams/questions/${qId}/`, { headers: getAuthHeader() });
            alert("✅ Question deleted!");
            // Refresh
            const updatedExam = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/${selectedExamForQuestions.id}/`, { headers: getAuthHeader() });
            setSelectedExamForQuestions(updatedExam.data);
            fetchData();
        } catch (err) {
            alert("Error deleting question");
        }
    };

    const handleJoinClass = async (session) => {
        let url = session.zoom_start_url || session.meeting_link; // Handle both Trial and Regular
        
        if (!url) {
            // Jitsi Fallback
            const sessionId = session.db_id || session.id;
            const studentId = session.student || session.user_id || '99';
            const room_id = `HidayahClass-${sessionId}-${studentId}`;
            url = `https://meet.jit.si/${room_id}`;
        }

        // Notify backend that class has started
        try {
            const isTrial = session.type === 'TRIAL' || !!session.zoom_start_url;
            const endpoint = isTrial 
                ? `${import.meta.env.VITE_API_BASE_URL}/api/classes/trial/${session.id}/start/`
                : `${import.meta.env.VITE_API_BASE_URL}/api/classes/session/${session.id}/start/`;
            
            await axios.post(endpoint, {}, { headers: getAuthHeader() });
        } catch (err) {
            console.error("Failed to mark session as started", err);
        }

        const dateObj = new Date(session.scheduled_at);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = dateObj.toLocaleDateString();
        
        const tutorFirstName = user?.first_name || 'Tutor';
        const tutorLastName = user?.last_name || '';
        const tutorName = `Tr. ${tutorFirstName} ${tutorLastName}`.trim();

        const studentName = session.student_name || session.first_name || 'Student';
        const subject = session.course_interested || 'Class';
        
        const displayName = encodeURIComponent(`${tutorName} - ${studentName} (${subject}) - ${dayName}, ${dateString}`);
        
        if (url.includes('meet.jit.si') || url.includes('8x8.vc')) {
            const hashDivider = url.includes('#') ? '&' : '#';
            url = `${url}${hashDivider}userInfo.displayName="${displayName}"`;
        }
        
        window.open(url, '_blank');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0c10]">
            <div className="flex flex-col items-center gap-6">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-emerald-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Initializing</p>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Tutor Control Room</p>
                </div>
            </div>
        </div>
    );

    if (tutorProfile && tutorProfile.status !== 'APPROVED') {
        return (
            <div className="min-h-screen bg-[#0a0c10] text-slate-200">
                <Navbar />
                <div className="container pt-32 pb-20 px-4">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
                    <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10 border border-white/10 max-w-2xl mx-auto text-center relative overflow-hidden">
                        <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 border border-amber-500/20 shadow-inner">
                            ⏳
                        </div>
                        <h1 className="text-3xl font-display text-white font-black mb-2">Application Under Review</h1>
                        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-amber-500 mb-8 block">Pending Administration Approval</p>
                        <p className="text-slate-400 mb-8 text-sm leading-relaxed font-medium">
                            Your application is currently being reviewed by our administration team. 
                            We will notify you once your profile has been approved and you can start teaching.
                        </p>
                        {tutorProfile.status === 'REJECTED' && (
                            <div className="bg-rose-500/10 text-rose-400 p-6 rounded-2xl mb-6 border border-rose-500/20 text-left">
                                <h3 className="font-bold mb-2 text-xs uppercase tracking-widest text-rose-500">Application Status: Rejected</h3>
                                <p>{tutorProfile.rejection_reason || "Unfortunately, your application was not approved at this time."}</p>
                            </div>
                        )}
                        <div className="bg-[#0a0c10]/50 rounded-3xl p-8 border border-white/5">
                            <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Next Steps</h3>
                            <ul className="text-xs text-slate-400 space-y-3 text-left font-medium">
                                <li>Wait for an email from our admin team regarding your interview.</li>
                                <li>Ensure your phone is reachable if we need to contact you.</li>
                                <li>Prepare your teaching materials and workspace setup.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    // Find active/upcoming closest class
    const activeClass = schedule.find(cls => {
        if (!cls.scheduled_at) return false;
        const classTime = new Date(cls.scheduled_at).getTime();
        const now = Date.now();
        // Active if within 30 minutes before or 60 minutes after
        return now >= classTime - 30*60*1000 && now <= classTime + 60*60*1000;
    });

    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-200 selection:bg-emerald-500/30">
            <Navbar />
            
            <main className="container pt-32 pb-20 px-4 relative">
                {/* Ambient Background Glows */}
                <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
                <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-pulse delay-700"></div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden"
                >
                    {activeClass && (
                        <div className="bg-gradient-to-r from-secondary to-indigo-600 rounded-[2rem] p-6 shadow-2xl shadow-secondary/20 border border-secondary/30 flex flex-col md:flex-row justify-between items-center gap-6 animate-pulse mb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white text-xl">
                                    🔔
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-lg">Live Class Now Active!</h4>
                                    <p className="text-white/80 text-sm font-medium">Your {activeClass.course_interested || activeClass.course || 'class'} session with {activeClass.student_name || activeClass.first_name || 'your student'} is scheduled now.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleJoinClass(activeClass)} 
                                className="bg-white/10 text-white hover:bg-emerald-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all w-full md:w-auto text-center shadow-2xl flex-shrink-0 border border-white/5 hover:border-emerald-500"
                            >
                                Join Class Now
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-400 text-3xl font-black border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                            {user?.first_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="text-center md:text-left">
                            <h1 className="text-4xl font-display text-white font-black tracking-tight leading-tight">Tutor Control Room</h1>
                            <p className="text-emerald-500 font-black uppercase tracking-[0.2em] text-xs mt-2 flex items-center gap-2 justify-center md:justify-start">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Welcome back, {user?.first_name}
                            </p>
                        </div>
                    </div>

                    {/* Notifications Widget */}
                    {notifications.length > 0 && (
                        <div className="mb-12">
                            <div className="bg-amber-500/10 rounded-[2rem] p-6 border border-amber-500/20 backdrop-blur-sm relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-20 h-20 bg-amber-500/20 rounded-full blur-xl"></div>
                                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                    </span>
                                    System Alerts
                                </h3>
                                <div className="space-y-3">
                                    {notifications.map(n => (
                                        <div key={n.id} className="bg-[#0a0c10]/40 border border-white/5 p-4 rounded-xl flex justify-between items-center group hover:border-amber-500/30 transition-all">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-white">{n.title}</p>
                                                    <p className="text-[11px] font-medium text-slate-400 line-clamp-1">{n.message}</p>
                                                </div>
                                            </div>
                                            {!n.is_read && (
                                                <button
                                                    onClick={async () => {
                                                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/accounts/notifications/${n.id}/read/`, {}, { headers: getAuthHeader() });
                                                        setNotifications(prev => prev.filter(item => item.id !== n.id));
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ml-4 border border-white/5 hover:border-amber-500"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 mb-10 p-1.5 bg-white/5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'schedule', icon: '📅', label: 'Schedule' },
                            { id: 'requests', icon: '📩', label: 'Requests' },
                            { id: 'wallet', icon: '💰', label: 'Wallet' },
                            { id: 'complaints', icon: '💬', label: 'Feedback' },
                            { id: 'materials', icon: '📚', label: 'Materials' },
                            { id: 'exams', icon: '📝', label: 'Exams' },
                            { id: 'media', icon: '📹', label: 'Media' },
                            { id: 'profile', icon: '⚙️', label: 'Settings' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Content with AnimatePresence */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Schedule Tab */}
                            {activeTab === 'schedule' && (
                                <>
                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                <motion.div 
                                    whileHover={{ translateY: -5 }}
                                    className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:border-emerald-500/30 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-xl mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">📅</div>
                                    <h3 className="text-lg font-bold text-white mb-2">My Schedule</h3>
                                    <p className="text-slate-400 text-sm">You have {schedule.length} upcoming classes.</p>
                                </motion.div>
                                <motion.div 
                                    whileHover={{ translateY: -5 }}
                                    className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:border-secondary/30 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-xl mb-6 border border-secondary/20 group-hover:scale-110 transition-transform">🎓</div>
                                    <h3 className="text-lg font-bold text-white mb-2">My Students</h3>
                                    <p className="text-slate-400 text-sm">You are teaching {assignedStudents.length} students.</p>
                                </motion.div>
                                <motion.div 
                                    whileHover={{ translateY: -5 }}
                                    className="bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 p-8 rounded-3xl border border-white/10 hover:border-emerald-500/30 transition-all group md:col-span-2 relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl mb-6 border border-white/20 group-hover:scale-110 transition-transform">💰</div>
                                            <h3 className="text-lg font-bold text-white mb-1">Total Balance</h3>
                                            <p className="text-4xl font-black text-emerald-400">₦{parseFloat(tutorProfile?.wallet_balance || 0).toLocaleString()}</p>
                                        </div>
                                        <button 
                                            onClick={() => setActiveTab('wallet')}
                                            className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            View Wallet
                                        </button>
                                    </div>
                                    {/* Abstract Circle Decoration */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                                </motion.div>
                            </div>


                            <h2 className="text-2xl font-display text-white mb-8 flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></span>
                                Upcoming Trial Classes
                            </h2>

                            <div className="space-y-4 mb-16">
                                {schedule.filter(s => s.type === 'TRIAL').length > 0 ? (
                                    schedule.filter(s => s.type === 'TRIAL').map((trial, idx) => (
                                        <motion.div 
                                            key={idx} 
                                            whileHover={{ scale: 1.01 }}
                                            className="bg-white/5 p-6 rounded-[2rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-emerald-500/20 transition-all group"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="bg-emerald-500/10 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border border-emerald-500/10 group-hover:scale-110 transition-transform">📖</div>
                                                <div>
                                                    <h4 className="text-xl font-bold text-white">Trial: {trial.student_name || trial.first_name}</h4>
                                                    <p className="text-slate-400 text-sm font-bold flex items-center gap-2">
                                                        <span>🗓</span> {trial.scheduled_at ? new Date(trial.scheduled_at).toLocaleString() : 'Pending'}
                                                        <span className="text-white/10">|</span>
                                                        <span>📍 {trial.country || 'Global'}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden md:block">
                                                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Course</span>
                                                    <span className="text-xs font-bold text-emerald-400">{trial.course_interested}</span>
                                                </div>
                                                {trial.zoom_start_url ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleJoinClass(trial)}
                                                            className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all text-center"
                                                        >
                                                            Start Class
                                                        </button>
                                                        {trial.whiteboard_url && (
                                                            <a
                                                                href={trial.whiteboard_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="bg-amber-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 transition-all text-center"
                                                            >
                                                                Whiteboard
                                                            </a>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-slate-500 italic font-bold">Room Pending</span>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="bg-white/5 p-12 rounded-[2rem] border border-dashed border-white/10 text-center">
                                        <p className="text-slate-500 font-bold">No trial classes assigned to you yet.</p>
                                    </div>
                                )}
                            </div>

                            <h2 className="text-2xl font-display text-white mb-8 flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-secondary rounded-full shadow-lg shadow-secondary/20"></span>
                                My Regular Students
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                {schedule.filter(s => s.type !== 'TRIAL').length > 0 ? (
                                    schedule.filter(s => s.type !== 'TRIAL').map((session, idx) => (
                                        <motion.div 
                                            key={idx} 
                                            whileHover={{ y: -5 }}
                                            className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-xl hover:border-emerald-500/30 transition-all"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl font-black text-emerald-400 border border-white/5">
                                                        {session.student_name?.[0] || 'S'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white leading-tight">{session.student_name}</h4>
                                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">{session.course_interested || 'Regular Class'}</span>
                                                            {(session.schedule_days || session.schedule_time) && (
                                                                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold">
                                                                    {session.schedule_days && <span className="flex items-center gap-1">📅 {session.schedule_days}</span>}
                                                                    {session.schedule_time && <span className="flex items-center gap-1">⏰ {session.schedule_time}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                                        {new Date(session.scheduled_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-[8px] font-black uppercase text-slate-500">
                                                        {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                             <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => handleJoinClass(session)}
                                                    className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transition-all text-center"
                                                >
                                                    Enter Class ↗
                                                </button>
                                                {session.status !== 'COMPLETED' ? (
                                                     <button
                                                        onClick={() => handleCompleteSession(session.id)}
                                                        className="flex-1 bg-white/10 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/30 hover:bg-emerald-500/10 transition-all text-center"
                                                    >
                                                        Mark Done ✅
                                                    </button>
                                                ) : (
                                                    <span className="flex-1 bg-white/5 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-center cursor-not-allowed border border-white/5">
                                                        Completed
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setSelectedStudentForAssign(session.student_data || {id: session.student, full_name: session.student_name});
                                                        setShowAssignmentModal(true);
                                                    }}
                                                    className="flex-1 bg-secondary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-secondary/20 hover:-translate-y-0.5 transition-all text-center"
                                                >
                                                    🎓 Assign
                                                </button>
                                                <button
                                                    onClick={() => handleFileComplaint({id: session.student, user_details: {first_name: session.student_name}})}
                                                    className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all"
                                                >
                                                    Report
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="col-span-2 py-10 text-center text-slate-500 font-medium italic bg-white/5 rounded-2xl border border-dashed border-white/10">
                                        No regular classes found in your schedule.
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'requests' && (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8 gap-6">
                                <div>
                                    <h2 className="text-3xl font-display font-black text-white mb-1">Student Requests</h2>
                                    <p className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black">Manage incoming bookings and current regular classes.</p>
                                </div>
                                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
                                    {['pending', 'approved', 'active'].map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => setActiveRequestSubTab(sub)}
                                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeRequestSubTab === sub ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            {sub === 'pending' ? '📥 New Requests' : sub === 'approved' ? '⏳ Approved' : '✅ Active'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {requests.filter(r => {
                                    if (activeRequestSubTab === 'pending') return !r.approved;
                                    if (activeRequestSubTab === 'approved') return r.approved && !r.paid;
                                    if (activeRequestSubTab === 'active') return r.approved && r.paid;
                                    return true;
                                }).length > 0 ? (
                                    requests.filter(r => {
                                        if (activeRequestSubTab === 'pending') return !r.approved;
                                        if (activeRequestSubTab === 'approved') return r.approved && !r.paid;
                                        if (activeRequestSubTab === 'active') return r.approved && r.paid;
                                        return true;
                                    }).map((req) => (
                                        <div key={req.id} className="bg-white/5 p-8 rounded-[2rem] border border-white/10 flex flex-col items-stretch gap-8 hover:border-emerald-500/20 transition-all group shadow-sm">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                <div className="flex items-center gap-6">
                                                    <div className="bg-emerald-500/10 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform border border-emerald-500/10">👤</div>
                                                    <div>
                                                        <h4 className="text-2xl font-display font-black text-white">{req.student_name}</h4>
                                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                                                            <span>📩 Received: {new Date(req.created_at).toLocaleDateString()}</span>
                                                            <span className="text-white/10">|</span>
                                                            <span className="text-emerald-500">{req.subject}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end text-right">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Fee</span>
                                                    <span className="text-2xl font-black text-white">₦{parseFloat(req.price || 0).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-white/5">
                                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-3">Target Schedule</span>
                                                    <div className="space-y-2">
                                                        {(() => {
                                                            try {
                                                                const sched = typeof req.schedule === 'string' ? JSON.parse(req.schedule) : req.schedule;
                                                                if (!sched || !Array.isArray(sched)) return <span className="text-[11px] font-bold text-slate-500 italic">No schedule provided</span>;
                                                                return sched.map((s, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center text-[11px]">
                                                                        <span className="font-black text-emerald-500 uppercase">{s.day}</span>
                                                                        <span className="font-bold text-slate-300">{s.time}</span>
                                                                    </div>
                                                                ));
                                                            } catch (e) {
                                                                return <span className="text-[11px] font-bold text-slate-500 italic">Multiple Slots Requested</span>;
                                                            }
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col justify-center gap-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Hours/Week</span>
                                                        <span className="text-sm font-black text-white">{req.hours_per_week}h</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Start Date</span>
                                                        <span className="text-sm font-black text-white">{req.preferred_start_date || 'ASAP'}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-center gap-3">
                                                    {activeRequestSubTab === 'pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleApproveRequest(req.id)}
                                                                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                                            >
                                                                Approve Request
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectRequest(req.id)}
                                                                className="w-full bg-white/5 text-red-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/10 transition-all border border-red-500/10"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : activeRequestSubTab === 'approved' ? (
                                                        <div className="text-center p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Status: Approved</div>
                                                            <div className="text-[11px] font-bold text-amber-400/80">Waiting for Student Payment</div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Status: Active</div>
                                                            <div className="text-[11px] font-bold text-emerald-500/80">Class Session Generated</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-32 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-sm border border-white/5">
                                            {activeRequestSubTab === 'pending' ? '📭' : activeRequestSubTab === 'approved' ? '⏳' : '📚'}
                                        </div>
                                        <p className="text-slate-500 font-bold max-w-xs mx-auto">
                                            {activeRequestSubTab === 'pending' ? 'No new student requests at the moment.' : activeRequestSubTab === 'approved' ? 'No recently approved bookings awaiting payment.' : 'No active regular classes found.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Wallet Tab */}
                    {activeTab === 'wallet' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                             {/* Financial Pulse Summary */}
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 flex flex-col gap-1 shadow-sm">
                                     <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Gross Earnings</span>
                                     <div className="text-xl font-black text-white">₦{parseFloat(financials?.gross_earnings || 0).toLocaleString()}</div>
                                     <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 italic">Before commission</p>
                                 </div>
                                 <div className="bg-emerald-500/10 p-6 rounded-[2rem] border border-emerald-500/10 flex flex-col gap-1 shadow-sm">
                                     <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500">Net Taken</span>
                                     <div className="text-xl font-black text-emerald-400">₦{parseFloat(financials?.net_earnings || 0).toLocaleString()}</div>
                                     <p className="text-[8px] font-bold text-emerald-500/60 uppercase mt-1 italic">Your actual share</p>
                                 </div>
                                 <div className="bg-amber-500/10 p-6 rounded-[2rem] border border-amber-500/10 flex flex-col gap-1 shadow-sm">
                                     <span className="text-[10px] uppercase font-black tracking-widest text-amber-500">Commission</span>
                                     <div className="text-xl font-black text-amber-400">₦{parseFloat(financials?.total_commission || 0).toLocaleString()}</div>
                                     <p className="text-[8px] font-bold text-amber-500/60 uppercase mt-1 italic">Platform support fee</p>
                                 </div>
                                 <div className="bg-indigo-500/10 p-6 rounded-[2rem] border border-indigo-500/10 flex flex-col gap-1 shadow-sm">
                                     <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Completed</span>
                                     <div className="text-xl font-black text-indigo-400">{financials?.completed_classes || 0} / {financials?.total_classes || 0}</div>
                                     <p className="text-[8px] font-bold text-indigo-500/60 uppercase mt-1 italic">Delivered classes</p>
                                 </div>
                            </div>

                            <TutorWallet token={token} />
                        </div>
                    )}

                    {/* Exams Tab */}
                    {activeTab === 'exams' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 p-8 rounded-[2rem] border border-white/10 mb-8 gap-6">
                                <div>
                                    <h2 className="text-3xl font-display font-black text-white mb-1">Academic Engine</h2>
                                    <p className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black">Design assessments and track student mastery.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => {
                                            setExamFormData({ title: '', exam_type: 'INTERNAL', subject: '', year: 2024, duration_minutes: 60, assigned_students: [] });
                                            setShowCreateExamModal(true);
                                        }}
                                        className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        + Create New Exam
                                    </button>
                                </div>
                            </div>

                            {/* Available Exams Grid */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {exams.map(exam => (
                                    <div key={exam.id} className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-sm hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4">
                                            <span className="text-[10px] bg-white/5 text-slate-400 px-2 py-1 rounded-lg font-black uppercase border border-white/5">{exam.question_count || 0} Questions</span>
                                        </div>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-xl border border-emerald-500/10">📝</div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setExamFormData({...exam, assigned_students: []});
                                                        setShowCreateExamModal(true);
                                                    }}
                                                    className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors text-xs border border-white/10" title="Edit Exam Details">✏️</button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedExamForQuestions(exam);
                                                        setShowQuestionModal(true);
                                                    }}
                                                    className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-secondary transition-colors text-xs border border-white/10" title="Manage Questions">📂</button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-white mb-1">{exam.title}</h3>
                                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-6">{exam.subject_name || 'General'} • {exam.duration_minutes} Mins</p>
                                        
                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                                <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Bulk Selection</label>
                                                <div className="max-h-24 overflow-y-auto space-y-2 p-1 no-scrollbar">
                                                    {assignedStudents.map(student => (
                                                        <label key={student.id} className="flex items-center gap-2 cursor-pointer group">
                                                            <input 
                                                                type="checkbox"
                                                                checked={selectedStudentsForBulk.includes(student.user_details?.id || student.id)}
                                                                onChange={(e) => {
                                                                    const id = student.user_details?.id || student.id;
                                                                    if (e.target.checked) setSelectedStudentsForBulk([...selectedStudentsForBulk, id]);
                                                                    else setSelectedStudentsForBulk(selectedStudentsForBulk.filter(item => item !== id));
                                                                }}
                                                                className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3"
                                                            />
                                                            <span className="text-[9px] font-bold text-slate-600 group-hover:text-primary">{student.full_name || student.user_details?.first_name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <button 
                                                disabled={assigningExam || selectedStudentsForBulk.length === 0}
                                                onClick={async () => {
                                                    setAssigningExam(true);
                                                    try {
                                                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/assignments/bulk-assign/`, {
                                                            exam: exam.id,
                                                            students: selectedStudentsForBulk
                                                        }, { headers: getAuthHeader() });
                                                        alert(`✅ Exam assigned successfully to ${selectedStudentsForBulk.length} students!`);
                                                        setSelectedStudentsForBulk([]);
                                                        fetchData();
                                                    } catch (err) {
                                                        alert("Assignment failed: " + (err.response?.data?.error || "Error"));
                                                    } finally {
                                                        setAssigningExam(false);
                                                    }
                                                }}
                                                className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:bg-primary transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {assigningExam ? 'Assigning...' : `Assign to ${selectedStudentsForBulk.length} Selected`}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Active Assignments List */}
                            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
                                <h3 className="text-xl font-bold text-emerald-500 mb-6 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></span>
                                    Current Assignments
                                </h3>
                                <div className="overflow-hidden bg-white/5 rounded-2xl border border-white/10">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-white/5 border-b border-white/10">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Exam</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned On</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {assignments.length > 0 ? (
                                                assignments.map(asgn => (
                                                    <tr key={asgn.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="text-[11px] font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{asgn.student_name}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[11px] font-bold text-slate-400">{asgn.exam_title}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[10px] text-slate-500 font-bold">{new Date(asgn.assigned_at).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter ${asgn.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                                {asgn.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="text-[11px] font-black text-emerald-500">
                                                                {asgn.score !== null ? `${asgn.score}%` : '--'}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic font-bold">No exams assigned yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Materials Tab */}
                    {activeTab === 'materials' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-xl relative overflow-hidden">
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-[100px] rounded-full"></div>
                                <h3 className="text-2xl font-display font-black text-white mb-2 flex items-center gap-3">
                                    <span className="w-2 h-8 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></span>
                                    Resource Distribution
                                </h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10 ml-5 opacity-60">Upload and manage learning materials for your students.</p>
                                
                                <form
                                    className="grid md:grid-cols-2 gap-8"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        setUploading(true);
                                        const formData = new FormData(e.target);
                                        try {
                                            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/`, formData, {
                                                headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
                                            });
                                            fetchData();
                                            e.target.reset();
                                            alert("✅ Material uploaded successfully!");
                                        } catch (err) {
                                            alert("❌ Failed to upload material: " + (err.response?.data?.error || err.message));
                                        } finally {
                                            setUploading(false);
                                        }
                                    }}
                                >
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Asset Title</label>
                                        <input name="title" required className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 outline-none focus:border-emerald-500/50 transition-all font-bold text-white placeholder:text-slate-600" placeholder="e.g., Advanced Tajweed Module 1" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Classification</label>
                                        <select name="material_type" className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-slate-900 outline-none focus:border-emerald-500/50 transition-all font-bold text-white">
                                            <option value="VIDEO">Video Coursework</option>
                                            <option value="PDF">Academic Document (PDF)</option>
                                            <option value="AUDIO">Audio Recitation / Podcast</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 hover:text-emerald-400 transition-colors cursor-help" title="Select specific students or leave empty for public broadcast.">Target Audience (Optional)</label>
                                        <div className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md max-h-40 overflow-y-auto space-y-3 no-scrollbar border-dashed">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative flex items-center justify-center">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedStudentsForMaterial.length === 0}
                                                        onChange={() => setSelectedStudentsForMaterial([])}
                                                        className="peer h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 transition-all appearance-none border checked:bg-emerald-500 checked:border-emerald-500"
                                                    />
                                                    <span className="absolute text-white scale-0 peer-checked:scale-100 transition-transform font-black text-[8px]">✓</span>
                                                </div>
                                                <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Global Broadcast</span>
                                            </label>
                                            <div className="h-px bg-white/5 my-2"></div>
                                            {assignedStudents.map(student => {
                                                const sId = student.id || student.user_details?.id;
                                                return (
                                                    <label key={sId} className="flex items-center gap-3 cursor-pointer group">
                                                        <div className="relative flex items-center justify-center">
                                                            <input 
                                                                type="checkbox"
                                                                checked={selectedStudentsForMaterial.includes(sId)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedStudentsForMaterial([...selectedStudentsForMaterial, sId]);
                                                                    else setSelectedStudentsForMaterial(selectedStudentsForMaterial.filter(item => item !== sId));
                                                                }}
                                                                className="peer h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 transition-all appearance-none border checked:bg-emerald-500 checked:border-emerald-500"
                                                            />
                                                            <span className="absolute text-white scale-0 peer-checked:scale-100 transition-transform font-black text-[8px]">✓</span>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors">{student.full_name || student.user_details?.first_name}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Educational Context</label>
                                        <textarea name="description" rows="3" className="w-full px-6 py-5 rounded-3xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-emerald-500/30 outline-none transition-all font-medium text-slate-300 placeholder:text-slate-600 leading-relaxed no-scrollbar" placeholder="Provide a brief synopsis of this learning resource..."></textarea>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Source File</label>
                                        <div className="relative group">
                                            <input type="file" name="file" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 group-hover:bg-white/10 transition-all flex items-center gap-4 text-slate-400 font-bold overflow-hidden">
                                                <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase">Attach</span>
                                                <span className="text-[10px] truncate">Select file from system...</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            disabled={uploading}
                                            type="submit"
                                            className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {uploading ? (
                                                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> SYNCING...</>
                                            ) : 'Finalize Broadcast →'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="space-y-8">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3 px-2">
                                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></span>
                                    Asset Library
                                </h3>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {materials.length > 0 ? (
                                        materials.map(mat => (
                                            <div key={mat.id} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/20 transition-all group relative overflow-hidden backdrop-blur-sm">
                                                <div className="absolute top-0 right-0 p-6 flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm("Archive this material permanently?")) {
                                                                await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/${mat.id}/`, { headers: getAuthHeader() });
                                                                fetchData();
                                                            }
                                                        }}
                                                        className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all text-xs opacity-0 group-hover:opacity-100"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                
                                                <div className="flex flex-col h-full">
                                                    <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-inner border border-emerald-500/10 group-hover:scale-110 transition-transform">
                                                        {mat.material_type === 'VIDEO' ? '🎥' : mat.material_type === 'PDF' ? '📄' : '🎵'}
                                                    </div>
                                                    
                                                    <h4 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-emerald-400 transition-colors">{mat.title}</h4>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6 px-3 py-1 bg-white/5 rounded-lg inline-block self-start">{mat.material_type}</p>
                                                    
                                                    <p className="text-xs text-slate-400 line-clamp-3 mb-8 leading-relaxed font-medium flex-grow">{mat.description}</p>
                                                    
                                                    <a
                                                        href={mat.file}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-full py-4 text-center bg-white/5 rounded-2xl text-[10px] font-black text-emerald-500 hover:bg-emerald-500 hover:text-white uppercase tracking-widest transition-all border border-emerald-500/10 shadow-sm"
                                                    >
                                                        View Resource ↗
                                                    </a>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-24 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                            <p className="text-slate-500 font-bold">No academic assets synchronized yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Complaints Tab */}
                    {activeTab === 'complaints' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8">
                                <h2 className="text-3xl font-display font-black text-rose-500 mb-1">Feedback & Reports</h2>
                                <p className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black">Track student concerns and administrative feedback.</p>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></span>
                                        Filed by Me
                                    </h3>
                                    {complaints.filed_by_me.length > 0 ? (
                                        <div className="space-y-4">
                                            {complaints.filed_by_me.map((complaint) => (
                                                <div key={complaint.id} className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-emerald-500/20 transition-all group">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{complaint.subject}</h4>
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(complaint.status)}`}>
                                                            {complaint.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-400 mb-4 font-medium leading-relaxed">{complaint.description}</p>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg inline-block">Against: {complaint.filed_against_name}</p>
                                                    
                                                    {complaint.admin_response && (
                                                        <div className="mt-6 bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/10">
                                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 italic">Admin Response:</p>
                                                            <p className="text-sm text-emerald-400/80 font-medium leading-relaxed">{complaint.admin_response}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                            <p className="text-slate-500 font-bold">No active reports filed.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                        <span className="w-1.5 h-6 bg-rose-500 rounded-full shadow-lg shadow-rose-500/20"></span>
                                        Received Reports
                                    </h3>
                                    {complaints.filed_against_me.length > 0 ? (
                                        <div className="space-y-4">
                                            {complaints.filed_against_me.map((complaint) => (
                                                <div key={complaint.id} className="bg-rose-500/5 p-6 rounded-[2rem] border border-rose-500/10 hover:border-rose-500/30 transition-all group">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h4 className="font-bold text-white group-hover:text-rose-400 transition-colors">{complaint.subject}</h4>
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(complaint.status)}`}>
                                                            {complaint.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-400 mb-4 font-medium leading-relaxed">{complaint.description}</p>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg inline-block">From: {complaint.filed_by_name}</p>
                                                    
                                                    {complaint.admin_response && (
                                                        <div className="mt-6 bg-white/5 p-5 rounded-2xl border border-white/10">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Resolution Notes:</p>
                                                            <p className="text-sm text-slate-300/80 font-medium leading-relaxed">{complaint.admin_response}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                            <p className="text-slate-500 font-bold">Your record is perfectly clean! ✨</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Profile Settings Tab */}
                    {activeTab === 'profile' && tutorProfile && (
                        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 relative overflow-hidden backdrop-blur-xl">
                                <div className="absolute top-0 right-0 p-8">
                                    <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">Active Partner</div>
                                </div>
                                <h2 className="text-4xl font-display font-black text-white mb-2">Professional Identity</h2>
                                <p className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black">Manage your teacher profile and earning settings.</p>
                                
                                <form className="space-y-10 mt-12" onSubmit={async (e) => {
                                    e.preventDefault();
                                    setUpdatingProfile(true);
                                    try {
                                        const payload = {
                                            bio: tutorProfile.bio,
                                            hourly_rate: tutorProfile.hourly_rate,
                                            live_class_link: tutorProfile.live_class_link,
                                            trial_class_link: tutorProfile.trial_class_link
                                        };
                                        await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/${tutorProfile.id}/update_profile/`, payload, {
                                            headers: getAuthHeader()
                                        });
                                        alert("✅ Profile updated successfully!");
                                    } catch (err) {
                                        alert("❌ Failed to update profile: " + (err.response?.data?.error || err.message));
                                    } finally {
                                        setUpdatingProfile(false);
                                    }
                                }}>
                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Full Legal Name (Verified)</label>
                                            <input type="text" readOnly value={tutorProfile.full_name} className="w-full px-6 py-4 rounded-2xl border border-white/5 bg-white/5 text-slate-400 font-bold outline-none cursor-not-allowed" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 ml-1">Hourly Tuition Rate (₦)</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={tutorProfile.hourly_rate} 
                                                    onChange={e => setTutorProfile({...tutorProfile, hourly_rate: e.target.value})}
                                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:border-emerald-500/50 outline-none transition-all font-black text-white text-lg shadow-sm"
                                                />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-[10px] uppercase">Per Hour</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Live Class Link (Zoom/Jitsi)</label>
                                            <input 
                                                type="url" 
                                                value={tutorProfile.live_class_link || ''} 
                                                onChange={e => setTutorProfile({...tutorProfile, live_class_link: e.target.value})}
                                                placeholder="https://meet.jit.si/MyClass"
                                                className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:border-indigo-500/50 outline-none transition-all font-bold text-indigo-300 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 ml-1">Trial Class Link</label>
                                            <input 
                                                type="url" 
                                                value={tutorProfile.trial_class_link || ''} 
                                                onChange={e => setTutorProfile({...tutorProfile, trial_class_link: e.target.value})}
                                                placeholder="https://meet.jit.si/Trial"
                                                className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:border-amber-500/50 outline-none transition-all font-bold text-amber-300 text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Professional Bio / Intro</label>
                                        <textarea 
                                            rows="5"
                                            value={tutorProfile.bio || ''} 
                                            onChange={e => setTutorProfile({...tutorProfile, bio: e.target.value})}
                                            className="w-full px-6 py-5 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-emerald-500/30 outline-none transition-all font-medium text-slate-300 leading-relaxed no-scrollbar"
                                            placeholder="Introduce yourself to prospective students..."
                                        ></textarea>
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-10">
                                        <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                                Verified Pedagogies
                                            </h4>
                                            <div className="flex flex-wrap gap-3">
                                                {tutorProfile.subjects_to_teach?.split(',').map(s => (
                                                    <span key={s} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase text-indigo-400 shadow-sm">{s.trim()}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-emerald-500/5 p-8 rounded-[2rem] border border-emerald-500/10">
                                            <h4 className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></span>
                                                Instructional Slots
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {tutorProfile.availabilities && tutorProfile.availabilities.length > 0 ? (
                                                    tutorProfile.availabilities.map((slot, idx) => (
                                                        <div key={idx} className="bg-white/5 px-4 py-3 rounded-xl border border-white/5 flex flex-col items-center">
                                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tight mb-1">{slot.day}</span>
                                                            <span className="text-[10px] font-bold text-white whitespace-nowrap">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Default availability active.</p>
                                                )}
                                            </div>
                                            <p className="mt-6 text-[8px] font-black text-slate-500 uppercase tracking-widest text-center italic">Contact Admins to update slots</p>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={updatingProfile}
                                        className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-emerald-500/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {updatingProfile ? (
                                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Syncing Data...</>
                                        ) : 'Update Partner Dashboard →'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                    {/* Media Tab */}
                    {activeTab === 'media' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8">
                                <h2 className="text-3xl font-display font-black text-white mb-1">My Profile Media</h2>
                                <p className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black">Secure Cloudinary storage for your intro video & recitation.</p>
                            </div>

                            {/* Current Media Preview */}
                            {tutorProfile && (tutorProfile.video_url || tutorProfile.recitation_url) && (
                                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-8 backdrop-blur-xl">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Currently Active Assets</h3>
                                    <div className="grid md:grid-cols-2 gap-8">
                                        {/* Current Video */}
                                        {tutorProfile.video_url && (
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Intro Video</p>
                                                {tutorProfile.video_type === 'youtube' ? (() => {
                                                    const url = tutorProfile.video_url || '';
                                                    const videoId = url.includes('youtu.be/')
                                                        ? url.split('youtu.be/')[1]?.split('?')[0]
                                                        : url.split('v=')[1]?.split('&')[0] || '';
                                                    return (
                                                        <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                                            <iframe
                                                                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                                                                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                                className="w-full h-full"
                                                                title="Intro Video"
                                                            />
                                                        </div>
                                                    );
                                                })() : (
                                                    <video
                                                        src={tutorProfile.video_url?.startsWith('http') ? tutorProfile.video_url : `${import.meta.env.VITE_API_BASE_URL}${tutorProfile.video_url}`}
                                                        controls
                                                        className="w-full rounded-2xl border border-white/10 shadow-2xl"
                                                    />
                                                )}
                                            </div>
                                        )}
                                        {/* Current Recitation */}
                                        {tutorProfile.recitation_url && (
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest ml-1">Recitation Audio</p>
                                                <div className="bg-emerald-500/5 p-8 rounded-2xl border border-emerald-500/10 flex flex-col items-center gap-6">
                                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-emerald-500/10">🎙️</div>
                                                    <audio
                                                        src={tutorProfile.recitation_url?.startsWith('http') ? tutorProfile.recitation_url : `${import.meta.env.VITE_API_BASE_URL}${tutorProfile.recitation_url}`}
                                                        controls
                                                        className="w-full h-10 invert brightness-200"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Upload New Media */}
                            <div className="grid md:grid-cols-2 gap-10">
                                {/* Intro Video Upload */}
                                <div className="bg-white/5 rounded-[2.5rem] p-10 border border-white/10 space-y-8 group hover:border-emerald-500/20 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🎥</div>
                                        <div>
                                            <h3 className="font-black text-xl text-white">Intro Video</h3>
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">MP4 / MOV • Max 100MB</p>
                                        </div>
                                    </div>
                                    <label className="block">
                                        <div className="border-2 border-dashed border-white/10 rounded-3xl p-10 text-center cursor-pointer hover:bg-white/5 hover:border-emerald-500/30 transition-all">
                                            {mediaFiles.intro_video ? (
                                                <div className="animate-in zoom-in-95">
                                                    <p className="text-emerald-400 font-black text-sm mb-1">✓ {mediaFiles.intro_video.name}</p>
                                                    <p className="text-slate-500 text-[9px] font-black">{(mediaFiles.intro_video.size / 1024 / 1024).toFixed(1)} MB READY</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-slate-400 font-bold text-sm mb-1">Choose Workshop Video</p>
                                                    <p className="text-slate-600 text-[9px] font-black uppercase tracking-widest">Select File</p>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" accept="video/*" className="hidden" onChange={e => setMediaFiles(f => ({ ...f, intro_video: e.target.files[0] }))} />
                                    </label>
                                </div>

                                {/* Recitation Audio Upload */}
                                <div className="bg-white/5 rounded-[2.5rem] p-10 border border-white/10 space-y-8 group hover:border-indigo-500/20 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🔊</div>
                                        <div>
                                            <h3 className="font-black text-xl text-white">Recitation Sample</h3>
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">MP3 / WAV • Max 30MB</p>
                                        </div>
                                    </div>
                                    <label className="block">
                                        <div className="border-2 border-dashed border-white/10 rounded-3xl p-10 text-center cursor-pointer hover:bg-white/5 hover:border-indigo-500/30 transition-all">
                                            {mediaFiles.short_recitation ? (
                                                <div className="animate-in zoom-in-95">
                                                    <p className="text-indigo-400 font-black text-sm mb-1">✓ {mediaFiles.short_recitation.name}</p>
                                                    <p className="text-slate-500 text-[9px] font-black">{(mediaFiles.short_recitation.size / 1024 / 1024).toFixed(1)} MB READY</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-slate-400 font-bold text-sm mb-1">Choose Audio Clip</p>
                                                    <p className="text-slate-600 text-[9px] font-black uppercase tracking-widest">Select File</p>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" accept="audio/*" className="hidden" onChange={e => setMediaFiles(f => ({ ...f, short_recitation: e.target.files[0] }))} />
                                    </label>
                                </div>
                            </div>

                            {/* Upload Button */}
                            {(mediaFiles.intro_video || mediaFiles.short_recitation) && (
                                <div className="flex justify-center pt-8">
                                    <button
                                        onClick={async () => {
                                            setMediaUploading(true);
                                            setMediaUploadMsg('');
                                            try {
                                                const profileRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/`, { headers: getAuthHeader() });
                                                const myProfile = profileRes.data.find(t => t.user?.id === user?.id);
                                                if (!myProfile) throw new Error('Tutor profile not found');

                                                setMediaUploading('Syncing with Cloudinary...');
                                                const uploadMap = {
                                                    intro_video: 'tutor_videos',
                                                    short_recitation: 'tutor_recitations'
                                                };
                                                const uploadedUrls = await uploadMultipleToCloudinary(mediaFiles, uploadMap);

                                                setMediaUploading('UPDATING PARTNER PROFILE...');
                                                const payload = {};
                                                if (uploadedUrls.intro_video) payload.intro_video_url = uploadedUrls.intro_video;
                                                if (uploadedUrls.short_recitation) payload.short_recitation_url = uploadedUrls.short_recitation;

                                                await axios.patch(
                                                    `${import.meta.env.VITE_API_BASE_URL}/api/tutors/${myProfile.id}/update_profile/`,
                                                    payload,
                                                    { headers: { ...getAuthHeader() } }
                                                );
                                                setMediaFiles({ intro_video: null, short_recitation: null });
                                                setMediaUploadMsg('✅ Media assets synchronized with Cloudinary!');
                                            } catch (err) {
                                                setMediaUploadMsg('❌ Process failed: ' + (err.response?.data?.error || err.message));
                                            } finally {
                                                setMediaUploading(false);
                                            }
                                        }}
                                        disabled={mediaUploading}
                                        className="bg-emerald-500 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-emerald-500/30 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-4"
                                    >
                                        {mediaUploading ? (
                                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> PROCESSING...</>
                                        ) : ('☁️ Sync with Cloudinary')}
                                    </button>
                                </div>
                            )}

                            {mediaUploadMsg && (
                                <p className={`text-center font-black text-[10px] uppercase tracking-widest mt-6 ${mediaUploadMsg.startsWith('✅') ? 'text-emerald-500' : 'text-rose-500'}`}>{mediaUploadMsg}</p>
                            )}
                        </div>
                    )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </main>

            <ComplaintModal
                isOpen={showComplaintModal}
                onClose={() => {
                    setShowComplaintModal(false);
                    setSelectedStudent(null);
                }}
                filedAgainstId={selectedStudent?.user_details?.id}
                filedAgainstName={`${selectedStudent?.user_details?.first_name} ${selectedStudent?.user_details?.last_name}`}
                token={token}
            />

            {/* Specific Student Assignment Modal */}
            {showAssignmentModal && selectedStudentForAssign && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[110] flex items-center justify-center p-6">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#0f172a]/90 rounded-[3rem] w-full max-w-2xl p-10 relative border border-white/10 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[100px] rounded-full"></div>
                        
                        <button onClick={() => setShowAssignmentModal(false)} className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">✕</button>
                        
                        <div className="mb-10">
                            <h2 className="text-3xl font-display text-white font-black mb-2 flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-indigo-500 rounded-full"></span>
                                Assignment Hub
                            </h2>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Provisioning resources for {selectedStudentForAssign.full_name || selectedStudentForAssign.username}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-10 pr-2 no-scrollbar">
                            {selectedStudentForAssign.id ? (
                                <>
                                    {/* Exams Section */}
                                    <div className="space-y-5">
                                        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] ml-2">Academic Assessments</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {exams.map(exam => {
                                                const isAssigned = assignments.some(a => a.student === selectedStudentForAssign.id && a.exam === exam.id);
                                                return (
                                                    <div key={exam.id} 
                                                        className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group ${isAssigned ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5 hover:border-indigo-500/20' }`}
                                                        onClick={async () => {
                                                            if (assigningSpecific) return;
                                                            setAssigningSpecific(true);
                                                            try {
                                                                if (isAssigned) {
                                                                    alert("Assessment already synchronized for this student.");
                                                                } else {
                                                                    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/assignments/bulk-assign/`, {
                                                                        exam: exam.id,
                                                                        students: [selectedStudentForAssign.id]
                                                                    }, { headers: getAuthHeader() });
                                                                    fetchData();
                                                                }
                                                            } catch (err) { alert("Assignment failed"); }
                                                            finally { setAssigningSpecific(false); }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${isAssigned ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-500 shadow-inner'}`}>
                                                                {isAssigned ? '✓' : '📝'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-white mb-1 group-hover:text-indigo-400 transition-colors">{exam.title}</p>
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{exam.subject_name || 'General Protocol'}</p>
                                                            </div>
                                                        </div>
                                                        {isAssigned && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-400/10 px-3 py-1 rounded-full border border-indigo-400/10">Active</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Materials Section */}
                                    <div className="space-y-5">
                                        <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] ml-2">Learning Assets</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {materials.map(mat => {
                                                const isAssigned = mat.assigned_students?.includes(selectedStudentForAssign.id);
                                                return (
                                                    <div key={mat.id} 
                                                        className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group ${isAssigned ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-emerald-500/20' }`}
                                                        onClick={async () => {
                                                            if (assigningSpecific) return;
                                                            setAssigningSpecific(true);
                                                            try {
                                                                if (!isAssigned) {
                                                                    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/${mat.id}/bulk-assign/`, {
                                                                        students: [selectedStudentForAssign.id]
                                                                    }, { headers: getAuthHeader() });
                                                                    fetchData();
                                                                } else {
                                                                    alert("Asset already synchronized.");
                                                                }
                                                            } catch (err) { alert("Failed to assign material"); }
                                                            finally { setAssigningSpecific(false); }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${isAssigned ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-500 shadow-inner'}`}>
                                                                {isAssigned ? '✓' : '📚'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">{mat.title}</p>
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{mat.material_type}</p>
                                                            </div>
                                                        </div>
                                                        {isAssigned && <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/10">Synchronized</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-24 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10 opacity-40">
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] italic">Student Authorization Required</p>
                                    <p className="text-slate-600 text-[9px] mt-2 font-bold px-12">Assignments can only be synchronized once the student completes platform registration.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/5">
                            <button onClick={() => setShowAssignmentModal(false)} className="w-full bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all">
                                Finalize Assignments →
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Create Exam Modal */}
            {showCreateExamModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl bg-black/80">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-[#0f172a]/90 rounded-[3rem] w-full max-w-2xl p-10 relative border border-white/10 shadow-2xl overflow-hidden"
                    >
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 blur-[100px] rounded-full"></div>
                        
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-3xl font-display font-black text-white mb-2">{examFormData.id ? 'Edit' : 'New'} Assessment</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Configure your academic evaluation parameters.</p>
                            </div>
                            <button onClick={() => setShowCreateExamModal(false)} className="w-10 h-10 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">✕</button>
                        </div>

                        <form className="space-y-8" onSubmit={async (e) => {
                            e.preventDefault();
                            if (examFormData.id) {
                                handleCreateUpdateExam(e);
                                return;
                            }
                            setAssigningExam(true);
                            try {
                                const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/`, {
                                    ...examFormData,
                                    assigned_students: selectedStudentsForBulk
                                }, { headers: getAuthHeader() });
                                alert("✅ Assessment Protocol Initialized!");
                                setShowCreateExamModal(false);
                                setSelectedStudentsForBulk([]);
                                fetchData();
                            } catch (err) {
                                alert("Initialization failed: " + (err.response?.data?.error || "Error"));
                            } finally {
                                setAssigningExam(false);
                            }
                        }}>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Title</label>
                                    <input 
                                        required 
                                        value={examFormData.title} 
                                        onChange={e => setExamFormData({...examFormData, title: e.target.value})}
                                        className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 outline-none focus:border-emerald-500/50 transition-all font-bold text-white" 
                                        placeholder="Final Term Exam"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Subject</label>
                                    <select
                                        className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-slate-900 outline-none focus:border-emerald-500/50 transition-all font-bold text-white text-xs"
                                        value={examFormData.subject}
                                        onChange={e => setExamFormData({ ...examFormData, subject: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Subject...</option>
                                        {Array.isArray(subjects) && subjects.filter(s => s.program_type === 'ISLAMIC').length > 0 && (
                                            <optgroup label="── Islamic Education">
                                                {subjects.filter(s => s.program_type === 'ISLAMIC').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </optgroup>
                                        )}
                                        {Array.isArray(subjects) && subjects.filter(s => s.program_type !== 'ISLAMIC').length > 0 && (
                                            <optgroup label="── Academic / Western">
                                                {subjects.filter(s => s.program_type !== 'ISLAMIC').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Type</label>
                                    <select 
                                        value={examFormData.exam_type} 
                                        onChange={e => setExamFormData({...examFormData, exam_type: e.target.value})}
                                        className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-slate-900 outline-none focus:border-emerald-500/50 transition-all font-bold text-white text-xs"
                                    >
                                        <option value="INTERNAL">Internal</option>
                                        <option value="JAMB">JAMB Simulation</option>
                                        <option value="WAEC">WAEC Simulation</option>
                                        <option value="NECO">NECO Simulation</option>
                                        <option value="PRIMARY">Common Entrance</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Year</label>
                                    <input 
                                        type="number" 
                                        value={examFormData.year} 
                                        onChange={e => setExamFormData({...examFormData, year: e.target.value})}
                                        className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 outline-none focus:border-emerald-500/50 transition-all font-bold text-white" 
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Mins</label>
                                    <input 
                                        type="number" 
                                        value={examFormData.duration_minutes} 
                                        onChange={e => setExamFormData({...examFormData, duration_minutes: e.target.value})}
                                        className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 outline-none focus:border-emerald-500/50 transition-all font-bold text-white" 
                                    />
                                </div>
                            </div>

                            {!examFormData.id && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-emerald-500 tracking-widest ml-1">Deployment Target (Optional Bulk Assign)</label>
                                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 max-h-40 overflow-y-auto no-scrollbar flex flex-wrap gap-3">
                                        {assignedStudents.map(student => {
                                            const sId = student.id || student.user_details?.id;
                                            const isSelected = selectedStudentsForBulk.includes(sId);
                                            return (
                                                <button 
                                                    key={sId}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) setSelectedStudentsForBulk(selectedStudentsForBulk.filter(id => id !== sId));
                                                        else setSelectedStudentsForBulk([...selectedStudentsForBulk, sId]);
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isSelected ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-emerald-500/30'}`}
                                                >
                                                    {student.full_name || student.user_details?.first_name}
                                                </button>
                                            );
                                        })}
                                        {assignedStudents.length === 0 && <p className="text-[10px] font-black text-slate-600 italic uppercase">No students available for deployment.</p>}
                                    </div>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={assigningExam}
                                className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
                            >
                                {assigningExam ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> INITIALIZING...</>
                                ) : (examFormData.id ? 'Save Protocol Changes →' : 'Deploy Assessment Protocol →')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Question Management Modal */}
            {showQuestionModal && selectedExamForQuestions && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl bg-black/90">
                    <motion.div 
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0f172a] rounded-[3rem] w-full max-w-5xl max-h-[90vh] p-12 relative border border-white/10 shadow-2xl overflow-y-auto no-scrollbar"
                    >
                        <button onClick={() => setShowQuestionModal(false)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all text-xl">✕</button>
                        
                        <div className="mb-12">
                            <h2 className="text-4xl font-display font-black text-white mb-2">{selectedExamForQuestions.title}</h2>
                            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">Knowledge Base Architect • {selectedExamForQuestions.subject_name}</p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-16">
                            {/* Add Question Form */}
                            <div className="space-y-8">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></span>
                                    Question Entry
                                </h3>
                                <form className="space-y-6" onSubmit={handleAddQuestion}>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Question Content</label>
                                        <textarea 
                                            required 
                                            name="text"
                                            rows="4"
                                            className="w-full px-6 py-5 rounded-3xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-emerald-500/30 outline-none transition-all font-medium text-slate-300 placeholder:text-slate-600 leading-relaxed no-scrollbar"
                                            placeholder="Formulate the assessment query here..."
                                        ></textarea>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {['A','B','C','D'].map(opt => (
                                            <div key={opt} className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Option {opt}</label>
                                                <input required name={`option_${opt.toLowerCase()}`} className="w-full px-5 py-3 rounded-xl border border-white/10 bg-white/5 outline-none focus:border-emerald-500/30 transition-all font-bold text-slate-300 text-xs" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-emerald-500 tracking-widest ml-1">Correct Solution</label>
                                        <select name="correct_option" className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-slate-900 outline-none focus:border-emerald-500/50 transition-all font-bold text-white text-xs">
                                            <option value="A">Choice A</option>
                                            <option value="B">Choice B</option>
                                            <option value="C">Choice C</option>
                                            <option value="D">Choice D</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all mt-4">
                                        Sync to Bank →
                                    </button>
                                </form>
                            </div>

                            {/* Existing Questions List */}
                            <div className="space-y-8">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/20"></span>
                                    Synchronized Items ({selectedExamForQuestions.questions?.length || 0})
                                </h3>
                                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 no-scrollbar">
                                    {(selectedExamForQuestions.questions || []).map((q, i) => (
                                        <div key={q.id} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 group hover:border-white/10 transition-all">
                                            <div className="flex justify-between items-start mb-6">
                                                <span className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-[10px] font-black text-emerald-500 border border-white/5">{i + 1}</span>
                                                <button onClick={() => handleDeleteQuestion(q.id)} className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 italic">✕</button>
                                            </div>
                                            <p className="text-sm font-bold text-slate-300 mb-6 leading-relaxed">{q.text}</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['A','B','C','D'].map(opt => (
                                                    <div key={opt} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${q.correct_option === opt ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-500 text-opacity-60 border border-white/5'}`}>
                                                        {opt}: {q[`option_${opt.toLowerCase()}`].slice(0, 20)}...
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedExamForQuestions.questions || selectedExamForQuestions.questions.length === 0) && (
                                        <div className="py-24 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10 opacity-30">
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] italic">Knowledge Bank Depleted</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div >
    );
};

export default TutorDashboard;

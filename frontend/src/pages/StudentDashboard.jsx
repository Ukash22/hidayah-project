import { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, MessageSquare, Download, Plus, 
    FileText, CheckCircle2, ShieldCheck, X,
    TrendingUp, ExternalLink, AlertCircle,
    Wallet, BookOpen, GraduationCap, Bell, ArrowRight,
    Search, User, Clock, Calendar, PlayCircle, Music
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import ComplaintModal from '../components/ComplaintModal';
import RescheduleModal from '../components/RescheduleModal';
import QuranMushaf from '../components/QuranMushaf';
import JambCBT from '../components/JambCBT';

const StudentDashboard = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState(null);
    const [classes, setClasses] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [complaints, setComplaints] = useState({ filed_by_me: [], filed_against_me: [] });
    const [notifications, setNotifications] = useState([]);

    const [bookings, setBookings] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const isImpersonating = !!localStorage.getItem('parent_access');

    const handleReturnToParent = () => {
        const parentAccess = localStorage.getItem('parent_access');
        const parentRefresh = localStorage.getItem('parent_refresh');
        if (parentAccess && parentRefresh) {
            localStorage.setItem('access', parentAccess);
            localStorage.setItem('refresh', parentRefresh);
            localStorage.removeItem('parent_access');
            localStorage.removeItem('parent_refresh');
            window.location.href = '/parent';
        }
    };
    
    // Check URL params for active tab, default to overview
    const [activeTab, setActiveTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'overview');
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [selectedSessionType, setSelectedSessionType] = useState('REGULAR');

    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [availableTutors, setAvailableTutors] = useState([]);
    const [enrollData, setEnrollData] = useState({
        subject_id: '', tutor_id: '', hours_per_week: 1, days_per_week: 1,
        schedule: [{ day: '', time: '' }],
        preferred_start_date: '',
        active_tutor_rate: 0
    });
    const [selectedTutorAvailability, setSelectedTutorAvailability] = useState(null);
    const [enrolling, setEnrolling] = useState(false);
    const [examAssignments, setExamAssignments] = useState([]);
    const [examResults, setExamResults] = useState([]);

    const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

    const fetchData = async () => {
        if (!token) return;
        try {
            const [profRes, classRes, compRes, matRes, _reqRes, bookingRes, transactionsRes, examAsgnRes, examResRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/me/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/sessions/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/complaints/my/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/scheduling/requests/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/booking/request/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/wallet/transactions/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/assignments/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/results/`, { headers: getAuthHeader() })
            ]);
            setProfile(profRes.data);
            setClasses(Array.isArray(classRes.data) ? classRes.data : classRes.data.classes || []);
            setComplaints(compRes.data && Array.isArray(compRes.data.filed_by_me) ? compRes.data : { filed_by_me: [], filed_against_me: [] });
            setMaterials(Array.isArray(matRes.data) ? matRes.data : []);
            setBookings(Array.isArray(bookingRes.data) ? bookingRes.data : []);
            setTransactions(Array.isArray(transactionsRes.data) ? transactionsRes.data : []);
            setExamAssignments(Array.isArray(examAsgnRes.data) ? examAsgnRes.data : []);
            setExamResults(Array.isArray(examResRes.data) ? examResRes.data : []);
            // Actually transactionsRes is the 6th element in Promise.all

            try {
                const notifRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounts/notifications/`, { headers: getAuthHeader() });
                setNotifications(notifRes.data.slice(0, 3));
            } catch (e) { console.error("Notif fetch failed", e); }

            const subRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/programs/subjects/`, { headers: getAuthHeader() });
            setAvailableSubjects(subRes.data);

        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const handleDownloadReceipt = (t) => {
        try {
            const doc = new jsPDF();
            
            // Brand Header
            doc.setFillColor(30, 64, 175); // Blue-800
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("HIDAYAH INTERNATIONAL", 105, 18, { align: "center" });
            doc.setFontSize(10);
            doc.text("TUTOR PLATFORM | ISLAMIC & WESTERN EDUCATION", 105, 28, { align: "center" });
            
            // Receipt Info
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(16);
            doc.text("OFFICIAL TRANSACTION RECEIPT", 20, 55);
            
            doc.setFontSize(10);
            doc.text(`Receipt Date: ${new Date().toLocaleString()}`, 20, 65);
            doc.text(`Reference ID: #${t.id || 'N/A'}`, 20, 72);
            
            // Grid Data
            const rows = [
                ["Transaction For", `${profile?.user?.first_name} ${profile?.user?.last_name || ''}`],
                ["Email Address", profile?.user?.email || "N/A"],
                ["Activity Type", (t.transaction_type || "Payment").replace('_', ' ').toUpperCase()],
                ["Amount Paid", `NGN ${parseFloat(t.amount || 0).toLocaleString()}`],
                ["Date", new Date(t.timestamp || t.created_at).toLocaleDateString()],
                ["Description", t.description || "Course Enrollment / Wallet Activity"]
            ];
            
            autoTable(doc, {
                startY: 85,
                head: [['Description', 'Detail']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42] }, // Navy
                styles: { fontSize: 10, cellPadding: 5 }
            });
            
            // Footer
            const finalY = doc.lastAutoTable?.finalY || 150;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Thank you for choosing Hidayah International.", 105, finalY + 20, { align: "center" });
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("This is a computer-generated receipt and requires no signature.", 105, finalY + 30, { align: "center" });
            
            doc.save(`Hidayah_Receipt_${t.id}.pdf`);
        } catch (err) {
            console.error("Receipt generation failed:", err);
            alert("Failed to generate receipt. Please try again.");
        }
    };



    // Pre-fill Modal from Profile/Registration Data
    useEffect(() => {
        if (showEnrollModal && profile && !profile.enrollments?.length) {
            if (profile.enrolled_course && availableSubjects.length > 0) {
                const subjSubstr = profile.enrolled_course.split(',')[0].trim();
                const subj = availableSubjects.find(s => 
                    s.name.toLowerCase().includes(subjSubstr.toLowerCase()) ||
                    subjSubstr.toLowerCase().includes(s.name.toLowerCase())
                );
                if (subj) {
                    setEnrollData(prev => ({ 
                        ...prev, 
                        subject_id: String(subj.id),
                        tutor_id: profile.preferred_tutor_id ? String(profile.preferred_tutor_id) : prev.tutor_id
                    }));
                    fetchTutorsForSubject(subj.name);
                }
            }
            if (profile.preferred_days?.toLowerCase().includes('any')) {
                setEnrollData(prev => ({ ...prev, days_per_week: 7 }));
            } else if (profile.preferred_days) {
                const dpw = profile.preferred_days.split(', ').filter(d => d);
                setEnrollData(prev => ({ ...prev, days_per_week: dpw.length }));
            }
            if (profile.preferred_time) {
                setEnrollData(prev => ({ ...prev, preferred_time: profile.preferred_time }));
            }
        }
    }, [showEnrollModal, profile, availableSubjects]);

    const fetchTutorsForSubject = async (subjectName) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/by_subject/?subject=${subjectName}`, { headers: getAuthHeader() });
            setAvailableTutors(res.data);
            if (res.data.length > 0) {
                const t = res.data[0];
                const uid = t.user?.id || t.user_id || t.id;
                const rate = parseFloat(String(t.hourly_rate || 0).replace(/[^0-9.]/g, '')) || 0;
                setEnrollData(prev => ({ 
                    ...prev, 
                    tutor_id: String(uid), 
                    active_tutor_rate: rate,
                    schedule: [{ day: '', time: '' }] 
                }));
                setSelectedTutorAvailability({ 
                    availabilities: t.availabilities || [],
                    busy_slots: t.busy_slots || [] 
                });
            }
        } catch (e) { console.error("Tutor fetch failed", e); }
    };

    const handleEnroll = async () => {
        if (!enrollData.subject_id || !enrollData.tutor_id) return;
        setEnrolling(true);
        // Use the fields we selected in the modal
        const finalData = { 
            ...enrollData,
            days_per_week: enrollData.schedule.length
        };
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/students/enroll-subject/`, finalData, { headers: getAuthHeader() });
            alert("✅ Enrollment requested! Tutor has been notified.");
            setShowEnrollModal(false);
            fetchData();
        } catch (err) { alert("❌ Error: " + (err.response?.data?.error || "Failed")); }
        finally { setEnrolling(false); }
    };

    const handleJoinClass = async (cls) => {
        try {
            const sessionId = cls.db_id || cls.id;
            if (!sessionId) {
                alert("Invalid session ID");
                return;
            }

            // Notify backend that student joined (non-blocking)
            try {
                await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL}/api/classes/session/${sessionId}/start/`,
                    {},
                    { headers: getAuthHeader() }
                );
            } catch (e) {
                // Non-blocking — proceed regardless
                console.warn("Could not notify backend of join:", e);
            }

            // Force Navigate to internal Live Classroom
            window.location.href = `/live/${sessionId}`;
        } catch (err) {
            console.error("Critical error in handleJoinClass:", err);
            alert("An error occurred while joining the class.");
        }
    };

    const calculateScheduleStatus = () => {
        if (!enrollData.preferred_days || !enrollData.preferred_time || !selectedTutorAvailability) return { status: 'pending', message: null };
        
        const day = enrollData.preferred_days;
        const time = enrollData.preferred_time;
        
        // 1. Check if tutor works on this day
        const worksThisDay = selectedTutorAvailability.availabilities?.find(av => av.day.toUpperCase() === day.toUpperCase());
        if (!worksThisDay) return { status: 'error', message: `Tutor does not work on ${day.toLowerCase()}s.` };

        // 2. Check if within working hours
        const [h, m] = time.split(':').map(Number);
        const selectedMinutes = h * 60 + m;
        const [startH, startM] = worksThisDay.start_time.split(':').map(Number);
        const [endH, endM] = worksThisDay.end_time.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        if (selectedMinutes < startMin || selectedMinutes > endMin) {
            return { status: 'error', message: `Tutor works from ${worksThisDay.start_time.slice(0,5)} to ${worksThisDay.end_time.slice(0,5)}.` };
        }

        // 3. Check for busy slots (overlaps)
        const selectedDate = enrollData.preferred_start_date;
        if (!selectedDate) return { status: 'pending', message: 'Select a start date' };
        
        const selectedDateTime = new Date(`${selectedDate}T${time}:00`);
        const conflict = selectedTutorAvailability.busy_slots?.find(slot => {
            const start = new Date(slot.start);
            const end = new Date(slot.end);
            return selectedDateTime >= start && selectedDateTime < end;
        });

        if (conflict) return { status: 'error', message: 'Tutor is already busy at this time!' };

        return { status: 'success', message: 'Tutor is available for this slot!' };
    };

    const scheduleStatus = calculateScheduleStatus();

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full shadow-[0_0_20px_rgba(37,99,235,0.2)]" />
        </div>
    );

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };
    
    // Find active/upcoming closest class
    const activeClass = classes.find(cls => {
        const classTime = new Date(cls.scheduled_at).getTime();
        const now = Date.now();
        // Active if within 30 minutes before or 60 minutes after
        return now >= classTime - 30*60*1000 && now <= classTime + 60*60*1000;
    });

    const studentNavItems = [
        { id: 'overview', icon: '🏠', label: 'Overview' },
        { id: 'classes', icon: '📺', label: 'Classes' },
        { id: 'library', icon: '📚', label: 'Library' },
        { id: 'assessments', icon: '📝', label: 'Assessments' },
        (['JAMB', 'WAEC', 'NECO', 'JUNIOR_WAEC'].includes(profile?.level) ||
         (profile?.enrolled_course && ['Prep', 'JAMB', 'WAEC', 'NECO', 'BECE'].some(s => profile.enrolled_course.includes(s))))
            ? { id: 'jamb', icon: '🎯', label: 'JAMB CBT' } : null,
        { id: 'finance', icon: '💳', label: 'Finance' },
        { id: 'feedback', icon: '💬', label: 'Feedback' },
    ].filter(Boolean);

    return (
        <DashboardLayout navItems={studentNavItems} activeTab={activeTab} onTabChange={setActiveTab} brandColor="blue" role="STUDENT">
            <div className="space-y-10">
                {isImpersonating && (
                    <div className="bg-blue-600 text-white px-6 py-4 mb-6 flex items-center justify-between shadow-2xl rounded-2xl animate-in fade-in slide-in-from-top duration-700">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 leading-none mb-1">Parent Access Mode</p>
                                <p className="text-base font-bold">Viewing: <span className="text-white">{profile?.user?.first_name} {profile?.user?.last_name}</span></p>
                            </div>
                        </div>
                        <button onClick={handleReturnToParent} className="bg-white text-blue-600 px-6 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 transition-all shadow-xl flex items-center gap-2">
                            ← Return to Parent Portal
                        </button>
                    </div>
                )}
                    {activeClass && (
                        <div className="bg-blue-600 rounded-[3rem] p-10 md:p-12 mb-10 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/2 translate-y-[-50%] group-hover:scale-110 transition-transform"></div>
                             <div className="flex items-center gap-10 relative z-10 w-full md:w-auto">
                                 <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl">
                                     🏫
                                 </div>
                                 <div className="text-left">
                                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100/60 mb-1">Session In Progress</p>
                                     <h4 className="text-white font-black text-xl">Live Class Now Active!</h4>
                                     <p className="text-blue-100 text-sm font-medium">Your {activeClass.course} session is starting now.</p>
                                 </div>
                             </div>
                             <button 
                                 onClick={() => handleJoinClass(activeClass)} 
                                 className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all w-full md:w-auto text-center shadow-lg flex-shrink-0 relative z-10"
                             >
                                 Join Class Now
                             </button>
                         </div>
                    )}

                    {profile?.approval_status === 'APPROVED' && profile?.payment_status === 'UNPAID' && (
                        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 rounded-[3rem] p-10 md:p-12 mb-12 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group border border-white/10">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full translate-x-1/2 translate-y-[-50%]"></div>
                            <div className="flex items-center gap-8 relative z-10">
                                <div className="w-24 h-24 bg-white/20 backdrop-blur-2xl rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
                                    🎉
                                </div>
                                <div>
                                    <h4 className="text-3xl font-display font-black text-white mb-2 uppercase tracking-tighter">Welcome to Hidayah!</h4>
                                    <p className="text-indigo-100 font-bold opacity-90 max-w-lg leading-relaxed">
                                        Congratulations! Your admission has been <span className="underline decoration-blue-400 decoration-2">automatically approved</span>. 
                                        To start your journey, please download your admission letter and complete your first monthly payment.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto relative z-10">
                                {profile.admission_letter && (
                                    <a 
                                        href={profile.admission_letter} 
                                        target="_blank"
                                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all text-center flex items-center justify-center gap-3"
                                    >
                                        <Download size={16} /> Admission Letter
                                    </a>
                                )}
                                <button 
                                    onClick={() => setActiveTab('finance')}
                                    className="bg-white text-indigo-700 hover:bg-indigo-50 px-12 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl shadow-black/20"
                                >
                                    Pay Now & Start →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                        <div>
                            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tight mb-2">
                                Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Portal</span>
                            </motion.h1>
                            <motion.p variants={itemVariants} className="text-slate-500 font-medium text-sm flex items-center gap-2">
                                Welcome back, {user?.first_name} <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            </motion.p>
                        </div>
                        
                        <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
                            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-6 py-3 flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600">
                                    <ShieldCheck size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/60">Admission ID</p>
                                    <p className="text-sm font-mono font-bold text-slate-900 tracking-widest">{user?.admission_number || 'TBA'}</p>
                                </div>
                            </div>
                            
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/booking/request')}
                                className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 flex items-center gap-3"
                            >
                                <Search size={16} /> Find Tutors
                            </motion.button>
                        </motion.div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Wallet Balance', value: `₦${parseFloat(profile?.wallet_balance || 0).toLocaleString()}`, icon: Wallet, colorClass: 'text-blue-600', bgClass: 'bg-blue-600/10', shadowClass: 'shadow-blue-600/5', link: '/payment', action: 'Top up' },
                            { 
                                label: 'Registered Subjects', 
                                value: (profile?.enrollments?.length || 0), 
                                icon: BookOpen, colorClass: 'text-indigo-600', bgClass: 'bg-indigo-600/10', shadowClass: 'shadow-indigo-600/5'
                            },
                            { label: 'New Bookings', value: bookings.filter(b => !b.paid).length, icon: Calendar, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-600/10', shadowClass: 'shadow-emerald-600/5' },
                            { label: 'Total Classes', value: classes.length, icon: GraduationCap, colorClass: 'text-sky-600', bgClass: 'bg-sky-600/10', shadowClass: 'shadow-sky-600/5' },
                        ].map((stat, i) => (
                            <motion.div 
                                key={i}
                                variants={itemVariants}
                                whileHover={{ y: -5 }}
                                className="bg-white border border-slate-100 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-[0_10px_40px_rgba(0,0,0,0.03)]"
                            >
                                <div className="relative z-10">
                                    <div className={`w-12 h-12 rounded-2xl ${stat.bgClass} flex items-center justify-center ${stat.colorClass} mb-6`}>
                                        <stat.icon size={24} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{stat.label}</p>
                                    <h3 className="text-3xl font-display font-black text-slate-900 mb-4">{stat.value}</h3>
                                    {stat.link && (
                                        <Link to={stat.link} className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-2 hover:gap-3 transition-all">
                                            {stat.action} <ArrowRight size={12} />
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                {/* Navigation Tabs — removed; sidebar handles navigation */}

                    {/* Content Section */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-12"
                        >
                            {/* Overview Tab */}
                             {activeTab === 'overview' && (
                                <div className="grid lg:grid-cols-3 gap-10">
                                    <div className="lg:col-span-2 space-y-10">
                                        {/* Bookings Awaiting Action */}
                                        {bookings.some(b => b.status === 'APPROVED' && !b.paid) && (
                                            <div className="bg-blue-50 border border-blue-100 rounded-[3rem] p-10 shadow-sm">
                                                <h3 className="text-xl font-display font-black text-slate-900 mb-6 flex items-center gap-4">
                                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                                    Pending Payments
                                                </h3>
                                                <div className="space-y-4">
                                                    {bookings.filter(b => b.status === 'APPROVED' && !b.paid).map(b => (
                                                        <div key={b.id} className="bg-white border border-slate-100 p-6 rounded-2xl flex justify-between items-center shadow-sm">
                                                            <div>
                                                                <h4 className="text-slate-900 font-bold">{b.subject} with {b.tutor_name}</h4>
                                                                <p className="text-xs text-slate-500">Total Price: ₦{b.price?.toLocaleString()}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => navigate(`/payment?booking_id=${b.id}`)}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Pay Now
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Exam Assignments Summary */}
                                        {examAssignments.some(ea => !ea.is_completed) && (
                                            <div className="bg-blue-50 border border-blue-100 rounded-[3rem] p-10 shadow-sm">
                                                <h3 className="text-xl font-display font-black text-slate-900 mb-6 flex items-center gap-4">
                                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                                    New Assessments
                                                </h3>
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {examAssignments.filter(ea => !ea.is_completed).length > 0 ? (
                                                        examAssignments.filter(ea => !ea.is_completed).map(ea => (
                                                            <div key={ea.id} className="bg-white border border-slate-100 rounded-[2rem] p-8 hover:border-blue-200 transition-all group shadow-sm">
                                                                 <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                                                     <ShieldCheck size={28} />
                                                                 </div>
                                                                 <h4 className="text-xl font-bold text-slate-900 mb-2">{ea.exam_title}</h4>
                                                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Subject: {ea.subject_name}</p>
                                                                 <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                                                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due: {ea.due_date ? new Date(ea.due_date).toLocaleDateString() : 'No limit'}</span>
                                                                     <button 
                                                                         onClick={() => window.location.href = `/exam/practice/${ea.exam}`}
                                                                         className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-2"
                                                                     >
                                                                         Start <ArrowRight size={14} />
                                                                     </button>
                                                                 </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-full py-32 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                                                            <div className="w-20 h-20 bg-blue-600/5 rounded-full flex items-center justify-center text-3xl mx-auto mb-8 animate-pulse text-blue-600">
                                                                {profile?.wallet_balance <= 0 ? '🔒' : '📝'}
                                                            </div>
                                                            <h4 className="text-xl font-bold text-slate-900 mb-2">{profile?.wallet_balance <= 0 ? 'Assessments Locked' : 'All Caught Up'}</h4>
                                                            <p className="text-slate-400 font-bold italic max-w-sm mx-auto">
                                                                {profile?.wallet_balance <= 0 
                                                                    ? 'Your examinations and tests are locked. Please complete your monthly payment to access assessments.' 
                                                                    : 'You have no pending assignments or exams at the moment.'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Registered Subjects & Class Links */}
                                        <div className="bg-slate-50/50 border border-slate-100 rounded-[3rem] p-10">
                                            <h3 className="text-xl font-display font-black text-slate-900 mb-8 flex items-center gap-4">
                                                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                                Registered Subjects & Class Links
                                            </h3>
                                            <div className="grid sm:grid-cols-2 gap-6">
                                                {profile?.enrollments?.map((enr, i) => (
                                                    <div key={i} className="bg-white rounded-[2rem] p-6 border border-slate-100 hover:border-blue-600/30 transition-all group shadow-sm">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-inner ring-1 ring-slate-100">
                                                                {['Quran', 'Arabic', 'Islamic'].some(s => enr.subject_name?.includes(s)) ? '🌙' : '🧪'}
                                                            </div>
                                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.1em] ${enr.status === 'APPROVED' ? 'bg-blue-600/10 text-blue-600' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                                                {enr.status}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-lg font-bold text-slate-900 mb-1">{enr.subject_name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tutor: {enr.tutor_name || 'TBA'}</p>
                                                        <div className="mt-6 pt-6 border-t border-slate-50 flex flex-col gap-4">
                                                            <div className="grid grid-cols-2 gap-2 text-[9px] font-black text-slate-400 uppercase">
                                                                <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg" title="Sessions per week">
                                                                    <Calendar size={12} className="text-blue-600" /> 
                                                                    <span>{enr.days_per_week || 0} Sessions / WK</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg" title="Hours per session">
                                                                    <Clock size={12} className="text-blue-600" /> 
                                                                    <span>{enr.hours_per_week || 0} Hrs / Session</span>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-[9px] font-black text-slate-400 uppercase">
                                                                <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                                                                    <span className="text-indigo-600 font-black">📅</span> 
                                                                    <span className="truncate">{enr.preferred_days || 'Days TBA'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                                                                    <span className="text-indigo-600 font-black">🕒</span> 
                                                                    <span>{enr.preferred_time || 'Time TBA'}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            {enr.status === 'APPROVED' && enr.tutor_class_link && (
                                                                    <button 
                                                                        onClick={() => navigate(`/live/${enr.id || enr.db_id}`)}
                                                                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        📹 Join Classroom ↗
                                                                    </button>
                                                            )}
                                                            {(!enr.tutor_class_link && enr.status === 'APPROVED') && (
                                                                <p className="text-[8px] text-amber-600 font-bold text-center bg-amber-50 py-2 rounded-lg italic">Class link will be active shortly.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!profile?.enrollments || profile.enrollments.length === 0) && (
                                                    <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                        <p className="text-slate-400 font-bold italic">No registered subjects found. Complete your payment for new bookings to see them here.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Recent Sessions */}
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-display font-black text-slate-900 flex items-center gap-4">
                                                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                                Upcoming Sessions
                                            </h3>
                                            <div className="space-y-4">
                                                {classes.slice(0, 3).map((cls, i) => (
                                                    <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-blue-600/30 transition-all shadow-sm">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">🎓</div>
                                                        <div className="flex-1 text-center md:text-left">
                                                            <h4 className="text-lg font-bold text-slate-900">{cls.course}</h4>
                                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Scheduled for {new Date(cls.scheduled_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <button onClick={() => handleJoinClass(cls)} className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all">Enter Classroom</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sidebar Components */}
                                    <div className="space-y-10">
                                        {profile?.admission_letter_url && profile?.approval_status === 'APPROVED' && (
                                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
                                                <div className="relative z-10 flex flex-col items-center text-center">
                                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-xl backdrop-blur-md">📄</div>
                                                    <h4 className="text-xl font-display font-black text-white mb-2">Admission Letter</h4>
                                                    <p className="text-indigo-100 text-xs font-medium mb-8 leading-relaxed">Your official enrollment confirmation is ready for download.</p>
                                                    <a href={profile.admission_letter_url} download target="_blank" className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                                                        <Download size={16} /> Download PDF
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        <div className="bg-blue-50 border border-blue-100 rounded-[2.5rem] p-8 shadow-sm">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-6 flex items-center gap-2">
                                                <Bell size={12} className="animate-bounce" /> Dashboard Alerts
                                            </h4>
                                            <div className="space-y-4">
                                                {notifications.map(n => (
                                                    <div key={n.id} className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-600/30 transition-all shadow-sm">
                                                        <p className="text-xs font-bold text-slate-900 mb-1 leading-tight">{n.title}</p>
                                                        <p className="text-[10px] text-slate-400 leading-relaxed">{n.message}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                             </div>
                                    </div>
                            )}

                            {/* Classes Tab */}
                            {activeTab === 'classes' && (
                                <div className="space-y-10">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-2xl font-display font-black text-slate-900">Live Learning Sessions</h2>
                                        <div className="bg-blue-600/10 px-4 py-2 rounded-full border border-blue-600/20 text-[10px] font-black text-blue-600 uppercase flex items-center gap-2">
                                            <LayoutDashboard size={12} /> Manage Schedule
                                        </div>
                                    </div>
                                    
                                    <div className="grid gap-6">
                                        {classes.length > 0 ? classes.map((cls, i) => (
                                            <div key={i} className="bg-white border border-slate-100 rounded-[2.5rem] p-10 flex flex-col lg:flex-row justify-between items-center gap-10 hover:border-blue-600/30 transition-all shadow-sm">
                                                <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                                                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner ring-1 ring-slate-100 group-hover:scale-110 transition-transform">🏫</div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{cls.type || 'REGULAR COURSE'}</p>
                                                        <h4 className="text-3xl font-display font-black text-slate-900 mb-3">{cls.subject}</h4>
                                                        <div className="flex flex-wrap gap-4 font-bold text-[10px] text-slate-400 uppercase bg-slate-50 p-3 rounded-2xl w-fit">
                                                            <span className="flex items-center gap-2"><Calendar size={12} className="text-blue-600" /> {new Date(cls.scheduled_at).toLocaleDateString()}</span>
                                                            <span className="flex items-center gap-2"><Clock size={12} className="text-indigo-600" /> {new Date(cls.scheduled_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                            <span className="flex items-center gap-2"><User size={12} className="text-sky-600" /> Tutor: {cls.tutor_name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedSessionId(cls.db_id);
                                                            setSelectedSessionType(cls.type || 'REGULAR');
                                                            setShowRescheduleModal(true);
                                                        }}
                                                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest transition-all shadow-sm"
                                                    >
                                                        Reschedule
                                                    </button>
                                                    <button 
                                                        onClick={() => handleJoinClass(cls)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
                                                    >
                                                        Join Live Class →
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-32 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                                                <div className="w-20 h-20 bg-blue-600/5 rounded-full flex items-center justify-center text-3xl mx-auto mb-8 animate-pulse">
                                                    {profile?.wallet_balance <= 0 ? '🔒' : '📅'}
                                                </div>
                                                <h4 className="text-xl font-bold text-slate-900 mb-2">{profile?.wallet_balance <= 0 ? 'Access Locked' : 'No Classes Scheduled'}</h4>
                                                <p className="text-slate-400 font-bold italic max-w-md mx-auto">
                                                    {profile?.wallet_balance <= 0 
                                                        ? 'Please fund your wallet specifically for this month to access your live classes.' 
                                                        : 'No classes are currently scheduled for your courses. Check back later.'}
                                                </p>
                                                {profile?.wallet_balance <= 0 && (
                                                    <button 
                                                        onClick={() => navigate('/student?tab=finance')}
                                                        className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg"
                                                    >
                                                        Top Up Wallet
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Library Tab */}
                            {activeTab === 'library' && (
                                <div className="space-y-10">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <h2 className="text-2xl font-display font-black text-slate-900">Digital Learning Bank</h2>
                                        <div className="relative w-full md:w-96">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="text" placeholder="Search resources..." className="w-full bg-white border border-slate-200 rounded-2xl p-4 pl-14 text-sm font-bold text-slate-900 outline-none focus:border-blue-600/30 transition-all shadow-sm" />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {materials.length > 0 ? materials.map((mat, i) => (
                                            <motion.div 
                                                key={i} 
                                                whileHover={{ y: -5 }} 
                                                className="bg-white border border-slate-100 rounded-[2.5rem] p-8 group hover:border-blue-600/30 transition-all shadow-sm"
                                            >
                                                <div className="flex justify-between items-start mb-8">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl shadow-inner ring-1 ring-slate-100">
                                                        {mat.material_type === 'VIDEO' ? <PlayCircle className="text-blue-600" /> : mat.material_type === 'PDF' ? <FileText className="text-indigo-600" /> : <Music className="text-sky-600" />}
                                                    </div>
                                                    <button className="text-slate-400 hover:text-slate-900 transition-colors"><ExternalLink size={20} /></button>
                                                </div>
                                                <h4 className="text-2xl font-display font-black text-slate-900 mb-2 leading-tight line-clamp-2">{mat.title}</h4>
                                                <p className="text-sm font-medium text-slate-400 leading-relaxed line-clamp-2 mb-8">{mat.description}</p>
                                                <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{mat.material_type}</span>
                                                    <a href={mat.file || mat.external_url} target="_blank" className="bg-blue-600/10 text-blue-600 p-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                                                        <Download size={18} />
                                                    </a>
                                                </div>
                                            </motion.div>
                                        )) : (
                                            <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                                                <div className="w-20 h-20 bg-blue-600/5 rounded-full flex items-center justify-center text-3xl mx-auto mb-8 animate-pulse text-blue-600">
                                                    {profile?.wallet_balance <= 0 ? '🔒' : '📚'}
                                                </div>
                                                <h4 className="text-xl font-bold text-slate-900 mb-2">{profile?.wallet_balance <= 0 ? 'Library Locked' : 'No Materials Found'}</h4>
                                                <p className="text-slate-400 font-bold italic max-w-sm mx-auto">
                                                    {profile?.wallet_balance <= 0 
                                                        ? 'Your learning materials are locked. Please complete your monthly payment to access the library.' 
                                                        : 'No learning resources have been uploaded for your courses yet.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Assessments Tab */}
                            {activeTab === 'assessments' && (
                                <div className="space-y-12">
                                    <div>
                                        <h2 className="text-2xl font-display font-black text-slate-900 mb-8">Pending Examinations</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {examAssignments.filter(ea => !ea.is_completed).length > 0 ? (
                                                examAssignments.filter(ea => !ea.is_completed).map(ea => (
                                                    <div key={ea.id} className="bg-white border border-slate-100 rounded-[2rem] p-8 hover:border-blue-600/30 transition-all group shadow-sm">
                                                        <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                                            <FileText size={24} />
                                                        </div>
                                                        <h4 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{ea.exam_title}</h4>
                                                        <div className="flex flex-col gap-2 mb-8">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned by {ea.tutor_name || 'System'}</p>
                                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Due: {ea.due_date ? new Date(ea.due_date).toLocaleDateString() : 'Immediate'}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => window.location.href = `/exam/practice/${ea.exam}`}
                                                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-600/10"
                                                        >
                                                            Launch CBT Simulator
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                    <p className="text-slate-400 font-bold italic">No pending exams at the moment.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h2 className="text-2xl font-display font-black text-slate-900 mb-8">Performance History</h2>
                                        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                            <div className="grid grid-cols-4 p-6 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                                <div className="col-span-2">Examination</div>
                                                <div>Score</div>
                                                <div>Date Attempted</div>
                                            </div>
                                            <div className="divide-y divide-slate-50">
                                                {examResults.length > 0 ? examResults.map(res => (
                                                    <div key={res.id} className="grid grid-cols-4 p-6 hover:bg-slate-50 transition-all items-center">
                                                        <div className="col-span-2">
                                                            <h5 className="text-sm font-bold text-slate-900">{res.exam_title}</h5>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Aggregate Performance</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-black ${parseFloat(res.score) >= 50 ? 'text-blue-600' : 'text-red-500'}`}>
                                                                {Math.round(res.score)}%
                                                            </span>
                                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                                <div className={`h-full ${parseFloat(res.score) >= 50 ? 'bg-blue-600' : 'bg-red-500'}`} style={{ width: `${res.score}%` }} />
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400">
                                                            {new Date(res.date_taken).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="p-12 text-center text-slate-400 font-bold italic">No results recorded yet.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Finance Tab */}
                            {activeTab === 'finance' && (
                                <div className="grid lg:grid-cols-3 gap-10">
                                    <div className="lg:col-span-2 space-y-10">
                                        <div className="bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full" />
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-12">
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-200 mb-2">Available Credits</p>
                                                        <h3 className="text-6xl font-display font-black text-white tracking-tighter">₦{parseFloat(profile?.wallet_balance || 0).toLocaleString()}</h3>
                                                    </div>
                                                    <div className="w-16 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                                                        <span className="text-white text-xs font-black">PAY</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <a href="/payment" className="flex-1 py-5 bg-white text-blue-600 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                                        <Plus size={18} /> Add Funds to Wallet
                                                    </a>
                                                    <button className="flex-1 py-5 bg-black/20 hover:bg-black/40 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all">Export Transactions</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                                            <h4 className="text-xl font-display font-black text-slate-900 mb-8 flex items-center gap-4">
                                                <TrendingUp size={20} className="text-blue-600" /> Ledger Analytics
                                            </h4>
                                            <div className="grid gap-4">
                                                {transactions.map(t => (
                                                    <div key={t.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-blue-600/30 transition-all shadow-sm">
                                                        <div className="flex items-center gap-6">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${t.transaction_type === 'DEPOSIT' ? 'bg-blue-600/10 text-blue-600' : 'bg-red-500/10 text-red-500'}`}>
                                                                {t.transaction_type === 'DEPOSIT' ? '+' : '-'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900">{t.description}</p>
                                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{new Date(t.timestamp || t.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end gap-2">
                                                            <div className="text-sm font-black tabular-nums text-slate-900">
                                                                ₦{parseFloat(t.amount).toLocaleString()}
                                                            </div>
                                                            <button 
                                                                onClick={() => handleDownloadReceipt(t)}
                                                                className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                                                            >
                                                                <Download size={10} /> Receipt
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Card Management</h4>
                                            <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 group hover:border-blue-600/30 transition-all cursor-pointer relative overflow-hidden shadow-xl">
                                                <div className="flex justify-between items-start mb-10 relative z-10">
                                                    <div className="w-8 h-8 rounded-full border border-white/20" />
                                                    <ShieldCheck size={18} className="text-blue-400" />
                                                </div>
                                                <div className="relative z-10">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                                    <p className="text-xs font-bold text-white">READY FOR BILLING</p>
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                        <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex items-start gap-4 shadow-sm">
                                            <AlertCircle className="text-blue-500 shrink-0" size={20} />
                                            <div>
                                                <h5 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Billing Policy</h5>
                                                <p className="text-[10px] text-slate-500 leading-relaxed font-bold">Payments are non-refundable after a session has been successfully completed by the assigned tutor.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Feedback Tab */}
                            {/* Feedback Tab */}
                            {activeTab === 'feedback' && (
                                <div className="max-w-4xl mx-auto space-y-12">
                                    <div className="text-center">
                                        <h2 className="text-4xl font-display font-black text-slate-900 mb-4">Quality & Support</h2>
                                        <p className="text-slate-500 font-medium">We monitor every session to ensure global educational standards.</p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-3">
                                                <MessageSquare className="text-blue-600" /> My Activity Log
                                            </h4>
                                            {complaints.filed_by_me.map(c => (
                                                <div key={c.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="bg-slate-50 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-400">{c.status}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <h5 className="text-lg font-bold text-slate-900 mb-2">{c.subject}</h5>
                                                    <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-blue-600/5 rounded-[3rem] p-10 border border-blue-600/10 flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center text-3xl mb-8">📣</div>
                                            <h4 className="text-2xl font-display font-black text-blue-600 mb-4">Need Assistance?</h4>
                                            <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">If you have any issues with your tutor or the platform, our support team is available 24/7 to resolve them.</p>
                                            <button 
                                                onClick={() => setShowComplaintModal(true)}
                                                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                                            >
                                                File Formal Report →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* JAMB CBT Tab */}
                            {activeTab === 'jamb' && (
                                <div className="space-y-10">
                                    <JambCBT token={token} studentProfile={profile} />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                {/* Quran Section - Pushed to bottom or shown based on enrollment */}
                {profile?.enrolled_course && ['Quran', 'Arabic', 'Tajweed'].some(s => profile.enrolled_course.includes(s)) && (
                    <motion.div variants={itemVariants} className="mt-20">
                        <QuranMushaf token={token} />
                    </motion.div>
                )}

            {/* Modals */}
            <ComplaintModal isOpen={showComplaintModal} onClose={() => setShowComplaintModal(false)} filedAgainstId={profile?.assigned_tutor_details?.id} filedAgainstName={profile?.assigned_tutor_details?.full_name} token={token} />
            <RescheduleModal isOpen={showRescheduleModal} onClose={() => setShowRescheduleModal(false)} sessionId={selectedSessionId} sessionType={selectedSessionType} initiatedBy="STUDENT" token={token} onSuccess={fetchData} />

            {/* Premium Enrollment Modal */}
            <AnimatePresence>
                {showEnrollModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEnrollModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />
                        
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            className="bg-white w-full max-w-2xl rounded-[3rem] border border-slate-100 shadow-3xl overflow-hidden relative z-10 flex flex-col md:flex-row"
                        >
                            {/* Modal Left: Info Panel */}
                            <div className="hidden md:block w-72 bg-gradient-to-br from-blue-600 to-indigo-900 p-10 text-white relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
                                <div className="h-full flex flex-col justify-between relative z-10">
                                    <div>
                                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-8 backdrop-blur-md">✨</div>
                                        <h3 className="text-2xl font-display font-black mb-4">New Subject</h3>
                                        <p className="text-blue-100 text-xs font-medium leading-relaxed uppercase tracking-widest opacity-60">Expand your intellectual journey with our expert tutors.</p>
                                    </div>
                                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Estimated Impact</p>
                                        <p className="text-white text-md font-bold">+15 Lessons Monthly</p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Right: Form Panel */}
                            <div className="flex-1 p-8 md:p-12 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                                <button onClick={() => setShowEnrollModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors group">
                                    <X size={24} className="group-hover:rotate-90 transition-transform" />
                                </button>
                                
                                <div className="space-y-10">
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Academic Program</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-blue-600/30 outline-none appearance-none transition-all"
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const subj = availableSubjects.find(s => s.id == val);
                                                    setEnrollData(prev => ({ ...prev, subject_id: val, tutor_id: '' }));
                                                    setSelectedTutorAvailability(null);
                                                    if (subj) fetchTutorsForSubject(subj.name);
                                                }}
                                            >
                                                <option value="">Select Subject</option>
                                                {availableSubjects.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Expert Tutor Replacement</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-blue-600/30 outline-none appearance-none transition-all"
                                                value={enrollData.tutor_id}
                                                onChange={(e) => {
                                                    const uid = e.target.value;
                                                    const t = availableTutors.find(item => String(item.user?.id || item.user_id || item.id) === String(uid));
                                                    if (t) {
                                                        const rate = parseFloat(String(t.hourly_rate || 0).replace(/[^0-9.]/g, '')) || 0;
                                                        setEnrollData(prev => ({ ...prev, tutor_id: uid, active_tutor_rate: rate }));
                                                        setSelectedTutorAvailability({ 
                                                            availabilities: Array.isArray(t.availabilities) ? t.availabilities : [],
                                                            busy_slots: Array.isArray(t.busy_slots) ? t.busy_slots : [] 
                                                        });
                                                    }
                                                }}
                                            >
                                                <option value="">Select Preferred Tutor</option>
                                                {availableTutors.map(t => (
                                                    <option key={t.user?.id || t.id || t.user_id} value={t.user?.id || t.id || t.user_id}>{t.user?.first_name ? `${t.user.first_name} ${t.user.last_name}` : t.full_name} (₦{t.hourly_rate}/hr)</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                       {/* Availability Status */}
                                    {selectedTutorAvailability && (
                                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Tutor Working Hours</h5>
                                            <div className="space-y-3">
                                                {selectedTutorAvailability.availabilities?.length > 0 ? (
                                                    selectedTutorAvailability.availabilities.map((av, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-[10px] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                            <span className="font-bold text-slate-900 uppercase tracking-widest">{av.day}</span>
                                                            <span className="text-blue-600 font-black">{av.start_time.slice(0, 5)} - {av.end_time.slice(0, 5)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 font-bold italic">No specific availability slots listed.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Days Selection */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Preferred Start Date</label>
                                        <input 
                                            type="date" 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-900 outline-none focus:border-blue-600/30 transition-all"
                                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                            onChange={(e) => setEnrollData(prev => ({ ...prev, preferred_start_date: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Weekly Schedule</label>
                                            <button 
                                                onClick={() => setEnrollData(prev => ({ ...prev, schedule: [...prev.schedule, { day: '', time: '' }] }))}
                                                className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors"
                                            >
                                                + Add Day
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {enrollData.schedule.map((slot, index) => (
                                                <div key={index} className="flex gap-3 items-end group/slot">
                                                    <div className="flex-1 space-y-1">
                                                        <select 
                                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-blue-600/30 outline-none transition-all"
                                                            value={slot.day}
                                                            onChange={(e) => {
                                                                const newSchedule = [...enrollData.schedule];
                                                                newSchedule[index].day = e.target.value.toUpperCase();
                                                                setEnrollData(prev => ({ ...prev, schedule: newSchedule }));
                                                            }}
                                                        >
                                                            <option value="">Select Day</option>
                                                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                                                <option key={d} value={d}>{d}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="w-32 space-y-1">
                                                        <input
                                                            type="time"
                                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-blue-600/30 outline-none transition-all"
                                                            value={slot.time}
                                                            onChange={(e) => {
                                                                const newSchedule = [...enrollData.schedule];
                                                                newSchedule[index].time = e.target.value;
                                                                setEnrollData(prev => ({ ...prev, schedule: newSchedule }));
                                                            }}
                                                        />
                                                    </div>
                                                    {enrollData.schedule.length > 1 && (
                                                        <button 
                                                            onClick={() => setEnrollData(prev => ({ ...prev, schedule: prev.schedule.filter((_, i) => i !== index) }))}
                                                            className="bg-red-50 text-red-500 p-4 rounded-2xl border border-red-100 hover:bg-red-100 transition-all mb-0"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Conflict / Availability Warning */}
                                    {scheduleStatus.message && (
                                        <div className={`p-4 border rounded-2xl flex items-center gap-3 ${scheduleStatus.status === 'error' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                                            {scheduleStatus.status === 'error' ? <AlertCircle className="text-red-500" size={16} /> : <CheckCircle2 className="text-blue-600" size={16} />}
                                            <p className={`text-[10px] font-black uppercase tracking-widest leading-relaxed ${scheduleStatus.status === 'error' ? 'text-red-500' : 'text-blue-600'}`}>
                                                {scheduleStatus.message}
                                            </p>
                                        </div>
                                    )}

                                    {enrollData.active_tutor_rate > 0 && (
                                        <div className="bg-blue-50 rounded-[2rem] p-8 border border-blue-100 relative overflow-hidden">
                                            <div className="flex justify-between items-baseline gap-4 mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Estimated Monthly Tuition</span>
                                                <span className="text-3xl font-black text-slate-900 tabular-nums">₦{(enrollData.active_tutor_rate * enrollData.hours_per_week * enrollData.schedule.length * 4).toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">Calculated based on {enrollData.schedule.length} sessions per week at tutor's current hourly rate.</p>
                                        </div>
                                    )}

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleEnroll}
                                        disabled={enrolling || !enrollData.subject_id || !enrollData.tutor_id || scheduleStatus.status === 'error'}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-3xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed group/btn"
                                    >
                                        {enrolling ? (<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />) : (<><CheckCircle2 size={20} /> Submit Enrollment →</>)}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            </div>
        </DashboardLayout>
    );
};

export default StudentDashboard;

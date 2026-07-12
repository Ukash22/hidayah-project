import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api, { asList, getApiError } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard as IconLayoutDashboard, Download as IconDownload, Plus as IconPlus,
    CheckCircle2 as IconCheckCircle2, ShieldCheck as IconShieldCheck, X as IconX,
    AlertCircle as IconAlertCircle, Wallet as IconWallet, BookOpen as IconBookOpen,
    GraduationCap as IconGraduationCap, Bell as IconBell, ArrowRight as IconArrowRight,
    Search as IconSearch, Clock as IconClock, Calendar as IconCalendar, PlayCircle as IconPlayCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { EmptyState, SkeletonCard, FetchError } from '../../components/ui';

const ITEM_VARIANTS = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export default function StudentOverview() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [profile, setProfile] = useState(null);
    const [classes, setClasses] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [examAssignments, setExamAssignments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [availableTutors, setAvailableTutors] = useState([]);
    const [enrollData, setEnrollData] = useState({
        subject_id: '', tutor_id: '', hours_per_week: 1, days_per_week: 1,
        schedule: [{ day: '', time: '' }], preferred_start_date: '', active_tutor_rate: 0,
    });
    const [selectedTutorAvailability, setSelectedTutorAvailability] = useState(null);
    const [enrolling, setEnrolling] = useState(false);

    const isImpersonating = !!localStorage.getItem('parent_access');

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoadError(false);
        try {
            const [profRes, classRes, bookingRes, examAsgnRes] = await Promise.all([
                api.get(`/api/students/me/`),
                api.get(`/api/classes/sessions/`),
                api.get(`/api/classes/booking/request/`),
                api.get(`/api/exams/assignments/`),
            ]);
            setProfile(profRes.data);
            setClasses(Array.isArray(classRes.data) ? classRes.data : (classRes.data.results || classRes.data.classes || []));
            setBookings(asList(bookingRes.data));
            setExamAssignments(asList(examAsgnRes.data));

            try {
                const notifRes = await api.get(`/api/auth/notifications/`);
                setNotifications(notifRes.data.slice(0, 3));
            } catch { /* non-critical */ }

            const subRes = await api.get(`/api/programs/subjects/`);
            setAvailableSubjects(subRes.data);
        } catch (err) {
            console.error('Overview fetch failed', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchTutorsForSubject = useCallback(async (subjectName) => {
        try {
            const res = await api.get(`/api/tutors/by_subject/?subject=${subjectName}`);
            setAvailableTutors(res.data);
            if (res.data.length > 0) {
                const t = res.data[0];
                const uid = t.user?.id || t.user_id || t.id;
                const rate = parseFloat(String(t.hourly_rate || 0).replace(/[^0-9.]/g, '')) || 0;
                setEnrollData(prev => ({ ...prev, tutor_id: String(uid), active_tutor_rate: rate, schedule: [{ day: '', time: '' }] }));
                setSelectedTutorAvailability({ availabilities: t.availabilities || [], busy_slots: t.busy_slots || [] });
            }
        } catch (e) { console.error('Tutor fetch failed', e); }
    }, [getAuthHeader]);

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
                        tutor_id: profile.preferred_tutor_id ? String(profile.preferred_tutor_id) : prev.tutor_id,
                    }));
                    fetchTutorsForSubject(subj.name);
                }
            }
        }
    }, [showEnrollModal, profile, availableSubjects, fetchTutorsForSubject]);

    const scheduleStatus = useMemo(() => {
        if (!enrollData.schedule?.length || !selectedTutorAvailability) return { status: 'pending', message: null };
        const first = enrollData.schedule[0];
        if (!first.day || !first.time) return { status: 'pending', message: 'Enter a day and time' };
        const worksThisDay = selectedTutorAvailability.availabilities?.find(av => av.day.toUpperCase() === first.day.toUpperCase());
        if (!worksThisDay) return { status: 'error', message: `Tutor does not work on ${first.day.toLowerCase()}s.` };
        const [h, m] = first.time.split(':').map(Number);
        const sel = h * 60 + m;
        const [sh, sm] = worksThisDay.start_time.split(':').map(Number);
        const [eh, em] = worksThisDay.end_time.split(':').map(Number);
        if (sel < sh * 60 + sm || sel > eh * 60 + em) {
            return { status: 'error', message: `Tutor works ${worksThisDay.start_time.slice(0, 5)}–${worksThisDay.end_time.slice(0, 5)}.` };
        }
        if (!enrollData.preferred_start_date) return { status: 'pending', message: 'Select a start date' };
        const selDT = new Date(`${enrollData.preferred_start_date}T${first.time}:00`);
        const conflict = selectedTutorAvailability.busy_slots?.find(slot => {
            const s = new Date(slot.start), e = new Date(slot.end);
            return selDT >= s && selDT < e;
        });
        if (conflict) return { status: 'error', message: 'Tutor is already busy at this time!' };
        return { status: 'success', message: 'Tutor is available for this slot!' };
    }, [enrollData.schedule, enrollData.preferred_start_date, selectedTutorAvailability]);

    const handleEnroll = useCallback(async () => {
        if (!enrollData.subject_id || !enrollData.tutor_id) return;
        setEnrolling(true);
        try {
            await api.post(`/api/students/enroll-subject/`,
                { ...enrollData, days_per_week: enrollData.schedule.length },
                { headers: getAuthHeader() }
            );
            toast.success('Enrollment requested! Tutor has been notified.');
            setShowEnrollModal(false);
            fetchData();
        } catch (err) {
            toast.error(getApiError(err, 'Enrollment request failed. Please try again.'));
        } finally {
            setEnrolling(false);
        }
    }, [enrollData, getAuthHeader, fetchData, toast]);

    const handleJoinClass = useCallback(async (cls) => {
        const sessionId = cls.db_id || cls.id;
        if (!sessionId) { toast.error('Invalid session ID'); return; }
        api.post(`/api/classes/session/${sessionId}/start/`, {})
            .catch(e => { if (!axios.isCancel(e)) console.warn('Join notify failed:', e.message); });
        navigate(`/live/${sessionId}`);
    }, [getAuthHeader, navigate, toast]);

    const handleReturnToParent = () => {
        // S4: dropping the child override is enough — the parent's session is
        // restored from the httpOnly refresh cookie on the next page load.
        localStorage.removeItem('access');
        localStorage.removeItem('parent_access');
        localStorage.removeItem('parent_refresh'); // legacy key
        window.location.href = '/parent';
    };

    const activeClass = classes.find(cls => {
        const t = new Date(cls.scheduled_at).getTime();
        const now = Date.now();
        return now >= t - 30 * 60 * 1000 && now <= t + 60 * 60 * 1000;
    });

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    if (loadError) return (
        <FetchError message="Couldn't load your dashboard. Please check your connection." onRetry={() => { setLoading(true); fetchData(); }} />
    );

    return (
        <>
            <title>My Dashboard — Hidayah</title>

            <div className="space-y-10">
                {/* Impersonation banner */}
                {isImpersonating && (
                    <div className="bg-primary text-white px-6 py-4 flex items-center justify-between shadow-2xl rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                <IconShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70 leading-none mb-1">Parent Access Mode</p>
                                <p className="text-base font-bold">Viewing: {profile?.user?.first_name} {profile?.user?.last_name}</p>
                            </div>
                        </div>
                        <button onClick={handleReturnToParent} className="bg-white dark:bg-slate-900 text-primary px-6 py-2 rounded-xl font-semibold uppercase tracking-wide text-[11px] hover:bg-primary-soft transition-all shadow-xl flex items-center gap-2">
                            ← Return to Parent Portal
                        </button>
                    </div>
                )}

                {/* Active class banner */}
                {activeClass && (
                    <div className="bg-primary rounded-card-lg p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                        <div className="flex items-center gap-10 relative z-10">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-card flex items-center justify-center text-4xl shadow-2xl">🏫</div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100/60 mb-1">Session In Progress</p>
                                <h4 className="text-white font-bold text-xl">Live Class Now Active!</h4>
                                <p className="text-blue-100 text-sm font-medium">Your {activeClass.course} session is starting now.</p>
                            </div>
                        </div>
                        <button onClick={() => handleJoinClass(activeClass)} className="bg-white dark:bg-slate-900 text-blue-700 hover:bg-primary-soft px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shrink-0 relative z-10">
                            Join Class Now
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div>
                        <motion.h1 variants={ITEM_VARIANTS} className="text-4xl md:text-5xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                            Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Portal</span>
                        </motion.h1>
                        <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                            Welcome back, {user?.first_name} <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl px-6 py-3 flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <IconShieldCheck size={20} />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/60">Admission ID</p>
                                <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 tracking-widest">{user?.admission_number || 'TBA'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/booking/request')}
                            className="bg-gradient-to-r from-blue-700 to-primary text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-3"
                        >
                            <IconSearch size={16} /> Find Tutors
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Wallet Balance', value: `₦${parseFloat(profile?.wallet_balance || 0).toLocaleString()}`, icon: IconWallet, colorClass: 'text-primary', bgClass: 'bg-primary/10', link: '/payment', action: 'Top up' },
                        { label: 'Registered Subjects', value: profile?.enrollments?.length || 0, icon: IconBookOpen, colorClass: 'text-indigo-600', bgClass: 'bg-indigo-600/10' },
                        { label: 'New Bookings', value: bookings.filter(b => !b.paid).length, icon: IconCalendar, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-600/10' },
                        { label: 'Total Classes', value: classes.length, icon: IconGraduationCap, colorClass: 'text-sky-600', bgClass: 'bg-sky-600/10' },
                    ].map((stat, i) => (
                        <motion.div key={i} variants={ITEM_VARIANTS} whileHover={{ y: -5 }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card-lg p-5 md:p-8 overflow-hidden group shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
                            <div className={`w-12 h-12 rounded-2xl ${stat.bgClass} flex items-center justify-center ${stat.colorClass} mb-6`}>
                                <stat.icon size={24} />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{stat.label}</p>
                            <h3 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100 mb-4">{stat.value}</h3>
                            {stat.link && (
                                <Link to={stat.link} className="text-[10px] font-bold uppercase text-primary flex items-center gap-2 hover:gap-3 transition-all">
                                    {stat.action} <IconArrowRight size={12} />
                                </Link>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        {/* Pending payments */}
                        {bookings.some(b => b.status === 'APPROVED' && !b.paid) && (
                            <div className="bg-primary-soft border border-blue-100 rounded-card-lg p-6 md:p-10 shadow-sm">
                                <h3 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-4">
                                    <div className="w-1.5 h-6 bg-primary rounded-full" /> Pending Payments
                                </h3>
                                <div className="space-y-4">
                                    {bookings.filter(b => b.status === 'APPROVED' && !b.paid).map(b => (
                                        <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl flex justify-between items-center shadow-sm">
                                            <div>
                                                <h4 className="text-slate-900 dark:text-slate-100 font-bold">{b.subject} with {b.tutor_name}</h4>
                                                <p className="text-xs text-slate-500">Total Price: ₦{b.price?.toLocaleString()}</p>
                                            </div>
                                            <button onClick={() => navigate(`/payment?booking_id=${b.id}`)} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all">Pay Now</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Registered subjects */}
                        <div className="bg-slate-50/50 border border-slate-100 dark:border-slate-800 rounded-card-lg p-6 md:p-10">
                            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 mb-8 flex items-center gap-4">
                                <div className="w-1.5 h-6 bg-primary rounded-full" /> Registered Subjects & Class Links
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-6">
                                {profile?.enrollments?.map((enr, i) => (
                                    <div key={`enr-${i}`} className="bg-white dark:bg-slate-900 rounded-card p-6 border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-center text-xl shadow-inner ring-1 ring-slate-100">
                                                {['Quran', 'Arabic', 'Islamic'].some(s => enr.subject_name?.includes(s)) ? '🌙' : '🧪'}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] ${enr.status === 'APPROVED' ? 'bg-primary/10 text-primary' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                                {enr.status}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{enr.subject_name}</h4>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tutor: {enr.tutor_name || 'TBA'}</p>
                                        <div className="mt-6 pt-6 border-t border-slate-50 flex flex-col gap-4">
                                            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-500 uppercase">
                                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                                                    <IconCalendar size={12} className="text-primary" /> {enr.days_per_week || 0} Sessions / WK
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                                                    <IconClock size={12} className="text-primary" /> {enr.hours_per_week || 0} Hrs / Session
                                                </div>
                                            </div>
                                            {enr.status === 'APPROVED' && enr.tutor_class_link && (
                                                <button
                                                    onClick={() => navigate(`/live/${enr.id || enr.db_id}`)}
                                                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest text-center shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                                >
                                                    📹 Enter Subject Classroom ↗
                                                </button>
                                            )}
                                            <Link to="/student/classes" className="w-full text-primary py-1 font-bold text-[9px] uppercase tracking-widest hover:underline text-center">
                                                View Detailed Schedule →
                                            </Link>
                                        </div>
                                    </div>
                                ))}

                                {(!profile?.enrollments?.length && !bookings.filter(b => !b.paid).length) && (
                                    <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-slate-500 font-bold italic">No registered subjects or bookings found.</p>
                                        <button onClick={() => navigate('/booking/request')} className="mt-4 text-primary font-bold text-[10px] uppercase tracking-widest">Book Your First Subject →</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming sessions */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 flex items-center gap-4">
                                <div className="w-1.5 h-6 bg-primary rounded-full" /> Upcoming Sessions
                            </h3>
                            <div className="space-y-4">
                                {classes.length > 0 ? classes.slice(0, 3).map((cls, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card p-6 flex flex-col md:flex-row items-center gap-6 hover:border-primary/30 transition-all shadow-sm">
                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🎓</div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{cls.subject}</h4>
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Scheduled for {new Date(cls.scheduled_at).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => handleJoinClass(cls)} className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-2xl text-[11px] font-semibold uppercase tracking-wide text-slate-600 transition-all">Enter Classroom</button>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center bg-slate-50/50 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-slate-500 font-bold italic text-sm">No upcoming sessions. Classes appear here once your booking is finalized and paid.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-10">
                        {profile?.admission_letter_url && profile?.approval_status === 'APPROVED' && (
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-card-lg p-5 md:p-8 shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full" />
                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-xl backdrop-blur-md">📄</div>
                                    <h4 className="text-xl font-display font-bold text-white mb-2">Admission Letter</h4>
                                    <p className="text-indigo-100 text-xs font-medium mb-8 leading-relaxed">Your official enrollment confirmation is ready for download.</p>
                                    <a href={profile.admission_letter_url} download target="_blank" rel="noreferrer" className="w-full py-4 bg-white dark:bg-slate-900 text-indigo-600 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                                        <IconDownload size={16} /> Download PDF
                                    </a>
                                </div>
                            </div>
                        )}

                        {notifications.length > 0 && (
                            <div className="bg-primary-soft border border-blue-100 rounded-card-lg p-5 md:p-8 shadow-sm">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-6 flex items-center gap-2">
                                    <IconBell size={12} className="animate-bounce" /> Dashboard Alerts
                                </h4>
                                <div className="space-y-4">
                                    {notifications.map(n => (
                                        <div key={n.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all shadow-sm">
                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 leading-tight">{n.title}</p>
                                            <p className="text-[10px] text-slate-500 leading-relaxed">{n.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Enrollment Modal */}
            <AnimatePresence>
                {showEnrollModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEnrollModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-card-lg border border-slate-100 dark:border-slate-800 shadow-3xl overflow-hidden relative z-10 flex flex-col md:flex-row"
                        >
                            <div className="hidden md:block w-72 bg-gradient-to-br from-primary to-indigo-900 p-10 text-white relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
                                <div className="h-full flex flex-col justify-between relative z-10">
                                    <div>
                                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-8 backdrop-blur-md">✨</div>
                                        <h3 className="text-2xl font-display font-bold mb-4">New Subject</h3>
                                        <p className="text-blue-100 text-xs font-medium leading-relaxed uppercase tracking-widest opacity-60">Expand your intellectual journey with our expert tutors.</p>
                                    </div>
                                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1">Estimated Impact</p>
                                        <p className="text-white text-md font-bold">+15 Lessons Monthly</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-8 md:p-12 relative max-h-[90vh] overflow-y-auto">
                                <button onClick={() => setShowEnrollModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-slate-900 transition-colors">
                                    <IconX size={24} />
                                </button>
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label htmlFor="subject_id" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">Academic Program</label>
                                        <select id="subject_id" name="subject_id" className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold text-slate-900 dark:text-slate-100 focus:border-primary/30 outline-none appearance-none"
                                            onChange={e => {
                                                const subj = availableSubjects.find(s => s.id == e.target.value);
                                                setEnrollData(prev => ({ ...prev, subject_id: e.target.value, tutor_id: '' }));
                                                setSelectedTutorAvailability(null);
                                                if (subj) fetchTutorsForSubject(subj.name);
                                            }}>
                                            <option value="">Select Subject</option>
                                            {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="tutor_id" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">Expert Tutor</label>
                                        <select id="tutor_id" name="tutor_id" className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold text-slate-900 dark:text-slate-100 focus:border-primary/30 outline-none appearance-none"
                                            value={enrollData.tutor_id}
                                            onChange={e => {
                                                const uid = e.target.value;
                                                const t = availableTutors.find(item => String(item.user?.id || item.user_id || item.id) === String(uid));
                                                if (t) {
                                                    const rate = parseFloat(String(t.hourly_rate || 0).replace(/[^0-9.]/g, '')) || 0;
                                                    setEnrollData(prev => ({ ...prev, tutor_id: uid, active_tutor_rate: rate }));
                                                    setSelectedTutorAvailability({ availabilities: t.availabilities || [], busy_slots: t.busy_slots || [] });
                                                }
                                            }}>
                                            <option value="">Select Preferred Tutor</option>
                                            {availableTutors.map(t => (
                                                <option key={t.user?.id || t.id} value={t.user?.id || t.id || t.user_id}>
                                                    {t.user?.first_name ? `${t.user.first_name} ${t.user.last_name}` : t.full_name} (₦{t.hourly_rate}/hr)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedTutorAvailability && (
                                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-3xl p-6">
                                            <h5 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-4">Tutor Working Hours</h5>
                                            <div className="space-y-2">
                                                {selectedTutorAvailability.availabilities?.map((av, i) => (
                                                    <div key={i} className="flex justify-between text-[10px] bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                        <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">{av.day}</span>
                                                        <span className="text-primary font-bold">{av.start_time.slice(0, 5)} - {av.end_time.slice(0, 5)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label htmlFor="preferred_start_date" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 ml-1">Preferred Start Date</label>
                                        <input id="preferred_start_date" name="preferred_start_date" type="date"
                                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-primary/30"
                                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                            onChange={e => setEnrollData(prev => ({ ...prev, preferred_start_date: e.target.value }))} />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Weekly Schedule</label>
                                            <button onClick={() => setEnrollData(prev => ({ ...prev, schedule: [...prev.schedule, { day: '', time: '' }] }))}
                                                className="text-[10px] font-bold uppercase text-primary hover:text-primary-dark transition-colors">+ Add Day</button>
                                        </div>
                                        <div className="space-y-3">
                                            {enrollData.schedule.map((slot, index) => (
                                                <div key={index} className="flex gap-3 items-end">
                                                    <select id={`schedule_day_${index}`} name={`schedule_day_${index}`}
                                                        className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold text-slate-900 dark:text-slate-100 focus:border-primary/30 outline-none"
                                                        value={slot.day}
                                                        onChange={e => {
                                                            const s = [...enrollData.schedule];
                                                            s[index].day = e.target.value.toUpperCase();
                                                            setEnrollData(prev => ({ ...prev, schedule: s }));
                                                        }}>
                                                        <option value="">Select Day</option>
                                                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}
                                                    </select>
                                                    <input id={`schedule_time_${index}`} name={`schedule_time_${index}`} type="time"
                                                        className="w-32 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold text-slate-900 dark:text-slate-100 focus:border-primary/30 outline-none"
                                                        value={slot.time}
                                                        onChange={e => {
                                                            const s = [...enrollData.schedule];
                                                            s[index].time = e.target.value;
                                                            setEnrollData(prev => ({ ...prev, schedule: s }));
                                                        }} />
                                                    {enrollData.schedule.length > 1 && (
                                                        <button onClick={() => setEnrollData(prev => ({ ...prev, schedule: prev.schedule.filter((_, i) => i !== index) }))}
                                                            className="bg-red-50 text-red-500 p-4 rounded-2xl border border-red-100 hover:bg-red-100 transition-all">
                                                            <IconX size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {scheduleStatus.message && (
                                        <div className={`p-4 border rounded-2xl flex items-center gap-3 ${scheduleStatus.status === 'error' ? 'bg-red-50 border-red-100' : 'bg-primary-soft border-blue-100'}`}>
                                            {scheduleStatus.status === 'error'
                                                ? <IconAlertCircle className="text-red-500" size={16} />
                                                : <IconCheckCircle2 className="text-primary" size={16} />}
                                            <p className={`text-[11px] font-semibold uppercase tracking-wide ${scheduleStatus.status === 'error' ? 'text-red-500' : 'text-primary'}`}>
                                                {scheduleStatus.message}
                                            </p>
                                        </div>
                                    )}
                                    {enrollData.active_tutor_rate > 0 && (
                                        <div className="bg-primary-soft rounded-card p-5 md:p-8 border border-blue-100">
                                            <div className="flex justify-between items-baseline gap-4 mb-2">
                                                <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">Estimated Monthly Tuition</span>
                                                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">₦{(enrollData.active_tutor_rate * enrollData.hours_per_week * enrollData.schedule.length * 4).toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Based on {enrollData.schedule.length} sessions/week at tutor's current hourly rate.</p>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleEnroll}
                                        disabled={enrolling || !enrollData.subject_id || !enrollData.tutor_id || scheduleStatus.status === 'error'}
                                        className="w-full bg-primary hover:bg-primary-dark text-white py-6 rounded-3xl font-bold uppercase text-xs tracking-[0.3em] shadow-3xl active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        {enrolling ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><IconCheckCircle2 size={20} /> Submit Enrollment →</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

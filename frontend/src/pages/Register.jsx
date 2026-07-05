import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { asList } from '../services/api';
import RegisterStep1 from './register/RegisterStep1';
import RegisterStep2 from './register/RegisterStep2';
import RegisterStep3 from './register/RegisterStep3';

const EXAM_LEVELS = ['JAMB', 'WAEC', 'NECO', 'JUNIOR_WAEC'];

const getRateByLevel = (level) => {
    if (['JAMB', 'WAEC', 'NECO'].includes(level)) return 2500;
    if (['SECONDARY', 'JUNIOR_WAEC'].includes(level)) return 2000;
    return 1500;
};

const calculateAge = (dob) => {
    if (!dob) return 20;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

const StepIndicator = ({ current, total }) => (
    <div className="max-w-xs mx-auto mb-12">
        <div className="flex justify-between items-center mb-3">
            {Array.from({ length: total }, (_, i) => i + 1).map(s => (
                <div key={s} className="flex flex-col items-center gap-1.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${current >= s ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-300 border-slate-200'}`}>
                        {current > s ? <CheckCircle2 size={14} /> : s}
                    </div>
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${current === s ? 'text-primary' : 'text-slate-500'}`}>
                        {['Account', 'Learning', 'Confirm'][s - 1]}
                    </span>
                </div>
            ))}
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
                transition={{ duration: 0.4 }}
            />
        </div>
    </div>
);

const cardCls = "bg-white rounded-card-lg border border-slate-100 shadow-xl p-8 md:p-10";

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, login } = useAuth();
    const toast = useToast();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [showParentPass, setShowParentPass] = useState(false);

    const [account, setAccount] = useState({
        firstName: '', lastName: '', username: '', email: '',
        password: '', confirmPassword: '', dob: '', gender: 'Male',
        phone: '', country: '',
    });

    const [learning, setLearning] = useState({
        classType: 'ONE_ON_ONE',
        level: 'PRIMARY',
        targetExamYear: new Date().getFullYear().toString(),
        hoursPerSession: '1',
        preferredStartDate: '',
        schedule: [{ day: 'Monday', time: '09:00' }],
    });
    const [subjectsByCategory, setSubjectsByCategory] = useState({});
    const [subjectEnrollments, setSubjectEnrollments] = useState({});
    const [tutorsBySubject, setTutorsBySubject] = useState({});
    const [loadingTutors, setLoadingTutors] = useState({});

    const [parent, setParent] = useState({
        parentFirstName: '', parentLastName: '', parentEmail: '',
        parentPassword: '', relationship: 'Father',
    });

    const isMinor = calculateAge(account.dob) < 18;

    const [preSelectedTutorId, setPreSelectedTutorId] = useState(null);
    const [preSelectedTutorName, setPreSelectedTutorName] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tid = params.get('tutor_id');
        const tname = params.get('tutor_name');
        if (tid) {
            setPreSelectedTutorId(Number(tid));
            setPreSelectedTutorName(decodeURIComponent(tname || ''));
        }
    }, [location.search]);

    useEffect(() => {
        if (!preSelectedTutorId) return;
        setSubjectEnrollments(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(s => { updated[s] = preSelectedTutorId; });
            return updated;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preSelectedTutorId, JSON.stringify(Object.keys(subjectEnrollments))]);

    useEffect(() => {
        api.get('/api/programs/subjects/')
            .then(res => {
                const data = asList(res.data);
                if (data.length > 0) {
                    const grouped = data.reduce((acc, sub) => {
                        const label = sub.program_type === 'ISLAMIC' ? 'Islamic Education'
                            : sub.program_type === 'WESTERN' ? 'Western Education'
                            : 'Exam Preparation';
                        if (!acc[label]) acc[label] = [];
                        acc[label].push(sub.name);
                        return acc;
                    }, {});
                    setSubjectsByCategory(grouped);
                } else {
                    setSubjectsByCategory({
                        'Islamic Education': ['Quranic Recitation', 'Arabic Foundation', 'Hifz Program'],
                        'Western Education': ['Mathematics', 'English Language', 'Science'],
                        'Exam Preparation': ['JAMB', 'WAEC', 'NECO'],
                    });
                }
            })
            .catch(() => setSubjectsByCategory({
                'Islamic Education': ['Quranic Recitation', 'Arabic Foundation', 'Hifz Program'],
                'Western Education': ['Mathematics', 'English Language', 'Science'],
                'Exam Preparation': ['JAMB', 'WAEC', 'NECO'],
            }));
    }, []);

    const fetchTutorsForSubject = async (subject) => {
        setLoadingTutors(prev => ({ ...prev, [subject]: true }));
        try {
            const res = await api.get(`/api/tutors/by_subject/?subject=${encodeURIComponent(subject)}`);
            setTutorsBySubject(prev => ({ ...prev, [subject]: asList(res.data) }));
        } catch {
            setTutorsBySubject(prev => ({ ...prev, [subject]: [] }));
        } finally {
            setLoadingTutors(prev => ({ ...prev, [subject]: false }));
        }
    };

    const toggleSubject = (subject) => {
        setSubjectEnrollments(prev => {
            const updated = { ...prev };
            if (subject in updated) {
                delete updated[subject];
            } else {
                updated[subject] = preSelectedTutorId || '';
                if (!tutorsBySubject[subject]) fetchTutorsForSubject(subject);
            }
            return updated;
        });
    };

    const addScheduleSlot = () => setLearning(prev => ({ ...prev, schedule: [...prev.schedule, { day: 'Monday', time: '09:00' }] }));
    const removeScheduleSlot = (i) => setLearning(prev => ({ ...prev, schedule: prev.schedule.filter((_, idx) => idx !== i) }));
    const updateScheduleSlot = (i, field, value) => setLearning(prev => {
        const s = [...prev.schedule];
        s[i] = { ...s[i], [field]: value };
        return { ...prev, schedule: s };
    });

    const validateStep1 = () => {
        if (!account.firstName.trim()) return 'First name is required.';
        if (!account.lastName.trim()) return 'Last name is required.';
        if (!account.username.trim()) return 'Username is required.';
        if (!account.email.trim()) return 'Email is required.';
        if (!account.password) return 'Password is required.';
        if (account.password !== account.confirmPassword) return 'Passwords do not match.';
        return null;
    };

    const validateStep2 = () => {
        if (Object.keys(subjectEnrollments).length === 0) return 'Please select at least one subject.';
        return null;
    };

    const validateStep3 = () => {
        if (isMinor) {
            if (!parent.parentFirstName.trim()) return 'Parent first name is required.';
            if (!parent.parentEmail.trim()) return 'Parent email is required.';
            if (!parent.parentPassword) return 'Parent password is required.';
        }
        return null;
    };

    const next = () => {
        setError('');
        const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
        if (err) { setError(err); return; }
        setStep(s => s + 1);
    };

    const back = () => { setError(''); setStep(s => s - 1); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validateStep3();
        if (err) { setError(err); return; }

        setError('');
        setLoading(true);
        try {
            const validSchedule = learning.schedule.filter(s => s.day && s.time);
            const daysPerWeek = validSchedule.length || 1;
            const hoursPerSession = parseFloat(learning.hoursPerSession) || 1;
            const totalWeeklyHours = daysPerWeek * hoursPerSession;

            const selectedSubjects = Object.keys(subjectEnrollments);
            const numSubjects = selectedSubjects.length || 1;
            const hoursPerSubject = totalWeeklyHours / numSubjects;
            const baseRate = getRateByLevel(learning.level);
            let totalToPay = 0;
            selectedSubjects.forEach(subject => {
                const tutorId = subjectEnrollments[subject];
                let rate = baseRate;
                if (tutorId) {
                    const tutor = (tutorsBySubject[subject] || []).find(t => t.id === tutorId);
                    if (tutor?.hourly_rate) rate = parseFloat(tutor.hourly_rate);
                }
                totalToPay += rate * hoursPerSubject * 4;
            });

            const payload = {
                username: account.username.trim().toLowerCase(),
                email: account.email.trim().toLowerCase(),
                password: account.password,
                role: 'STUDENT',
                first_name: account.firstName,
                last_name: account.lastName,
                gender: account.gender,
                phone: account.phone || null,
                country: account.country || null,
                dob: account.dob || null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                preferred_language: 'English',
                class_type: learning.classType,
                level: learning.level,
                days_per_week: daysPerWeek,
                hours_per_week: parseFloat(totalWeeklyHours.toFixed(2)),
                preferred_days: validSchedule.map(s => s.day).join(','),
                preferred_time_exact: validSchedule.map(s => s.time).join(','),
                preferred_start_date: learning.preferredStartDate || null,
                target_exam_type: EXAM_LEVELS.includes(learning.level) ? learning.level : null,
                target_exam_year: EXAM_LEVELS.includes(learning.level) ? learning.targetExamYear : null,
                preferred_tutor_id: Object.values(subjectEnrollments).find(v => v) || null,
                subject_enrollments: selectedSubjects.map(s => ({
                    subject: s,
                    preferred_tutor_id: subjectEnrollments[s] || null,
                })),
                total_amount: 0,
                ...(isMinor && {
                    parent_first_name: parent.parentFirstName,
                    parent_last_name: parent.parentLastName,
                    parent_email: parent.parentEmail.trim().toLowerCase(),
                    parent_password: parent.parentPassword,
                    relationship: parent.relationship,
                }),
            };

            await register(payload);
            const data = await login(account.username.trim().toLowerCase(), account.password);

            toast.success('Welcome to Hidayah! Your admission letter has been sent to your email.');

            if (data.user?.role === 'ADMIN' || data.user?.is_superuser) {
                window.location.href = '/admin';
            } else {
                navigate('/student');
            }
        } catch (err) {
            const d = err.response?.data;
            let msg = 'Registration failed. Please check your details.';
            if (d) {
                if (typeof d === 'string') msg = d.includes('<html') ? 'Server error — please try again.' : d;
                else if (d.detail) msg = d.detail;
                else if (d.error) msg = typeof d.error === 'string' ? d.error : JSON.stringify(d.error);
                else if (typeof d === 'object') {
                    const parts = Object.keys(d).map(k => `${k}: ${Array.isArray(d[k]) ? d[k][0] : d[k]}`);
                    if (parts.length) msg = parts.join(' · ');
                }
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="container pt-28 pb-20 px-4">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">

                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-display font-bold text-primary uppercase tracking-tighter mb-2">
                            Student <span className="text-primary">Enrolment</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm">Join Hidayah International — Western &amp; Islamic education.</p>
                    </div>

                    <StepIndicator current={step} total={3} />

                    {preSelectedTutorName && (
                        <div className="mb-6 bg-primary-soft border border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3 text-sm font-bold text-blue-700">
                            <span>⭐</span> Registering with tutor: {preSelectedTutorName}
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-5 py-4 flex items-center gap-3 text-sm font-bold">
                            <X size={16} className="shrink-0" /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className={cardCls}>
                                    <RegisterStep1
                                        account={account} setAccount={setAccount}
                                        showPass={showPass} setShowPass={setShowPass}
                                        showConfirmPass={showConfirmPass} setShowConfirmPass={setShowConfirmPass}
                                    />
                                </motion.div>
                            )}
                            {step === 2 && (
                                <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className={cardCls}>
                                    <RegisterStep2
                                        learning={learning} setLearning={setLearning}
                                        subjectsByCategory={subjectsByCategory}
                                        subjectEnrollments={subjectEnrollments}
                                        setSubjectEnrollments={setSubjectEnrollments}
                                        toggleSubject={toggleSubject}
                                        tutorsBySubject={tutorsBySubject}
                                        loadingTutors={loadingTutors}
                                        addScheduleSlot={addScheduleSlot}
                                        removeScheduleSlot={removeScheduleSlot}
                                        updateScheduleSlot={updateScheduleSlot}
                                    />
                                </motion.div>
                            )}
                            {step === 3 && (
                                <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className={`${cardCls} space-y-6`}>
                                    <RegisterStep3
                                        account={account}
                                        learning={learning}
                                        subjectEnrollments={subjectEnrollments}
                                        parent={parent} setParent={setParent}
                                        isMinor={isMinor}
                                        showParentPass={showParentPass} setShowParentPass={setShowParentPass}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Navigation */}
                        <div className="flex gap-3 mt-6">
                            {step > 1 && (
                                <button type="button" onClick={back} className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">
                                    ← Back
                                </button>
                            )}
                            {step < 3 ? (
                                <button type="button" onClick={next} className="flex-[2] bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button type="submit" disabled={loading} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={16} /> Complete Enrolment</>}
                                </button>
                            )}
                        </div>

                        <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mt-6">
                            Already enrolled? <Link to="/login" className="text-primary hover:underline ml-1">Sign In</Link>
                        </p>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, X, Plus, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LEVELS = [
    { value: 'PRIMARY', label: 'Primary School' },
    { value: 'SECONDARY', label: 'Secondary School' },
    { value: 'JUNIOR_WAEC', label: 'Junior WAEC' },
    { value: 'JAMB', label: 'JAMB' },
    { value: 'WAEC', label: 'WAEC' },
    { value: 'NECO', label: 'NECO' },
];
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
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 border-2 ${current >= s ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white text-slate-300 border-slate-200'}`}>
                        {current > s ? <CheckCircle2 size={14} /> : s}
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${current === s ? 'text-blue-600' : 'text-slate-400'}`}>
                        {['Account', 'Learning', 'Confirm'][s - 1]}
                    </span>
                </div>
            ))}
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
                className="h-full bg-blue-600 rounded-full"
                animate={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
                transition={{ duration: 0.4 }}
            />
        </div>
    </div>
);

const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 font-bold outline-none focus:border-blue-600/40 focus:bg-white transition-all";

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, login } = useAuth();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1 — Account
    const [account, setAccount] = useState({
        firstName: '', lastName: '', username: '', email: '',
        password: '', confirmPassword: '', dob: '', gender: 'Male',
        phone: '', country: '',
    });

    // Step 2 — Learning
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

    // Step 3 — Parent (if minor)
    const [parent, setParent] = useState({
        parentFirstName: '', parentLastName: '', parentEmail: '',
        parentPassword: '', relationship: 'Father',
    });

    const isMinor = calculateAge(account.dob) < 18;

    // Pre-selected tutor from URL
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

    // Auto-assign pre-selected tutor to enrolled subjects
    useEffect(() => {
        if (!preSelectedTutorId) return;
        setSubjectEnrollments(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(s => { updated[s] = preSelectedTutorId; });
            return updated;
        });
    }, [preSelectedTutorId, JSON.stringify(Object.keys(subjectEnrollments))]);

    // Fetch subjects on mount
    useEffect(() => {
        api.get('/api/programs/subjects/')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
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
            setTutorsBySubject(prev => ({ ...prev, [subject]: Array.isArray(res.data) ? res.data : [] }));
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

    const addScheduleSlot = () => {
        setLearning(prev => ({ ...prev, schedule: [...prev.schedule, { day: 'Monday', time: '09:00' }] }));
    };

    const removeScheduleSlot = (i) => {
        setLearning(prev => ({ ...prev, schedule: prev.schedule.filter((_, idx) => idx !== i) }));
    };

    const updateScheduleSlot = (i, field, value) => {
        setLearning(prev => {
            const s = [...prev.schedule];
            s[i] = { ...s[i], [field]: value };
            return { ...prev, schedule: s };
        });
    };

    // ── Validation per step ────────────────────────────────────────────────────
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

    // ── Submit ─────────────────────────────────────────────────────────────────
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

            alert('✨ Welcome to Hidayah! Your admission letter has been sent to your email.');

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

    const cardCls = "bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 md:p-10";

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="container pt-28 pb-20 px-4">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">

                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-display font-black text-primary uppercase tracking-tighter mb-2">
                            Student <span className="text-blue-600">Enrolment</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm">Join Hidayah International — Western &amp; Islamic education.</p>
                    </div>

                    <StepIndicator current={step} total={3} />

                    {preSelectedTutorName && (
                        <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3 text-sm font-bold text-blue-700">
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

                            {/* ── Step 1: Account ──────────────────────────────── */}
                            {step === 1 && (
                                <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className={cardCls}>
                                    <h2 className="text-lg font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs">1</span>
                                        Your Account
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="First Name">
                                            <input className={inputCls} value={account.firstName} onChange={e => setAccount(a => ({ ...a, firstName: e.target.value }))} placeholder="e.g. Fatima" autoComplete="given-name" />
                                        </Field>
                                        <Field label="Last Name">
                                            <input className={inputCls} value={account.lastName} onChange={e => setAccount(a => ({ ...a, lastName: e.target.value }))} placeholder="e.g. Ibrahim" autoComplete="family-name" />
                                        </Field>
                                        <Field label="Username">
                                            <input className={inputCls} value={account.username} onChange={e => setAccount(a => ({ ...a, username: e.target.value.toLowerCase() }))} placeholder="e.g. fatima_2025" autoComplete="username" />
                                        </Field>
                                        <Field label="Email">
                                            <input type="email" className={inputCls} value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} placeholder="your@email.com" autoComplete="email" />
                                        </Field>
                                        <Field label="Password">
                                            <input type="password" className={inputCls} value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} placeholder="Min. 8 characters" autoComplete="new-password" />
                                        </Field>
                                        <Field label="Confirm Password">
                                            <input type="password" className={inputCls} value={account.confirmPassword} onChange={e => setAccount(a => ({ ...a, confirmPassword: e.target.value }))} placeholder="Repeat password" autoComplete="new-password" />
                                        </Field>
                                        <Field label="Date of Birth">
                                            <input type="date" className={inputCls} value={account.dob} onChange={e => setAccount(a => ({ ...a, dob: e.target.value }))} autoComplete="bday" />
                                        </Field>
                                        <Field label="Gender">
                                            <select className={inputCls} value={account.gender} onChange={e => setAccount(a => ({ ...a, gender: e.target.value }))}>
                                                <option>Male</option>
                                                <option>Female</option>
                                            </select>
                                        </Field>
                                        <Field label="Phone (optional)">
                                            <input className={inputCls} value={account.phone} onChange={e => setAccount(a => ({ ...a, phone: e.target.value }))} placeholder="+234..." autoComplete="tel" />
                                        </Field>
                                        <Field label="Country (optional)">
                                            <input className={inputCls} value={account.country} onChange={e => setAccount(a => ({ ...a, country: e.target.value }))} placeholder="e.g. Nigeria" autoComplete="country-name" />
                                        </Field>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Step 2: Learning Plan ─────────────────────────── */}
                            {step === 2 && (
                                <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className={cardCls}>
                                    <h2 className="text-lg font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs">2</span>
                                        Learning Plan
                                    </h2>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <Field label="Class Type">
                                            <select className={inputCls} value={learning.classType} onChange={e => setLearning(l => ({ ...l, classType: e.target.value }))}>
                                                <option value="ONE_ON_ONE">One-on-One</option>
                                                <option value="GROUP">Group</option>
                                            </select>
                                        </Field>
                                        <Field label="Level">
                                            <select className={inputCls} value={learning.level} onChange={e => setLearning(l => ({ ...l, level: e.target.value }))}>
                                                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                            </select>
                                        </Field>
                                        {EXAM_LEVELS.includes(learning.level) && (
                                            <Field label="Target Exam Year">
                                                <input type="number" className={inputCls} value={learning.targetExamYear} onChange={e => setLearning(l => ({ ...l, targetExamYear: e.target.value }))} min="2024" max="2035" />
                                            </Field>
                                        )}
                                        <Field label="Hours per Session">
                                            <select className={inputCls} value={learning.hoursPerSession} onChange={e => setLearning(l => ({ ...l, hoursPerSession: e.target.value }))}>
                                                {['0.5', '1', '1.5', '2', '2.5', '3'].map(h => <option key={h} value={h}>{h} hr{h !== '1' ? 's' : ''}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Preferred Start Date (optional)">
                                            <input type="date" className={inputCls} value={learning.preferredStartDate} onChange={e => setLearning(l => ({ ...l, preferredStartDate: e.target.value }))} />
                                        </Field>
                                    </div>

                                    {/* Subjects */}
                                    <div className="mb-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Select Subjects</p>
                                        {Object.keys(subjectsByCategory).length === 0 ? (
                                            <div className="text-slate-400 text-sm font-bold">Loading subjects…</div>
                                        ) : (
                                            Object.entries(subjectsByCategory).map(([cat, subjects]) => (
                                                <div key={cat} className="mb-4">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{cat}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {subjects.map(sub => {
                                                            const selected = sub in subjectEnrollments;
                                                            return (
                                                                <button key={sub} type="button" onClick={() => toggleSubject(sub)}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-600/30'}`}>
                                                                    {sub}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {/* Tutor selector per enrolled subject */}
                                                    {subjects.filter(s => s in subjectEnrollments).map(sub => (
                                                        <div key={`t-${sub}`} className="mt-2 ml-1">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">{sub} — preferred tutor (optional)</p>
                                                            {loadingTutors[sub] ? (
                                                                <p className="text-xs text-slate-400 font-bold">Loading tutors…</p>
                                                            ) : (tutorsBySubject[sub] || []).length === 0 ? (
                                                                <p className="text-xs text-slate-400 font-bold">No tutors available — admin will assign one.</p>
                                                            ) : (
                                                                <select className={`${inputCls} text-sm py-2.5`} value={subjectEnrollments[sub] || ''} onChange={e => setSubjectEnrollments(prev => ({ ...prev, [sub]: e.target.value ? Number(e.target.value) : '' }))}>
                                                                    <option value="">No preference</option>
                                                                    {(tutorsBySubject[sub] || []).map(t => (
                                                                        <option key={t.id} value={t.id}>{t.user?.first_name} {t.user?.last_name}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Schedule slots */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preferred Schedule</p>
                                            <button type="button" onClick={addScheduleSlot} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
                                                <Plus size={12} /> Add slot
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {learning.schedule.map((slot, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <select className={`${inputCls} flex-1 py-2.5 text-sm`} value={slot.day} onChange={e => updateScheduleSlot(i, 'day', e.target.value)}>
                                                        {DAYS.map(d => <option key={d}>{d}</option>)}
                                                    </select>
                                                    <input type="time" className={`${inputCls} flex-1 py-2.5 text-sm`} value={slot.time} onChange={e => updateScheduleSlot(i, 'time', e.target.value)} />
                                                    {learning.schedule.length > 1 && (
                                                        <button type="button" onClick={() => removeScheduleSlot(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Step 3: Confirm ───────────────────────────────── */}
                            {step === 3 && (
                                <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className={`${cardCls} space-y-6`}>
                                    <h2 className="text-lg font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs">3</span>
                                        Confirm & Submit
                                    </h2>

                                    {/* Summary */}
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2 text-sm">
                                        <Row label="Name" value={`${account.firstName} ${account.lastName}`} />
                                        <Row label="Username" value={account.username} />
                                        <Row label="Email" value={account.email} />
                                        <Row label="Level" value={LEVELS.find(l => l.value === learning.level)?.label} />
                                        <Row label="Class Type" value={learning.classType === 'ONE_ON_ONE' ? 'One-on-One' : 'Group'} />
                                        <Row label="Subjects" value={Object.keys(subjectEnrollments).join(', ') || '—'} />
                                        <Row label="Schedule" value={learning.schedule.map(s => `${s.day} ${s.time}`).join(', ')} />
                                    </div>

                                    {/* Parent fields (if minor) */}
                                    {isMinor && (
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-4 flex items-center gap-2">
                                                ⚠ Student is under 18 — parent account required
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Field label="Parent First Name">
                                                    <input className={inputCls} value={parent.parentFirstName} onChange={e => setParent(p => ({ ...p, parentFirstName: e.target.value }))} placeholder="Parent's first name" />
                                                </Field>
                                                <Field label="Parent Last Name">
                                                    <input className={inputCls} value={parent.parentLastName} onChange={e => setParent(p => ({ ...p, parentLastName: e.target.value }))} placeholder="Parent's last name" />
                                                </Field>
                                                <Field label="Parent Email">
                                                    <input type="email" className={inputCls} value={parent.parentEmail} onChange={e => setParent(p => ({ ...p, parentEmail: e.target.value }))} placeholder="parent@email.com" />
                                                </Field>
                                                <Field label="Parent Password">
                                                    <input type="password" className={inputCls} value={parent.parentPassword} onChange={e => setParent(p => ({ ...p, parentPassword: e.target.value }))} placeholder="Parent portal password" />
                                                </Field>
                                                <Field label="Relationship">
                                                    <select className={inputCls} value={parent.relationship} onChange={e => setParent(p => ({ ...p, relationship: e.target.value }))}>
                                                        {['Father', 'Mother', 'Guardian'].map(r => <option key={r}>{r}</option>)}
                                                    </select>
                                                </Field>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                        </AnimatePresence>

                        {/* Navigation */}
                        <div className="flex gap-3 mt-6">
                            {step > 1 && (
                                <button type="button" onClick={back} className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">
                                    ← Back
                                </button>
                            )}
                            {step < 3 ? (
                                <button type="button" onClick={next} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button type="submit" disabled={loading} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={16} /> Complete Enrolment</>}
                                </button>
                            )}
                        </div>

                        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-6">
                            Already enrolled? <Link to="/login" className="text-blue-600 hover:underline ml-1">Sign In</Link>
                        </p>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

const Row = ({ label, value }) => (
    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <span className="font-bold text-slate-800 text-right max-w-[60%] truncate">{value}</span>
    </div>
);

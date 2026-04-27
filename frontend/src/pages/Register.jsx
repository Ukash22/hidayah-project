import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Lock, Calendar, Globe, Phone, MapPin,
    BookOpen, GraduationCap, Clock, CheckCircle2,
    ChevronRight, ArrowRight, Sparkles, ShieldCheck,
    Hash, Home, Users, Search, Info, Star, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const getRateByLevel = (level) => {
    if (['JAMB', 'WAEC', 'NECO'].includes(level)) return 2500;
    if (level === 'SECONDARY' || level === 'JUNIOR_WAEC') return 2000;
    return 1500;
};

// ── Subject catalogue (Now Dynamic) ───────────────────────────────────────────────────────
// SUBJECT_CATALOGUE is now generated dynamically from the backend subjects API

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        dob: '',
        gender: 'Male',
        country: '',
        phone: '',
        relationship: 'Father',
        // Learning Preferences
        daysPerWeek: '3',
        hoursPerSession: '1',
        schedule: [{ day: '', time: '' }],
        preferredStartDate: '',
        classType: 'ONE_ON_ONE',
        level: 'PRIMARY',
        targetExamType: 'JAMB',
        targetExamYear: new Date().getFullYear().toString(),
        address: '',
        parentFirstName: '',
        parentLastName: '',
        parentEmail: '',
        parentPassword: '',
    });

    const [subjectEnrollments, setSubjectEnrollments] = useState({});
    const [tutorsBySubject, setTutorsBySubject] = useState({});
    const [loadingTutors, setLoadingTutors] = useState({});
    const [selectedTutorForProfile, setSelectedTutorForProfile] = useState(null);

    const [preSelectedTutorId, setPreSelectedTutorId] = useState(null);
    const [preSelectedTutorName, setPreSelectedTutorName] = useState('');
    const [preSelectedTutorData, setPreSelectedTutorData] = useState(null);

    const [subjectsByCategory, setSubjectsByCategory] = useState({});
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMinor, setIsMinor] = useState(false);

    // Fetch dynamic subjects on mount
    React.useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/programs/subjects/`);
                if (Array.isArray(res.data)) {
                    const grouped = res.data.reduce((acc, sub) => {
                        const label = sub.program_type === 'ISLAMIC' ? 'Islamic Education' :
                            sub.program_type === 'WESTERN' ? 'Western Education' :
                                'Exam Preparation';
                        if (!acc[label]) acc[label] = [];
                        acc[label].push(sub.name);
                        return acc;
                    }, {});
                    setSubjectsByCategory(grouped);
                } else {
                    throw new Error("Invalid subjects data format");
                }
            } catch (err) {
                console.error("Failed to fetch subjects:", err);
                // Fallback to minimal list in case of API failure
                setSubjectsByCategory({
                    'Islamic Education': ['Quranic Recitation', 'Arabic Foundation', 'Hifz Program'],
                    'Western Education': ['Mathematics', 'English Language', 'Science'],
                    'Exam Preparation': ['JAMB', 'WAEC', 'NECO']
                });
            }
        };
        fetchSubjects();
    }, []);

    // Helper for selected subjects — auto-assign pre-selected tutor to all enrolled subjects
    React.useEffect(() => {
        const subjects = Object.keys(subjectEnrollments);
        setSelectedSubjects(subjects);
        if (preSelectedTutorId && subjects.length > 0) {
            setSubjectEnrollments(prev => {
                const updated = { ...prev };
                subjects.forEach(s => { if (!updated[s]) updated[s] = preSelectedTutorId; else updated[s] = preSelectedTutorId; });
                return updated;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(Object.keys(subjectEnrollments)), preSelectedTutorId]);

    const { register, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Read pre-selected tutor from URL query params
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tid = params.get('tutor_id');
        const tname = params.get('tutor_name');
        if (tid) {
            setPreSelectedTutorId(Number(tid));
            setPreSelectedTutorName(decodeURIComponent(tname || ''));
            // Fetch tutor details for the confirmation banner
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/public/`)
                .then(res => {
                    const found = res.data.find(t => t.id === Number(tid));
                    if (found) setPreSelectedTutorData(found);
                })
                .catch(() => {});
        }
    }, [location.search]);

    const calculateAge = (birthDate) => {
        if (!birthDate) return 20;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const isTimeOverlap = (time1, time2) => {
        if (!time1 || !time2) return false;

        // If they are exactly the same string (simple slot match)
        if (time1.toUpperCase() === time2.toUpperCase()) return true;

        // If they are ranges (e.g. "10:00-11:00")
        if (time1.includes('-') && time2.includes('-')) {
            const [s1, e1] = time1.split('-').map(t => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + (m || 0);
            });
            const [s2, e2] = time2.split('-').map(t => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + (m || 0);
            });
            return s1 < e2 && e1 > s2;
        }
        return false;
    };

    const checkTutorConflicts = (tutor) => {
        if (!tutor.busy_slots || !Array.isArray(tutor.busy_slots)) return [];
        const conflicts = [];

        formData.schedule.forEach(slot => {
            if (!slot.day || !slot.time) return;

            const busyMatch = tutor.busy_slots?.find(busy => {
                // Check Recurring Conflicts (New Format)
                if (busy.preferred_days) {
                    return busy.preferred_days.toUpperCase() === slot.day.toUpperCase() &&
                        isTimeOverlap(busy.preferred_time, slot.time);
                }

                // Check One-off Session Conflicts (Old ISO Format)
                if (busy.start) {
                    const sessionDate = new Date(busy.start);
                    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                    const sessionDay = days[sessionDate.getDay()];
                    const sessionTime = `${sessionDate.getHours().toString().padStart(2, '0')}:${sessionDate.getMinutes().toString().padStart(2, '0')}`;

                    return sessionDay === slot.day.toUpperCase() && isTimeOverlap(sessionTime, slot.time);
                }
                return false;
            });

            if (busyMatch) conflicts.push(slot.day);
        });
        return conflicts;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (name === 'dob') setIsMinor(calculateAge(value) < 18);
    };

    const addScheduleSlot = () => {
        setFormData(prev => ({ ...prev, schedule: [...prev.schedule, { day: '', time: '' }] }));
    };

    const removeScheduleSlot = (index) => {
        setFormData(prev => ({ ...prev, schedule: prev.schedule.filter((_, i) => i !== index) }));
    };

    const updateScheduleSlot = (index, field, value) => {
        setFormData(prev => {
            const newSchedule = [...prev.schedule];
            newSchedule[index] = { ...newSchedule[index], [field]: value };
            return { ...prev, schedule: newSchedule };
        });
    };

    const toggleSubject = async (subject) => {
        setSubjectEnrollments(prev => {
            const updated = { ...prev };
            if (subject in updated) {
                delete updated[subject];
            } else {
                updated[subject] = '';
                if (!tutorsBySubject[subject]) {
                    fetchTutorsForSubject(subject);
                }
            }
            return updated;
        });
    };

    const fetchTutorsForSubject = async (subject) => {
        setLoadingTutors(prev => ({ ...prev, [subject]: true }));
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/by_subject/?subject=${encodeURIComponent(subject)}`);
            setTutorsBySubject(prev => ({ ...prev, [subject]: res.data }));
        } catch (err) {
            console.error(`Failed to fetch tutors for ${subject}`, err);
            setTutorsBySubject(prev => ({ ...prev, [subject]: [] }));
        } finally {
            setLoadingTutors(prev => ({ ...prev, [subject]: false }));
        }
    };

    const setPreferredTutor = (subject, tutorId) => {
        setSubjectEnrollments(prev => ({ ...prev, [subject]: tutorId }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }
        if (Object.keys(subjectEnrollments).length === 0) {
            return setError('Please select at least one subject to enroll in.');
        }

        setLoading(true);
        try {
            const enrolledSubjects = Object.keys(subjectEnrollments);

            // Calculate dynamic total weekly hours from new unified schedule slots or fallback inputs
            let totalWeeklyHours = 0;
            const validSchedule = formData.schedule.filter(s => s.day && s.time);
            if (validSchedule.length > 0) {
                validSchedule.forEach(slot => {
                    const times = slot.time.split('-');
                    if (times.length === 2 && times[0] && times[1]) {
                        const [h1, m1] = times[0].split(':').map(Number);
                        const [h2, m2] = times[1].split(':').map(Number);
                        let diff = (h2 + m2/60) - (h1 + m1/60);
                        if (diff <= 0) diff = parseFloat(formData.hoursPerSession) || 1; // Fallback for invalid ranges
                        totalWeeklyHours += diff;
                    } else {
                        totalWeeklyHours += parseFloat(formData.hoursPerSession) || 1;
                    }
                });
            } else {
                totalWeeklyHours = (parseInt(formData.daysPerWeek) || 1) * (parseFloat(formData.hoursPerSession) || 1);
            }

            let totalToPay = 0;
            const baseRate = getRateByLevel(formData.level);
            const numSubjects = selectedSubjects.length || 1;
            const hoursPerSubject = totalWeeklyHours / numSubjects;
            
            selectedSubjects.forEach(subject => {
                const tutorId = subjectEnrollments[subject];
                let rate = baseRate;
                if (tutorId) {
                    const tutor = (tutorsBySubject[subject] || []).find(t => t.id === tutorId);
                    if (tutor && tutor.hourly_rate) rate = parseFloat(tutor.hourly_rate);
                }
                // Each subject gets its fair share of the total weekly hours
                totalToPay += (rate * hoursPerSubject * 4);
            });

            // Round to 2 decimal places to avoid floating point issues
            totalToPay = parseFloat(totalToPay.toFixed(2));

            const payload = {
                username: formData.username.trim().toLowerCase(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role: 'STUDENT',
                first_name: formData.firstName,
                last_name: formData.lastName,
                country: formData.country || null,
                phone: formData.phone || null,
                dob: formData.dob || null,
                gender: formData.gender,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                preferred_language: 'English',
                address: formData.address,
                class_type: formData.classType,
                level: formData.level,
                days_per_week: formData.schedule.filter(s => s.day).length || parseInt(formData.daysPerWeek) || 1,
                hours_per_week: totalWeeklyHours > 0 ? parseFloat(totalWeeklyHours.toFixed(2)) : 1.0,
                preferred_days: formData.schedule.map(s => s.day).filter(d => d).join(','),
                preferred_time_exact: formData.schedule.map(s => s.time).filter(t => t).join(','),
                preferred_start_date: formData.preferredStartDate || null,
                target_exam_type: ['JAMB', 'WAEC', 'NECO', 'JUNIOR_WAEC'].includes(formData.level) ? formData.level : null,
                target_exam_year: ['JAMB', 'WAEC', 'NECO', 'JUNIOR_WAEC'].includes(formData.level) ? formData.targetExamYear : null,
                preferred_tutor_id: Object.values(subjectEnrollments).find(v => v) || null,
                subject_enrollments: enrolledSubjects.map(s => ({
                    subject: s,
                    preferred_tutor_id: subjectEnrollments[s] || null
                })),
                total_amount: totalToPay > 0 ? totalToPay : 1000,
                ...(isMinor && {
                    parent_first_name: formData.parentFirstName,
                    parent_last_name: formData.parentLastName,
                    parent_email: formData.parentEmail.trim().toLowerCase(),
                    parent_password: formData.parentPassword,
                    relationship: formData.relationship
                })
            };

            await register(payload);
            const data = await login(formData.username.trim().toLowerCase(), formData.password);

            alert("✨ Congratulations! You have been automatically admitted to Hidayah International. Your admission letter has been sent to your email.");

            if (data.user?.role === 'ADMIN' || data.user?.is_superuser || data.user?.is_staff) {
                window.location.href = '/admin';
            } else {
                navigate('/payment');
            }
        } catch (err) {
            console.error("Registration Error details:", err.response?.data);

            // FIX: Extract specific field errors from DRF
            let errorMsg = 'Registration failed. Please check the fields below.';
            if (err.response?.data) {
                const data = err.response.data;
                if (data.detail) {
                    errorMsg = data.detail;
                } else if (data.error) {
                    errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                } else if (typeof data === 'object' && !Array.isArray(data)) {
                    // Try to flatten the error dictionary
                    const errors = Object.keys(data).map(key => {
                        const val = data[key];
                        const label = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
                        return `${label}: ${Array.isArray(val) ? val[0] : val}`;
                    });
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                } else if (typeof data === 'string') {
                    errorMsg = data.length > 300 ? "Server Error: Could not process the registration request. Please Try Again." : data;
                }
            } else if (err.message) {
                 errorMsg = `Connection Error: ${err.message}. Please check your internet connection and try again.`;
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line no-unused-vars
    const SectionHeader = ({ icon: Icon, title, step, colorClass }) => (
        <div className="flex items-center gap-4 mb-10">
            <div className={`w-12 h-12 ${colorClass || 'bg-blue-600/10 text-blue-600'} rounded-2xl flex items-center justify-center font-black text-lg border border-slate-100 shadow-xl`}>
                {step || <Icon size={24} />}
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">{title}</h3>
                <div className="h-0.5 w-12 bg-slate-100 mt-2 rounded-full overflow-hidden">
                    <div className={`h-full w-2/3 ${colorClass?.replace('text', 'bg') || 'bg-blue-600'}`}></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-500/30">
            <Navbar />

            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/5 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[0%] left-[-5%] w-[35%] h-[35%] bg-indigo-600/5 blur-[150px] rounded-full"></div>
            </div>

            <div className="container pt-32 pb-20 px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="text-center mb-16">
                        <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-blue-100 shadow-xl relative">
                            <GraduationCap size={48} className="text-blue-600" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                                <Sparkles size={12} className="text-white" />
                            </div>
                        </div>
                        <h1 className="text-5xl font-display font-black text-slate-900 mb-4 tracking-tighter uppercase">Student <span className="text-blue-600">Admission</span></h1>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium tracking-wide">Join Hidayah International’s world-class learning platform. Your journey to excellence starts here.</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-[2rem] text-sm font-bold flex items-center gap-4 mb-12 backdrop-blur-xl"
                        >
                            <X className="shrink-0" /> {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-12">

                        {/* Step 1 & 2 Grid */}
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Section 1: Credentials */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white border border-slate-100 rounded-[3rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all"
                            >
                                <SectionHeader step="01" title="Account Access" colorClass="bg-blue-600/10 text-blue-600" />
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Universal Username *</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input id="username" type="text" name="username" value={formData.username} onChange={handleChange} required placeholder="Student ID or Name" autoComplete="username" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Institutional Email *</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@email.com" autoComplete="email" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all" />
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password *</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input id="password" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" autoComplete="new-password" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirm *</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input id="confirmPassword" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" autoComplete="new-password" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Section 2: Bio */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white border border-slate-100 rounded-[3rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all"
                            >
                                <SectionHeader step="02" title="Student Profile" colorClass="bg-indigo-600/10 text-indigo-600" />
                                <div className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">First Name *</label>
                                            <input id="firstName" type="text" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="John" autoComplete="given-name" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Last Name</label>
                                            <input id="lastName" type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" autoComplete="family-name" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all" />
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="dob" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Birth Date *</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input id="dob" type="date" name="dob" value={formData.dob} onChange={handleChange} required autoComplete="bday" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="gender" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Gender</label>
                                            <select id="gender" name="gender" value={formData.gender} onChange={handleChange} autoComplete="sex" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all appearance-none cursor-pointer">
                                                <option className="bg-white">Male</option>
                                                <option className="bg-white">Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="country" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Country</label>
                                            <div className="relative">
                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <select id="country" name="country" value={formData.country} onChange={handleChange} autoComplete="country-name" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all appearance-none cursor-pointer">
                                                    <option value="" className="bg-white">Select Country</option>
                                                    <optgroup label="Africa" className="bg-white">
                                                        <option value="Nigeria">Nigeria</option>
                                                        <option value="Ghana">Ghana</option>
                                                        <option value="South Africa">South Africa</option>
                                                        <option value="Egypt">Egypt</option>
                                                        <option value="Kenya">Kenya</option>
                                                        <option value="Morocco">Morocco</option>
                                                        <option value="Ethiopia">Ethiopia</option>
                                                    </optgroup>
                                                    <optgroup label="Asia & Middle East" className="bg-white">
                                                        <option value="Saudi Arabia">Saudi Arabia</option>
                                                        <option value="United Arab Emirates">United Arab Emirates</option>
                                                        <option value="Qatar">Qatar</option>
                                                        <option value="Malaysia">Malaysia</option>
                                                        <option value="Indonesia">Indonesia</option>
                                                        <option value="Pakistan">Pakistan</option>
                                                        <option value="India">India</option>
                                                        <option value="Turkey">Turkey</option>
                                                    </optgroup>
                                                    <optgroup label="Europe & America" className="bg-white">
                                                        <option value="United Kingdom">United Kingdom</option>
                                                        <option value="United States">United States</option>
                                                        <option value="Canada">Canada</option>
                                                        <option value="France">France</option>
                                                        <option value="Germany">Germany</option>
                                                        <option value="Australia">Australia</option>
                                                    </optgroup>
                                                    <option value="Other" className="bg-white">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input id="phone" type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+234..." autoComplete="tel" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-2 col-span-full">
                                            <label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Residential Address *</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                                                <textarea id="address" name="address" value={formData.address} onChange={handleChange} required placeholder="Street Name, House Number, City, State" autoComplete="street-address" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-900 font-bold outline-none focus:border-blue-600/30 focus:bg-white transition-all min-h-[100px] resize-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Section 3: Learning Preferences */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-white border border-slate-100 rounded-[3rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 translate-y-[-50%]"></div>
                            <SectionHeader step="03" title="Educational Roadmap" colorClass="bg-blue-600/10 text-blue-600" />

                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Learning Level</label>
                                    <select name="level" value={formData.level} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-600/30 focus:bg-white transition-all appearance-none cursor-pointer">
                                        <option value="PRIMARY" className="bg-white">Primary School</option>
                                        <option value="SECONDARY" className="bg-white">Secondary School</option>
                                        <option value="JUNIOR_WAEC" className="bg-white">Junior WAEC (BECE)</option>
                                        <option value="JAMB" className="bg-white">JAMB Prep</option>
                                        <option value="WAEC" className="bg-white">WAEC Prep</option>
                                        <option value="NECO" className="bg-white">NECO Prep</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Class Structure</label>
                                    <select name="classType" value={formData.classType} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-600/30 focus:bg-white transition-all appearance-none cursor-pointer">
                                        <option value="ONE_ON_ONE" className="bg-white">One-on-One</option>
                                        <option value="GROUP" className="bg-white">Group Batch</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Duration / Session</label>
                                    <select name="hoursPerSession" value={formData.hoursPerSession} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-emerald-500/30 transition-all appearance-none cursor-pointer">
                                        <option value="0.5" className="bg-[#0a0c10]">30 Minutes</option>
                                        <option value="1" className="bg-[#0a0c10]">1.0 Hour</option>
                                        <option value="1.5" className="bg-[#0a0c10]">1.5 Hours</option>
                                        <option value="2" className="bg-[#0a0c10]">2.0 Hours</option>
                                        <option value="3" className="bg-[#0a0c10]">3.0 Hours</option>
                                    </select>
                                </div>
                            </div>

                            {['JAMB', 'WAEC', 'NECO', 'JUNIOR_WAEC'].includes(formData.level) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="bg-indigo-500/10 border border-indigo-500/20 p-8 rounded-[2rem] mb-12 flex flex-col md:flex-row gap-8 items-center"
                                >
                                    <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 shrink-0">
                                        <GraduationCap size={32} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <h4 className="text-lg font-bold text-white uppercase tracking-tight">Exam Focus Configuration</h4>
                                        <p className="text-indigo-400 text-xs font-bold leading-relaxed">Customize your preparation for national standard examinations. This unlocks specialized CBT tools.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 md:w-[400px]">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-indigo-300 ml-1">Target Portal</label>
                                            <select name="targetExamType" value={formData.targetExamType} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-indigo-500 transition-all appearance-none">
                                                <option value="JAMB" className="bg-[#0a0c10]">UTME (JAMB)</option>
                                                <option value="WAEC" className="bg-[#0a0c10]">SSCE (WAEC)</option>
                                                <option value="NECO" className="bg-[#0a0c10]">SSCE (NECO)</option>
                                                <option value="BECE" className="bg-[#0a0c10]">BECE (JUNIOR)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-indigo-300 ml-1">Target Year</label>
                                            <select name="targetExamYear" value={formData.targetExamYear} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-indigo-500 transition-all appearance-none">
                                                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#0a0c10]">{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Weekly Schedule - Booking Style */}
                            <div className="space-y-8 bg-black/40 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                                    <div>
                                        <h4 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                            Weekly Teaching Classes
                                        </h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Add your available days and specific time slots</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addScheduleSlot}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all active:scale-95 group"
                                        title="Add Day"
                                    >
                                        <div className="text-2xl font-light group-hover:rotate-90 transition-transform">+</div>
                                    </button>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    {formData.schedule.map((slot, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-3xl bg-white/[0.03] border border-white/5 group hover:border-emerald-500/30 transition-all relative"
                                        >
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 ml-1">Day</label>
                                                <select
                                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                                                    value={slot.day}
                                                    onChange={(e) => updateScheduleSlot(index, 'day', e.target.value)}
                                                >
                                                    <option value="" className="bg-[#0a0c10]">Select Day</option>
                                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                                        <option key={d} value={d.toUpperCase()} className="bg-[#0a0c10]">{d}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 ml-1">From</label>
                                                <input
                                                    type="time"
                                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all"
                                                    value={slot.time.split('-')[0] || ''}
                                                    onChange={(e) => updateScheduleSlot(index, 'time', `${e.target.value}-${slot.time.split('-')[1] || ''}`)}
                                                />
                                            </div>
                                            <div className="space-y-2 relative">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 ml-1">To</label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="time"
                                                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all"
                                                        value={slot.time.split('-')[1] || ''}
                                                        onChange={(e) => updateScheduleSlot(index, 'time', `${slot.time.split('-')[0] || ''}-${e.target.value}`)}
                                                    />
                                                    {formData.schedule.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeScheduleSlot(index)}
                                                            className="bg-red-500/10 text-red-500 w-12 h-12 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center shrink-0"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {formData.schedule.filter(s => s.day).length > 0 && (
                                    <div className="pt-6 border-t border-white/5 flex justify-between items-center text-[10px] relative z-10 px-2 font-black uppercase tracking-widest">
                                        <span className="text-slate-500">{formData.schedule.filter(s => s.day).length} Intensive Session{formData.schedule.filter(s => s.day).length > 1 ? 's' : ''} / WK</span>
                                        <span className="text-emerald-500">{formData.schedule.filter(s => s.day).length * 4} Total Sessions / Month</span>
                                    </div>
                                )}
                            </div>

                            {/* Preferred Start Date */}
                            <div className="bg-black/40 border border-white/10 rounded-[2.5rem] p-8 mt-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                    <div>
                                        <h4 className="text-base font-black uppercase tracking-tight text-white">Preferred Start Date</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">When would you like classes to begin?</p>
                                    </div>
                                </div>
                                <div className="relative max-w-xs">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/60" size={16} />
                                    <input
                                        type="date"
                                        name="preferredStartDate"
                                        value={formData.preferredStartDate}
                                        onChange={handleChange}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-black/60 border border-emerald-500/20 rounded-xl px-4 py-3.5 pl-10 text-sm font-black text-white outline-none focus:border-emerald-500 transition-all cursor-pointer"
                                    />
                                </div>
                                {formData.preferredStartDate && (
                                    <p className="mt-3 text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">
                                        ✓ Starting {new Date(formData.preferredStartDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        </motion.div>

                        {/* Section 4: Subjects Grid */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-white border border-slate-100 rounded-[3rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
                        >
                            <SectionHeader step="04" title="Academic Selection" colorClass="bg-blue-600/10 text-blue-600" />

                            <div className="space-y-10">
                                {Object.keys(subjectsByCategory).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest gap-4">
                                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        Organizing Academic Catalogue...
                                    </div>
                                ) : Object.entries(subjectsByCategory).map(([category, subjects]) => (
                                    <div key={category} className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${category === 'Islamic Education' ? 'bg-indigo-600/20 text-indigo-600' : category === 'Exam Preparation' ? 'bg-blue-600/20 text-blue-600' : 'bg-blue-500/20 text-blue-500'}`}>
                                                {category === 'Islamic Education' ? <Users size={16} /> : category === 'Exam Preparation' ? <GraduationCap size={16} /> : <BookOpen size={16} />}
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">{category}</h4>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {subjects.map(subject => {
                                                const isSelected = subject in subjectEnrollments;
                                                return (
                                                    <motion.button
                                                        key={subject}
                                                        type="button"
                                                        whileHover={{ y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => toggleSubject(subject)}
                                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center relative overflow-hidden group ${isSelected
                                                            ? category === 'Islamic Education'
                                                                ? 'bg-indigo-600/10 border-indigo-600 text-indigo-600 shadow-lg shadow-indigo-600/10'
                                                                : category === 'Exam Preparation'
                                                                    ? 'bg-blue-600/10 border-blue-600 text-blue-600 shadow-lg shadow-blue-600/10'
                                                                    : 'bg-sky-500/10 border-sky-500 text-sky-500 shadow-lg shadow-sky-500/10'
                                                            : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'
                                                            }`}
                                                    >
                                                        {isSelected && (
                                                            <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in ${category === 'Islamic Education' ? 'bg-indigo-600' : category === 'Exam Preparation' ? 'bg-blue-600' : 'bg-sky-500'}`}>
                                                                <CheckCircle2 size={10} className="text-white" />
                                                            </div>
                                                        )}
                                                        <span className="text-[10px] font-black uppercase tracking-tight">{subject}</span>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Section 5: Tutor Assignments */}
                        <AnimatePresence mode="wait">
                            {selectedSubjects.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="bg-white border border-slate-100 rounded-[3rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
                                >
                                    <SectionHeader step="05" title="Tutor Assignments" colorClass="bg-blue-600/10 text-blue-600" />

                                    {/* ── Pre-selected tutor locked banner ── */}
                                    {preSelectedTutorId ? (
                                        <div className="space-y-4">
                                            {/* Locked tutor card */}
                                            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 flex items-center gap-5">
                                                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-blue-600/30 shrink-0">
                                                    {preSelectedTutorData?.image
                                                        ? <img src={preSelectedTutorData.image.startsWith('http') ? preSelectedTutorData.image : `${import.meta.env.VITE_API_BASE_URL}${preSelectedTutorData.image}`} alt={preSelectedTutorName} className="w-full h-full object-cover" onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(preSelectedTutorName)}&background=1e40af&color=fff&size=128`; }} />
                                                        : <div className="w-full h-full bg-blue-600/10 flex items-center justify-center text-2xl font-black text-blue-600">{preSelectedTutorName?.[0]}</div>
                                                    }
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Registering with</p>
                                                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{preSelectedTutorName}</h4>
                                                    {preSelectedTutorData?.qualification && (
                                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{preSelectedTutorData.qualification}</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className="text-[8px] font-black bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full border border-blue-600/20 uppercase tracking-widest">✓ Confirmed</span>
                                                    {preSelectedTutorData?.hourly_rate && (
                                                        <span className="text-[10px] font-black text-slate-900">₦{parseFloat(preSelectedTutorData.hourly_rate).toLocaleString()}/hr</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Per-subject assignment summary */}
                                            <div className="grid md:grid-cols-2 gap-3">
                                                {selectedSubjects.map(subject => (
                                                    <div key={subject} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{subject}</span>
                                                        </div>
                                                        <span className="text-[8px] font-black bg-indigo-600/10 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-600/20 uppercase tracking-widest">Assigned</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <p className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-widest pt-2">
                                                Want a different tutor? <button type="button" onClick={() => { setPreSelectedTutorId(null); setPreSelectedTutorName(''); setPreSelectedTutorData(null); }} className="text-blue-600 underline ml-1">Browse all tutors</button>
                                            </p>
                                        </div>
                                    ) : (
                                        /* ── Normal tutor picker ── */
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {selectedSubjects.map(subject => {
                                                const tutors = tutorsBySubject[subject] || [];
                                                const isLoading = loadingTutors[subject];
                                                const selectedTutorId = subjectEnrollments[subject];

                                                return (
                                                    <div key={subject} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 space-y-6 shadow-sm">
                                                        <div className="flex justify-between items-center px-2">
                                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                                                {subject}
                                                            </h4>
                                                            {selectedTutorId ?
                                                                <span className="text-[8px] font-black bg-indigo-600/10 text-indigo-600 px-2 py-1 rounded-lg uppercase tracking-widest border border-indigo-600/20">Assigned</span> :
                                                                <span className="text-[8px] font-black bg-blue-600/10 text-blue-600 px-2 py-1 rounded-lg uppercase tracking-widest border border-blue-600/20">Pending Selection</span>
                                                            }
                                                        </div>

                                                        <div className="space-y-3 max-h-[300px] overflow-y-auto px-1 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                                            {isLoading ? (
                                                                <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                                                            ) : tutors.length === 0 ? (
                                                                <p className="text-[9px] text-slate-500 italic text-center py-6 bg-slate-50 rounded-2xl">No dedicated tutors available. A specialist will be matched upon admission.</p>
                                                            ) : tutors.map(tutor => {
                                                                const hasConflict = checkTutorConflicts(tutor).length > 0;
                                                                return (
                                                                    <motion.div
                                                                        key={tutor.id}
                                                                        whileHover={hasConflict ? {} : { x: 4 }}
                                                                        onClick={() => { if (!hasConflict) setPreferredTutor(subject, tutor.id); }}
                                                                        className={`p-4 rounded-2xl border transition-all flex gap-4 items-center group relative overflow-hidden ${hasConflict
                                                                            ? 'bg-rose-500/5 border-rose-500/10 cursor-not-allowed opacity-80'
                                                                            : selectedTutorId === tutor.id
                                                                                ? 'bg-blue-600/5 border-blue-600/30 cursor-pointer shadow-lg shadow-blue-600/5'
                                                                                : 'bg-slate-50 border-slate-100 hover:bg-slate-100 cursor-pointer'}`}
                                                                    >
                                                                        <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-200 shrink-0 relative">
                                                                            {tutor.image ? <img src={tutor.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-blue-600 bg-blue-600/5">{tutor.user?.first_name?.[0]}</div>}
                                                                            {checkTutorConflicts(tutor).length > 0 && (
                                                                                <div className="absolute inset-0 bg-rose-500/40 backdrop-blur-[2px] flex items-center justify-center">
                                                                                    <span className="text-[7px] font-black text-white uppercase tracking-tighter">Busy</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex justify-between items-start">
                                                                                <h5 className="font-bold text-slate-900 text-xs truncate uppercase tracking-tighter">Tutor {tutor.user?.first_name} {tutor.user?.last_name}</h5>
                                                                                {checkTutorConflicts(tutor).length > 0 && (
                                                                                    <span className="text-[7px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">Conflict</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex justify-between items-center mt-0.5">
                                                                                <span className="text-[9px] text-slate-500 font-bold truncate tracking-widest">{tutor.qualification || 'Certified Expert'}</span>
                                                                                <span className="text-[10px] font-black text-slate-900/80 shrink-0 ml-4">₦{parseFloat(tutor.hourly_rate).toLocaleString()}</span>
                                                                            </div>
                                                                            {checkTutorConflicts(tutor).length > 0 ? (
                                                                                <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-1 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">Change Time or Choose Another</span>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => { e.stopPropagation(); setSelectedTutorForProfile(tutor); }}
                                                                                    className="text-[8px] font-black text-blue-600 underline uppercase tracking-tighter mt-1"
                                                                                >Intro Video →</button>
                                                                            )}
                                                                        </div>
                                                                        {selectedTutorId === tutor.id && <div className="absolute top-0 right-0 h-full w-1.5 bg-blue-600"></div>}
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Section 6: Guardian Details (Minor only) */}
                        <AnimatePresence>
                            {isMinor && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-blue-600/5 border border-blue-600/10 rounded-[3rem] p-8 md:p-10 shadow-2xl space-y-8"
                                >
                                    <div className="flex items-center justify-between px-2">
                                        <SectionHeader step="06" title="Guardian Oversight" colorClass="bg-blue-600/10 text-blue-600" />
                                        <span className="bg-blue-600/20 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] animate-pulse">Required (Minor)</span>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Parent First Name *</label>
                                            <input type="text" name="parentFirstName" value={formData.parentFirstName} onChange={handleChange} required placeholder="Guardian Name" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-900 font-bold outline-none focus:border-blue-600/30 transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Relationship</label>
                                            <select name="relationship" value={formData.relationship} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-900 font-bold outline-none focus:border-blue-600/30 transition-all appearance-none cursor-pointer">
                                                <option className="bg-white">Father</option>
                                                <option className="bg-white">Mother</option>
                                                <option className="bg-white">Guardian</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Parent Email *</label>
                                            <input type="email" name="parentEmail" value={formData.parentEmail} onChange={handleChange} required placeholder="parent@email.com" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-900 font-bold outline-none focus:border-blue-600/30 transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Parent Password *</label>
                                            <input type="password" name="parentPassword" value={formData.parentPassword} onChange={handleChange} required placeholder="Access Key" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-900 font-bold outline-none focus:border-blue-600/30 transition-all" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Final Submission */}
                        <div className="flex flex-col items-center gap-8 pt-12 pb-20">
                            {(() => {
                                let total = 0;
                                const numSubjects = selectedSubjects.length || 1;
                                
                                // Calculate total weekly hours using the same logic as handleSubmit
                                let totalWeeklyHours = 0;
                                const validSchedule = formData.schedule.filter(s => s.day && s.time);
                                if (validSchedule.length > 0) {
                                    validSchedule.forEach(slot => {
                                        const times = slot.time.split('-');
                                        if (times.length === 2 && times[0] && times[1]) {
                                            const [h1, m1] = times[0].split(':').map(Number);
                                            const [h2, m2] = times[1].split(':').map(Number);
                                            let diff = (h2 + m2/60) - (h1 + m1/60);
                                            if (diff <= 0) diff = parseFloat(formData.hoursPerSession) || 1;
                                            totalWeeklyHours += diff;
                                        } else {
                                            totalWeeklyHours += parseFloat(formData.hoursPerSession) || 1;
                                        }
                                    });
                                } else {
                                    totalWeeklyHours = (parseInt(formData.daysPerWeek) || 1) * (parseFloat(formData.hoursPerSession) || 1);
                                }

                                const hoursPerSubject = totalWeeklyHours / numSubjects;
                                const baseRate = getRateByLevel(formData.level);

                                selectedSubjects.forEach(subject => {
                                    const tutorId = subjectEnrollments[subject];
                                    let rate = baseRate;
                                    if (tutorId) {
                                        const tutor = (tutorsBySubject[subject] || []).find(t => t.id === tutorId);
                                        if (tutor && tutor.hourly_rate) rate = parseFloat(tutor.hourly_rate);
                                    }
                                    total += (rate * hoursPerSubject * 4);
                                });
                                
                                return selectedSubjects.length > 0 ? (
                                    <div className="bg-blue-600/5 border border-blue-600/10 px-8 py-6 rounded-[2rem] w-full max-w-md flex flex-col items-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Calculated Monthly Rate</p>
                                        <h3 className="text-4xl font-black text-slate-900">₦{total.toLocaleString()}</h3>
                                        <p className="text-slate-400 text-[10px] mt-2 font-medium">Auto-renewed each month</p>
                                    </div>
                                ) : null;
                            })()}

                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl shadow-blue-600/20 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>Enroll Scholar <ArrowRight size={20} /></>
                                )}
                            </motion.button>

                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Registered Scholar? <Link to="/login" className="text-blue-600 underline ml-2">Sign In Portal</Link>
                            </p>
                        </div>
                    </form>
                </motion.div>
            </div>

            {/* Tutor Profile Modal */}
            <AnimatePresence>
                {selectedTutorForProfile && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white border border-slate-100 rounded-[3rem] w-full max-w-4xl overflow-hidden relative shadow-2xl"
                        >
                            <button onClick={() => setSelectedTutorForProfile(null)} className="absolute top-6 right-6 w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 z-20 border border-slate-200">✕</button>

                            <div className="grid md:grid-cols-2">
                                <div className="bg-slate-900 aspect-video md:aspect-auto relative">
                                    {(() => {
                                        const videoUrl = selectedTutorForProfile.video_url || selectedTutorForProfile.intro_video;
                                        if (videoUrl) {
                                            const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
                                            if (isYoutube) {
                                                let id = '';
                                                try { id = videoUrl.includes('youtu.be/') ? videoUrl.split('youtu.be/')[1]?.split('?')[0] : new URL(videoUrl).searchParams.get('v'); } catch (_e) { /* ignore */ }
                                                return <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full border-0" title="Intro" />;
                                            }
                                            const finalUrl = videoUrl.startsWith('http') ? videoUrl : `${import.meta.env.VITE_API_BASE_URL}${videoUrl}`;
                                            return <video src={finalUrl} controls className="w-full h-full object-cover" />;
                                        }
                                        return (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-12 bg-gradient-to-br from-slate-800 to-slate-900">
                                                <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-2xl">
                                                    {selectedTutorForProfile.image
                                                        ? <img src={selectedTutorForProfile.image.startsWith('http') ? selectedTutorForProfile.image : `${import.meta.env.VITE_API_BASE_URL}${selectedTutorForProfile.image}`} alt={selectedTutorForProfile.user?.first_name} className="w-full h-full object-cover" onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((selectedTutorForProfile.user?.first_name || '') + '+' + (selectedTutorForProfile.user?.last_name || ''))}&background=1e40af&color=fff&size=128`; }} />
                                                        : <div className="w-full h-full bg-blue-600/10 flex items-center justify-center text-4xl font-black text-blue-600">{selectedTutorForProfile.user?.first_name?.[0]}</div>
                                                    }
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="text-white font-black text-lg uppercase tracking-tight">{selectedTutorForProfile.user?.first_name} {selectedTutorForProfile.user?.last_name}</h4>
                                                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">{selectedTutorForProfile.qualification || 'Certified Educator'}</p>
                                                </div>
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">No intro video uploaded</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="p-10 space-y-6 flex flex-col justify-between max-h-[80vh] overflow-y-auto">
                                    <div className="space-y-5">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tighter">Tutor {selectedTutorForProfile.user?.first_name} {selectedTutorForProfile.user?.last_name}</h3>
                                            <p className="text-blue-600 font-bold text-[10px] mt-1 uppercase tracking-widest">{selectedTutorForProfile.qualification || 'Certified Global Educator'}</p>
                                        </div>
                                        {selectedTutorForProfile.bio && (
                                            <p className="text-slate-500 text-xs font-medium leading-relaxed italic border-l-2 border-blue-600/30 pl-4">"{selectedTutorForProfile.bio}"</p>
                                        )}
                                        <div className="space-y-2 pt-2">
                                            {selectedTutorForProfile.hourly_rate && (
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest py-2 border-b border-slate-100">
                                                    <span className="text-slate-400">Rate</span>
                                                    <span className="text-blue-600">₦{parseFloat(selectedTutorForProfile.hourly_rate).toLocaleString()} / hr</span>
                                                </div>
                                            )}
                                            {selectedTutorForProfile.experience_years && (
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest py-2 border-b border-slate-100">
                                                    <span className="text-slate-400">Experience</span>
                                                    <span className="text-slate-900">{selectedTutorForProfile.experience_years} Years</span>
                                                </div>
                                            )}
                                            {selectedTutorForProfile.languages && (
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest py-2 border-b border-slate-100">
                                                    <span className="text-slate-400">Languages</span>
                                                    <span className="text-slate-900 text-right w-1/2">{selectedTutorForProfile.languages}</span>
                                                </div>
                                            )}
                                            {selectedTutorForProfile.subjects_to_teach && (
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest py-2">
                                                    <span className="text-slate-400">Teaches</span>
                                                    <span className="text-blue-600 text-right w-1/2">{selectedTutorForProfile.subjects_to_teach}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedTutorForProfile(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]">Close Profile</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Register;

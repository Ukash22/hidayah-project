import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

import { 
    CheckCircle2 as IconCheckCircle2, Sparkles as IconSparkles, Briefcase as IconBriefcase, ArrowRight as IconArrowRight, X as IconX,
    BookOpen as IconBookOpen, GraduationCap as IconGraduationCap
} from 'lucide-react';

// Core Components & Services
import Navbar from '../components/Navbar';
import { uploadMultipleToCloudinary } from '../services/cloudinaryService';

// Refactored Sub-Components
import AccountFields from '../components/TutorRegister/AccountFields';
import ProfileFields from '../components/TutorRegister/ProfileFields';
import ExperienceFields from '../components/TutorRegister/ExperienceFields';
import SubjectGrid from '../components/TutorRegister/SubjectGrid';
import TechnicalFields from '../components/TutorRegister/TechnicalFields';
import AvailabilityManager from '../components/TutorRegister/AvailabilityManager';

// Custom file upload box component used across sub-sections
const FileUploadBox = ({ name, accept, onChange, file, icon: Icon, required, label }) => {
    const inputRef = useRef(null);
    const hasFile = !!file;
    const borderClass = hasFile
        ? 'border-emerald-500/60 bg-emerald-500/5'
        : 'border-white/15 bg-black/40';

    return (
        <div className="space-y-1.5 h-full">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 ml-1">
                {label} {required && <span className="text-red-500">* Required</span>}
            </label>
            <div
                className={`rounded-2xl border transition-all cursor-pointer h-full min-h-[90px] flex flex-col justify-center ${borderClass}`}
                onClick={() => inputRef.current?.click()}
            >
                <div className="flex items-center gap-3 px-4 py-2">
                    <Icon size={18} className={hasFile ? 'text-emerald-500' : 'text-slate-600'} />
                    <button
                        type="button"
                        className={`text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-xl border transition-all pointer-events-none ${
                            hasFile
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                    >
                        {hasFile ? 'Change' : 'Choose'}
                    </button>
                    {hasFile && <IconCheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
                </div>
                <div className={`px-4 pb-2 text-[10px] font-bold truncate ${
                    hasFile ? 'text-emerald-400' : 'text-slate-600'
                }`}>
                    {hasFile ? `✓ ${file.name}` : 'No file selected'}
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                name={name}
                accept={accept}
                onChange={onChange}
                className="hidden"
            />
        </div>
    );
};

const SectionHeader = ({ icon: Icon, title, step, colorClass }) => (
    <div className="flex items-center gap-4 mb-10">
        <div className={`w-12 h-12 ${colorClass || 'bg-emerald-500/10 text-emerald-500'} rounded-2xl flex items-center justify-center font-bold text-lg border border-white/15 shadow-xl`}>
            {step || <Icon size={24} />}
        </div>
        <div>
            <h3 className="text-xl font-bold text-white tracking-tight uppercase font-display">{title}</h3>
            <div className="h-0.5 w-12 bg-white/10 mt-2 rounded-full overflow-hidden">
                <div className={`h-full w-2/3 ${colorClass?.replace('text','bg') || 'bg-emerald-500'}`}></div>
            </div>
        </div>
    </div>
);

const TutorRegister = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 6;

    const DRAFT_KEY = 'hidayah_tutor_register_draft';

    const getInitialFormData = () => {
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) return JSON.parse(saved);
        } catch {}
        return null;
    };

    const DEFAULT_FORM = {
        firstName: '', lastName: '', age: '', email: '', phone: '', gender: 'Male',
        country: '', address: '', experienceYears: '0', subjects: [], languages: '',
        hasOnlineExp: false, deviceType: 'COMPUTER', hourlyRate: '1500',
        networkType: '', availabilitySlots: [{ day: 'Monday', startTime: '08:00', endTime: '12:00' }],
        username: '', password: '', confirmPassword: ''
    };

    const _savedDraft = getInitialFormData();
    const [draftRestored, setDraftRestored] = useState(!!_savedDraft);
    const [formData, setFormData] = useState(_savedDraft ? { ...DEFAULT_FORM, ..._savedDraft } : DEFAULT_FORM);

    const [files, setFiles] = useState({
        image: null, introVideo: null, shortRecitation: null, cv: null, credentials: null
    });

    // Persist draft on every formData change (exclude passwords)
    useEffect(() => {
        const { password, confirmPassword, ...safe } = formData;
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(safe)); } catch {}
    }, [formData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
    };

    const handleSubjectToggle = (subject) => {
        setFormData(prev => {
            const current = prev.subjects;
            return {
                ...prev,
                subjects: current.includes(subject) 
                    ? current.filter(s => s !== subject) 
                    : [...current, subject]
            };
        });
    };

    // Availability Helpers
    const addAvailabilitySlot = () => {
        setFormData(prev => ({ 
            ...prev, availabilitySlots: [...prev.availabilitySlots, { day: '', startTime: '', endTime: '' }] 
        }));
    };
    
    const removeAvailabilitySlot = (index) => {
        setFormData(prev => ({ 
            ...prev, availabilitySlots: prev.availabilitySlots.filter((_, i) => i !== index) 
        }));
    };
    
    const updateAvailabilitySlot = (index, field, value) => {
        setFormData(prev => {
            const newSlots = [...prev.availabilitySlots];
            newSlots[index] = { ...newSlots[index], [field]: value };
            return { ...prev, availabilitySlots: newSlots };
        });
    };

    const calculateTotalWeeklyHours = () => {
        return formData.availabilitySlots.reduce((total, slot) => {
            if (!slot.startTime || !slot.endTime) return total;
            const [h1, m1] = slot.startTime.split(':').map(Number);
            const [h2, m2] = slot.endTime.split(':').map(Number);
            const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            return total + (diff > 0 ? diff / 60 : 0);
        }, 0);
    };
    
    const totalWeeklyHours = calculateTotalWeeklyHours();
    const totalMonthlyHours = totalWeeklyHours * 4;
    const monthlyEarnings = totalMonthlyHours * (parseFloat(formData.hourlyRate) || 0);

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
        if (formData.subjects.length === 0) return setError('Select at least one subject');
        
        const missing = [];
        if (!files.image) missing.push('Photo');
        if (!files.cv) missing.push('CV');
        if (!files.introVideo) missing.push('Video');
        if (!files.shortRecitation) missing.push('Recitation');

        if (missing.length > 0) return setError(`Missing required files: ${missing.join(', ')}`);
        
        setLoading(true);

        try {
            setLoading('Uploading Media...');
            const uploadedUrls = await uploadMultipleToCloudinary(files, {
                image: 'tutor_images', introVideo: 'tutor_videos',
                shortRecitation: 'tutor_recitations', cv: 'tutor_credentials', credentials: 'tutor_credentials'
            });
            
            setLoading('Finalizing Application...');
            await api.post('/api/tutors/register/', {
                ...formData,
                first_name: formData.firstName,
                last_name: formData.lastName,
                experience_years: formData.experienceYears,
                subjects_to_teach: formData.subjects.join(', '),
                availability_hours: formData.availabilitySlots.map(s => `${s.day}: ${s.startTime} - ${s.endTime}`).join(', '),
                availabilitySlots: formData.availabilitySlots,
                image_url: uploadedUrls.image,
                intro_video_url: uploadedUrls.introVideo,
                short_recitation_url: uploadedUrls.shortRecitation,
                cv_url: uploadedUrls.cv,
                credentials_url: uploadedUrls.credentials
            });

            try { localStorage.removeItem(DRAFT_KEY); } catch {}
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.detail || getApiError(err, 'Registration failed'));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white text-slate-700">
                <Navbar />
                <div className="max-w-3xl mx-auto pt-32 px-4 text-center">
                    <div className="bg-white border border-blue-100 p-12 rounded-card-lg shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-card flex items-center justify-center mx-auto mb-8 border border-emerald-200">
                            <IconCheckCircle2 size={48} className="text-emerald-500" />
                        </div>
                        <h1 className="text-4xl font-display font-bold text-slate-900 mb-4 tracking-tighter uppercase">Application Submitted!</h1>
                        <p className="text-slate-500 mb-8 leading-relaxed font-medium">JazakAllahu Khairan. Our team will review your credentials and contact you via email.</p>
                        <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-blue-700 transition-all text-sm shadow-xl shadow-blue-600/20">Return Home</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white text-slate-700 selection:bg-blue-600/20">
            <Navbar />
            
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[0%] left-[-5%] w-[35%] h-[35%] bg-indigo-600/5 blur-[150px] rounded-full"></div>
            </div>

            <div className="container pt-32 pb-20 px-4 relative z-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
                    
                    {/* Progress Indicator */}
                    <div className="max-w-xl mx-auto mb-16 px-8">
                        <div className="flex justify-between items-center mb-4">
                            {[1, 2, 3, 4, 5, 6].map(s => (
                                <div key={s} className="flex flex-col items-center gap-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 border-2 ${currentStep >= s ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white text-slate-300 border-slate-100'}`}>
                                        {currentStep > s ? <IconCheckCircle2 size={16} /> : s}
                                    </div>
                                    <span className={`text-[11px] font-semibold uppercase tracking-wide transition-colors ${currentStep === s ? 'text-blue-600' : 'text-slate-400'}`}>
                                        Step 0{s}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden relative">
                            <motion.div 
                                className="absolute top-0 left-0 h-full bg-blue-600" 
                                initial={{ width: "0%" }}
                                animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                            />
                        </div>
                    </div>

                    {draftRestored && (
                        <div className="max-w-xl mx-auto mb-6 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm">
                            <p className="font-semibold text-amber-700">Draft restored — your previous progress was saved.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    try { localStorage.removeItem(DRAFT_KEY); } catch {}
                                    setFormData(DEFAULT_FORM);
                                    setDraftRestored(false);
                                }}
                                className="text-[11px] font-bold uppercase tracking-wide text-amber-600 hover:text-amber-800 ml-4 shrink-0"
                            >
                                Clear Draft
                            </button>
                        </div>
                    )}

                    <div className="text-center mb-16">
                        <div className="w-20 h-20 bg-blue-600/10 rounded-card flex items-center justify-center mx-auto mb-6 border border-blue-200 shadow-2xl relative">
                            <IconBriefcase size={40} className="text-blue-600" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center"><IconSparkles size={10} className="text-white" /></div>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-display font-bold text-slate-900 mb-4 tracking-tighter uppercase">Tutor <span className="text-blue-600">Application</span></h1>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium tracking-wide">Join our global faculty and share your knowledge across Western and Islamic sciences.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-card text-sm font-bold flex items-center gap-4 mb-12 backdrop-blur-xl font-display">
                            <IconX className="shrink-0" /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-12">
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <motion.div key="st1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/40 backdrop-blur-3xl border border-white/20 rounded-card-lg p-5 md:p-8 md:p-12 shadow-2xl">
                                    <SectionHeader step="01" title="Account Details" colorClass="bg-emerald-500/10 text-emerald-500" />
                                    <AccountFields formData={formData} handleChange={handleChange} />
                                </motion.div>
                            )}
                            {currentStep === 2 && (
                                <motion.div key="st2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/40 backdrop-blur-3xl border border-white/20 rounded-card-lg p-5 md:p-8 md:p-12 shadow-2xl">
                                    <SectionHeader step="02" title="Tutor Profile" colorClass="bg-blue-500/10 text-blue-500" />
                                    <ProfileFields formData={formData} handleChange={handleChange} handleFileChange={handleFileChange} files={files} FileUploadBox={FileUploadBox} />
                                </motion.div>
                            )}
                            {currentStep === 3 && (
                                <motion.div key="st3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/40 backdrop-blur-3xl border border-white/20 rounded-card-lg p-5 md:p-8 md:p-12 shadow-2xl">
                                    <SectionHeader step="03" title="Professional Experience" colorClass="bg-violet-500/10 text-violet-500" />
                                    <ExperienceFields formData={formData} handleChange={handleChange} handleFileChange={handleFileChange} files={files} FileUploadBox={FileUploadBox} />
                                </motion.div>
                            )}
                            {currentStep === 4 && (
                                <motion.div key="st4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/40 backdrop-blur-3xl border border-white/20 rounded-card-lg p-5 md:p-8 md:p-12 shadow-2xl">
                                    <SectionHeader step="04" title="Teaching Core Subjects" colorClass="bg-amber-500/10 text-amber-500" />
                                    <SubjectGrid formData={formData} handleSubjectToggle={handleSubjectToggle} />
                                </motion.div>
                            )}
                            {currentStep === 5 && (
                                <motion.div key="st5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/40 backdrop-blur-3xl border border-white/20 rounded-card-lg p-5 md:p-8 md:p-12 shadow-2xl">
                                    <SectionHeader step="05" title="Technical Requirements" colorClass="bg-rose-500/10 text-rose-500" />
                                    <TechnicalFields formData={formData} handleChange={handleChange} handleFileChange={handleFileChange} files={files} FileUploadBox={FileUploadBox} />
                                </motion.div>
                            )}
                            {currentStep === 6 && (
                                <motion.div key="st6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/40 backdrop-blur-3xl border border-white/20 rounded-card-lg p-5 md:p-8 md:p-12 shadow-2xl">
                                    <SectionHeader step="06" title="Instructor Availability" colorClass="bg-blue-500/10 text-blue-500" />
                                    <AvailabilityManager 
                                        formData={formData} 
                                        addAvailabilitySlot={addAvailabilitySlot} 
                                        removeAvailabilitySlot={removeAvailabilitySlot} 
                                        updateAvailabilitySlot={updateAvailabilitySlot}
                                        totalWeeklyHours={totalWeeklyHours}
                                        totalMonthlyHours={totalMonthlyHours}
                                        monthlyEarnings={monthlyEarnings}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col items-center gap-8 pt-8 pb-20">
                            <div className="flex gap-4 w-full max-w-md">
                                {currentStep > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={prevStep}
                                        className="flex-1 bg-white/50 backdrop-blur-xl border border-slate-200 text-slate-600 py-6 rounded-card font-bold text-sm uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-3"
                                    >
                                        ← Previous
                                    </button>
                                )}
                                
                                {currentStep < totalSteps ? (
                                    <button 
                                        type="button" 
                                        onClick={nextStep}
                                        className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-card font-bold text-sm uppercase tracking-[0.4em] shadow-2xl shadow-blue-600/20 transition-all flex items-center justify-center gap-4"
                                    >
                                        Next Block <IconArrowRight size={20} />
                                    </button>
                                ) : (
                                    <motion.button 
                                        type="submit" 
                                        disabled={loading} 
                                        whileHover={{ scale: 1.02 }} 
                                        whileTap={{ scale: 0.98 }} 
                                        className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-card font-bold text-sm uppercase tracking-[0.4em] shadow-2xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                                    >
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Join Faculty <IconCheckCircle2 size={20} /></>}
                                    </motion.button>
                                )}
                            </div>
                            
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-6 leading-6">Existing Instructor? <Link to="/login" className="text-blue-600 underline ml-2 decoration-2 underline-offset-4">Sign In Portal</Link></p>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default TutorRegister;

import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';

import { 
    CheckCircle2, Sparkles, Briefcase, ArrowRight, X,
    BookOpen, GraduationCap
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
// eslint-disable-next-line no-unused-vars
const FileUploadBox = ({ name, accept, onChange, file, icon: Icon, required, label }) => {
    const inputRef = useRef(null);
    const hasFile = !!file;
    const borderClass = hasFile
        ? 'border-emerald-500/60 bg-emerald-500/5'
        : 'border-white/5 bg-black/40';

    return (
        <div className="space-y-1.5 h-full">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
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
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border transition-all pointer-events-none ${
                            hasFile
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                    >
                        {hasFile ? 'Change' : 'Choose'}
                    </button>
                    {hasFile && <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
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

// eslint-disable-next-line no-unused-vars
const SectionHeader = ({ icon: Icon, title, step, colorClass }) => (
    <div className="flex items-center gap-4 mb-10">
        <div className={`w-12 h-12 ${colorClass || 'bg-emerald-500/10 text-emerald-500'} rounded-2xl flex items-center justify-center font-black text-lg border border-white/5 shadow-xl`}>
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

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', age: '', email: '', phone: '', gender: 'Male',
        country: '', address: '', experienceYears: '0', subjects: [], languages: '',
        hasOnlineExp: false, deviceType: 'COMPUTER', hourlyRate: '1500',
        networkType: '', availabilitySlots: [{ day: 'Monday', startTime: '08:00', endTime: '12:00' }],
        username: '', password: '', confirmPassword: ''
    });

    const [files, setFiles] = useState({
        image: null, introVideo: null, shortRecitation: null, cv: null, credentials: null
    });

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
        
        const missing = [];
        if (!files.image) missing.push('Photo');
        if (!files.cv) missing.push('CV');
        if (!files.introVideo) missing.push('Video');
        if (!files.shortRecitation) missing.push('Recitation');

        if (missing.length > 0) return setError(`Missing required files: ${missing.join(', ')}`);
        
        // Size validation
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
        const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
        const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

        if (files.image.size > MAX_IMAGE_SIZE) return setError('Profile image must be under 5MB');
        if (files.introVideo.size > MAX_VIDEO_SIZE) return setError('Intro video must be under 50MB');
        if (files.cv.size > MAX_DOC_SIZE) return setError('CV file must be under 10MB');
        if (files.shortRecitation?.size > MAX_VIDEO_SIZE) return setError('Recitation file must be under 50MB');

        if (formData.subjects.length === 0) return setError('Select at least one subject');

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

            setSuccess(true);
        } catch (err) {
            const serverError = err.response?.data?.detail || err.response?.data?.error || 'Registration failed';
            setError(serverError);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white text-slate-700">
                <Navbar />
                <div className="max-w-3xl mx-auto pt-32 px-4 text-center">
                    <div className="bg-white border border-blue-100 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-emerald-200">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                        </div>
                        <h1 className="text-4xl font-display font-black text-slate-900 mb-4 tracking-tighter uppercase">Application Submitted!</h1>
                        <p className="text-slate-500 mb-8 leading-relaxed font-medium">JazakAllahu Khairan. Our team will review your credentials and contact you via email.</p>
                        <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all text-sm shadow-xl shadow-blue-600/20">Return Home</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white text-slate-700 selection:bg-blue-600/20">
            <Navbar />
            
            {/* Background Ambience */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[0%] left-[-5%] w-[35%] h-[35%] bg-indigo-600/5 blur-[150px] rounded-full"></div>
            </div>

            <div className="container pt-32 pb-20 px-4 relative z-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="w-20 h-20 bg-blue-600/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-blue-200 shadow-2xl relative">
                            <Briefcase size={40} className="text-blue-600" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center animate-pulse"><Sparkles size={10} className="text-white" /></div>
                        </div>
                        <h1 className="text-5xl font-display font-black text-slate-900 mb-4 tracking-tighter uppercase">Tutor <span className="text-blue-600">Application</span></h1>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium tracking-wide">Join our global faculty and share your knowledge across Western and Islamic sciences.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-[2rem] text-sm font-bold flex items-center gap-4 mb-12 backdrop-blur-xl">
                            <X className="shrink-0" /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-12">
                        <div className="grid lg:grid-cols-2 gap-8">
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl">
                                <SectionHeader step="01" title="Account Details" colorClass="bg-emerald-500/10 text-emerald-500" />
                                <AccountFields formData={formData} handleChange={handleChange} />
                            </motion.div>

                            <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-2xl flex flex-col">
                                <SectionHeader step="02" title="Tutor Profile" colorClass="bg-blue-500/10 text-blue-500" />
                                <ProfileFields formData={formData} handleChange={handleChange} handleFileChange={handleFileChange} files={files} FileUploadBox={FileUploadBox} />
                            </motion.div>
                        </div>

                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl">
                            <SectionHeader step="03" title="Professional Experience" colorClass="bg-violet-500/10 text-violet-500" />
                            <ExperienceFields formData={formData} handleChange={handleChange} handleFileChange={handleFileChange} files={files} FileUploadBox={FileUploadBox} />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl">
                            <SectionHeader step="04" title="Teaching Core Subjects" colorClass="bg-amber-500/10 text-amber-500" />
                            <SubjectGrid formData={formData} handleSubjectToggle={handleSubjectToggle} />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl">
                            <SectionHeader step="05" title="Technical Requirements" colorClass="bg-rose-500/10 text-rose-500" />
                            <TechnicalFields formData={formData} handleChange={handleChange} handleFileChange={handleFileChange} files={files} FileUploadBox={FileUploadBox} />
                        </motion.div>

                        <AvailabilityManager 
                            formData={formData} 
                            addAvailabilitySlot={addAvailabilitySlot} 
                            removeAvailabilitySlot={removeAvailabilitySlot} 
                            updateAvailabilitySlot={updateAvailabilitySlot}
                            totalWeeklyHours={totalWeeklyHours}
                            totalMonthlyHours={totalMonthlyHours}
                            monthlyEarnings={monthlyEarnings}
                        />

                        <div className="flex flex-col items-center gap-8 pt-12 pb-20">
                            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full max-w-md bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-4 disabled:opacity-50">
                                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Join Faculty <ArrowRight size={20} /></>}
                            </motion.button>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-6 leading-6">Existing Instructor? <Link to="/login" className="text-emerald-500 underline ml-2 decoration-2 underline-offset-4">Sign In Portal</Link></p>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default TutorRegister;

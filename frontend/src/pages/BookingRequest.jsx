import React, { useState, useEffect } from 'react';
import axios from 'axios';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Clock, Calendar, ShieldCheck, ArrowRight, User, X, Play, Music, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ── Inline Video/Audio Modal ──────────────────────────────────── */
const MediaModal = ({ media, onClose }) => {
    if (!media) return null;

    const getYouTubeId = (url) => {
        if (!url) return null;
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0];
        try { return new URL(url).searchParams.get('v'); } catch { return null; }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 30 }}
                    className={`relative w-full ${media.type === 'audio' ? 'max-w-md bg-[#0f1117] rounded-[3rem] p-12 text-center' : 'max-w-4xl aspect-video rounded-[2rem] overflow-hidden bg-black'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                    >
                        <X size={18} />
                    </button>

                    {media.type === 'video' && (
                        media.videoType === 'youtube' ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${getYouTubeId(media.url)}?autoplay=1&rel=0`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                                title={media.name}
                            />
                        ) : (
                            <video
                                src={media.url?.startsWith('http') ? media.url : `${import.meta.env.VITE_API_BASE_URL}${media.url}`}
                                controls
                                autoPlay
                                className="w-full h-full object-contain"
                            />
                        )
                    )}

                    {media.type === 'audio' && (
                        <>
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 border border-emerald-500/20 animate-pulse">🎙️</div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">Quran Recitation Sample</p>
                            <h3 className="text-2xl font-black text-white mb-6">{media.name}</h3>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                <audio
                                    src={media.url?.startsWith('http') ? media.url : `${import.meta.env.VITE_API_BASE_URL}${media.url}`}
                                    controls
                                    className="w-full"
                                />
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const BookingRequest = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [tutors, setTutors] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [bookingStates, setBookingStates] = useState({});
    const [mediaModal, setMediaModal] = useState(null);
    const [expandedTutor, setExpandedTutor] = useState(null);

    const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};

    const getBookingData = (tutorId) => {
        return bookingStates[tutorId] || {
            subject: '',
            schedule: [{ day: '', time: '' }],
            preferred_start_date: '',
            learning_level: 'Primary School',
            class_structure: 'One-on-One',
            hours_per_session: 1.0
        };
    };

    const addHoursToTime = (timeStr, hours) => {
        if (!timeStr || !hours) return '';
        const [h, m] = timeStr.split(':').map(Number);
        const totalMinutes = h * 60 + (m || 0) + hours * 60;
        const newH = Math.floor(totalMinutes / 60) % 24;
        const newM = totalMinutes % 60;
        return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    };

    const updateBookingField = (tutorId, field, value) => {
        setBookingStates(prev => {
            const current = prev[tutorId] || { 
                subject: '', 
                schedule: [{ day: '', time: '' }], 
                preferred_start_date: '', 
                learning_level: 'Primary School', 
                class_structure: 'One-on-One', 
                hours_per_session: 1.0 
            };
            
            let newSchedule = [...current.schedule];
            // If hours_per_session changes, update all end times in the schedule
            if (field === 'hours_per_session') {
                newSchedule = newSchedule.map(slot => {
                    const startTime = (slot.time || '').split('-')[0];
                    if (startTime) {
                        const endTime = addHoursToTime(startTime, value);
                        return { ...slot, time: `${startTime}-${endTime}` };
                    }
                    return slot;
                });
            }

            return { 
                ...prev, 
                [tutorId]: { 
                    ...current, 
                    [field]: value,
                    schedule: newSchedule
                } 
            };
        });
    };

    const addSlot = (tutorId) => {
        setBookingStates(prev => {
            const current = prev[tutorId] || { subject: '', schedule: [{ day: '', time: '' }], preferred_start_date: '', learning_level: 'Primary School', class_structure: 'One-on-One', hours_per_session: 1.0 };
            return { ...prev, [tutorId]: { ...current, schedule: [...current.schedule, { day: '', time: '' }] } };
        });
    };

    const removeSlot = (tutorId, index) => {
        setBookingStates(prev => {
            const current = prev[tutorId];
            if (!current || !current.schedule) return prev;
            return { ...prev, [tutorId]: { ...current, schedule: current.schedule.filter((_, i) => i !== index) } };
        });
    };

    const updateSlot = (tutorId, index, field, value) => {
        setBookingStates(prev => {
            const current = prev[tutorId] || { subject: '', schedule: [{ day: '', time: '' }], preferred_start_date: '', learning_level: 'Primary School', class_structure: 'One-on-One', hours_per_session: 1.0 };
            const newSchedule = [...current.schedule];
            if (!newSchedule[index]) newSchedule[index] = { day: '', time: '' };
            newSchedule[index] = { ...newSchedule[index], [field]: value };
            return { ...prev, [tutorId]: { ...current, schedule: newSchedule } };
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tutorRes, subRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/`, { headers: getAuthHeader() }),
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/programs/subjects/`, { headers: getAuthHeader() })
                ]);
                setTutors(tutorRes.data);
                setSubjects(subRes.data);
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);



    const handleRequestBooking = async (tutor) => {
        const bookingData = getBookingData(tutor.id);
        const missing = [];
        if (!bookingData.subject) missing.push("Subject");
        if (!bookingData.preferred_start_date) missing.push("Start Date");
        if (!bookingData.schedule || bookingData.schedule.length === 0) {
            missing.push("At least one schedule slot");
        } else if (bookingData.schedule.some(s => !s.day || !s.time)) {
            missing.push("Complete Schedule (all days and times must be filled)");
        }

        if (missing.length > 0) {
            alert(`Please complete the following details:\n- ${missing.join('\n- ')}`);
            return;
        }

        // Helper to normalize time to minutes from midnight
        const normalizeToMinutes = (t) => {
            if (!t) return null;
            let timeStr = t.trim().toUpperCase();
            const isPM = timeStr.includes('PM');
            const isAM = timeStr.includes('AM');
            
            timeStr = timeStr.replace(/[A-Z\s]/g, '');
            const parts = timeStr.split(':');
            let h = parseInt(parts[0]);
            let m = parseInt(parts[1] || '0');

            if (isPM && h < 12) h += 12;
            if (isAM && h === 12) h = 0;

            return h * 60 + m;
        };

        const formatTime12h = (t) => {
            if (!t) return '';
            let [h, m] = t.split(':');
            h = parseInt(h);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${m.padStart(2, '0')} ${ampm}`;
        };

        // Validate against tutor availability
        if (tutor.availabilities && tutor.availabilities.length > 0) {
            for (let slot of bookingData.schedule) {
                const av = tutor.availabilities.find(a => 
                    a.day.toUpperCase() === slot.day.toUpperCase() || 
                    a.day.toUpperCase().startsWith(slot.day.toUpperCase().slice(0, 3))
                );

                if (!av) {
                    alert(`Tutor is not available on ${slot.day}.`);
                    return;
                }

                const [slotStartRaw, slotEndRaw] = (slot.time || '').split('-');
                const slotStart = normalizeToMinutes(slotStartRaw);
                const slotEnd = normalizeToMinutes(slotEndRaw || slotStartRaw);

                const avStart = normalizeToMinutes(av.start_time);
                const avEnd = normalizeToMinutes(av.end_time);

                if (slotStart === null || slotEnd === null) {
                    alert("Invalid time format selected.");
                    return;
                }

                if (slotStart < avStart || slotEnd > avEnd) {
                    alert(`Selected time ${slot.time} on ${slot.day} is outside tutor's availability (${formatTime12h(av.start_time)} - ${formatTime12h(av.end_time)}).`);
                    return;
                }
            }
        }

        setRequesting(true);
        try {
            const payload = {
                tutor_id: tutor.id,
                subject: bookingData.subject,
                schedule: bookingData.schedule,
                preferred_start_date: bookingData.preferred_start_date,
                learning_level: bookingData.learning_level,
                class_structure: bookingData.class_structure,
                hours_per_session: bookingData.hours_per_session
            };
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/classes/booking/request/`, payload, { headers: getAuthHeader() });
            alert("✅ Booking successful! Your class has been automatically approved. Please proceed to your dashboard to complete the payment and start your lessons.");
            navigate('/student');
        } catch (err) {
            alert("Failed to send request: " + (err.response?.data?.error || "Error"));
        } finally {
            setRequesting(false);
        }
    };

    const filteredTutors = tutors.filter(t =>
        (t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         t.bio?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedSubject === '' || t.subjects_to_teach?.includes(selectedSubject))
    );

    const getImageSrc = (tutor) => {
        const img = tutor.image || tutor.image_url || tutor.profile_pic;
        if (!img) return null;
        if (img.startsWith('http')) return img;
        return `${import.meta.env.VITE_API_BASE_URL}${img}`;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-300">
            <Navbar />
            
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-emerald-600/30 blur-[150px] rounded-full"></div>
            </div>

            <main className="container pt-32 pb-20 px-4 md:px-8 relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-display font-black text-white mb-4">Find Your Perfect <span className="text-emerald-500">Tutor</span></h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">Browse our world-class educators and find the one that matches your learning style and goals.</p>
                </div>

                {/* Search and Filters */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 mb-12 flex flex-col md:flex-row gap-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by name or bio..." 
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 pl-14 font-bold text-white outline-none focus:border-emerald-500/30 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="md:w-64">
                        <select 
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-emerald-500/30 appearance-none transition-all"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                            <option value="" className="bg-slate-900">All Subjects</option>
                            {subjects.map(s => <option key={s.id} value={s.name} className="bg-slate-900">{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Tutor Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredTutors.map((tutor) => {
                        const imgSrc = getImageSrc(tutor);
                        const hasVideo = !!(tutor.video_url || tutor.intro_video_url);
                        const hasAudio = !!(tutor.recitation_url || tutor.short_recitation);
                        const isExpanded = expandedTutor === tutor.id;

                        return (
                            <motion.div 
                                key={tutor.id}
                                whileHover={{ y: -6 }}
                                className="bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col hover:bg-white/[0.08] transition-all group"
                            >
                                {/* ── Hero: Profile photo + video overlay ── */}
                                <div className="relative h-56 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                                    {imgSrc ? (
                                        <img
                                            src={imgSrc}
                                            alt={tutor.full_name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={e => {
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=0f766e&color=fff&size=400`;
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-8xl font-black text-emerald-500/20">
                                            {tutor.full_name?.[0]?.toUpperCase()}
                                        </div>
                                    )}

                                    {/* Gradient overlay at bottom */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-transparent" />

                                    {/* Media action buttons — top right */}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        {hasVideo && (
                                            <button
                                                onClick={() => setMediaModal({
                                                    type: 'video',
                                                    videoType: tutor.video_type,
                                                    url: tutor.video_url || tutor.intro_video_url,
                                                    name: tutor.full_name
                                                })}
                                                className="w-10 h-10 bg-black/60 hover:bg-emerald-600 border border-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md shadow-lg hover:scale-110"
                                                title="Watch Intro Video"
                                            >
                                                <Play size={14} fill="currentColor" />
                                            </button>
                                        )}
                                        {hasAudio && (
                                            <button
                                                onClick={() => {
                                                    const url = tutor.recitation_url || tutor.short_recitation;
                                                    const isVideo = url && /\.(mp4|mov|avi|webm)$/i.test(url);
                                                    setMediaModal({
                                                        type: isVideo ? 'video' : 'audio',
                                                        url,
                                                        name: tutor.full_name
                                                    });
                                                }}
                                                className="w-10 h-10 bg-black/60 hover:bg-amber-500 border border-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md shadow-lg hover:scale-110"
                                                title="Listen to Recitation"
                                            >
                                                🎙️
                                            </button>
                                        )}
                                    </div>

                                    {/* Name badge over gradient */}
                                    <div className="absolute bottom-4 left-5 right-5">
                                        <h3 className="text-xl font-bold text-white leading-tight">{tutor.full_name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center gap-1 text-amber-400 text-xs font-black">
                                                <Star size={10} fill="currentColor" /> 4.9
                                                <span className="text-slate-500 font-normal">(24)</span>
                                            </div>
                                            <span className="text-emerald-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                <ShieldCheck size={10} /> Verified
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Card Body ── */}
                                <div className="p-7 flex flex-col flex-1">

                                    {/* Subjects */}
                                    <div className="flex flex-wrap gap-1.5 mb-5">
                                        {tutor.subjects_to_teach?.split(',').map(s => (
                                            <span key={s} className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400">{s.trim()}</span>
                                        ))}
                                    </div>

                                    {/* Bio */}
                                    <p className="text-sm text-slate-400 leading-relaxed mb-5 line-clamp-2">{tutor.bio || "No bio provided."}</p>

                                    {/* Rate + Availability */}
                                    <div className="flex justify-between items-start mb-5">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Hourly Rate</p>
                                            <p className="text-2xl font-display font-black text-white">₦{tutor.hourly_rate?.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Available</p>
                                            <div className="flex flex-col gap-1 items-end">
                                                {(() => {
                                                    const formatTime12h = (t) => {
                                                        if (!t) return '';
                                                        let [h, m] = t.split(':');
                                                        h = parseInt(h);
                                                        const ampm = h >= 12 ? 'pm' : 'am';
                                                        h = h % 12 || 12;
                                                        return `${h}:${m.slice(0,2)} ${ampm}`;
                                                    };

                                                    if (tutor.availabilities && tutor.availabilities.length > 0) {
                                                        return tutor.availabilities.slice(0, 2).map((av, i) => (
                                                            <div key={i} className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                                                <Calendar size={10} className="text-emerald-500" />
                                                                <span className="text-[9px] font-black text-emerald-400 uppercase">
                                                                    {av.day.slice(0,3)}: {formatTime12h(av.start_time)} - {formatTime12h(av.end_time)}
                                                                </span>
                                                            </div>
                                                        ));
                                                    } else if (tutor.availability_hours) {
                                                        return tutor.availability_hours.split(',').slice(0, 2).map((h, i) => {
                                                            const parts = h.trim().split(': ');
                                                            let display = h.trim();
                                                            if (parts.length >= 2) {
                                                                const timePart = parts[1].replace(/\s/g, '');
                                                                const [start, end] = timePart.split('-');
                                                                if (start && end) {
                                                                    display = `${parts[0].slice(0,3)}: ${formatTime12h(start)} - ${formatTime12h(end)}`;
                                                                }
                                                            }
                                                            return (
                                                                <span key={i} className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                                                                    {display}
                                                                </span>
                                                            );
                                                        });
                                                    }
                                                    return <span className="text-[9px] text-slate-600">Not set</span>;
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expand / Collapse Booking Form */}
                                    <button
                                        onClick={() => setExpandedTutor(isExpanded ? null : tutor.id)}
                                        className="w-full py-3.5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:border-emerald-500/40 hover:text-emerald-400 transition-all flex items-center justify-center gap-2 mb-4"
                                    >
                                        {isExpanded ? <><ChevronUp size={14} /> Hide Booking Form</> : <><ChevronDown size={14} /> Book This Tutor</>}
                                    </button>

                                    {/* ── Collapsible Booking Form ── */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="space-y-4 bg-black/40 p-5 rounded-[2rem] border border-white/5 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full" />

                                                    <div className="space-y-1 relative z-10">
                                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">Academic Program</label>
                                                        <select 
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                                            onChange={(e) => updateBookingField(tutor.id, 'subject', e.target.value)}
                                                            value={getBookingData(tutor.id).subject}
                                                        >
                                                            <option value="" className="bg-slate-900">Select Subject</option>
                                                            {tutor.subjects_to_teach?.split(',').map(s => <option key={s} value={s.trim()} className="bg-slate-900">{s.trim()}</option>)}
                                                        </select>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 relative z-10">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">Learning Level</label>
                                                            <select 
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                                                onChange={(e) => updateBookingField(tutor.id, 'learning_level', e.target.value)}
                                                                value={getBookingData(tutor.id).learning_level}
                                                            >
                                                                <option value="Primary School" className="bg-slate-900">Primary School</option>
                                                                <option value="Secondary" className="bg-slate-900">Secondary</option>
                                                                <option value="Junior WAEC" className="bg-slate-900">Junior WAEC (BECE)</option>
                                                                <option value="JAMB" className="bg-slate-900">JAMB</option>
                                                                <option value="WAEC" className="bg-slate-900">WAEC</option>
                                                                <option value="NECO" className="bg-slate-900">NECO</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">Class Structure</label>
                                                            <select 
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                                                onChange={(e) => updateBookingField(tutor.id, 'class_structure', e.target.value)}
                                                                value={getBookingData(tutor.id).class_structure}
                                                            >
                                                                <option value="One-on-One" className="bg-slate-900">One-on-One</option>
                                                                <option value="Group" className="bg-slate-900">Group Class</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 relative z-10">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">Duration / Session</label>
                                                            <select 
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                                                onChange={(e) => updateBookingField(tutor.id, 'hours_per_session', parseFloat(e.target.value))}
                                                                value={getBookingData(tutor.id).hours_per_session}
                                                            >
                                                                <option value="0.5" className="bg-[#0a0c10]">30 Minutes</option>
                                                                <option value="1" className="bg-[#0a0c10]">1.0 Hour</option>
                                                                <option value="1.5" className="bg-[#0a0c10]">1.5 Hours</option>
                                                                <option value="2" className="bg-[#0a0c10]">2.0 Hours</option>
                                                                <option value="2.5" className="bg-[#0a0c10]">2.5 Hours</option>
                                                                <option value="3" className="bg-[#0a0c10]">3.0 Hours</option>
                                                                <option value="4" className="bg-[#0a0c10]">4.0 Hours</option>
                                                                <option value="5" className="bg-[#0a0c10]">5.0 Hours</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">Preferred Start Date</label>
                                                            <input 
                                                                type="date" 
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all"
                                                                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                                                onChange={(e) => updateBookingField(tutor.id, 'preferred_start_date', e.target.value)}
                                                                value={getBookingData(tutor.id).preferred_start_date}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 relative z-10">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">Weekly Schedule</label>
                                                            <button 
                                                                onClick={() => addSlot(tutor.id)}
                                                                className="text-[8px] font-black uppercase text-emerald-500 hover:text-emerald-400 transition-colors"
                                                            >
                                                                + Add Day
                                                            </button>
                                                        </div>
                                                        
                                                        {getBookingData(tutor.id).schedule.map((slot, index) => (
                                                            <div key={index} className="flex gap-2 items-center">
                                                                 <div className="flex-1">
                                                                    <div className="flex justify-between items-center mb-0.5 px-1">
                                                                        <label className="text-[7px] font-black uppercase text-slate-500">Day</label>
                                                                        {slot.day && (() => {
                                                                            const tutorAv = tutor.availabilities?.find(av => 
                                                                                av.day.toUpperCase() === slot.day || 
                                                                                av.day.toUpperCase().startsWith(slot.day.slice(0, 3))
                                                                            ) || (tutor.availability_hours || '').split(',').find(s => s.toUpperCase().startsWith(slot.day.slice(0, 3)));
                                                                            
                                                                            if (tutorAv) {
                                                                                let display = "";
                                                                                if (typeof tutorAv === 'object') {
                                                                                    const f = (t) => {
                                                                                        let [h, m] = t.split(':');
                                                                                        h = parseInt(h);
                                                                                        return `${h % 12 || 12}:${m.slice(0,2)}${h >= 12 ? 'pm' : 'am'}`;
                                                                                    };
                                                                                    display = `${f(tutorAv.start_time)}-${f(tutorAv.end_time)}`;
                                                                                } else {
                                                                                    display = tutorAv.split(': ')[1] || "";
                                                                                }
                                                                                return <span className="text-[6px] font-bold text-amber-500 uppercase">Tutor: {display}</span>;
                                                                            }
                                                                            return null;
                                                                        })()}
                                                                    </div>
                                                                    <select 
                                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all"
                                                                        value={slot.day}
                                                                        onChange={(e) => updateSlot(tutor.id, index, 'day', e.target.value)}
                                                                    >
                                                                        <option value="" className="bg-slate-900">Day</option>
                                                                        {daysOfWeek.map(d => <option key={d} value={d.toUpperCase()} className="bg-slate-900">{d}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <div className="w-20">
                                                                        <div className="flex justify-between items-center mb-0.5 px-1">
                                                                            <label className="text-[7px] font-black uppercase text-slate-500">From</label>
                                                                            <span className="text-[6px] font-bold text-emerald-500">{(slot.time || '').split('-')[0] ? (() => {
                                                                                let [h, m] = (slot.time || '').split('-')[0].split(':');
                                                                                h = parseInt(h);
                                                                                const ampm = h >= 12 ? 'PM' : 'AM';
                                                                                h = h % 12 || 12;
                                                                                return `${h}:${m || '00'} ${ampm}`;
                                                                            })() : ''}</span>
                                                                        </div>
                                                                        <input 
                                                                            type="time" 
                                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all"
                                                                            value={(slot.time || '').split('-')[0] || ''}
                                                                            onChange={(e) => {
                                                                                const startTime = e.target.value;
                                                                                const duration = getBookingData(tutor.id).hours_per_session;
                                                                                const endTime = addHoursToTime(startTime, duration);
                                                                                updateSlot(tutor.id, index, 'time', `${startTime}-${endTime}`);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="w-20">
                                                                        <div className="flex justify-between items-center mb-0.5 px-1">
                                                                            <label className="text-[7px] font-black uppercase text-slate-500">To (Auto)</label>
                                                                            <span className="text-[6px] font-bold text-emerald-500">{(slot.time || '').split('-')[1] ? (() => {
                                                                                let [h, m] = (slot.time || '').split('-')[1].split(':');
                                                                                h = parseInt(h);
                                                                                const ampm = h >= 12 ? 'PM' : 'AM';
                                                                                h = h % 12 || 12;
                                                                                return `${h}:${m || '00'} ${ampm}`;
                                                                            })() : ''}</span>
                                                                        </div>
                                                                        <input 
                                                                            type="time" 
                                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-black text-slate-500 uppercase outline-none cursor-not-allowed opacity-60"
                                                                            value={(slot.time || '').split('-')[1] || ''}
                                                                            readOnly
                                                                            title="Automatically calculated based on duration"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {getBookingData(tutor.id).schedule.length > 1 && (
                                                                    <button 
                                                                        onClick={() => removeSlot(tutor.id, index)}
                                                                        className="bg-red-500/10 text-red-500 p-2 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {(() => {
                                                        const bookingData = getBookingData(tutor.id);
                                                        const selectedDays = bookingData.schedule.filter(s => s.day).length;
                                                        const rate = parseFloat(tutor.hourly_rate || 0);
                                                        const hours = parseFloat(bookingData.hours_per_session || 0);
                                                        const total = rate * hours * selectedDays * 4;

                                                        if (selectedDays === 0 && hours === 0) return null;

                                                        return (
                                                            <div className="pt-4 border-t border-white/5 text-right relative z-10">
                                                                <div className="flex flex-col items-end">
                                                                    <p className="text-[8px] font-black uppercase text-slate-600 mb-1">Tuition Summary</p>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                                                            <span className="text-[7px] font-black text-slate-400 uppercase">
                                                                                ₦{rate.toLocaleString()} × {hours} hrs × {selectedDays} days × 4 wks
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-2xl font-display font-black text-white leading-none">
                                                                        ₦{total.toLocaleString()}
                                                                    </p>
                                                                    <p className="text-[7px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Calculated Monthly Rate</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    <button 
                                                        onClick={() => handleRequestBooking(tutor)}
                                                        disabled={requesting}
                                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                                    >
                                                        {requesting ? "Sending..." : "Request Class →"}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </main>

            {/* Media Modal */}
            {mediaModal && <MediaModal media={mediaModal} onClose={() => setMediaModal(null)} />}
        </div>
    );
};

export default BookingRequest;

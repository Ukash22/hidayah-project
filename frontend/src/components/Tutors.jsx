import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

/* ─── Embedded Mini Trial Form ─────────────────────────────────────── */
const TutorTrialModal = ({ tutor, onClose }) => {
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '', country: '',
        preferredDay: 'Monday', preferredTime: 'Morning', preferredTimeExact: '',
        courseInterested: tutor.subjects_to_teach?.split(',')[0]?.trim() || 'Quranic Recitation',
        preferredTutor: tutor.full_name,
        message: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus({ type: 'info', message: 'Submitting your trial request...' });
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/applications/`, {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                country: formData.country,
                course_interested: formData.courseInterested,
                preferred_tutor: formData.preferredTutor,
                preferred_day: formData.preferredDay,
                preferred_time: formData.preferredTime,
                preferred_time_exact: formData.preferredTimeExact,
                message: formData.message
            });
            setStatus({ type: 'success', message: 'Alhamdulillah! Your trial request has been submitted. Check your inbox soon!' });
        } catch {
            setStatus({ type: 'error', message: 'Something went wrong. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 30 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-primary to-primary/80 p-8 pb-6">
                    <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-sm transition-all">✕</button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-black text-white overflow-hidden">
                            {tutor.image ? (
                                <img src={tutor.image?.startsWith('http') ? tutor.image : `${import.meta.env.VITE_API_BASE_URL}${tutor.image}`} alt={tutor.full_name} className="w-full h-full object-cover" />
                            ) : tutor.full_name?.[0]}
                        </div>
                        <div>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Book a Trial Class with</p>
                            <h3 className="text-white font-black text-xl leading-tight">{tutor.full_name}</h3>
                            <p className="text-white/70 text-xs font-semibold mt-0.5">{tutor.subjects_to_teach} &bull; ₦{parseFloat(tutor.hourly_rate || 1500).toLocaleString()}/hr</p>
                        </div>
                    </div>
                </div>

                {/* Form Body */}
                <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                    {status.type === 'success' ? (
                        <div className="py-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto">✓</div>
                            <h4 className="font-black text-primary text-lg">Request Submitted!</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">{status.message}</p>
                            <button onClick={onClose} className="mt-4 bg-primary text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name *</label>
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="e.g. Ahmad" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Name</label>
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="e.g. Ali" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email *</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@email.com" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country</label>
                                    <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="e.g. Nigeria" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Focus Course</label>
                                <select name="courseInterested" value={formData.courseInterested} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 text-sm appearance-none">
                                    {(tutor.subjects_to_teach || 'Quranic Recitation').split(',').map(s => (
                                        <option key={s.trim()} value={s.trim()}>{s.trim()}</option>
                                    ))}
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day</label>
                                    <select name="preferredDay" value={formData.preferredDay} onChange={handleChange} className="w-full px-3 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 text-xs appearance-none text-center">
                                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slot</label>
                                    <select name="preferredTime" value={formData.preferredTime} onChange={handleChange} className="w-full px-3 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 text-xs appearance-none text-center">
                                        <option>Morning</option>
                                        <option>Afternoon</option>
                                        <option>Evening</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">Exact Time</label>
                                    <input type="text" name="preferredTimeExact" value={formData.preferredTimeExact} onChange={handleChange} placeholder="e.g. 4 PM" className="w-full px-3 py-3 rounded-xl border-2 border-primary/10 bg-primary/5 focus:bg-white focus:border-primary outline-none transition-all font-black text-primary text-xs text-center placeholder:text-primary/30" />
                                </div>
                            </div>

                            {status.message && status.type !== 'success' && (
                                <p className={`text-xs font-bold text-center py-2 ${status.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>{status.message}</p>
                            )}

                            <button type="submit" disabled={submitting} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                {submitting ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Submitting...</>
                                ) : 'Book Free Trial Class →'}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Helpers ──────────────────────────────────────────────────────── */
const to12hr = (time) => {
    if (!time) return time;
    const [hStr, mStr] = time.slice(0, 5).split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${period}`;
};

/* ─── Main Tutors Section ───────────────────────────────────────────── */
const Tutors = () => {
    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [trialTutor, setTrialTutor] = useState(null);   // opens trial modal
    const [liveLink, setLiveLink] = useState(null);        // stores live class link for confirm

    useEffect(() => {
        const fetchTutors = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/public/`);
                setTutors(res.data);
            } catch (err) {
                console.error("Failed to fetch tutors", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTutors();
    }, []);

    const staticTutors = [
        {
            full_name: "Sheikh Ahmad Al-Farsi",
            qualification: "Ijazah in 10 Qira'at, Al-Azhar University",
            subjects_to_teach: "Quranic Recitation, Tajweed",
            experience_years: "15",
            languages: "Arabic, English, Urdu",
            hourly_rate: "1500",
            availability_hours: "Monday: 08:00 - 12:00, Thursday: 14:00 - 18:00",
            image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
        },
        {
            full_name: "Ustadha Fatima Aziz",
            qualification: "Masters in Islamic Studies, IIUI",
            subjects_to_teach: "Arabic Foundation, Islamic Studies",
            experience_years: "8",
            languages: "English, Arabic, French",
            hourly_rate: "1500",
            availability_hours: "Saturday: 09:00 - 15:00, Sunday: 09:00 - 15:00",
            image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
        }
    ];

    const displayTutors = tutors.length > 0 ? tutors : staticTutors;

    return (
        <section id="tutors" className="py-20 bg-slate-50 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

            <div className="container relative z-10">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <span className="text-secondary font-bold tracking-wider uppercase text-sm mb-2 block">World-Class Faculty</span>
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-primary mb-6">Meet Our Expert Tutors</h2>
                    <p className="text-slate-500 text-lg">
                        Our tutors are certified from prestigious institutions, dedicated to providing high-standard Islamic and Western education.
                    </p>
                </div>

                {loading && tutors.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-8">
                        {displayTutors.map((tutor, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-100 group relative flex flex-col"
                            >
                                {/* Avatar with media overlay */}
                                <div className="relative mb-6 mx-auto w-32 h-32">
                                    <div className="absolute inset-0 bg-secondary/20 rounded-full scale-110 group-hover:scale-125 transition-transform duration-500"></div>
                                    <img
                                        src={tutor.image?.startsWith('http') ? tutor.image : `${import.meta.env.VITE_API_BASE_URL}${tutor.image}`}
                                        alt={tutor.full_name}
                                        className="w-full h-full rounded-full object-cover border-4 border-white shadow-md relative z-10"
                                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=1a5276&color=fff&size=128`; }}
                                    />

                                    {/* Play/Audio Buttons Overlay */}
                                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="flex gap-2">
                                            {(tutor.video_url) && (
                                                <button
                                                    onClick={() => setSelectedMedia({ type: 'video', videoType: tutor.video_type, url: tutor.video_url, name: tutor.full_name })}
                                                    className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-white"
                                                    title="Watch Intro"
                                                >▶</button>
                                            )}
                                            {(tutor.short_recitation || tutor.recitation_url) && (
                                                <button
                                                    onClick={() => {
                                                        const url = tutor.recitation_url || tutor.short_recitation;
                                                        const isVideo = url && /\.(mp4|mov|avi|webm)$/i.test(url);
                                                        setSelectedMedia({ 
                                                            type: isVideo ? 'video' : 'audio', 
                                                            url: url, 
                                                            name: tutor.full_name,
                                                            isRecitation: true
                                                        });
                                                    }}
                                                    className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-white"
                                                    title="Listen to Recitation"
                                                >🎙️</button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Name & Subject */}
                                <div className="text-center mb-5">
                                    <h3 className="text-2xl font-bold text-primary mb-1">{tutor.full_name}</h3>
                                    <p className="text-secondary font-medium text-sm">{tutor.subjects_to_teach || tutor.qualification}</p>
                                </div>

                                {/* Stats */}
                                <div className="space-y-2.5 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl mb-5 flex-1">
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="font-semibold text-slate-400">Experience</span>
                                        <span className="font-bold text-primary">{tutor.experience_years} Years</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="font-semibold text-slate-400">Languages</span>
                                        <span className="font-bold text-primary text-right w-1/2">{tutor.languages}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="font-semibold text-slate-400">Rate</span>
                                        <span className="font-bold text-secondary">₦{parseFloat(tutor.hourly_rate || 1500).toLocaleString()}/hr</span>
                                    </div>
                                    {(tutor.availabilities && tutor.availabilities.length > 0) || tutor.availability_hours ? (
                                        <div className="flex justify-between pt-1 mt-1">
                                            <span className="font-semibold text-slate-400 mt-0.5">Availability</span>
                                            <div className="flex flex-col items-end gap-1">
                                                {tutor.availabilities && tutor.availabilities.length > 0 ? (
                                                    tutor.availabilities.map((slot, i) => (
                                                        <span key={i} className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                                            {slot.day}: {to12hr(slot.start_time)} - {to12hr(slot.end_time)}
                                                        </span>
                                                    ))
                                                ) : (
                                                    tutor.availability_hours.split(',').map((h, i) => {
                                                        const match = h.trim().match(/^(.*?):\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
                                                        const label = match
                                                            ? `${match[1]}: ${to12hr(match[2])} - ${to12hr(match[3])}`
                                                            : h.trim();
                                                        return (
                                                            <span key={i} className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                                                {label}
                                                            </span>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    {/* Book Trial */}
                                    <button
                                        onClick={() => setTrialTutor(tutor)}
                                        className="bg-primary text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 hover:shadow-primary/30 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <span>📋</span> Book Trial
                                    </button>

                                    {/* Register as Student Button */}
                                    <a
                                        href={`/register?tutor_id=${tutor.id}&tutor_name=${encodeURIComponent(tutor.full_name)}`}
                                        className="bg-emerald-600 text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <span>✍️</span> Register as Student
                                    </a>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Trial Form Modal */}
            <AnimatePresence>
                {trialTutor && (
                    <TutorTrialModal tutor={trialTutor} onClose={() => setTrialTutor(null)} />
                )}
            </AnimatePresence>

            {/* Premium Media Modal */}
            <AnimatePresence>
                {selectedMedia && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
                        onClick={() => setSelectedMedia(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className={`bg-white rounded-[3rem] overflow-hidden max-w-4xl w-full relative shadow-2xl ${selectedMedia.type === 'audio' ? 'max-w-md p-12 text-center' : 'aspect-video'}`}
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedMedia(null)}
                                className={`absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center z-50 transition-all ${selectedMedia.type === 'audio' ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-white/10 hover:bg-white/40 text-white backdrop-blur-md border border-white/20'}`}
                            >✕</button>

                            {selectedMedia.type === 'video' ? (
                                <div className="w-full h-full relative bg-black">
                                    {selectedMedia.videoType === 'youtube' ? (
                                        // YouTube Embed
                                        <iframe
                                            src={`https://www.youtube.com/embed/${
                                                selectedMedia.url.includes('youtu.be/')
                                                    ? selectedMedia.url.split('youtu.be/')[1]?.split('?')[0]
                                                    : new URL(selectedMedia.url).searchParams.get('v')
                                            }?autoplay=1&rel=0`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="w-full h-full"
                                            title={selectedMedia.name}
                                        />
                                    ) : (
                                        // Direct file video
                                        <video
                                            src={selectedMedia.url?.startsWith('http') ? selectedMedia.url : `${import.meta.env.VITE_API_BASE_URL}${selectedMedia.url}`}
                                            controls
                                            className="w-full h-full object-contain"
                                        />
                                    )}
                                    <div className="absolute bottom-10 left-10 text-white z-10 pointer-events-none text-left">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-2">
                                            {selectedMedia.isRecitation ? 'Quranic Recitation' : 'Introduction'}
                                        </p>
                                        <h4 className="text-3xl font-display font-black uppercase">{selectedMedia.name}</h4>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-4xl mb-8 border border-primary/5 animate-pulse">🎙️</div>
                                    <span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-3 block">Voice Sample</span>
                                    <h3 className="text-2xl font-display font-black text-primary mb-2 uppercase">{selectedMedia.name}</h3>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10 italic">Quranic Recitation Performance</p>
                                    <div className="w-full bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                                        <audio src={selectedMedia.url?.startsWith('http') ? selectedMedia.url : `${import.meta.env.VITE_API_BASE_URL}${selectedMedia.url}`} controls className="w-full" />
                                    </div>
                                    <button
                                        onClick={() => { setSelectedMedia(null); setTrialTutor(displayTutors.find(t => t.full_name === selectedMedia.name)); }}
                                        className="mt-12 w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Book a Trial with this Tutor →
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default Tutors;

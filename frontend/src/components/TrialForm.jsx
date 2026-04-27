import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TrialForm = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        country: '',
        preferredDay: 'Monday',
        preferredTime: 'Morning',
        preferredTimeExact: '',
        courseInterested: 'Quranic Recitation',
        preferredTutor: '',
        message: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [availableTutors, setAvailableTutors] = useState([]);
    const [loadingTutors, setLoadingTutors] = useState(false);

    useEffect(() => {
        const fetchTutors = async () => {
            setLoadingTutors(true);
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tutors/by_subject/?subject=${encodeURIComponent(formData.courseInterested)}`);
                if (Array.isArray(res.data)) {
                    setAvailableTutors(res.data);
                } else {
                    setAvailableTutors([]);
                }
            } catch (err) {
                console.error("Failed to fetch tutors", err);
                setAvailableTutors([]);
            } finally {
                setLoadingTutors(false);
            }
        };
        fetchTutors();
    }, [formData.courseInterested]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: 'info', message: '🚀 Launching your application...' });

        try {
            // API call to Django backend
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

            setStatus({ type: 'success', message: '✨ Alhamdulillah! Your application is submitted. Check your inbox soon!' });
            setFormData({
                firstName: '', lastName: '', email: '', phone: '', country: '',
                preferredDay: 'Monday', preferredTime: 'Morning', preferredTimeExact: '',
                courseInterested: 'Quranic Recitation', preferredTutor: '', message: ''
            });
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: '❌ Ouch! Something went wrong. Please try again.' });
        }
    };

    return (
        <section id="trial-form" className="bg-slate-50 relative overflow-hidden py-24">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-primary"></div>

            <div className="container px-4">
                <div className="grid lg:grid-cols-5 gap-12 items-center">
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <span className="text-secondary font-black tracking-widest uppercase text-xs mb-3 block">Join our Global Community</span>
                            <h2 className="text-5xl font-display text-primary leading-tight mb-6">Start Your Journey Today</h2>
                            <p className="text-slate-500 text-lg leading-relaxed">
                                Fill out our <span className="text-primary font-bold">Premium Trial Class</span> form.
                                We'll match you with a world-class tutor based on your availability and goals.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { title: 'Visitor-First Flow', desc: 'No complex registration needed. Start now.' },
                                { title: 'Smart Matching', desc: 'Tutors assigned based on your exact time slots.' },
                                { title: 'Live Learning', desc: 'Experience the magic of interactive virtual classrooms.' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/20 transition-all">
                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-lg">0{i + 1}</div>
                                    <div>
                                        <h4 className="font-bold text-primary text-sm">{item.title}</h4>
                                        <p className="text-xs text-slate-400">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>

                            <h3 className="text-2xl font-bold text-primary mb-1 text-center">Trial Session Request</h3>
                            <p className="text-slate-400 text-sm mb-10 text-center">takes less than 2 minutes to complete</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name *</label>
                                        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="John" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                                        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Email *</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@email.com" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 font-mono text-xs" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1..." className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Country</label>
                                        <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="Global" className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Focus Course</label>
                                        <select name="courseInterested" value={formData.courseInterested} onChange={handleChange} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer">
                                            <optgroup label="── Islamic Education ──">
                                                <option>Quranic Recitation</option>
                                                <option>Arabic Foundation</option>
                                                <option>Islamic Studies</option>
                                                <option>Hifz Program</option>
                                                <option>Tajweed</option>
                                                <option>Islamic Jurisprudence (Fiqh)</option>
                                                <option>Hadith Studies</option>
                                                <option>Tafsir</option>
                                                <option>Islamic History</option>
                                            </optgroup>
                                            <optgroup label="── Western Education ──">
                                                <option>Mathematics</option>
                                                <option>English Language</option>
                                                <option>Basic Science</option>
                                                <option>Biology</option>
                                                <option>Chemistry</option>
                                                <option>Physics</option>
                                                <option>Further Mathematics</option>
                                                <option>Economics</option>
                                                <option>Government</option>
                                                <option>Literature in English</option>
                                                <option>Geography</option>
                                                <option>Agricultural Science</option>
                                                <option>Computer Science</option>
                                                <option>Civic Education</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                        <span>Preferred Tutor</span>
                                        {loadingTutors && <span className="text-primary italic normal-case text-[9px] animate-pulse">Loading tutors...</span>}
                                    </label>
                                    <select name="preferredTutor" value={formData.preferredTutor} onChange={handleChange} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer">
                                        <option value="">Any Available Tutor (₦1,500/hr avg)</option>
                                        {availableTutors.map(tutor => (
                                            <option key={tutor.id} value={tutor.full_name}>
                                                {tutor.full_name} (₦{parseFloat(tutor.hourly_rate).toLocaleString()}/hr) • {tutor.experience_years} Yrs Exp
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {formData.preferredTutor && (
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex justify-between items-center animate-fade-in">
                                        <div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Premium Session Estimate</p>
                                            <h4 className="text-lg font-bold text-primary">
                                                ₦{parseFloat(availableTutors.find(t => t.full_name === formData.preferredTutor)?.hourly_rate || 0).toLocaleString()}
                                                <span className="text-xs font-normal text-slate-400"> / per hour session</span>
                                            </h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-block px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase">Special Rate</span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-6 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Pref. Day</label>
                                        <select name="preferredDay" value={formData.preferredDay} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 transition-all font-bold text-slate-700 text-xs text-center appearance-none">
                                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Slot</label>
                                        <select name="preferredTime" value={formData.preferredTime} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 transition-all font-bold text-slate-700 text-xs text-center appearance-none">
                                            <option>Morning</option>
                                            <option>Afternoon</option>
                                            <option>Evening</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 italic text-primary">Exact Time</label>
                                        <input
                                            type="text"
                                            name="preferredTimeExact"
                                            value={formData.preferredTimeExact}
                                            onChange={handleChange}
                                            placeholder="e.g. 4 PM"
                                            className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-primary/5 focus:bg-white focus:border-primary outline-none transition-all font-black text-primary text-xs text-center placeholder:text-primary/30"
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="w-full group bg-primary hover:bg-primary-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.25em] text-sm shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] transition-all active:scale-95 flex items-center justify-center gap-3">
                                    🚀 Submit Application <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
                                </button>

                                {status.message && (
                                    <div className={`mt-6 p-4 rounded-2xl text-center text-xs font-bold animate-in fade-in slide-in-from-bottom-2 ${status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                        {status.message}
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TrialForm;

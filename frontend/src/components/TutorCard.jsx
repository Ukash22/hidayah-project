import { useState, lazy, Suspense, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star as IconStar, ShieldCheck as IconShieldCheck, Calendar as IconCalendar,
    Play as IconPlay, ChevronDown as IconChevronDown, ChevronUp as IconChevronUp,
    X as IconX,
} from 'lucide-react';

const MediaModal = lazy(() => import('./MediaModal'));

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function addHoursToTime(timeStr, hours) {
    if (!timeStr || hours == null) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + (m || 0) + Math.round(hours * 60);
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

function getImageSrc(tutor) {
    const img = tutor.image || tutor.image_url || tutor.profile_pic;
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `${import.meta.env.VITE_API_BASE_URL}${img}`;
}

function fmt12h(t) {
    if (!t) return '';
    let [h, m] = t.split(':');
    h = parseInt(h);
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${(m || '00').slice(0, 2)} ${ampm}`;
}

const TutorCard = memo(function TutorCard({
    tutor, bookingData, requesting,
    onUpdateField, onAddSlot, onRemoveSlot, onUpdateSlot, onRequestBooking,
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mediaModal, setMediaModal] = useState(null);

    const imgSrc = getImageSrc(tutor);
    const hasVideo = !!(tutor.video_url || tutor.intro_video_url);
    const hasAudio = !!(tutor.recitation_url || tutor.short_recitation);

    return (
        <motion.div
            whileHover={{ y: -6 }}
            className="bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col hover:bg-white/[0.08] transition-all group"
        >
            {/* Hero */}
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
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-transparent" />

                <div className="absolute top-4 right-4 flex gap-2">
                    {hasVideo && (
                        <button
                            onClick={() => setMediaModal({ type: 'video', videoType: tutor.video_type, url: tutor.video_url || tutor.intro_video_url, name: tutor.full_name })}
                            className="w-10 h-10 bg-black/60 hover:bg-emerald-600 border border-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md shadow-lg hover:scale-110"
                            title="Watch Intro Video"
                        >
                            <IconPlay size={14} fill="currentColor" />
                        </button>
                    )}
                    {hasAudio && (
                        <button
                            onClick={() => {
                                const url = tutor.recitation_url || tutor.short_recitation;
                                const isVideo = url && /\.(mp4|mov|avi|webm)$/i.test(url);
                                setMediaModal({ type: isVideo ? 'video' : 'audio', url, name: tutor.full_name });
                            }}
                            className="w-10 h-10 bg-black/60 hover:bg-amber-500 border border-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md shadow-lg hover:scale-110"
                            title="Listen to Recitation"
                        >
                            🎙️
                        </button>
                    )}
                </div>

                <div className="absolute bottom-4 left-5 right-5">
                    <h3 className="text-xl font-bold text-white leading-tight">{tutor.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-amber-400 text-xs font-black">
                            <IconStar size={10} fill="currentColor" /> 4.9
                            <span className="text-slate-500 font-normal">(24)</span>
                        </div>
                        <span className="text-emerald-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                            <IconShieldCheck size={10} /> Verified
                        </span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-7 flex flex-col flex-1">
                <div className="flex flex-wrap gap-1.5 mb-5">
                    {tutor.subjects_to_teach?.split(',').map(s => (
                        <span key={s} className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400">{s.trim()}</span>
                    ))}
                </div>

                <p className="text-sm text-slate-500 leading-relaxed mb-5 line-clamp-2">{tutor.bio || 'No bio provided.'}</p>

                <div className="flex justify-between items-start mb-5">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Hourly Rate</p>
                        <p className="text-2xl font-display font-black text-white">₦{tutor.hourly_rate?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Available</p>
                        <div className="flex flex-col gap-1 items-end">
                            {tutor.availabilities && tutor.availabilities.length > 0
                                ? tutor.availabilities.slice(0, 2).map((av, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                        <IconCalendar size={10} className="text-emerald-500" />
                                        <span className="text-[9px] font-black text-emerald-400 uppercase">
                                            {av.day.slice(0, 3)}: {fmt12h(av.start_time)} - {fmt12h(av.end_time)}
                                        </span>
                                    </div>
                                ))
                                : tutor.availability_hours
                                    ? tutor.availability_hours.split(',').slice(0, 2).map((h, i) => (
                                        <span key={i} className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                                            {h.trim()}
                                        </span>
                                    ))
                                    : <span className="text-[9px] text-slate-600">Not set</span>
                            }
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsExpanded(v => !v)}
                    className="w-full py-3.5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:border-emerald-500/40 hover:text-emerald-400 transition-all flex items-center justify-center gap-2 mb-4"
                >
                    {isExpanded ? <><IconChevronUp size={14} /> Hide Booking Form</> : <><IconChevronDown size={14} /> Book This Tutor</>}
                </button>

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
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">Academic Program</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                        onChange={e => onUpdateField(tutor.id, 'subject', e.target.value)}
                                        value={bookingData.subject}
                                    >
                                        <option value="" className="bg-slate-900">Select Subject</option>
                                        {tutor.subjects_to_teach?.split(',').map(s => (
                                            <option key={s} value={s.trim()} className="bg-slate-900">{s.trim()}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3 relative z-10">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">Learning Level</label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                            onChange={e => onUpdateField(tutor.id, 'learning_level', e.target.value)}
                                            value={bookingData.learning_level}
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
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">Class Structure</label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                            onChange={e => onUpdateField(tutor.id, 'class_structure', e.target.value)}
                                            value={bookingData.class_structure}
                                        >
                                            <option value="One-on-One" className="bg-slate-900">One-on-One</option>
                                            <option value="Group" className="bg-slate-900">Group Class</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 relative z-10">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">Duration / Session</label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                            onChange={e => onUpdateField(tutor.id, 'hours_per_session', parseFloat(e.target.value))}
                                            value={bookingData.hours_per_session}
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
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">Preferred Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all"
                                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                            onChange={e => onUpdateField(tutor.id, 'preferred_start_date', e.target.value)}
                                            value={bookingData.preferred_start_date}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 relative z-10">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 block">Weekly Schedule</label>
                                        <button onClick={() => onAddSlot(tutor.id)} className="text-[10px] font-black uppercase text-emerald-500 hover:text-emerald-400 transition-colors">+ Add Day</button>
                                    </div>
                                    {bookingData.schedule.map((slot, index) => (
                                        <div key={index} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Session Slot {index + 1}</span>
                                                {bookingData.schedule.length > 1 && (
                                                    <button onClick={() => onRemoveSlot(tutor.id, index)} className="text-red-500 hover:text-red-400 transition-colors">
                                                        <IconX size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Day</label>
                                                        {slot.day && (() => {
                                                            const av = tutor.availabilities?.find(a =>
                                                                a.day.toUpperCase() === slot.day || a.day.toUpperCase().startsWith(slot.day.slice(0, 3))
                                                            );
                                                            if (!av) return null;
                                                            return (
                                                                <span className="text-[7px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                                    Tutor: {fmt12h(av.start_time)}-{fmt12h(av.end_time)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                    <select
                                                        className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-4 py-3 text-[11px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                                        value={slot.day}
                                                        onChange={e => onUpdateSlot(tutor.id, index, 'day', e.target.value)}
                                                    >
                                                        <option value="" className="bg-slate-900">Choose Day</option>
                                                        {DAYS.map(d => <option key={d} value={d.toUpperCase()} className="bg-slate-900">{d}</option>)}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-center px-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">From</label>
                                                            <span className="text-[7px] font-black text-emerald-500">
                                                                {(slot.time || '').split('-')[0] ? (() => {
                                                                    let [h, m] = (slot.time || '').split('-')[0].split(':');
                                                                    h = parseInt(h);
                                                                    return `${h % 12 || 12}:${m || '00'}${h >= 12 ? 'PM' : 'AM'}`;
                                                                })() : '--:--'}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="time"
                                                            className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-3 text-[11px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all"
                                                            value={(slot.time || '').split('-')[0] || ''}
                                                            onChange={e => {
                                                                const startTime = e.target.value;
                                                                const endTime = addHoursToTime(startTime, bookingData.hours_per_session);
                                                                onUpdateSlot(tutor.id, index, 'time', `${startTime}-${endTime}`);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-center px-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">To (Auto)</label>
                                                            <span className="text-[7px] font-black text-emerald-500">
                                                                {(slot.time || '').split('-')[1] ? (() => {
                                                                    let [h, m] = (slot.time || '').split('-')[1].split(':');
                                                                    h = parseInt(h);
                                                                    return `${h % 12 || 12}:${m || '00'}${h >= 12 ? 'PM' : 'AM'}`;
                                                                })() : '--:--'}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="time"
                                                            className="w-full bg-[#0a0c10]/50 border border-white/10 rounded-xl px-3 py-3 text-[11px] font-black text-slate-500 uppercase outline-none cursor-not-allowed"
                                                            value={(slot.time || '').split('-')[1] || ''}
                                                            readOnly
                                                            title="Automatically calculated based on duration"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {(() => {
                                    const selectedDays = bookingData.schedule.filter(s => s.day).length;
                                    const rate = parseFloat(tutor.hourly_rate || 0);
                                    const hours = parseFloat(bookingData.hours_per_session || 0);
                                    const total = rate * hours * selectedDays * 4;
                                    if (selectedDays === 0 && hours === 0) return null;
                                    return (
                                        <div className="pt-4 border-t border-white/5 text-right relative z-10">
                                            <div className="flex flex-col items-end">
                                                <p className="text-[10px] font-black uppercase text-slate-600 mb-1">Tuition Summary</p>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                                        <span className="text-[7px] font-black text-slate-500 uppercase">
                                                            ₦{rate.toLocaleString()} × {hours} hrs × {selectedDays} days × 4 wks
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-2xl font-display font-black text-white leading-none">₦{total.toLocaleString()}</p>
                                                <p className="text-[7px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Calculated Monthly Rate</p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <button
                                    onClick={() => onRequestBooking(tutor, bookingData)}
                                    disabled={requesting}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {requesting ? 'Sending...' : 'Request Class →'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {mediaModal && (
                <Suspense fallback={null}>
                    <MediaModal media={mediaModal} onClose={() => setMediaModal(null)} />
                </Suspense>
            )}
        </motion.div>
    );
});

export default TutorCard;

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function addHoursToTime(timeStr, hours) {
    if (!timeStr || hours == null) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + (m || 0) + Math.round(hours * 60);
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

function fmt12h(t) {
    if (!t) return '';
    let [h, m] = t.split(':');
    h = parseInt(h);
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${(m || '00').slice(0, 2)} ${ampm}`;
}

export default function BookingModal({
    tutor, bookingData, requesting,
    onUpdateField, onAddSlot, onRemoveSlot, onUpdateSlot, onSubmit, onClose,
}) {
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const selectedDays = bookingData.schedule.filter(s => s.day).length;
    const rate = parseFloat(tutor.hourly_rate || 0);
    const hours = parseFloat(bookingData.hours_per_session || 0);
    const monthlyTotal = rate * hours * selectedDays * 4;

    return (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-xl bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5">
                    <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{tutor.full_name}</h3>
                        <p className="text-sm text-slate-400 mt-0.5">
                            ₦{tutor.hourly_rate?.toLocaleString()}/hr
                            {tutor.subjects_to_teach && (
                                <> · {tutor.subjects_to_teach.split(',')[0]?.trim()}</>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close booking form"
                        className="w-9 h-9 flex-shrink-0 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Scrollable form body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-5">

                        {/* Academic Program */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">Academic Program</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-semibold text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                onChange={e => onUpdateField(tutor.id, 'subject', e.target.value)}
                                value={bookingData.subject}
                            >
                                <option value="" className="bg-slate-900">Select Subject</option>
                                {tutor.subjects_to_teach?.split(',').map(s => (
                                    <option key={s} value={s.trim()} className="bg-slate-900">{s.trim()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Level + Structure */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">Learning Level</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-semibold text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
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
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">Class Structure</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-semibold text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                    onChange={e => onUpdateField(tutor.id, 'class_structure', e.target.value)}
                                    value={bookingData.class_structure}
                                >
                                    <option value="One-on-One" className="bg-slate-900">One-on-One</option>
                                    <option value="Group" className="bg-slate-900">Group Class</option>
                                </select>
                            </div>
                        </div>

                        {/* Duration + Start Date */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">Duration / Session</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-semibold text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                    onChange={e => onUpdateField(tutor.id, 'hours_per_session', parseFloat(e.target.value))}
                                    value={bookingData.hours_per_session}
                                >
                                    <option value="0.5" className="bg-slate-900">30 Minutes</option>
                                    <option value="1" className="bg-slate-900">1.0 Hour</option>
                                    <option value="1.5" className="bg-slate-900">1.5 Hours</option>
                                    <option value="2" className="bg-slate-900">2.0 Hours</option>
                                    <option value="2.5" className="bg-slate-900">2.5 Hours</option>
                                    <option value="3" className="bg-slate-900">3.0 Hours</option>
                                    <option value="4" className="bg-slate-900">4.0 Hours</option>
                                    <option value="5" className="bg-slate-900">5.0 Hours</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">Preferred Start Date</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    <input
                                        type="date"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-[11px] font-semibold text-white uppercase outline-none focus:border-emerald-500 transition-all"
                                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                        onChange={e => onUpdateField(tutor.id, 'preferred_start_date', e.target.value)}
                                        value={bookingData.preferred_start_date}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Weekly Schedule */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Weekly Schedule</label>
                                <button
                                    onClick={() => onAddSlot(tutor.id)}
                                    className="text-[11px] font-semibold uppercase text-emerald-500 hover:text-emerald-400 transition-colors"
                                >
                                    + Add Day
                                </button>
                            </div>
                            {bookingData.schedule.map((slot, index) => (
                                <div key={index} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide">Slot {index + 1}</span>
                                        {bookingData.schedule.length > 1 && (
                                            <button
                                                onClick={() => onRemoveSlot(tutor.id, index)}
                                                className="text-red-500 hover:text-red-400 text-[11px] font-semibold uppercase transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Day</label>
                                                {slot.day && (() => {
                                                    const av = tutor.availabilities?.find(a =>
                                                        a.day.toUpperCase() === slot.day ||
                                                        a.day.toUpperCase().startsWith(slot.day.slice(0, 3))
                                                    );
                                                    if (!av) return null;
                                                    return (
                                                        <span className="text-[7px] font-bold text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                            {fmt12h(av.start_time)}-{fmt12h(av.end_time)}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <select
                                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none"
                                                value={slot.day}
                                                onChange={e => onUpdateSlot(tutor.id, index, 'day', e.target.value)}
                                            >
                                                <option value="" className="bg-slate-900">Choose Day</option>
                                                {DAYS.map(d => <option key={d} value={d.toUpperCase()} className="bg-slate-900">{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block px-1">From</label>
                                                <input
                                                    type="time"
                                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-[11px] font-bold text-white outline-none focus:border-emerald-500 transition-all"
                                                    value={(slot.time || '').split('-')[0] || ''}
                                                    onChange={e => {
                                                        const startTime = e.target.value;
                                                        const endTime = addHoursToTime(startTime, bookingData.hours_per_session);
                                                        onUpdateSlot(tutor.id, index, 'time', `${startTime}-${endTime}`);
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block px-1">To (auto)</label>
                                                <input
                                                    type="time"
                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-3 py-3 text-[11px] font-bold text-slate-600 outline-none cursor-not-allowed"
                                                    value={(slot.time || '').split('-')[1] || ''}
                                                    readOnly
                                                    title="Auto-calculated from duration"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tuition summary */}
                        {selectedDays > 0 && hours > 0 && (
                            <div className="pt-4 border-t border-white/5 flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase text-slate-600 mb-1">Monthly Estimate</p>
                                    <p className="text-[10px] text-slate-600">
                                        ₦{rate.toLocaleString()} × {hours}h × {selectedDays} days × 4 wks
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-white">₦{monthlyTotal.toLocaleString()}</p>
                                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">/ month</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky footer with submit */}
                <div className="p-6 border-t border-white/5">
                    <button
                        onClick={() => onSubmit(tutor, bookingData)}
                        disabled={requesting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-[0.3em] shadow-xl shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {requesting ? 'Sending Request…' : 'Request Class →'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

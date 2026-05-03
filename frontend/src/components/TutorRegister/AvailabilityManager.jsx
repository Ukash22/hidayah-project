import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const AvailabilityManager = ({ formData, addAvailabilitySlot, removeAvailabilitySlot, updateAvailabilitySlot, totalWeeklyHours, totalMonthlyHours, monthlyEarnings }) => {
    const formatTime12h = (t) => {
        if (!t) return '';
        let [h, m] = t.split(':');
        h = parseInt(h);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m || '00'} ${ampm}`;
    };

    return (
        <div className="space-y-8 bg-black/40 p-8 rounded-[3rem] border border-white/10 relative overflow-hidden backdrop-blur-3xl shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                <div>
                    <h4 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2 font-display">
                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                        Instructor Availability
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Set your standard weekly operating hours</p>
                </div>
                <button 
                    type="button"
                    onClick={addAvailabilitySlot}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all active:scale-95 group"
                    title="Add Day"
                >
                    <div className="text-2xl font-light group-hover:rotate-90 transition-transform">+</div>
                </button>
            </div>
            
            <div className="space-y-4 relative z-10">
                {formData.availabilitySlots.map((slot, index) => (
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
                                onChange={(e) => updateAvailabilitySlot(index, 'day', e.target.value)}
                            >
                                <option value="" className="bg-[#0a0c10]">Select Day</option>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                    <option key={d} value={d} className="bg-[#0a0c10]">{d}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60">From</label>
                                <span className="text-[8px] font-bold text-slate-500 uppercase">{formatTime12h(slot.startTime)}</span>
                            </div>
                            <input 
                                type="time" 
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all"
                                value={slot.startTime}
                                onChange={(e) => updateAvailabilitySlot(index, 'startTime', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 relative">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60">To</label>
                                <span className="text-[8px] font-bold text-slate-500 uppercase">{formatTime12h(slot.endTime)}</span>
                            </div>
                            <div className="flex gap-3">
                                <input 
                                    type="time" 
                                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all"
                                    value={slot.endTime}
                                    onChange={(e) => updateAvailabilitySlot(index, 'endTime', e.target.value)}
                                />
                                {formData.availabilitySlots.length > 1 && (
                                    <button 
                                        type="button"
                                        onClick={() => removeAvailabilitySlot(index)}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 pt-4 border-t border-white/5">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Weekly Commitment</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white font-display">{totalWeeklyHours.toFixed(1)}</span>
                        <span className="text-sm font-bold text-slate-500 uppercase">Hrs/Wk</span>
                    </div>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Monthly Effort</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white font-display">{totalMonthlyHours.toFixed(1)}</span>
                        <span className="text-sm font-bold text-slate-500 uppercase">Hrs/Mo</span>
                    </div>
                </div>
                <div className="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/30 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Est. Earnings</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-emerald-400">₦</span>
                        <span className="text-3xl font-black text-emerald-500 font-display">{monthlyEarnings.toLocaleString()}</span>
                        <span className="text-xs font-bold text-emerald-500 uppercase ml-1">/ Month</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvailabilityManager;

import React from 'react';
import { User, Mail, Lock } from 'lucide-react';

const AccountFields = ({ formData, handleChange }) => {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label htmlFor="tutor-username" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username *</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                        id="tutor-username"
                        type="text" 
                        name="username" 
                        value={formData.username} 
                        onChange={handleChange} 
                        required 
                        placeholder="Instructor Username" 
                        autoComplete="username"
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-emerald-500/30 transition-all font-display" 
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label htmlFor="tutor-email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address *</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                        id="tutor-email"
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        required 
                        placeholder="you@email.com" 
                        autoComplete="email"
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-emerald-500/30 transition-all font-display" 
                    />
                </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="tutor-password" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password *</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input 
                            id="tutor-password"
                            type="password" 
                            name="password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            placeholder="••••••••" 
                            autoComplete="new-password"
                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-emerald-500/30 transition-all font-display" 
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label htmlFor="tutor-confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirm *</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input 
                            id="tutor-confirmPassword"
                            type="password" 
                            name="confirmPassword" 
                            value={formData.confirmPassword} 
                            onChange={handleChange} 
                            required 
                            placeholder="••••••••" 
                            autoComplete="new-password"
                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-emerald-500/30 transition-all font-display" 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountFields;

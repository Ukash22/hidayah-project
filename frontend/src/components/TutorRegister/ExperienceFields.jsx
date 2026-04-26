import React from 'react';
import { Briefcase, Languages, DollarSign, FileText, GraduationCap } from 'lucide-react';

const ExperienceFields = ({ formData, handleChange, handleFileChange, files }) => {
    return (
        <div className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Experience (Years) *</label>
                    <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input type="number" name="experienceYears" required value={formData.experienceYears} onChange={handleChange} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-violet-500/30 transition-all font-display" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Languages Spoken *</label>
                    <div className="relative">
                        <Languages className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input type="text" name="languages" required placeholder="English, Arabic..." value={formData.languages} onChange={handleChange} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-violet-500/30 transition-all font-display" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Desired Hourly Rate (₦) *</label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input type="number" name="hourlyRate" required value={formData.hourlyRate} onChange={handleChange} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-violet-500/30 transition-all font-display" />
                    </div>
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 p-6 rounded-[2rem] bg-black/20 border border-white/5">
                <FileUploadBox
                    name="cv"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    file={files.cv}
                    icon={FileText}
                    required
                    label="CV / Resume (PDF or Doc)"
                />
                <FileUploadBox
                    name="credentials"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    file={files.credentials}
                    icon={GraduationCap}
                    label="Certificates / Credentials"
                />
            </div>
        </div>
    );
};

export default ExperienceFields;

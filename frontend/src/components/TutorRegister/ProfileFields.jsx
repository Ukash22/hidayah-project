import React from 'react';
import { Globe, Phone, MapPin, Image as ImageIcon } from 'lucide-react';
import { COUNTRIES } from '../../constants/registration';

const ProfileFields = ({ formData, handleChange, handleFileChange, files, FileUploadBox }) => {
    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="tutor-firstName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">First Name *</label>
                    <input id="tutor-firstName" type="text" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="John" autoComplete="given-name" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/30 transition-all font-display" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="tutor-lastName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Last Name *</label>
                    <input id="tutor-lastName" type="text" name="lastName" value={formData.lastName} onChange={handleChange} required placeholder="Doe" autoComplete="family-name" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/30 transition-all font-display" />
                </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label htmlFor="tutor-age" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Age *</label>
                    <input id="tutor-age" type="number" name="age" value={formData.age} onChange={handleChange} required placeholder="e.g. 28" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/30 transition-all font-display" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="tutor-gender" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Gender *</label>
                    <select id="tutor-gender" name="gender" value={formData.gender} onChange={handleChange} autoComplete="sex" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500/30 transition-all appearance-none cursor-pointer font-display">
                        <option className="bg-[#0a0c10]">Male</option>
                        <option className="bg-[#0a0c10]">Female</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label htmlFor="tutor-phone" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone *</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                        <input id="tutor-phone" type="text" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+234..." autoComplete="tel" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-9 text-white font-bold outline-none focus:border-blue-500/30 transition-all font-display" />
                    </div>
                </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="tutor-country" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Country *</label>
                    <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <select id="tutor-country" name="country" required value={formData.country} onChange={handleChange} autoComplete="country-name" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-blue-500/30 transition-all appearance-none cursor-pointer font-display">
                            <option value="" className="bg-[#0a0c10]">Select Country</option>
                            {COUNTRIES.map(group => (
                                <optgroup key={group.label} label={group.label} className="bg-[#0a0c10]">
                                    {group.options.map(country => (
                                        <option key={country} value={country} className="bg-[#0a0c10]">{country}</option>
                                    ))}
                                </optgroup>
                            ))}
                            <option value="Other" className="bg-[#0a0c10]">Other</option>
                        </select>
                    </div>
                </div>
                <FileUploadBox
                    name="image"
                    accept="image/*"
                    onChange={handleFileChange}
                    file={files.image}
                    icon={ImageIcon}
                    required
                    label="Profile Photo"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="tutor-address" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Address *</label>
                <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-slate-600" size={18} />
                    <textarea id="tutor-address" name="address" value={formData.address} onChange={handleChange} required placeholder="Street Name, House Number, City, State" autoComplete="street-address" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-blue-500/30 transition-all min-h-[80px] resize-none font-display" />
                </div>
            </div>
        </div>
    );
};

export default ProfileFields;

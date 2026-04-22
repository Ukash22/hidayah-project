import React from 'react';
import { Monitor, Network, Video, Music } from 'lucide-react';

const TechnicalFields = ({ formData, handleChange, handleFileChange, files, FileUploadBox }) => {
    return (
        <div className="space-y-8">
            <div className="mb-8 p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5">
                <label className="flex items-center space-x-4 cursor-pointer">
                    <input 
                        type="checkbox" 
                        name="hasOnlineExp" 
                        checked={formData.hasOnlineExp} 
                        onChange={handleChange} 
                        className="w-6 h-6 rounded border-white/10 bg-black/40 text-rose-500 focus:ring-rose-500" 
                    />
                    <div>
                        <span className="text-lg font-bold text-white block">I have prior online teaching experience</span>
                        <span className="text-xs text-rose-500 uppercase tracking-widest font-black">Recommended but not strictly required</span>
                    </div>
                </label>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Type of Device</label>
                    <div className="relative">
                        <Monitor className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <select name="deviceType" value={formData.deviceType} onChange={handleChange} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-rose-500/30 transition-all appearance-none cursor-pointer font-display">
                            <option value="COMPUTER" className="bg-[#0a0c10]">Computer / Laptop</option>
                            <option value="PHONE" className="bg-[#0a0c10]">Mobile Phone</option>
                            <option value="BOTH" className="bg-[#0a0c10]">Both</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Network Quality (WiFi, 4G, Fiber)</label>
                    <div className="relative">
                        <Network className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input type="text" name="networkType" placeholder="Fiber, 4G, ADSL, etc." value={formData.networkType} onChange={handleChange} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-rose-500/30 transition-all font-display" />
                    </div>
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                <FileUploadBox
                    name="introVideo"
                    accept="video/*"
                    onChange={handleFileChange}
                    file={files.introVideo}
                    icon={Video}
                    required
                    label="Intro Video Interview (MP4)"
                />
                <FileUploadBox
                    name="shortRecitation"
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                    file={files.shortRecitation}
                    icon={Music}
                    required
                    label="Short Quran Recitation (Audio/Video)"
                />
            </div>
        </div>
    );
};

export default TechnicalFields;

import React, { useRef } from 'react';
import { CheckCircle2 as IconCheckCircle2 } from 'lucide-react';

const FileUploadBox = ({ name, accept, onChange, file, icon: Icon, required, label }) => {
    const inputRef = useRef(null);
    const hasFile = !!file;
    const borderClass = hasFile
        ? 'border-emerald-500/60 bg-emerald-500/5'
        : 'border-white/15 bg-black/40';

    return (
        <div className="space-y-1.5 h-full">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 ml-1">
                {label} {required && <span className="text-red-500">* Required</span>}
            </label>
            <div
                className={`rounded-2xl border transition-all cursor-pointer h-full min-h-[90px] flex flex-col justify-center ${borderClass}`}
                onClick={() => inputRef.current?.click()}
            >
                <div className="flex items-center gap-3 px-4 py-2">
                    {Icon && <Icon size={18} className={hasFile ? 'text-emerald-500' : 'text-slate-600'} />}
                    <button
                        type="button"
                        className={`text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-xl border transition-all pointer-events-none ${
                            hasFile
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                    >
                        {hasFile ? 'Change' : 'Choose'}
                    </button>
                    {hasFile && <IconCheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
                </div>
                <div className={`px-4 pb-2 text-[10px] font-bold truncate ${
                    hasFile ? 'text-emerald-400' : 'text-slate-600'
                }`}>
                    {hasFile ? `✓ ${file.name}` : 'No file selected'}
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                name={name}
                accept={accept}
                onChange={onChange}
                className="hidden"
            />
        </div>
    );
};

export default FileUploadBox;

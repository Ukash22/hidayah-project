import React from 'react';
import { Users, BookOpen, CheckCircle2 } from 'lucide-react';
import { ISLAMIC_SUBJECTS, WESTERN_SUBJECTS } from '../../constants/registration';

const SubjectGrid = ({ formData, handleSubjectToggle }) => {
    return (
        <div className="space-y-12">
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-500 shadow-lg">
                        <Users size={16} />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/60">Islamic Education</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {ISLAMIC_SUBJECTS.map(subj => {
                        const isSelected = formData.subjects.includes(subj);
                        return (
                            <button
                                key={subj}
                                type="button"
                                onClick={() => handleSubjectToggle(subj)}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center relative overflow-hidden group ${isSelected
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/10'
                                    : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/10'
                                }`}
                            >
                                {isSelected && (
                                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center bg-emerald-500">
                                        <CheckCircle2 size={10} className="text-white" />
                                    </div>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-tight">{subj}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/20 text-blue-500 shadow-lg">
                        <BookOpen size={16} />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/60">Western Education</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {WESTERN_SUBJECTS.map(subj => {
                        const isSelected = formData.subjects.includes(subj);
                        return (
                            <button
                                key={subj}
                                type="button"
                                onClick={() => handleSubjectToggle(subj)}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center relative overflow-hidden group ${isSelected
                                    ? 'bg-blue-500/10 border-blue-500 text-blue-500 shadow-lg shadow-blue-500/10'
                                    : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/10'
                                }`}
                            >
                                {isSelected && (
                                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center bg-blue-500">
                                        <CheckCircle2 size={10} className="text-white" />
                                    </div>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-tight">{subj}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SubjectGrid;

import React from 'react';
import { X } from 'lucide-react';
import SchemeOfWorkView from './SchemeOfWorkView';

export default function SchemeOfWorkModal({ 
    isOpen, 
    onClose, 
    studentId = null, 
    batchId = null, 
    subjectId = null, 
    isTutor = false,
    title = "Scheme of Work",
    subtitle = "Syllabus tracking & completed topics"
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <div className="bg-slate-50 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200/80 relative my-8 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-20 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 p-2.5 rounded-2xl shadow-sm border border-slate-200 transition"
                >
                    <X size={20} />
                </button>

                <SchemeOfWorkView
                    studentId={studentId}
                    batchId={batchId}
                    subjectId={subjectId}
                    isTutor={isTutor}
                    title={title}
                    subtitle={subtitle}
                />
            </div>
        </div>
    );
}

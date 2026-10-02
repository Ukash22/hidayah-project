import React, { useEffect } from 'react';
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
    // Support Escape key to close modal
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fadeIn"
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 relative my-8 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-20 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-2.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition"
                    title="Close modal"
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

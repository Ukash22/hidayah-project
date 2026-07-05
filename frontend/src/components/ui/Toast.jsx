import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ICONS = {
    success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
    error:   <XCircle size={18} className="text-red-500 shrink-0" />,
    info:    <Info size={18} className="text-blue-500 shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
};

const BG = {
    success: 'bg-white dark:bg-slate-900 border-emerald-200',
    error:   'bg-white dark:bg-slate-900 border-red-200',
    info:    'bg-white dark:bg-slate-900 border-blue-200',
    warning: 'bg-white dark:bg-slate-900 border-amber-200',
};

export default function ToastStack({ toasts, onDismiss }) {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite">
            <AnimatePresence>
                {toasts.map(t => (
                    <motion.div
                        key={t.id}
                        role={t.variant === 'error' ? 'alert' : undefined}
                        initial={{ opacity: 0, x: 48, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0,  scale: 1 }}
                        exit={{   opacity: 0, x: 48, scale: 0.95 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-lg min-w-[280px] max-w-sm ${BG[t.variant]}`}
                    >
                        {ICONS[t.variant]}
                        <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{t.message}</span>
                        <button onClick={() => onDismiss(t.id)} aria-label="Dismiss notification" className="text-slate-300 hover:text-slate-500 mt-0.5">
                            <X size={15} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

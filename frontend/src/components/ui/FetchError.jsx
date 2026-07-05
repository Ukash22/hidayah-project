import { RefreshCw } from 'lucide-react';

/**
 * Inline "couldn't load data" panel for portal pages.
 * Render when a page-level fetch fails so users can distinguish
 * a network failure from a genuinely empty state.
 */
export default function FetchError({ message = "Couldn't load data. Please check your connection.", onRetry }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card p-6 md:p-10 text-center max-w-md mx-auto my-12">
            <div className="w-14 h-14 mx-auto mb-5 bg-red-50 rounded-2xl flex items-center justify-center text-2xl">⚠️</div>
            <p className="text-slate-600 font-bold text-sm mb-6">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all"
                >
                    <RefreshCw size={14} /> Retry
                </button>
            )}
        </div>
    );
}

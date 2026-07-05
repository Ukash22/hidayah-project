export function StatusBadge({ status }) {
    const map = {
        APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        RESOLVED: 'bg-blue-100 text-blue-700 border-blue-200',
        COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
        PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
        PENDING_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
        APPLIED: 'bg-amber-100 text-amber-800 border-amber-200',
        INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-800 border-purple-200',
        REJECTED: 'bg-red-100 text-red-700 border-red-200',
        UNDER_REVIEW: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        LIVE_STARTED: 'bg-red-100 text-red-800 border-red-200',
        LIVE_WAITING: 'bg-orange-100 text-orange-800 border-orange-200',
        UPCOMING: 'bg-primary-soft text-primary border-blue-100',
        ENDED: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700',
        PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        UNPAID: 'bg-red-50 text-red-600 border-red-100',
    };
    const cls = map[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700';
    return (
        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${cls}`}>
            {status?.replace(/_/g, ' ') || 'N/A'}
        </span>
    );
}

export function getLocalTime(timezone) {
    if (!timezone) return 'N/A';
    try {
        return new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
    } catch { return 'N/A'; }
}

export function getCountryFlag(country) {
    if (!country) return '🌍';
    const flags = { Nigeria: '🇳🇬', 'United States': '🇺🇸', UK: '🇬🇧', 'United Kingdom': '🇬🇧', Canada: '🇨🇦', Ghana: '🇬🇭', Kenya: '🇰🇪' };
    return flags[country] || '🌍';
}

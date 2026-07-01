import NotificationCenter from '../NotificationCenter';

export default function TopBar({ onMenuOpen, isDark, onToggleTheme }) {
    const hamBg = isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100';
    const hamIcon = isDark ? 'text-blue-400' : 'text-blue-600';
    const textColor = isDark ? 'text-slate-100' : 'text-slate-900';
    const headerBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';

    return (
        <header className={`md:hidden sticky top-0 z-50 ${headerBg} border-b px-4 py-3 flex items-center justify-between shadow-sm`}>
            <button
                onClick={onMenuOpen}
                aria-label="Open navigation menu"
                className={`p-2.5 rounded-xl ${hamBg} transition-all active:scale-90`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={hamIcon} aria-hidden="true">
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
            </button>

            <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Hidayah" className="w-8 h-8 object-contain" />
                <span className={`font-black ${textColor} tracking-tight`}>HIDAYAH</span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleTheme}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    className={`p-2 rounded-xl ${hamBg} text-lg transition-all`}
                >
                    {isDark ? '☀️' : '🌙'}
                </button>
                <NotificationCenter />
            </div>
        </header>
    );
}

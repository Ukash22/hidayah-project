import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

/**
 * DashboardLayout — Reusable layout for Tutor & Student dashboards
 * Supports white/blue (default) and dark theme via localStorage.
 */
const DashboardLayout = ({
    navItems = [],
    activeTab,
    onTabChange,
    brandColor = 'blue',
    role = 'STUDENT',
    children
}) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('hidayah_theme') === 'dark';
    });
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.setItem('hidayah_theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const t = isDark ? {
        bg: 'bg-slate-950',
        sidebar: 'bg-slate-900 border-white/5',
        mainBg: 'bg-slate-950',
        headerBg: 'bg-slate-900 border-slate-800',
        cardBg: 'bg-slate-800',
        text: 'text-slate-100',
        textMuted: 'text-slate-400',
        accent: brandColor === 'blue' ? 'bg-blue-600' : 'bg-emerald-500',
        accentText: brandColor === 'blue' ? 'text-blue-400' : 'text-emerald-400',
        navActive: brandColor === 'blue' ? 'bg-blue-600 text-white shadow-lg' : 'bg-emerald-500 text-white shadow-lg',
        navHover: brandColor === 'blue' ? 'hover:bg-blue-600/15 hover:text-blue-400 text-slate-400' : 'hover:bg-emerald-500/15 hover:text-emerald-400 text-slate-400',
        divider: 'border-white/5',
        avatar: brandColor === 'blue' ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-slate-900',
        userBg: 'bg-white/5',
        logoutHover: 'hover:bg-red-500/10 hover:text-red-400 text-slate-500',
        homeHover: 'hover:bg-white/5 hover:text-slate-300 text-slate-500',
        mobileHamBg: 'bg-slate-800 hover:bg-slate-700',
        mobileHamIcon: brandColor === 'blue' ? 'text-blue-400' : 'text-emerald-400',
        themeBtn: 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10',
    } : {
        bg: 'bg-slate-50',
        sidebar: 'bg-slate-900 border-white/5',       // sidebar stays dark for contrast
        mainBg: 'bg-gradient-to-br from-white via-blue-50/40 to-white',
        headerBg: 'bg-white border-slate-100',
        cardBg: 'bg-white',
        text: 'text-slate-900',
        textMuted: 'text-slate-500',
        accent: brandColor === 'blue' ? 'bg-blue-600' : 'bg-emerald-500',
        accentText: brandColor === 'blue' ? 'text-blue-600' : 'text-emerald-500',
        navActive: brandColor === 'blue' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
        navHover: brandColor === 'blue' ? 'hover:bg-blue-600/10 hover:text-blue-400 text-slate-400' : 'hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-400',
        divider: 'border-white/5',
        avatar: brandColor === 'blue' ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-slate-900',
        userBg: 'bg-white/5',
        logoutHover: 'hover:bg-red-500/10 hover:text-red-400 text-slate-500',
        homeHover: 'hover:bg-white/5 hover:text-slate-300 text-slate-500',
        mobileHamBg: 'bg-slate-50 hover:bg-slate-100',
        mobileHamIcon: brandColor === 'blue' ? 'text-blue-600' : 'text-emerald-600',
        themeBtn: 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10',
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const SidebarContent = () => (
        <div className="h-full flex flex-col">
            {/* Brand */}
            <div className={`p-6 border-b ${t.divider}`}>
                <Link to="/" className="flex items-center gap-3 group">
                    <div className={`w-10 h-10 ${t.accent} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <img src="/logo.png" alt="H" className="w-7 h-7 object-contain brightness-110" />
                    </div>
                    <div>
                        <p className="font-black text-white tracking-tight leading-none">HIDAYAH</p>
                        <p className={`text-[8px] font-black uppercase tracking-[0.15em] ${t.accentText} opacity-80`}>
                            {role === 'TUTOR' ? 'Tutor Portal' : role === 'ADMIN' ? 'Admin Portal' : 'Student Portal'}
                        </p>
                    </div>
                </Link>
            </div>

            {/* User Profile */}
            <div className={`px-4 py-4 border-b ${t.divider}`}>
                <div className={`flex items-center gap-3 p-3 rounded-2xl ${t.userBg}`}>
                    <div className={`w-10 h-10 ${t.avatar} rounded-xl flex items-center justify-center font-black shadow-lg flex-shrink-0 text-sm`}>
                        {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-white font-black text-sm truncate leading-none">{user?.first_name} {user?.last_name}</p>
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5 truncate">{user?.username}</p>
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 hide-scrollbar">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => { onTabChange(item.id); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${activeTab === item.id ? t.navActive : t.navHover}`}
                    >
                        <span className="text-lg leading-none">{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge > 0 && (
                            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[9px] font-black flex items-center justify-center ${activeTab === item.id ? 'bg-white/20 text-white' : `${t.accent}/20 ${t.accentText}`}`}>
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Footer */}
            <div className={`p-4 border-t ${t.divider} space-y-2`}>
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${t.themeBtn}`}
                >
                    <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
                    <span className="flex-1 text-left">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    <div className={`w-10 h-5 rounded-full transition-all relative ${isDark ? 'bg-blue-600' : 'bg-slate-600'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isDark ? 'left-5' : 'left-0.5'}`} />
                    </div>
                </button>

                <div className="flex items-center justify-between px-2 py-1">
                    <NotificationCenter />
                    <span className="text-slate-600 text-[9px] font-black uppercase tracking-widest">Alerts</span>
                </div>
                <Link
                    to="/"
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${t.homeHover}`}
                >
                    <span>🏠</span><span>Home Page</span>
                </Link>
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${t.logoutHover}`}
                >
                    <span>🚪</span><span>Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen ${t.mainBg} flex font-sans transition-colors duration-300`}>
            {/* Desktop Sidebar */}
            <aside className={`hidden md:flex w-64 ${t.sidebar} flex-col fixed h-full z-40 shadow-[20px_0_60px_rgba(0,0,0,0.15)]`}>
                <SidebarContent />
            </aside>

            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] md:hidden transition-all duration-300 ${sidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Mobile Drawer */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-slate-900 z-[201] shadow-[20px_0_60px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <SidebarContent />
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                {/* Mobile Top Bar */}
                <header className={`md:hidden sticky top-0 z-50 ${t.headerBg} border-b px-4 py-3 flex items-center justify-between shadow-sm`}>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className={`p-2.5 rounded-xl ${t.mobileHamBg} transition-all active:scale-90`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={t.mobileHamIcon}>
                            <line x1="4" y1="12" x2="20" y2="12" />
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="4" y1="18" x2="20" y2="18" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Hidayah" className="w-8 h-8 object-contain" />
                        <span className={`font-black ${t.text} tracking-tight`}>HIDAYAH</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={toggleTheme} className={`p-2 rounded-xl ${t.mobileHamBg} text-lg transition-all`}>
                            {isDark ? '☀️' : '🌙'}
                        </button>
                        <NotificationCenter />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-auto">
                    <div className={`${t.text} transition-colors duration-300`}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

/**
 * DashboardLayout — Reusable layout for Tutor & Student dashboards
 * Props:
 *  - navItems: [{ id, icon, label, badge? }]
 *  - activeTab: string
 *  - onTabChange: (id) => void
 *  - brandColor: 'blue' | 'emerald' (optional, defaults to 'blue')
 *  - role: 'TUTOR' | 'STUDENT'
 *  - children: React node (main content)
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
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const colorMap = {
        blue: {
            accent: 'bg-blue-600',
            text: 'text-blue-600',
            light: 'bg-blue-600/10',
            border: 'border-blue-600/20',
            active: 'bg-blue-600 text-white shadow-lg shadow-blue-600/25',
            hover: 'hover:bg-blue-600/10 hover:text-blue-600',
            glow: 'shadow-blue-500/20',
        },
        emerald: {
            accent: 'bg-emerald-500',
            text: 'text-emerald-500',
            light: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            active: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
            hover: 'hover:bg-emerald-500/10 hover:text-emerald-500',
            glow: 'shadow-emerald-500/20',
        },
    };

    const c = colorMap[brandColor] || colorMap.blue;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const SidebarContent = () => (
        <div className="h-full flex flex-col">
            {/* Brand Header */}
            <div className="p-6 border-b border-white/5">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className={`w-10 h-10 ${c.accent} rounded-xl flex items-center justify-center shadow-lg ${c.glow} group-hover:scale-110 transition-transform`}>
                        <img src="/logo.png" alt="H" className="w-7 h-7 object-contain brightness-110" />
                    </div>
                    <div>
                        <p className="font-black text-white tracking-tight leading-none">HIDAYAH</p>
                        <p className={`text-[8px] font-black uppercase tracking-[0.15em] ${c.text} opacity-80`}>
                            {role === 'TUTOR' ? 'Tutor Portal' : 'Student Portal'}
                        </p>
                    </div>
                </Link>
            </div>

            {/* User Profile */}
            <div className="px-4 py-5 border-b border-white/5">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
                    <div className={`w-10 h-10 ${c.accent} rounded-xl flex items-center justify-center text-white font-black shadow-lg ${c.glow} flex-shrink-0`}>
                        {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-white font-black text-sm truncate leading-none">{user?.first_name} {user?.last_name}</p>
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5 truncate">{user?.username}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 hide-scrollbar">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => { onTabChange(item.id); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all group ${
                            activeTab === item.id
                                ? c.active
                                : `text-slate-400 ${c.hover}`
                        }`}
                    >
                        <span className="text-lg leading-none">{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge > 0 && (
                            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[9px] font-black flex items-center justify-center ${activeTab === item.id ? 'bg-white/20 text-white' : `${c.light} ${c.text}`}`}>
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between px-2 py-1">
                    <NotificationCenter />
                    <span className="text-slate-600 text-[9px] font-black uppercase tracking-widest">Alerts</span>
                </div>
                <Link
                    to="/"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all"
                >
                    <span>🏠</span> <span>Home Page</span>
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                    <span>🚪</span> <span>Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* ── Desktop Sidebar (always visible on md+) ── */}
            <aside className="hidden md:flex w-64 bg-slate-900 flex-col fixed h-full z-40 shadow-[20px_0_60px_rgba(0,0,0,0.15)]">
                <SidebarContent />
            </aside>

            {/* ── Mobile Overlay ── */}
            <div
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] md:hidden transition-all duration-300 ${sidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* ── Mobile Drawer ── */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-slate-900 z-[201] shadow-[20px_0_60px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <SidebarContent />
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                {/* Mobile Top Bar */}
                <header className="md:hidden sticky top-0 z-50 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all active:scale-90"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={c.text}>
                            <line x1="4" y1="12" x2="20" y2="12" />
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="4" y1="18" x2="20" y2="18" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Hidayah" className="w-8 h-8 object-contain" />
                        <span className="font-black text-slate-900 tracking-tight">HIDAYAH</span>
                    </div>
                    <NotificationCenter />
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;

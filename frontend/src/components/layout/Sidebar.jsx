import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationCenter from '../NotificationCenter';
import SidebarGroup from './SidebarGroup';

const PORTAL_LABEL = {
    ADMIN: 'Admin Portal',
    TUTOR: 'Tutor Portal',
    STUDENT: 'Student Portal',
    PARENT: 'Parent Portal',
};

export default function Sidebar({ navGroups, role, isDark, onToggleTheme, onLogout }) {
    const { user } = useAuth();

    return (
        <div className="h-full flex flex-col">
            {/* Brand */}
            <div className="p-6 border-b border-white/5">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <img src="/logo.png" alt="H" className="w-7 h-7 object-contain brightness-110" />
                    </div>
                    <div>
                        <p className="font-black text-white tracking-tight leading-none">HIDAYAH</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-400 opacity-80">
                            {PORTAL_LABEL[role] || 'Portal'}
                        </p>
                    </div>
                </Link>
            </div>

            {/* User */}
            <div className="px-4 py-4 border-b border-white/5">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg flex-shrink-0 text-sm">
                        {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-white font-semibold text-sm truncate leading-none">
                            {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5 truncate">
                            {user?.username}
                        </p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 hide-scrollbar">
                {navGroups.map((group, i) => (
                    <SidebarGroup key={group.label || i} {...group} />
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 space-y-2">
                <button
                    onClick={onToggleTheme}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all bg-white/5 hover:bg-white/10 text-slate-500 border border-white/10"
                >
                    <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
                    <span className="flex-1 text-left">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    <div className={`w-10 h-5 rounded-full transition-all relative ${isDark ? 'bg-blue-600' : 'bg-slate-600'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isDark ? 'left-5' : 'left-0.5'}`} />
                    </div>
                </button>

                <div className="flex items-center justify-between px-2 py-1">
                    <NotificationCenter />
                    <span className="text-slate-600 text-[9px] font-semibold uppercase tracking-widest">Alerts</span>
                </div>

                <Link
                    to="/"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all hover:bg-white/5 hover:text-slate-300 text-slate-500"
                >
                    <span>🏠</span><span>Home Page</span>
                </Link>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all hover:bg-red-500/10 hover:text-red-400 text-slate-500"
                >
                    <span>🚪</span><span>Logout</span>
                </button>
            </div>
        </div>
    );
}

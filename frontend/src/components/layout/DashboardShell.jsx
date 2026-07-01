import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function DashboardShell({ navGroups, role }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isDark, setIsDark] = useState(() => localStorage.getItem('hidayah_theme') === 'dark');
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.setItem('hidayah_theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = () => setIsDark(p => !p);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const mainBg = isDark
        ? 'bg-slate-950'
        : 'bg-gradient-to-br from-white via-blue-50/40 to-white';
    const textColor = isDark ? 'text-slate-100' : 'text-slate-900';

    return (
        <div className={`min-h-screen ${mainBg} flex font-sans transition-colors duration-300`}>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 bg-slate-900 flex-col fixed h-full z-40 shadow-[20px_0_60px_rgba(0,0,0,0.15)]">
                <Sidebar
                    navGroups={navGroups}
                    role={role}
                    isDark={isDark}
                    onToggleTheme={toggleTheme}
                    onLogout={handleLogout}
                />
            </aside>

            {/* Mobile overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] md:hidden transition-all duration-300 ${sidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Mobile sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-slate-900 z-[201] shadow-[20px_0_60px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <Sidebar
                    navGroups={navGroups}
                    role={role}
                    isDark={isDark}
                    onToggleTheme={toggleTheme}
                    onLogout={() => { setSidebarOpen(false); handleLogout(); }}
                />
            </aside>

            {/* Main */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                <TopBar
                    onMenuOpen={() => setSidebarOpen(true)}
                    isDark={isDark}
                    onToggleTheme={toggleTheme}
                />
                <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-auto">
                    <div className={`${textColor} transition-colors duration-300`}>
                        <Outlet context={{ isDark }} />
                    </div>
                </main>
            </div>
        </div>
    );
}

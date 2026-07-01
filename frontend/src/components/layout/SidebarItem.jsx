import { NavLink } from 'react-router-dom';

export default function SidebarItem({ to, icon, label, badge, end = false }) {
    return (
        <NavLink to={to} end={end} className="block">
            {({ isActive }) => (
                <span className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'hover:bg-blue-600/10 hover:text-blue-400 text-slate-400'
                }`}>
                    <span className="text-lg leading-none">{icon}</span>
                    <span className="flex-1 text-left">{label}</span>
                    {badge > 0 && (
                        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[9px] font-black flex items-center justify-center ${
                            isActive ? 'bg-white/20 text-white' : 'bg-blue-600/20 text-blue-400'
                        }`}>
                            {badge}
                        </span>
                    )}
                </span>
            )}
        </NavLink>
    );
}

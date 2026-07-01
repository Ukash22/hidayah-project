import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import SidebarItem from './SidebarItem';

export default function SidebarGroup({ label, items, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            {label && (
                <button
                    onClick={() => setOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2 mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-slate-400 transition-colors"
                >
                    <span>{label}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
                </button>
            )}
            {open && (
                <div className="space-y-0.5">
                    {items.map(item => <SidebarItem key={item.to} {...item} />)}
                </div>
            )}
        </div>
    );
}

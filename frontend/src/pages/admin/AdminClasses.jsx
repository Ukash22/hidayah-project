import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { PageHeader } from '../../components/layout';
import { StatusBadge, getCountryFlag, getLocalTime } from './adminHelpers';

export default function AdminClasses() {
    const navigate = useNavigate();
    const [allClasses, setAllClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('regular');

    const fetchClasses = useCallback(async () => {
        try {
            const res = await api.get('/api/classes/admin/unified-list/');
            setAllClasses(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Classes fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchClasses(); }, [fetchClasses]);

    const regularClasses = allClasses.filter(c => c.type !== 'TRIAL');
    const trialClasses = allClasses.filter(c => c.type === 'TRIAL');
    const liveClasses = (view === 'regular' ? regularClasses : trialClasses).filter(c => c.is_live);
    const displayClasses = view === 'regular' ? regularClasses : trialClasses;

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Classes — Hidayah Admin</title>
            <PageHeader title="Academic Schedule" description="Platform-wide class management and live session monitoring." />

            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mb-6 gap-1">
                <button
                    onClick={() => setView('regular')}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'regular' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Regular Classes ({regularClasses.length})
                </button>
                <button
                    onClick={() => setView('trials')}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'trials' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Trial Sessions ({trialClasses.length})
                </button>
            </div>

            {liveClasses.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-8 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                        </div>
                        <h3 className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em]">Live Session Monitor ({liveClasses.length})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {liveClasses.map(liveCls => (
                            <div key={liveCls.id} className="bg-white p-5 rounded-2xl border border-red-500/10 flex items-center justify-between group hover:shadow-xl transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-2xl">📹</div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{liveCls.student_name}</p>
                                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Tr. {liveCls.tutor_name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`/live/${liveCls.db_id || liveCls.id}`)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg"
                                >
                                    Monitor
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                                <th className="px-6 py-5">Flag</th>
                                <th className="px-4 py-5">Schedule</th>
                                <th className="px-4 py-5">Student & Region</th>
                                <th className="px-4 py-5">Course & Tutor</th>
                                <th className="px-4 py-5 text-center">Status</th>
                                <th className="px-6 py-5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayClasses.length === 0 ? (
                                <tr><td colSpan="6" className="p-32 text-center text-slate-400 italic">No {view === 'regular' ? 'regular classes' : 'trial sessions'} found.</td></tr>
                            ) : displayClasses.map(cls => (
                                <tr key={cls.id} className={`group hover:bg-slate-50/80 transition-all ${cls.is_live ? 'bg-red-500/5' : ''}`}>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center justify-center">
                                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                                                {getCountryFlag(cls.country)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="text-[13px] font-black text-slate-900">{new Date(cls.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                        <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-tight mt-1">{new Date(cls.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="font-black text-slate-800 text-[13px] flex items-center gap-2 uppercase tracking-tight">
                                            {cls.student_name}
                                            <span className={cls.gender === 'Female' ? 'text-pink-400' : 'text-blue-400'}>{cls.gender === 'Female' ? '♀' : '♂'}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                            {cls.timezone || 'UTC'} · <span className="text-emerald-500">{getLocalTime(cls.timezone)}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="text-[12px] text-slate-700 font-black uppercase tracking-tight">{cls.subject || 'General Study'}</div>
                                        <div className="flex items-center gap-2 mt-1 px-2 py-0.5 bg-slate-100 w-fit rounded-lg">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            <div className="text-[9px] text-slate-500 font-bold uppercase">Tr. {cls.tutor_name}</div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-center">
                                        <StatusBadge
                                            status={
                                                cls.status === 'COMPLETED' ? 'COMPLETED' :
                                                cls.is_live ? (cls.is_started ? 'LIVE_STARTED' : 'LIVE_WAITING') :
                                                new Date(cls.scheduled_at) > new Date() ? 'UPCOMING' : 'ENDED'
                                            }
                                        />
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => navigate(`/live/${cls.db_id || cls.id}`)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${cls.is_live ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/30' : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-900/20'}`}
                                            >
                                                <span>📹</span>
                                                <span>{cls.is_live ? 'Monitor' : 'Room Link'}</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

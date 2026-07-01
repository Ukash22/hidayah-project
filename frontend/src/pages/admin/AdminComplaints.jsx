import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/layout';
import { StatusBadge } from './adminHelpers';

export default function AdminComplaints() {
    const [allComplaints, setAllComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchComplaints = useCallback(async () => {
        try {
            const res = await api.get('/api/complaints/admin/all/');
            setAllComplaints(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Complaints fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

    const handleResolve = async (id) => {
        const responseText = window.prompt('Enter Admin Response:');
        if (!responseText) return;
        try {
            await api.post(`/api/complaints/admin/${id}/resolve/`, { response: responseText });
            alert('Complaint resolved and response sent!');
            fetchComplaints();
        } catch (err) {
            alert('Failed to resolve complaint: ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Complaints — Hidayah Admin</title>
            <PageHeader title="Complaint Management" description="Review and resolve all platform complaints and disputes." />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parties</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {allComplaints.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic">No complaints found.</td></tr>
                            ) : allComplaints.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="text-[10px] font-bold text-slate-500">{new Date(c.created_at).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 text-xs">{c.subject}</div>
                                        <div className="text-[10px] text-slate-500 truncate max-w-xs">{c.description}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[9px] font-bold text-primary uppercase">By: {c.filed_by_name}</div>
                                        <div className="text-[9px] font-bold text-red-500 uppercase">Against: {c.filed_against_name}</div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <StatusBadge status={c.status} />
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {c.status !== 'RESOLVED' && (
                                            <button
                                                onClick={() => handleResolve(c.id)}
                                                className="bg-primary text-white px-3 py-1 rounded text-[9px] font-black uppercase"
                                            >
                                                Resolve
                                            </button>
                                        )}
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

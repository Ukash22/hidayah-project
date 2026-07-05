import { useState, useEffect, useCallback } from 'react';
import api, { asList } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { StatusBadge } from './adminHelpers';
import { SkeletonCard } from '../../components/ui';

export default function AdminComplaints() {
    const toast = useToast();
    const [allComplaints, setAllComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchComplaints = useCallback(async () => {
        try {
            const res = await api.get('/api/complaints/admin/all/');
            setAllComplaints(asList(res.data));
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
            toast.success('Complaint resolved and response sent!');
            fetchComplaints();
        } catch (err) {
            toast.error('Failed to resolve complaint: ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Complaints — Hidayah Admin</title>
            <PageHeader title="Complaint Management" description="Review and resolve all platform complaints and disputes." />

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parties</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {allComplaints.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-500 italic">No complaints found.</td></tr>
                            ) : allComplaints.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="text-[10px] font-bold text-slate-500">{new Date(c.created_at).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{c.subject}</div>
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
                                                className="bg-primary text-white px-3 py-1 rounded text-[9px] font-bold uppercase"
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

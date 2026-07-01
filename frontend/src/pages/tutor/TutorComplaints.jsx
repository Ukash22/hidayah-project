import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';

function getStatusBadge(status) {
    const colors = {
        OPEN: 'bg-amber-50 text-amber-600 border-amber-200',
        UNDER_REVIEW: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        RESOLVED: 'bg-blue-50 text-blue-600 border-blue-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-500 border-slate-200';
}

export default function TutorComplaints() {
    const { token } = useAuth();
    const [complaints, setComplaints] = useState({ filed_by_me: [], filed_against_me: [] });
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/complaints/my/`, { headers: getAuthHeader() })
            .then(res => setComplaints(res.data && Array.isArray(res.data.filed_by_me) ? res.data : { filed_by_me: [], filed_against_me: [] }))
            .catch(err => console.error('Complaints fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Feedback — Hidayah</title>
            <PageHeader title="Feedback & Reports" description="Track student concerns and administrative feedback." />

            <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-blue-600 rounded-full shadow-lg shadow-blue-600/20"></span>
                        Filed by Me
                    </h3>
                    {complaints.filed_by_me.length > 0 ? (
                        <div className="space-y-4">
                            {complaints.filed_by_me.map(complaint => (
                                <div key={complaint.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-600/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-bold text-slate-900">{complaint.subject}</h4>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(complaint.status)}`}>
                                            {complaint.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4 font-medium leading-relaxed">{complaint.description}</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg inline-block">Against: {complaint.filed_against_name}</p>

                                    {complaint.admin_response && (
                                        <div className="mt-6 bg-blue-50 p-5 rounded-2xl border border-blue-100">
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Admin Response:</p>
                                            <p className="text-sm text-blue-700 font-medium leading-relaxed">{complaint.admin_response}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold">No active reports filed.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-red-500 rounded-full shadow-lg shadow-red-500/20"></span>
                        Received Reports
                    </h3>
                    {complaints.filed_against_me.length > 0 ? (
                        <div className="space-y-4">
                            {complaints.filed_against_me.map(complaint => (
                                <div key={complaint.id} className="bg-red-50 p-6 rounded-[2rem] border border-red-100 hover:border-red-300 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-bold text-slate-900">{complaint.subject}</h4>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(complaint.status)}`}>
                                            {complaint.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-4 font-medium leading-relaxed">{complaint.description}</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg inline-block">From: {complaint.filed_by_name}</p>

                                    {complaint.admin_response && (
                                        <div className="mt-6 bg-white p-5 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resolution Notes:</p>
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed">{complaint.admin_response}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold">Your record is perfectly clean! ✨</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

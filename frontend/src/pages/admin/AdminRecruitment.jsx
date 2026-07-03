import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { StatusBadge } from './adminHelpers';
import { SkeletonTable } from '../../components/ui';

export default function AdminRecruitment() {
    const toast = useToast();
    const confirm = useConfirm();
    const [tutorApps, setTutorApps] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchTutorApps = useCallback(async () => {
        try {
            const res = await api.get('/api/tutors/admin/list/');
            setTutorApps(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Tutor apps fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTutorApps(); }, [fetchTutorApps]);

    const handleScheduleInterview = async (app) => {
        const time = window.prompt('Enter Interview Time (YYYY-MM-DDTHH:MM):', new Date(Date.now() + 86400000).toISOString().slice(0, 16));
        if (!time) return;
        if (!await confirm('Use internal Live Classroom for this interview?', { confirmLabel: 'Use Internal' })) return;
        try {
            setActionLoading(true);
            await api.post(`/api/tutors/admin/action/${app.id}/`, { action: 'INTERVIEW', interview_at: time, interview_link: '', generate_zoom: true });
            toast.success('Interview Scheduled Successfully!');
            fetchTutorApps();
        } catch (err) {
            toast.error('Failed to schedule interview: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateInterview = async (app) => {
        const time = window.prompt('Update Interview Time (YYYY-MM-DDTHH:MM):', app.interview_at ? new Date(app.interview_at).toISOString().slice(0, 16) : '');
        if (!time) return;
        const link = window.prompt('Update Interview Meeting Link (leave blank to keep existing):') || app.interview_link;
        try {
            setActionLoading(true);
            await api.post(`/api/tutors/admin/action/${app.id}/`, { action: 'INTERVIEW', interview_at: time, interview_link: link, generate_zoom: false });
            toast.success('Schedule Updated!');
            fetchTutorApps();
        } catch (err) {
            toast.error('Failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async (app) => {
        if (!await confirm('Approve this tutor? Appointment Letter will be sent.', { confirmLabel: 'Approve' })) return;
        try {
            await api.post(`/api/tutors/admin/action/${app.id}/`, { action: 'APPROVE' });
            toast.success('Tutor Approved!');
            fetchTutorApps();
        } catch { toast.error('Failed to approve'); }
    };

    const handleReject = async (app) => {
        const reason = window.prompt('Rejection Reason:');
        if (!reason) return;
        try {
            await api.post(`/api/tutors/admin/action/${app.id}/`, { action: 'REJECT', reason });
            toast.info('Tutor Rejected');
            fetchTutorApps();
        } catch { toast.error('Failed to reject'); }
    };

    if (loading) return (
        <div className="p-4 space-y-2">
            <SkeletonTable rows={6} />
        </div>
    );

    return (
        <>
            <title>Recruitment — Hidayah Admin</title>
            <PageHeader title="Tutor Recruitment" description="Review and process tutor application submissions." />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Applicant</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Details</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tutorApps.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-500 italic">No tutor applications yet.</td></tr>
                            ) : tutorApps.map(app => (
                                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <div className="text-xs font-bold text-slate-700">{new Date(app.created_at).toLocaleDateString()}</div>
                                        <div className="text-[9px] text-slate-500 uppercase font-medium">{app.device} • {app.network}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 text-xs">{app.name}</div>
                                        <div className="text-[10px] text-primary font-black uppercase tracking-tight">{app.subjects?.slice(0, 30)}...</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[11px] text-slate-600 font-medium italic">{app.email}</div>
                                        <div className="flex flex-wrap gap-2 mt-0.5">
                                            <span className="text-[9px] text-slate-500 font-bold uppercase">{app.experience} Years Exp</span>
                                            <span className="text-[9px] text-emerald-600 font-black uppercase">₦{parseFloat(app.hourly_rate).toLocaleString()}/hr</span>
                                        </div>
                                        {app.status === 'INTERVIEW_SCHEDULED' && app.interview_at && (
                                            <div className="mt-1 text-[9px] text-amber-600 font-bold uppercase">
                                                🗓 {new Date(app.interview_at).toLocaleString()}
                                            </div>
                                        )}
                                        {app.status === 'INTERVIEW_SCHEDULED' && app.interview_link && (
                                            <a href={app.interview_link} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-[9px] text-white bg-blue-600 hover:bg-blue-700 font-black uppercase px-2 py-0.5 rounded transition-colors">
                                                🎥 Join Interview
                                            </a>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <StatusBadge status={app.status} />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col gap-1 items-center">
                                            {app.status === 'APPLIED' && (
                                                <button
                                                    onClick={() => handleScheduleInterview(app)}
                                                    disabled={actionLoading}
                                                    className="px-2 py-1 bg-amber-500 text-white rounded text-[9px] font-black uppercase shadow-sm hover:bg-amber-600 transition-colors w-full"
                                                >
                                                    Schedule Interview
                                                </button>
                                            )}
                                            {app.status === 'INTERVIEW_SCHEDULED' && (
                                                <button
                                                    onClick={() => handleUpdateInterview(app)}
                                                    disabled={actionLoading}
                                                    className="px-2 py-1 bg-violet-500 text-white rounded text-[9px] font-black uppercase shadow-sm hover:bg-violet-600 transition-colors w-full"
                                                >
                                                    Update Schedule
                                                </button>
                                            )}
                                            {(app.status === 'APPLIED' || app.status === 'INTERVIEW_SCHEDULED') && (
                                                <div className="flex gap-1 w-full">
                                                    <button onClick={() => handleApprove(app)} className="flex-1 px-2 py-1 bg-emerald-600 text-white rounded text-[9px] font-black uppercase">Approve</button>
                                                    <button onClick={() => handleReject(app)} className="flex-1 text-[9px] text-red-500 font-bold underline">Reject</button>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setSelectedApp(app)}
                                                className="px-2 py-1 w-full bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-black uppercase hover:bg-slate-200 transition-colors"
                                            >
                                                👁 View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedApp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Tutor Profile</h3>
                            <button onClick={() => setSelectedApp(null)} className="text-slate-500 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div><span className="font-black text-slate-500 uppercase text-[10px]">Name:</span><p className="font-bold text-slate-800 mt-0.5">{selectedApp.name}</p></div>
                            <div><span className="font-black text-slate-500 uppercase text-[10px]">Email:</span><p className="text-slate-600 mt-0.5">{selectedApp.email}</p></div>
                            <div><span className="font-black text-slate-500 uppercase text-[10px]">Subjects:</span><p className="text-slate-600 mt-0.5">{selectedApp.subjects}</p></div>
                            <div><span className="font-black text-slate-500 uppercase text-[10px]">Experience:</span><p className="text-slate-600 mt-0.5">{selectedApp.experience} years</p></div>
                            <div><span className="font-black text-slate-500 uppercase text-[10px]">Hourly Rate:</span><p className="text-slate-600 mt-0.5">₦{parseFloat(selectedApp.hourly_rate || 0).toLocaleString()}</p></div>
                            <div><span className="font-black text-slate-500 uppercase text-[10px]">Device / Network:</span><p className="text-slate-600 mt-0.5">{selectedApp.device} / {selectedApp.network}</p></div>
                            {selectedApp.bio && <div><span className="font-black text-slate-500 uppercase text-[10px]">Bio:</span><p className="text-slate-600 mt-0.5 leading-relaxed">{selectedApp.bio}</p></div>}
                        </div>
                        <button onClick={() => setSelectedApp(null)} className="mt-6 w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase text-sm hover:bg-slate-200">Close</button>
                    </div>
                </div>
            )}
        </>
    );
}

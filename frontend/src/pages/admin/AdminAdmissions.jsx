import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/layout';
import { getCountryFlag } from './adminHelpers';

export default function AdminAdmissions() {
    const [pendingStudents, setPendingStudents] = useState([]);
    const [applications, setApplications] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [tab, setTab] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pendRes, appRes] = await Promise.all([
                api.get('/api/auth/pending-students/'),
                api.get('/api/admin/applications/'),
            ]);
            setPendingStudents(Array.isArray(pendRes.data) ? pendRes.data : []);
            setApplications(Array.isArray(appRes.data) ? appRes.data : []);
        } catch (err) {
            console.error('Admissions fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const approveStudent = async (id) => {
        if (!window.confirm('Approve this student and send an Admission Letter?')) return;
        setActionLoading(true);
        try {
            await api.post(`/api/auth/approve-student/${id}/`, {});
            alert('✅ Student approved! Admission letter generated and sent via email.');
            fetchData();
        } catch (err) {
            alert('Failed to approve student: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkApprove = async () => {
        if (!window.confirm(`Approve ${selectedIds.length} selected applications?`)) return;
        try {
            await Promise.all(selectedIds.map(id => api.post(`/api/auth/approve-student/${id}/`, {})));
            alert('✅ Selected students approved!');
            setSelectedIds([]);
            fetchData();
        } catch (err) {
            alert('Bulk approval failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        const ids = pendingStudents.map(s => s.id);
        setSelectedIds(prev => prev.length === ids.length ? [] : ids);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Admissions — Hidayah Admin</title>
            <PageHeader title="Admissions" description="Review and approve student enrollment requests." />

            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit mb-6 gap-1">
                <button onClick={() => setTab('pending')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                    Pending Students {pendingStudents.length > 0 && `(${pendingStudents.length})`}
                </button>
                <button onClick={() => setTab('applications')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'applications' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                    Applications {applications.length > 0 && `(${applications.length})`}
                </button>
            </div>

            {selectedIds.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex justify-between items-center mb-4">
                    <span className="font-bold text-primary">{selectedIds.length} students selected</span>
                    <button onClick={handleBulkApprove} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">
                        Approve Selected ({selectedIds.length})
                    </button>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {tab === 'pending' && (
                                    <th className="py-3 px-4 w-10">
                                        <input type="checkbox" checked={selectedIds.length === pendingStudents.length && pendingStudents.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300 text-primary" />
                                    </th>
                                )}
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tab === 'pending' ? (
                                pendingStudents.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No pending admission requests.</td></tr>
                                ) : pendingStudents.map(student => (
                                    <tr key={student.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(student.id) ? 'bg-primary/5' : ''}`}>
                                        <td className="py-3 px-4">
                                            <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelect(student.id)} className="rounded border-slate-300 text-primary" />
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="text-xs font-bold text-slate-700">New Registration</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-medium">{student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Recent'}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{getCountryFlag(student.country)}</span>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-xs">{student.first_name} {student.last_name}</div>
                                                    <div className="text-[9px] text-slate-400 uppercase font-black">@{student.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-[11px] text-slate-600 font-medium lowercase italic">{student.email}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase">{student.phone} / {student.country || 'Global'}</div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Pending Verification</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => approveStudent(student.id)}
                                                    disabled={actionLoading}
                                                    className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-md text-[9px] font-black uppercase tracking-wider hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-1"
                                                >
                                                    <span>✅</span> Admit
                                                </button>
                                                {student.profile_data && (
                                                    <button
                                                        onClick={() => setSelectedApp({ ...student.profile_data, first_name: student.first_name, last_name: student.last_name, email: student.email })}
                                                        className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[9px] font-black uppercase hover:bg-slate-200"
                                                    >
                                                        📋 Form
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                applications.length === 0 ? (
                                    <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic">No applications found.</td></tr>
                                ) : applications.map(app => (
                                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="text-xs font-bold text-slate-700">{app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{getCountryFlag(app.country)}</span>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-xs">{app.first_name} {app.last_name || ''}</div>
                                                    <div className="text-[9px] text-primary font-black uppercase">{app.course_interested}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-[11px] text-slate-600">{app.email}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase">{app.phone}</div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : app.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button onClick={() => setSelectedApp(app)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase hover:bg-slate-200">View</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedApp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Application Details</h3>
                            <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <div className="space-y-3 text-sm">
                            {Object.entries(selectedApp).filter(([k]) => !['id', 'isViewOnly'].includes(k)).map(([key, val]) => (
                                val ? <div key={key}><span className="font-black text-slate-400 uppercase text-[10px]">{key.replace(/_/g, ' ')}:</span><p className="font-medium text-slate-700 mt-0.5">{String(val)}</p></div> : null
                            ))}
                        </div>
                        <button onClick={() => setSelectedApp(null)} className="mt-6 w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase text-sm hover:bg-slate-200">Close</button>
                    </div>
                </div>
            )}
        </>
    );
}

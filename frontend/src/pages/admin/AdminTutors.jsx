import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/layout';
import { getLocalTime } from './adminHelpers';

export default function AdminTutors() {
    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({
        username: '', email: '', password: '', role: 'TUTOR',
        first_name: '', last_name: '', phone: ''
    });
    const [saving, setSaving] = useState(false);

    const fetchTutors = useCallback(async () => {
        try {
            const res = await api.get('/api/tutors/admin/list/?status=APPROVED');
            setTutors(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Tutors fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTutors(); }, [fetchTutors]);

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this Tutor? This action cannot be undone.')) return;
        try {
            await api.delete(`/api/auth/admin/users/${userId}/`);
            alert('Tutor deleted successfully.');
            fetchTutors();
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/api/auth/admin/users/', { ...userForm, role: 'TUTOR' });
            alert('Tutor created successfully!');
            setShowUserModal(false);
            setUserForm({ username: '', email: '', password: '', role: 'TUTOR', first_name: '', last_name: '', phone: '' });
            fetchTutors();
        } catch (err) {
            alert('Failed: ' + JSON.stringify(err.response?.data || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Tutors — Hidayah Admin</title>
            <PageHeader
                title="Platform Tutors"
                description="All verified and active tutors on the platform."
                actions={
                    <button
                        onClick={() => setShowUserModal(true)}
                        className="px-4 py-2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                    >
                        + Add Tutor
                    </button>
                }
            />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact & Region</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status / Wallet</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tutors.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic">No approved tutors yet.</td></tr>
                            ) : tutors.map(tutor => (
                                <tr key={tutor.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <div className="text-xs font-bold text-slate-700">{new Date(tutor.created_at).toLocaleDateString()}</div>
                                        <div className="text-[9px] text-slate-400 uppercase font-medium">Approved</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 text-xs">{tutor.name}</div>
                                        <div className="text-[10px] text-primary font-black uppercase tracking-tight">{tutor.subjects?.slice(0, 40)}...</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[11px] text-slate-600 font-medium italic">{tutor.email}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[12px]" title={tutor.user?.country}>{tutor.user?.country === 'Nigeria' ? '🇳🇬' : '🌍'}</span>
                                            <span className="text-[9px] text-primary font-black uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded">
                                                🕒 {getLocalTime(tutor.user?.timezone)}
                                            </span>
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">{tutor.experience} Years • {tutor.device}</div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-1">Active</div>
                                        <div className="text-[10px] font-black text-slate-700">₦{parseFloat(tutor.wallet_balance || 0).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col gap-1 items-center">
                                            <button
                                                onClick={() => alert(`Tutor Profile:\n\nName: ${tutor.name}\nEmail: ${tutor.email}\nSubjects: ${tutor.subjects}\nExperience: ${tutor.experience} years\nDevice: ${tutor.device}`)}
                                                className="px-2 py-1 w-full bg-primary text-white rounded text-[9px] font-black uppercase shadow-sm hover:bg-primary/80 transition-colors"
                                            >
                                                📋 View Profile
                                            </button>
                                            <button
                                                onClick={() => tutor.user?.id && handleDelete(tutor.user.id)}
                                                className="px-2 py-1 w-full bg-red-50 text-red-600 rounded text-[9px] font-black uppercase hover:bg-red-100"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
                        <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-widest">Add Tutor</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
                                    <input required value={userForm.first_name} onChange={e => setUserForm({...userForm, first_name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Name</label>
                                    <input required value={userForm.last_name} onChange={e => setUserForm({...userForm, last_name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</label>
                                <input required value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                                <input required type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                                <input required type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-black uppercase hover:bg-amber-600 transition-colors disabled:opacity-50">
                                    {saving ? 'Creating...' : 'Add Tutor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

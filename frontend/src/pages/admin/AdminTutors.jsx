import { useState, useEffect, useCallback } from 'react';
import api, { asList } from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { getLocalTime, downloadCSV } from './adminHelpers';
import { SkeletonTable } from '../../components/ui';

export default function AdminTutors() {
    const toast = useToast();
    const confirm = useConfirm();
    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({
        username: '', email: '', password: '', role: 'TUTOR',
        first_name: '', last_name: '', phone: ''
    });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    const fetchTutors = useCallback(async () => {
        try {
            const res = await api.get('/api/tutors/admin/list/?status=APPROVED');
            setTutors(asList(res.data));
        } catch (err) {
            console.error('Tutors fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTutors(); }, [fetchTutors]);

    const q = search.trim().toLowerCase();
    const visibleTutors = q
        ? tutors.filter(t => [t.name, t.email, t.subjects, t.phone].filter(Boolean).join(' ').toLowerCase().includes(q))
        : tutors;

    const handleDelete = async (userId) => {
        if (!await confirm('Are you sure you want to delete this Tutor? This action cannot be undone.', { confirmLabel: 'Delete', danger: true })) return;
        try {
            await api.delete(`/api/auth/admin/users/${userId}/`);
            toast.success('Tutor deleted successfully.');
            fetchTutors();
        } catch (err) {
            toast.error('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/api/auth/admin/users/', { ...userForm, role: 'TUTOR' });
            toast.success('Tutor created successfully!');
            setShowUserModal(false);
            setUserForm({ username: '', email: '', password: '', role: 'TUTOR', first_name: '', last_name: '', phone: '' });
            fetchTutors();
        } catch (err) {
            toast.error('Failed: ' + JSON.stringify(err.response?.data || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="p-4 space-y-2">
            <SkeletonTable rows={6} />
        </div>
    );

    return (
        <>
            <title>Tutors — Hidayah Admin</title>
            <PageHeader
                title="Platform Tutors"
                description="All verified and active tutors on the platform."
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={() => downloadCSV(visibleTutors.map(t => ({
                                Name: `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim(),
                                Username: t.user?.username || '',
                                Email: t.user?.email || '',
                                Subjects: t.subjects_to_teach || t.subjects || '',
                                Status: t.status || '',
                                'Hourly Rate': t.hourly_rate || '',
                                Country: t.user?.country || '',
                            })), `tutors-${new Date().toISOString().slice(0,10)}.csv`)}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wide rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            Export CSV
                        </button>
                        <button
                            onClick={() => setShowUserModal(true)}
                            className="px-4 py-2 bg-amber-500 text-white text-[11px] font-semibold uppercase tracking-wide rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                        >
                            + Add Tutor
                        </button>
                    </div>
                }
            />

            <div className="mb-5">
                <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, email, subject…"
                    aria-label="Search tutors"
                    className="w-full sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-primary/40"
                />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Contact & Region</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Status / Wallet</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tutors.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-500 italic">No approved tutors yet.</td></tr>
                            ) : visibleTutors.map(tutor => (
                                <tr key={tutor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{new Date(tutor.created_at).toLocaleDateString()}</div>
                                        <div className="text-[11px] text-slate-500 uppercase font-medium">Approved</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{tutor.name}</div>
                                        <div className="text-[11px] text-primary font-semibold uppercase tracking-tight">{tutor.subjects?.slice(0, 40)}...</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-[11px] text-slate-600 font-medium italic">{tutor.email}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[12px]" title={tutor.user?.country}>{tutor.user?.country === 'Nigeria' ? '🇳🇬' : '🌍'}</span>
                                            <span className="text-[11px] text-primary font-semibold uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded">
                                                🕒 {getLocalTime(tutor.user?.timezone)}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-semibold uppercase mt-1">{tutor.experience} Years • {tutor.device}</div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide mb-1">Active</div>
                                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">₦{parseFloat(tutor.wallet_balance || 0).toLocaleString()}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col gap-1 items-center">
                                            <button
                                                onClick={() => toast.info(`${tutor.name} | ${tutor.email} | ${tutor.subjects} | ${tutor.experience} yrs exp`)}
                                                className="px-2 py-1 w-full bg-primary text-white rounded text-[11px] font-semibold uppercase shadow-sm hover:bg-primary/80 transition-colors"
                                            >
                                                📋 View Profile
                                            </button>
                                            <button
                                                onClick={() => tutor.user?.id && handleDelete(tutor.user.id)}
                                                className="px-2 py-1 w-full bg-red-50 text-red-600 rounded text-[11px] font-semibold uppercase hover:bg-red-100"
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
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg p-8">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-widest">Add Tutor</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">First Name</label>
                                    <input required value={userForm.first_name} onChange={e => setUserForm({...userForm, first_name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Last Name</label>
                                    <input required value={userForm.last_name} onChange={e => setUserForm({...userForm, last_name: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Username</label>
                                <input required value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Email</label>
                                <input required type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Password</label>
                                <input required type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold uppercase hover:bg-amber-600 transition-colors disabled:opacity-50">
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

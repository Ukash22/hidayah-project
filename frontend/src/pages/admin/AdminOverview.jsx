import { useState, useEffect, useCallback } from 'react';
import { Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { asList } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell
} from 'recharts';
import { SkeletonCard } from '../../components/ui';

function StatCard({ icon, label, value, sub, alert: isAlert }) {
    return (
        <div className={`bg-white dark:bg-slate-900 border p-6 rounded-card-lg shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1 ${isAlert ? 'border-amber-200' : 'border-slate-100 dark:border-slate-800'}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{icon}</span>
                {isAlert && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">{value}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
            <div className="text-[11px] text-slate-300 font-semibold uppercase tracking-tighter">{sub}</div>
        </div>
    );
}

export default function AdminOverview() {
    const navigate = useNavigate();
    const toast = useToast();
    const [allStudents, setAllStudents] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [applications, setApplications] = useState([]);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [allComplaints, setAllComplaints] = useState([]);
    const [allClasses, setAllClasses] = useState([]);
    const [globalSettings, setGlobalSettings] = useState(null);
    const [stats, setStats] = useState({ pending: 0 });
    const [updatingGlobal, setUpdatingGlobal] = useState(false);
    const [globalSuccess, setGlobalSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [studRes, tutRes, appRes, bookRes, withRes, compRes, clsRes, settRes, statsRes] = await Promise.all([
                api.get('/api/students/admin/all/'),
                api.get('/api/tutors/admin/list/?status=APPROVED'),
                api.get('/api/admin/applications/'),
                api.get('/api/classes/admin/bookings/?status=pending'),
                api.get('/api/payments/admin/withdrawals/pending/'),
                api.get('/api/complaints/admin/all/'),
                api.get('/api/classes/admin/unified-list/'),
                api.get('/api/payments/admin/settings/'),
                api.get('/api/payments/admin/stats/'),
            ]);
            setAllStudents(asList(studRes.data));
            setTutors(asList(tutRes.data));
            setApplications(asList(appRes.data));
            setPendingBookings(asList(bookRes.data));
            setWithdrawalRequests(asList(withRes.data));
            setAllComplaints(asList(compRes.data));
            setAllClasses(asList(clsRes.data));
            setGlobalSettings(settRes.data);
            setStats(statsRes.data);
        } catch (err) {
            if (err.response?.status === 401) setError('Authentication Failed: Please login again.');
            else setError('Failed to fetch dashboard data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleUpdateGlobalCommission = async (val) => {
        setUpdatingGlobal(true);
        try {
            const res = await api.patch('/api/payments/admin/settings/', { default_commission_percentage: val });
            setGlobalSettings(res.data);
            setGlobalSuccess(true);
            setTimeout(() => setGlobalSuccess(false), 3000);
        } catch {
            toast.error('Failed to update global share. Please ensure value is valid.');
        } finally {
            setUpdatingGlobal(false);
        }
    };

    const activeClass = allClasses.find(c => c.is_live);

    const countryData = (() => {
        const counts = {};
        [...allStudents, ...tutors].forEach(u => {
            const country = u.user?.country || u.country || 'Unknown';
            counts[country] = (counts[country] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
    })();

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Admin Overview — Hidayah</title>
            <PageHeader title="Command Center" description="Platform health, demographics, and activity pipeline." />

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between shadow-sm mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <h4 className="text-sm font-bold text-red-800 uppercase tracking-tight">System Alert</h4>
                            <p className="text-xs text-red-600 font-bold">{error}</p>
                        </div>
                    </div>
                    <button onClick={fetchAll} className="text-[11px] font-semibold text-red-800 uppercase hover:underline">Retry Sync</button>
                </div>
            )}

            {/* Active Class Banner */}
            {activeClass && (
                <div className="bg-gradient-to-r from-primary to-indigo-800 rounded-2xl p-6 shadow-2xl shadow-blue-500/20 border border-blue-500/30 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white"><Video size={22} /></div>
                        <div>
                            <h4 className="text-white font-bold text-lg">Class Active on Platform</h4>
                            <p className="text-blue-100 text-sm">Tr. {activeClass.tutor_name} is teaching {activeClass.student_name} ({activeClass.subject || 'Class'})</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/live/${activeClass.db_id || activeClass.id}`)}
                        className="bg-white dark:bg-slate-900 text-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all w-full md:w-auto text-center shadow-lg flex-shrink-0"
                    >
                        Observe Class
                    </button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Global Commission Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-card-lg shadow-xl relative overflow-hidden group border border-slate-700/50">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] uppercase font-semibold tracking-wide text-primary">Global Platform Share</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <input
                                type="number"
                                step="0.01"
                                disabled={updatingGlobal}
                                defaultValue={globalSettings?.default_commission_percentage || 5.00}
                                onBlur={(e) => handleUpdateGlobalCommission(e.target.value)}
                                className="bg-transparent text-3xl font-bold text-white w-24 outline-none border-b-2 border-transparent focus:border-primary transition-all pb-1"
                            />
                            <span className="text-xl font-bold text-slate-500">%</span>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            {updatingGlobal ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tighter">Syncing...</span>
                                </div>
                            ) : globalSuccess ? (
                                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-tighter">✓ Live & Dynamic</span>
                            ) : (
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tighter">Base Rate for all Subjects</span>
                            )}
                        </div>
                    </div>
                </div>

                <StatCard icon="👥" label="Total Students" value={allStudents.length} sub="Active Scholars" />
                <StatCard icon="📝" label="Pending Apps" value={stats.pending || applications.length} sub="Needs Action" alert={(stats.pending || applications.length) > 0} />
                <StatCard icon="👨‍🏫" label="Expert Tutors" value={tutors.length} sub="Verified Staff" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Demographics Pie */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">Platform Demographics</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Students', value: allStudents.length || 1 },
                                        { name: 'Tutors', value: tutors.length || 1 }
                                    ]}
                                    cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value"
                                >
                                    <Cell fill="#0ea5e9" />
                                    <Cell fill="#f59e0b" />
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-2">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-sky-500"></div><span className="text-xs font-bold text-slate-600">Students ({allStudents.length})</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-xs font-bold text-slate-600">Tutors ({tutors.length})</span></div>
                    </div>
                </div>

                {/* Global Reach Chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">Global Footprint (Top 5)</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer>
                            <BarChart data={countryData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} width={80} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* System Activity Pipeline */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">System Activity Pipeline</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer>
                            <BarChart data={[
                                { name: 'Admissions', count: applications.length },
                                { name: 'Bookings', count: pendingBookings.length },
                                { name: 'Withdrawals', count: withdrawalRequests.length },
                                { name: 'Complaints', count: allComplaints.length }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Pending Bookings', value: pendingBookings.length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
                    { label: 'Pending Withdrawals', value: withdrawalRequests.length, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
                    { label: 'Open Complaints', value: allComplaints.filter(c => c.status !== 'RESOLVED').length, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                    { label: 'Live Classes', value: allClasses.filter(c => c.is_live).length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} border rounded-2xl p-4 flex flex-col gap-1`}>
                        <div className={`text-2xl font-bold ${color}`}>{value}</div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
                    </div>
                ))}
            </div>
        </>
    );
}

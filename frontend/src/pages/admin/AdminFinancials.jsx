import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/layout';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

export default function AdminFinancials() {
    const [financials, setFinancials] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyticsChartMode, setAnalyticsChartMode] = useState('monthly');

    const fetchAll = useCallback(async () => {
        try {
            const [finRes, txRes, subjRes] = await Promise.all([
                api.get('/api/payments/admin/analytics/'),
                api.get('/api/payments/admin/transactions/'),
                api.get('/api/programs/subjects/'),
            ]);
            setFinancials(finRes.data);
            setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
            setSubjects(Array.isArray(subjRes.data) ? subjRes.data : (subjRes.data?.results || []));
        } catch (err) {
            console.error('Financials fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleDownloadReceipt = async (p, type) => {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`${type === 'payment' ? 'Payment' : 'Transaction'} Receipt`, 20, 20);
        doc.setFontSize(10);
        doc.text(`Student: ${p.student || p.user_name || 'N/A'}`, 20, 35);
        doc.text(`Amount: ₦${parseFloat(p.amount || 0).toLocaleString()}`, 20, 45);
        doc.text(`Date: ${new Date(p.date || p.date).toLocaleString()}`, 20, 55);
        doc.text(`Status: ${p.status || 'N/A'}`, 20, 65);
        if (p.ref || p.reference) doc.text(`Ref: ${p.ref || p.reference}`, 20, 75);
        doc.save(`receipt-${p.id}.pdf`);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Financials — Hidayah Admin</title>
            <PageHeader title="Financial Analytics" description="Platform revenue, wallet balances, and transaction audit trail." />

            <div className="space-y-6 pb-20">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Gross Revenue', value: financials?.totals?.total_revenue || 0, sub: 'Total Paid by Students', color: 'text-slate-800' },
                        { label: 'Platform Net', value: financials?.totals?.platform_revenue || 0, sub: 'Hidayah Commissions Earned', color: 'text-primary' },
                        { label: 'Net to Tutors', value: financials?.totals?.net_to_tutors || 0, sub: 'Tutor Earnings Credit', color: 'text-blue-600' },
                        { label: 'Class Completions', value: null, sub: 'Classes Successfully Delivered', color: 'text-slate-800', text: `${financials?.totals?.completed_classes || 0} / ${financials?.totals?.total_classes || 0}` },
                    ].map((card, i) => (
                        <div key={i} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-1 hover:shadow-md transition-shadow">
                            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{card.label}</span>
                            <div className={`text-2xl font-black ${card.color}`}>
                                {card.text || `₦${parseFloat(card.value).toLocaleString()}`}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{card.sub}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Wallet Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-xl flex flex-col gap-1 relative overflow-hidden group">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Student Wallets</span>
                        <div className="text-3xl font-black text-white">₦{parseFloat(financials?.wallet_stats?.student_total || 0).toLocaleString()}</div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Liquid Student Balance</span>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 p-6 rounded-3xl shadow-xl flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300">Total Tutor Wallets</span>
                        <div className="text-3xl font-black text-white">₦{parseFloat(financials?.wallet_stats?.tutor_total || 0).toLocaleString()}</div>
                        <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-tighter">Total Owed to Tutors</span>
                    </div>
                    <div className="bg-gradient-to-br from-red-800 to-red-900 p-6 rounded-3xl shadow-xl flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-black tracking-widest text-red-300">Pending Withdrawals</span>
                        <div className="text-3xl font-black text-white">₦{parseFloat(financials?.withdrawal_stats?.pending_amount || 0).toLocaleString()}</div>
                        <span className="text-[9px] font-bold text-red-300 uppercase tracking-tighter">{financials?.withdrawal_stats?.pending_count || 0} Requests Waiting</span>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Revenue Velocity</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Growth Trend & Processing History</p>
                        </div>
                        <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                            {['daily', 'weekly', 'monthly'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setAnalyticsChartMode(m)}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${analyticsChartMode === m ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financials?.charts?.[analyticsChartMode] || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey={analyticsChartMode === 'daily' ? 'day' : analyticsChartMode === 'weekly' ? 'week' : 'month'}
                                    axisLine={false} tickLine={false}
                                    tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
                                    tickFormatter={(v) => { try { return new Date(v).toLocaleDateString(undefined, {month: 'short', day: analyticsChartMode === 'daily' ? 'numeric' : undefined}); } catch { return v; } }}
                                    dy={10}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(v) => `₦${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(value) => [`₦${parseFloat(value).toLocaleString()}`, 'Revenue']} />
                                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={analyticsChartMode === 'daily' ? 12 : 32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment History */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <span className="text-xl">📃</span> Audit Trail
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    {['Date', 'Student', 'Amount', 'Status', 'Ref', 'Receipt'].map(h => (
                                        <th key={h} className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {!financials?.history || financials.history.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic">No recent payments found.</td></tr>
                                ) : financials.history.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-all group">
                                        <td className="py-4 px-6 text-[11px] font-bold text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="py-4 px-6">
                                            <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{p.student}</div>
                                            <div className="text-[9px] text-slate-400 font-bold lowercase italic">{p.method}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-sm font-black">₦{parseFloat(p.amount).toLocaleString()}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter ${p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : p.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                                        </td>
                                        <td className="py-4 px-6 text-[10px] font-bold text-slate-500 italic">#{p.ref}</td>
                                        <td className="py-4 px-6">
                                            <button onClick={() => handleDownloadReceipt(p, 'payment')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors" title="Download Receipt">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Wallet Transactions */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-indigo-50/20">
                        <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <span className="text-xl">💳</span> Wallet Transactions (Debits & Credits)
                        </h3>
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm">Internal Ledger</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    {['Timestamp', 'User Details', 'Type', 'Amount', 'Description'].map(h => (
                                        <th key={h} className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {transactions.length === 0 ? (
                                    <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic">No wallet activities found.</td></tr>
                                ) : transactions.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                                        <td className="py-4 px-6 text-[11px] font-bold text-slate-500 whitespace-nowrap">{new Date(t.date).toLocaleString()}</td>
                                        <td className="py-4 px-6">
                                            <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{t.user_name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold lowercase">{t.user_email}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border ${(t.type?.includes('DEBIT') || t.type?.includes('WITHDRAWAL')) ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                {t.type?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className={`text-sm font-black ${(t.type?.includes('DEBIT') || t.type?.includes('WITHDRAWAL')) ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {(t.type?.includes('DEBIT') || t.type?.includes('WITHDRAWAL')) ? '-' : '+'}₦{parseFloat(t.amount || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight line-clamp-1">{t.description}</div>
                                            {t.reference && <div className="text-[8px] text-slate-300 font-black tracking-widest mt-0.5">REF: {t.reference}</div>}
                                            <button onClick={() => handleDownloadReceipt(t, 'transaction')} className="mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md transition-all">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                Get Receipt
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

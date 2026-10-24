import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import WithdrawalModal from './WithdrawalModal';
import { useToast } from '../context/ToastContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Building2, CreditCard, CheckCircle2, AlertTriangle, Edit2, Check } from 'lucide-react';

const TutorWallet = ({ token }) => {
    const toast = useToast();
    const [profile, setProfile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const [period, setPeriod] = useState(6);

    // Bank Details State
    const [bankDetails, setBankDetails] = useState({ bank_name: '', account_number: '', account_name: '' });
    const [editingBank, setEditingBank] = useState(false);
    const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', account_name: '' });
    const [savingBank, setSavingBank] = useState(false);

    const chartData = useMemo(() => {
        const earnings = transactions.filter(
            t => t.transaction_type === 'EARNING' && t.status === 'COMPLETED'
        );
        const now = new Date();
        return Array.from({ length: period }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (period - 1 - i), 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
            const total = earnings
                .filter(t => t.created_at?.startsWith(key))
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            return { month: label, earnings: total };
        });
    }, [transactions, period]);

    const fetchData = React.useCallback(async () => {
        try {
            const res = await api.get(`/api/payments/tutor/wallet/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setProfile({ balance: res.data.balance, hourly_rate: res.data.hourly_rate });
            setTransactions(res.data.transactions || []);
        } catch (err) {
            console.error('Failed to fetch wallet data', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchBankDetails = React.useCallback(async () => {
        try {
            const res = await api.get('/api/payments/tutor/bank-details/');
            if (res.data) {
                const data = {
                    bank_name: res.data.bank_name || '',
                    account_number: res.data.account_number || '',
                    account_name: res.data.account_name || '',
                };
                setBankDetails(data);
                setBankForm(data);
            }
        } catch (err) {
            console.error('Failed to fetch tutor bank details', err);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchData();
            fetchBankDetails();
        }
    }, [token, fetchData, fetchBankDetails]);

    const handleSaveBankDetails = async (e) => {
        e.preventDefault();
        if (!bankForm.bank_name?.trim() || !bankForm.account_number?.trim() || !bankForm.account_name?.trim()) {
            toast.error('Please provide complete bank details.');
            return;
        }
        setSavingBank(true);
        try {
            const res = await api.patch('/api/payments/tutor/bank-details/', bankForm);
            setBankDetails(res.data);
            setEditingBank(false);
            toast.success('Bank details updated successfully!');
        } catch (err) {
            toast.error('Failed to save bank details: ' + (err.response?.data?.error || err.message));
        } finally {
            setSavingBank(false);
        }
    };

    const handleDownloadReceipt = async (t) => {
        try {
            const { jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const doc = new jsPDF();
            
            // Brand Header
            doc.setFillColor(15, 23, 42); // Navy
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("HIDAYAH INTERNATIONAL", 105, 18, { align: "center" });
            doc.setFontSize(10);
            doc.text("TUTOR PLATFORM | ISLAMIC & WESTERN EDUCATION", 105, 28, { align: "center" });
            
            // Receipt Info
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(16);
            doc.text("OFFICIAL TRANSACTION RECORD", 20, 55);
            
            doc.setFontSize(10);
            doc.text(`Record Date: ${new Date().toLocaleString()}`, 20, 65);
            doc.text(`Transaction ID: #${t.id || 'N/A'}`, 20, 72);
            
            // Grid Data
            const rows = [
                ["Transaction Type", (t.transaction_type || "Activity").toUpperCase()],
                ["Amount", `NGN ${parseFloat(t.amount || 0).toLocaleString()}`],
                ["Status", (t.status || "COMPLETED").toUpperCase()],
                ["Date", new Date(t.created_at).toLocaleDateString()],
                ["Description", t.description || "Wallet Activity / Payout"]
            ];
            
            autoTable(doc, {
                startY: 85,
                head: [['Field', 'Detail']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }, // Emerald
                styles: { fontSize: 10, cellPadding: 5 }
            });
            
            // Footer
            const finalY = doc.lastAutoTable?.finalY || 150;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Hidayah International - Tutor Services", 105, finalY + 20, { align: "center" });
            
            doc.save(`Hidayah_Tutor_Record_${t.id}.pdf`);
        } catch (err) {
            console.error("Receipt generation failed:", err);
            toast.error("Failed to generate record PDF.");
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: 'bg-primary/10 text-primary border-primary/20',
            COMPLETED: 'bg-indigo-600/10 text-indigo-600 border-indigo-600/20',
            REJECTED: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        };
        return styles[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700';
    };

    const getTypeIcon = (type) => {
        const icons = {
            EARNING: '💰',
            WITHDRAWAL: '💸',
            DEDUCTION: '➖',
            BONUS: '🎁'
        };
        return icons[type] || '📝';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-24">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-card-lg border border-slate-100 dark:border-slate-800 gap-6 shadow-sm">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100 mb-1">Financial Center</h2>
                    <p className="text-slate-500 text-xs uppercase tracking-[0.2em] font-bold">Manage your earnings, rates, and withdrawals.</p>
                </div>
            </div>

            {/* Wallet Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-primary to-indigo-900 border border-blue-500/30 rounded-card-lg p-5 md:p-8 shadow-2xl relative overflow-hidden group hover:scale-[1.01] transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                        <div>
                            <h3 className="text-[11px] font-semibold text-white/70 uppercase tracking-wide mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full"></span>
                                Available Balance
                            </h3>
                            <p className="text-3xl md:text-5xl font-bold text-white tracking-tight">₦{parseFloat(profile?.balance || 0).toLocaleString()}</p>
                        </div>
                        <button
                            onClick={() => setShowWithdrawalModal(true)}
                            className="w-full bg-white dark:bg-slate-900 text-primary px-6 py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-center"
                        >
                            Request Bank Transfer →
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card-lg p-5 md:p-8 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-all">
                    <div>
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-xl mb-6 border border-primary/20 text-primary">⏱️</div>
                        <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Base Hourly Rate</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">₦{profile?.hourly_rate?.toLocaleString() || '0'}<span className="text-sm text-slate-500 ml-2">/ hr</span></p>
                    </div>
                    <p className="text-[11px] font-semibold uppercase text-primary tracking-wide bg-primary/10 inline-block px-3 py-1.5 rounded-lg border border-primary/10 mt-6 self-start">Active Rate</p>
                </div>
            </div>

            {/* Bank Transfer Details Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card-lg p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Bank Transfer Account</h3>
                                {bankDetails.bank_name ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                        <CheckCircle2 size={11} /> Saved & Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                        <AlertTriangle size={11} /> Action Required
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Admin sends your approved withdrawal payouts to this Nigerian bank account.</p>
                        </div>
                    </div>
                    {!editingBank && (
                        <button
                            type="button"
                            onClick={() => {
                                setBankForm(bankDetails);
                                setEditingBank(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all self-start sm:self-auto"
                        >
                            <Edit2 size={13} /> {bankDetails.bank_name ? 'Edit Details' : 'Add Bank Account'}
                        </button>
                    )}
                </div>

                {editingBank ? (
                    <form onSubmit={handleSaveBankDetails} className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Bank Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. GTBank, Zenith, Access"
                                    value={bankForm.bank_name}
                                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold outline-none focus:border-emerald-500 transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Account Number (10 digits)</label>
                                <input
                                    type="text"
                                    maxLength="10"
                                    placeholder="0123456789"
                                    value={bankForm.account_number}
                                    onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value.replace(/\D/g, '') })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono font-semibold outline-none focus:border-emerald-500 transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Account Holder Name</label>
                                <input
                                    type="text"
                                    placeholder="Full Name as on Bank Account"
                                    value={bankForm.account_name}
                                    onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold outline-none focus:border-emerald-500 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setEditingBank(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingBank}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
                            >
                                {savingBank ? (
                                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                                ) : (
                                    <><Check size={14} /> Save Bank Details</>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="mt-6">
                        {bankDetails.bank_name ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Bank Name</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                        <Building2 size={14} className="text-emerald-500" /> {bankDetails.bank_name}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Account Number</span>
                                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                        <CreditCard size={14} className="text-primary" /> {bankDetails.account_number}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Account Holder</span>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        {bankDetails.account_name}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">⚠️</span>
                                    <div>
                                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">No bank account configured</p>
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400">Please provide your bank details so the administration can disburse your class payouts.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBankForm(bankDetails);
                                        setEditingBank(true);
                                    }}
                                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white shadow transition-all shrink-0"
                                >
                                    Add Account Now
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Earnings Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-card-lg shadow-sm p-8 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></span>
                        Earnings Trend
                    </h3>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                        {[6, 12].map(p => (
                            <button key={p} onClick={() => setPeriod(p)}
                                className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-all ${period === p ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-600'}`}>
                                {p}M
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ width: '100%', height: 200, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={160}>
                    <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis
                            tickFormatter={v => v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : v > 0 ? `₦${v}` : ''}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false} tickLine={false} width={52}
                        />
                        <Tooltip
                            formatter={v => [`₦${parseFloat(v).toLocaleString()}`, 'Net Earnings']}
                            contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                            cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                        />
                        <Bar dataKey="earnings" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                </div>
                {chartData.every(d => d.earnings === 0) && (
                    <p className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-2">
                        No completed earnings in this period yet.
                    </p>
                )}
            </div>

            {/* Transaction History */}
            <div className="bg-white dark:bg-slate-900 rounded-card-lg shadow-sm p-8 border border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-primary rounded-full shadow-lg shadow-primary/20"></span>
                    Transaction Ledger
                </h3>

                {transactions.length === 0 ? (
                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 font-bold">No financial activities recorded yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto no-scrollbar rounded-2xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-left bg-transparent">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-right">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm border border-slate-200 dark:border-slate-700">
                                                    {getTypeIcon(transaction.transaction_type)}
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors uppercase tracking-tight">
                                                    {transaction.transaction_type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            ₦{parseFloat(transaction.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border tracking-widest ${getStatusBadge(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-[10px] font-bold text-slate-500">
                                            {new Date(transaction.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-[11px] text-slate-600 hidden md:table-cell max-w-xs truncate">
                                            {transaction.description || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button 
                                                onClick={() => handleDownloadReceipt(transaction)}
                                                className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all opacity-0 group-hover:opacity-100"
                                                title="Download Receipt PDF"
                                            >
                                                ↓
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <WithdrawalModal
                isOpen={showWithdrawalModal}
                onClose={() => setShowWithdrawalModal(false)}
                currentBalance={profile?.balance || 0}
                token={token}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default TutorWallet;

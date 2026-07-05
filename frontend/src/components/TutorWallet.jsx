import React, { useState, useEffect } from 'react';
import api from '../services/api';
import WithdrawalModal from './WithdrawalModal';
import { useToast } from '../context/ToastContext';

const TutorWallet = ({ token }) => {
    const toast = useToast();
    const [profile, setProfile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

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

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token, fetchData]);

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
                            <h3 className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2 flex items-center gap-2">
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
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Base Hourly Rate</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">₦{profile?.hourly_rate?.toLocaleString() || '0'}<span className="text-sm text-slate-500 ml-2">/ hr</span></p>
                    </div>
                    <p className="text-[9px] font-bold uppercase text-primary tracking-widest bg-primary/10 inline-block px-3 py-1.5 rounded-lg border border-primary/10 mt-6 self-start">Active Rate</p>
                </div>
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
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Receipt</th>
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

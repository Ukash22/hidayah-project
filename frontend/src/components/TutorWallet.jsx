import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import WithdrawalModal from './WithdrawalModal';

const TutorWallet = ({ token }) => {
    const [profile, setProfile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

    const fetchData = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/tutor/wallet/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setProfile({ balance: res.data.balance, hourly_rate: res.data.hourly_rate });
            setTransactions(res.data.transactions || []);
        } catch (err) {
            console.error('Failed to fetch wallet data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    const handleDownloadReceipt = (t) => {
        try {
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
            alert("Failed to generate record PDF.");
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: 'bg-blue-600/10 text-blue-600 border-blue-600/20',
            COMPLETED: 'bg-indigo-600/10 text-indigo-600 border-indigo-600/20',
            REJECTED: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        };
        return styles[status] || 'bg-slate-100 text-slate-400 border-slate-200';
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
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 gap-6 shadow-sm">
                <div>
                    <h2 className="text-3xl font-display font-black text-slate-900 mb-1">Financial Center</h2>
                    <p className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black">Manage your earnings, rates, and withdrawals.</p>
                </div>
            </div>

            {/* Wallet Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-900 border border-blue-500/30 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group hover:scale-[1.01] transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                        <div>
                            <h3 className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                Available Balance
                            </h3>
                            <p className="text-5xl font-black text-white tracking-tight">₦{parseFloat(profile?.balance || 0).toLocaleString()}</p>
                        </div>
                        <button
                            onClick={() => setShowWithdrawalModal(true)}
                            className="w-full bg-white text-blue-600 px-6 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-slate-50 transition-all text-center"
                        >
                            Request Bank Transfer →
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between group hover:border-blue-600/20 transition-all">
                    <div>
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-xl mb-6 border border-blue-600/20 text-blue-600">⏱️</div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Hourly Rate</h3>
                        <p className="text-3xl font-black text-slate-900">₦{profile?.hourly_rate?.toLocaleString() || '0'}<span className="text-sm text-slate-400 ml-2">/ hr</span></p>
                    </div>
                    <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest bg-blue-600/10 inline-block px-3 py-1.5 rounded-lg border border-blue-600/10 mt-6 self-start">Active Rate</p>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-[2.5rem] shadow-sm p-8 border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full shadow-lg shadow-blue-600/20"></span>
                    Transaction Ledger
                </h3>

                {transactions.length === 0 ? (
                    <div className="py-20 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">No financial activities recorded yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto no-scrollbar rounded-2xl border border-slate-100">
                        <table className="w-full text-left bg-transparent">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm border border-slate-200">
                                                    {getTypeIcon(transaction.transaction_type)}
                                                </div>
                                                <span className="text-[11px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                                    {transaction.transaction_type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap font-black text-slate-900 text-sm">
                                            ₦{parseFloat(transaction.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border tracking-widest ${getStatusBadge(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-[10px] font-bold text-slate-400">
                                            {new Date(transaction.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-[11px] text-slate-600 hidden md:table-cell max-w-xs truncate">
                                            {transaction.description || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button 
                                                onClick={() => handleDownloadReceipt(transaction)}
                                                className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-600/10 border border-transparent hover:border-blue-600/20 transition-all opacity-0 group-hover:opacity-100"
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

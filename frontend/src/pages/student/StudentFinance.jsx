import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { TrendingUp as IconTrendingUp, Plus as IconPlus, ShieldCheck as IconShieldCheck, AlertCircle as IconAlertCircle, Download as IconDownload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard, FetchError } from '../../components/ui';

export default function StudentFinance() {
    const { token } = useAuth();
    const toast = useToast();

    const [profile, setProfile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(() => {
        if (!token) return;
        setLoadError(false);
        Promise.all([
            api.get(`/api/students/me/`, { headers: getAuthHeader() }),
            api.get(`/api/payments/wallet/transactions/`, { headers: getAuthHeader() }),
        ]).then(([profRes, txRes]) => {
            setProfile(profRes.data);
            setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
        }).catch(err => { console.error('Finance fetch failed', err); setLoadError(true); })
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDownloadReceipt = async (t) => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF();

            doc.setFillColor(30, 64, 175);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('HIDAYAH INTERNATIONAL', 105, 18, { align: 'center' });
            doc.setFontSize(10);
            doc.text('TUTOR PLATFORM | ISLAMIC & WESTERN EDUCATION', 105, 28, { align: 'center' });

            doc.setTextColor(50, 50, 50);
            doc.setFontSize(16);
            doc.text('OFFICIAL TRANSACTION RECEIPT', 20, 55);
            doc.setFontSize(10);
            doc.text(`Receipt Date: ${new Date().toLocaleString()}`, 20, 65);
            doc.text(`Reference ID: #${t.id || 'N/A'}`, 20, 72);

            autoTable(doc, {
                startY: 85,
                head: [['Description', 'Detail']],
                body: [
                    ['Transaction For', `${profile?.user?.first_name} ${profile?.user?.last_name || ''}`],
                    ['Email Address', profile?.user?.email || 'N/A'],
                    ['Activity Type', (t.transaction_type || 'Payment').replace('_', ' ').toUpperCase()],
                    ['Amount', `NGN ${parseFloat(t.amount || 0).toLocaleString()}`],
                    ['Date', new Date(t.timestamp || t.created_at).toLocaleDateString()],
                    ['Description', t.description || 'Course Enrollment / Wallet Activity'],
                ],
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42] },
                styles: { fontSize: 10, cellPadding: 5 },
            });

            const finalY = doc.lastAutoTable?.finalY || 150;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Thank you for choosing Hidayah International.', 105, finalY + 20, { align: 'center' });
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('This is a computer-generated receipt and requires no signature.', 105, finalY + 30, { align: 'center' });
            doc.save(`Hidayah_Receipt_${t.id}.pdf`);
        } catch (err) {
            console.error('Receipt generation failed:', err);
            toast.error('Failed to generate receipt. Please try again.');
        }
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    if (loadError) return (
        <FetchError message="Couldn't load your wallet and transactions. Please check your connection." onRetry={() => { setLoading(true); fetchData(); }} />
    );

    return (
        <>
            <title>Finance — Hidayah</title>
            <PageHeader title="Finance" description="Your wallet, transactions, and receipts." />

            <div className="grid lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {/* Wallet card */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full" />
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-200 mb-2">Available Credits</p>
                                    <h3 className="text-6xl font-display font-black text-white tracking-tighter">₦{parseFloat(profile?.wallet_balance || 0).toLocaleString()}</h3>
                                </div>
                                <div className="w-16 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                                    <span className="text-white text-xs font-black">PAY</span>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a href="/payment" className="flex-1 py-5 bg-white text-blue-600 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                    <IconPlus size={18} /> Add Funds to Wallet
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Transactions */}
                    <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm">
                        <h4 className="text-xl font-display font-black text-slate-900 mb-8 flex items-center gap-4">
                            <IconTrendingUp size={20} className="text-blue-600" /> Ledger Analytics
                        </h4>
                        <div className="grid gap-4">
                            {transactions.length > 0 ? transactions.map(t => (
                                <div key={t.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-600/30 transition-all shadow-sm">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${t.transaction_type === 'DEPOSIT' ? 'bg-blue-600/10 text-blue-600' : 'bg-red-500/10 text-red-500'}`}>
                                            {t.transaction_type === 'DEPOSIT' ? '+' : '-'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{t.description}</p>
                                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{new Date(t.timestamp || t.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-sm font-black tabular-nums text-slate-900">₦{parseFloat(t.amount).toLocaleString()}</div>
                                        <button onClick={() => handleDownloadReceipt(t)} className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                                            <IconDownload size={10} /> Receipt
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-10 text-center text-slate-500 font-bold italic">No transactions recorded yet.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Card Management</h4>
                        <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden shadow-xl">
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div className="w-8 h-8 rounded-full border border-white/20" />
                                <IconShieldCheck size={18} className="text-blue-400" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                <p className="text-xs font-bold text-white">READY FOR BILLING</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex items-start gap-4 shadow-sm">
                        <IconAlertCircle className="text-blue-500 shrink-0" size={20} />
                        <div>
                            <h5 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Billing Policy</h5>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-bold">Payments are non-refundable after a session has been successfully completed by the assigned tutor.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const PaymentCallback = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [status, setStatus] = useState('verifying'); // verifying, success, failed, error
    const [message, setMessage] = useState('');
    const [paymentData, setPaymentData] = useState(null);
    const { user } = useAuth();
    const autoRedirectTimer = useRef(null);

    // Support wallet payment success passed via navigation state
    useEffect(() => {
        if (location.state?.walletSuccess) {
            setStatus('success');
            setPaymentData(location.state.paymentData || null);
            setMessage('Payment processed successfully using your wallet balance!');
            const destination = user?.role === 'PARENT' ? '/parent' : '/student';
            autoRedirectTimer.current = setTimeout(() => navigate(destination), 7000);
        }
        return () => clearTimeout(autoRedirectTimer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const verifyPayment = async () => {
        // Skip if already handled via wallet navigation state
        if (location.state?.walletSuccess) return;

        const reference = searchParams.get('reference');

        if (!reference) {
            setStatus('failed');
            setMessage('No payment reference found');
            return;
        }

        if (!token) {
            // Token not yet available – redirect to login with return path
            navigate(`/login?next=/payment/callback?reference=${reference}`);
            return;
        }

        try {
            const response = await api.get(
                `/api/payments/verify/${reference}/`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.verified) {
                setStatus('success');
                setPaymentData(response.data);
                setMessage('Payment verified successfully!');

                const destination = user?.role === 'PARENT' ? '/parent' : '/student';
                autoRedirectTimer.current = setTimeout(() => navigate(destination), 7000);
            } else {
                setStatus('failed');
                setMessage('Payment verification failed. Please contact support.');
            }
        } catch (err) {
            console.error("Payment Verification Error:", err);
            // Verification did not complete — this is NOT the same as a failed payment.
            // A 4xx from our API means the gateway rejected the reference; anything else
            // (network error, 5xx) means we simply couldn't confirm yet.
            const isRejected = err.response && err.response.status < 500;
            if (isRejected) {
                const data = err.response.data;
                setStatus('failed');
                setMessage(data.error || data.detail || data.message || 'Payment verification failed.');
            } else {
                setStatus('error');
                setMessage(
                    err.request && !err.response
                        ? 'Network error — we could not reach the server to confirm your payment.'
                        : 'The server could not confirm your payment right now.'
                );
            }
        }
    };

    const retryVerification = () => {
        setStatus('verifying');
        setMessage('');
        verifyPayment();
    };

    useEffect(() => {
        verifyPayment();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const handleDownloadReceipt = async () => {
        if (!paymentData && !location.state?.walletSuccess) return;
        try {
            const { jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
            const doc = new jsPDF();
            
            const pd = paymentData || location.state?.paymentData || {};
            const ref = pd.payment?.reference || pd.reference || searchParams.get('reference') || 'N/A';
            const amount = pd.payment?.amount || pd.amount || location.state?.amount || 0;
            const subject = pd.booking?.subject || pd.subject || location.state?.subject || '';
            const tutorName = pd.booking?.tutor_name || pd.tutor_name || location.state?.tutorName || '';
            const payMethod = pd.payment?.method || location.state?.method || 'Online Payment';

            // Brand Header
            doc.setFillColor(16, 185, 129); // Emerald
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
            doc.text("OFFICIAL TRANSACTION RECEIPT", 20, 55);
            
            doc.setFontSize(10);
            doc.text(`Receipt Date: ${new Date().toLocaleString()}`, 20, 65);
            doc.text(`Reference ID: #${ref}`, 20, 72);
            
            // Grid Data
            const rows = [
                ["Transaction For", `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username],
                ["Email Address", user?.email || "N/A"],
                ["Payment Method", payMethod.toUpperCase()],
                ["Amount Paid", `NGN ${parseFloat(amount).toLocaleString()}`],
                ...(subject ? [["Subject / Class", subject]] : []),
                ...(tutorName ? [["Tutor", tutorName]] : []),
                ["Status", "SUCCESSFUL / VERIFIED"],
            ];
            
            autoTable(doc, {
                startY: 85,
                head: [['Description', 'Detail']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42] },
                styles: { fontSize: 10, cellPadding: 5 }
            });
            
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Thank you for choosing Hidayah International.", 105, doc.lastAutoTable.finalY + 20, { align: "center" });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text("Your booking is now pending tutor approval. Classes will be generated once approved.", 105, doc.lastAutoTable.finalY + 30, { align: "center" });
            
            doc.save(`Hidayah_Receipt_${ref}.pdf`);
        } catch (err) {
            console.error("Receipt generation failed:", err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <Navbar />
            <div className="container pt-32 pb-20 px-4">
                <div className="max-w-md mx-auto">
                    <div className="bg-white rounded-2xl shadow-2xl p-10 border border-slate-100 text-center">
                        {status === 'verifying' && (
                            <>
                                <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifying Payment</h2>
                                <p className="text-slate-600">Please wait while we confirm your payment...</p>
                            </>
                        )}

                        {status === 'success' && (
                            <>
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 animate-bounce">
                                    ✅
                                </div>
                                <h2 className="text-2xl font-bold text-emerald-600 mb-1">Payment Successful!</h2>
                                <p className="text-slate-500 text-sm mb-4">{message}</p>

                                {/* Approval notice */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                                    <p className="text-xs font-bold text-amber-700 mb-1">⏳ Awaiting Tutor Approval</p>
                                    <p className="text-xs text-amber-600 leading-relaxed">
                                        Your payment has been received. Your booking is now waiting for tutor confirmation.
                                        If the tutor is busy, an admin will assign a new tutor for you.
                                        Your classes will be generated once approved.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => { clearTimeout(autoRedirectTimer.current); handleDownloadReceipt(); }}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                                    >
                                        📄 Download Receipt
                                    </button>
                                    <button
                                        onClick={() => { clearTimeout(autoRedirectTimer.current); navigate(user?.role === 'PARENT' ? '/parent' : '/student'); }}
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                                    >
                                        🏠 Go to Dashboard
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-4 animate-pulse">Auto-redirecting to dashboard in a few seconds...</p>
                            </>
                        )}

                        {status === 'error' && (
                            <>
                                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
                                    ⚠️
                                </div>
                                <h2 className="text-2xl font-bold text-amber-600 mb-2">Couldn't Confirm Payment</h2>
                                <p className="text-slate-600 mb-2">{message}</p>
                                <p className="text-sm font-bold text-slate-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
                                    If you have already paid, <span className="text-red-600">do not pay again</span> — your payment is safe and will be confirmed automatically. You can retry now or check your dashboard later.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={retryVerification}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
                                    >
                                        🔄 Retry Verification
                                    </button>
                                    <button
                                        onClick={() => navigate(user?.role === 'PARENT' ? '/parent' : '/student')}
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>
                            </>
                        )}

                        {status === 'failed' && (
                            <>
                                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
                                    ❌
                                </div>
                                <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
                                <p className="text-slate-600 mb-6">{message}</p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all"
                                    >
                                        Try Again
                                    </button>
                                    <button
                                        onClick={() => navigate(user?.role === 'PARENT' ? '/parent' : '/student')}
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentCallback;

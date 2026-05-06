import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const PaymentCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [status, setStatus] = useState('verifying'); // verifying, success, failed
    const [message, setMessage] = useState('');
    const [paymentData, setPaymentData] = useState(null);
    const { user } = useAuth();

    const verifyPayment = async () => {
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
            const response = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL}/api/payments/verify/${reference}/`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.verified) {
                setStatus('success');
                setPaymentData(response.data);
                setMessage('Payment verified successfully!');

                // Redirect to student dashboard after 8 seconds
                setTimeout(() => {
                    navigate('/student');
                }, 8000);
            } else {
                setStatus('failed');
                setMessage('Payment verification failed. Please contact support.');
            }
        } catch (err) {
            setStatus('failed');
            let detailedError = 'Payment verification failed';
            
            if (err.response) {
                // Server responded with an error status
                const data = err.response.data;
                detailedError = data.error || data.detail || data.message || `Server Error (${err.response.status})`;
            } else if (err.request) {
                // No response received (Network error, CORS, server down)
                detailedError = 'Network Error: Cannot connect to server. Please check your internet connection.';
            } else {
                detailedError = err.message;
            }
            
            setMessage(detailedError);
            console.error("Payment Verification Error:", err);
        }
    };

    useEffect(() => {
        verifyPayment();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const handleDownloadReceipt = () => {
        if (!paymentData) return;
        try {
            const doc = new jsPDF();
            
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
            doc.text(`Reference ID: #${paymentData.payment?.reference || searchParams.get('reference')}`, 20, 72);
            
            // Grid Data
            const rows = [
                ["Transaction For", `${user?.first_name} ${user?.last_name || ''}`],
                ["Email Address", user?.email || "N/A"],
                ["Activity Type", (paymentData.payment?.method || "Online Payment").toUpperCase()],
                ["Amount Paid", `NGN ${parseFloat(paymentData.payment?.amount || 0).toLocaleString()}`],
                ["Status", "SUCCESSFUL / VERIFIED"],
                ["Description", "Platform Resource / Tuition Payment"]
            ];
            
            autoTable(doc, {
                startY: 85,
                head: [['Description', 'Detail']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42] }, // Navy
                styles: { fontSize: 10, cellPadding: 5 }
            });
            
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Thank you for choosing Hidayah International.", 105, doc.lastAutoTable.finalY + 20, { align: "center" });
            
            doc.save(`Hidayah_Receipt_${paymentData.payment?.reference || 'payment'}.pdf`);
        } catch (err) {
            console.error("Receipt generation failed:", err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="container pt-32 pb-20 px-4">
                <div className="max-w-md mx-auto">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center">
                        {status === 'verifying' && (
                            <>
                                <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                                <h2 className="text-2xl font-display font-bold text-primary mb-2">Verifying Payment</h2>
                                <p className="text-slate-600">Please wait while we confirm your payment...</p>
                            </>
                        )}

                        {status === 'success' && (
                            <>
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
                                    ✅
                                </div>
                                <h2 className="text-2xl font-display font-bold text-green-600 mb-2">Payment Successful!</h2>
                                <p className="text-slate-600 mb-6">{message}</p>
                                
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleDownloadReceipt}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                                    >
                                        📄 Download Receipt
                                    </button>
                                    <button
                                        onClick={() => navigate('/student')}
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-6 animate-pulse">Auto-redirecting in a few seconds...</p>
                            </>
                        )}

                        {status === 'failed' && (
                            <>
                                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
                                    ❌
                                </div>
                                <h2 className="text-2xl font-display font-bold text-red-600 mb-2">Payment Failed</h2>
                                <p className="text-slate-600 mb-6">{message}</p>
                                <button
                                    onClick={() => navigate('/payment')}
                                    className="bg-primary hover:bg-primary-600 text-white px-8 py-3 rounded-xl font-bold transition-all"
                                >
                                    Try Again
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentCallback;

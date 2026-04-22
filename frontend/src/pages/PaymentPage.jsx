import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const PaymentPage = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [loadAmount, setLoadAmount] = useState('0');
    const [bookingId, setBookingId] = useState(null);
    const [bookingDetail, setBookingDetail] = useState(null);

    const [paymentMethod, setPaymentMethod] = useState('');

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const bId = queryParams.get('booking_id');
        if (bId) {
            setBookingId(bId);
            fetchBookingDetail(bId);
        }
        fetchPaymentStatus();
    }, []);

    const fetchBookingDetail = async (id) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/booking/request/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const booking = res.data.find(b => String(b.id) === String(id));
            if (booking) {
                setBookingDetail(booking);
                setLoadAmount(booking.price);
            }
        } catch (err) {
            console.error("Failed to fetch booking detail", err);
        }
    };

    const fetchPaymentStatus = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/payments/status/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(response.data);
            
            // Priority 1: If user has a booking_id in URL, use that (handled in fetchBookingDetail)
            if (bookingId) return;

            // Priority 2: If student is UNPAID (initial registration), use the profile's calculation
            if (response.data.payment_status === 'UNPAID') {
                setLoadAmount(response.data.total_amount || '0');
            } 
            // Priority 3: If student is PAID but has new pending bookings, suggest paying for them
            else if (response.data.unpaid_bookings_total > 0) {
                setLoadAmount(response.data.unpaid_bookings_total);
            }
            // Priority 4: Default to empty or 0 for general top-up
            else {
                setLoadAmount('0');
            }
        } catch (err) {
            setError('Failed to load payment information');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!paymentMethod) {
            setError('Please select a payment method first');
            return;
        }
        setProcessing(true);
        setError('');

        try {
            const endpoint = bookingId 
                ? `${import.meta.env.VITE_API_BASE_URL}/api/payments/booking/initiate/${bookingId}/`
                : `${import.meta.env.VITE_API_BASE_URL}/api/payments/initiate/`;
            
            const payload = bookingId 
                ? { booking_id: bookingId }
                : { amount: loadAmount, method: paymentMethod };

            const response = await axios.post(endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });

            if (response.data.success) {
                window.location.href = response.data.authorization_url;
            } else {
                setError(response.data.error || 'Payment initialization failed');
                setProcessing(false);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to initialize payment');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-2xl shadow-emerald-500/20"></div>
                    <p className="text-emerald-500 font-black uppercase tracking-[0.3em] text-xs">Accessing Gateway...</p>
                </div>
            </div>
        );
    }

    const methods = [
        { id: 'card', name: 'Debit/Credit Card', icon: '💳', desc: 'Secure payment via Visa, Mastercard, or Verve' },
        { id: 'transfer', name: 'Bank Transfer', icon: '🏦', desc: 'Transfer directly to a dedicated bank account' },
        { id: 'ussd', name: 'USSD / QR Code', icon: '📱', desc: 'Dial a code on your phone or scan to pay' }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-500/30">
            <Navbar />
            
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="container pt-32 pb-20 px-4 relative z-10">
                <div className="max-w-4xl mx-auto grid lg:grid-cols-5 gap-8">
                    
                    {/* Left Column: Summary & Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                Payment Summary
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Student Portal</p>
                                    <h3 className="text-xl font-display font-bold text-white leading-tight">{user?.first_name} {user?.last_name}</h3>
                                    <p className="text-xs font-mono text-emerald-500/60 mt-1">ID: {user?.admission_number || 'TBA'}</p>
                                </div>

                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3">Wallet Balance</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-white">₦{parseFloat(profile?.wallet_balance || 0).toLocaleString()}</span>
                                        <span className="text-[10px] text-emerald-500 font-bold">Current</span>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">Processing Fee</span>
                                        <span className="text-slate-300 font-bold">₦0.00</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">Total Charged</span>
                                        <span className="text-lg font-black text-emerald-500">₦{parseFloat(loadAmount || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-emerald-600/5 backdrop-blur-md border border-emerald-500/10 rounded-[2rem] p-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
                                🛡️ Secure Gateway
                            </h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                Your payment is processed securely via Paystack. We do not store your card details or sensitive bank information.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Checkout Form */}
                    <div className="lg:col-span-3">
                        <div className="bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl p-10 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>
                            
                            <h1 className="text-3xl font-display font-black text-white mb-2">
                                {bookingId ? 'Secure Booking Payment' : 'Fund Wallet'}
                            </h1>
                            <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed">
                                {bookingId 
                                    ? `You are paying for ${bookingDetail?.subject || 'Class'} with ${bookingDetail?.tutor_name || 'Tutor'}.` 
                                    : 'Select your preferred payment method and enter the amount.'}
                            </p>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <span className="text-xl">⚠️</span>
                                    <p className="text-red-400 font-bold text-xs">{error}</p>
                                </div>
                            )}

                            <div className="space-y-8">
                                {/* Amount Input */}
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Input Top-up Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-500/40">₦</span>
                                        <input
                                            type="number"
                                            value={loadAmount}
                                            onChange={(e) => setLoadAmount(e.target.value)}
                                            readOnly={!!bookingId || profile?.payment_status === 'UNPAID'}
                                            className={`w-full bg-white/5 border-2 border-white/5 rounded-3xl p-6 pl-12 font-black text-3xl text-white outline-none focus:border-emerald-500/30 focus:bg-white/10 transition-all ${bookingId || profile?.payment_status === 'UNPAID' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {!bookingId && profile?.payment_status !== 'UNPAID' && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {['5000', '10000', '25000', '50000'].map(amt => (
                                                <button 
                                                    key={amt}
                                                    onClick={() => setLoadAmount(amt)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${loadAmount === amt ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                                                >
                                                    ₦{parseInt(amt).toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Method Selector */}
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Choose Payment Method</label>
                                    <div className="grid gap-4">
                                        {methods.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setPaymentMethod(m.id)}
                                                className={`flex items-center gap-5 p-5 rounded-[2rem] border-2 transition-all group ${paymentMethod === m.id ? 'bg-emerald-500/10 border-emerald-500 shadow-xl shadow-emerald-500/10' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                            >
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg transition-transform group-hover:scale-110 ${paymentMethod === m.id ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                    {m.icon}
                                                </div>
                                                <div className="text-left flex-1">
                                                    <h4 className={`font-black uppercase tracking-widest text-[11px] ${paymentMethod === m.id ? 'text-emerald-500' : 'text-white'}`}>{m.name}</h4>
                                                    <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1">{m.desc}</p>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === m.id ? 'border-emerald-500 bg-emerald-500' : 'border-white/10'}`}>
                                                    {paymentMethod === m.id && <span className="text-white text-[10px] font-black">✓</span>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Pay Button */}
                                <button
                                    onClick={handlePayment}
                                    disabled={processing || !loadAmount || loadAmount < 100 || !paymentMethod}
                                    className={`w-full group/btn relative py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden ${
                                        !paymentMethod 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                                    }`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                                    {processing ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="text-xl">⚡</span>
                                            {paymentMethod ? `Proceed to ${paymentMethod === 'card' ? 'Secure Checkout' : 'Provider'} →` : 'Select a Method First'}
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center justify-center gap-6 mt-10 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
                                <span className="bg-white/80 p-2 rounded-lg text-slate-900 font-black text-[9px] uppercase tracking-tighter">Paystack</span>
                                <span className="text-[14px]">💳</span>
                                <span className="text-[14px]">🏦</span>
                                <span className="text-[14px]">🔒</span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/student')}
                            className="w-full mt-8 text-slate-500 hover:text-emerald-500 py-3 font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Learning Portal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;

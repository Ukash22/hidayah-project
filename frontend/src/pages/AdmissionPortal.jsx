import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const AdmissionPortal = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !token) {
            navigate('/login');
            return;
        }
        fetchProfile();
    }, [user, token]);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/me/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(response.data);

            // If already paid, redirect to dashboard
            if (response.data.payment_status === 'PAID') {
                navigate('/student');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-primary font-bold">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="container pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Welcome Header */}
                    <div className="bg-gradient-to-r from-primary to-primary-600 rounded-[2.5rem] shadow-2xl p-10 mb-8 text-white">
                        <h1 className="text-4xl font-display font-bold mb-2">Welcome, {user?.first_name}!</h1>
                        <p className="text-white/80 text-lg">Admission Number: <span className="font-mono font-bold">{user?.admission_number}</span></p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Admission Letter Card */}
                        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100">
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                                    📄
                                </div>
                                <h2 className="text-2xl font-display font-bold text-primary mb-2">Admission Letter</h2>
                                <p className="text-slate-600 text-sm">Your official admission document</p>
                            </div>

                            {profile?.admission_letter_url ? (
                                <a
                                    href={profile.admission_letter_url}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-sm shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-center"
                                >
                                    ⬇ Download PDF
                                </a>
                            ) : (
                                <div className="text-center text-slate-400 italic text-sm">
                                    Generating your admission letter...
                                </div>
                            )}
                        </div>

                        {/* Payment Status Card */}
                        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100">
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                                    💳
                                </div>
                                <h2 className="text-2xl font-display font-bold text-primary mb-2">Payment Status</h2>
                                <span className="inline-block bg-amber-100 text-amber-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                                    {profile?.payment_status || 'UNPAID'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Total Amount:</span>
                                    <span className="font-bold text-primary text-lg">₦{profile?.total_amount?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Reference:</span>
                                    <span className="font-mono font-bold text-slate-800 text-xs">{profile?.payment_reference}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/payment')}
                                className="w-full bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-sm shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                Pay Now →
                            </button>
                        </div>
                    </div>

                     {/* Dashboard Access Information */}
                    <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-[2.5rem] p-8 text-center">
                        <div className="flex flex-col md:flex-row items-center gap-6 text-left">
                            <div className="text-6xl mx-auto md:mx-0">🔓</div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-display font-bold text-blue-900 mb-2">Welcome to your Dashboard!</h3>
                                <p className="text-blue-700 mb-4 font-medium leading-relaxed italic">
                                    Your admission is successful! To maintain active access to the learning environment, your wallet must stay funded.
                                </p>
                                
                                <div className="grid md:grid-cols-2 gap-4 mt-8 mb-8">
                                    <div className="bg-white/60 p-6 rounded-3xl border border-blue-100 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-blue-900 mb-2">Class Rate</h4>
                                        <p className="text-2xl font-black text-blue-600">₦1,000 <span className="text-[10px] text-blue-400 font-normal">/ Per Session</span></p>
                                        <p className="text-[10px] text-blue-500 mt-2 font-bold italic leading-tight">
                                            * Minimum ₦1,000 wallet balance is required to unlock learning materials, exams, and join live classes.
                                        </p>
                                    </div>
                                    <div className="bg-white/60 p-6 rounded-3xl border border-blue-100 shadow-sm">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-blue-900 mb-2">Platform Guidelines</h4>
                                        <ul className="text-[10px] text-blue-700 space-y-2 font-bold uppercase tracking-tight">
                                            <li className="flex items-center gap-2">🔹 NO REFUNDS AFTER ENROLLMENT</li>
                                            <li className="flex items-center gap-2">🔹 1,000 MINIMUM BALANCE ALWAYS</li>
                                            <li className="flex items-center gap-2">🔹 PAYMENTS ARE END-TO-END ENCRYPTED</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <button 
                                        onClick={() => navigate('/student')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95"
                                    >
                                        Enter Dashboard Now →
                                    </button>
                                    <button 
                                        onClick={() => navigate('/payment')}
                                        className="bg-white text-blue-600 border-2 border-blue-200 hover:border-blue-400 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95"
                                    >
                                        Add Funds to Wallet
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdmissionPortal;

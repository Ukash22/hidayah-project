
import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
    const { uidb64, token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/password-reset/confirm/`, {
                uidb64,
                token,
                password
            });
            setMessage("Password reset successful! Redirecting to login...");
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || "Invalid or expired reset link.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface">
            <Navbar />
            <div className="container pt-32 pb-20">
                <div className="max-w-md mx-auto bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 text-2xl font-black shadow-inner">🔑</div>
                        <h2 className="text-3xl font-display text-primary mb-2">Set New Password</h2>
                        <p className="text-text-light text-sm">Please create a strong password.</p>
                    </div>

                    {message && (
                        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-xs font-bold border border-emerald-100 mb-6">
                            ✅ {message}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 mb-6">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-primary ml-1">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-primary ml-1">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group bg-primary hover:bg-primary-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.25em] text-sm shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? 'Resetting...' : 'Update Password →'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;

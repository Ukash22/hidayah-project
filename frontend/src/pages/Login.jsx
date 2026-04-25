import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(formData.username, formData.password);
            console.log("Login metadata:", {
                full_response: data,
                user_obj: data.user,
                user_role: data.user?.role
            });

            const userRole = (data.user?.role || '').toUpperCase();
            console.log("Extracted Role:", userRole);

            // Redirect based on role
            if (userRole === 'ADMIN') {
                // Force reload to ensure fresh auth state/token lookup for admin
                window.location.href = '/admin';
            }
            else if (userRole === 'TUTOR') navigate('/tutor');
            else if (userRole === 'PARENT') navigate('/parent');
            else navigate('/student'); // Dashboard will handle locked state check
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to login. Please check credentials.');
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
                        <img src="/logo.png" alt="Hidayah International" className="w-32 h-32 object-contain mx-auto mb-6 drop-shadow-xl" />
                        <h2 className="text-3xl font-display text-primary mb-2 font-black tracking-tighter">Welcome Back</h2>
                        <p className="text-text-light text-[10px] uppercase tracking-[0.2em] font-black opacity-50">Hidayah International Portal Access</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 mb-6 animate-pulse">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-primary ml-1">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="Enter your username"
                                className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-primary ml-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                                className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700"
                            />
                            <div className="flex justify-end mt-2">
                                <a href="/forgot-password" className="text-[10px] font-bold text-slate-400 hover:text-primary uppercase tracking-widest">
                                    Forgot Password?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group bg-primary hover:bg-primary-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.25em] text-sm shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? 'Authenticating...' : 'Access Portal →'}
                        </button>
                    </form>

                    <p className="text-center mt-10 text-xs text-text-light font-bold">
                        Need an account? <Link to="/register" className="text-secondary font-black hover:underline uppercase ml-1">Register Now</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

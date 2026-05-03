import { useState } from 'react';
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
            const userRole = (data.user?.role || '').toUpperCase();

            // Redirect based on role or staff status
            if (userRole === 'ADMIN' || data.user?.is_superuser || data.user?.is_staff) {
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
                                <Link to="/forgot-password" name="forgot-password" className="text-[10px] font-bold text-slate-400 hover:text-primary uppercase tracking-widest">
                                    Forgot Password?
                                </Link>
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

                    <div className="mt-10 pt-6 border-t border-slate-50">
                        <p className="text-center text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Need an account? Register Now</p>
                        <div className="grid grid-cols-2 gap-4">
                            <Link 
                                to="/tutor/register" 
                                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-all group"
                            >
                                <span className="text-lg group-hover:scale-110 transition-transform">👨‍🏫</span>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Become a Tutor</span>
                            </Link>
                            <Link 
                                to="/register" 
                                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 transition-all group"
                            >
                                <span className="text-lg group-hover:scale-110 transition-transform">🎓</span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Enroll Student</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

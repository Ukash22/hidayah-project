import { useState } from 'react';
import { getApiError } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
            setError(getApiError(err, 'Failed to login. Please check credentials.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface">
            <title>Sign In — Hidayah</title>
            <Navbar />
            <div className="container pt-32 pb-20">
                <div className="max-w-md mx-auto bg-white rounded-card-lg shadow-2xl p-10 border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="text-center mb-10">
                        <img src="/logo.png" alt="Hidayah International" className="w-32 h-32 object-contain mx-auto mb-6 drop-shadow-xl" />
                        <h2 className="text-3xl font-display text-primary mb-2 font-bold tracking-tighter">Welcome Back</h2>
                        <p className="text-text-light text-[10px] uppercase tracking-[0.2em] font-semibold opacity-50">Hidayah International Portal Access</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 mb-6">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="login_username" className="block text-[10px] font-semibold uppercase tracking-widest mb-2 text-primary ml-1">Username</label>
                            <input
                                type="text"
                                name="username"
                                id="login_username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="Enter your username"
                                className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-[10px] font-semibold uppercase tracking-widest mb-2 text-primary ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    id="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="w-full px-5 py-3.5 pr-12 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 transition-all font-bold text-slate-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-2">
                                <Link to="/forgot-password" name="forgot-password" className="text-[10px] font-bold text-slate-500 hover:text-primary uppercase tracking-widest">
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group bg-primary hover:bg-primary-600 text-white py-5 rounded-2xl font-bold uppercase tracking-[0.25em] text-sm shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? 'Authenticating...' : 'Access Portal →'}
                        </button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-slate-50">
                        <p className="text-center text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-4">Need an account? Register Now</p>
                        <div className="grid grid-cols-2 gap-4">
                            <Link 
                                to="/tutor/register" 
                                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-all group"
                            >
                                <span className="text-lg group-hover:scale-110 transition-transform">👨‍🏫</span>
                                <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-tighter">Become a Tutor</span>
                            </Link>
                            <Link 
                                to="/register" 
                                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 transition-all group"
                            >
                                <span className="text-lg group-hover:scale-110 transition-transform">🎓</span>
                                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-tighter">Enroll Student</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

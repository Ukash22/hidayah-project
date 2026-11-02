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
            const username = (formData.username || '').trim();
            const data = await login(username, formData.password);
            const userRole = (data.user?.role || '').toUpperCase();

            // Redirect based on role, superuser/staff status, or admin identifier
            const isAdmin = userRole === 'ADMIN' || 
                Boolean(data.user?.is_superuser || data.user?.is_staff) ||
                username.toLowerCase() === 'admin' ||
                username.toLowerCase() === 'admin@hidayah.com';

            if (isAdmin) {
                navigate('/admin');
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
        <div className="h-screen max-h-screen overflow-hidden bg-surface flex flex-col">
            <title>Sign In — Hidayah</title>
            <Navbar />
            <div className="flex-1 flex items-center justify-center px-4 pt-16 pb-4 overflow-y-auto sm:overflow-hidden">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-300 my-auto">
                    <div className="text-center mb-5">
                        <img src="/logo.png" alt="Hidayah International" className="w-14 h-14 sm:w-16 sm:h-16 object-contain mx-auto mb-2 drop-shadow-md" />
                        <h2 className="text-2xl sm:text-3xl font-display text-primary font-bold tracking-tight">Welcome Back</h2>
                        <p className="text-text-light text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold opacity-60">Hidayah International Portal Access</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 px-3.5 py-2 rounded-xl text-xs font-bold border border-red-100 mb-4 animate-shake">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="login_username" className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 text-primary ml-1">Username or Email</label>
                            <input
                                type="text"
                                name="username"
                                id="login_username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck="false"
                                placeholder="Enter username or email"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none transition-all font-semibold text-slate-800 text-sm"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5 ml-1">
                                <label htmlFor="password" className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">Password</label>
                                <Link to="/forgot-password" name="forgot-password" className="text-[10px] sm:text-[11px] font-semibold text-slate-500 hover:text-primary tracking-wide">
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    id="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all font-semibold text-slate-800 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-dark text-white py-3 sm:py-3.5 rounded-xl font-bold uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                        >
                            {loading ? 'Authenticating...' : 'Access Portal →'}
                        </button>
                    </form>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                        <p className="text-center text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2.5">Need an account?</p>
                        <div className="grid grid-cols-2 gap-2.5">
                            <Link 
                                to="/tutor/register" 
                                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 transition-all group border border-indigo-100/60"
                            >
                                <span className="text-sm group-hover:scale-110 transition-transform">👨‍🏫</span>
                                <span className="text-[10px] sm:text-[11px] font-bold tracking-tight">Become a Tutor</span>
                            </Link>
                            <Link 
                                to="/register" 
                                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 transition-all group border border-emerald-100/60"
                            >
                                <span className="text-sm group-hover:scale-110 transition-transform">🎓</span>
                                <span className="text-[10px] sm:text-[11px] font-bold tracking-tight">Enroll Student</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

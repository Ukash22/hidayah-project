import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar as IconCalendar, Clock as IconClock, User as IconUser } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';

const RescheduleModal = lazy(() => import('../../components/RescheduleModal'));

export default function StudentClasses() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [classes, setClasses] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [selectedSessionType, setSelectedSessionType] = useState('REGULAR');

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [classRes, profRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/classes/sessions/`, { headers: getAuthHeader() }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/me/`, { headers: getAuthHeader() }),
            ]);
            setClasses(Array.isArray(classRes.data) ? classRes.data : classRes.data.classes || []);
            setProfile(profRes.data);
        } catch (err) {
            console.error('Classes fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleJoinClass = useCallback(async (cls) => {
        const sessionId = cls.db_id || cls.id;
        if (!sessionId) { alert('Invalid session ID'); return; }
        axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/classes/session/${sessionId}/start/`, {}, { headers: getAuthHeader() })
            .catch(e => { if (!axios.isCancel(e)) console.warn('Join notify failed:', e.message); });
        navigate(`/live/${sessionId}`);
    }, [getAuthHeader, navigate]);

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>My Classes — Hidayah</title>
            <PageHeader title="Live Learning Sessions" description="Your upcoming and scheduled class sessions." />

            <div className="space-y-6">
                {classes.length > 0 ? classes.map((cls, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-[2.5rem] p-10 flex flex-col lg:flex-row justify-between items-center gap-10 hover:border-blue-600/30 transition-all shadow-sm">
                        <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner ring-1 ring-slate-100">🏫</div>
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{cls.type || 'REGULAR COURSE'}</p>
                                <h4 className="text-3xl font-display font-black text-slate-900 mb-3">{cls.subject}</h4>
                                <div className="flex flex-wrap gap-4 font-bold text-[10px] text-slate-400 uppercase bg-slate-50 p-3 rounded-2xl w-fit">
                                    <span className="flex items-center gap-2"><IconCalendar size={12} className="text-blue-600" /> {new Date(cls.scheduled_at).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-2"><IconClock size={12} className="text-indigo-600" /> {new Date(cls.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="flex items-center gap-2"><IconUser size={12} className="text-sky-600" /> Tutor: {cls.tutor_name}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                            <button
                                onClick={() => { setSelectedSessionId(cls.db_id); setSelectedSessionType(cls.type || 'REGULAR'); setShowRescheduleModal(true); }}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest transition-all shadow-sm"
                            >
                                Reschedule
                            </button>
                            <button
                                onClick={() => handleJoinClass(cls)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
                            >
                                Join Live Class →
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="py-32 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-blue-600/5 rounded-full flex items-center justify-center text-3xl mx-auto mb-8 animate-pulse">
                            {profile?.wallet_balance <= 0 ? '🔒' : '📅'}
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">{profile?.wallet_balance <= 0 ? 'Access Locked' : 'No Classes Scheduled'}</h4>
                        <p className="text-slate-400 font-bold italic max-w-md mx-auto">
                            {profile?.wallet_balance <= 0
                                ? 'Please fund your wallet to access your live classes.'
                                : 'No classes are currently scheduled. Check back later.'}
                        </p>
                        {profile?.wallet_balance <= 0 && (
                            <button onClick={() => navigate('/student/finance')} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg">
                                Top Up Wallet
                            </button>
                        )}
                    </div>
                )}
            </div>

            <Suspense fallback={null}>
                <RescheduleModal
                    isOpen={showRescheduleModal}
                    onClose={() => setShowRescheduleModal(false)}
                    sessionId={selectedSessionId}
                    sessionType={selectedSessionType}
                    initiatedBy="STUDENT"
                    token={token}
                    onSuccess={fetchData}
                />
            </Suspense>
        </>
    );
}

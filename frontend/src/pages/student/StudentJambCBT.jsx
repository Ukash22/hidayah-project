import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';

const JambCBT = lazy(() => import('../../components/JambCBT'));

const JAMB_LEVELS = ['JAMB', 'WAEC', 'NECO', 'JUNIOR_WAEC'];
const JAMB_KEYWORDS = ['Prep', 'JAMB', 'WAEC', 'NECO', 'BECE'];

export default function StudentJambCBT() {
    const { token } = useAuth();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/me/`, { headers: getAuthHeader() })
            .then(res => setProfile(res.data))
            .catch(err => console.error('Profile fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    const hasAccess = profile && (
        JAMB_LEVELS.includes(profile.level) ||
        (profile.enrolled_course && JAMB_KEYWORDS.some(k => profile.enrolled_course.includes(k)))
    );

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!hasAccess) return (
        <>
            <title>JAMB CBT — Hidayah</title>
            <PageHeader title="JAMB CBT Simulator" />
            <div className="py-24 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                <div className="w-20 h-20 bg-blue-600/5 rounded-full flex items-center justify-center text-3xl mx-auto mb-8">🎯</div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Not applicable</h4>
                <p className="text-slate-400 font-bold italic max-w-sm mx-auto">The JAMB CBT module is available to students enrolled in JAMB, WAEC, NECO, or BECE preparation programmes.</p>
            </div>
        </>
    );

    return (
        <>
            <title>JAMB CBT — Hidayah</title>
            <PageHeader title="JAMB CBT Simulator" description="Practice mode for JAMB, WAEC, NECO and BECE examinations." />
            <Suspense fallback={<div className="py-20 text-center text-slate-400 font-black animate-pulse uppercase tracking-[0.3em]">Initializing CBT...</div>}>
                <JambCBT token={token} studentProfile={profile} />
            </Suspense>
        </>
    );
}

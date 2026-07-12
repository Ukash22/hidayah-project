import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

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
        api.get(`/api/students/me/`)
            .then(res => setProfile(res.data))
            .catch(err => console.error('Profile fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    const hasAccess = profile && (
        JAMB_LEVELS.includes(profile.level) ||
        (profile.enrolled_course && JAMB_KEYWORDS.some(k => profile.enrolled_course.includes(k)))
    );

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    if (!hasAccess) return (
        <>
            <title>JAMB CBT — Hidayah</title>
            <PageHeader title="JAMB CBT Simulator" />
            <div className="py-24 text-center bg-slate-50 dark:bg-slate-800/60 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-3xl mx-auto mb-8">🎯</div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Not applicable</h4>
                <p className="text-slate-500 font-bold italic max-w-sm mx-auto">The JAMB CBT module is available to students enrolled in JAMB, WAEC, NECO, or BECE preparation programmes.</p>
            </div>
        </>
    );

    return (
        <>
            <title>JAMB CBT — Hidayah</title>
            <PageHeader title="JAMB CBT Simulator" description="Practice mode for JAMB, WAEC, NECO and BECE examinations." />
            <Suspense fallback={<div className="py-20 text-center text-slate-500 font-bold animate-pulse uppercase tracking-[0.3em]">Initializing CBT...</div>}>
                <JambCBT token={token} studentProfile={profile} />
            </Suspense>
        </>
    );
}

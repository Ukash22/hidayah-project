import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import api, { asList } from '../services/api';
import { PageHeader } from '../components/layout';
import { EmptyState, SkeletonCard, FetchError } from '../components/ui';

export default function NotificationsPage() {
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchData = useCallback(() => {
        api.get('/api/auth/notifications/')
            .then(res => { setItems(asList(res.data)); setLoadError(false); })
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const markRead = async (n) => {
        if (n.is_read) return;
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
        api.post(`/api/auth/notifications/${n.id}/read/`).catch(() => { /* optimistic */ });
    };

    // Resolve links like "/admin/classes" relative to the CURRENT portal
    const portal = `/${location.pathname.split('/')[1]}`;
    const resolveLink = (link) => {
        if (!link) return null;
        return link.startsWith('/') ? link : `${portal}/${link}`;
    };

    if (loading) return (
        <div className="space-y-3 p-4">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
    );

    if (loadError) return (
        <FetchError message="Couldn't load notifications." onRetry={() => { setLoadError(false); setLoading(true); fetchData(); }} />
    );

    return (
        <>
            <title>Notifications — Hidayah</title>
            <PageHeader title="Notifications" description="Your latest platform updates." />

            <div className="space-y-3 max-w-3xl">
                {items.length === 0 ? (
                    <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
                ) : items.map(n => (
                    <div
                        key={n.id}
                        onClick={() => markRead(n)}
                        className={`bg-white dark:bg-slate-900 border rounded-card p-5 transition-all cursor-pointer ${n.is_read ? 'border-slate-100 dark:border-slate-800 opacity-70' : 'border-primary/30 shadow-sm'}`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    {!n.is_read && <span className="w-2 h-2 bg-primary rounded-full shrink-0" />}
                                    {n.title}
                                </h4>
                                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                                <div className="flex items-center gap-4 mt-3">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        {new Date(n.created_at).toLocaleString()}
                                    </span>
                                    {resolveLink(n.link) && (
                                        <Link to={resolveLink(n.link)} className="text-[11px] font-semibold uppercase tracking-wide text-primary hover:underline">
                                            View →
                                        </Link>
                                    )}
                                </div>
                            </div>
                            {n.is_read && <Check size={16} className="text-slate-300 shrink-0 mt-1" />}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

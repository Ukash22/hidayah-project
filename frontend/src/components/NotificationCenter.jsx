import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { getAccess } from '../services/tokenStore';
import api from '../services/api';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from './ui';

const NotificationCenter = () => {
    const location = useLocation();
    const [notifications, setNotifications] = useState([]);
    const getAuthHeader = () => {
        const token = getAccess();
        return token ? { Authorization: `Bearer ${token}` } : {};
    };
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);

    const openDropdown = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const panelW = 320, margin = 8;
            // Open to the right of the button; flip left if it would overflow
            let left = rect.right + margin;
            if (left + panelW > window.innerWidth) {
                left = Math.max(margin, rect.left - panelW - margin);
            }
            // Align top with the button; clamp so panel stays above viewport bottom
            let top = rect.top;
            if (top + 480 > window.innerHeight - margin) {
                top = Math.max(margin, window.innerHeight - 480 - margin);
            }
            setDropPos({ top, left });
        }
        setShowDropdown(v => !v);
    };

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get(`/api/auth/notifications/`, {
                headers: getAuthHeader()
            });
            if (Array.isArray(res.data)) {
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.is_read).length);
            } else {
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            await api.post(`/api/auth/notifications/${id}/read/`, {}, {
                headers: getAuthHeader()
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/api/auth/notifications/read-all/', {}, { headers: getAuthHeader() });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    return (
        <div className="relative">
            <button
                ref={btnRef}
                onClick={openDropdown}
                className="relative p-2 text-slate-500 hover:text-primary transition-colors"
                aria-label="Notifications"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-secondary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {createPortal(
                <AnimatePresence>
                    {showDropdown && (
                        <>
                            {/* Backdrop — closes panel on outside click */}
                            <div
                                className="fixed inset-0 z-[9998]"
                                onClick={() => setShowDropdown(false)}
                            />
                            {/* Panel at fixed viewport coords — escapes sidebar overflow clipping */}
                            <motion.div
                                initial={{ opacity: 0, x: -8, scale: 0.96 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -8, scale: 0.96 }}
                                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                style={{ top: dropPos.top, left: dropPos.left, width: 320 }}
                                className="fixed z-[9999] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/60">
                                    <h3 className="font-bold text-primary text-sm">Notifications</h3>
                                    <div className="flex items-center gap-3">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllRead}
                                                className="text-[10px] font-semibold text-secondary hover:text-primary uppercase tracking-wide transition-colors"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                            {unreadCount} Unread
                                        </span>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <EmptyState
                                            icon={Bell}
                                            title="All caught up"
                                            description="No notifications yet. We'll let you know when something happens."
                                            className="py-10"
                                        />
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => !n.is_read && markAsRead(n.id)}
                                                className={`p-4 border-b border-slate-50 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1 gap-2">
                                                    <h4 className={`text-xs font-bold leading-snug flex-1 min-w-0 break-words ${!n.is_read ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {n.title}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                                                        {new Date(n.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words whitespace-pre-wrap">
                                                    {n.message}
                                                </p>
                                                {!n.is_read && (
                                                    <div className="mt-2 flex justify-end">
                                                        <div className="w-1.5 h-1.5 bg-secondary rounded-full" />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-6">
                                    <button
                                        onClick={fetchNotifications}
                                        className="text-[11px] font-semibold text-primary hover:text-secondary uppercase tracking-wide transition-colors"
                                    >
                                        Refresh
                                    </button>
                                    <Link
                                        to={`/${location.pathname.split('/')[1] || 'student'}/notifications`}
                                        onClick={() => setShowDropdown(false)}
                                        className="text-[11px] font-semibold text-primary hover:text-secondary uppercase tracking-wide transition-colors"
                                    >
                                        View All →
                                    </Link>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default NotificationCenter;

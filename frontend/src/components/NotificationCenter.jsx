import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationCenter = () => {
    const { getAuthHeader: getContextAuthHeader } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [showAll, setShowAll] = useState(false);
    
    const getAuthHeader = () => {
        const token = localStorage.getItem('access');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounts/notifications/`, {
                headers: getAuthHeader()
            });
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.is_read).length);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/accounts/notifications/${id}/read/`, {}, {
                headers: getAuthHeader()
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-slate-400 hover:text-primary transition-colors"
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

            <AnimatePresence>
                {showDropdown && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowDropdown(false)}
                        ></div>
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                        >
                            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-primary text-sm">Notifications</h3>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unreadCount} Unread</span>
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <p className="text-xs">No updates yet. Check back soon!</p>
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div
                                            key={n.id}
                                            className={`p-4 border-b border-slate-50 transition-colors hover:bg-slate-50 cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                                            onClick={() => !n.is_read && markAsRead(n.id)}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-xs font-bold ${!n.is_read ? 'text-primary' : 'text-slate-600'}`}>{n.title}</h4>
                                                <span className="text-[9px] text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{n.message}</p>
                                            {!n.is_read && (
                                                <div className="mt-2 flex justify-end">
                                                    <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-3 bg-slate-50 text-center">
                                <button
                                    onClick={fetchNotifications}
                                    className="text-[10px] font-black text-primary hover:text-secondary uppercase tracking-widest transition-colors"
                                >
                                    Refresh All
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;

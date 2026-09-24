import { useState, useEffect, useCallback } from 'react';
import api, { asList } from '../../services/api';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { StatusBadge, getCountryFlag } from './adminHelpers';
import { SkeletonTable } from '../../components/ui';
import {
    Eye, FileText, Download, ExternalLink, Video, Volume2,
    Calendar, Clock, Mail, Phone, MapPin, GraduationCap,
    Monitor, Wifi, CheckCircle2, XCircle, AlertCircle, X,
    Award, Briefcase, DollarSign, Globe, User, Search,
    Sparkles, ArrowRight
} from 'lucide-react';

export default function AdminRecruitment() {
    const toast = useToast();
    const confirm = useConfirm();
    const [tutorApps, setTutorApps] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [activeTab, setActiveTab] = useState('files');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Schedule / Update Modal state
    const [scheduleModal, setScheduleModal] = useState({
        open: false,
        app: null,
        isUpdate: false,
        time: '',
        link: '',
        useInternal: true,
    });

    // Reject Modal state
    const [rejectModal, setRejectModal] = useState({
        open: false,
        app: null,
        reason: '',
    });

    // In-modal document/media previewer
    const [previewDoc, setPreviewDoc] = useState(null);

    const fetchTutorApps = useCallback(async () => {
        try {
            const res = await api.get('/api/tutors/admin/list/');
            const apps = asList(res.data);
            setTutorApps(apps);

            // Update selectedApp if it's currently open
            setSelectedApp(curr => {
                if (!curr) return null;
                return apps.find(a => a.id === curr.id) || curr;
            });
        } catch (err) {
            console.error('Tutor apps fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTutorApps();
    }, [fetchTutorApps]);

    // Open Schedule / Update Dialog
    const handleOpenSchedule = (app, isUpdate = false) => {
        let initialTime = '';
        if (app.interview_at) {
            try {
                initialTime = new Date(app.interview_at).toISOString().slice(0, 16);
            } catch {
                initialTime = '';
            }
        } else {
            const tomorrow = new Date(Date.now() + 86400000);
            tomorrow.setHours(10, 0, 0, 0);
            initialTime = tomorrow.toISOString().slice(0, 16);
        }

        setScheduleModal({
            open: true,
            app,
            isUpdate,
            time: initialTime,
            link: app.interview_link || '',
            useInternal: !app.interview_link,
        });
    };

    // Submit Schedule / Update
    const handleSubmitSchedule = async (e) => {
        e.preventDefault();
        const { app, isUpdate, time, link, useInternal } = scheduleModal;
        if (!time) {
            toast.error('Please specify the interview date and time.');
            return;
        }

        try {
            setActionLoading(true);
            const payload = {
                action: 'INTERVIEW',
                interview_at: time,
                interview_link: useInternal ? '' : link,
                generate_zoom: useInternal,
            };
            const res = await api.post(`/api/tutors/admin/action/${app.id}/`, payload);
            toast.success(isUpdate ? 'Interview schedule updated successfully!' : 'Interview scheduled successfully!');

            setScheduleModal({ open: false, app: null, isUpdate: false, time: '', link: '', useInternal: true });
            await fetchTutorApps();

            if (selectedApp && selectedApp.id === app.id) {
                setSelectedApp(prev => ({
                    ...prev,
                    status: 'INTERVIEW_SCHEDULED',
                    interview_at: time,
                    interview_link: res.data?.link || (useInternal ? '' : link),
                }));
            }
        } catch (err) {
            toast.error('Scheduling failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    // Direct Approve
    const handleApprove = async (app) => {
        if (!await confirm(`Approve ${app.name}? Official appointment letter will be generated and sent via email.`, { confirmLabel: 'Approve Tutor' })) return;
        try {
            setActionLoading(true);
            await api.post(`/api/tutors/admin/action/${app.id}/`, { action: 'APPROVE' });
            toast.success(`${app.name} has been approved as an official tutor!`);
            await fetchTutorApps();

            if (selectedApp && selectedApp.id === app.id) {
                setSelectedApp(prev => ({ ...prev, status: 'APPROVED' }));
            }
        } catch (err) {
            toast.error('Failed to approve tutor: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    // Open Reject Dialog
    const handleOpenReject = (app) => {
        setRejectModal({
            open: true,
            app,
            reason: '',
        });
    };

    // Submit Reject
    const handleSubmitReject = async (e) => {
        e.preventDefault();
        const { app, reason } = rejectModal;
        if (!reason.trim()) {
            toast.error('Please enter a rejection reason for the applicant.');
            return;
        }

        try {
            setActionLoading(true);
            await api.post(`/api/tutors/admin/action/${app.id}/`, { action: 'REJECT', reason });
            toast.info(`Application for ${app.name} marked as Rejected.`);
            setRejectModal({ open: false, app: null, reason: '' });
            await fetchTutorApps();

            if (selectedApp && selectedApp.id === app.id) {
                setSelectedApp(prev => ({ ...prev, status: 'REJECTED', rejection_reason: reason }));
            }
        } catch (err) {
            toast.error('Failed to reject tutor: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    // Filtering
    const filteredApps = tutorApps.filter(app => {
        if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = (app.name || '').toLowerCase().includes(q);
            const matchEmail = (app.email || '').toLowerCase().includes(q);
            const matchPhone = (app.phone || '').toLowerCase().includes(q);
            const matchSubjects = (app.subjects || '').toLowerCase().includes(q);
            if (!matchName && !matchEmail && !matchPhone && !matchSubjects) return false;
        }
        return true;
    });

    if (loading) return (
        <div className="p-4 space-y-4">
            <SkeletonTable rows={6} />
        </div>
    );

    return (
        <>
            <title>Recruitment — Hidayah Admin</title>
            <PageHeader
                title="Tutor Recruitment"
                description="Review applications, inspect uploaded credentials & media, schedule interviews, and onboard tutors."
            />

            {/* Filter & Search Bar */}
            <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap gap-2 items-center">
                    {['ALL', 'APPLIED', 'INTERVIEW_SCHEDULED', 'APPROVED', 'REJECTED'].map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                                statusFilter === st
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {st.replace(/_/g, ' ')}
                            <span className="ml-1.5 opacity-70 text-[10px]">
                                ({st === 'ALL' ? tutorApps.length : tutorApps.filter(a => a.status === st).length})
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative min-w-[260px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, email, subject..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Applications Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Applicant</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Teaching & Rates</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Hardware / Schedule</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center">Status</th>
                                <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-center min-w-[180px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredApps.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-500 italic">
                                        No tutor applications matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredApps.map(app => (
                                    <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                                        {/* Applicant Info & Photo */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                                                    {app.image_url ? (
                                                        <img src={app.image_url} alt={app.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs uppercase">
                                                            {app.name?.slice(0, 2) || 'TU'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                                                        <span>{app.name}</span>
                                                        {app.country && <span title={app.country}>{getCountryFlag(app.country)}</span>}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium">{app.email}</div>
                                                    {app.phone && (
                                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Phone size={10} /> {app.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Teaching & Rates */}
                                        <td className="py-3 px-4">
                                            <div className="text-xs font-semibold text-primary truncate max-w-xs">
                                                {app.subjects || 'General Curriculum'}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-1 items-center">
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                    {app.experience} yrs exp
                                                </span>
                                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                                                    ₦{parseFloat(app.hourly_rate || 0).toLocaleString()}/hr
                                                </span>
                                                {app.mode && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-semibold uppercase">
                                                        {app.mode}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Hardware / Interview Details */}
                                        <td className="py-3 px-4">
                                            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                                                <Monitor size={12} className="text-slate-400" />
                                                <span>{app.device || app.device_type || 'Computer'}</span>
                                                {(app.network || app.network_type) && (
                                                    <span className="text-slate-400">• {app.network || app.network_type}</span>
                                                )}
                                            </div>

                                            {app.status === 'INTERVIEW_SCHEDULED' && app.interview_at && (
                                                <div className="mt-1 text-[11px] text-violet-700 dark:text-violet-400 font-semibold flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    <span>{new Date(app.interview_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                </div>
                                            )}

                                            {app.status === 'INTERVIEW_SCHEDULED' && app.interview_link && (
                                                <a
                                                    href={app.interview_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 mt-1 text-[10px] text-white bg-primary hover:bg-primary-dark font-bold px-2 py-0.5 rounded-lg transition-colors"
                                                >
                                                    <Video size={10} /> Join Meeting
                                                </a>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <StatusBadge status={app.status} />
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1.5 items-stretch">
                                                {/* Schedule Button */}
                                                {app.status === 'APPLIED' && (
                                                    <button
                                                        onClick={() => handleOpenSchedule(app, false)}
                                                        disabled={actionLoading}
                                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold uppercase shadow-sm transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Calendar size={12} /> Schedule Interview
                                                    </button>
                                                )}

                                                {/* Update Schedule Button */}
                                                {app.status === 'INTERVIEW_SCHEDULED' && (
                                                    <button
                                                        onClick={() => handleOpenSchedule(app, true)}
                                                        disabled={actionLoading}
                                                        className="px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[11px] font-bold uppercase shadow-sm transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Clock size={12} /> Update Schedule
                                                    </button>
                                                )}

                                                {/* Approve / Reject buttons */}
                                                {(app.status === 'APPLIED' || app.status === 'INTERVIEW_SCHEDULED') && (
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => handleApprove(app)}
                                                            disabled={actionLoading}
                                                            className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenReject(app)}
                                                            disabled={actionLoading}
                                                            className="flex-1 px-2 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}

                                                {/* View Tutor Profile & Files */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedApp(app);
                                                        setActiveTab('files');
                                                    }}
                                                    className="px-2.5 py-1 w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <Eye size={12} /> View Files & Details
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* COMPREHENSIVE TUTOR FILE & PROFILE INSPECTOR MODAL ("👁 View")            */}
            {/* ========================================================================= */}
            {selectedApp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border-2 border-white dark:border-slate-800 shadow-md">
                                        {selectedApp.image_url ? (
                                            <img src={selectedApp.image_url} alt={selectedApp.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-lg uppercase">
                                                {selectedApp.name?.slice(0, 2) || 'TU'}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                                                {selectedApp.name}
                                            </h2>
                                            <StatusBadge status={selectedApp.status} />
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                            <span>@{selectedApp.username}</span>
                                            <span>•</span>
                                            <span>{selectedApp.email}</span>
                                            {selectedApp.phone && (
                                                <>
                                                    <span>•</span>
                                                    <span>{selectedApp.phone}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Top Right Quick Action Buttons */}
                                <div className="flex items-center gap-2">
                                    {selectedApp.status === 'APPLIED' && (
                                        <button
                                            onClick={() => handleOpenSchedule(selectedApp, false)}
                                            disabled={actionLoading}
                                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold uppercase shadow-sm transition-colors flex items-center gap-1.5"
                                        >
                                            <Calendar size={14} /> Schedule Interview
                                        </button>
                                    )}

                                    {selectedApp.status === 'INTERVIEW_SCHEDULED' && (
                                        <button
                                            onClick={() => handleOpenSchedule(selectedApp, true)}
                                            disabled={actionLoading}
                                            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold uppercase shadow-sm transition-colors flex items-center gap-1.5"
                                        >
                                            <Clock size={14} /> Update Schedule
                                        </button>
                                    )}

                                    {(selectedApp.status === 'APPLIED' || selectedApp.status === 'INTERVIEW_SCHEDULED') && (
                                        <>
                                            <button
                                                onClick={() => handleApprove(selectedApp)}
                                                disabled={actionLoading}
                                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase shadow-sm transition-colors flex items-center gap-1.5"
                                            >
                                                <CheckCircle2 size={14} /> Approve
                                            </button>
                                            <button
                                                onClick={() => handleOpenReject(selectedApp)}
                                                disabled={actionLoading}
                                                className="px-3 py-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded-xl text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
                                            >
                                                <XCircle size={14} /> Reject
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => setSelectedApp(null)}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="Close"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Interview notice bar if scheduled */}
                            {selectedApp.status === 'INTERVIEW_SCHEDULED' && selectedApp.interview_at && (
                                <div className="mt-4 p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300 font-semibold">
                                        <Calendar size={15} />
                                        <span>
                                            Interview Scheduled: {new Date(selectedApp.interview_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                    {selectedApp.interview_link && (
                                        <a
                                            href={selectedApp.interview_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                                        >
                                            <Video size={13} /> Launch Interview Room
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Rejection reason bar if rejected */}
                            {selectedApp.status === 'REJECTED' && selectedApp.rejection_reason && (
                                <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300">
                                    <span className="font-bold">Rejection Reason: </span>
                                    {selectedApp.rejection_reason}
                                </div>
                            )}
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-800/20 overflow-x-auto">
                            {[
                                { id: 'files', label: '📁 Uploaded Files & Media', badge: 'Key' },
                                { id: 'profile', label: '👤 Personal & Contact' },
                                { id: 'academic', label: '🎓 Qualifications & Subjects' },
                                { id: 'schedule', label: '🗓 Availability & Slots' },
                                { id: 'hardware', label: '💻 Hardware & Network' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                        activeTab === tab.id
                                            ? 'border-primary text-primary dark:text-primary-light'
                                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {tab.badge && (
                                        <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] rounded-full font-extrabold">
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body - Tab Contents */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* ========================================================= */}
                            {/* TAB 1: UPLOADED FILES & MEDIA                             */}
                            {/* ========================================================= */}
                            {activeTab === 'files' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                        <Sparkles size={16} className="text-blue-600 flex-shrink-0" />
                                        <span>
                                            Review all documents, recordings, certificates, and videos submitted by <strong>{selectedApp.name}</strong>.
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* 1. CV / Resume */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Curriculum Vitae (CV)</h4>
                                                            <p className="text-[11px] text-slate-500">Applicant resume document</p>
                                                        </div>
                                                    </div>
                                                    {selectedApp.cv_url ? (
                                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-md">
                                                            Uploaded
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                                                            Not Provided
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {selectedApp.cv_url ? (
                                                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                                                    <a
                                                        href={selectedApp.cv_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                                                    >
                                                        <ExternalLink size={13} /> Open / View CV
                                                    </a>
                                                    <a
                                                        href={selectedApp.cv_url}
                                                        download
                                                        className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                                                        title="Download CV"
                                                    >
                                                        <Download size={15} />
                                                    </a>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic pt-2">No CV file was uploaded with this application.</p>
                                            )}
                                        </div>

                                        {/* 2. Educational Certificates / Credentials */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center">
                                                            <Award size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Credentials & Certificates</h4>
                                                            <p className="text-[11px] text-slate-500">Degree, ijazah or diploma certificate</p>
                                                        </div>
                                                    </div>
                                                    {selectedApp.credentials_url ? (
                                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-md">
                                                            Uploaded
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                                                            Not Provided
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {selectedApp.credentials_url ? (
                                                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                                                    <a
                                                        href={selectedApp.credentials_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                                                    >
                                                        <ExternalLink size={13} /> View Certificate
                                                    </a>
                                                    <a
                                                        href={selectedApp.credentials_url}
                                                        download
                                                        className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                                                        title="Download Certificate"
                                                    >
                                                        <Download size={15} />
                                                    </a>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic pt-2">No certificates uploaded.</p>
                                            )}
                                        </div>

                                        {/* 3. Short Quran Recitation */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 md:col-span-2">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center">
                                                        <Volume2 size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Quran Recitation Audio/Video</h4>
                                                        <p className="text-[11px] text-slate-500">Tajweed and vocal sample submitted by tutor</p>
                                                    </div>
                                                </div>
                                                {selectedApp.recitation_url ? (
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-md">
                                                        Ready To Play
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                                                        Not Uploaded
                                                    </span>
                                                )}
                                            </div>

                                            {selectedApp.recitation_url ? (
                                                <div className="mt-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                                    <audio
                                                        src={selectedApp.recitation_url}
                                                        controls
                                                        className="w-full h-10"
                                                        preload="metadata"
                                                    >
                                                        Your browser does not support the audio element.
                                                    </audio>
                                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                                        <span>Listen directly above or open separately:</span>
                                                        <div className="flex gap-2">
                                                            <a
                                                                href={selectedApp.recitation_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline font-semibold flex items-center gap-1"
                                                            >
                                                                <ExternalLink size={12} /> Open File
                                                            </a>
                                                            <a
                                                                href={selectedApp.recitation_url}
                                                                download
                                                                className="text-slate-600 hover:underline font-semibold flex items-center gap-1"
                                                            >
                                                                <Download size={12} /> Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">No recitation recording provided.</p>
                                            )}
                                        </div>

                                        {/* 4. Self-Introduction Video */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 md:col-span-2">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center">
                                                        <Video size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Self-Introduction Video</h4>
                                                        <p className="text-[11px] text-slate-500">Tutor teaching overview and presentation</p>
                                                    </div>
                                                </div>
                                                {selectedApp.video_url ? (
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold uppercase rounded-md">
                                                        Video Available
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                                                        Not Provided
                                                    </span>
                                                )}
                                            </div>

                                            {selectedApp.video_url ? (
                                                <div className="mt-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                                    {selectedApp.video_url.includes('youtube.com') || selectedApp.video_url.includes('youtu.be') ? (
                                                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                                                            <iframe
                                                                src={
                                                                    selectedApp.video_url.includes('youtu.be/')
                                                                        ? `https://www.youtube.com/embed/${selectedApp.video_url.split('youtu.be/')[1]?.split('?')[0]}`
                                                                        : `https://www.youtube.com/embed/${new URL(selectedApp.video_url).searchParams.get('v')}`
                                                                }
                                                                className="w-full h-full"
                                                                allowFullScreen
                                                                title="Tutor Intro Video"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="max-h-80 w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                                            <video
                                                                src={selectedApp.video_url}
                                                                controls
                                                                className="max-h-80 w-full object-contain"
                                                            >
                                                                Your browser does not support the video tag.
                                                            </video>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                                        <span>Watch video above or open externally:</span>
                                                        <div className="flex gap-2">
                                                            <a
                                                                href={selectedApp.video_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline font-semibold flex items-center gap-1"
                                                            >
                                                                <ExternalLink size={12} /> Open Full Video
                                                            </a>
                                                            <a
                                                                href={selectedApp.video_url}
                                                                download
                                                                className="text-slate-600 hover:underline font-semibold flex items-center gap-1"
                                                            >
                                                                <Download size={12} /> Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">No introduction video provided.</p>
                                            )}
                                        </div>

                                        {/* 5. Appointment Letter (if approved) */}
                                        {selectedApp.appointment_letter_url && (
                                            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 md:col-span-2">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-700 flex items-center justify-center">
                                                            <Award size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">Official Appointment Letter</h4>
                                                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Generated contract & terms of employment</p>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={selectedApp.appointment_letter_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                                                    >
                                                        <ExternalLink size={13} /> View Appointment Letter
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ========================================================= */}
                            {/* TAB 2: PERSONAL & CONTACT INFO                            */}
                            {/* ========================================================= */}
                            {activeTab === 'profile' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Full Name</span>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedApp.name || 'N/A'}</p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Username / ID</span>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">@{selectedApp.username} (ID: #{selectedApp.id})</p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Account Email</span>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                <Mail size={14} className="text-slate-400" /> {selectedApp.email}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Personal Gmail</span>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                {selectedApp.personal_gmail || 'Not provided'}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Phone Number</span>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                <Phone size={14} className="text-slate-400" /> {selectedApp.phone || 'Not provided'}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Age & Gender</span>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                {selectedApp.age ? `${selectedApp.age} years old` : 'Age not stated'} • {selectedApp.gender || 'Gender not specified'}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 md:col-span-2">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Location & Address</span>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                                <span>
                                                    {[selectedApp.address, selectedApp.city, selectedApp.state, selectedApp.country].filter(Boolean).join(', ') || 'No address provided'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========================================================= */}
                            {/* TAB 3: QUALIFICATIONS & SUBJECTS                          */}
                            {/* ========================================================= */}
                            {activeTab === 'academic' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Highest Qualification</span>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                <GraduationCap size={16} className="text-primary" />
                                                {selectedApp.qualification || 'Not specified'}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Teaching Experience</span>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                <Briefcase size={16} className="text-amber-500" />
                                                {selectedApp.experience} Years Experience
                                                {selectedApp.has_online_exp && (
                                                    <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-full">
                                                        Online Teaching Exp ✓
                                                    </span>
                                                )}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Teaching Mode</span>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase">
                                                {selectedApp.mode || 'ONLINE'}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Languages Spoken</span>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                <Globe size={15} className="text-blue-500" />
                                                {selectedApp.languages || 'English'}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Hourly Rate (₦)</span>
                                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                                ₦{parseFloat(selectedApp.hourly_rate || 0).toLocaleString()}
                                                <span className="text-xs font-semibold text-slate-500"> / hour</span>
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Standard Monthly Rate (₦)</span>
                                            <p className="text-lg font-black text-slate-800 dark:text-slate-200">
                                                ₦{parseFloat(selectedApp.rate_per_month || 0).toLocaleString()}
                                                <span className="text-xs font-semibold text-slate-500"> / month</span>
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 md:col-span-2">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Subjects To Teach</span>
                                            <div className="flex flex-wrap gap-2">
                                                {(selectedApp.subjects || '').split(',').map((subj, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs"
                                                    >
                                                        {subj.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {selectedApp.bio && (
                                            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 md:col-span-2">
                                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Biography & Teaching Philosophy</span>
                                                <p className="text-xs font-normal text-slate-700 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    "{selectedApp.bio}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ========================================================= */}
                            {/* TAB 4: AVAILABILITY & SCHEDULE SLOTS                      */}
                            {/* ========================================================= */}
                            {activeTab === 'schedule' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Available Days Summary</span>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedApp.availability_days || 'Flexible'}</p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Available Hours Summary</span>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedApp.availability_hours || 'Contact for details'}</p>
                                        </div>
                                    </div>

                                    {/* Specific Time Slots */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                                            Configured Weekly Availability Slots
                                        </h4>

                                        {selectedApp.availabilities && selectedApp.availabilities.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {selectedApp.availabilities.map((slot, idx) => (
                                                    <div
                                                        key={slot.id || idx}
                                                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between"
                                                    >
                                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{slot.day}</span>
                                                        <span className="text-xs text-primary font-semibold">
                                                            {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic">No specific slot boundaries defined. Tutor works with general availability.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ========================================================= */}
                            {/* TAB 5: HARDWARE & SYSTEM                                  */}
                            {/* ========================================================= */}
                            {activeTab === 'hardware' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center flex-shrink-0">
                                            <Monitor size={24} />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Device Used For Teaching</span>
                                            <p className="text-base font-bold text-slate-800 dark:text-slate-100 uppercase mt-0.5">
                                                {selectedApp.device || selectedApp.device_type || 'COMPUTER'}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Meets teaching requirements for virtual screen sharing</p>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                            <Wifi size={24} />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Internet Connection / ISP</span>
                                            <p className="text-base font-bold text-slate-800 dark:text-slate-100 uppercase mt-0.5">
                                                {selectedApp.network || selectedApp.network_type || 'Standard High-Speed'}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Low latency high-definition audio/video capability</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center">
                            <span className="text-xs text-slate-500">
                                Submitted on: {new Date(selectedApp.created_at).toLocaleDateString([], { dateStyle: 'long' })}
                            </span>
                            <button
                                onClick={() => setSelectedApp(null)}
                                className="px-6 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase transition-colors"
                            >
                                Close Inspector
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SCHEDULE / UPDATE INTERVIEW MODAL DIALOG                                  */}
            {/* ========================================================================= */}
            {scheduleModal.open && scheduleModal.app && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                {scheduleModal.isUpdate ? 'Update Interview Schedule' : 'Schedule Tutor Interview'}
                            </h3>
                            <button
                                onClick={() => setScheduleModal({ open: false, app: null, isUpdate: false, time: '', link: '', useInternal: true })}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitSchedule} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Applicant
                                </label>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {scheduleModal.app.name} ({scheduleModal.app.email})
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Interview Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={scheduleModal.time}
                                    onChange={e => setScheduleModal(prev => ({ ...prev, time: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={scheduleModal.useInternal}
                                        onChange={e => setScheduleModal(prev => ({ ...prev, useInternal: e.target.checked }))}
                                        className="rounded text-primary focus:ring-0 w-4 h-4"
                                    />
                                    <span>Use Hidayah Live Classroom (Auto-create meeting)</span>
                                </label>

                                {!scheduleModal.useInternal && (
                                    <div className="pt-2">
                                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                            Custom Meeting Link (Zoom, Google Meet, Teams, etc.)
                                        </label>
                                        <input
                                            type="url"
                                            placeholder="https://meet.google.com/xyz-abc"
                                            value={scheduleModal.link}
                                            onChange={e => setScheduleModal(prev => ({ ...prev, link: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setScheduleModal({ open: false, app: null, isUpdate: false, time: '', link: '', useInternal: true })}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold uppercase shadow-sm transition-colors"
                                >
                                    {scheduleModal.isUpdate ? 'Save Schedule' : 'Schedule Interview'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* REJECT TUTOR APPLICATION MODAL DIALOG                                     */}
            {/* ========================================================================= */}
            {rejectModal.open && rejectModal.app && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
                                <AlertCircle size={18} /> Reject Application
                            </h3>
                            <button
                                onClick={() => setRejectModal({ open: false, app: null, reason: '' })}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                            Are you sure you want to reject <strong>{rejectModal.app.name}</strong>? Please provide a helpful reason that will be included in their notification.
                        </p>

                        <form onSubmit={handleSubmitReject} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Rejection Reason
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="e.g., Missing required Tajweed certification, unsuitable microphone/connectivity quality, schedule mismatch..."
                                    value={rejectModal.reason}
                                    onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRejectModal({ open: false, app: null, reason: '' })}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase shadow-sm transition-colors"
                                >
                                    Confirm Rejection
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

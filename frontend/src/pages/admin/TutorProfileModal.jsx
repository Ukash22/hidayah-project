import { useState } from 'react';
import {
    FileText, Download, ExternalLink, Video, Volume2,
    Calendar, Clock, Mail, Phone, MapPin, GraduationCap,
    Monitor, Wifi, X, Award, Briefcase, Globe, Sparkles
} from 'lucide-react';
import { StatusBadge } from './adminHelpers';

export default function TutorProfileModal({ tutor, onClose, actions }) {
    const [activeTab, setActiveTab] = useState('files');

    if (!tutor) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border-2 border-white dark:border-slate-800 shadow-md">
                                {tutor.image_url ? (
                                    <img src={tutor.image_url} alt={tutor.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-lg uppercase">
                                        {tutor.name?.slice(0, 2) || 'TU'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                                        {tutor.name}
                                    </h2>
                                    <StatusBadge status={tutor.status} />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span>@{tutor.username}</span>
                                    <span>•</span>
                                    <span>{tutor.email}</span>
                                    {tutor.phone && (
                                        <>
                                            <span>•</span>
                                            <span>{tutor.phone}</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Top Right Actions */}
                        <div className="flex items-center gap-2">
                            {actions}
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
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
                    {/* TAB 1: UPLOADED FILES & MEDIA */}
                    {activeTab === 'files' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                <Sparkles size={16} className="text-blue-600 flex-shrink-0" />
                                <span>
                                    Review all documents, recordings, certificates, and videos submitted by <strong>{tutor.name}</strong>.
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
                                            {tutor.cv_url ? (
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

                                    {tutor.cv_url ? (
                                        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                                            <a
                                                href={tutor.cv_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                                            >
                                                <ExternalLink size={13} /> Open / View CV
                                            </a>
                                            <a
                                                href={tutor.cv_url}
                                                download
                                                className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                                                title="Download CV"
                                            >
                                                <Download size={15} />
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic pt-2">No CV file was uploaded with this profile.</p>
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
                                            {tutor.credentials_url ? (
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

                                    {tutor.credentials_url ? (
                                        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                                            <a
                                                href={tutor.credentials_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                                            >
                                                <ExternalLink size={13} /> View Certificate
                                            </a>
                                            <a
                                                href={tutor.credentials_url}
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
                                        {tutor.recitation_url ? (
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-md">
                                                Ready To Play
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                                                Not Uploaded
                                            </span>
                                        )}
                                    </div>

                                    {tutor.recitation_url ? (
                                        <div className="mt-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                            <audio
                                                src={tutor.recitation_url}
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
                                                        href={tutor.recitation_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline font-semibold flex items-center gap-1"
                                                    >
                                                        <ExternalLink size={12} /> Open File
                                                    </a>
                                                    <a
                                                        href={tutor.recitation_url}
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
                                        {tutor.video_url ? (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold uppercase rounded-md">
                                                Video Available
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md">
                                                Not Provided
                                            </span>
                                        )}
                                    </div>

                                    {tutor.video_url ? (
                                        <div className="mt-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                            {tutor.video_url.includes('youtube.com') || tutor.video_url.includes('youtu.be') ? (
                                                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                                                    <iframe
                                                        src={
                                                            tutor.video_url.includes('youtu.be/')
                                                                ? `https://www.youtube.com/embed/${tutor.video_url.split('youtu.be/')[1]?.split('?')[0]}`
                                                                : `https://www.youtube.com/embed/${new URL(tutor.video_url).searchParams.get('v')}`
                                                        }
                                                        className="w-full h-full"
                                                        allowFullScreen
                                                        title="Tutor Intro Video"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="max-h-80 w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                                    <video
                                                        src={tutor.video_url}
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
                                                        href={tutor.video_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline font-semibold flex items-center gap-1"
                                                    >
                                                        <ExternalLink size={12} /> Open Full Video
                                                    </a>
                                                    <a
                                                        href={tutor.video_url}
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

                                {/* 5. Appointment Letter */}
                                {tutor.appointment_letter_url && (
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
                                                href={tutor.appointment_letter_url}
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

                    {/* TAB 2: PERSONAL & CONTACT INFO */}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Full Name</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{tutor.name || 'N/A'}</p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Username / ID</span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">@{tutor.username} (ID: #{tutor.id})</p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Account Email</span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <Mail size={14} className="text-slate-400" /> {tutor.email}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Personal Gmail</span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {tutor.personal_gmail || 'Not provided'}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Phone Number</span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <Phone size={14} className="text-slate-400" /> {tutor.phone || 'Not provided'}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Age & Gender</span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {tutor.age ? `${tutor.age} years old` : 'Age not stated'} • {tutor.gender || 'Gender not specified'}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 md:col-span-2">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Location & Address</span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                        <span>
                                            {[tutor.address, tutor.city, tutor.state, tutor.country].filter(Boolean).join(', ') || 'No address provided'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: QUALIFICATIONS & SUBJECTS */}
                    {activeTab === 'academic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Highest Qualification</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                        <GraduationCap size={16} className="text-primary" />
                                        {tutor.qualification || 'Not specified'}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Teaching Experience</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                        <Briefcase size={16} className="text-amber-500" />
                                        {tutor.experience} Years Experience
                                        {tutor.has_online_exp && (
                                            <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-full">
                                                Online Teaching Exp ✓
                                            </span>
                                        )}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Teaching Mode</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase">
                                        {tutor.mode || 'ONLINE'}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Languages Spoken</span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <Globe size={15} className="text-blue-500" />
                                        {tutor.languages || 'English'}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Hourly Rate (₦)</span>
                                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                        ₦{parseFloat(tutor.hourly_rate || 0).toLocaleString()}
                                        <span className="text-xs font-semibold text-slate-500"> / hour</span>
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Standard Monthly Rate (₦)</span>
                                    <p className="text-lg font-black text-slate-800 dark:text-slate-200">
                                        ₦{parseFloat(tutor.rate_per_month || 0).toLocaleString()}
                                        <span className="text-xs font-semibold text-slate-500"> / month</span>
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 md:col-span-2">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Subjects To Teach</span>
                                    <div className="flex flex-wrap gap-2">
                                        {(tutor.subjects || '').split(',').map((subj, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs"
                                            >
                                                {subj.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {tutor.bio && (
                                    <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 md:col-span-2">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Biography & Teaching Philosophy</span>
                                        <p className="text-xs font-normal text-slate-700 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                            "{tutor.bio}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: AVAILABILITY & SCHEDULE SLOTS */}
                    {activeTab === 'schedule' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Available Days Summary</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{tutor.availability_days || 'Flexible'}</p>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Available Hours Summary</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{tutor.availability_hours || 'Contact for details'}</p>
                                </div>
                            </div>

                            {/* Specific Time Slots */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                                    Configured Weekly Availability Slots
                                </h4>

                                {tutor.availabilities && tutor.availabilities.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {tutor.availabilities.map((slot, idx) => (
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

                    {/* TAB 5: HARDWARE & SYSTEM */}
                    {activeTab === 'hardware' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <Monitor size={24} />
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Device Used For Teaching</span>
                                    <p className="text-base font-bold text-slate-800 dark:text-slate-100 uppercase mt-0.5">
                                        {tutor.device || tutor.device_type || 'COMPUTER'}
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
                                        {tutor.network || tutor.network_type || 'Standard High-Speed'}
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
                        {tutor.created_at ? `Profile created: ${new Date(tutor.created_at).toLocaleDateString([], { dateStyle: 'long' })}` : ''}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase transition-colors"
                    >
                        Close Inspector
                    </button>
                </div>
            </div>
        </div>
    );
}

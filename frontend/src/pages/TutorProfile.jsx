import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Badge, EmptyState, Skeleton } from '../components/ui';
import { User, BookOpen, Globe, Clock, Star, ArrowLeft, Calendar } from 'lucide-react';

const to12hr = (time) => {
    if (!time) return time;
    const [hStr, mStr] = time.slice(0, 5).split(':');
    let h = parseInt(hStr, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mStr || '00'} ${period}`;
};

const parseAvailability = (raw) => {
    if (!raw) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean).map(slot => {
        const [day, times] = slot.split(':');
        if (!times) return { day: slot.trim(), times: '' };
        const [from, to] = times.split('-').map(t => to12hr(t.trim()));
        return { day: day.trim(), times: `${from} – ${to}` };
    });
};

export default function TutorProfile() {
    const { id } = useParams();
    const [tutor, setTutor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get(`/api/tutors/${id}/`);
                setTutor(res.data);
            } catch {
                setError('This tutor profile could not be loaded.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    const subjects = tutor?.subjects_to_teach?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const languages = tutor?.languages?.split(',').map(l => l.trim()).filter(Boolean) || [];
    const slots = parseAvailability(tutor?.availability_hours);

    return (
        <div className="min-h-screen bg-surface">
            <title>{tutor ? `${tutor.full_name} — Hidayah` : 'Tutor Profile — Hidayah'}</title>
            <Navbar />

            <div className="container pt-32 pb-20 max-w-4xl mx-auto">
                <Link to="/#tutors" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text mb-8 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    All Tutors
                </Link>

                {loading && (
                    <div className="bg-surface-raised rounded-3xl border border-border p-8 space-y-6">
                        <div className="flex gap-6 items-center">
                            <Skeleton className="h-24 w-24 rounded-2xl shrink-0" />
                            <div className="flex-1 space-y-3">
                                <Skeleton className="h-6 w-1/3" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-1/4" />
                            </div>
                        </div>
                        <Skeleton className="h-24 w-full" />
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                    </div>
                )}

                {error && (
                    <EmptyState
                        icon={User}
                        title="Profile unavailable"
                        description={error}
                        action={{ label: 'Back to Home', onClick: () => window.location.href = '/' }}
                    />
                )}

                {tutor && !loading && (
                    <div className="space-y-6">
                        {/* Header card */}
                        <div className="bg-surface-raised rounded-3xl border border-border p-8">
                            <div className="flex flex-col sm:flex-row gap-6 items-start">
                                <div className="shrink-0">
                                    {tutor.image ? (
                                        <img
                                            src={tutor.image}
                                            alt={tutor.full_name}
                                            className="w-24 h-24 rounded-2xl object-cover border border-border"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                                            {tutor.full_name?.[0]}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h1 className="text-2xl font-display font-bold text-text">{tutor.full_name}</h1>
                                    {tutor.qualification && (
                                        <p className="text-text-muted text-sm mt-1">{tutor.qualification}</p>
                                    )}
                                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-text-muted">
                                        {tutor.experience_years && (
                                            <span className="flex items-center gap-1.5">
                                                <Star className="h-3.5 w-3.5 text-warning" />
                                                {tutor.experience_years} yrs experience
                                            </span>
                                        )}
                                        {tutor.city && (
                                            <span className="flex items-center gap-1.5">
                                                <Globe className="h-3.5 w-3.5" />
                                                {tutor.city}
                                            </span>
                                        )}
                                        {tutor.hourly_rate && (
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                ₦{Number(tutor.hourly_rate).toLocaleString()} / hr
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <Link
                                    to={`/register?tutor=${encodeURIComponent(tutor.full_name)}`}
                                    className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm"
                                >
                                    <Calendar className="h-4 w-4" />
                                    Book Trial Class
                                </Link>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Bio */}
                            {tutor.bio && (
                                <div className="bg-surface-raised rounded-3xl border border-border p-6 md:col-span-2">
                                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">About</h2>
                                    <p className="text-text leading-relaxed">{tutor.bio}</p>
                                </div>
                            )}

                            {/* Subjects */}
                            {subjects.length > 0 && (
                                <div className="bg-surface-raised rounded-3xl border border-border p-6">
                                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" /> Subjects
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {subjects.map(s => (
                                            <Badge key={s} variant="primary">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Languages */}
                            {languages.length > 0 && (
                                <div className="bg-surface-raised rounded-3xl border border-border p-6">
                                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <Globe className="h-4 w-4" /> Languages
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {languages.map(l => (
                                            <Badge key={l} variant="default">{l}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Availability */}
                            {slots.length > 0 && (
                                <div className="bg-surface-raised rounded-3xl border border-border p-6 md:col-span-2">
                                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" /> Availability
                                    </h2>
                                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {slots.map((slot, i) => (
                                            <div key={i} className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-surface-overlay border border-border text-sm">
                                                <span className="font-medium text-text">{slot.day}</span>
                                                {slot.times && <span className="text-text-muted text-xs">{slot.times}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CTA footer */}
                        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 text-center">
                            <h3 className="text-lg font-display font-bold text-text mb-2">Ready to start learning?</h3>
                            <p className="text-text-muted text-sm mb-5">Book a free trial session with {tutor.full_name?.split(' ')[0]} and see if it's the right fit.</p>
                            <Link
                                to={`/register?tutor=${encodeURIComponent(tutor.full_name)}`}
                                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-md"
                            >
                                <Calendar className="h-4 w-4" />
                                Book Free Trial Class
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

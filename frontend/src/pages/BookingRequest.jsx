import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import api, { getApiError } from '../services/api';
import { Search as IconSearch } from 'lucide-react';
import TutorCard from '../components/TutorCard';
import BookingModal from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout';
import { SkeletonCard } from '../components/ui';


const DEFAULT_BOOKING = {
    subject: '', schedule: [{ day: '', time: '' }], preferred_start_date: '',
    learning_level: 'Primary School', class_structure: 'One-on-One', hours_per_session: 1.0,
};

const BookingRequest = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [tutors, setTutors] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [bookingStates, setBookingStates] = useState({});
    const [selectedTutor, setSelectedTutor] = useState(null);

    const getBookingData = useCallback((tutorId) => bookingStates[tutorId] || DEFAULT_BOOKING, [bookingStates]);

    const updateBookingField = useCallback((tutorId, field, value) => {
        setBookingStates(prev => {
            const current = prev[tutorId] || DEFAULT_BOOKING;
            let newSchedule = [...current.schedule];
            if (field === 'hours_per_session') {
                newSchedule = newSchedule.map(slot => {
                    const start = (slot.time || '').split('-')[0];
                    if (start) {
                        const [h, m] = start.split(':').map(Number);
                        const total = h * 60 + (m || 0) + Math.round(value * 60);
                        const endH = Math.floor(total / 60) % 24;
                        const endM = total % 60;
                        const end = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                        return { ...slot, time: `${start}-${end}` };
                    }
                    return slot;
                });
            }
            return { ...prev, [tutorId]: { ...current, [field]: value, schedule: newSchedule } };
        });
    }, []);

    const addSlot = useCallback((tutorId) => {
        setBookingStates(prev => {
            const current = prev[tutorId] || DEFAULT_BOOKING;
            return { ...prev, [tutorId]: { ...current, schedule: [...current.schedule, { day: '', time: '' }] } };
        });
    }, []);

    const removeSlot = useCallback((tutorId, index) => {
        setBookingStates(prev => {
            const current = prev[tutorId];
            if (!current) return prev;
            return { ...prev, [tutorId]: { ...current, schedule: current.schedule.filter((_, i) => i !== index) } };
        });
    }, []);

    const updateSlot = useCallback((tutorId, index, field, value) => {
        setBookingStates(prev => {
            const current = prev[tutorId] || DEFAULT_BOOKING;
            const newSchedule = [...current.schedule];
            if (!newSchedule[index]) newSchedule[index] = { day: '', time: '' };
            newSchedule[index] = { ...newSchedule[index], [field]: value };
            return { ...prev, [tutorId]: { ...current, schedule: newSchedule } };
        });
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tutorRes, subRes] = await Promise.all([
                    api.get(`/api/tutors/`),
                    api.get(`/api/programs/subjects/`)
                ]);
                setTutors(tutorRes.data);
                setSubjects(subRes.data);
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const handleRequestBooking = useCallback(async (tutor, bookingData) => {
        const missing = [];
        if (!bookingData.subject) missing.push("Subject");
        if (!bookingData.preferred_start_date) missing.push("Start Date");
        if (!bookingData.schedule || bookingData.schedule.length === 0) {
            missing.push("At least one schedule slot");
        } else if (bookingData.schedule.some(s => !s.day || !s.time)) {
            missing.push("Complete Schedule (all days and times must be filled)");
        }

        if (missing.length > 0) {
            toast.error('Please complete: ' + missing.join(', '));
            return;
        }

        const normalizeToMinutes = (t) => {
            if (!t) return null;
            let timeStr = t.trim().toUpperCase();
            const isPM = timeStr.includes('PM');
            const isAM = timeStr.includes('AM');
            timeStr = timeStr.replace(/[A-Z\s]/g, '');
            const parts = timeStr.split(':');
            let h = parseInt(parts[0]);
            let m = parseInt(parts[1] || '0');
            if (isPM && h < 12) h += 12;
            if (isAM && h === 12) h = 0;
            return h * 60 + m;
        };

        const formatTime12h = (t) => {
            if (!t) return '';
            let [h, m] = t.split(':');
            h = parseInt(h);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${m.padStart(2, '0')} ${ampm}`;
        };

        if (tutor.availabilities && tutor.availabilities.length > 0) {
            for (let slot of bookingData.schedule) {
                const av = tutor.availabilities.find(a =>
                    a.day.toUpperCase() === slot.day.toUpperCase() ||
                    a.day.toUpperCase().startsWith(slot.day.toUpperCase().slice(0, 3))
                );
                if (!av) {
                    toast.error(`Tutor is not available on ${slot.day}.`);
                    return;
                }
                const [slotStartRaw, slotEndRaw] = (slot.time || '').split('-');
                const slotStart = normalizeToMinutes(slotStartRaw);
                const slotEnd = normalizeToMinutes(slotEndRaw || slotStartRaw);
                const avStart = normalizeToMinutes(av.start_time);
                const avEnd = normalizeToMinutes(av.end_time);
                if (slotStart === null || slotEnd === null) {
                    toast.error('Invalid time format selected.');
                    return;
                }
                if (slotStart < avStart || slotEnd > avEnd) {
                    toast.error(`${slot.day} ${slot.time} is outside tutor availability (${formatTime12h(av.start_time)} - ${formatTime12h(av.end_time)}).`);
                    return;
                }
            }
        }

        setRequesting(true);
        try {
            const payload = {
                tutor_id: tutor.id,
                subject: bookingData.subject,
                schedule: bookingData.schedule,
                preferred_start_date: bookingData.preferred_start_date,
                learning_level: bookingData.learning_level,
                class_structure: bookingData.class_structure,
                hours_per_session: bookingData.hours_per_session
            };
            await api.post(`/api/classes/booking/request/`, payload);
            toast.success('Booking request sent! Your dashboard will show your upcoming sessions once confirmed.');
            setSelectedTutor(null);
            navigate('/student/overview');
        } catch (err) {
            toast.error('Failed to send request: ' + (getApiError(err, 'Error')));
        } finally {
            setRequesting(false);
        }
    }, [token, navigate, toast]);

    const filteredTutors = tutors.filter(t =>
        (t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         t.bio?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedSubject === '' || t.subjects_to_teach?.includes(selectedSubject))
    );

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Find a Tutor — Hidayah</title>
            <PageHeader
                title="Find a Tutor"
                description="Browse our educators and send a booking request."
            />

            {/* Search and filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name or bio…"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 transition-colors shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="sm:w-56 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 transition-colors shadow-sm"
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                >
                    <option value="">All Subjects</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
            </div>

            {/* Tutor grid */}
            {filteredTutors.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
                    <p className="text-slate-400 font-semibold">No tutors match your search.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTutors.map(tutor => (
                        <TutorCard
                            key={tutor.id}
                            tutor={tutor}
                            onBook={setSelectedTutor}
                        />
                    ))}
                </div>
            )}

            {/* Booking modal */}
            <AnimatePresence>
                {selectedTutor && (
                    <BookingModal
                        tutor={selectedTutor}
                        bookingData={getBookingData(selectedTutor.id)}
                        requesting={requesting}
                        onUpdateField={updateBookingField}
                        onAddSlot={addSlot}
                        onRemoveSlot={removeSlot}
                        onUpdateSlot={updateSlot}
                        onSubmit={handleRequestBooking}
                        onClose={() => setSelectedTutor(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default BookingRequest;

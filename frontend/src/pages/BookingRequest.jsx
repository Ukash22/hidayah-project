import React, { useState, useEffect, useCallback } from 'react';
import api, { getApiError } from '../services/api';
import { Search as IconSearch } from 'lucide-react';
import TutorCard from '../components/TutorCard';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';


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

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

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

        // Helper to normalize time to minutes from midnight
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

        // Validate against tutor availability
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
            toast.success('Booking successful! Proceed to your dashboard to complete payment and start your lessons.');
            navigate('/student');
        } catch (err) {
            toast.error('Failed to send request: ' + (getApiError(err, 'Error')));
        } finally {
            setRequesting(false);
        }
    }, [token, navigate, toast, getAuthHeader]);

    const filteredTutors = tutors.filter(t =>
        (t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         t.bio?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedSubject === '' || t.subjects_to_teach?.includes(selectedSubject))
    );

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-300">
            <Navbar />
            
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-emerald-600/30 blur-[150px] rounded-full"></div>
            </div>

            <main className="container pt-32 pb-20 px-4 md:px-8 relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-display font-black text-white mb-4">Find Your Perfect <span className="text-emerald-500">Tutor</span></h1>
                    <p className="text-slate-500 max-w-2xl mx-auto">Browse our world-class educators and find the one that matches your learning style and goals.</p>
                </div>

                {/* Search and Filters */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 mb-12 flex flex-col md:flex-row gap-6">
                    <div className="flex-1 relative">
                        <IconSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by name or bio..." 
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 pl-14 font-bold text-white outline-none focus:border-emerald-500/30 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="md:w-64">
                        <select 
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-emerald-500/30 appearance-none transition-all"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                            <option value="" className="bg-slate-900">All Subjects</option>
                            {subjects.map(s => <option key={s.id} value={s.name} className="bg-slate-900">{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Tutor Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredTutors.map((tutor) => (
                        <TutorCard
                            tutor={tutor}
                            bookingData={getBookingData(tutor.id)}
                            requesting={requesting}
                            onUpdateField={updateBookingField}
                            onAddSlot={addSlot}
                            onRemoveSlot={removeSlot}
                            onUpdateSlot={updateSlot}
                            onRequestBooking={handleRequestBooking}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default BookingRequest;

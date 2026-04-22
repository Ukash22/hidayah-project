import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const AdminExamManager = () => {
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingExam, setEditingExam] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assigningExam, setAssigningExam] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [assignDueDate, setAssignDueDate] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        exam_type: 'JAMB',
        subject: '',
        year: new Date().getFullYear(),
        duration_minutes: 60
    });

    const getAuthHeader = () => {
        const token = localStorage.getItem('access') || localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examsRes, subjectsRes, studentsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/`, { headers: getAuthHeader() }),
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/programs/subjects/`, { headers: getAuthHeader() }),
                    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/admin/all/`, { headers: getAuthHeader() })
                ]);
                setExams(examsRes.data);
                setSubjects(subjectsRes.data);
                setStudents(studentsRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        try {
            if (editingExam) {
                await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/${editingExam.id}/`, formData, { headers: getAuthHeader() });
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/`, formData, { headers: getAuthHeader() });
            }
            window.location.reload();
        } catch (err) {
            alert('Error saving exam: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleAssignExam = async () => {
        if (selectedStudents.length === 0) {
            alert('Please select at least one student.');
            return;
        }
        setAssigning(true);
        try {
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/exams/assignments/bulk-assign/`,
                {
                    exam: assigningExam.id,
                    students: selectedStudents,
                    due_date: assignDueDate || null
                },
                { headers: getAuthHeader() }
            );
            alert(`✅ Exam "${assigningExam.title}" assigned to ${selectedStudents.length} student(s) successfully!`);
            setShowAssignModal(false);
            setSelectedStudents([]);
            setAssigningExam(null);
        } catch (err) {
            alert('Failed to assign exam: ' + (err.response?.data?.error || err.message));
        } finally {
            setAssigning(false);
        }
    };

    const openAssignModal = (exam) => {
        setAssigningExam(exam);
        setSelectedStudents([]);
        setStudentSearch('');
        setAssignDueDate('');
        setShowAssignModal(true);
    };

    const toggleStudent = (id) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const filteredStudents = students.filter(s => {
        const name = `${s.user?.first_name || ''} ${s.user?.last_name || ''} ${s.user?.username || ''}`.toLowerCase();
        return name.includes(studentSearch.toLowerCase());
    });

    // Group subjects by program type
    const islamicSubjects = subjects.filter(s => s.program_type === 'ISLAMIC');
    const westernSubjects = subjects.filter(s => s.program_type !== 'ISLAMIC');

    const examTypeColors = {
        JAMB: 'bg-blue-100 text-blue-700',
        WAEC: 'bg-emerald-100 text-emerald-700',
        NECO: 'bg-violet-100 text-violet-700',
        JSSCE: 'bg-amber-100 text-amber-700',
        PRIMARY: 'bg-rose-100 text-rose-700',
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="container pt-32 pb-20">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-4xl font-display text-primary mb-2">Exam Management</h1>
                        <p className="text-slate-500">Configure simulated examinations and manage question banks.</p>
                    </div>
                    <button
                        onClick={() => { setEditingExam(null); setFormData({ title: '', exam_type: 'JAMB', subject: '', year: new Date().getFullYear(), duration_minutes: 60 }); setShowModal(true); }}
                        className="btn btn-primary px-8 py-4 shadow-xl shadow-primary/20"
                    >
                        + Create New Exam
                    </button>
                </div>

                {loading ? (
                    <div className="grid gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="bg-white h-28 rounded-[2rem] animate-pulse border border-slate-100" />)}
                    </div>
                ) : exams.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-20 text-center border border-dashed border-slate-200">
                        <p className="text-5xl mb-4">📝</p>
                        <p className="text-slate-400 font-medium">No exams created yet. Create your first exam above.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {exams.map(exam => (
                            <div key={exam.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center transition-all hover:shadow-md">
                                <div className="flex items-center gap-8">
                                    <div className="p-4 bg-slate-50 rounded-2xl text-2xl">📝</div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold text-slate-800">{exam.title}</h3>
                                            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter ${examTypeColors[exam.exam_type] || 'bg-slate-100 text-slate-600'}`}>
                                                {exam.exam_type}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 font-medium">
                                            {exam.subject_name} • {exam.year || 'No Year'} • {exam.duration_minutes} Mins •{' '}
                                            <span className={exam.question_count > 0 ? 'text-emerald-600 font-bold' : 'text-red-400 font-bold'}>
                                                {exam.question_count} Questions
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3 flex-wrap justify-end">
                                    <button
                                        onClick={() => { setEditingExam(exam); setFormData({ title: exam.title, exam_type: exam.exam_type, subject: exam.subject, year: exam.year, duration_minutes: exam.duration_minutes }); setShowModal(true); }}
                                        className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-primary hover:text-white transition-all text-sm font-bold"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <Link to={`/admin/exams/${exam.id}/questions`} className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-secondary hover:text-white transition-all text-sm font-bold">
                                        📂 Questions
                                    </Link>
                                    <button
                                        onClick={() => openAssignModal(exam)}
                                        className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all text-sm font-bold"
                                    >
                                        🎓 Assign
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-12 relative shadow-2xl">
                        <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 text-xl">✕</button>
                        <h2 className="text-3xl font-display text-primary mb-8">{editingExam ? 'Edit' : 'Create'} Examination</h2>

                        <form onSubmit={handleCreateOrUpdate} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Title</label>
                                <input
                                    type="text" required
                                    className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 focus:border-primary/30 focus:outline-none transition-colors"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. JAMB Mathematics 2024 Mock"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Category</label>
                                    <select
                                        className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 focus:outline-none"
                                        value={formData.exam_type}
                                        onChange={e => setFormData({ ...formData, exam_type: e.target.value })}
                                    >
                                        <option value="JAMB">JAMB</option>
                                        <option value="WAEC">WAEC</option>
                                        <option value="NECO">NECO</option>
                                        <option value="JSSCE">JSSCE</option>
                                        <option value="PRIMARY">PRIMARY</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Subject</label>
                                    <select
                                        className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 focus:outline-none"
                                        value={formData.subject}
                                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Subject</option>
                                        {westernSubjects.length > 0 && (
                                            <optgroup label="── Western Education">
                                                {westernSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </optgroup>
                                        )}
                                        {islamicSubjects.length > 0 && (
                                            <optgroup label="── Islamic Education">
                                                {islamicSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </optgroup>
                                        )}
                                        {islamicSubjects.length === 0 && westernSubjects.length === 0 &&
                                            subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                        }
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Year</label>
                                    <input
                                        type="number" required
                                        className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 focus:outline-none"
                                        value={formData.year}
                                        onChange={e => setFormData({ ...formData, year: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Duration (Mins)</label>
                                    <input
                                        type="number" required
                                        className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 focus:outline-none"
                                        value={formData.duration_minutes}
                                        onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full btn btn-primary py-4 mt-8 shadow-xl shadow-primary/20">
                                {editingExam ? 'Update' : 'Create'} Examination Engine
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Exam Modal */}
            {showAssignModal && assigningExam && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary to-primary-700 p-8 text-white relative">
                            <h2 className="text-2xl font-display font-bold">Assign Exam to Students</h2>
                            <p className="text-primary-100/80 text-sm mt-1 font-medium">📝 {assigningExam.title}</p>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="absolute top-6 right-6 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                            >✕</button>
                        </div>

                        <div className="p-8 space-y-5">
                            {/* Search */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Search Students</label>
                                <input
                                    type="text"
                                    placeholder="Type name or username..."
                                    className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 focus:border-primary/30 focus:outline-none transition-colors text-sm"
                                    value={studentSearch}
                                    onChange={e => setStudentSearch(e.target.value)}
                                />
                            </div>

                            {/* Student List */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Select Students ({selectedStudents.length} selected)
                                    </label>
                                    {filteredStudents.length > 0 && (
                                        <button
                                            onClick={() => {
                                                const allIds = filteredStudents.map(s => s.user?.id || s.id);
                                                const allSelected = allIds.every(id => selectedStudents.includes(id));
                                                setSelectedStudents(allSelected ? [] : allIds);
                                            }}
                                            className="text-[10px] font-bold text-primary hover:underline uppercase"
                                        >
                                            {filteredStudents.every(s => selectedStudents.includes(s.user?.id || s.id)) ? 'Deselect All' : 'Select All'}
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50">
                                    {filteredStudents.length === 0 ? (
                                        <p className="p-6 text-center text-slate-400 text-sm italic">No students found.</p>
                                    ) : filteredStudents.map(s => {
                                        const uid = s.user?.id || s.id;
                                        const isSelected = selectedStudents.includes(uid);
                                        return (
                                            <button
                                                key={uid}
                                                onClick={() => toggleStudent(uid)}
                                                className={`w-full flex items-center gap-4 p-4 text-left transition-all ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                                    {isSelected && <span className="text-white text-xs font-black">✓</span>}
                                                </div>
                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
                                                    {(s.user?.first_name || s.user?.username || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">
                                                        {s.user?.first_name} {s.user?.last_name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400">@{s.user?.username}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Due Date (Optional)</label>
                                <input
                                    type="datetime-local"
                                    className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 focus:outline-none text-sm"
                                    value={assignDueDate}
                                    onChange={e => setAssignDueDate(e.target.value)}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignExam}
                                    disabled={assigning || selectedStudents.length === 0}
                                    className="flex-[2] py-4 bg-primary text-white font-black uppercase text-xs rounded-2xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {assigning ? 'Assigning...' : `Assign to ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''} →`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminExamManager;

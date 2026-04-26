import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const AdminQuestionManager = () => {
    const { examId } = useParams();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [formData, setFormData] = useState({
        text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A'
    });

    useEffect(() => {
        const fetchExamData = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/${examId}/`);
                setExam(res.data);
                setQuestions(res.data.questions || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchExamData();
    }, [examId]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingQuestion) {
                await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/exams/questions/${editingQuestion.id}/`, formData);
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/exams/list/${examId}/add_question/`, formData);
            }
            window.location.reload();
        } catch (_err) {
            alert('Error saving question. Ensure backend supports add_question action.');
        }
    };

    if (!exam) return <div className="p-20 text-center">Loading Question Bank...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="container pt-32 pb-20">
                <div className="mb-12 flex justify-between items-end">
                    <div>
                        <Link to="/admin/exams" className="text-primary font-bold text-sm mb-4 inline-block">← Back to Exams</Link>
                        <h1 className="text-4xl font-display text-primary mb-2">Question Bank: {exam.title}</h1>
                        <p className="text-slate-500">{questions.length} Questions currently in this set.</p>
                    </div>
                    <button
                        onClick={() => { setEditingQuestion(null); setFormData({ text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' }); setShowModal(true); }}
                        className="btn btn-primary px-8 py-4 shadow-xl shadow-primary/20"
                    >
                        + Add New Question
                    </button>
                </div>

                <div className="space-y-6">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 relative group">
                            <div className="absolute -left-3 top-8 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg">
                                {idx + 1}
                            </div>
                            <div className="flex justify-between items-start mb-6 px-4">
                                <h3 className="text-xl font-bold text-slate-800 pr-20">{q.text}</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setEditingQuestion(q); setFormData(q); setShowModal(true); }}
                                        className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 px-4">
                                {['a', 'b', 'c', 'd'].map(opt => (
                                    <div key={opt} className={`p-4 rounded-xl border-2 flex items-center gap-4 ${q.correct_option === opt.toUpperCase() ? 'border-green-500 bg-green-50 text-green-900' : 'border-slate-50 text-slate-500'}`}>
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${q.correct_option === opt.toUpperCase() ? 'bg-green-500 text-white' : 'bg-slate-100'}`}>
                                            {opt.toUpperCase()}
                                        </span>
                                        <span className="font-medium">{q[`option_${opt}`]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-12 relative shadow-2xl animate-in zoom-in-95">
                        <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600">✕</button>
                        <h2 className="text-3xl font-display text-primary mb-8">{editingQuestion ? 'Edit' : 'Add'} Question</h2>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Question Text</label>
                                <textarea
                                    required rows="3"
                                    className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100"
                                    value={formData.text}
                                    onChange={e => setFormData({ ...formData, text: e.target.value })}
                                    placeholder="Enter question wording..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                {['a', 'b', 'c', 'd'].map(opt => (
                                    <div key={opt}>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Option {opt.toUpperCase()}</label>
                                        <input
                                            type="text" required
                                            className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100"
                                            value={formData[`option_${opt}`]}
                                            onChange={e => setFormData({ ...formData, [`option_${opt}`]: e.target.value })}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Correct Answer</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['A', 'B', 'C', 'D'].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, correct_option: val })}
                                            className={`py-3 rounded-xl border-2 font-black transition-all ${formData.correct_option === val ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full btn btn-primary py-4 mt-8">
                                {editingQuestion ? 'Update' : 'Add to Bank'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminQuestionManager;

import { useState, useEffect, useCallback } from 'react';
import api, { asList } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { PageHeader } from '../../components/layout';
import { SkeletonCard } from '../../components/ui';

export default function TutorMaterials() {
    const { token } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const [materials, setMaterials] = useState([]);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [matRes, studRes] = await Promise.all([
                api.get(`/api/curriculum/materials/`),
                api.get(`/api/students/tutor/my-students/`),
            ]);
            setMaterials(asList(matRes.data));
            setAssignedStudents(asList(studRes.data));
        } catch (err) {
            console.error('Materials fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, [token, getAuthHeader]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploading(true);
        const formData = new FormData(e.target);
        if (selectedStudents.length > 0) {
            selectedStudents.forEach(id => formData.append('assigned_students', id));
        }
        try {
            await api.post(`/api/curriculum/materials/`, formData, {
                headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
            });
            await fetchData();
            e.target.reset();
            setSelectedStudents([]);
            toast.success('Material uploaded successfully!');
        } catch (err) {
            toast.error('Failed to upload material: ' + (err.response?.data?.error || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Archive this material permanently?', { confirmLabel: 'Archive', danger: true })) return;
        await api.delete(`/api/curriculum/materials/${id}/`);
        fetchData();
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Materials — Hidayah</title>
            <PageHeader title="Resource Distribution" description="Upload and manage learning materials for your students." />

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 mb-12">
                <form className="grid md:grid-cols-2 gap-8" onSubmit={handleUpload}>
                    <div className="space-y-3">
                        <label htmlFor="title" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Asset Title</label>
                        <input id="title" name="title" required className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:border-blue-600/50 transition-all font-bold text-slate-900 placeholder:text-slate-300" placeholder="e.g., Advanced Tajweed Module 1" />
                    </div>
                    <div className="space-y-3">
                        <label htmlFor="material_type" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Classification</label>
                        <select id="material_type" name="material_type" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:border-blue-600/50 transition-all font-bold text-slate-900">
                            <option value="VIDEO">Video Coursework</option>
                            <option value="PDF">Academic Document (PDF)</option>
                            <option value="AUDIO">Audio Recitation / Podcast</option>
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Target Audience (Optional)</label>
                        <div className="w-full px-6 py-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 max-h-40 overflow-y-auto space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedStudents.length === 0}
                                    onChange={() => setSelectedStudents([])}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                />
                                <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Global Broadcast</span>
                            </label>
                            <div className="h-px bg-slate-100 my-2" />
                            {assignedStudents.map(student => {
                                const sId = student.id || student.user_details?.id;
                                return (
                                    <label key={sId} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(sId)}
                                            onChange={e => {
                                                if (e.target.checked) setSelectedStudents([...selectedStudents, sId]);
                                                else setSelectedStudents(selectedStudents.filter(id => id !== sId));
                                            }}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                        />
                                        <span className="text-[11px] font-bold text-slate-500">{student.full_name || student.user_details?.first_name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <div className="space-y-3 md:col-span-2">
                        <label htmlFor="description" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Educational Context</label>
                        <textarea id="description" name="description" rows="3" className="w-full px-6 py-5 rounded-3xl border border-slate-100 bg-slate-50 focus:border-blue-600/30 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300 leading-relaxed" placeholder="Provide a brief synopsis of this learning resource..." />
                    </div>
                    <div className="space-y-3">
                        <label htmlFor="file" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Source File</label>
                        <div className="relative group">
                            <input id="file" type="file" name="file" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 group-hover:bg-slate-100 transition-all flex items-center gap-4 text-slate-500 font-bold overflow-hidden">
                                <span className="bg-blue-600/10 text-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase">Attach</span>
                                <span className="text-[10px] truncate">Select file from system...</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button disabled={uploading} type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                            {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</> : 'Finalize Broadcast →'}
                        </button>
                    </div>
                </form>
            </div>

            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 px-2 mb-8">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full shadow-lg shadow-blue-600/20"></span>
                Asset Library
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {materials.length > 0 ? materials.map(mat => (
                    <div key={mat.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-blue-600/20 transition-all group relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 p-6">
                            <button
                                onClick={() => handleDelete(mat.id)}
                                className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-xs opacity-0 group-hover:opacity-100"
                            >✕</button>
                        </div>
                        <div className="flex flex-col h-full">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl mb-6 border border-blue-100 group-hover:scale-110 transition-transform">
                                {mat.material_type === 'VIDEO' ? '🎥' : mat.material_type === 'PDF' ? '📄' : '🎵'}
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors">{mat.title}</h4>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6 px-3 py-1 bg-slate-50 rounded-lg inline-block self-start">{mat.material_type}</p>
                            <p className="text-xs text-slate-500 line-clamp-3 mb-8 leading-relaxed font-medium flex-grow">{mat.description}</p>
                            <a href={mat.file} target="_blank" rel="noreferrer" className="w-full py-4 text-center bg-slate-50 rounded-2xl text-[10px] font-black text-blue-600 hover:bg-blue-600 hover:text-white uppercase tracking-widest transition-all border border-blue-100 shadow-sm">
                                View Resource ↗
                            </a>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-24 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                        <p className="text-slate-500 font-bold">No academic assets synchronized yet.</p>
                    </div>
                )}
            </div>
        </>
    );
}

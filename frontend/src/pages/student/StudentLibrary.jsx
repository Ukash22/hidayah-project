import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search as IconSearch, Download as IconDownload, FileText as IconFileText, ExternalLink as IconExternalLink, PlayCircle as IconPlayCircle, Music as IconMusic, BookOpen as IconBookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import { EmptyState } from '../../components/ui';

export default function StudentLibrary() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [materials, setMaterials] = useState([]);
    const [profile, setProfile] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/curriculum/materials/`, { headers: getAuthHeader() }),
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/students/me/`, { headers: getAuthHeader() }),
        ]).then(([matRes, profRes]) => {
            setMaterials(Array.isArray(matRes.data) ? matRes.data : []);
            setProfile(profRes.data);
        }).catch(err => console.error('Library fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    const filtered = materials.filter(m =>
        m.title?.toLowerCase().includes(search.toLowerCase()) ||
        m.description?.toLowerCase().includes(search.toLowerCase())
    );

    const TypeIcon = ({ type }) => {
        if (type === 'VIDEO') return <IconPlayCircle className="text-blue-600" />;
        if (type === 'PDF') return <IconFileText className="text-indigo-600" />;
        return <IconMusic className="text-sky-600" />;
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            <title>Learning Library — Hidayah</title>
            <PageHeader
                title="Digital Learning Bank"
                actions={
                    <div className="relative w-64">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search resources..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-600/40 transition-all shadow-sm"
                        />
                    </div>
                }
            />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.length > 0 ? filtered.map((mat, i) => (
                    <motion.div key={i} whileHover={{ y: -5 }} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 group hover:border-blue-600/30 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl shadow-inner ring-1 ring-slate-100">
                                <TypeIcon type={mat.material_type} />
                            </div>
                            <button className="text-slate-400 hover:text-slate-900 transition-colors"><IconExternalLink size={20} /></button>
                        </div>
                        <h4 className="text-2xl font-display font-black text-slate-900 mb-2 leading-tight line-clamp-2">{mat.title}</h4>
                        <p className="text-sm font-medium text-slate-400 leading-relaxed line-clamp-2 mb-8">{mat.description}</p>
                        <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{mat.material_type}</span>
                            <a href={mat.file || mat.external_url} target="_blank" rel="noreferrer" className="bg-blue-600/10 text-blue-600 p-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                                <IconDownload size={18} />
                            </a>
                        </div>
                    </motion.div>
                )) : (
                    <div className="col-span-full">
                        <EmptyState
                            icon={IconBookOpen}
                            title={profile?.wallet_balance <= 0 ? 'Library locked' : (search ? 'No results' : 'No materials yet')}
                            description={profile?.wallet_balance <= 0
                                ? 'Complete your monthly payment to access learning materials.'
                                : search
                                    ? `No materials match "${search}".`
                                    : 'No learning resources have been uploaded for your courses yet.'}
                            action={profile?.wallet_balance <= 0
                                ? { label: 'Add Funds', onClick: () => navigate('/student/finance') }
                                : search ? { label: 'Clear search', onClick: () => setSearch('') } : undefined}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

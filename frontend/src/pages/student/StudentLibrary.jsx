import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { asList } from '../../services/api';
import { motion } from 'framer-motion';
import { Search as IconSearch, Download as IconDownload, FileText as IconFileText, ExternalLink as IconExternalLink, PlayCircle as IconPlayCircle, Music as IconMusic, BookOpen as IconBookOpen, Link as IconLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout';
import { EmptyState, SkeletonCard } from '../../components/ui';

export default function StudentLibrary() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [materials, setMaterials] = useState([]);
    const [profile, setProfile] = useState(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [loading, setLoading] = useState(true);

    const getAuthHeader = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            api.get(`/api/curriculum/materials/`),
            api.get(`/api/students/me/`),
        ]).then(([matRes, profRes]) => {
            setMaterials(asList(matRes.data));
            setProfile(profRes.data);
        }).catch(err => console.error('Library fetch failed', err))
            .finally(() => setLoading(false));
    }, [token, getAuthHeader]);

    const filtered = materials.filter(m => {
        const matchesSearch = !search ||
            m.title?.toLowerCase().includes(search.toLowerCase()) ||
            m.description?.toLowerCase().includes(search.toLowerCase());
        const matchesType = !typeFilter || m.material_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const TYPE_CHIPS = [
        { value: '', label: 'All', icon: IconBookOpen, color: 'text-slate-600' },
        { value: 'VIDEO', label: 'Video', icon: IconPlayCircle, color: 'text-primary' },
        { value: 'PDF', label: 'PDF', icon: IconFileText, color: 'text-indigo-600' },
        { value: 'AUDIO', label: 'Audio', icon: IconMusic, color: 'text-sky-600' },
        { value: 'LINK', label: 'Link', icon: IconLink, color: 'text-emerald-600' },
    ].filter(chip => chip.value === '' || materials.some(m => m.material_type === chip.value));

    const TypeIcon = ({ type }) => {
        if (type === 'VIDEO') return <IconPlayCircle className="text-primary" />;
        if (type === 'PDF') return <IconFileText className="text-indigo-600" />;
        if (type === 'AUDIO') return <IconMusic className="text-sky-600" />;
        return <IconLink className="text-emerald-600" />;
    };

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    return (
        <>
            <title>Learning Library — Hidayah</title>
            <PageHeader
                title="Digital Learning Bank"
                actions={
                    <div className="relative w-64">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search resources..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-primary/40 transition-all shadow-sm"
                        />
                    </div>
                }
            />

            {TYPE_CHIPS.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-8">
                    {TYPE_CHIPS.map(chip => {
                        const Icon = chip.icon;
                        const count = chip.value === '' ? materials.length : materials.filter(m => m.material_type === chip.value).length;
                        const active = typeFilter === chip.value;
                        return (
                            <button
                                key={chip.value}
                                onClick={() => setTypeFilter(chip.value)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide border transition-all ${
                                    active
                                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:text-primary'
                                }`}
                            >
                                <Icon size={13} className={active ? 'text-white' : chip.color} />
                                {chip.label}
                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.length > 0 ? filtered.map((mat, i) => (
                    <motion.div key={i} whileHover={{ y: -5 }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-card-lg p-5 md:p-8 group hover:border-primary/30 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/60 rounded-3xl flex items-center justify-center text-3xl shadow-inner ring-1 ring-slate-100">
                                <TypeIcon type={mat.material_type} />
                            </div>
                            <a href={mat.file || mat.external_url} target="_blank" rel="noreferrer" aria-label="Open resource" className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"><IconExternalLink size={20} /></a>
                        </div>
                        <h4 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight line-clamp-2">{mat.title}</h4>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed line-clamp-2 mb-8">{mat.description}</p>
                        <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">{mat.material_type}</span>
                            <a href={mat.file || mat.external_url} target="_blank" rel="noreferrer" className="bg-primary/10 text-primary p-3 rounded-xl hover:bg-primary hover:text-white transition-all">
                                <IconDownload size={18} />
                            </a>
                        </div>
                    </motion.div>
                )) : (
                    <div className="col-span-full">
                        <EmptyState
                            icon={IconBookOpen}
                            title={
                                profile?.wallet_balance <= 0 ? 'Library locked'
                                : (search || typeFilter) ? 'No results'
                                : 'No materials yet'
                            }
                            description={
                                profile?.wallet_balance <= 0
                                    ? 'Complete your monthly payment to access learning materials.'
                                    : (search || typeFilter)
                                        ? `No ${typeFilter || ''} materials${search ? ` matching "${search}"` : ''}.`
                                        : 'No learning resources have been uploaded for your courses yet.'
                            }
                            action={
                                profile?.wallet_balance <= 0
                                    ? { label: 'Add Funds', onClick: () => navigate('/student/finance') }
                                    : (search || typeFilter)
                                        ? { label: 'Clear filters', onClick: () => { setSearch(''); setTypeFilter(''); } }
                                        : undefined
                            }
                        />
                    </div>
                )}
            </div>
        </>
    );
}

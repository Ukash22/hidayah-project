import React, { useState, useEffect } from 'react';
import { Files, Palette, Library, Image as ImageIcon, FileText, FileUp, X, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const LibraryPanel = ({ excalidrawAPI, onClose }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('pages');
    
    // Pages State - Store elements array inside each page
    const [pages, setPages] = useState([{ id: 'page-1', name: 'Page 1', elements: [] }]);
    const [currentPageId, setCurrentPageId] = useState('page-1');

    // Library State
    const [savedBoards, setSavedBoards] = useState(() => JSON.parse(localStorage.getItem('hidayah_saved_boards') || '[]'));

    const saveCurrentPageElements = () => {
        if (!excalidrawAPI) return;
        const currentElements = excalidrawAPI.getSceneElements();
        setPages(prev => prev.map(p => p.id === currentPageId ? { ...p, elements: currentElements } : p));
    };

    const handleAddPage = () => {
        if (!excalidrawAPI) return;
        saveCurrentPageElements();
        const newId = `page-${Date.now()}`;
        setPages(prev => [...prev, { id: newId, name: `Page ${prev.length + 1}`, elements: [] }]);
        setCurrentPageId(newId);
        excalidrawAPI.updateScene({ elements: [] });
    };

    const handleSwitchPage = (id) => {
        if (!excalidrawAPI || id === currentPageId) return;
        saveCurrentPageElements();
        
        // Find the page we are switching to and load its elements
        const targetPage = pages.find(p => p.id === id);
        setCurrentPageId(id);
        excalidrawAPI.updateScene({ elements: targetPage?.elements || [] }); 
    };

    const changeBgColor = (color) => {
        if (excalidrawAPI) {
            excalidrawAPI.updateScene({ 
                appState: { viewBackgroundColor: color } 
            });
        }
    };

    const saveToLibrary = () => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        if (elements.length === 0) { toast.warning('Board is empty!'); return; }

        const newBoard = {
            id: Date.now(),
            name: `Board ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            elements: elements
        };
        const updated = [newBoard, ...savedBoards];
        setSavedBoards(updated);
        localStorage.setItem('hidayah_saved_boards', JSON.stringify(updated));
        toast.success('Saved to library!');
    };

    const loadFromLibrary = (board) => {
        if (excalidrawAPI) {
            excalidrawAPI.updateScene({ elements: board.elements });
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !excalidrawAPI) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataURL = event.target.result;
            
            // Generate random file id
            const fileId = "file-" + Math.random().toString(36).substr(2, 9);
            
            excalidrawAPI.addFiles([{
                id: fileId,
                dataURL: dataURL,
                mimeType: file.type,
                created: Date.now(),
                lastRetrieved: Date.now(),
            }]);

            const imgElement = {
                type: "image",
                x: 200,
                y: 200,
                width: 400,
                height: 300,
                fileId: fileId,
                scale: [1, 1],
                isDeleted: false,
                fillStyle: "hachure",
                strokeWidth: 1,
                strokeStyle: "solid",
                roughness: 1,
                opacity: 100,
                groupIds: [],
                strokeColor: "#000000",
                backgroundColor: "transparent",
                version: 1,
                versionNonce: Math.floor(Math.random() * 1000000),
                id: "img-" + Math.random().toString(36).substr(2, 9),
            };

            const elements = excalidrawAPI.getSceneElements();
            excalidrawAPI.updateScene({ elements: [...elements, imgElement] });
        };
        reader.readAsDataURL(file);
    };

    const tabs = [
        { id: 'pages', icon: <Files size={16}/>, label: 'Pages' },
        { id: 'color', icon: <Palette size={16}/>, label: 'Background' },
        { id: 'library', icon: <Library size={16}/>, label: 'Library' },
        { id: 'import', icon: <FileUp size={16}/>, label: 'Import' },
    ];

    return (
        <div className="absolute right-4 top-20 bottom-24 w-80 bg-white/95 backdrop-blur-3xl rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden flex flex-col z-[2000] transition-all transform origin-right">
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2 text-white">
                    <div className="p-1.5 bg-white/20 rounded-xl"><Library size={20} /></div>
                    <h3 className="font-black tracking-tight">Board Settings</h3>
                </div>
                <button onClick={onClose} aria-label="Close panel" className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-xl transition-all">
                    <X size={18} />
                </button>
            </div>

            <div className="flex overflow-x-auto p-2 gap-1 bg-slate-50 border-b border-slate-100 scrollbar-hide">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-teal-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'}`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white/50">
                {activeTab === 'pages' && (
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={handleAddPage}
                            className="w-full py-3 bg-teal-50 text-teal-600 border border-teal-200 border-dashed rounded-xl font-black text-sm uppercase tracking-widest hover:bg-teal-100 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> Add New Page
                        </button>
                        
                        <div className="space-y-2">
                            {pages.map((page, idx) => (
                                <button 
                                    key={page.id}
                                    onClick={() => handleSwitchPage(page.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${currentPageId === page.id ? 'bg-teal-600 text-white border-teal-700 shadow-lg' : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${currentPageId === page.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                            {idx + 1}
                                        </div>
                                        <span className="font-bold">{page.name}</span>
                                    </div>
                                    {currentPageId === page.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'color' && (
                    <div className="flex flex-col gap-4">
                         <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Board Color</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { color: '#ffffff', name: 'Whiteboard', border: '#e2e8f0' },
                                    { color: '#1e293b', name: 'Blackboard', border: '#0f172a' },
                                    { color: '#0f172a', name: 'Dark Slate', border: '#020617' },
                                    { color: '#fef3c7', name: 'Sepia', border: '#fde68a' },
                                    { color: '#ecfdf5', name: 'Mint', border: '#a7f3d0' },
                                    { color: '#eff6ff', name: 'Blueprint', border: '#bfdbfe' },
                                ].map(theme => (
                                    <button 
                                        key={theme.name}
                                        onClick={() => changeBgColor(theme.color)}
                                        className="h-16 rounded-xl border-2 hover:scale-105 transition-all flex items-end justify-center pb-2 shadow-sm relative overflow-hidden group"
                                        style={{ backgroundColor: theme.color, borderColor: theme.border }}
                                    >
                                        <span className={`text-[10px] font-black uppercase tracking-wider z-10 ${theme.color === '#ffffff' || theme.color === '#fef3c7' || theme.color === '#ecfdf5' || theme.color === '#eff6ff' ? 'text-slate-800' : 'text-white'}`}>{theme.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'library' && (
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={saveToLibrary}
                            className="w-full py-3 bg-teal-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
                        >
                            <Library size={16} /> Save Current Board
                        </button>
                        
                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Saved Boards</label>
                            {savedBoards.length === 0 ? (
                                <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-xl">No saved boards yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {savedBoards.map(board => (
                                        <div key={board.id} className="flex items-center gap-2">
                                            <button 
                                                onClick={() => loadFromLibrary(board)}
                                                className="flex-1 flex flex-col items-start px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-teal-50 hover:border-teal-200 transition-all text-left"
                                            >
                                                <span className="font-bold text-slate-800 text-sm truncate w-full">{board.name}</span>
                                                <span className="text-[10px] text-slate-500">{board.elements.length} items</span>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const updated = savedBoards.filter(b => b.id !== board.id);
                                                    setSavedBoards(updated);
                                                    localStorage.setItem('hidayah_saved_boards', JSON.stringify(updated));
                                                }}
                                                className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'import' && (
                    <div className="flex flex-col gap-4">
                        <div className="text-center p-6 border-2 border-dashed border-teal-200 bg-teal-50 rounded-2xl relative hover:bg-teal-100 transition-all cursor-pointer group">
                            <input 
                                type="file" 
                                accept="image/*,application/pdf,.doc,.docx"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center gap-3 text-teal-600">
                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileUp size={24} />
                                </div>
                                <div>
                                    <p className="font-black">Click or Drag to Import</p>
                                    <p className="text-xs font-medium text-teal-600/70">Images, Word, PDF</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2">
                                <ImageIcon size={16} className="text-blue-500" />
                                <span className="text-xs font-bold text-slate-600">Images (.png, .jpg)</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2">
                                <FileText size={16} className="text-rose-500" />
                                <span className="text-xs font-bold text-slate-600">Documents (.pdf)</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LibraryPanel;

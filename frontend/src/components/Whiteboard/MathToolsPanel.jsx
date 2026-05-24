import React, { useState } from 'react';
import { Calculator, FunctionSquare, PieChart, DraftingCompass, Ruler, SquareFunction, X } from 'lucide-react';

const MathToolsPanel = ({ excalidrawAPI, onClose }) => {
    const [activeTab, setActiveTab] = useState('equations');
    
    // Calculator State
    const [calcInput, setCalcInput] = useState('');

    // Graph State
    const [graphEquation, setGraphEquation] = useState('x^2');
    const [graphColor, setGraphColor] = useState('#10b981');

    // Angle State
    const [angleDegrees, setAngleDegrees] = useState(90);
    const [angleRadius] = useState(100);

    // Pie Chart State
    const [pieNumerator, setPieNumerator] = useState(1);
    const [pieDenominator, setPieDenominator] = useState(4);
    const [pieColor, setPieColor] = useState('#3b82f6');

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const insertText = (text, size = 20) => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        const newElement = {
            id: generateId(),
            type: "text",
            x: 200 + Math.random() * 100,
            y: 200 + Math.random() * 100,
            width: text.length * (size * 0.6),
            height: size * 1.5,
            text: text,
            fontSize: size,
            fontFamily: 1,
            textAlign: "left",
            verticalAlign: "top",
            strokeColor: "#000000",
            backgroundColor: "transparent",
            fillStyle: "hachure",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            groupIds: [],
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000000),
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
        };
        excalidrawAPI.updateScene({ elements: [...elements, newElement] });
    };

    const insertLine = (points, color = "#000000") => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        const newElement = {
            id: generateId(),
            type: "line",
            x: 200 + Math.random() * 50,
            y: 200 + Math.random() * 50,
            width: Math.abs(points[points.length-1][0] - points[0][0]),
            height: Math.abs(points[points.length-1][1] - points[0][1]),
            strokeColor: color,
            backgroundColor: "transparent",
            fillStyle: "hachure",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            groupIds: [],
            points: points,
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000000),
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
        };
        excalidrawAPI.updateScene({ elements: [...elements, newElement] });
    };

    const handleCalculatorEval = () => {
        try {
            // Safe basic eval for calculator
            const sanitized = calcInput.replace(/[^0-9+\-*/().]/g, '');
            const result = new Function('return ' + sanitized)();
            setCalcInput(String(result));
        } catch(_e) {
            setCalcInput('Error');
        }
    };

    const insertGraph = () => {
        // Simple graph generator for y = x^2, sin(x), etc.
        const points = [];
        const scale = 20; // 20px per unit
        
        for (let x = -10; x <= 10; x += 0.5) {
            let y = 0;
            const expr = graphEquation.toLowerCase();
            try {
                if (expr.includes('sin')) y = Math.sin(x);
                else if (expr.includes('cos')) y = Math.cos(x);
                else if (expr.includes('x^2')) y = x * x;
                else if (expr.includes('x^3')) y = x * x * x;
                else y = x; // default y = x
            } catch (_e) { /* ignore */ }
            
            // Map to SVG-like coordinates
            points.push([(x + 10) * scale, (-y + 10) * scale]);
        }
        
        // Insert X and Y axis
        insertLine([[0, 10*scale], [20*scale, 10*scale]], "#94a3b8"); // X axis
        insertLine([[10*scale, 0], [10*scale, 20*scale]], "#94a3b8"); // Y axis
        // Insert the curve
        insertLine(points, graphColor);
    };

    const insertAngle = () => {
        const rad = angleRadius;
        const angleRad = (angleDegrees * Math.PI) / 180;
        
        // Base line
        insertLine([[0, 0], [rad, 0]], "#000000");
        // Angle line
        const endX = Math.cos(angleRad) * rad;
        const endY = -Math.sin(angleRad) * rad; // Negative because Y goes down
        insertLine([[0, 0], [endX, endY]], "#ef4444");
        
        // Insert angle text
        insertText(`${angleDegrees}°`, 16);
    };

    const insertPieChart = () => {
        // A simple visual representation: A circle and lines dividing it
        const elements = excalidrawAPI?.getSceneElements() || [];
        const radius = 100;
        const id = generateId();
        const centerX = 300;
        const centerY = 300;
        
        const circle = {
            id: id,
            type: "ellipse",
            x: centerX,
            y: centerY,
            width: radius * 2,
            height: radius * 2,
            strokeColor: "#000000",
            backgroundColor: pieColor,
            fillStyle: "hachure",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            groupIds: [],
            version: 1,
            versionNonce: Math.floor(Math.random() * 1000000),
            isDeleted: false,
        };
        
        // Calculate lines based on denominator
        const lines = [];
        for(let i=0; i<pieDenominator; i++) {
            const angle = (i * 2 * Math.PI) / pieDenominator;
            const ex = Math.cos(angle) * radius;
            const ey = Math.sin(angle) * radius;
            lines.push({
                id: generateId(),
                type: "line",
                x: centerX + radius,
                y: centerY + radius,
                width: Math.abs(ex),
                height: Math.abs(ey),
                strokeColor: "#ffffff",
                backgroundColor: "transparent",
                fillStyle: "hachure",
                strokeWidth: 3,
                strokeStyle: "solid",
                roughness: 0,
                opacity: 100,
                groupIds: [],
                points: [[0, 0], [ex, ey]],
                version: 1,
                versionNonce: Math.floor(Math.random() * 100000),
                isDeleted: false,
            });
        }
        
        excalidrawAPI.updateScene({ elements: [...elements, circle, ...lines] });
        insertText(`${pieNumerator}/${pieDenominator}`, 24);
    };

    const insertInstrument = (type) => {
        if (type === 'ruler') {
            insertText("📏 [Ruler: 0cm   5cm   10cm   15cm]", 24);
            insertLine([[0,0], [300, 0], [300, 40], [0, 40], [0,0]]);
        } else if (type === 'protractor') {
            insertText("📐 Protractor", 24);
            // Draw a semicircle approximation
            const pts = [];
            for(let i=0; i<=180; i+=10) {
                const a = (i * Math.PI) / 180;
                pts.push([Math.cos(a)*100 + 100, -Math.sin(a)*100]);
            }
            insertLine(pts, "#3b82f6");
            insertLine([[0,0], [200,0]], "#3b82f6");
        }
    };

    const tabs = [
        { id: 'calculator', icon: <Calculator size={16}/>, label: 'Calculator' },
        { id: 'equations', icon: <FunctionSquare size={16}/>, label: 'Equations' },
        { id: 'graphs', icon: <SquareFunction size={16}/>, label: 'Graphs' },
        { id: 'angles', icon: <DraftingCompass size={16}/>, label: 'Angles' },
        { id: 'pie', icon: <PieChart size={16}/>, label: 'Pie Charts' },
        { id: 'instruments', icon: <Ruler size={16}/>, label: 'Instruments' },
    ];

    return (
        <div className="absolute left-4 top-20 bottom-24 w-80 bg-white/95 backdrop-blur-3xl rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden flex flex-col z-[2000] transition-all transform origin-left">
            <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2 text-white">
                    <div className="p-1.5 bg-white/20 rounded-xl"><Calculator size={20} /></div>
                    <h3 className="font-black tracking-tight">Math Suite</h3>
                </div>
                <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-xl transition-all">
                    <X size={18} />
                </button>
            </div>

            <div className="flex overflow-x-auto p-2 gap-1 bg-slate-50 border-b border-slate-100 scrollbar-hide">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'}`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white/50">
                {activeTab === 'calculator' && (
                    <div className="flex flex-col gap-4 h-full">
                        <div className="bg-slate-900 rounded-2xl p-4 shadow-inner border border-slate-800">
                            <input 
                                type="text" 
                                value={calcInput}
                                onChange={(e) => setCalcInput(e.target.value)}
                                className="w-full bg-transparent text-right text-3xl font-mono text-emerald-400 outline-none placeholder-slate-600"
                                placeholder="0"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-2 flex-1">
                            {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','C','+'].map(btn => (
                                <button 
                                    key={btn}
                                    onClick={() => {
                                        if (btn === 'C') setCalcInput('');
                                        else setCalcInput(prev => prev + btn);
                                    }}
                                    className="bg-white border border-slate-200 rounded-xl font-black text-slate-700 text-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center justify-center py-4"
                                >
                                    {btn}
                                </button>
                            ))}
                            <button 
                                onClick={handleCalculatorEval}
                                className="col-span-4 bg-indigo-600 text-white rounded-xl font-black text-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 py-3"
                            >
                                =
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'equations' && (
                    <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Custom Equation</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="e.g. y = mx + c"
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { insertText(e.target.value); e.target.value=''; }
                                    }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">Press Enter to insert onto whiteboard</p>
                        </div>

                        <div className="space-y-2 mt-4">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Presets</label>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { name: "Quadratic Formula", eq: "x = [-b ± √(b² - 4ac)] / 2a" },
                                    { name: "Pythagorean Theorem", eq: "a² + b² = c²" },
                                    { name: "Area of Circle", eq: "A = πr²" },
                                    { name: "Euler's Identity", eq: "e^(iπ) + 1 = 0" },
                                    { name: "Trigonometric Identity", eq: "sin²(θ) + cos²(θ) = 1" }
                                ].map((preset, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => insertText(preset.eq)}
                                        className="text-left px-4 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all group flex flex-col gap-1 shadow-sm"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-indigo-400">{preset.name}</span>
                                        <span className="font-mono text-sm text-slate-800 font-bold">{preset.eq}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'graphs' && (
                    <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Function Grapher</label>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-indigo-500 transition-colors">
                                <span className="font-bold text-slate-500 font-mono italic">f(x) =</span>
                                <select 
                                    className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none font-mono"
                                    value={graphEquation}
                                    onChange={(e) => setGraphEquation(e.target.value)}
                                >
                                    <option value="x">x (Linear)</option>
                                    <option value="x^2">x² (Quadratic)</option>
                                    <option value="x^3">x³ (Cubic)</option>
                                    <option value="sin(x)">sin(x) (Sine Wave)</option>
                                    <option value="cos(x)">cos(x) (Cosine Wave)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Line Color</label>
                            <div className="flex gap-2">
                                {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#000000'].map(color => (
                                    <button 
                                        key={color}
                                        onClick={() => setGraphColor(color)}
                                        className={`w-8 h-8 rounded-full shadow-sm transition-all ${graphColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={insertGraph}
                            className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                            <SquareFunction size={16} /> Insert Graph
                        </button>
                    </div>
                )}

                {activeTab === 'angles' && (
                    <div className="flex flex-col gap-4">
                         <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Angle (Degrees)</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="0" max="360" 
                                    value={angleDegrees}
                                    onChange={(e) => setAngleDegrees(Number(e.target.value))}
                                    className="flex-1 accent-indigo-600"
                                />
                                <span className="font-mono font-black text-lg text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg min-w-[60px] text-center">{angleDegrees}°</span>
                            </div>
                        </div>

                        <button 
                            onClick={insertAngle}
                            className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                            <DraftingCompass size={16} /> Draw Angle
                        </button>
                    </div>
                )}

                {activeTab === 'pie' && (
                    <div className="flex flex-col gap-4">
                         <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Fraction</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="number" min="1" max="100"
                                    value={pieNumerator} onChange={(e) => setPieNumerator(Number(e.target.value))}
                                    className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center font-bold text-slate-700 outline-none"
                                />
                                <span className="text-2xl text-slate-300 font-black">/</span>
                                <input 
                                    type="number" min="1" max="100"
                                    value={pieDenominator} onChange={(e) => setPieDenominator(Number(e.target.value))}
                                    className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                         <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Color Theme</label>
                            <div className="flex gap-2">
                                {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                                    <button 
                                        key={color} onClick={() => setPieColor(color)}
                                        className={`w-8 h-8 rounded-full shadow-sm transition-all ${pieColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={insertPieChart}
                            className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                            <PieChart size={16} /> Insert Pie Chart
                        </button>
                    </div>
                )}

                {activeTab === 'instruments' && (
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => insertInstrument('ruler')}
                            className="px-4 py-4 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all group flex items-center gap-4 shadow-sm"
                        >
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Ruler size={24} /></div>
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800">Insert Ruler</span>
                                <span className="text-[10px] text-slate-500">Virtual measuring tool</span>
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => insertInstrument('protractor')}
                            className="px-4 py-4 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all group flex items-center gap-4 shadow-sm"
                        >
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><DraftingCompass size={24} /></div>
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800">Insert Protractor</span>
                                <span className="text-[10px] text-slate-500">Measure precise angles</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MathToolsPanel;

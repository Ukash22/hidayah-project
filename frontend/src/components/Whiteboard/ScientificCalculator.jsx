import React, { useState, useCallback, useEffect, useRef } from "react";
import { X, Calculator } from "lucide-react";

const BTN = ({ label, onClick, variant = "default", wide = false }) => {
    const base = "flex items-center justify-center rounded-xl font-bold text-sm transition-all duration-150 active:scale-95 select-none cursor-pointer h-10";
    const v = {
        default:  "bg-[#1e293b] hover:bg-[#334155] text-slate-200 shadow",
        operator: "bg-indigo-600 hover:bg-indigo-500 text-white shadow",
        equals:   "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg",
        fn:       "bg-[#0f172a] hover:bg-[#1e293b] text-indigo-300 text-xs shadow",
        clear:    "bg-rose-600 hover:bg-rose-500 text-white shadow",
        mem:      "bg-amber-700/80 hover:bg-amber-600 text-amber-100 text-xs shadow",
    };
    return (
        <button onClick={onClick} className={`${base} ${v[variant]} ${wide ? "col-span-2" : ""}`} title={label}>
            {label}
        </button>
    );
};

const ScientificCalculator = ({ onClose }) => {
    const [display, setDisplay] = useState("0");
    const [expression, setExpression] = useState("");
    const [history, setHistory] = useState([]);
    const [isDeg, setIsDeg] = useState(true);
    const [mem, setMem] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [pos, setPos] = useState({ x: 80, y: 80 });
    const isDragging = useRef(false);
    const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

    const toRad = (val) => isDeg ? val * Math.PI / 180 : val;
    const fromRad = (val) => isDeg ? val * 180 / Math.PI : val;

    const safe = (fn) => {
        try {
            const r = fn();
            if (!isFinite(r) || isNaN(r)) return "Error";
            return String(parseFloat(r.toPrecision(12)));
        } catch { return "Error"; }
    };

    const append = useCallback((val) => {
        setDisplay(prev => {
            if (prev === "Error") return String(val);
            if (prev === "0" && !isNaN(val) && val !== ".") return String(val);
            return prev + val;
        });
    }, []);

    const applyFn = useCallback((fn) => {
        setDisplay(prev => {
            const v = parseFloat(prev);
            if (isNaN(v)) return "Error";
            let r;
            switch (fn) {
                case "sin":  r = safe(() => Math.sin(toRad(v))); break;
                case "cos":  r = safe(() => Math.cos(toRad(v))); break;
                case "tan":  r = safe(() => Math.tan(toRad(v))); break;
                case "asin": r = safe(() => fromRad(Math.asin(v))); break;
                case "acos": r = safe(() => fromRad(Math.acos(v))); break;
                case "atan": r = safe(() => fromRad(Math.atan(v))); break;
                case "log":  r = safe(() => Math.log10(v)); break;
                case "ln":   r = safe(() => Math.log(v)); break;
                case "sqrt": r = safe(() => Math.sqrt(v)); break;
                case "cbrt": r = safe(() => Math.cbrt(v)); break;
                case "sq":   r = safe(() => v * v); break;
                case "cube": r = safe(() => v * v * v); break;
                case "inv":  r = safe(() => 1 / v); break;
                case "abs":  r = safe(() => Math.abs(v)); break;
                case "fact": r = safe(() => { if (v < 0 || !Number.isInteger(v)) return NaN; let f=1; for(let i=2;i<=v;i++) f*=i; return f; }); break;
                case "neg":  r = safe(() => -v); break;
                default: return prev;
            }
            setHistory(h => [`${fn}(${v}) = ${r}`, ...h.slice(0, 19)]);
            return r;
        });
    }, [isDeg]);

    const calculate = useCallback(() => {
        setDisplay(prev => {
            if (prev === "Error") return prev;
            const expr = prev
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/π/g, String(Math.PI))
                .replace(/\^/g, "**");
            // eslint-disable-next-line no-new-func
            const r = safe(() => Function('"use strict";return (' + expr + ")")());
            setHistory(h => [`${prev} = ${r}`, ...h.slice(0, 19)]);
            setExpression(prev + " =");
            return r;
        });
    }, []);

    const clear = () => { setDisplay("0"); setExpression(""); };
    const backspace = () => setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0");

    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            const k = e.key;
            if (k >= "0" && k <= "9") append(k);
            else if (k === ".") append(".");
            else if (k === "+") append("+");
            else if (k === "-") append("-");
            else if (k === "*") append("×");
            else if (k === "/") { e.preventDefault(); append("÷"); }
            else if (k === "(") append("(");
            else if (k === ")") append(")");
            else if (k === "Enter" || k === "=") calculate();
            else if (k === "Backspace") backspace();
            else if (k === "Escape") clear();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [append, calculate]);

    const onMouseDown = (e) => {
        isDragging.current = true;
        dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
        e.preventDefault();
    };
    useEffect(() => {
        const move = (e) => {
            if (!isDragging.current) return;
            setPos({ x: dragStart.current.ox + e.clientX - dragStart.current.mx, y: dragStart.current.oy + e.clientY - dragStart.current.my });
        };
        const up = () => { isDragging.current = false; };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
        return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    }, []);

    const displayFontSize = display.length > 14 ? "text-base" : display.length > 10 ? "text-xl" : "text-2xl";

    return (
        <div className="fixed z-[9000] select-none" style={{ left: pos.x, top: pos.y, width: 300 }}>
            {/* Header */}
            <div
                className="flex items-center justify-between bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white px-3 py-2 rounded-t-2xl shadow-xl cursor-grab active:cursor-grabbing"
                onMouseDown={onMouseDown}
            >
                <div className="flex items-center gap-2">
                    <Calculator size={16} />
                    <span className="font-bold text-sm tracking-tight">Scientific Calc</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-semibold">{isDeg ? "DEG" : "RAD"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(p => !p)} className="p-1.5 rounded-lg hover:bg-white/20 transition-all text-white text-xs font-bold">{isMinimized ? "▼" : "—"}</button>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500/60 transition-all"><X size={14} /></button>
                </div>
            </div>

            {!isMinimized && (
                <div className="bg-[#0f172a] rounded-b-2xl shadow-2xl overflow-hidden border border-indigo-900/60">
                    {/* Display */}
                    <div className="px-3 pt-2 pb-1">
                        <div className="text-right text-xs text-slate-500 font-mono h-4 truncate">{expression || "\u00A0"}</div>
                        <div className={`text-right font-mono font-bold text-white ${displayFontSize} mt-0.5 truncate`}>{display}</div>
                    </div>

                    {/* History */}
                    {showHistory && (
                        <div className="mx-2 mb-1 bg-[#1e293b] rounded-xl p-2 max-h-28 overflow-y-auto">
                            {history.length === 0
                                ? <p className="text-center text-slate-500 text-xs py-2">No history yet</p>
                                : history.map((h, i) => <div key={i} className="text-right text-xs font-mono text-slate-400 py-0.5 border-b border-slate-700/50">{h}</div>)
                            }
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="p-2 grid grid-cols-5 gap-1">
                        <BTN label={isDeg ? "DEG" : "RAD"} onClick={() => setIsDeg(p => !p)} variant="mem" />
                        <BTN label="Hist" onClick={() => setShowHistory(p => !p)} variant="fn" />
                        <BTN label="(" onClick={() => append("(")} variant="fn" />
                        <BTN label=")" onClick={() => append(")")} variant="fn" />
                        <BTN label="AC" onClick={clear} variant="clear" />

                        <BTN label="sin" onClick={() => applyFn("sin")} variant="fn" />
                        <BTN label="cos" onClick={() => applyFn("cos")} variant="fn" />
                        <BTN label="tan" onClick={() => applyFn("tan")} variant="fn" />
                        <BTN label="log" onClick={() => applyFn("log")} variant="fn" />
                        <BTN label="ln" onClick={() => applyFn("ln")} variant="fn" />

                        <BTN label="sin⁻¹" onClick={() => applyFn("asin")} variant="fn" />
                        <BTN label="cos⁻¹" onClick={() => applyFn("acos")} variant="fn" />
                        <BTN label="tan⁻¹" onClick={() => applyFn("atan")} variant="fn" />
                        <BTN label="√" onClick={() => applyFn("sqrt")} variant="fn" />
                        <BTN label="∛" onClick={() => applyFn("cbrt")} variant="fn" />

                        <BTN label="x²" onClick={() => applyFn("sq")} variant="fn" />
                        <BTN label="x³" onClick={() => applyFn("cube")} variant="fn" />
                        <BTN label="xⁿ" onClick={() => append("^")} variant="fn" />
                        <BTN label="n!" onClick={() => applyFn("fact")} variant="fn" />
                        <BTN label="1/x" onClick={() => applyFn("inv")} variant="fn" />

                        <BTN label="MC" onClick={() => setMem(0)} variant="mem" />
                        <BTN label="MR" onClick={() => setDisplay(String(mem))} variant="mem" />
                        <BTN label="M+" onClick={() => setMem(m => m + parseFloat(display || 0))} variant="mem" />
                        <BTN label="π" onClick={() => append("π")} variant="mem" />
                        <BTN label="e" onClick={() => setDisplay("2.718281828")} variant="mem" />

                        <BTN label="7" onClick={() => append("7")} />
                        <BTN label="8" onClick={() => append("8")} />
                        <BTN label="9" onClick={() => append("9")} />
                        <BTN label="÷" onClick={() => append("÷")} variant="operator" />
                        <BTN label="⌫" onClick={backspace} variant="clear" />

                        <BTN label="4" onClick={() => append("4")} />
                        <BTN label="5" onClick={() => append("5")} />
                        <BTN label="6" onClick={() => append("6")} />
                        <BTN label="×" onClick={() => append("×")} variant="operator" />
                        <BTN label="+/-" onClick={() => applyFn("neg")} variant="fn" />

                        <BTN label="1" onClick={() => append("1")} />
                        <BTN label="2" onClick={() => append("2")} />
                        <BTN label="3" onClick={() => append("3")} />
                        <BTN label="−" onClick={() => append("-")} variant="operator" />
                        <BTN label="|x|" onClick={() => applyFn("abs")} variant="fn" />

                        <BTN label="0" onClick={() => append("0")} wide />
                        <BTN label="." onClick={() => append(".")} />
                        <BTN label="+" onClick={() => append("+")} variant="operator" />
                        <BTN label="=" onClick={calculate} variant="equals" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScientificCalculator;

import React, { useState } from 'react';

const Calculator = () => {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');

    const handleInput = (val) => {
        if (display === '0' && !['+', '-', '*', '/', '.'].includes(val)) {
            setDisplay(val);
        } else {
            setDisplay(display + val);
        }
    };

    const clear = () => {
        setDisplay('0');
        setEquation('');
    };

    const calculate = () => {
        try {
            // Basic eval for mock purposes, in production use a math library
            const result = eval(display.replace('×', '*').replace('÷', '/'));
            setEquation(display + ' =');
            setDisplay(String(result));
        } catch (e) {
            setDisplay('Error');
        }
    };

    return (
        <div className="bg-slate-800 p-4 rounded-3xl shadow-2xl w-64 border border-slate-700 select-none">
            <div className="bg-slate-900 p-4 rounded-xl mb-4 text-right overflow-hidden">
                <div className="text-[10px] text-slate-500 font-mono h-4">{equation}</div>
                <div className="text-2xl text-white font-mono font-bold truncate">{display}</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '=', '+'].map(btn => (
                    <button
                        key={btn}
                        onClick={() => btn === '=' ? calculate() : handleInput(btn)}
                        className={`p-3 rounded-lg font-bold transition-all ${btn === '=' ? 'bg-amber-500 text-white col-span-1' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                    >
                        {btn}
                    </button>
                ))}
                <button onClick={clear} className="col-span-4 p-2 mt-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase tracking-widest">Clear</button>
            </div>
        </div>
    );
};

export default Calculator;

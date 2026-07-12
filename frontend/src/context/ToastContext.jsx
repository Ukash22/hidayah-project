import { createContext, useCallback, useContext, useRef, useState } from 'react';
import ToastStack from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [confirmState, setConfirmState] = useState({ open: false, message: '', options: {}, resolve: null });

    const dismiss = useCallback((id) => {
        setToasts(ts => ts.filter(t => t.id !== id));
    }, []);

    const push = useCallback((message, variant = 'info', duration = 4000) => {
        const id = ++_id;
        setToasts(ts => [...ts, { id, message, variant }]);
        setTimeout(() => dismiss(id), duration);
    }, [dismiss]);

    const toast = {
        success: (msg) => push(msg, 'success'),
        error:   (msg) => push(msg, 'error',   5000),
        info:    (msg) => push(msg, 'info'),
        warning: (msg) => push(msg, 'warning'),
    };

    const confirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setConfirmState({ open: true, message, options, resolve });
        });
    }, []);

    const handleConfirm = () => {
        confirmState.resolve?.(true);
        setConfirmState(s => ({ ...s, open: false }));
    };

    const handleCancel = () => {
        confirmState.resolve?.(false);
        setConfirmState(s => ({ ...s, open: false }));
    };

    return (
        <ToastCtx.Provider value={toast}>
            <ConfirmCtx.Provider value={confirm}>
                {children}
                <ToastStack toasts={toasts} onDismiss={dismiss} />
                <ConfirmDialog
                    open={confirmState.open}
                    message={confirmState.message}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    confirmLabel={confirmState.options.confirmLabel}
                    danger={confirmState.options.danger}
                />
            </ConfirmCtx.Provider>
        </ToastCtx.Provider>
    );
}

export const useToast = () => {
    const ctx = useContext(ToastCtx);
    if (!ctx) throw new Error('useToast must be used inside ToastProvider');
    return ctx;
};

export const useConfirm = () => {
    const ctx = useContext(ConfirmCtx);
    if (!ctx) throw new Error('useConfirm must be used inside ToastProvider');
    return ctx;
};

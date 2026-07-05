import Modal from './Modal';

export default function ConfirmDialog({ open, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
    return (
        <Modal open={open} onClose={onCancel} title="Confirm" size="sm">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-3 justify-end">
                <button
                    onClick={onCancel}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-primary hover:bg-primary-light'}`}
                >
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}

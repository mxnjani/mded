interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const confirmClass = variant === 'danger'
        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/30'
        : 'bg-accent/10 text-accent hover:bg-accent/20 border-accent/20 hover:border-accent/30';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-bg border border-border rounded-xl shadow-2xl overflow-hidden max-w-sm w-full mx-4">

                {/* Header */}
                <div className="px-6 py-5 border-b border-border bg-bg/50">
                    <h2 className="text-xl font-semibold text-accent m-0">
                        {title}
                    </h2>
                </div>

                {/* Body */}
                <div className="px-6 py-5 text-accent/80 text-base leading-relaxed">
                    {message}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-bg/50 border-t border-border flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 hover:bg-border/50 text-accent/90 rounded-md transition-colors font-medium border border-transparent hover:border-border/50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 border rounded-md transition-all font-medium shadow-sm ${confirmClass}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

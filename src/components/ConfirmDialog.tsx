import { Dialog } from './Dialog';

interface ConfirmDialogProps {
    isOpen?: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen = true,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const confirmClass = variant === 'danger'
        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/30'
        : 'bg-accent/10 text-accent hover:bg-accent/20 border-accent/20 hover:border-accent/30';

    const footer = (
        <>
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
        </>
    );

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            className="sm:max-w-sm"
            footer={footer}
        >
            <div className="text-accent/80 text-base leading-relaxed">
                {message}
            </div>
        </Dialog>
    );
}

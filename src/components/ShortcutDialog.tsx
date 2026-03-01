import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ShortcutDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const shortcuts = [
    {
        category: 'File', items: [
            { keys: 'Ctrl+N', label: 'New file' },
            { keys: 'Ctrl+O', label: 'Open file' },
            { keys: 'Ctrl+S', label: 'Save' },
            { keys: 'Ctrl+Shift+S', label: 'Save As' },
        ]
    },
    {
        category: 'Edit', items: [
            { keys: 'Ctrl+Z', label: 'Undo' },
            { keys: 'Ctrl+Shift+Z', label: 'Redo' },
            { keys: 'Ctrl+B', label: 'Bold' },
            { keys: 'Ctrl+I', label: 'Italic' },
            { keys: 'Ctrl+H', label: 'Heading' },
            { keys: 'Ctrl+E', label: 'Code' },
            { keys: 'Ctrl+K', label: 'Link' },
            { keys: 'Ctrl+Q', label: 'Blockquote' },
        ]
    },
    {
        category: 'View', items: [
            { keys: 'Ctrl+1', label: 'Editor only' },
            { keys: 'Ctrl+2', label: 'Split view' },
            { keys: 'Ctrl+3', label: 'Preview only' },
            { keys: 'F11', label: 'Fullscreen' },
        ]
    },
];

export function ShortcutDialog({ isOpen, onClose }: ShortcutDialogProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm animate-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-bg border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden w-full max-w-md mx-4 animate-modal-show transform-gpu antialiased">

                {/* Header */}
                <div className="px-6 py-5 border-b border-border bg-bg/50 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-accent m-0">
                        Keyboard Shortcuts
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-accent/50 hover:text-accent transition-colors text-lg leading-none px-1"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
                    {shortcuts.map((group) => (
                        <div key={group.category}>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent/40 mb-2">
                                {group.category}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map((item) => (
                                    <div
                                        key={item.keys}
                                        className="flex items-center justify-between py-1.5"
                                    >
                                        <span className="text-sm text-accent/80">{item.label}</span>
                                        <kbd className="text-xs font-mono bg-border/40 text-accent/70 px-2 py-1 rounded border border-border/60 min-w-[80px] text-center">
                                            {item.keys}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-bg/50 border-t border-border flex justify-end rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 hover:bg-border/50 text-accent/90 rounded-md transition-colors font-medium border border-transparent hover:border-border/50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

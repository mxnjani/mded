import { Dialog } from './Dialog';

interface ShortcutDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const shortcuts = [
    {
        category: 'File', items: [
            { keys: 'Ctrl+N', label: 'New file' },
            { keys: 'Ctrl+O', label: 'Open file' },
            { keys: 'Ctrl+R', label: 'Recent files' },
            { keys: 'Ctrl+S', label: 'Save' },
            { keys: 'Ctrl+Shift+S', label: 'Save As' },
        ]
    },
    {
        category: 'Edit', items: [
            { keys: 'Ctrl+Z', label: 'Undo' },
            { keys: 'Ctrl+Y', label: 'Redo' },
            { keys: 'Ctrl+B', label: 'Bold' },
            { keys: 'Ctrl+I', label: 'Italic' },
            { keys: 'Ctrl+D', label: 'Strikethrough' },
            { keys: 'Ctrl+1..4', label: 'Apply Headings 1–4' },
            { keys: 'Ctrl+E', label: 'Code' },
            { keys: 'Ctrl+K', label: 'Insert Link/Media' },
            { keys: 'Ctrl+Q', label: 'Blockquote' },
            { keys: 'Ctrl+L', label: 'Bullet list' },
            { keys: 'Ctrl+Shift+L', label: 'Ordered list' },
            { keys: 'Ctrl+Shift+T', label: 'Task list' },
            { keys: 'Ctrl+Shift+H', label: 'Horizontal rule' },
        ]
    },
    {
        category: 'View', items: [
            { keys: 'Alt+1', label: 'Editor only' },
            { keys: 'Alt+2', label: 'Split view' },
            { keys: 'Alt+3', label: 'Preview only' },
            { keys: 'F11', label: 'Fullscreen' },
            { keys: 'Ctrl+/', label: 'Shortcuts Help' },
        ]
    },
];


export function ShortcutDialog({ isOpen, onClose }: ShortcutDialogProps) {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
            <div className="space-y-5">
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
        </Dialog>
    );
}

import { Dialog } from './Dialog';
import { Trash } from 'lucide-react';

interface RecentFilesDialogProps {
    onClose: () => void;
    recentFiles: { path: string; name: string }[];
    onOpenRecent: (path: string) => void;
    onClearRecent: () => void;
}

export function RecentFilesDialog({ onClose, recentFiles, onOpenRecent, onClearRecent }: RecentFilesDialogProps) {
    const footer = recentFiles.length > 0 ? (
        <button
            onClick={() => { onClearRecent(); onClose(); }}
            className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
        >
            <Trash size={14} /> Clear Recent
        </button>
    ) : undefined;

    return (
        <Dialog isOpen={true} onClose={onClose} title="Recent Files" className="sm:max-w-[500px]" footer={footer}>
            {recentFiles.length === 0 ? (
                <div className="text-center py-8 text-accent/50 space-y-2">
                    <p className="text-sm">No recent files yet</p>
                    <p className="text-xs text-accent/30">Files you open or save will appear here</p>
                </div>
            ) : (
                <div>
                    <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                        {recentFiles.map((file, index) => (
                            <button
                                key={`${file.path}-${index}`}
                                onClick={() => {
                                    onOpenRecent(file.path);
                                    onClose();
                                }}
                                className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-border/30 rounded-lg group transition-colors text-left"
                                title={file.path}
                            >
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-medium text-accent truncate">
                                        {file.name}
                                    </span>
                                    <span className="text-xs text-accent/40 truncate opacity-70 mt-0.5">
                                        {file.path}
                                    </span>
                                </div>
                                <span className="text-accent/0 group-hover:text-accent/30 text-xs px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </Dialog>
    );
}

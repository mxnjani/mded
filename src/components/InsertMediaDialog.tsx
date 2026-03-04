import { useState, useEffect } from 'react';
import { Image as ImageIcon, Link2, FileWarning, FolderSearch, RefreshCw } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';
import { relativePath, getDirname } from '../utils/path';
import { Dialog } from './Dialog';

interface InsertMediaDialogProps {
    onClose: () => void;
    onInsert: (markdown: string) => void;
    currentFilePath: string | null;
}

function isImageUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.startsWith('data:image/') ||
        /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)(\?.*)?$/.test(lower);
}

export function InsertMediaDialog({ onClose, onInsert, currentFilePath }: InsertMediaDialogProps) {
    const [url, setUrl] = useState('');
    const [altText, setAltText] = useState('');
    const [isImage, setIsImage] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    // Auto-detect image when URL changes
    useEffect(() => {
        setIsImage(isImageUrl(url));
    }, [url]);

    const handleCheckLink = async () => {
        if (!url || !url.startsWith('http')) return;
        setIsChecking(true);
        try {
            const title = await invoke<string>('fetch_link_title', { url });
            if (title) {
                setAltText(title);
            }
        } catch (err) {
            console.error("Failed to fetch link title:", err);
        } finally {
            setIsChecking(false);
        }
    };

    const handleBrowse = async () => {
        if (!isTauri()) {
            alert("Local file browsing is only supported in the desktop app.");
            return;
        }

        try {
            const selected = await openDialog({
                multiple: false,
                filters: [{ name: 'All Files', extensions: ['*'] }]
            });

            if (selected && typeof selected === 'string') {
                let finalPath = selected;
                if (currentFilePath) {
                    const currentDir = getDirname(currentFilePath);
                    if (currentDir) {
                        finalPath = relativePath(currentDir, selected);
                        if (!finalPath) finalPath = selected;
                    }
                }
                setUrl(finalPath);

                if (!altText) {
                    const filename = selected.split(/[/\\]/).pop() || '';
                    setAltText(filename.split('.')[0] || filename);
                }

                // Set isImage here explicitly so it updates immediately alongside the input
                setIsImage(isImageUrl(finalPath));
            }
        } catch (err) {
            console.error("Failed to browse files:", err);
        }
    };

    const handleInsert = () => {
        if (!url) return;

        // Sanitize the URL to avoid markdown parser issues with backslashes and spaces
        let cleanUrl = url.replace(/\\/g, '/');

        // Normalize relative local paths to start with ./
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/') && !cleanUrl.startsWith('.')) {
            // Let's also check if it's an absolute Windows path (e.g. C:/) to not prepend ./
            if (!/^[A-Za-z]:\//.test(cleanUrl)) {
                cleanUrl = `./${cleanUrl}`;
            }
        }

        if (cleanUrl.includes(' ')) {
            cleanUrl = encodeURI(cleanUrl);
        }

        let markdown = '';
        if (isImage) {
            markdown = `![${altText || 'image'}](${cleanUrl})`;
        } else {
            markdown = `[${altText || 'link'}](${cleanUrl})`;
        }

        onInsert(markdown);

        setUrl('');
        setAltText('');
        setIsImage(false);
        onClose();
    };

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={
                <>
                    {isImage ? <ImageIcon size={18} /> : <Link2 size={18} />}
                    Insert Link and Media
                </>
            }
        >
            <div className="animate-in fade-in zoom-in duration-200">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-accent/80 mb-1">
                            Path or URL
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                autoFocus
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://... or path/to/file"
                                className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-sm text-accent placeholder:text-accent/40 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {url.startsWith('http') && (
                                <button
                                    onClick={handleCheckLink}
                                    disabled={isChecking}
                                    title="Check Link Title"
                                    className="px-3 py-2 bg-border/50 hover:bg-border disabled:opacity-50 rounded-md text-accent transition-colors flex items-center justify-center border border-transparent shadow-sm cursor-pointer"
                                >
                                    <RefreshCw size={16} className={isChecking ? 'animate-spin text-blue-500' : ''} />
                                </button>
                            )}
                            {isTauri() && (
                                <button
                                    onClick={handleBrowse}
                                    title="Browse local files"
                                    className="px-3 py-2 bg-border/50 hover:bg-border rounded-md text-accent transition-colors flex items-center justify-center border border-transparent shadow-sm cursor-pointer"
                                >
                                    <FolderSearch size={16} />
                                </button>
                            )}
                        </div>
                        {isTauri() && !currentFilePath && (
                            <p className="text-xs text-yellow-500 mt-1.5 flex items-center gap-1">
                                <FileWarning size={12} />
                                To insert relative local paths, please save the current file first.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-accent/80 mb-1">
                            Display Text (Optional)
                        </label>
                        <input
                            type="text"
                            value={altText}
                            onChange={(e) => setAltText(e.target.value)}
                            placeholder="Text to show or image description"
                            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-accent placeholder:text-accent/40 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-accent/80 cursor-pointer pt-1">
                        <input
                            type="checkbox"
                            checked={isImage}
                            onChange={(e) => setIsImage(e.target.checked)}
                            className="rounded border-border bg-bg text-blue-600 focus:ring-blue-500"
                        />
                        Insert as Image
                    </label>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md text-sm font-medium text-accent hover:bg-border/50 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleInsert}
                        disabled={!url}
                        className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                    >
                        Insert
                    </button>
                </div>
            </div>
        </Dialog>
    );
}

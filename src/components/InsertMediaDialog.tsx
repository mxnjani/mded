import { useState, useEffect } from 'react';
import { Image as ImageIcon, Link2, FileWarning, FolderSearch, RefreshCw, Download, Check, Trash } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { copyFile, remove, exists } from '@tauri-apps/plugin-fs';
import { join, basename } from '@tauri-apps/api/path';
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

    const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'confirming' | 'error'>('idle');
    const [downloadedPath, setDownloadedPath] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        setIsImage(isImageUrl(url));
    }, [url]);

    useEffect(() => {
        if (!url || !url.startsWith('http') || isImage || altText) return;

        const timer = setTimeout(() => {
            handleCheckLink();
        }, 800);

        return () => clearTimeout(timer);
    }, [url, isImage, altText]);

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
                if (isTauri()) {
                    if (currentFilePath) {
                        try {
                            const currentDir = getDirname(currentFilePath);
                            if (currentDir) {
                                const fileName = await basename(selected);
                                const newFilePath = await join(currentDir, fileName);

                                if (newFilePath !== selected) {
                                    await copyFile(selected, newFilePath);
                                }
                                finalPath = relativePath(currentDir, newFilePath) || `./${fileName}`;
                            }
                        } catch (e) {
                            console.error("Failed to copy local media:", e);
                            setErrorMessage(`Failed to copy local media: ${e}`);
                            setDownloadState('error');
                        }
                    } else {
                        setErrorMessage("Please save your Markdown file first! The media cannot be copied to the local folder, so an absolute path will be used.");
                        setDownloadState('error');
                    }
                }

                setUrl(finalPath);

                if (!altText) {
                    const filename = selected.split(/[/\\]/).pop() || '';
                    setAltText(filename.split('.')[0] || filename);
                }

                setIsImage(isImageUrl(finalPath));
            }
        } catch (err) {
            console.error("Failed to browse files:", err);
        }
    };

    const handleDownload = async () => {
        if (!isTauri() || !url.startsWith('http')) return;

        if (!currentFilePath) {
            setErrorMessage("Please save your Markdown file first! We need to know which folder to download the media into.");
            setDownloadState('error');
            return;
        }

        setDownloadState('downloading');
        setErrorMessage('');
        try {
            const currentDir = getDirname(currentFilePath);
            if (!currentDir) throw new Error("Could not determine current directory");

            let filename = url.split('/').pop()?.split('?')[0] || `download_${Date.now()}`;
            if (!filename.includes('.')) {
                filename += isImage ? '.png' : '.tmp';
            }

            const targetPath = await join(currentDir, filename);

            if (await exists(targetPath)) {
                throw new Error(`File "${filename}" already exists in the current folder.`);
            }

            await invoke('download_file', { url, targetPath });

            setDownloadedPath(targetPath);
            setDownloadState('confirming');
        } catch (err) {
            console.error("Failed to download file:", err);
            setErrorMessage(String(err));
            setDownloadState('error');
        }
    };

    const handleAcceptDownload = () => {
        if (currentFilePath && downloadedPath) {
            const currentDir = getDirname(currentFilePath);
            if (currentDir) {
                const relPath = relativePath(currentDir, downloadedPath);
                if (relPath) {
                    setUrl(relPath);
                } else {
                    setUrl(downloadedPath.replace(/\\/g, '/'));
                }
                setIsImage(isImageUrl(downloadedPath));

                const filename = downloadedPath.split(/[/\\]/).pop() || '';
                setAltText(filename.split('.')[0] || filename);
            }
        }
        setDownloadState('idle');
    };

    const handleThrowDownload = async () => {
        try {
            if (downloadedPath) {
                await remove(downloadedPath);
            }
        } catch (err) {
            console.error("Failed to delete thrown download:", err);
        } finally {
            setDownloadedPath('');
            setDownloadState('idle');
        }
    };

    const handleInsert = async () => {
        if (!url) return;

        let cleanUrl = url.replace(/\\/g, '/');

        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/') && !cleanUrl.startsWith('.')) {
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
                                disabled={downloadState !== 'idle'}
                                className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-sm text-accent placeholder:text-accent/40 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                            />
                            {url.startsWith('http') && (
                                <button
                                    onClick={handleCheckLink}
                                    disabled={isChecking}
                                    title="Check Link Title"
                                    className="px-3 py-2 bg-border/50 hover:bg-border disabled:opacity-50 rounded-md text-accent transition-colors flex items-center justify-center border border-transparent shadow-sm cursor-pointer"
                                >
                                    <RefreshCw size={16} className={isChecking ? 'animate-spin text-primary' : ''} />
                                </button>
                            )}
                            {isTauri() && url.startsWith('http') && (
                                <button
                                    onClick={handleDownload}
                                    disabled={downloadState !== 'idle'}
                                    title="Download Media to Document Folder"
                                    className="px-3 py-2 bg-border/50 hover:bg-border disabled:opacity-50 rounded-md text-accent transition-colors flex items-center justify-center border border-transparent shadow-sm cursor-pointer"
                                >
                                    <Download size={16} className={downloadState === 'downloading' ? 'animate-bounce text-primary' : ''} />
                                </button>
                            )}
                            {isTauri() && (
                                <button
                                    onClick={handleBrowse}
                                    title="Browse local files"
                                    disabled={downloadState !== 'idle'}
                                    className="px-3 py-2 bg-border/50 hover:bg-border disabled:opacity-50 rounded-md text-accent transition-colors flex items-center justify-center border border-transparent shadow-sm cursor-pointer"
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
                        {downloadState === 'confirming' && (
                            <div className="mt-3 p-3 bg-accent/5 border border-border rounded-md text-sm text-accent flex sm:items-center justify-between gap-4 flex-col sm:flex-row">
                                <div className="min-w-0">
                                    <p className="font-medium">File downloaded locally</p>
                                    <p className="text-xs text-accent/60 truncate" title={downloadedPath}>{downloadedPath}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={handleAcceptDownload} title="Accept" className="p-2 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm cursor-pointer flex items-center justify-center">
                                        <Check size={16} />
                                    </button>
                                    <button onClick={handleThrowDownload} title="Throw" className="p-2 rounded-md text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer flex items-center justify-center">
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                        {downloadState === 'error' && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-500 flex sm:items-center justify-between gap-4 flex-col sm:flex-row">
                                <div className="min-w-0">
                                    <p className="font-medium flex items-center gap-1.5"><FileWarning size={14} /> Error</p>
                                    <p className="text-xs text-red-500/80 mt-1">{errorMessage}</p>
                                </div>
                                <div className="flex shrink-0">
                                    <button onClick={() => setDownloadState('idle')} className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/20 hover:bg-red-500/30 transition-colors cursor-pointer">
                                        Dismiss
                                    </button>
                                </div>
                            </div>
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
                            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-accent placeholder:text-accent/40 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-accent/80 cursor-pointer pt-1">
                        <input
                            type="checkbox"
                            checked={isImage}
                            onChange={(e) => setIsImage(e.target.checked)}
                            className="rounded border-border bg-bg text-primary focus:ring-primary"
                        />
                        Insert as Image
                    </label>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={downloadState !== 'idle'}
                        className="px-4 py-2 rounded-md text-sm font-medium text-accent hover:bg-border/50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleInsert}
                        disabled={!url || downloadState !== 'idle'}
                        className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                    >
                        Insert
                    </button>
                </div>
            </div>
        </Dialog>
    );
}

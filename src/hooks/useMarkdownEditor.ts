import React, { useState, useEffect, useCallback, RefObject } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { useHistory } from './useHistory';
import { isTauri } from '../utils';

export type ViewMode = 'editor' | 'split' | 'preview';

interface PendingOpenFile {
    type: 'tauri' | 'web';
    path?: string;
    file?: File;
    content?: string;
}

const DEFAULT_MARKDOWN = `# New Document

Start typing your markdown here...

## Example Syntax
- **Bold text**
- *Italic text*
- [Link](https://example.com)

\`\`\`javascript
console.log("Hello mdED!");
\`\`\`
`;

export function useMarkdownEditor(editorRef: RefObject<HTMLTextAreaElement | null>) {
    const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
    const [fileName, setFileName] = useState('untitled.md');
    const [filePath, setFilePath] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('editor');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [showNewFileConfirm, setShowNewFileConfirm] = useState(false);
    const [showOpenFileConfirm, setShowOpenFileConfirm] = useState(false);
    const [pendingOpenFile, setPendingOpenFile] = useState<PendingOpenFile | null>(null);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mded_darkmode') === 'true' ||
                window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    const { push: pushToHistory, undo, redo, reset: resetHistory, nextCursorRef } = useHistory({
        onRestore: (md) => {
            setMarkdown(md);
            setIsDirty(true);
        },
    });

    useEffect(() => {
        const init = async () => {
            if (isTauri()) {
                try {
                    const launchFilePath = await invoke<string | null>('get_launch_file');
                    if (launchFilePath) {
                        const content = await readTextFile(launchFilePath);
                        setMarkdown(content);
                        resetHistory(content);
                        const name = launchFilePath.split(/[/\\]/).pop();
                        if (name) setFileName(name);
                        setFilePath(launchFilePath);
                        setIsDirty(false);
                        return;
                    }
                } catch (err) {
                    console.error("Failed to load launch info:", err);
                }
            }

            const saved = localStorage.getItem('mded_content');
            const savedName = localStorage.getItem('mded_filename');
            const savedMode = localStorage.getItem('mded_viewmode') as ViewMode;
            const savedDirty = localStorage.getItem('mded_isdirty') === 'true';
            if (saved) {
                setMarkdown(saved);
                resetHistory(saved);
            }
            if (savedName) setFileName(savedName);
            if (savedMode) setViewMode(savedMode);
            setIsDirty(savedDirty);
        };

        init();
    }, []);

    useEffect(() => {
        localStorage.setItem('mded_content', markdown);
        localStorage.setItem('mded_filename', fileName);
        localStorage.setItem('mded_viewmode', viewMode);
        localStorage.setItem('mded_isdirty', String(isDirty));
        localStorage.setItem('mded_darkmode', String(isDarkMode));

        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [markdown, fileName, viewMode, isDarkMode, isDirty]);

    const insertText = useCallback((
        before: string,
        after: string = '',
        pushToHistory?: (value: string, cursor: number, immediate?: boolean) => void,
        nextCursorRef?: React.MutableRefObject<number | null>
    ) => {
        const textarea = editorRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
        const newCursor = start + before.length + selectedText.length;
        setMarkdown(newText);
        setIsDirty(true);
        if (pushToHistory) pushToHistory(newText, newCursor, true);
        if (nextCursorRef) {
            nextCursorRef.current = start + before.length;
        } else {
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + before.length, end + before.length);
            }, 0);
        }
    }, [editorRef]);

    const handleSaveAs = useCallback(async () => {
        if (isTauri()) {
            try {
                const savePath = await save({
                    defaultPath: fileName,
                    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
                });
                if (savePath) {
                    try {
                        const pathString = Array.isArray(savePath) ? savePath[0] : savePath;
                        await writeTextFile(pathString, markdown);
                        const newFileName = pathString.split(/[/\\]/).pop();
                        if (newFileName) setFileName(newFileName);
                        setFilePath(pathString);
                        setIsDirty(false);
                    } catch (writeErr) {
                        console.error("Failed to write to file natively:", writeErr, typeof writeErr === 'object' ? JSON.stringify(writeErr) : writeErr);
                        alert(`Save failed: ${writeErr}`);
                    }
                }
            } catch (err) {
                console.error("Failed to show save dialog", err);
            }
        } else {
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }
    }, [markdown, fileName]);

    const handleExport = useCallback(async () => {
        if (isTauri() && filePath) {
            try {
                await writeTextFile(filePath, markdown);
                setIsDirty(false);
            } catch (writeErr) {
                console.error("Failed to quick save:", writeErr);
                alert(`Save failed: ${writeErr}`);
                handleSaveAs();
            }
        } else {
            handleSaveAs();
        }
    }, [markdown, filePath, handleSaveAs]);

    const handleNewFile = useCallback(() => {
        if (isDirty) {
            setShowNewFileConfirm(true);
        } else {
            setMarkdown(DEFAULT_MARKDOWN);
            resetHistory(DEFAULT_MARKDOWN);
            setFileName('untitled.md');
            setFilePath(null);
            setIsDirty(false);
        }
    }, [isDirty, resetHistory]);

    const confirmNewFile = useCallback(() => {
        setMarkdown(DEFAULT_MARKDOWN);
        resetHistory(DEFAULT_MARKDOWN);
        setFileName('untitled.md');
        setFilePath(null);
        setIsDirty(false);
        setShowNewFileConfirm(false);
    }, [resetHistory]);

    const loadFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setMarkdown(content);
            resetHistory(content);
            setFileName(file.name);
            setIsDirty(false);
        };
        reader.readAsText(file);
    }, [resetHistory]);

    const confirmOpenFile = useCallback(() => {
        if (!pendingOpenFile) return;

        if (pendingOpenFile.type === 'tauri' && pendingOpenFile.content && pendingOpenFile.path) {
            setMarkdown(pendingOpenFile.content);
            resetHistory(pendingOpenFile.content);
            const newFileName = pendingOpenFile.path.split(/[/\\]/).pop();
            if (newFileName) setFileName(newFileName);
            setFilePath(pendingOpenFile.path);
        } else if (pendingOpenFile.type === 'web' && pendingOpenFile.file) {
            loadFile(pendingOpenFile.file);
        }

        setIsDirty(false);
        setShowOpenFileConfirm(false);
        setPendingOpenFile(null);
    }, [pendingOpenFile, loadFile, resetHistory]);

    const handleFileOpen = useCallback(async (e?: React.ChangeEvent<HTMLInputElement>) => {
        if (isTauri()) {
            try {
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
                });

                if (selected) {
                    const filePath = Array.isArray(selected) ? selected[0] : selected;
                    const content = await readTextFile(filePath);

                    if (isDirty) {
                        setPendingOpenFile({ type: 'tauri', path: filePath, content });
                        setShowOpenFileConfirm(true);
                    } else {
                        setMarkdown(content);
                        resetHistory(content);
                        const newFileName = filePath.split(/[/\\]/).pop();
                        if (newFileName) setFileName(newFileName);
                        setFilePath(filePath);
                        setIsDirty(false);
                    }
                }
            } catch (err) {
                console.error("Failed to open file", err);
            }
        } else {
            const file = e?.target?.files?.[0];
            if (!file) return;

            if (isDirty) {
                setPendingOpenFile({ type: 'web', file });
                setShowOpenFileConfirm(true);
            } else {
                loadFile(file);
            }

            if (e?.target) {
                e.target.value = '';
            }
        }
    }, [isDirty, loadFile, resetHistory]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt'))) {
            if (isDirty) {
                setPendingOpenFile({ type: 'web', file });
                setShowOpenFileConfirm(true);
            } else {
                loadFile(file);
            }
        }
    }, [isDirty, loadFile]);

    useEffect(() => {
        if (!isTauri()) return;

        const unlistenPromise = listen<string>('open-file', async (event) => {
            const openFilePath = event.payload;
            if (!openFilePath) return;

            try {
                const content = await readTextFile(openFilePath);
                if (isDirty) {
                    setPendingOpenFile({ type: 'tauri', path: openFilePath, content });
                    setShowOpenFileConfirm(true);
                } else {
                    setMarkdown(content);
                    resetHistory(content);
                    const newFileName = openFilePath.split(/[/\\]/).pop();
                    if (newFileName) setFileName(newFileName);
                    setFilePath(openFilePath);
                    setIsDirty(false);
                }
            } catch (err) {
                console.error("Failed to read opened file:", err);
            }
        });

        // Tauri native drop fix
        const unlistenDropPromise = getCurrentWebview().onDragDropEvent(async (event) => {
            if (event.payload.type === 'drop') {
                const droppedPath = event.payload.paths[0];
                if (!droppedPath) return;

                const ext = droppedPath.toLowerCase().split('.').pop();
                if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
                    try {
                        const content = await readTextFile(droppedPath);
                        if (isDirty) {
                            setPendingOpenFile({ type: 'tauri', path: droppedPath, content });
                            setShowOpenFileConfirm(true);
                        } else {
                            setMarkdown(content);
                            resetHistory(content);
                            const newFileName = droppedPath.split(/[/\\]/).pop();
                            if (newFileName) setFileName(newFileName);
                            setFilePath(droppedPath);
                            setIsDirty(false);
                        }
                    } catch (err) {
                        console.error("Failed to read dropped file:", err);
                    }
                }
            }
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
            unlistenDropPromise.then(unlisten => unlisten());
        };
    }, [isDirty, resetHistory]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        setViewMode('editor');
                        break;
                    case '2':
                        e.preventDefault();
                        setViewMode('split');
                        break;
                    case '3':
                        e.preventDefault();
                        setViewMode('preview');
                        break;
                }
            }

            if (e.metaKey || e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        if (e.shiftKey) {
                            handleSaveAs();
                        } else {
                            handleExport();
                        }
                        break;
                    case 'o':
                        e.preventDefault();
                        handleFileOpen();
                        break;
                    case 'n':
                        e.preventDefault();
                        handleNewFile();
                        break;
                }
            }
            if (e.key === 'F11') {
                e.preventDefault();
                setIsFullscreen(!isFullscreen);
                if (isTauri()) {
                    getCurrentWindow().setFullscreen(!isFullscreen).catch(err => console.error(err));
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleExport, handleSaveAs, handleNewFile, handleFileOpen, isFullscreen]);

    return {
        markdown,
        setMarkdown: (md: string) => { setMarkdown(md); setIsDirty(true); },
        fileName,
        isDirty,
        viewMode,
        setViewMode,
        isDarkMode,
        setIsDarkMode,
        isFullscreen,
        setIsFullscreen,
        showCloseConfirm,
        setShowCloseConfirm,
        showNewFileConfirm,
        setShowNewFileConfirm,
        showOpenFileConfirm,
        setShowOpenFileConfirm,
        confirmNewFile,
        confirmOpenFile,
        handleNewFile,
        handleFileOpen,
        handleDrop,
        handleExport,
        handleSaveAs,
        insertText,
        pushToHistory,
        undo,
        redo,
        nextCursorRef,
    };
}

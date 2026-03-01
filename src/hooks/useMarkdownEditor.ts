import React, { useState, useEffect, useCallback, useRef, RefObject } from 'react';
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

    const [recentFiles, setRecentFiles] = useState<{ path: string, name: string }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mded_recent_files');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse recent files", e);
                }
            }
        }
        return [];
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mded_darkmode') === 'true' ||
                window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // Refs to avoid stale closures in event listeners
    const isDirtyRef = useRef(isDirty);
    useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

    const isFullscreenRef = useRef(isFullscreen);
    useEffect(() => { isFullscreenRef.current = isFullscreen; }, [isFullscreen]);

    const addRecentFile = useCallback((path: string, name: string) => {
        setRecentFiles(prev => {
            const filtered = prev.filter(f => f.path !== path);
            const newFiles = [{ path, name }, ...filtered].slice(0, 10);
            localStorage.setItem('mded_recent_files', JSON.stringify(newFiles));
            return newFiles;
        });
    }, []);

    const { push: pushToHistory, undo, redo, reset: resetHistory, nextCursorRef, lastValue } = useHistory({
        onRestore: (md) => {
            setMarkdown(md);
            setIsDirty(true);
        },
    });

    /**
     * Single helper to load file content into the editor, replacing
     * the previous 5x duplicated block across the hook.
     */
    const applyFileContent = useCallback((content: string, path: string) => {
        setMarkdown(content);
        resetHistory(content);
        const name = path.split(/[/\\]/).pop();
        if (name) {
            setFileName(name);
            addRecentFile(path, name);
        }
        setFilePath(path);
        setIsDirty(false);
    }, [resetHistory, addRecentFile]);

    const handleImagePaste = useCallback(async (file: File) => {
        if (!isTauri()) {
            alert("Pasting images directly to files is only supported in the desktop app.");
            return;
        }

        if (!filePath) {
            alert("Please save this markdown file first before pasting images.");
            return;
        }

        try {
            const { writeFile } = await import('@tauri-apps/plugin-fs');
            const { dirname, join } = await import('@tauri-apps/api/path');

            const currentDir = await dirname(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const extension = file.type.split('/')[1] || 'png';
            const imgName = `image_${timestamp}.${extension}`;
            const destPath = await join(currentDir, imgName);

            const buffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            await writeFile(destPath, uint8Array);

            const textarea = editorRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;

            const imageMarkdown = `![image](./${imgName})`;
            const newText = text.substring(0, start) + imageMarkdown + text.substring(end);
            const newCursor = start + imageMarkdown.length;

            setMarkdown(newText);
            setIsDirty(true);
            pushToHistory(newText, newCursor, true);
            nextCursorRef.current = newCursor;
        } catch (err) {
            console.error("Failed to paste image:", err);
            alert(`Failed to save pasted image: ${err}`);
        }
    }, [filePath, editorRef, pushToHistory, nextCursorRef]);

    // Startup: load launch file or restore from localStorage
    useEffect(() => {
        const init = async () => {
            if (isTauri()) {
                try {
                    const launchFilePath = await invoke<string | null>('get_launch_file');
                    if (launchFilePath) {
                        const content = await readTextFile(launchFilePath);
                        applyFileContent(content, launchFilePath);
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

    // Persist state to localStorage and sync dark mode class
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

    /**
     * Insert text at the current cursor position in the editor.
     * Uses the hook's own pushToHistory/nextCursorRef directly.
     */
    const insertText = useCallback((before: string, after: string = '') => {
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
        pushToHistory(newText, newCursor, true);
        nextCursorRef.current = start + before.length;
    }, [editorRef, pushToHistory, nextCursorRef]);

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
                        if (newFileName) {
                            setFileName(newFileName);
                            addRecentFile(pathString, newFileName);
                        }
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

    const handleSave = useCallback(async () => {
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
            applyFileContent(pendingOpenFile.content, pendingOpenFile.path);
        } else if (pendingOpenFile.type === 'web' && pendingOpenFile.file) {
            loadFile(pendingOpenFile.file);
        }

        setIsDirty(false);
        setShowOpenFileConfirm(false);
        setPendingOpenFile(null);
    }, [pendingOpenFile, loadFile, applyFileContent]);

    const handleFileOpen = useCallback(async (e?: React.ChangeEvent<HTMLInputElement>) => {
        if (isTauri()) {
            try {
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
                });

                if (selected) {
                    const openPath = Array.isArray(selected) ? selected[0] : selected;
                    const content = await readTextFile(openPath);

                    if (isDirtyRef.current) {
                        setPendingOpenFile({ type: 'tauri', path: openPath, content });
                        setShowOpenFileConfirm(true);
                    } else {
                        applyFileContent(content, openPath);
                    }
                }
            } catch (err) {
                console.error("Failed to open file", err);
            }
        } else {
            const file = e?.target?.files?.[0];
            if (!file) return;

            if (isDirtyRef.current) {
                setPendingOpenFile({ type: 'web', file });
                setShowOpenFileConfirm(true);
            } else {
                loadFile(file);
            }

            if (e?.target) {
                e.target.value = '';
            }
        }
    }, [loadFile, applyFileContent]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt'))) {
            if (isDirtyRef.current) {
                setPendingOpenFile({ type: 'web', file });
                setShowOpenFileConfirm(true);
            } else {
                loadFile(file);
            }
        }
    }, [loadFile]);

    const openRecentFile = useCallback(async (path: string) => {
        if (!isTauri()) return;
        try {
            const content = await readTextFile(path);
            if (isDirtyRef.current) {
                setPendingOpenFile({ type: 'tauri', path, content });
                setShowOpenFileConfirm(true);
            } else {
                applyFileContent(content, path);
            }
        } catch (err) {
            console.error("Failed to open recent file:", err);
        }
    }, [applyFileContent]);

    // Tauri: listen for open-file events and native drag-drop
    useEffect(() => {
        if (!isTauri()) return;

        const unlistenPromise = listen<string>('open-file', async (event) => {
            const openFilePath = event.payload;
            if (!openFilePath) return;

            try {
                const content = await readTextFile(openFilePath);
                if (isDirtyRef.current) {
                    setPendingOpenFile({ type: 'tauri', path: openFilePath, content });
                    setShowOpenFileConfirm(true);
                } else {
                    applyFileContent(content, openFilePath);
                }
            } catch (err) {
                console.error("Failed to read opened file:", err);
            }
        });

        const unlistenDropPromise = getCurrentWebview().onDragDropEvent(async (event) => {
            if (event.payload.type === 'drop') {
                const droppedPath = event.payload.paths[0];
                if (!droppedPath) return;

                const ext = droppedPath.toLowerCase().split('.').pop();
                if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
                    try {
                        const content = await readTextFile(droppedPath);
                        if (isDirtyRef.current) {
                            setPendingOpenFile({ type: 'tauri', path: droppedPath, content });
                            setShowOpenFileConfirm(true);
                        } else {
                            applyFileContent(content, droppedPath);
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
    }, [applyFileContent]);

    // Global keyboard shortcuts: file ops, view mode, fullscreen
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
                            handleSave();
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
                const next = !isFullscreenRef.current;
                setIsFullscreen(next);
                if (isTauri()) {
                    getCurrentWindow().setFullscreen(next).catch(err => console.error(err));
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave, handleSaveAs, handleNewFile, handleFileOpen]);

    return {
        markdown,
        setMarkdown: (md: string) => { setMarkdown(md); setIsDirty(true); },
        fileName,
        filePath,
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
        handleSave,
        handleSaveAs,
        insertText,
        pushToHistory,
        undo,
        redo,
        nextCursorRef,
        lastValue,
        handleImagePaste,
        recentFiles,
        openRecentFile,
    };
}

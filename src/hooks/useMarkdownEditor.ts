import React, { useState, useEffect, useCallback, RefObject } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useHistory } from './useHistory';

export type ViewMode = 'editor' | 'split' | 'preview';

interface LaunchInfo {
    source: string;
    file_name: string | null;
    file_uuid: string | null;
    file_path: string | null;
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
    const [isMdvaultMode, setIsMdvaultMode] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('editor');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [showNewFileConfirm, setShowNewFileConfirm] = useState(false);

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
            if (window.__TAURI_INTERNALS__) {
                try {
                    const launchInfo = await invoke<LaunchInfo>('get_launch_info');

                    if (launchInfo.source === 'mdvault' && launchInfo.file_path) {
                        const content = await readTextFile(launchInfo.file_path);
                        setMarkdown(content);
                        resetHistory(content);
                        if (launchInfo.file_name) setFileName(launchInfo.file_name);
                        setFilePath(launchInfo.file_path);
                        setIsMdvaultMode(true);
                        setIsDirty(false);
                        return;
                    } else if (launchInfo.file_path) {
                        const content = await readTextFile(launchInfo.file_path);
                        setMarkdown(content);
                        resetHistory(content);
                        const name = launchInfo.file_path.split(/[/\\]/).pop();
                        if (name) setFileName(name);
                        setFilePath(launchInfo.file_path);
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
        if (isMdvaultMode) return;
        if (window.__TAURI_INTERNALS__) {
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
    }, [markdown, fileName, isMdvaultMode]);

    const handleExport = useCallback(async () => {
        if (window.__TAURI_INTERNALS__ && filePath) {
            try {
                await writeTextFile(filePath, markdown);
                setIsDirty(false);
            } catch (writeErr) {
                console.error("Failed to quick save:", writeErr);
                alert(`Save failed: ${writeErr}`);
                if (!isMdvaultMode) handleSaveAs();
            }
        } else {
            if (!isMdvaultMode) handleSaveAs();
        }
    }, [markdown, filePath, handleSaveAs, isMdvaultMode]);

    const handleNewFile = useCallback(() => {
        if (isMdvaultMode) return;
        if (isDirty) {
            setShowNewFileConfirm(true);
        } else {
            setMarkdown(DEFAULT_MARKDOWN);
            resetHistory(DEFAULT_MARKDOWN);
            setFileName('untitled.md');
            setFilePath(null);
            setIsDirty(false);
        }
    }, [isDirty, isMdvaultMode, resetHistory]);

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

    const handleFileOpen = useCallback(async (e?: React.ChangeEvent<HTMLInputElement>) => {
        if (isMdvaultMode) return;
        if (window.__TAURI_INTERNALS__) {
            try {
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
                });

                if (selected === null) {
                } else {
                    const filePath = Array.isArray(selected) ? selected[0] : selected;
                    const content = await readTextFile(filePath);
                    setMarkdown(content);
                    resetHistory(content);
                    const newFileName = filePath.split(/[/\\]/).pop();
                    if (newFileName) setFileName(newFileName);
                    setFilePath(filePath);
                    setIsDirty(false);
                }
            } catch (err) {
                console.error("Failed to open file", err);
            }
        } else {
            const file = e?.target?.files?.[0];
            if (!file) return;
            loadFile(file);
            if (e?.target) {
                e.target.value = '';
            }
        }
    }, [loadFile, isMdvaultMode]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (isMdvaultMode) return;
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt'))) {
            loadFile(file);
        }
    }, [loadFile, isMdvaultMode]);

    useEffect(() => {
        if (!window.__TAURI_INTERNALS__) return;

        const unlistenPromise = listen<LaunchInfo | string>('open-file', async (event) => {
            const payload = event.payload;
            let filePath: string | null = null;
            let fileNameStr: string | null = null;
            let source: string | null = null;

            if (typeof payload === 'string') {
                filePath = payload;
            } else if (payload && typeof payload === 'object') {
                filePath = payload.file_path;
                fileNameStr = payload.file_name;
                source = payload.source;
            }

            if (!filePath) return;

            try {
                const content = await readTextFile(filePath);
                setMarkdown(content);
                resetHistory(content);
                const newFileName = fileNameStr || filePath.split(/[/\\]/).pop();
                if (newFileName) setFileName(newFileName);
                setFilePath(filePath);

                if (source === 'mdvault') {
                    setIsMdvaultMode(true);
                } else {
                    setIsMdvaultMode(false);
                }

                setIsDirty(false);
            } catch (err) {
                console.error("Failed to read opened file:", err);
            }
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        if (e.shiftKey) {
                            if (!isMdvaultMode) handleSaveAs();
                        } else {
                            handleExport();
                        }
                        break;
                    case 'o':
                        e.preventDefault();
                        if (!isMdvaultMode) handleFileOpen();
                        break;
                    case 'n':
                        e.preventDefault();
                        if (!isMdvaultMode) handleNewFile();
                        break;
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
            if (e.key === 'F11') {
                e.preventDefault();
                setIsFullscreen(!isFullscreen);
                if (window.__TAURI_INTERNALS__) {
                    getCurrentWindow().setFullscreen(!isFullscreen).catch(err => console.error(err));
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleExport, handleSaveAs, handleNewFile, handleFileOpen, isFullscreen, isMdvaultMode]);

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
        confirmNewFile,
        handleNewFile,
        handleFileOpen,
        handleDrop,
        handleExport,
        handleSaveAs,
        insertText,
        isMdvaultMode,
        pushToHistory,
        undo,
        redo,
        nextCursorRef,
    };
}

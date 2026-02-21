import { useState, useEffect, useCallback, RefObject } from 'react';

export type ViewMode = 'editor' | 'preview';

const DEFAULT_MARKDOWN = `# mdED

A clean, simple, and predictable Markdown editor.

## Features
- **Open**: Drag & drop or use the folder icon.
- **Preview**: Toggle between Editor, Split, and Preview modes.
- **Export**: Download as \`.md\`.
- **Dark Mode**: Switch between light and dark themes.
`;

export function useMarkdownEditor(editorRef: RefObject<HTMLTextAreaElement | null>, fileInputRef: RefObject<HTMLInputElement | null>) {
    const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
    const [fileName, setFileName] = useState('untitled.md');
    const [viewMode, setViewMode] = useState<ViewMode>('editor');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mded_darkmode') === 'true' ||
                window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('mded_content');
        const savedName = localStorage.getItem('mded_filename');
        const savedMode = localStorage.getItem('mded_viewmode') as ViewMode;
        if (saved) setMarkdown(saved);
        if (savedName) setFileName(savedName);
        if (savedMode) setViewMode(savedMode);
    }, []);

    useEffect(() => {
        localStorage.setItem('mded_content', markdown);
        localStorage.setItem('mded_filename', fileName);
        localStorage.setItem('mded_viewmode', viewMode);
        localStorage.setItem('mded_darkmode', String(isDarkMode));

        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [markdown, fileName, viewMode, isDarkMode]);

    const insertText = useCallback((before: string, after: string = '') => {
        const textarea = editorRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
        setMarkdown(newText);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    }, [editorRef]);

    const handleExport = useCallback(() => {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }, [markdown, fileName]);

    const handleNewFile = useCallback(() => {
        if (confirm('Start a new file? Unsaved changes will be lost.')) {
            setMarkdown('# New Document\n\n');
            setFileName('untitled.md');
        }
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        handleExport();
                        break;
                    case 'o':
                        e.preventDefault();
                        fileInputRef.current?.click();
                        break;
                    case 'n':
                        e.preventDefault();
                        handleNewFile();
                        break;
                    case '1':
                        e.preventDefault();
                        setViewMode('editor');
                        break;
                    case '2':
                        e.preventDefault();
                        setViewMode('preview');
                        break;
                    case 'b':
                        e.preventDefault();
                        insertText('**', '**');
                        break;
                    case 'i':
                        e.preventDefault();
                        insertText('_', '_');
                        break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [markdown, fileName, handleExport, handleNewFile, insertText, fileInputRef]);

    const loadFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setMarkdown(content);
            setFileName(file.name);
        };
        reader.readAsText(file);
    }, []);

    const handleFileOpen = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        loadFile(file);
    }, [loadFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt'))) {
            loadFile(file);
        }
    }, [loadFile]);

    return {
        markdown,
        setMarkdown,
        fileName,
        viewMode,
        setViewMode,
        isDarkMode,
        setIsDarkMode,
        isFullscreen,
        setIsFullscreen,
        handleNewFile,
        handleFileOpen,
        handleDrop,
        handleExport,
        insertText,
    };
}

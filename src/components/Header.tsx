import {
    View, Save, FolderOpen, Plus, Maximize2, Minimize2,
    Bold, Italic, Code, Strikethrough, Quote,
    Sun, Moon, Pencil, Columns2, SaveAll, Keyboard, List, ListOrdered, ListChecks, Image as ImageIcon, History
} from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';
import { ShortcutDialog } from './ShortcutDialog';
import { InsertMediaDialog } from './InsertMediaDialog';
import { RecentFilesDialog } from './RecentFilesDialog';
import { useEffect, useRef, useState } from 'react';
import { useMarkdownEditor } from '../hooks/useMarkdownEditor';
import { insertCodeBlock, isTauri } from '../utils';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { useModal } from '../contexts/ModalContext';

interface HeaderProps {
    editorState: ReturnType<typeof useMarkdownEditor>;
    insertTextWithHistory: (before: string, after?: string) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    editorRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function Header({
    editorState,
    insertTextWithHistory,
    fileInputRef,
    editorRef
}: HeaderProps) {
    const {
        handleNewFile,
        handleFileOpen,
        handleSave,
        handleSaveAs,
        isDirty,
        viewMode,
        setViewMode,
        isDarkMode,
        setIsDarkMode,
        isFullscreen,
        setIsFullscreen,
        filePath,
        recentFiles,
        openRecentFile
    } = editorState;

    const scrollRef = useRef<HTMLElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        if (scrollRef.current) {
            setStartX(e.pageX - scrollRef.current.offsetLeft);
            setScrollLeft(scrollRef.current.scrollLeft);
        }
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (scrollRef.current && e.deltaY !== 0) {
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    const { openModal, closeModal } = useModal();

    const openMediaDialog = () => openModal(
        <InsertMediaDialog
            onClose={closeModal}
            onInsert={(markdown) => {
                const textarea = editorRef.current;
                let before = markdown;
                let after = '';
                if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
                    after = '';
                }
                insertTextWithHistory(before, after);
            }}
            currentFilePath={filePath || null}
        />
    );

    const openRecentDialog = () => openModal(
        <RecentFilesDialog
            onClose={closeModal}
            recentFiles={recentFiles}
            onOpenRecent={openRecentFile}
            onClearRecent={editorState.clearRecentFiles}
        />
    );

    const openShortcutDialog = () => openModal(
        <ShortcutDialog onClose={closeModal} />
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                openMediaDialog();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                openRecentDialog();
            } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                openShortcutDialog();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [openModal, closeModal, recentFiles, openRecentFile, filePath, insertTextWithHistory, editorRef]);

    return (
        <header
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            className={`h-11 border-b border-border bg-editor-bg flex items-center justify-between px-4 shrink-0 z-30 overflow-x-auto no-scrollbar scroll-smooth ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
        >
            <div className="flex items-center gap-1 min-w-max text-accent pointer-events-auto">
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={handleNewFile} icon={<Plus size={14} />} title="New (Ctrl+N)" />
                    <ToolbarButton onClick={() => {
                        if (isTauri()) {
                            handleFileOpen();
                        } else {
                            fileInputRef.current?.click();
                        }
                    }} icon={<FolderOpen size={14} />} title="Open (Ctrl+O)" />
                    <ToolbarButton onClick={openRecentDialog} icon={<History size={14} />} title="Recent Files (Ctrl+R)" />
                    <div className="relative">
                        <ToolbarButton onClick={handleSave} icon={<Save size={14} />} title="Save (Ctrl+S)" />
                        {isDirty && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
                        )}
                    </div>
                    <ToolbarButton onClick={handleSaveAs} icon={<SaveAll size={14} />} title="Save As (Ctrl+Shift+S)" />
                </div>

                <div className="w-px h-4 bg-border mx-1.5" />

                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={() => insertTextWithHistory('**', '**')} icon={<Bold size={14} />} title="Bold (Ctrl+B)" />
                    <ToolbarButton onClick={() => insertTextWithHistory('_', '_')} icon={<Italic size={14} />} title="Italic (Ctrl+I)" />
                    <ToolbarButton onClick={() => insertTextWithHistory('~~', '~~')} icon={<Strikethrough size={14} />} title="Strikethrough (Ctrl+D)" />
                </div>

                <div className="w-px h-4 bg-border mx-1.5" />

                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={() => insertTextWithHistory('\n> ')} icon={<Quote size={14} />} title="Blockquote (Ctrl+Q)" />
                    <ToolbarButton
                        onClick={() => insertCodeBlock(editorRef, insertTextWithHistory)}
                        icon={<Code size={14} />}
                        title="Code (Ctrl+E)"
                    />
                    <ToolbarButton onClick={openMediaDialog} icon={<ImageIcon size={14} />} title="Insert Link and Media (Ctrl+K)" />
                </div>

                <div className="w-px h-4 bg-border mx-1.5" />

                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={() => insertTextWithHistory('\n- ')} icon={<List size={14} />} title="Bullet List (Ctrl+L)" />
                    <ToolbarButton onClick={() => insertTextWithHistory('\n1. ')} icon={<ListOrdered size={14} />} title="Ordered List (Ctrl+Shift+L)" />
                    <ToolbarButton onClick={() => insertTextWithHistory('\n- [ ] ')} icon={<ListChecks size={14} />} title="Task List (Ctrl+Shift+T)" />
                </div>
            </div>

            <div className="flex items-center min-w-max ml-4">
                <div className="flex items-center border border-border rounded overflow-hidden divide-x divide-border/50">
                    <ToolbarButton
                        active={viewMode === 'editor'}
                        onClick={() => setViewMode('editor')}
                        icon={<Pencil size={12} />}
                        title="Editor (Alt+1)"
                        className="w-7 h-7 rounded-none border-none ring-0"
                    />
                    <ToolbarButton
                        active={viewMode === 'split'}
                        onClick={() => setViewMode('split')}
                        icon={<Columns2 size={12} />}
                        title="Split (Alt+2)"
                        className="w-7 h-7 rounded-none border-none ring-0"
                    />
                    <ToolbarButton
                        active={viewMode === 'preview'}
                        onClick={() => setViewMode('preview')}
                        icon={<View size={12} />}
                        title="Preview (Alt+3)"
                        className="w-7 h-7 rounded-none border-none ring-0"
                    />
                </div>

                <div className="flex items-center gap-0.5 ml-2">
                    <ToolbarButton
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        icon={isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                        title={isDarkMode ? "Light Mode (Ctrl+Shift+D)" : "Dark Mode (Ctrl+Shift+D)"}
                    />
                    <ToolbarButton
                        onClick={() => {
                            setIsFullscreen(!isFullscreen);
                            if (isTauri()) {
                                getCurrentWindow().setFullscreen(!isFullscreen).catch(e => console.error(e));
                            }
                        }}
                        icon={isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        title="Fullscreen (F11)"
                    />
                    <ToolbarButton
                        onClick={openShortcutDialog}
                        icon={<Keyboard size={14} />}
                        title="Shortcuts"
                    />
                </div>
            </div>

        </header>
    );
}

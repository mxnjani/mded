
import {
    View, Save, FolderOpen, Plus, Maximize2, Minimize2,
    Bold, Italic, Code, Link as LinkIcon, Strikethrough,
    Sun, Moon, Pencil, Columns2, SaveAll, Keyboard, List, ListOrdered, ListChecks
} from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';
import { ShortcutDialog } from './ShortcutDialog';
import { useMarkdownEditor } from '../hooks/useMarkdownEditor';
import { insertCodeBlock } from '../utils';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauri } from '../utils';

interface HeaderProps {
    editorState: ReturnType<typeof useMarkdownEditor>;
    insertTextWithHistory: (before: string, after?: string) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    editorRef: React.RefObject<HTMLTextAreaElement | null>;
    showShortcuts: boolean;
    setShowShortcuts: (v: boolean) => void;
}

export function Header({
    editorState,
    insertTextWithHistory,
    fileInputRef,
    editorRef,
    showShortcuts,
    setShowShortcuts
}: HeaderProps) {
    const {
        handleNewFile,
        handleFileOpen,
        handleExport,
        handleSaveAs,
        isDirty,
        viewMode,
        setViewMode,
        isDarkMode,
        setIsDarkMode,
        isFullscreen,
        setIsFullscreen
    } = editorState;
    return (
        <header className="h-11 border-b border-border bg-editor-bg flex items-center justify-between px-4 shrink-0 z-30 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 min-w-max text-accent">
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={handleNewFile} icon={<Plus size={14} />} title="New (Ctrl+N)" />
                    <ToolbarButton onClick={() => {
                        if (isTauri()) {
                            handleFileOpen();
                        } else {
                            fileInputRef.current?.click();
                        }
                    }} icon={<FolderOpen size={14} />} title="Open (Ctrl+O)" />
                    <div className="relative">
                        <ToolbarButton onClick={handleExport} icon={<Save size={14} />} title="Save (Ctrl+S)" />
                        {isDirty && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
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
                    <ToolbarButton
                        onClick={() => insertCodeBlock(editorRef, insertTextWithHistory)}
                        icon={<Code size={14} />}
                        title="Code (Ctrl+E)"
                    />
                    <ToolbarButton onClick={() => insertTextWithHistory('[', '](url)')} icon={<LinkIcon size={14} />} title="Link (Ctrl+K)" />
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
                        title="Editor (Ctrl+1)"
                        className="w-7.5 h-6.5 rounded-none border-none ring-0"
                    />
                    <ToolbarButton
                        active={viewMode === 'split'}
                        onClick={() => setViewMode('split')}
                        icon={<Columns2 size={12} />}
                        title="Split (Ctrl+2)"
                        className="w-7.5 h-6.5 rounded-none border-none ring-0"
                    />
                    <ToolbarButton
                        active={viewMode === 'preview'}
                        onClick={() => setViewMode('preview')}
                        icon={<View size={12} />}
                        title="Preview (Ctrl+3)"
                        className="w-7.5 h-6.5 rounded-none border-none ring-0"
                    />
                </div>

                <div className="flex items-center gap-0.5 ml-2">
                    <ToolbarButton
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        icon={isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                        title={isDarkMode ? "Light Mode" : "Dark Mode"}
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
                        onClick={() => setShowShortcuts(true)}
                        icon={<Keyboard size={14} />}
                        title="Shortcuts"
                    />
                </div>
            </div>

            <ShortcutDialog
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
            />
        </header>
    );
}


import {
    View, Save, FolderOpen, Plus, Maximize2, Minimize2,
    Bold, Italic, Code, Link as LinkIcon,
    Hash, Sun, Moon, Pencil, Columns2, SaveAll
} from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';
import { ViewMode } from '../hooks/useMarkdownEditor';
import { insertCodeBlock } from '../utils';

interface HeaderProps {
    handleNewFile: () => void;
    handleFileOpen: (e?: React.ChangeEvent<HTMLInputElement>) => void;
    handleExport: () => void;
    handleSaveAs: () => void;
    insertText: (before: string, after?: string) => void;
    isDirty: boolean;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    isDarkMode: boolean;
    setIsDarkMode: (isDark: boolean) => void;
    isFullscreen: boolean;
    setIsFullscreen: (full: boolean) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    editorRef: React.RefObject<HTMLTextAreaElement | null>;
    isMdvaultMode: boolean;
}

export function Header({
    handleNewFile,
    handleFileOpen,
    handleExport,
    handleSaveAs,
    insertText,
    isDirty,
    viewMode,
    setViewMode,
    isDarkMode,
    setIsDarkMode,
    isFullscreen,
    setIsFullscreen,
    fileInputRef,
    editorRef,
    isMdvaultMode
}: HeaderProps) {
    const disabledStyle = 'hidden';
    return (
        <header className="h-11 border-b border-border bg-editor-bg flex items-center justify-between px-4 shrink-0 z-30 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 min-w-max text-accent">
                {/* File Group */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={handleNewFile} icon={<Plus size={14} />} title="New (Ctrl+N)" className={isMdvaultMode ? disabledStyle : ''} />
                    <ToolbarButton onClick={() => {
                        if (isMdvaultMode) return;
                        if (window.__TAURI_INTERNALS__) {
                            handleFileOpen();
                        } else {
                            fileInputRef.current?.click();
                        }
                    }} icon={<FolderOpen size={14} />} title="Open (Ctrl+O)" className={isMdvaultMode ? disabledStyle : ''} />
                    <div className="relative">
                        <ToolbarButton onClick={handleExport} icon={<Save size={14} />} title="Save (Ctrl+S)" />
                        {isDirty && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        )}
                    </div>
                    <ToolbarButton onClick={handleSaveAs} icon={<SaveAll size={14} />} title="Save As (Ctrl+Shift+S)" className={isMdvaultMode ? disabledStyle : ''} />
                </div>

                <div className="w-px h-4 bg-border mx-1.5" />

                {/* Formatting Group */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={() => insertText('# ')} icon={<Hash size={14} />} title="Heading (Ctrl+H)" />
                    <ToolbarButton onClick={() => insertText('**', '**')} icon={<Bold size={14} />} title="Bold (Ctrl+B)" />
                    <ToolbarButton onClick={() => insertText('_', '_')} icon={<Italic size={14} />} title="Italic (Ctrl+I)" />
                </div>

                <div className="w-px h-4 bg-border mx-1.5" />

                {/* Blocks Group */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton
                        onClick={() => insertCodeBlock(editorRef, insertText)}
                        icon={<Code size={14} />}
                        title="Code (Ctrl+E)"
                    />
                    <ToolbarButton onClick={() => insertText('[', '](url)')} icon={<LinkIcon size={14} />} title="Link (Ctrl+K)" />
                </div>
            </div>

            <div className="flex items-center min-w-max ml-4">
                {/* View Mode Switcher */}
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

                {/* System Controls */}
                <div className="flex items-center gap-0.5 ml-2">
                    <ToolbarButton
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        icon={isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                        title={isDarkMode ? "Light Mode" : "Dark Mode"}
                    />
                    <ToolbarButton
                        onClick={() => {
                            setIsFullscreen(!isFullscreen);
                            // Tauri full-screen support
                            if (window.__TAURI_INTERNALS__) {
                                import('@tauri-apps/api/window').then(module => {
                                    const getCurrentWindow = module.getCurrentWindow;
                                    getCurrentWindow().setFullscreen(!isFullscreen);
                                }).catch(e => console.error(e));
                            }
                        }}
                        icon={isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        title="Fullscreen (F11)"
                    />
                </div>
            </div>
        </header>
    );
}

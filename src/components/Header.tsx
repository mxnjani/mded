import React from 'react';
import {
    Eye, Save, FolderOpen, Plus, Maximize2, Minimize2,
    Bold, Italic, List, Quote, Code, Link as LinkIcon,
    Hash, Sun, Moon, Pencil
} from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';
import { ViewMode } from '../hooks/useMarkdownEditor';

interface HeaderProps {
    handleNewFile: () => void;
    handleExport: () => void;
    insertText: (before: string, after?: string) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    isDarkMode: boolean;
    setIsDarkMode: (isDark: boolean) => void;
    isFullscreen: boolean;
    setIsFullscreen: (full: boolean) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    editorRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function Header({
    handleNewFile,
    handleExport,
    insertText,
    viewMode,
    setViewMode,
    isDarkMode,
    setIsDarkMode,
    isFullscreen,
    setIsFullscreen,
    fileInputRef,
    editorRef
}: HeaderProps) {
    return (
        <header className="h-11 border-b border-border bg-editor-bg flex items-center justify-between px-4 shrink-0 z-30 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 min-w-max">
                {/* File Group */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={handleNewFile} icon={<Plus size={14} />} title="New (Ctrl+N)" />
                    <ToolbarButton onClick={() => fileInputRef.current?.click()} icon={<FolderOpen size={14} />} title="Open (Ctrl+O)" />
                    <ToolbarButton onClick={handleExport} icon={<Save size={14} />} title="Save (Ctrl+S)" />
                </div>

                <div className="w-px h-4 bg-border mx-1.5" />

                {/* Formatting Group */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={() => insertText('# ')} icon={<Hash size={14} />} title="Heading" />
                    <ToolbarButton onClick={() => insertText('**', '**')} icon={<Bold size={14} />} title="Bold (Ctrl+B)" />
                    <ToolbarButton onClick={() => insertText('_', '_')} icon={<Italic size={14} />} title="Italic (Ctrl+I)" />
                </div>

                <div className="w-px h-4 bg-border mx-1.5" />

                {/* Blocks Group */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton onClick={() => insertText('\n- ')} icon={<List size={14} />} title="List" />
                    <ToolbarButton onClick={() => insertText('\n> ')} icon={<Quote size={14} />} title="Quote" />
                    <ToolbarButton
                        onClick={() => {
                            const textarea = editorRef.current;
                            if (!textarea) return;
                            const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
                            if (selectedText.includes('\n') || selectedText.length === 0) {
                                insertText('```\n', '\n```');
                            } else {
                                insertText('`', '`');
                            }
                        }}
                        icon={<Code size={14} />}
                        title="Code"
                    />
                    <ToolbarButton onClick={() => insertText('[', '](url)')} icon={<LinkIcon size={14} />} title="Link" />
                </div>
            </div>

            <div className="flex items-center gap-1 min-w-max ml-4">
                {/* View Mode Switcher */}
                <div className="flex items-center bg-border/10 rounded-md p-0.5">
                    <ToolbarButton
                        active={false}
                        onClick={() => setViewMode(viewMode === 'preview' ? 'editor' : 'preview')}
                        icon={viewMode === 'preview' ? <Pencil size={13} /> : <Eye size={13} />}
                        title={viewMode === 'preview' ? "Edit" : "View"}
                    />
                </div>

                <div className="w-px h-4 bg-border mx-1.5" />

                {/* System Controls */}
                <div className="flex items-center gap-0.5">
                    <ToolbarButton
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        icon={isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                        title={isDarkMode ? "Light Mode" : "Dark Mode"}
                    />
                    <ToolbarButton
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        icon={isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        title="Fullscreen"
                    />
                </div>
            </div>
        </header>
    );
}

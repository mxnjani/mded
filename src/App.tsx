import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { ToolbarButton } from './components/ToolbarButton';
import { useMarkdownEditor } from './hooks/useMarkdownEditor';
import { cn } from './utils';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const {
    markdown,
    setMarkdown,
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
    insertText
  } = useMarkdownEditor(editorRef, fileInputRef);

  return (
    <div
      className="flex flex-col h-screen w-full bg-bg selection:bg-accent/10 overflow-hidden text-accent"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileOpen}
        accept=".md,.markdown,.txt"
        className="hidden"
      />

      <Header
        handleNewFile={handleNewFile}
        handleExport={handleExport}
        insertText={insertText}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        fileInputRef={fileInputRef}
        editorRef={editorRef}
      />

      <main className={cn(
        "flex-1 flex overflow-hidden relative",
        isFullscreen && "fixed inset-0 z-[60] bg-bg"
      )}>
        {isFullscreen && (
          <div className="absolute top-3 right-3 z-[70] bg-bg/80 backdrop-blur-sm rounded-md border border-border/50">
            <ToolbarButton
              onClick={() => setIsFullscreen(false)}
              icon={<X size={14} />}
              title="Close Fullscreen"
            />
          </div>
        )}

        {viewMode === 'editor' ? (
          <Editor
            markdown={markdown}
            setMarkdown={setMarkdown}
            editorRef={editorRef}
          />
        ) : (
          <Preview
            markdown={markdown}
            previewRef={previewRef}
          />
        )}
      </main>
    </div>
  );
}

import { useRef, useEffect, useDeferredValue } from 'react';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: Record<string, unknown>;
  }
}
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { useMarkdownEditor } from './hooks/useMarkdownEditor';
import { cn, insertCodeBlock } from './utils';
import { ConfirmDialog } from './components/ConfirmDialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';


export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const {
    markdown,
    setMarkdown,
    fileName,
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
    isDirty,
    isMdvaultMode,
    pushToHistory,
    undo,
    redo,
    nextCursorRef,
  } = useMarkdownEditor(editorRef);

  // Wrap insertText to pass history functions
  const insertTextWithHistory = (before: string, after: string = '') => {
    insertText(before, after, pushToHistory, nextCursorRef);
  };

  // Keep a ref to isDirty for event handlers that capture stale closures
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  // Deferred markdown for preview to avoid blocking editor input
  const deferredMarkdown = useDeferredValue(markdown);

  // Show window after React has fully rendered (eliminates white flash)
  useEffect(() => {
    if (window.__TAURI_INTERNALS__) {
      getCurrentWindow().show();
    }
  }, []);

  // Formatting shortcuts with history support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Tab traversal globally (including in editor)
      if (e.key === 'Tab') {
        e.preventDefault();
      }

      // Disable native shortcuts in production
      if (!import.meta.env.DEV) {
        // Prevent Print (Ctrl+P / Cmd+P)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
          e.preventDefault();
        }
        // Prevent Search (Ctrl+F / Cmd+F)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
        }
        // Prevent Inspect Element (F12 or Ctrl+Shift+I / Cmd+Option+I)
        if (
          e.key === 'F12' ||
          (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i')
        ) {
          e.preventDefault();
        }
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            insertTextWithHistory('**', '**');
            break;
          case 'i':
            e.preventDefault();
            insertTextWithHistory('_', '_');
            break;
          case 'h':
            e.preventDefault();
            insertTextWithHistory('# ');
            break;
          case 'q':
            e.preventDefault();
            insertTextWithHistory('\n> ');
            break;
          case 'e':
            e.preventDefault();
            insertCodeBlock(editorRef, insertTextWithHistory);
            break;
          case 'k':
            e.preventDefault();
            insertTextWithHistory('[', '](url)');
            break;
        }
      }
    };

    // Use capture phase to ensure we intercept before other handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    // Also disable context menu (right click) in production
    const handleContextMenu = (e: MouseEvent) => {
      if (!import.meta.env.DEV) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [insertText, pushToHistory, nextCursorRef]);

  useEffect(() => {
    let titleStr: string;
    if (isMdvaultMode) {
      titleStr = isDirty ? `[mdVault - ${fileName}]*` : `[mdVault - ${fileName}]`;
    } else {
      titleStr = isDirty ? `mdED [${fileName}]*` : `mdED [${fileName}]`;
    }
    if (window.__TAURI_INTERNALS__) {
      getCurrentWindow().setTitle(titleStr).catch(console.error);
    } else {
      document.title = titleStr;
    }
  }, [fileName, isDirty, isMdvaultMode]);

  // Close confirmation
  useEffect(() => {
    if (window.__TAURI_INTERNALS__) {
      // Tauri native: listen for the close-requested event emitted from Rust
      let unlisten: (() => void) | undefined;
      listen('close-requested', async () => {
        if (isDirtyRef.current) {
          setShowCloseConfirm(true);
        } else {
          await invoke('close_app');
        }
      }).then(fn => { unlisten = fn; });

      return () => { unlisten?.(); };
    } else {
      // Web fallback: browser beforeunload
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (isDirtyRef.current) {
          e.preventDefault();
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [setShowCloseConfirm]);

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
        handleFileOpen={handleFileOpen}
        handleExport={handleExport}
        handleSaveAs={handleSaveAs}
        insertText={insertTextWithHistory}
        isDirty={isDirty}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        fileInputRef={fileInputRef}
        editorRef={editorRef}
        isMdvaultMode={isMdvaultMode}
      />

      <main className={cn(
        "flex-1 flex overflow-hidden relative"
      )}>
        {viewMode === 'editor' && (
          <Editor
            markdown={markdown}
            setMarkdown={setMarkdown}
            editorRef={editorRef}
            pushToHistory={pushToHistory}
            undo={undo}
            redo={redo}
            nextCursorRef={nextCursorRef}
          />
        )}

        {viewMode === 'preview' && (
          <Preview
            markdown={deferredMarkdown}
            previewRef={previewRef}
          />
        )}

        {viewMode === 'split' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
              <Editor
                markdown={markdown}
                setMarkdown={setMarkdown}
                editorRef={editorRef}
                pushToHistory={pushToHistory}
                undo={undo}
                redo={redo}
                nextCursorRef={nextCursorRef}
              />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <Preview
                markdown={deferredMarkdown}
                previewRef={previewRef}
              />
            </div>
          </div>
        )}
      </main>

      {/* Close Confirmation */}
      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="Unsaved Changes"
        message="Close without saving?"
        confirmLabel="Close without saving"
        variant="danger"
        onConfirm={async () => {
          if (window.__TAURI_INTERNALS__) {
            await invoke('close_app');
          }
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />

      {/* New File Confirmation */}
      <ConfirmDialog
        isOpen={showNewFileConfirm}
        title="New File"
        message="Start a new file? Unsaved changes will be lost."
        confirmLabel="Discard & New"
        variant="danger"
        onConfirm={confirmNewFile}
        onCancel={() => setShowNewFileConfirm(false)}
      />
    </div>
  );
}

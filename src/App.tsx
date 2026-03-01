import { useRef, useEffect, useDeferredValue, useState } from 'react';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { useMarkdownEditor } from './hooks/useMarkdownEditor';
import { cn, insertCodeBlock } from './utils';
import { ConfirmDialog } from './components/ConfirmDialog';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauri } from './utils';

// We can remove the declare global Window since we wrapped it in isTauri now,
// but let's keep it in index.ts for safety if needed, or just let TS infer.


export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const editorState = useMarkdownEditor(editorRef);
  const { markdown, fileName, viewMode, isDirty, showCloseConfirm, showNewFileConfirm, showOpenFileConfirm, confirmNewFile, confirmOpenFile } = editorState;
  const [showShortcuts, setShowShortcuts] = useState(false);

  const insertTextWithHistory = (before: string, after: string = '') => {
    editorState.insertText(before, after, editorState.pushToHistory, editorState.nextCursorRef);
  };

  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  const deferredMarkdown = useDeferredValue(markdown);

  // Startup: Stay hidden until React UI is ready, then show natively maximized
  useEffect(() => {
    if (isTauri()) {
      invoke('show_maximized_native').catch(console.error);

      // Also ensure focus
      getCurrentWindow().setFocus().catch(console.error);
    }
  }, []);

  const applyHeading = (level: number) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const { value, selectionStart, selectionEnd } = textarea;
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const lineEnd = value.indexOf('\n', selectionEnd);
    const endPos = lineEnd === -1 ? value.length : lineEnd;
    const line = value.substring(lineStart, endPos);

    const headingMatch = line.match(/^(#{1,6})\s/);
    let newLine: string;
    let cursorOffset: number;

    const prefix = '#'.repeat(level) + ' ';

    if (!headingMatch) {
      newLine = prefix + line;
      cursorOffset = prefix.length;
    } else {
      if (headingMatch[1].length === level) {
        newLine = line.replace(/^#{1,6}\s/, '');
        cursorOffset = -headingMatch[0].length;
      } else {
        newLine = line.replace(/^#{1,6}\s/, prefix);
        cursorOffset = prefix.length - headingMatch[0].length;
      }
    }

    const newValue = value.substring(0, lineStart) + newLine + value.substring(endPos);
    const newCursor = selectionStart + cursorOffset;
    editorState.setMarkdown(newValue);
    editorState.pushToHistory(newValue, newCursor, true);
    editorState.nextCursorRef.current = newCursor;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
      }

      if (!import.meta.env.DEV) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
          e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
          e.preventDefault();
        }
        if (
          e.key === 'F12' ||
          (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i')
        ) {
          e.preventDefault();
        }
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case '1':
            e.preventDefault();
            applyHeading(1);
            break;
          case '2':
            e.preventDefault();
            applyHeading(2);
            break;
          case '3':
            e.preventDefault();
            applyHeading(3);
            break;
          case '4':
            e.preventDefault();
            applyHeading(4);
            break;
          case 'b':
            e.preventDefault();
            insertTextWithHistory('**', '**');
            break;
          case 'i':
            e.preventDefault();
            insertTextWithHistory('_', '_');
            break;
          case 'd':
            e.preventDefault();
            insertTextWithHistory('~~', '~~');
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
          case 'l':
            e.preventDefault();
            insertTextWithHistory('\n- ');
            break;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'l':
            e.preventDefault();
            insertTextWithHistory('\n1. ');
            break;
          case 'h':
            e.preventDefault();
            insertTextWithHistory('\n---\n');
            break;
          case 't':
            e.preventDefault();
            insertTextWithHistory('\n- [ ] ');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

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
  }, [editorState, insertTextWithHistory]);

  useEffect(() => {
    const titleStr = isDirty ? `mdED [${fileName}]*` : `mdED [${fileName}]`;
    if (isTauri()) {
      getCurrentWindow().setTitle(titleStr).catch(console.error);
    } else {
      document.title = titleStr;
    }
  }, [fileName, isDirty]);

  useEffect(() => {
    if (isTauri()) {
      const unlistenPromise = listen('close-requested', async () => {
        if (isDirtyRef.current) {
          editorState.setShowCloseConfirm(true);
        } else {
          await invoke('close_app');
        }
      });

      return () => {
        unlistenPromise.then(unlisten => unlisten());
      };
    } else {
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
  }, [editorState.setShowCloseConfirm]); // Need to wrap inside function later or just keep as is with editorState

  return (
    <div
      className="flex flex-col h-screen w-full bg-bg selection:bg-accent/10 overflow-hidden text-accent"
      onDragOver={(e) => e.preventDefault()}
      onDrop={editorState.handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={editorState.handleFileOpen}
        accept=".md,.markdown,.txt"
        className="hidden"
      />

      <Header
        editorState={editorState}
        insertTextWithHistory={insertTextWithHistory}
        fileInputRef={fileInputRef}
        editorRef={editorRef}
        showShortcuts={showShortcuts}
        setShowShortcuts={setShowShortcuts}
      />

      <main className={cn(
        "flex-1 flex overflow-hidden relative"
      )}>
        {viewMode === 'editor' && (
          <Editor
            editorState={editorState}
            editorRef={editorRef}
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
                editorState={editorState}
                editorRef={editorRef}
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

      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="Unsaved Changes"
        message="Close without saving?"
        confirmLabel="Close without saving"
        variant="danger"
        onConfirm={async () => {
          if (isTauri()) {
            await invoke('close_app');
          }
        }}
        onCancel={() => editorState.setShowCloseConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showNewFileConfirm}
        title="New File"
        message="Start a new file? Unsaved changes will be lost."
        confirmLabel="Discard & New"
        variant="danger"
        onConfirm={confirmNewFile}
        onCancel={() => editorState.setShowNewFileConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showOpenFileConfirm}
        title="Unsaved Changes"
        message="Open a new file? Unsaved changes in the current file will be lost."
        confirmLabel="Discard & Open"
        variant="danger"
        onConfirm={confirmOpenFile}
        onCancel={() => editorState.setShowOpenFileConfirm(false)}
      />
    </div>
  );
}

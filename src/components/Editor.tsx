import React, { useLayoutEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

import { useMarkdownEditor } from '../hooks/useMarkdownEditor';

interface EditorProps {
    editorState: ReturnType<typeof useMarkdownEditor>;
    editorRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const Editor = React.memo(function Editor({ editorState, editorRef }: EditorProps) {
    const { markdown, setMarkdown, pushToHistory, undo, redo, nextCursorRef, lastValue } = editorState;
    useLayoutEffect(() => {
        if (nextCursorRef.current !== null && editorRef.current) {
            const scrollTop = editorRef.current.scrollTop;
            editorRef.current.focus();
            editorRef.current.selectionStart = nextCursorRef.current;
            editorRef.current.selectionEnd = nextCursorRef.current;
            editorRef.current.scrollTop = scrollTop;
            nextCursorRef.current = null;
        }
    });

    const scrollToTop = () => {
        if (editorRef.current) {
            editorRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const scrollToBottom = () => {
        if (editorRef.current) {
            editorRef.current.scrollTo({ top: editorRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value, selectionStart } = e.target;
        setMarkdown(value);

        const isBulk = Math.abs(value.length - (lastValue || markdown).length) > 1;
        const lastChar = value.substring(selectionStart - 1, selectionStart);
        const isBoundary = /[\s\n.,;?!()[\]{}"'\-]/.test(lastChar);

        const shouldForceImmediate = isBulk || isBoundary;
        pushToHistory(value, selectionStart, shouldForceImmediate);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = editorRef.current;
        if (!textarea) return;

        if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            undo();
            return;
        }

        if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            redo();
            return;
        }

        if (e.key === 'Enter') {
            const { selectionStart, value } = textarea;

            const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
            const currentLine = value.substring(lineStart, selectionStart);

            const taskMatch = currentLine.match(/^(\s*)([-*+])\s+\[([ xX])\]\s/);
            const unorderedMatch = taskMatch ? null : currentLine.match(/^(\s*)([-*+])\s/);
            const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s/);

            if (taskMatch || unorderedMatch || orderedMatch) {
                let lineContent = '';
                if (taskMatch) {
                    lineContent = currentLine.replace(/^(\s*)([-*+])\s+\[([ xX])\]\s/, '');
                } else if (orderedMatch) {
                    lineContent = currentLine.replace(/^(\s*)(\d+)\.\s/, '');
                } else if (unorderedMatch) {
                    lineContent = currentLine.replace(/^(\s*)([-*+])\s/, '');
                }

                e.preventDefault();

                if (lineContent.trim() === '') {
                    const newValue = value.substring(0, lineStart) + '\n' + value.substring(selectionStart);
                    nextCursorRef.current = lineStart + 1;
                    pushToHistory(newValue, lineStart + 1, true);
                    setMarkdown(newValue);
                    return;
                }

                let prefix: string;
                if (taskMatch) {
                    const indent = taskMatch[1];
                    const marker = taskMatch[2];
                    prefix = `${indent}${marker} [ ] `;
                } else if (orderedMatch) {
                    const indent = orderedMatch[1];
                    const num = parseInt(orderedMatch[2], 10);
                    prefix = `${indent}${num + 1}. `;
                } else {
                    const indent = unorderedMatch![1];
                    const marker = unorderedMatch![2];
                    prefix = `${indent}${marker} `;
                }

                const newValue = value.substring(0, selectionStart) + '\n' + prefix + value.substring(selectionStart);
                const newCursor = selectionStart + 1 + prefix.length;
                nextCursorRef.current = newCursor;
                pushToHistory(newValue, newCursor, true);
                setMarkdown(newValue);
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    editorState.handleImagePaste(file);
                    return;
                }
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-editor-bg relative group">
            <textarea
                ref={editorRef}
                value={markdown}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Write something..."
                className="flex-1 w-full pt-12 px-12 pb-[40vh] resize-none focus:outline-none font-mono text-[15px] leading-[1.7] tracking-[0.01em] bg-transparent m-0 whitespace-pre-wrap cursor-auto"
                spellCheck={false}
            />
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={scrollToTop}
                    className="p-1.5 rounded-full bg-border/40 hover:bg-border/80 text-accent backdrop-blur-sm transition-colors cursor-pointer"
                    title="Scroll to Top"
                >
                    <ArrowUp size={16} />
                </button>
                <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={scrollToBottom}
                    className="p-1.5 rounded-full bg-border/40 hover:bg-border/80 text-accent backdrop-blur-sm transition-colors cursor-pointer"
                    title="Scroll to Bottom"
                >
                    <ArrowDown size={16} />
                </button>
            </div>
        </div>
    );
});

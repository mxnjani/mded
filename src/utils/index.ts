import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function insertCodeBlock(
    editorRef: React.RefObject<HTMLTextAreaElement | null>,
    insertText: (before: string, after?: string) => void
) {
    const textarea = editorRef.current;
    if (!textarea) return;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    if (selectedText.includes('\n') || selectedText.length === 0) {
        insertText('```\n', '\n```');
    } else {
        insertText('`', '`');
    }
}

export const isTauri = () => typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

import { useRef, useCallback } from 'react';

interface HistoryEntry {
    value: string;
    cursor: number;
}

interface UseHistoryOptions {
    onRestore: (value: string) => void;
}

export function useHistory({ onRestore }: UseHistoryOptions) {
    const historyRef = useRef<HistoryEntry[]>([{ value: '', cursor: 0 }]);
    const historyIndexRef = useRef<number>(0);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nextCursorRef = useRef<number | null>(null);

    /**
     * Push a new history entry. Use `immediate=true` for structural
     * changes (list continuation, toolbar actions). Typed characters
     * are debounced (300ms) so undo restores natural chunks.
     */
    const push = useCallback((value: string, cursor: number, immediate = false) => {
        const commit = () => {
            const history = historyRef.current;
            const index = historyIndexRef.current;
            const newHistory = history.slice(0, index + 1);
            // Avoid duplicate consecutive entries
            if (newHistory.length > 0 && newHistory[newHistory.length - 1].value === value) return;
            newHistory.push({ value, cursor });
            if (newHistory.length > 200) newHistory.shift();
            historyRef.current = newHistory;
            historyIndexRef.current = newHistory.length - 1;
        };

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        if (immediate) {
            commit();
        } else {
            debounceTimerRef.current = setTimeout(commit, 300);
        }
    }, []);

    const undo = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        const index = historyIndexRef.current;
        if (index > 0) {
            const prev = historyRef.current[index - 1];
            historyIndexRef.current = index - 1;
            onRestore(prev.value);
            nextCursorRef.current = prev.cursor;
        }
    }, [onRestore]);

    const redo = useCallback(() => {
        const index = historyIndexRef.current;
        if (index < historyRef.current.length - 1) {
            const next = historyRef.current[index + 1];
            historyIndexRef.current = index + 1;
            onRestore(next.value);
            nextCursorRef.current = next.cursor;
        }
    }, [onRestore]);

    const reset = useCallback((value: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        historyRef.current = [{ value, cursor: 0 }];
        historyIndexRef.current = 0;
        nextCursorRef.current = null;
    }, []);

    return { push, undo, redo, reset, nextCursorRef };
}

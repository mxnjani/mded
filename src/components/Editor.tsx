import React from 'react';

interface EditorProps {
    markdown: string;
    setMarkdown: (value: string) => void;
    editorRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function Editor({ markdown, setMarkdown, editorRef }: EditorProps) {
    return (
        <div className="flex-1 flex flex-col bg-editor-bg">
            <textarea
                ref={editorRef}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Write something..."
                className="flex-1 w-full p-10 resize-none focus:outline-none font-mono text-[13px] leading-relaxed bg-transparent"
                spellCheck={false}
            />
        </div>
    );
}

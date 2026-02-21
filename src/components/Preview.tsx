import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PreviewProps {
    markdown: string;
    previewRef: React.RefObject<HTMLDivElement | null>;
}

export function Preview({ markdown, previewRef }: PreviewProps) {
    return (
        <div className="flex-1 bg-bg overflow-y-auto">
            <div ref={previewRef} className="max-w-2xl mx-auto p-10 markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdown}
                </ReactMarkdown>
            </div>
        </div>
    );
}

/**
 * FloatingToc — Plug-and-play Table of Contents for the Preview pane.
 *
 * Integrated inside Preview.tsx for reliable positioning and DOM access.
 * To remove: delete this file + FloatingToc.css, and remove the import
 * and <FloatingToc> render line from Preview.tsx.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { List, X } from 'lucide-react';
import './FloatingToc.css';

interface TocHeading {
    id: string;
    text: string;
    level: number;
}

interface FloatingTocProps {
    /** Raw markdown — used only as a trigger to re-scan DOM headings */
    markdown: string;
    /** Ref to the .markdown-body div where headings are rendered */
    previewRef: React.RefObject<HTMLDivElement | null>;
    /** Ref to the scrollable container div */
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export const FloatingToc = React.memo(function FloatingToc({
    markdown,
    previewRef,
    containerRef,
}: FloatingTocProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [headings, setHeadings] = useState<TocHeading[]>([]);

    // Extract headings from the rendered DOM after markdown changes.
    // useEffect runs after React commits the DOM, so headings are already present.
    useEffect(() => {
        const container = previewRef.current;
        if (!container) return;

        const elements = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const items: TocHeading[] = [];

        elements.forEach((el) => {
            const id = el.getAttribute('id');
            if (id) {
                items.push({
                    id,
                    text: el.textContent?.trim() || '',
                    level: parseInt(el.tagName[1], 10),
                });
            }
        });

        setHeadings(items);
    }, [markdown, previewRef]);

    const toggle = useCallback(() => setIsOpen((v) => !v), []);

    const scrollTo = useCallback(
        (id: string) => {
            const scrollContainer = containerRef.current;
            const target = previewRef.current?.querySelector(
                `#${CSS.escape(id)}`
            ) as HTMLElement | null;

            if (target && scrollContainer) {
                // Calculate offset relative to the scrollable container
                const containerRect = scrollContainer.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();
                const offset =
                    scrollContainer.scrollTop + (targetRect.top - containerRect.top) - 20;

                scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
            }
        },
        [previewRef, containerRef],
    );

    if (headings.length === 0) return null;

    return (
        <>
            {/* Toggle button — always visible when headings exist */}
            <button
                className={`floating-toc-trigger${isOpen ? ' active' : ''}`}
                onClick={toggle}
                title="Table of Contents"
            >
                {isOpen ? <X size={16} /> : <List size={16} />}
            </button>

            {/* Panel */}
            <div className={`floating-toc-panel${isOpen ? ' open' : ''}`}>
                <div className="floating-toc-title">Contents</div>
                {headings.map((h) => (
                    <button
                        key={h.id}
                        className="floating-toc-item"
                        data-level={h.level}
                        onClick={() => scrollTo(h.id)}
                        title={h.text}
                    >
                        {h.text}
                    </button>
                ))}
            </div>
        </>
    );
});

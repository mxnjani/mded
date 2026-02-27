import React, { useEffect, useState, useCallback } from 'react';
import { List, X } from 'lucide-react';
import './FloatingToc.css';

interface TocHeading {
    id: string;
    text: string;
    level: number;
}

interface FloatingTocProps {
    markdown: string;
    previewRef: React.RefObject<HTMLDivElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export const FloatingToc = React.memo(function FloatingToc({
    markdown,
    previewRef,
    containerRef,
}: FloatingTocProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [headings, setHeadings] = useState<TocHeading[]>([]);

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
            <button
                className={`floating-toc-trigger${isOpen ? ' active' : ''}`}
                onClick={toggle}
                title="Table of Contents"
            >
                {isOpen ? <X size={16} /> : <List size={16} />}
            </button>

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

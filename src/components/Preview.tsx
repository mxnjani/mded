import React, { useRef, useMemo, HTMLAttributes, ClassAttributes } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { FloatingToc } from './FloatingToc';
import 'katex/dist/katex.min.css';


const REMARK_PLUGINS = [remarkGfm, remarkMath, remarkBreaks];
const REHYPE_PLUGINS = [rehypeRaw, rehypeKatex];

function getTextContent(node: React.ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(getTextContent).join('');
    if (node && typeof node === 'object' && 'props' in node) {
        return getTextContent((node as any).props.children);
    }
    return '';
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '');
}


function CodeComponent({ inline, className, children, ...props }: HTMLAttributes<HTMLElement> & ClassAttributes<HTMLElement> & { inline?: boolean }) {
    const match = /language-(\w+)/.exec(className || '');
    return match ? (
        <SyntaxHighlighter
            style={vscDarkPlus as any}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0 }}
        >
            {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
    ) : (
        <code className={className} {...props}>
            {children}
        </code>
    );
}

interface PreviewProps {
    markdown: string;
    previewRef: React.RefObject<HTMLDivElement | null>;
}

export const Preview = React.memo(function Preview({ markdown, previewRef }: PreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const slugCountRef = useRef(new Map<string, number>());

    const mdComponents = useMemo(() => {
        function makeHeading(Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') {
            return function Heading({ children, node, ...props }: HTMLAttributes<HTMLHeadingElement> & { node?: any }) {
                const text = getTextContent(children);
                const base = slugify(text) || 'heading';
                const count = slugCountRef.current.get(base) ?? 0;
                slugCountRef.current.set(base, count + 1);
                const id = count > 0 ? `${base}-${count}` : base;
                return <Tag id={id} {...props}>{children}</Tag>;
            };
        }

        return {
            code: CodeComponent,
            h1: makeHeading('h1'),
            h2: makeHeading('h2'),
            h3: makeHeading('h3'),
            h4: makeHeading('h4'),
            h5: makeHeading('h5'),
            h6: makeHeading('h6'),
        };
    }, []);

    slugCountRef.current.clear();

    const scrollToTop = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const scrollToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

    return (
        <div className="flex-1 bg-bg relative group">
            <div ref={containerRef} className="absolute inset-0 overflow-y-auto">
                <div ref={previewRef} className="pt-12 px-12 pb-[40vh] markdown-body">
                    <ReactMarkdown
                        remarkPlugins={REMARK_PLUGINS}
                        rehypePlugins={REHYPE_PLUGINS}
                        components={mdComponents}
                    >
                        {markdown}
                    </ReactMarkdown>
                </div>
            </div>

            <FloatingToc
                markdown={markdown}
                previewRef={previewRef}
                containerRef={containerRef}
            />

            <div className="absolute bottom-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={scrollToTop}
                    className="p-1.5 rounded-full bg-border/40 hover:bg-border/80 text-accent backdrop-blur-sm transition-colors cursor-pointer shadow-sm"
                    style={{ position: 'fixed', bottom: '60px', right: '24px' }}
                    title="Scroll to Top"
                >
                    <ArrowUp size={16} />
                </button>
                <button
                    onClick={scrollToBottom}
                    className="p-1.5 rounded-full bg-border/40 hover:bg-border/80 text-accent backdrop-blur-sm transition-colors cursor-pointer shadow-sm"
                    style={{ position: 'fixed', bottom: '24px', right: '24px' }}
                    title="Scroll to Bottom"
                >
                    <ArrowDown size={16} />
                </button>
            </div>
        </div>
    );
});

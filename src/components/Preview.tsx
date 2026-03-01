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
import { convertFileSrc } from '@tauri-apps/api/core';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import { getDirname, resolvePath } from '../utils/path';
import { isTauri } from '../utils';
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

function isRemoteUrl(src: string): boolean {
    return /^https?:\/\//.test(src) || src.startsWith('data:');
}

function extractYoutubeId(url: string): string | null {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

function isAbsolutePath(p: string): boolean {
    return /^[a-zA-Z]:[/\\]/.test(p) || p.startsWith('/');
}

/** Resolve src to an absolute filesystem path, or return null */
function resolveToAbsolute(src: string, filePath: string | null | undefined): string | null {
    try {
        // Strip file:// or file:/// prefix if present
        let cleanedSrc = src;
        if (cleanedSrc.startsWith('file:///')) {
            cleanedSrc = cleanedSrc.substring(8);
        } else if (cleanedSrc.startsWith('file://')) {
            cleanedSrc = cleanedSrc.substring(7);
        }

        // Must decode URI in case it has %20 spaces etc. 
        const decoded = decodeURI(cleanedSrc);
        if (isAbsolutePath(decoded)) return decoded;
        if (!filePath) return null;
        const dir = getDirname(filePath);
        if (!dir) return null;
        const resolved = resolvePath(dir, decoded);
        return isAbsolutePath(resolved) ? resolved : null;
    } catch {
        return null;
    }
}

interface PreviewProps {
    markdown: string;
    previewRef: React.RefObject<HTMLDivElement | null>;
    filePath?: string | null;
}

export const Preview = React.memo(function Preview({ markdown, previewRef, filePath }: PreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const slugCountRef = useRef(new Map<string, number>());

    const mdComponents = useMemo(() => {
        function makeHeading(Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') {
            return function Heading({ children, ...props }: HTMLAttributes<HTMLHeadingElement> & { node?: any }) {
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

            img: ({ src, alt, ...props }: any) => {
                if (!src) return null;

                if (isRemoteUrl(src)) {
                    return <img src={src} alt={alt || ''} {...props} className="max-w-full h-auto my-4 shadow-sm" />;
                }

                if (isTauri()) {
                    const abs = resolveToAbsolute(src, filePath);
                    if (abs) {
                        try {
                            const assetUrl = convertFileSrc(abs);
                            return <img src={assetUrl} alt={alt || ''} {...props} className="max-w-full h-auto my-4 shadow-sm" />;
                        } catch (e) {
                            console.error("Failed to convert file src:", e);
                            return null;
                        }
                    }
                }
                return <img src={src} alt={alt || ''} {...props} className="max-w-full h-auto my-4 shadow-sm" />;
            },

            a: ({ href, children, ...props }: any) => {
                const handleClick = async (e: React.MouseEvent) => {
                    e.preventDefault();
                    if (!href) return;

                    if (!isTauri()) {
                        window.open(href, '_blank');
                        return;
                    }

                    try {
                        if (/^https?:\/\//.test(href)) {
                            await openUrl(href);
                            return;
                        }

                        const abs = resolveToAbsolute(href, filePath);
                        if (abs) {
                            await openPath(abs);
                        }
                    } catch (err) {
                        console.error('Failed to open:', href, err);
                    }
                };

                const ytId = href ? extractYoutubeId(href) : null;

                const getLinkText = (children: any): string => {
                    if (typeof children === 'string') return children;
                    if (Array.isArray(children)) return children.map(getLinkText).join('');
                    if (children?.props?.children) return getLinkText(children.props.children);
                    return '';
                };

                const linkText = getLinkText(children);
                const isNakedUrl = linkText === href;

                if (ytId && !isNakedUrl) {
                    return (
                        <div className="my-4 w-full max-w-full relative overflow-hidden rounded-lg border border-border/40 shadow-sm group">
                            <a href={href} onClick={handleClick} className="block relative bg-black/5" title="Play Video" rel="noopener noreferrer">
                                <img
                                    src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                                    alt="YouTube Video"
                                    className="w-full h-auto aspect-video object-cover"
                                    onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        if (img.src.includes('maxresdefault')) {
                                            img.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                                        }
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors duration-200">
                                    <div className="w-16 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </div>
                                </div>
                            </a>
                        </div>
                    );
                }

                return (
                    <a href={href || '#'} {...props} onClick={handleClick}>
                        {children}
                    </a>
                );
            }
        };
    }, [filePath]);

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
                        urlTransform={(value: string) => value}
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
                    title="Scroll to Top"
                >
                    <ArrowUp size={16} />
                </button>
                <button
                    onClick={scrollToBottom}
                    className="p-1.5 rounded-full bg-border/40 hover:bg-border/80 text-accent backdrop-blur-sm transition-colors cursor-pointer shadow-sm"
                    title="Scroll to Bottom"
                >
                    <ArrowDown size={16} />
                </button>
            </div>
        </div>
    );
});

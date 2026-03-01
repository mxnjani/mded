import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string | React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function Dialog({ isOpen, onClose, title, children, className = '' }: DialogProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm animate-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={`bg-bg border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden w-full max-w-md mx-4 animate-modal-show transform-gpu antialiased ${className}`}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-border bg-bg/50 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-accent m-0 flex items-center gap-2">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-accent/50 hover:text-accent transition-colors text-lg leading-none px-1"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

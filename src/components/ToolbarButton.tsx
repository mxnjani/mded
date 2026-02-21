import React from 'react';
import { cn } from '../utils';

interface ToolbarButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    active?: boolean;
}

export function ToolbarButton({ onClick, icon, title, active }: ToolbarButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "p-1.5 rounded transition-all flex items-center justify-center active:scale-95",
                active
                    ? "text-blue-500 bg-blue-500/5"
                    : "text-muted hover:text-accent hover:bg-accent/10"
            )}
            title={title}
        >
            {icon}
        </button>
    );
}

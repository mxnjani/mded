import React from 'react';
import { cn } from '../utils';

interface ToolbarButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    active?: boolean;
    className?: string;
}

export function ToolbarButton({ onClick, icon, title, active, className }: ToolbarButtonProps) {
    return (
        <button
            tabIndex={-1}
            onClick={onClick}
            className={cn(
                "w-7 h-7 rounded transition-colors flex items-center justify-center text-muted focus:outline-none focus:ring-0",
                active
                    ? "text-primary bg-transparent"
                    : "hover:text-accent hover:bg-accent/10 focus-visible:outline-none",
                className
            )}
            title={title}
        >
            {icon}
        </button>
    );
}

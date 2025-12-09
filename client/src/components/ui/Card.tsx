import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'interactive';
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className, variant = 'default', ...props }, ref) => {
    const variants = {
        default: 'bg-card text-card-foreground border border-border shadow-sm',
        glass: 'bg-slate-900/40 backdrop-blur-md border border-slate-700/50 shadow-xl',
        interactive: 'bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700 transition-colors cursor-pointer',
    };

    return (
        <div
            ref={ref}
            className={cn(
                'rounded-2xl p-6',
                variants[variant],
                className
            )}
            {...props}
        />
    );
});

Card.displayName = 'Card';
export { Card };

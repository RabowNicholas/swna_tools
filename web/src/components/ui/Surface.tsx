import React from 'react';
import { cn } from '@/lib/utils';

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'ground' | 'raised' | 'elevated' | 'overlay';
  interactive?: boolean;
  bordered?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  as?: 'div' | 'section' | 'article' | 'main' | 'aside' | 'nav' | 'header' | 'footer';
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ 
    className, 
    elevation = 'raised', 
    interactive = false,
    bordered = false,
    rounded = 'lg',
    padding = 'md',
    as: Component = 'div',
    children,
    ...props 
  }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          // Base surface styles
          'transition-all duration-200',
          
          // Apple HIG Surface Elevation System
          elevation === 'ground' && [
            'bg-[var(--surface-ground)]',
            'shadow-none border-0'
          ],
          elevation === 'raised' && [
            'bg-[var(--surface-raised)]',
            'shadow-sm',
            bordered && 'border border-[var(--card-border)]'
          ],
          elevation === 'elevated' && [
            'bg-[var(--surface-elevated)]',
            'shadow-md',
            bordered && 'border border-[var(--card-border)]'
          ],
          elevation === 'overlay' && [
            'bg-[var(--surface-overlay)]',
            'shadow-xl',
            bordered && 'border border-[var(--card-border)]'
          ],
          
          // Interactive states
          interactive && [
            'cursor-pointer',
            'hover:shadow-lg hover:scale-[1.01]',
            'active:scale-[0.99] active:shadow-sm'
          ],
          
          // Border radius
          rounded === 'none' && 'rounded-none',
          rounded === 'sm' && 'rounded-sm',
          rounded === 'md' && 'rounded-md',
          rounded === 'lg' && 'rounded-lg',
          rounded === 'xl' && 'rounded-xl',
          rounded === 'full' && 'rounded-full',
          
          // Padding
          padding === 'none' && 'p-0',
          padding === 'xs' && 'p-2',
          padding === 'sm' && 'p-4',
          padding === 'md' && 'p-6',
          padding === 'lg' && 'p-8',
          padding === 'xl' && 'p-10',
          padding === '2xl' && 'p-12',
          
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Surface.displayName = 'Surface';

// Specialized surface components
export const PaperSurface = React.forwardRef<HTMLDivElement, Omit<SurfaceProps, 'elevation'>>(
  ({ className, ...props }, ref) => (
    <Surface
      ref={ref}
      elevation="raised"
      bordered
      className={cn('bg-white dark:bg-gray-900', className)}
      {...props}
    />
  )
);

PaperSurface.displayName = 'PaperSurface';

export const ModalSurface = React.forwardRef<HTMLDivElement, Omit<SurfaceProps, 'elevation'>>(
  ({ className, ...props }, ref) => (
    <Surface
      ref={ref}
      elevation="overlay"
      rounded="xl"
      padding="lg"
      className={cn('max-w-md mx-auto', className)}
      {...props}
    />
  )
);

ModalSurface.displayName = 'ModalSurface';

export const CardSurface = React.forwardRef<HTMLDivElement, Omit<SurfaceProps, 'elevation'>>(
  ({ className, interactive = false, ...props }, ref) => (
    <Surface
      ref={ref}
      elevation="raised"
      interactive={interactive}
      bordered
      className={className}
      {...props}
    />
  )
);

CardSurface.displayName = 'CardSurface';
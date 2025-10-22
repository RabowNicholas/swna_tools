import React from 'react';
import { cn } from '@/lib/utils';

interface SpacingProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  direction?: 'vertical' | 'horizontal' | 'all';
  as?: 'div' | 'section' | 'article' | 'main' | 'aside' | 'nav' | 'header' | 'footer';
}

export const Spacing = ({ 
  children, 
  className, 
  size = 'md', 
  direction = 'vertical',
  as: Component = 'div',
  ...props 
}: SpacingProps) => {
  return (
    <Component 
      className={cn(
        // Apple HIG spacing system based on 8pt grid
        direction === 'vertical' && [
          size === 'xs' && 'space-y-1', // 4pt
          size === 'sm' && 'space-y-2', // 8pt
          size === 'md' && 'space-y-4', // 16pt
          size === 'lg' && 'space-y-6', // 24pt
          size === 'xl' && 'space-y-8', // 32pt
          size === '2xl' && 'space-y-12', // 48pt
          size === '3xl' && 'space-y-16', // 64pt
        ],
        direction === 'horizontal' && [
          size === 'xs' && 'space-x-1',
          size === 'sm' && 'space-x-2',
          size === 'md' && 'space-x-4',
          size === 'lg' && 'space-x-6',
          size === 'xl' && 'space-x-8',
          size === '2xl' && 'space-x-12',
          size === '3xl' && 'space-x-16',
        ],
        direction === 'all' && [
          size === 'xs' && 'gap-1',
          size === 'sm' && 'gap-2',
          size === 'md' && 'gap-4',
          size === 'lg' && 'gap-6',
          size === 'xl' && 'gap-8',
          size === '2xl' && 'gap-12',
          size === '3xl' && 'gap-16',
        ],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

// Utility components for common spacing patterns
export const VStack = ({ 
  children, 
  size = 'md', 
  className, 
  ...props 
}: Omit<SpacingProps, 'direction'>) => (
  <Spacing direction="vertical" size={size} className={cn('flex flex-col', className)} {...props}>
    {children}
  </Spacing>
);

export const HStack = ({ 
  children, 
  size = 'md', 
  className, 
  ...props 
}: Omit<SpacingProps, 'direction'>) => (
  <Spacing direction="horizontal" size={size} className={cn('flex flex-row items-center', className)} {...props}>
    {children}
  </Spacing>
);

export const Grid = ({ 
  children, 
  size = 'md', 
  columns = 'auto',
  className, 
  ...props 
}: Omit<SpacingProps, 'direction'> & { columns?: string | number }) => (
  <Spacing 
    direction="all" 
    size={size} 
    className={cn(
      'grid',
      typeof columns === 'number' ? `grid-cols-${columns}` : `grid-cols-${columns}`,
      className
    )} 
    {...props}
  >
    {children}
  </Spacing>
);

// Spacer component for flexible spacing
export const Spacer = ({ 
  size = 'md',
  direction = 'vertical',
  className 
}: Omit<SpacingProps, 'children' | 'as'>) => (
  <div 
    className={cn(
      direction === 'vertical' && [
        size === 'xs' && 'h-1',
        size === 'sm' && 'h-2',
        size === 'md' && 'h-4',
        size === 'lg' && 'h-6',
        size === 'xl' && 'h-8',
        size === '2xl' && 'h-12',
        size === '3xl' && 'h-16',
      ],
      direction === 'horizontal' && [
        size === 'xs' && 'w-1',
        size === 'sm' && 'w-2',
        size === 'md' && 'w-4',
        size === 'lg' && 'w-6',
        size === 'xl' && 'w-8',
        size === '2xl' && 'w-12',
        size === '3xl' && 'w-16',
      ],
      className
    )}
    aria-hidden="true"
  />
);
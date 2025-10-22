import React from 'react';
import { cn } from '@/lib/utils';
// Layout components for Apple HIG compliance

interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'lg',
  className,
  as: Component = 'div'
}) => {
  return (
    <Component className={cn(
      'mx-auto px-4 sm:px-6 lg:px-8',
      size === 'sm' && 'max-w-2xl',
      size === 'md' && 'max-w-4xl',
      size === 'lg' && 'max-w-6xl',
      size === 'xl' && 'max-w-7xl',
      size === 'full' && 'max-w-full',
      className
    )}>
      {children}
    </Component>
  );
};

interface GridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  };
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns = 1,
  gap = 'md',
  responsive,
  className
}) => {
  return (
    <div className={cn(
      'grid',
      // Base columns
      columns === 1 && 'grid-cols-1',
      columns === 2 && 'grid-cols-2',
      columns === 3 && 'grid-cols-3',
      columns === 4 && 'grid-cols-4',
      columns === 5 && 'grid-cols-5',
      columns === 6 && 'grid-cols-6',
      columns === 12 && 'grid-cols-12',
      
      // Responsive columns
      responsive?.sm === 1 && 'sm:grid-cols-1',
      responsive?.sm === 2 && 'sm:grid-cols-2',
      responsive?.sm === 3 && 'sm:grid-cols-3',
      responsive?.sm === 4 && 'sm:grid-cols-4',
      responsive?.sm === 5 && 'sm:grid-cols-5',
      responsive?.sm === 6 && 'sm:grid-cols-6',
      responsive?.sm === 12 && 'sm:grid-cols-12',
      
      responsive?.md === 1 && 'md:grid-cols-1',
      responsive?.md === 2 && 'md:grid-cols-2',
      responsive?.md === 3 && 'md:grid-cols-3',
      responsive?.md === 4 && 'md:grid-cols-4',
      responsive?.md === 5 && 'md:grid-cols-5',
      responsive?.md === 6 && 'md:grid-cols-6',
      responsive?.md === 12 && 'md:grid-cols-12',
      
      responsive?.lg === 1 && 'lg:grid-cols-1',
      responsive?.lg === 2 && 'lg:grid-cols-2',
      responsive?.lg === 3 && 'lg:grid-cols-3',
      responsive?.lg === 4 && 'lg:grid-cols-4',
      responsive?.lg === 5 && 'lg:grid-cols-5',
      responsive?.lg === 6 && 'lg:grid-cols-6',
      responsive?.lg === 12 && 'lg:grid-cols-12',
      
      responsive?.xl === 1 && 'xl:grid-cols-1',
      responsive?.xl === 2 && 'xl:grid-cols-2',
      responsive?.xl === 3 && 'xl:grid-cols-3',
      responsive?.xl === 4 && 'xl:grid-cols-4',
      responsive?.xl === 5 && 'xl:grid-cols-5',
      responsive?.xl === 6 && 'xl:grid-cols-6',
      responsive?.xl === 12 && 'xl:grid-cols-12',
      
      // Gap
      gap === 'xs' && 'gap-1',
      gap === 'sm' && 'gap-2',
      gap === 'md' && 'gap-4',
      gap === 'lg' && 'gap-6',
      gap === 'xl' && 'gap-8',
      gap === '2xl' && 'gap-12',
      
      className
    )}>
      {children}
    </div>
  );
};

interface FlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'col';
  wrap?: boolean;
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  wrap = false,
  justify = 'start',
  align = 'start',
  gap = 'md',
  className,
  as: Component = 'div'
}) => {
  return (
    <Component className={cn(
      'flex',
      direction === 'row' && 'flex-row',
      direction === 'col' && 'flex-col',
      wrap && 'flex-wrap',
      
      // Justify content
      justify === 'start' && 'justify-start',
      justify === 'end' && 'justify-end',
      justify === 'center' && 'justify-center',
      justify === 'between' && 'justify-between',
      justify === 'around' && 'justify-around',
      justify === 'evenly' && 'justify-evenly',
      
      // Align items
      align === 'start' && 'items-start',
      align === 'end' && 'items-end',
      align === 'center' && 'items-center',
      align === 'stretch' && 'items-stretch',
      align === 'baseline' && 'items-baseline',
      
      // Gap
      gap === 'xs' && 'gap-1',
      gap === 'sm' && 'gap-2',
      gap === 'md' && 'gap-4',
      gap === 'lg' && 'gap-6',
      gap === 'xl' && 'gap-8',
      gap === '2xl' && 'gap-12',
      
      className
    )}>
      {children}
    </Component>
  );
};

interface SectionProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  background?: 'default' | 'muted' | 'accent' | 'primary' | 'transparent';
  border?: boolean;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export const Section: React.FC<SectionProps> = ({
  children,
  padding = 'lg',
  background = 'default',
  border = false,
  className,
  as: Component = 'section'
}) => {
  return (
    <Component className={cn(
      'w-full',
      
      // Padding
      padding === 'none' && 'p-0',
      padding === 'sm' && 'py-4 sm:py-6',
      padding === 'md' && 'py-8 sm:py-12',
      padding === 'lg' && 'py-12 sm:py-16',
      padding === 'xl' && 'py-16 sm:py-20',
      padding === '2xl' && 'py-20 sm:py-24',
      
      // Background
      background === 'default' && 'bg-background',
      background === 'muted' && 'bg-muted',
      background === 'accent' && 'bg-accent',
      background === 'primary' && 'bg-primary text-primary-foreground',
      background === 'transparent' && 'bg-transparent',
      
      // Border
      border && 'border-t border-border',
      
      className
    )}>
      {children}
    </Component>
  );
};

// Apple HIG specific layout patterns
export const TwoColumnLayout: React.FC<{
  sidebar: React.ReactNode;
  main: React.ReactNode;
  sidebarWidth?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({
  sidebar,
  main,
  sidebarWidth = 'md',
  className
}) => {
  return (
    <div className={cn('flex gap-8', className)}>
      <aside className={cn(
        'flex-shrink-0',
        sidebarWidth === 'sm' && 'w-64',
        sidebarWidth === 'md' && 'w-80',
        sidebarWidth === 'lg' && 'w-96'
      )}>
        {sidebar}
      </aside>
      <main className="flex-1 min-w-0">
        {main}
      </main>
    </div>
  );
};

export const ThreeColumnLayout: React.FC<{
  leftSidebar?: React.ReactNode;
  main: React.ReactNode;
  rightSidebar?: React.ReactNode;
  className?: string;
}> = ({
  leftSidebar,
  main,
  rightSidebar,
  className
}) => {
  return (
    <div className={cn('flex gap-8', className)}>
      {leftSidebar && (
        <aside className="flex-shrink-0 w-64">
          {leftSidebar}
        </aside>
      )}
      <main className="flex-1 min-w-0">
        {main}
      </main>
      {rightSidebar && (
        <aside className="flex-shrink-0 w-64">
          {rightSidebar}
        </aside>
      )}
    </div>
  );
};

export const CenteredLayout: React.FC<{
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}> = ({
  children,
  maxWidth = 'lg',
  className
}) => {
  return (
    <div className={cn('w-full flex justify-center', className)}>
      <div className={cn(
        'w-full',
        maxWidth === 'sm' && 'max-w-sm',
        maxWidth === 'md' && 'max-w-md',
        maxWidth === 'lg' && 'max-w-lg',
        maxWidth === 'xl' && 'max-w-xl',
        maxWidth === '2xl' && 'max-w-2xl'
      )}>
        {children}
      </div>
    </div>
  );
};
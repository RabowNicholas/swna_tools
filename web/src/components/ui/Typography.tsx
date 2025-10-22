import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'code' | 'pre' | 'a' | 'label';
}

export const Typography = {
  Display: ({ children, className, as: Component = 'h1', ...props }: TypographyProps) => (
    <Component 
      className={cn(
        "text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  ),

  Headline: ({ children, className, as: Component = 'h2', ...props }: TypographyProps) => (
    <Component 
      className={cn(
        "text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground leading-tight tracking-tight",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  ),

  Title: ({ children, className, as: Component = 'h3', ...props }: TypographyProps) => (
    <Component 
      className={cn(
        "text-lg md:text-xl lg:text-2xl font-medium text-foreground leading-snug",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  ),

  Subtitle: ({ children, className, as: Component = 'h4', ...props }: TypographyProps) => (
    <Component 
      className={cn(
        "text-base md:text-lg font-medium text-foreground leading-normal",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  ),

  Body: ({ 
    children, 
    className, 
    size = "default", 
    as: Component = 'p', 
    ...props 
  }: TypographyProps & { size?: 'small' | 'default' | 'large' }) => (
    <Component 
      className={cn(
        "leading-relaxed",
        size === 'large' && "text-base md:text-lg text-foreground",
        size === 'default' && "text-sm md:text-base text-foreground",
        size === 'small' && "text-xs md:text-sm text-muted-foreground",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  ),

  Caption: ({ children, className, as: Component = 'span', ...props }: TypographyProps) => (
    <Component 
      className={cn(
        "text-xs text-muted-foreground leading-normal",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  ),

  Label: ({ children, className, as: Component = 'label', ...props }: TypographyProps) => (
    <Component 
      className={cn(
        "text-sm font-medium text-foreground leading-none",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  ),

  Code: ({ children, className, as: Component = 'code', ...props }: TypographyProps) => (
    <Component 
      className={cn(
        "relative rounded bg-muted px-2 py-1 font-mono text-sm font-semibold text-foreground",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  ),

  Link: ({ 
    children, 
    className, 
    as: Component = 'a', 
    ...props 
  }: TypographyProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <Component 
      className={cn(
        "text-primary underline-offset-4 transition-colors hover:text-primary-hover focus:underline focus:outline-none",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  )
};

// Utility component for consistent text hierarchy
export const TextHierarchy = {
  PageTitle: ({ children, className, ...props }: TypographyProps) => (
    <Typography.Display className={cn("mb-4", className)} {...props}>
      {children}
    </Typography.Display>
  ),

  SectionTitle: ({ children, className, ...props }: TypographyProps) => (
    <Typography.Headline className={cn("mb-6", className)} {...props}>
      {children}
    </Typography.Headline>
  ),

  CardTitle: ({ children, className, ...props }: TypographyProps) => (
    <Typography.Title className={cn("mb-2", className)} {...props}>
      {children}
    </Typography.Title>
  ),

  FormLabel: ({ children, className, required, ...props }: TypographyProps & { required?: boolean }) => (
    <Typography.Label className={cn("mb-2 block", className)} {...props}>
      {children}
      {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
    </Typography.Label>
  ),

  HelperText: ({ children, className, ...props }: TypographyProps) => (
    <Typography.Caption className={cn("mt-1", className)} {...props}>
      {children}
    </Typography.Caption>
  )
};
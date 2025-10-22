'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { Typography } from '@/components/ui/Typography';
import { VStack, HStack } from '@/components/ui/Spacing';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  variant?: 'button' | 'dropdown';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className, 
  variant = 'button' 
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const themes = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: <Sun className="h-4 w-4" />,
      description: 'Light theme'
    },
    {
      value: 'dark' as const,
      label: 'Dark', 
      icon: <Moon className="h-4 w-4" />,
      description: 'Dark theme'
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: <Monitor className="h-4 w-4" />,
      description: 'Follow system preference'
    }
  ];

  if (variant === 'button') {
    const nextTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    const currentIcon = resolvedTheme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
    
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(nextTheme)}
        className={cn('relative', className)}
        aria-label={`Switch to ${nextTheme} mode`}
      >
        {currentIcon}
        <span className="hidden sm:inline ml-2">
          {resolvedTheme === 'light' ? 'Light' : 'Dark'}
        </span>
      </Button>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label="Theme options"
      >
        <HStack size="xs">
          {themes.find(t => t.value === theme)?.icon}
          <span className="hidden sm:inline">Theme</span>
        </HStack>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <Surface
            elevation="overlay"
            padding="sm"
            rounded="lg"
            className="absolute right-0 top-full mt-2 w-48 z-50 border border-border animate-in zoom-in-95 duration-200"
          >
            <VStack size="xs">
              <Typography.Caption className="text-muted-foreground px-2 py-1">
                Choose theme
              </Typography.Caption>
              
              {themes.map((themeOption) => (
                <button
                  key={themeOption.value}
                  onClick={() => {
                    setTheme(themeOption.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2 rounded-md text-left transition-colors',
                    'hover:bg-accent',
                    theme === themeOption.value && 'bg-accent'
                  )}
                >
                  <HStack size="sm">
                    <div className="text-muted-foreground">
                      {themeOption.icon}
                    </div>
                    <VStack size="xs">
                      <Typography.Body size="small">
                        {themeOption.label}
                      </Typography.Body>
                      <Typography.Caption>
                        {themeOption.description}
                      </Typography.Caption>
                    </VStack>
                  </HStack>
                  
                  {theme === themeOption.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </VStack>
          </Surface>
        </>
      )}
    </div>
  );
};

// Compact theme toggle for toolbar/header use
export const CompactThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { resolvedTheme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={cn('h-9 w-9 p-0', className)}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {resolvedTheme === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
};
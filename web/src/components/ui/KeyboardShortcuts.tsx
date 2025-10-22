import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Typography } from './Typography';
import { VStack, HStack } from './Spacing';
import { Surface } from './Surface';
import { Button } from './Button';
import { Command, Search, Keyboard } from 'lucide-react';

// Keyboard shortcut configuration
interface Shortcut {
  id: string;
  key: string;
  modifiers: string[];
  description: string;
  action: () => void;
  category: 'navigation' | 'forms' | 'general' | 'search';
}

interface KeyboardShortcutsProps {
  shortcuts?: Shortcut[];
  className?: string;
}

// Hook for keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
  const router = useRouter();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    const matchedShortcut = shortcuts.find(shortcut => {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const modifiersMatch = shortcut.modifiers.every(modifier => {
        switch (modifier) {
          case 'cmd':
          case 'meta':
            return event.metaKey;
          case 'ctrl':
            return event.ctrlKey;
          case 'alt':
            return event.altKey;
          case 'shift':
            return event.shiftKey;
          default:
            return false;
        }
      });

      return keyMatches && modifiersMatch;
    });

    if (matchedShortcut) {
      event.preventDefault();
      matchedShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Default shortcuts for the application
export const useDefaultShortcuts = () => {
  const router = useRouter();
  
  const shortcuts: Shortcut[] = [
    // Navigation shortcuts
    {
      id: 'home',
      key: 'h',
      modifiers: ['cmd'],
      description: 'Go to home page',
      action: () => router.push('/'),
      category: 'navigation'
    },
    {
      id: 'clients',
      key: 'c',
      modifiers: ['cmd'],
      description: 'Open client manager',
      action: () => router.push('/clients'),
      category: 'navigation'
    },
    
    // Form shortcuts
    {
      id: 'ee3-form',
      key: 'e',
      modifiers: ['cmd'],
      description: 'Create EE-3 form',
      action: () => router.push('/forms/ee3'),
      category: 'forms'
    },
    {
      id: 'invoice',
      key: 'i',
      modifiers: ['cmd'],
      description: 'Generate invoice',
      action: () => router.push('/forms/invoice'),
      category: 'forms'
    },
    
    // General shortcuts
    {
      id: 'search',
      key: 'k',
      modifiers: ['cmd'],
      description: 'Open search',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      category: 'search'
    },
    {
      id: 'help',
      key: '?',
      modifiers: ['shift'],
      description: 'Show keyboard shortcuts',
      action: () => {
        // This will be handled by the ShortcutsPanel component
        const event = new CustomEvent('show-shortcuts');
        window.dispatchEvent(event);
      },
      category: 'general'
    }
  ];

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
};

// Keyboard shortcuts display panel
export const ShortcutsPanel: React.FC<KeyboardShortcutsProps> = ({
  shortcuts,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const defaultShortcuts = useDefaultShortcuts();
  const displayShortcuts = shortcuts || defaultShortcuts;

  useEffect(() => {
    const handleShowShortcuts = () => setIsVisible(true);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVisible(false);
      }
    };

    window.addEventListener('show-shortcuts', handleShowShortcuts);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('show-shortcuts', handleShowShortcuts);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const categorizedShortcuts = displayShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  const formatShortcut = (shortcut: Shortcut) => {
    const modifierSymbols: Record<string, string> = {
      cmd: '⌘',
      meta: '⌘',
      ctrl: '⌃',
      alt: '⌥',
      shift: '⇧'
    };

    const parts = [
      ...shortcut.modifiers.map(mod => modifierSymbols[mod] || mod),
      shortcut.key.toUpperCase()
    ];

    return parts.join('');
  };

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    forms: 'Forms',
    general: 'General',
    search: 'Search'
  };

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className={cn('fixed bottom-4 right-4 z-50', className)}
        icon={<Keyboard className="h-4 w-4" />}
        aria-label="Show keyboard shortcuts"
      >
        <span className="hidden sm:inline">Shortcuts</span>
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={() => setIsVisible(false)}
      />
      
      {/* Panel */}
      <Surface
        elevation="overlay"
        padding="lg"
        rounded="xl"
        className={cn(
          'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          'z-50 w-full max-w-2xl max-h-[80vh] overflow-y-auto',
          'animate-in zoom-in-95 duration-200',
          className
        )}
      >
        <VStack size="lg">
          {/* Header */}
          <div className="flex items-center justify-between">
            <HStack size="sm">
              <Keyboard className="h-6 w-6 text-primary" />
              <Typography.Title>Keyboard Shortcuts</Typography.Title>
            </HStack>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </Button>
          </div>

          {/* Shortcuts by category */}
          <VStack size="xl">
            {Object.entries(categorizedShortcuts).map(([category, shortcuts]) => (
              <VStack size="md" key={category}>
                <Typography.Subtitle className="text-primary">
                  {categoryLabels[category] || category}
                </Typography.Subtitle>
                
                <VStack size="xs">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors"
                    >
                      <Typography.Body size="small">
                        {shortcut.description}
                      </Typography.Body>
                      
                      <div className="flex items-center space-x-1">
                        {formatShortcut(shortcut).split('').map((char, index) => (
                          <kbd
                            key={index}
                            className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded"
                          >
                            {char}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </VStack>
              </VStack>
            ))}
          </VStack>

          {/* Footer */}
          <div className="text-center border-t border-border pt-4">
            <Typography.Caption>
              Press <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded">Esc</kbd> to close
            </Typography.Caption>
          </div>
        </VStack>
      </Surface>
    </>
  );
};

// Inline shortcut hint component
interface ShortcutHintProps {
  shortcut: string;
  className?: string;
}

export const ShortcutHint: React.FC<ShortcutHintProps> = ({
  shortcut,
  className
}) => {
  const formatShortcut = (shortcut: string) => {
    return shortcut.split('+').map((part, index) => (
      <kbd
        key={index}
        className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded"
      >
        {part}
      </kbd>
    ));
  };

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {formatShortcut(shortcut)}
    </div>
  );
};

// Enhanced focus management
export const useFocusManagement = () => {
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return { focusVisible };
};

// Command palette component
interface CommandPaletteProps {
  commands: Array<{
    id: string;
    title: string;
    description?: string;
    action: () => void;
    shortcut?: string;
    icon?: React.ReactNode;
  }>;
  placeholder?: string;
  className?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands,
  placeholder = 'Search commands...',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(query.toLowerCase()) ||
    command.description?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsOpen(true);
      } else if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
      } else if (isOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex(prev => 
            Math.min(prev + 1, filteredCommands.length - 1)
          );
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
            setQuery('');
            setSelectedIndex(0);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Command palette */}
      <Surface
        elevation="overlay"
        rounded="xl"
        className={cn(
          'fixed top-[20%] left-1/2 transform -translate-x-1/2',
          'z-50 w-full max-w-lg',
          'animate-in zoom-in-95 slide-in-from-top-4 duration-200',
          className
        )}
      >
        <VStack size="sm">
          {/* Search input */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
                autoFocus
              />
            </div>
          </div>

          {/* Commands */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Typography.Body size="small">No commands found</Typography.Body>
              </div>
            ) : (
              <VStack size="xs" className="p-2">
                {filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    onClick={() => {
                      command.action();
                      setIsOpen(false);
                      setQuery('');
                      setSelectedIndex(0);
                    }}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-colors',
                      'flex items-center justify-between',
                      index === selectedIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    )}
                  >
                    <HStack size="sm" className="flex-1 min-w-0">
                      {command.icon && (
                        <div className="flex-shrink-0">
                          {command.icon}
                        </div>
                      )}
                      
                      <VStack size="xs" className="flex-1 min-w-0">
                        <Typography.Body size="small" className="font-medium truncate">
                          {command.title}
                        </Typography.Body>
                        {command.description && (
                          <Typography.Caption className="truncate">
                            {command.description}
                          </Typography.Caption>
                        )}
                      </VStack>
                    </HStack>

                    {command.shortcut && (
                      <ShortcutHint shortcut={command.shortcut} />
                    )}
                  </button>
                ))}
              </VStack>
            )}
          </div>
        </VStack>
      </Surface>
    </>
  );
};
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Typography } from './Typography';
import { HStack, VStack } from './Spacing';
import { Surface } from './Surface';
import { Button } from './Button';
import { Navigation } from './Navigation';
import { ShortcutHint } from './KeyboardShortcuts';
import { animations } from './Animations';
import { 
  Search, 
  Bell, 
  User, 
  Settings, 
  ChevronDown,
  Menu,
  Sun,
  Moon,
  Monitor,
  Command
} from 'lucide-react';

interface HeaderAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  dropdown?: {
    items: Array<{
      id: string;
      label: string;
      href?: string;
      onClick?: () => void;
      icon?: React.ReactNode;
      separator?: boolean;
    }>;
  };
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
  logo?: React.ReactNode;
  actions?: HeaderAction[];
  customActions?: React.ReactNode;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  sticky?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'SWNA Tools',
  subtitle,
  logo,
  actions = [],
  customActions,
  searchable = false,
  onSearch,
  className,
  variant = 'default',
  sticky = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const ActionDropdown = ({ action }: { action: HeaderAction }) => {
    const isOpen = activeDropdown === action.id;
    
    return (
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveDropdown(isOpen ? null : action.id)}
          className="relative"
        >
          <HStack size="xs">
            {action.icon}
            <span className="hidden sm:inline">{action.label}</span>
            {action.dropdown && <ChevronDown className="h-4 w-4" />}
          </HStack>
          
          {action.badge && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
              {action.badge}
            </span>
          )}
        </Button>

        {isOpen && action.dropdown && (
          <Surface
            elevation="overlay"
            padding="sm"
            rounded="lg"
            className="absolute right-0 top-full mt-2 w-64 z-50 border border-border animate-fade-in"
          >
            <VStack size="xs">
              {action.dropdown.items.map((item, index) => (
                <React.Fragment key={item.id}>
                  {item.separator && index > 0 && (
                    <hr className="border-border my-1" />
                  )}
                  
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                      onClick={() => setActiveDropdown(null)}
                    >
                      {item.icon && (
                        <div className="h-4 w-4 text-muted-foreground">
                          {item.icon}
                        </div>
                      )}
                      <Typography.Body size="small">
                        {item.label}
                      </Typography.Body>
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        item.onClick?.();
                        setActiveDropdown(null);
                      }}
                      className="flex items-center space-x-3 w-full px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
                    >
                      {item.icon && (
                        <div className="h-4 w-4 text-muted-foreground">
                          {item.icon}
                        </div>
                      )}
                      <Typography.Body size="small">
                        {item.label}
                      </Typography.Body>
                    </button>
                  )}
                </React.Fragment>
              ))}
            </VStack>
          </Surface>
        )}
      </div>
    );
  };

  const SearchBar = () => (
    <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className={cn(
            'w-full pl-10 pr-16 py-2 rounded-lg border border-border',
            'bg-background text-foreground placeholder-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'transition-all duration-200',
            animations.smooth
          )}
        />
        {/* Command-K hint */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <ShortcutHint shortcut="⌘+K" className="text-muted-foreground opacity-60" />
        </div>
      </div>
    </form>
  );

  return (
    <header className={cn(
      'w-full z-40 transition-all duration-200',
      sticky && 'sticky top-0',
      className
    )}>
      <Surface 
        elevation="raised" 
        className="border-b border-border backdrop-blur-md bg-background/95"
      >
        <div className="container mx-auto px-4">
          <HStack size="md" className="justify-between py-3">
            {/* Left Section - Logo & Title */}
            <HStack size="md" className="flex-1 min-w-0">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={cn("md:hidden", animations.hoverScale)}
                icon={<Menu className="h-5 w-5" />}
                aria-label="Toggle menu"
              />

              {logo && (
                <div className="flex-shrink-0">
                  {logo}
                </div>
              )}

              <VStack size="xs" className="min-w-0">
                <Link href="/" className={cn("hover:opacity-80 transition-opacity", animations.smooth)}>
                  <Typography.Title className={cn(
                    'truncate',
                    variant === 'compact' && 'text-lg',
                    variant === 'detailed' && 'text-xl'
                  )}>
                    {title}
                  </Typography.Title>
                </Link>
                
                {subtitle && variant !== 'compact' && (
                  <Typography.Caption className="truncate">
                    {subtitle}
                  </Typography.Caption>
                )}
              </VStack>
            </HStack>

            {/* Center Section - Search */}
            {searchable && (
              <div className="hidden md:flex flex-1 justify-center max-w-lg">
                <SearchBar />
              </div>
            )}

            {/* Right Section - Actions */}
            <HStack size="sm" className="flex-shrink-0">
              {/* Search on mobile */}
              {searchable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  icon={<Search className="h-5 w-5" />}
                  aria-label="Search"
                />
              )}

              {/* Actions */}
              {actions.map((action) => (
                <div key={action.id}>
                  {action.dropdown ? (
                    <ActionDropdown action={action} />
                  ) : action.href ? (
                    <Link href={action.href}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="relative"
                      >
                        <HStack size="xs">
                          {action.icon}
                          <span className="hidden sm:inline">{action.label}</span>
                        </HStack>
                        
                        {action.badge && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                            {action.badge}
                          </span>
                        )}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={action.onClick}
                      className="relative"
                    >
                      <HStack size="xs">
                        {action.icon}
                        <span className="hidden sm:inline">{action.label}</span>
                      </HStack>
                      
                      {action.badge && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                          {action.badge}
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              ))}
              
              {/* Custom Actions */}
              {customActions}
            </HStack>
          </HStack>

          {/* Mobile Search Bar */}
          {searchable && (
            <div className="md:hidden pb-3">
              <SearchBar />
            </div>
          )}
        </div>
      </Surface>
    </header>
  );
};

// Application Shell Component
interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  header,
  sidebar,
  footer,
  className
}) => {
  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      {header}
      
      <div className="flex flex-1">
        {sidebar && (
          <aside className="hidden lg:block flex-shrink-0">
            {sidebar}
          </aside>
        )}
        
        <main className="flex-1 overflow-x-auto">
          {children}
        </main>
      </div>
      
      {footer}
    </div>
  );
};

// Quick Actions Component
interface QuickAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  shortcut?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  title = 'Quick Actions',
  columns = 3,
  className
}) => {
  return (
    <Surface elevation="raised" padding="lg" rounded="lg" className={className}>
      <VStack size="lg">
        <Typography.Title>{title}</Typography.Title>
        
        <div className={cn(
          'grid gap-4',
          columns === 2 && 'grid-cols-1 sm:grid-cols-2',
          columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
          columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        )}>
          {actions.map((action) => {
            if (action.href) {
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className={cn(
                    'group relative p-4 rounded-lg border border-border',
                    'hover:border-primary hover:bg-accent/50 transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'text-left'
                  )}
                >
                  <VStack size="sm">
                    <HStack size="sm" className="items-start justify-between">
                      <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {action.icon}
                      </div>
                      
                      {action.shortcut && (
                        <Typography.Caption className="text-muted-foreground">
                          {action.shortcut}
                        </Typography.Caption>
                      )}
                    </HStack>
                    
                    <VStack size="xs">
                      <Typography.Subtitle className="group-hover:text-primary transition-colors">
                        {action.title}
                      </Typography.Subtitle>
                      
                      {action.description && (
                        <Typography.Body size="small" className="text-muted-foreground line-clamp-2">
                          {action.description}
                        </Typography.Body>
                      )}
                    </VStack>
                  </VStack>
                </Link>
              );
            } else {
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={cn(
                    'group relative p-4 rounded-lg border border-border',
                    'hover:border-primary hover:bg-accent/50 transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'text-left'
                  )}
                >
                  <VStack size="sm">
                    <HStack size="sm" className="items-start justify-between">
                      <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {action.icon}
                      </div>
                      
                      {action.shortcut && (
                        <Typography.Caption className="text-muted-foreground">
                          {action.shortcut}
                        </Typography.Caption>
                      )}
                    </HStack>
                    
                    <VStack size="xs">
                      <Typography.Subtitle className="group-hover:text-primary transition-colors">
                        {action.title}
                      </Typography.Subtitle>
                      
                      {action.description && (
                        <Typography.Body size="small" className="text-muted-foreground line-clamp-2">
                          {action.description}
                        </Typography.Body>
                      )}
                    </VStack>
                  </VStack>
                </button>
              );
            }
          })}
        </div>
      </VStack>
    </Surface>
  );
};
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Typography } from './Typography';
import { HStack, VStack } from './Spacing';
import { Surface } from './Surface';
import { Button } from './Button';
import { 
  ChevronDown, 
  ChevronRight, 
  Home, 
  FileText, 
  Users, 
  Settings,
  Menu,
  X
} from 'lucide-react';

interface NavItem {
  id: string;
  title: string;
  href?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  badge?: string | number;
  description?: string;
}

interface NavigationProps {
  items: NavItem[];
  variant?: 'sidebar' | 'horizontal' | 'mobile';
  showIcons?: boolean;
  collapsible?: boolean;
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  items,
  variant = 'sidebar',
  showIcons = true,
  collapsible = false,
  className
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (item: NavItem): boolean => {
    if (item.href === pathname) return true;
    if (item.children) {
      return item.children.some(child => isActive(child));
    }
    return false;
  };

  const isChildActive = (item: NavItem): boolean => {
    return item.children?.some(child => isActive(child)) || false;
  };

  const NavItemComponent = ({ 
    item, 
    level = 0,
    isChild = false 
  }: { 
    item: NavItem; 
    level?: number;
    isChild?: boolean;
  }) => {
    const active = isActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const expanded = expandedItems.has(item.id);
    const childActive = isChildActive(item);

    const ItemContent = () => (
      <HStack size="sm" className={cn(
        'items-center flex-1 min-w-0',
        level > 0 && 'ml-4'
      )}>
        {showIcons && item.icon && (
          <div className={cn(
            'flex-shrink-0 transition-colors',
            active ? 'text-primary' : 'text-muted-foreground',
            variant === 'horizontal' && 'h-5 w-5',
            variant === 'sidebar' && 'h-4 w-4'
          )}>
            {item.icon}
          </div>
        )}
        
        <VStack size="xs" className="flex-1 min-w-0">
          <Typography.Label className={cn(
            'transition-colors truncate',
            active && 'text-primary font-semibold',
            childActive && !active && 'text-foreground font-medium',
            !active && !childActive && 'text-muted-foreground',
            variant === 'horizontal' && 'text-sm'
          )}>
            {item.title}
          </Typography.Label>
          
          {item.description && variant === 'sidebar' && !isChild && (
            <Typography.Caption className="truncate">
              {item.description}
            </Typography.Caption>
          )}
        </VStack>

        {item.badge && (
          <div className={cn(
            'flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium',
            active 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          )}>
            {item.badge}
          </div>
        )}

        {hasChildren && (
          <div className={cn(
            'flex-shrink-0 transition-transform duration-200',
            expanded && 'rotate-90'
          )}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </HStack>
    );

    const ItemWrapper = ({ children }: { children: React.ReactNode }) => {
      const baseClasses = cn(
        'block w-full text-left transition-all duration-200',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-primary/10 text-primary border-r-2 border-primary',
        variant === 'horizontal' && 'px-3 py-2 rounded-md',
        variant === 'sidebar' && 'px-3 py-2 rounded-lg mx-2',
        variant === 'mobile' && 'px-4 py-3 border-b border-border'
      );

      if (item.href && !hasChildren) {
        return (
          <Link href={item.href} className={baseClasses}>
            {children}
          </Link>
        );
      }

      return (
        <button 
          className={baseClasses}
          onClick={() => hasChildren && toggleExpanded(item.id)}
        >
          {children}
        </button>
      );
    };

    return (
      <div className="w-full">
        <ItemWrapper>
          <ItemContent />
        </ItemWrapper>

        {hasChildren && expanded && (
          <VStack size="xs" className={cn(
            'mt-1 overflow-hidden',
            variant === 'sidebar' && 'ml-2'
          )}>
            {item.children!.map((child) => (
              <NavItemComponent 
                key={child.id} 
                item={child} 
                level={level + 1}
                isChild={true}
              />
            ))}
          </VStack>
        )}
      </div>
    );
  };

  // Mobile Navigation
  if (variant === 'mobile') {
    return (
      <>
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden"
          icon={mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          aria-label="Toggle navigation menu"
        >
          Menu
        </Button>

        {/* Mobile Navigation Overlay */}
        {mobileOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <Surface
              elevation="overlay"
              className={cn(
                'fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 md:hidden',
                'border-r border-border overflow-y-auto',
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
              )}
            >
              <VStack size="md" className="p-4">
                <div className="flex items-center justify-between">
                  <Typography.Title>Navigation</Typography.Title>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileOpen(false)}
                    icon={<X className="h-5 w-5" />}
                  />
                </div>
                
                <nav className="flex-1">
                  <VStack size="xs">
                    {items.map((item) => (
                      <NavItemComponent key={item.id} item={item} />
                    ))}
                  </VStack>
                </nav>
              </VStack>
            </Surface>
          </>
        )}
      </>
    );
  }

  // Horizontal Navigation
  if (variant === 'horizontal') {
    return (
      <nav className={cn('w-full', className)}>
        <Surface elevation="raised" className="border-b border-border">
          <HStack size="sm" className="px-6 py-2 overflow-x-auto">
            {items.map((item) => (
              <NavItemComponent key={item.id} item={item} />
            ))}
          </HStack>
        </Surface>
      </nav>
    );
  }

  // Sidebar Navigation (default)
  return (
    <nav className={cn(
      'h-full flex flex-col',
      collapsible ? 'w-64' : 'w-64',
      className
    )}>
      <Surface elevation="raised" className="flex-1 border-r border-border">
        <VStack size="md" className="p-4 h-full">
          <Typography.Title>Navigation</Typography.Title>
          
          <div className="flex-1 overflow-y-auto">
            <VStack size="xs">
              {items.map((item) => (
                <NavItemComponent key={item.id} item={item} />
              ))}
            </VStack>
          </div>
        </VStack>
      </Surface>
    </nav>
  );
};

// Breadcrumb Navigation Component
interface BreadcrumbItem {
  title: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.title}
            </Link>
          ) : (
            <Typography.Body size="small" className={cn(
              index === items.length - 1 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground'
            )}>
              {item.title}
            </Typography.Body>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Tab Navigation Component
interface TabItem {
  id: string;
  title: string;
  content?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onTabChange,
  variant = 'default',
  className
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className={cn(
        'flex space-x-1',
        variant === 'default' && 'border-b border-border',
        variant === 'pills' && 'bg-muted p-1 rounded-lg',
        variant === 'underline' && 'space-x-6'
      )}>
        {items.map((item) => {
          const isActive = item.id === activeTab;
          
          return (
            <button
              key={item.id}
              onClick={() => !item.disabled && onTabChange(item.id)}
              disabled={item.disabled}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                
                // Default variant
                variant === 'default' && [
                  'border-b-2 -mb-px',
                  isActive 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                ],
                
                // Pills variant
                variant === 'pills' && [
                  'rounded-md',
                  isActive 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                ],
                
                // Underline variant
                variant === 'underline' && [
                  'border-b-2 pb-2',
                  isActive 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                ],
                
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <HStack size="xs">
                <span>{item.title}</span>
                {item.badge && (
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs',
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {item.badge}
                  </span>
                )}
              </HStack>
            </button>
          );
        })}
      </div>
      
      {/* Tab Content */}
      <div className="mt-4">
        {items.find(item => item.id === activeTab)?.content}
      </div>
    </div>
  );
};
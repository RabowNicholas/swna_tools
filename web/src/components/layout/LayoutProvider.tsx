'use client';

import { usePathname } from 'next/navigation';
import { Navigation, Breadcrumb } from '@/components/ui/Navigation';
import { AppShell, Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { ShortcutsPanel, useDefaultShortcuts, CommandPalette } from '@/components/ui/KeyboardShortcuts';
import { AnimationStyles } from '@/components/ui/Animations';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { 
  Home, 
  FileText, 
  Users, 
  Settings,
  Heart,
  BarChart3
} from 'lucide-react';

interface LayoutProviderProps {
  children: React.ReactNode;
}

// Navigation items configuration
const navigationItems = [
  {
    id: 'home',
    title: 'Home',
    href: '/',
    icon: <Home className="h-4 w-4" />,
    description: 'Dashboard and overview'
  },
  {
    id: 'forms',
    title: 'Forms',
    icon: <FileText className="h-4 w-4" />,
    description: 'Document generation tools',
    children: [
      {
        id: 'ee3',
        title: 'EE-3 Form',
        href: '/forms/ee3',
        description: 'Employment form EE-3'
      },
      {
        id: 'ee1',
        title: 'EE-1 Form', 
        href: '/forms/ee1',
        description: 'Employment form EE-1'
      },
      {
        id: 'ee1a',
        title: 'EE-1a Form',
        href: '/forms/ee1a', 
        description: 'Employment form EE-1a'
      },
      {
        id: 'ee10',
        title: 'EE-10 Form',
        href: '/forms/ee10',
        description: 'Employment form EE-10'
      },
      {
        id: 'en16',
        title: 'EN-16 Form',
        href: '/forms/en16',
        description: 'Employment form EN-16'
      }
    ]
  },
  {
    id: 'letters',
    title: 'DOL Letters',
    icon: <FileText className="h-4 w-4" />,
    description: 'Department correspondence',
    children: [
      {
        id: 'withdrawal',
        title: 'Withdrawal Letter',
        href: '/forms/withdrawal',
        description: 'Claim withdrawal letter'
      },
      {
        id: 'address-change',
        title: 'Address Change',
        href: '/forms/address-change',
        description: 'Address change notification'
      },
      {
        id: 'ir-notice',
        title: 'IR Schedule Notice',
        href: '/forms/ir-notice',
        description: 'Independent review notice'
      }
    ]
  },
  {
    id: 'medical',
    title: 'Medical',
    icon: <Heart className="h-4 w-4" />,
    description: 'Medical documentation',
    children: [
      {
        id: 'desert-pulm',
        title: 'Desert Pulmonary',
        href: '/forms/desert-pulm',
        description: 'Medical referral documentation'
      }
    ]
  },
  {
    id: 'billing',
    title: 'Billing',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Financial tools',
    children: [
      {
        id: 'invoice',
        title: 'Invoice Generator',
        href: '/forms/invoice',
        description: 'Professional billing and invoicing'
      }
    ]
  },
  {
    id: 'clients',
    title: 'Client Manager',
    href: '/clients',
    icon: <Users className="h-4 w-4" />,
    description: 'Manage client data and records'
  }
];

// Header actions configuration - now includes theme toggle
const headerActions: Array<{
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
}> = [];

// Helper function to generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ title: string; href?: string }> = [];

  // Define route mappings for better labels
  const routeLabels: Record<string, string> = {
    'ee3': 'EE-3 Form',
    'invoice': 'Invoice Generator',
    'desert-pulm': 'Desert Pulmonary Referral',
    'withdrawal': 'Withdrawal Letter',
    'ee1': 'EE-1 Form',
    'ee1a': 'EE-1a Form',
    'ee10': 'EE-10 Form',
    'en16': 'EN-16 Form',
    'address-change': 'Address Change Letter',
    'ir-notice': 'IR Schedule Notice',
    'clients': 'Client Manager',
  };

  // Routes that don't have actual pages (skip in breadcrumbs)
  const skipRoutes = new Set(['forms']);

  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    
    // Skip intermediary routes that don't have actual pages
    if (skipRoutes.has(segment) && !isLast) {
      return;
    }
    
    breadcrumbs.push({
      title: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: isLast ? undefined : currentPath
    });
  });

  return breadcrumbs;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Initialize keyboard shortcuts
  const shortcuts = useDefaultShortcuts();

  const handleSearch = (query: string) => {
    console.log('Search:', query);
    // Implement search functionality
  };

  // Command palette commands
  const commandPaletteCommands = [
    {
      id: 'home',
      title: 'Go to Home',
      description: 'Navigate to the dashboard',
      action: () => window.location.href = '/',
      shortcut: '⌘+H',
      icon: <Home className="h-4 w-4" />
    },
    {
      id: 'clients',
      title: 'Client Manager',
      description: 'View and manage client data',
      action: () => window.location.href = '/clients',
      shortcut: '⌘+C',
      icon: <Users className="h-4 w-4" />
    },
    {
      id: 'ee3',
      title: 'Create EE-3 Form',
      description: 'Generate employment eligibility form',
      action: () => window.location.href = '/forms/ee3',
      shortcut: '⌘+E',
      icon: <FileText className="h-4 w-4" />
    },
    {
      id: 'invoice',
      title: 'Generate Invoice',
      description: 'Create professional billing invoice',
      action: () => window.location.href = '/forms/invoice',
      shortcut: '⌘+I',
      icon: <BarChart3 className="h-4 w-4" />
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure application preferences',
      action: () => window.location.href = '/settings',
      shortcut: '⌘+,',
      icon: <Settings className="h-4 w-4" />
    }
  ];

  return (
    <>
      {/* Global animation styles */}
      <AnimationStyles />
      
      {/* Keyboard shortcuts panel */}
      <ShortcutsPanel shortcuts={shortcuts} />
      
      {/* Command palette */}
      <CommandPalette commands={commandPaletteCommands} />
      
      <AppShell
        header={
          <Header
            title="SWNA Tools"
            actions={headerActions}
            searchable={true}
            onSearch={handleSearch}
            variant="default"
            customActions={<ThemeToggle variant="dropdown" />}
          />
        }
        sidebar={
          <Navigation
            items={navigationItems}
            variant="sidebar"
            showIcons={true}
            collapsible={false}
          />
        }
        footer={
          <footer className="bg-background border-t border-border">
            <div className="container mx-auto px-6 py-4">
              <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-bold">S</span>
                  </div>
                  <span>SWNA Tools</span>
                  <span>•</span>
                  <span>Internal Team Dashboard</span>
                </div>
                <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                  <span className="inline-flex items-center text-success">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All Systems Online
                  </span>
                </div>
              </div>
            </div>
          </footer>
        }
      >
        <div className="container mx-auto px-6 py-6">
          {/* Skip to content link for accessibility */}
          <a
            href="#main-content"
            className="skip-link"
          >
            Skip to main content
          </a>
          
          {/* Breadcrumbs for non-home pages */}
          {!isHomePage && breadcrumbs.length > 0 && (
            <div className="mb-6">
              <Breadcrumb items={breadcrumbs} />
            </div>
          )}
          
          {/* Main content */}
          <main 
            id="main-content"
            role="main"
            aria-label="Main content"
          >
            {children}
          </main>
        </div>
      </AppShell>
    </>
  );
}
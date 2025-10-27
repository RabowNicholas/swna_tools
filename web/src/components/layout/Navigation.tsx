import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Menu, 
  X, 
  FileText, 
  Users, 
  DollarSign, 
  Mail, 
  Building,
  Home,
  Briefcase,
  Stethoscope,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserButton } from '@/components/auth/UserButton';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description?: string;
}

interface NavigationCategory {
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items: NavigationItem[];
}

const dashboardItem: NavigationItem = {
  name: 'Dashboard', 
  href: '/', 
  icon: Home, 
  description: 'Overview of all tools'
};

const navigationCategories: NavigationCategory[] = [
  {
    name: 'Forms',
    icon: Briefcase,
    items: [
      { name: 'EE-3 Form', href: '/forms/ee3', icon: FileText, description: 'Employee employment history' },
      { name: 'EE-1 Form', href: '/forms/ee1', icon: FileText, description: 'Initial employment form' },
      { name: 'EE-1a Form', href: '/forms/ee1a', icon: FileText, description: 'Supplemental employment form' },
      { name: 'EE-10 Form', href: '/forms/ee10', icon: FileText, description: 'Employment verification form' },
      { name: 'EN-16 Form', href: '/forms/en16', icon: FileText, description: 'Energy notification form' },
    ]
  },
  {
    name: 'DOL Letters',
    icon: Mail,
    items: [
      { name: 'Withdrawal Letter', href: '/forms/withdrawal', icon: Mail, description: 'Case withdrawal documentation' },
      { name: 'Address Change Letter', href: '/forms/address-change', icon: Building, description: 'Address modification notification' },
      { name: 'IR Notice La Plata', href: '/forms/ir-notice', icon: FileText, description: 'Independent review notice' },
    ]
  },
  {
    name: 'Medical',
    icon: Stethoscope,
    items: [
      { name: 'Desert Pulmonary Referral', href: '/forms/desert-pulm', icon: FileText, description: 'Medical referral documentation' },
    ]
  },
  {
    name: 'Billing',
    icon: CreditCard,
    items: [
      { name: 'Invoice Generator', href: '/forms/invoice', icon: DollarSign, description: 'Professional billing and invoicing' },
    ]
  },
  {
    name: 'Client Management',
    icon: Users,
    items: [
      { name: 'Client Manager', href: '/clients', icon: Users, description: 'View and manage client data' },
    ]
  },
];

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        >
          <div className="fixed inset-0 bg-black/20" aria-hidden="true" />
        </div>
      )}

      {/* Sidebar */}
      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-border">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-foreground">SWNA Tools</span>
            </Link>
            
            {/* Close button for mobile */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-2"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation items */}
          <div className="flex-1 overflow-y-auto py-6">
            <div className="px-3 space-y-6">
              {/* Dashboard */}
              <div>
                {(() => {
                  const Icon = dashboardItem.icon;
                  const isActive = pathname === dashboardItem.href;
                  
                  return (
                    <Link
                      href={dashboardItem.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        isActive
                          ? "bg-accent text-accent-foreground border border-border"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon
                        className={cn(
                          "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{dashboardItem.name}</div>
                        {dashboardItem.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {dashboardItem.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })()}
              </div>

              {/* Categories */}
              {navigationCategories.map((category) => {
                const CategoryIcon = category.icon;
                return (
                  <div key={category.name}>
                    {/* Category header */}
                    <div className="flex items-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <CategoryIcon className="mr-2 h-4 w-4" />
                      {category.name}
                    </div>
                    
                    {/* Category items */}
                    <div className="mt-2 space-y-1">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ml-6",
                              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                              isActive
                                ? "bg-accent text-accent-foreground border border-border"
                                : "text-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <Icon
                              className={cn(
                                "mr-3 h-4 w-4 flex-shrink-0 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border p-6 space-y-4">
            {/* User Button */}
            <div className="flex justify-center">
              <UserButton />
            </div>

            {/* Theme toggle */}
            <div className="flex justify-center">
              <ThemeToggle />
            </div>

            {/* Copyright */}
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <div>© 2024 SWNA Tools</div>
              <div>Legal Document Management</div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
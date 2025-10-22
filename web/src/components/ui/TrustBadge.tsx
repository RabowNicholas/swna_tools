import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Shield, Lock, CheckCircle, Award, Zap, Globe } from 'lucide-react';

interface TrustBadgeProps extends HTMLAttributes<HTMLDivElement> {
  type: 'security' | 'compliance' | 'verified' | 'certified' | 'performance' | 'global';
  label: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

const badgeConfig = {
  security: {
    icon: Shield,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20'
  },
  compliance: {
    icon: Lock,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20'
  },
  verified: {
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20'
  },
  certified: {
    icon: Award,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20'
  },
  performance: {
    icon: Zap,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20'
  },
  global: {
    icon: Globe,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20'
  }
};

const TrustBadge = forwardRef<HTMLDivElement, TrustBadgeProps>(
  ({ className, type, label, description, size = 'md', ...props }, ref) => {
    const config = badgeConfig[type];
    const Icon = config.icon;
    
    return (
      <div
        ref={ref}
        role="img"
        aria-label={`Trust indicator: ${label}${description ? ` - ${description}` : ''}`}
        className={cn(
          "inline-flex items-center rounded-lg border transition-all duration-200",
          config.bgColor,
          config.borderColor,
          
          // Size variants
          size === 'sm' && "px-3 py-2 gap-2",
          size === 'md' && "px-4 py-3 gap-3", 
          size === 'lg' && "px-6 py-4 gap-4",
          
          className
        )}
        {...props}
      >
        <Icon 
          className={cn(
            config.color,
            size === 'sm' && "h-4 w-4",
            size === 'md' && "h-5 w-5",
            size === 'lg' && "h-6 w-6"
          )} 
        />
        <div className="flex flex-col">
          <span 
            className={cn(
              "font-medium text-foreground",
              size === 'sm' && "text-xs",
              size === 'md' && "text-sm",
              size === 'lg' && "text-base"
            )}
          >
            {label}
          </span>
          {description && (
            <span 
              className={cn(
                "text-muted-foreground",
                size === 'sm' && "text-xs",
                size === 'md' && "text-xs",
                size === 'lg' && "text-sm"
              )}
            >
              {description}
            </span>
          )}
        </div>
      </div>
    );
  }
);

TrustBadge.displayName = 'TrustBadge';

export { TrustBadge };
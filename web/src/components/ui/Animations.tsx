import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Animation utility classes following Apple HIG motion principles
export const animations = {
  // Entrance animations
  fadeIn: 'animate-in fade-in duration-300 ease-out',
  slideInFromLeft: 'animate-in slide-in-from-left-4 duration-300 ease-out',
  slideInFromRight: 'animate-in slide-in-from-right-4 duration-300 ease-out',
  slideInFromTop: 'animate-in slide-in-from-top-4 duration-300 ease-out',
  slideInFromBottom: 'animate-in slide-in-from-bottom-4 duration-300 ease-out',
  scaleIn: 'animate-in zoom-in-95 duration-200 ease-out',
  
  // Exit animations
  fadeOut: 'animate-out fade-out duration-200 ease-in',
  slideOutToLeft: 'animate-out slide-out-to-left-4 duration-200 ease-in',
  slideOutToRight: 'animate-out slide-out-to-right-4 duration-200 ease-in',
  slideOutToTop: 'animate-out slide-out-to-top-4 duration-200 ease-in',
  slideOutToBottom: 'animate-out slide-out-to-bottom-4 duration-200 ease-in',
  scaleOut: 'animate-out zoom-out-95 duration-150 ease-in',
  
  // Hover animations
  hoverScale: 'transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]',
  hoverLift: 'transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg',
  hoverGlow: 'transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  
  // Loading animations
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  
  // Smooth transitions
  smooth: 'transition-all duration-200 ease-out',
  smoothSlow: 'transition-all duration-300 ease-out',
  smoothFast: 'transition-all duration-150 ease-out',
};

// Animated container component
interface AnimatedContainerProps {
  children: React.ReactNode;
  animation?: keyof typeof animations;
  delay?: number;
  className?: string;
  trigger?: 'mount' | 'hover' | 'focus' | 'inView';
}

export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  className,
  trigger = 'mount'
}) => {
  const [isVisible, setIsVisible] = useState(trigger === 'mount');
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger === 'inView') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasAnimated) {
            setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, delay);
          }
        },
        { threshold: 0.1 }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return () => observer.disconnect();
    }
  }, [trigger, delay, hasAnimated]);

  useEffect(() => {
    if (trigger === 'mount' && delay > 0) {
      const timer = setTimeout(() => setIsVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [trigger, delay]);

  const handleMouseEnter = () => {
    if (trigger === 'hover') setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') setIsVisible(false);
  };

  const handleFocus = () => {
    if (trigger === 'focus') setIsVisible(true);
  };

  const handleBlur = () => {
    if (trigger === 'focus') setIsVisible(false);
  };

  return (
    <div
      ref={ref}
      className={cn(
        isVisible && animations[animation],
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </div>
  );
};

// Staggered animation container
interface StaggeredContainerProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  baseAnimation?: keyof typeof animations;
  className?: string;
}

export const StaggeredContainer: React.FC<StaggeredContainerProps> = ({
  children,
  staggerDelay = 100,
  baseAnimation = 'fadeIn',
  className
}) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <AnimatedContainer
          key={index}
          animation={baseAnimation}
          delay={index * staggerDelay}
          trigger="inView"
        >
          {child}
        </AnimatedContainer>
      ))}
    </div>
  );
};

// Hover card with sophisticated interactions
interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  className,
  glowColor = 'rgba(59,130,246,0.3)',
  onClick,
  disabled = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current || disabled) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => {
    if (!disabled) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!disabled) setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative overflow-hidden rounded-lg transition-all duration-300',
        !disabled && 'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={disabled ? undefined : onClick}
      style={{
        transform: isHovered && !disabled 
          ? `perspective(1000px) rotateX(${(mousePosition.y - 150) / 20}deg) rotateY(${(mousePosition.x - 150) / 20}deg) translateZ(10px)`
          : 'none',
        boxShadow: isHovered && !disabled 
          ? `0 20px 40px ${glowColor}, 0 0 0 1px rgba(255,255,255,0.1)`
          : 'none'
      }}
    >
      {/* Gradient overlay on hover */}
      {isHovered && !disabled && (
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor} 0%, transparent 50%)`
          }}
        />
      )}
      
      {children}
    </div>
  );
};

// Loading shimmer effect
interface ShimmerProps {
  className?: string;
  children?: React.ReactNode;
}

export const Shimmer: React.FC<ShimmerProps> = ({ className, children }) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
    </div>
  );
};

// Morphing button with state transitions
interface MorphingButtonProps {
  children: React.ReactNode;
  states: {
    default: React.ReactNode;
    loading?: React.ReactNode;
    success?: React.ReactNode;
    error?: React.ReactNode;
  };
  currentState: 'default' | 'loading' | 'success' | 'error';
  onClick?: () => void;
  className?: string;
}

export const MorphingButton: React.FC<MorphingButtonProps> = ({
  children,
  states,
  currentState,
  onClick,
  className
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayState, setDisplayState] = useState(currentState);

  useEffect(() => {
    if (currentState !== displayState) {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setDisplayState(currentState);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentState, displayState]);

  const getStateColors = () => {
    switch (displayState) {
      case 'loading':
        return 'bg-primary text-primary-foreground';
      case 'success':
        return 'bg-success text-success-foreground';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary-hover';
    }
  };

  return (
    <button
      onClick={displayState === 'default' ? onClick : undefined}
      className={cn(
        'relative overflow-hidden rounded-lg px-6 py-3 font-medium transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        getStateColors(),
        isTransitioning && 'scale-95',
        className
      )}
      disabled={displayState !== 'default'}
    >
      <div className={cn(
        'flex items-center justify-center space-x-2 transition-opacity duration-150',
        isTransitioning ? 'opacity-0' : 'opacity-100'
      )}>
        {states[displayState] || states.default}
      </div>
      
      {/* Ripple effect on click */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-white/20 scale-0 rounded-full transition-transform duration-300 group-active:scale-150" />
      </div>
    </button>
  );
};

// Progressive disclosure with smooth animations
interface ProgressiveDisclosureProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  className?: string;
}

export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  children,
  trigger,
  expanded = false,
  onToggle,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, children]);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  return (
    <div className={className}>
      <div onClick={handleToggle} className="cursor-pointer">
        {trigger}
      </div>
      
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ height: `${height}px` }}
      >
        <div ref={contentRef} className="pt-2">
          {children}
        </div>
      </div>
    </div>
  );
};

// Custom CSS for additional animations
export const AnimationStyles = () => (
  <style>{`
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
      50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
    }
    
    .animate-float {
      animation: float 3s ease-in-out infinite;
    }
    
    .animate-glow {
      animation: glow 2s ease-in-out infinite;
    }
    
    /* Smooth focus transitions */
    .focus-ring {
      transition: box-shadow 0.2s ease-out;
    }
    
    .focus-ring:focus-visible {
      box-shadow: 0 0 0 2px var(--ring);
    }
    
    /* Parallax scroll effect */
    .parallax {
      transform-style: preserve-3d;
    }
    
    .parallax-layer {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }
    
    /* Enhanced hover states */
    .hover-lift {
      transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
    }
    
    .hover-lift:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }
    
    /* Sophisticated button interactions */
    .button-magnetic {
      transition: transform 0.2s ease-out;
    }
    
    .button-magnetic:hover {
      transform: scale(1.05);
    }
    
    .button-magnetic:active {
      transform: scale(0.95);
    }
  `}</style>
);
import React from 'react';
import { cn } from '../../utils/cn';

const PageTransition = ({ 
  children, 
  className = '', 
  variant = 'fade',
  duration = 'duration-500'
}) => {
  const variants = {
    fade: 'animate-in fade-in',
    slideUp: 'animate-in slide-in-from-bottom-4 fade-in',
    slideDown: 'animate-in slide-in-from-top-4 fade-in',
    slideLeft: 'animate-in slide-in-from-right-4 fade-in',
    slideRight: 'animate-in slide-in-from-left-4 fade-in',
    zoom: 'animate-in zoom-in-95 fade-in',
    bounce: 'animate-in zoom-in-95 fade-in'
  };

  return (
    <div className={cn(
      variants[variant],
      duration,
      'ease-out',
      className
    )}>
      {children}
    </div>
  );
};

const StaggeredAnimation = ({ children, delay = 100 }) => {
  return (
    <div className="space-y-2">
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="animate-in slide-in-from-left-4 fade-in duration-500 ease-out"
          style={{ animationDelay: `${index * delay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

const FadeInSection = ({ children, className = '', delay = 0 }) => {
  return (
    <div 
      className={cn(
        'animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export { PageTransition, StaggeredAnimation, FadeInSection };
import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-sm font-medium transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:transform-none touch-manipulation',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg focus:ring-blue-500',
        primary: 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg focus:ring-blue-500',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 hover:shadow-lg focus:ring-gray-500',
        success: 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg focus:ring-green-500',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 hover:shadow-lg focus:ring-yellow-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg focus:ring-red-500',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md focus:ring-blue-500',
        ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500',
        link: 'text-blue-600 underline-offset-4 hover:underline hover:text-blue-700 focus:ring-blue-500',
      },
      size: {
        xs: 'h-7 px-2 py-1 text-xs sm:h-8 sm:px-2 sm:py-1',
        sm: 'h-8 px-2 py-1 text-xs sm:h-9 sm:px-3 sm:py-2 sm:text-sm',
        default: 'h-9 px-3 py-2 text-sm sm:h-10 sm:px-4 sm:py-2 sm:text-base',
        lg: 'h-10 px-4 py-2 text-sm sm:h-11 sm:px-6 sm:py-3 sm:text-base',
        icon: 'h-8 w-8 p-1 sm:h-10 sm:w-10 sm:p-2',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = 'Button';

export { Button, buttonVariants };
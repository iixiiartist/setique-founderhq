import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'flat';

export interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

// Modern design: Rounded corners, soft shadows, light borders
const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-gray-200 shadow-sm rounded-2xl',
  elevated: 'bg-white border border-gray-100 shadow-lg rounded-2xl',
  flat: 'bg-gray-50 border border-gray-100 rounded-2xl',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  variant = 'default',
  children,
  className = '',
  padding = 'md',
  onClick,
}: CardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200' : ''}
        ${className}
      `}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

// Subcomponents for better composition
export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-b border-gray-100 pb-4 mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-t border-gray-100 pt-4 mt-4 ${className}`}>{children}</div>;
}

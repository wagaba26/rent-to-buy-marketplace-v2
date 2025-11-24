import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  glass = false
}) => {
  const baseStyles = glass
    ? 'glass-card'
    : 'bg-bg-secondary border border-border-primary rounded-2xl shadow-lg';

  const hoverStyles = hoverEffect && !glass
    ? 'transition-all duration-300 hover:border-border-accent hover:shadow-glow hover:-translate-y-1'
    : '';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
};

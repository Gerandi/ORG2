import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'medium',
}) => {
  const baseClasses = 'rounded-lg transition-all duration-150 ease-in-out';
  
  const variantClasses = {
    default: 'bg-white border border-gray-200',
    outlined: 'bg-white border border-gray-300',
    elevated: 'bg-white shadow-md',
  };
  
  const paddingClasses = {
    none: 'p-0',
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6',
  };
  
  const combinedClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${className}
  `;
  
  return (
    <div className={combinedClasses}>
      {children}
    </div>
  );
};

export default Card;
import React from 'react';

export interface TextProps {
  variant?: 'body' | 'caption' | 'small';
  children: React.ReactNode;
  className?: string;
}

const Text: React.FC<TextProps> = ({
  variant = 'body',
  children,
  className = '',
}) => {
  const variantClasses = {
    body: 'text-base',
    caption: 'text-sm text-gray-600',
    small: 'text-xs',
  };

  const combinedClasses = `${variantClasses[variant]} ${className}`;

  return <p className={combinedClasses}>{children}</p>;
};

export default Text;
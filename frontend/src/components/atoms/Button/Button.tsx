import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Base classes for all buttons
  const baseClasses = 'font-medium rounded focus:outline-none transition-all duration-200 ease-in-out';
  
  // Size specific classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  // Variant specific classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300 hover:scale-[1.03] active:scale-[0.98]',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-2 focus:ring-gray-300 disabled:bg-gray-100 disabled:text-gray-400 hover:scale-[1.03] active:scale-[0.98]',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 disabled:border-gray-200 disabled:text-gray-400 hover:scale-[1.03] active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 disabled:text-gray-400 hover:scale-[1.02] active:scale-[0.98]',
    link: 'bg-transparent text-blue-600 hover:underline hover:text-blue-700 p-0 disabled:text-gray-400',
    icon: 'p-1 bg-transparent hover:bg-gray-100 rounded focus:ring-2 focus:ring-gray-300 disabled:text-gray-400',
  };
  
  // Width class
  const widthClass = fullWidth ? 'w-full' : '';
  
  // Combine all classes
  const buttonClasses = `
    ${baseClasses} 
    ${sizeClasses[size]} 
    ${variantClasses[variant]} 
    ${widthClass}
    ${className}
  `;

  return (
    <button 
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </div>
      ) : children}
    </button>
  );
};

export default Button;
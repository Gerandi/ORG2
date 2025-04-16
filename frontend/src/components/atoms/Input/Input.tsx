import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
  helpText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  className = '',
  error,
  helpText,
  fullWidth = false,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseClasses = 'px-3 py-2 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300';
  const iconPaddingLeft = leftIcon ? 'pl-10' : '';
  const iconPaddingRight = rightIcon ? 'pr-10' : '';
  
  const inputClasses = `
    ${baseClasses}
    ${widthClass}
    ${errorClass}
    ${iconPaddingLeft}
    ${iconPaddingRight}
    ${className}
  `;

  return (
    <div className={`relative ${widthClass}`}>
      {leftIcon && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
          {leftIcon}
        </div>
      )}
      
      <input
        className={inputClasses}
        {...props}
      />
      
      {rightIcon && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
          {rightIcon}
        </div>
      )}
      
      {(typeof error === 'string' && error) && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
      
      {helpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

export default Input;
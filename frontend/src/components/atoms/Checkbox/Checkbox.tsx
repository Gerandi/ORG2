import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
  label?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  className = '',
  error,
  label,
  id,
  ...props
}) => {
  const baseClasses = 'h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500';
  const errorClass = error ? 'border-red-500' : '';
  
  const checkboxClasses = `
    ${baseClasses}
    ${errorClass}
    ${className}
  `;

  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          id={id}
          type="checkbox"
          className={checkboxClasses}
          {...props}
        />
      </div>
      {label && (
        <div className="ml-2 text-sm">
          <label htmlFor={id} className="font-medium text-gray-700">{label}</label>
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Checkbox;
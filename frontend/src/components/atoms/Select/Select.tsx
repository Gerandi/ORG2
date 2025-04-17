import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  error?: string;
  fullWidth?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const Select: React.FC<SelectProps> = ({
  options,
  error,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-3 py-2 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none bg-no-repeat';
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300';
  
  // Add defensive check for undefined options
  if (!options) {
    console.warn("Select component received undefined options prop. Rendering disabled select.");
    return (
      <select className={`${baseClasses} ${widthClass} ${className} bg-gray-100 cursor-not-allowed`} disabled>
        <option>Loading...</option>
      </select>
    );
  }
  
  const selectClasses = `
    ${baseClasses}
    ${widthClass}
    ${errorClass}
    ${className}
  `;

  return (
    <div className={`relative ${widthClass}`}>
      <select
        className={selectClasses}
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem'
        }}
        {...props}
      >
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Select;
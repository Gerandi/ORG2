import React from 'react';
import Input, { InputProps } from '../../atoms/Input/Input';
import Select, { SelectProps } from '../../atoms/Select/Select';

export interface FormFieldBaseProps {
  label: string;
  id: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
}

export interface InputFieldProps extends FormFieldBaseProps {
  type: 'input';
  inputProps: Omit<InputProps, 'id' | 'error'>;
}

export interface SelectFieldProps extends FormFieldBaseProps {
  type: 'select';
  selectProps: Omit<SelectProps, 'id' | 'error'>;
}

export type FormFieldProps = InputFieldProps | SelectFieldProps;

const FormField: React.FC<FormFieldProps> = (props) => {
  const { 
    label, 
    id, 
    error, 
    required, 
    helperText, 
    fullWidth = false,
    className = ''
  } = props;
  
  const wrapperClass = `mb-4 ${fullWidth ? 'w-full' : ''} ${className}`;
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const helperTextClass = 'mt-1 text-xs text-gray-500';
  
  return (
    <div className={wrapperClass}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {props.type === 'input' && (
        <Input
          id={id}
          error={error}
          fullWidth={fullWidth}
          {...props.inputProps}
        />
      )}
      
      {props.type === 'select' && (
        <Select
          id={id}
          error={error}
          fullWidth={fullWidth}
          {...props.selectProps}
        />
      )}
      
      {helperText && !error && (
        <p className={helperTextClass}>{helperText}</p>
      )}
    </div>
  );
};

export default FormField;
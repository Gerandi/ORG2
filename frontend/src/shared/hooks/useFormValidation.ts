import { useState, useCallback, useEffect, useRef } from 'react';

type ValidationRules<T> = {
  [K in keyof T]?: {
    required?: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: T[K], formData: T) => string | null;
  };
};

type ValidationErrors<T> = {
  [K in keyof T]?: string;
};

/**
 * A hook for form validation with customizable rules
 * 
 * @param initialValues Initial form values
 * @param validationRules Rules for validation
 * @returns Form state, errors, and helper functions
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules<T>
) {
  const [formData, setFormData] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [touched, setTouched] = useState<Record<keyof T, boolean>>(() => {
    const touchedFields = {} as Record<keyof T, boolean>;
    for (const key in initialValues) {
      touchedFields[key] = false;
    }
    return touchedFields;
  });

  // Validate a single field
  const validateField = useCallback((name: keyof T, value: any): string | null => {
    if (!validationRules[name]) return null;
    
    const rules = validationRules[name]!;
    
    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      return 'This field is required';
    }
    
    // Skip other validations if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return null;
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(String(value))) {
      return 'Invalid format';
    }
    
    // String length validation
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        return `Must be at least ${rules.minLength} characters`;
      }
      
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        return `Must be at most ${rules.maxLength} characters`;
      }
    }
    
    // Number range validation
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        return `Must be at least ${rules.min}`;
      }
      
      if (rules.max !== undefined && value > rules.max) {
        return `Must be at most ${rules.max}`;
      }
    }
    
    // Custom validation
    if (rules.custom) {
      return rules.custom(value, formData);
    }
    
    return null;
  }, [formData, validationRules]);

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors<T> = {};
    let isValid = true;
    
    for (const name in validationRules) {
      const error = validateField(name as keyof T, formData[name as keyof T]);
      if (error) {
        newErrors[name as keyof T] = error;
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  }, [formData, validateField, validationRules]);

  // Handle field change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;
    
    // Handle different input types
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate the changed field
    const fieldError = validateField(name as keyof T, parsedValue);
    
    // Create new errors object without referencing state directly
    const newErrors: ValidationErrors<T> = {};
    
    // Copy existing errors
    for (const key in errors) {
      newErrors[key as keyof T] = errors[key as keyof T];
    }
    
    // Set the current field error
    newErrors[name as keyof T] = fieldError;
    
    // Special case for password fields
    if (name === 'password' && 'confirmPassword' in formData) {
      const confirmPassword = formData['confirmPassword' as keyof T];
      // Only validate confirmPassword if it has a value
      if (confirmPassword) {
        const confirmError = validateField('confirmPassword' as keyof T, confirmPassword);
        newErrors['confirmPassword' as keyof T] = confirmError;
      }
    }
    
    if (name === 'confirmPassword' && 'password' in formData) {
      const password = formData['password' as keyof T];
      // Re-validate password if confirmPassword is changed
      if (password) {
        const passwordError = validateField('password' as keyof T, password);
        newErrors['password' as keyof T] = passwordError;
      }
    }
    
    // Update errors
    setErrors(newErrors);
  }, [validateField, formData, errors]);

  // Set a specific field value programmatically
  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate field
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, [validateField]);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
    
    const resetTouched = {} as Record<keyof T, boolean>;
    for (const key in initialValues) {
      resetTouched[key] = false;
    }
    setTouched(resetTouched);
  }, [initialValues]);

  // Simplified isValid calculation with no dependency on errors state
  const isFormValid = useCallback(() => {
    let valid = true;
    
    // First check if any field has errors
    for (const key in errors) {
      if (errors[key]) {
        return false;
      }
    }
    
    // Then check if all required fields are filled
    for (const name in validationRules) {
      const rules = validationRules[name as keyof T];
      if (rules?.required) {
        const value = formData[name as keyof T];
        if (value === undefined || value === null || value === '') {
          return false;
        }
      }
    }
    
    return valid;
  }, [errors, formData, validationRules]);
  
  return {
    formData,
    errors,
    touched,
    setTouched,
    handleChange,
    setFieldValue,
    validateForm,
    resetForm,
    // Call the function to get current validity state, not a state that can cause re-renders
    isValid: isFormValid()
  };
}

export default useFormValidation;
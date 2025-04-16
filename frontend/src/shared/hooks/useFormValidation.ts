import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (value: any) => boolean | string;
}

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule;
};

export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules<T>
) => {
  const [formData, setFormData] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  
  const validateField = useCallback((name: keyof T, value: any): string | null => {
    const rules = validationRules[name];
    if (!rules) return null;
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      return `${String(name)} is required`;
    }
    
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return `${String(name)} must be at least ${rules.minLength} characters`;
    }
    
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return `${String(name)} must be no more than ${rules.maxLength} characters`;
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      return `${String(name)} is invalid`;
    }
    
    if (rules.validate) {
      const result = rules.validate(value);
      if (typeof result === 'string') return result;
      if (!result) return `${String(name)} is invalid`;
    }
    
    return null;
  }, [validationRules]);
  
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
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
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;
    
    // Handle different input types
    if (type === 'number' || type === 'range') {
      parsedValue = value === '' ? '' : Number(value);
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }
    
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name as keyof T, parsedValue);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);
  
  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);
  
  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);
  
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);
  
  const isValid = useMemo(() => {
    for (const key in errors) {
      if (errors[key as keyof T]) {
        return false; // Found an error
      }
    }
    for (const name in validationRules) {
      const rules = validationRules[name as keyof T];
      if (rules?.required) {
        const value = formData[name as keyof T];
        if (value === undefined || value === null || value === '') {
          return false; // Required field is empty
        }
      }
    }
    return true; // No errors found and required fields are filled
  }, [errors, formData, validationRules]);

  return {
    formData,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    setFieldValue,
    validateForm,
    resetForm
  };
};

export default useFormValidation;
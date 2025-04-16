import { useState, useEffect } from 'react';

/**
 * A hook that debounces a value by the specified delay.
 * Useful for preventing rapid changes from triggering expensive operations.
 * 
 * @param value The value to be debounced
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timeout if the value changes before the delay period has elapsed
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
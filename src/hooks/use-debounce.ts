"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced version of the input value that only updates
 * after `delayMs` milliseconds have elapsed without new values.
 */
export function useDebounce<T>(value: T, delayMs: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}


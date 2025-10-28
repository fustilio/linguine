/**
 * URL parameter utilities for managing search params
 */

import React from 'react';

export interface URLParams {
  [key: string]: string | undefined;
}

/**
 * Get URL search parameters as an object
 */
export const getURLParams = (): URLParams => {
  const urlParams = new URLSearchParams(window.location.search);
  const params: URLParams = {};
  
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  
  return params;
};

/**
 * Get a specific URL parameter value
 */
export const getURLParam = (key: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key);
};

/**
 * Set a URL parameter without causing a page reload
 */
export const setURLParam = (key: string, value: string): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, '', url.toString());
};

/**
 * Remove a URL parameter without causing a page reload
 */
export const removeURLParam = (key: string): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete(key);
  window.history.replaceState({}, '', url.toString());
};

/**
 * Set multiple URL parameters at once
 */
export const setURLParams = (params: URLParams): void => {
  const url = new URL(window.location.href);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  });
  
  window.history.replaceState({}, '', url.toString());
};

/**
 * Hook for managing URL parameters with React state
 */
export const useURLParam = (key: string, defaultValue?: string) => {
  const getCurrentValue = () => getURLParam(key) || defaultValue || '';
  
  const [value, setValue] = React.useState(getCurrentValue);
  
  const updateValue = (newValue: string) => {
    setValue(newValue);
    if (newValue) {
      setURLParam(key, newValue);
    } else {
      removeURLParam(key);
    }
  };
  
  React.useEffect(() => {
    const handlePopState = () => {
      setValue(getCurrentValue());
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [key]);
  
  return [value, updateValue] as const;
};

/**
 * Hook for managing multiple URL parameters
 */
export const useURLParams = (defaultParams: URLParams = {}) => {
  const getCurrentParams = () => ({ ...defaultParams, ...getURLParams() });
  
  const [params, setParams] = React.useState(getCurrentParams);
  
  const updateParams = (newParams: Partial<URLParams>) => {
    const updatedParams = { ...params, ...newParams };
    setParams(updatedParams);
    setURLParams(updatedParams);
  };
  
  React.useEffect(() => {
    const handlePopState = () => {
      setParams(getCurrentParams());
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  return [params, updateParams] as const;
};

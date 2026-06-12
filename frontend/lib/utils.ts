import {twMerge} from 'tailwind-merge';

export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, boolean | null | undefined>
  | ClassValue[];

function toClassNames(value: ClassValue): string[] {
  if (!value) {
    return [];
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(toClassNames);
  }
  if (typeof value === 'object') {
    return Object.keys(value).filter(key => value[key]);
  }
  return [];
}

// Joins class names, dropping falsy values and resolving Tailwind conflicts.
// Accepts strings, conditional `{className: enabled}` objects and nested
// arrays of either.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(inputs.flatMap(toClassNames).join(' '));
}

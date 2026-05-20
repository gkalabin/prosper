import {notEmpty} from '@/lib/util/util';

export function firstValueOrNull(
  param: string | string[] | undefined
): string | null {
  if (Array.isArray(param)) {
    return param.length > 0 ? param[0] : null;
  }
  if (typeof param !== 'string') {
    return null;
  }
  return param;
}

export function firstPositiveIntOrNull(
  param: string | string[] | undefined
): number | null {
  const first = firstValueOrNull(param);
  if (first == null) {
    return null;
  }
  return positiveIntOrNull(first);
}

export function positiveIntOrNull(param: string | null): number | null {
  if (!notEmpty(param)) {
    return null;
  }
  if (!param.match(/^\d+$/)) {
    return null;
  }
  const i = parseInt(param, 10);
  if (isNaN(i) || i > Number.MAX_SAFE_INTEGER || Math.round(i) != i || i <= 0) {
    return null;
  }
  return i;
}

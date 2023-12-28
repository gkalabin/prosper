export function paramOrFirst(
  param: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
}

export function intParamOrFirst(
  param: string | string[] | undefined,
): number | undefined {
  const paramOrFirstString = paramOrFirst(param);
  if (!paramOrFirstString) {
    return undefined;
  }
  const i = parseInt(paramOrFirstString, 10);
  if (isNaN(i)) {
    return undefined;
  }
  return i;
}

export function intParam(param: string | null): number | null {
  if (!param) {
    // TODO: test '0'
    return null;
  }
  const i = parseInt(param, 10);
  if (isNaN(i)) {
    return null;
  }
  return i;
}

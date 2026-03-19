export function isProd(): boolean {
  return process.env.NODE_ENV == 'production';
}

export function isUsingHTTP(): boolean {
  return process.env.PUBLIC_APP_URL?.startsWith('http://') ?? false;
}

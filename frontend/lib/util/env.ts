export function isProd(): boolean {
  return process.env.NODE_ENV == 'production';
}

export function isUsingHTTP(): boolean {
  return process.env.PROSPER_PUBLIC_APP_URL?.startsWith('http://') ?? false;
}

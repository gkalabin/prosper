import {format} from 'date-fns';

export function logRequest(page: string, extra?: string) {
  const date = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  console.log(`[${date}] [request] ${page} ${extra || ''}`);
}

export function logApi(
  method: string,
  path: string,
  extra?: string | Record<string, string | number | undefined>
) {
  const date = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const tail =
    typeof extra === 'string' || extra === undefined
      ? extra || ''
      : Object.entries(extra)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}:${v}`)
          .join(' ');
  console.log(`[${date}] [api] ${method} ${path} ${tail}`);
}

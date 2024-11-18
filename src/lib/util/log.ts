import {format} from 'date-fns';

export function logRequest(page: string, extra?: string) {
  const date = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  console.log(`[${date}] [request] ${page} ${extra || ''}`);
}

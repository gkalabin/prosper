// Next.js looks up `register()` from this file once at server boot and
// runs it before any request is served. We use it to surface env-var
// misconfiguration.
import {isProd, isUsingHTTP} from '@/lib/util/env';

export async function register() {
  if (isUsingHTTP() && isProd()) {
    console.warn(
      'PROSPER_PUBLIC_APP_URL is using HTTP in production — most likely this is a misconfiguration.'
    );
  }
}

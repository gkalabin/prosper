import {COOKIE_NAME, COOKIE_TTL_DAYS, SIGN_OUT_URL} from '@/lib/auth/const';
import {isProd} from '@/lib/util/env';
import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (request.method === 'GET') {
    if (request.nextUrl.pathname == SIGN_OUT_URL) {
      return NextResponse.next();
    }
    const response = NextResponse.next();
    const token = request.cookies.get(COOKIE_NAME)?.value ?? null;
    if (token !== null) {
      // Only extend cookie expiration on GET requests since we can be sure
      // a new session wasn't set when handling the request.
      response.cookies.set(COOKIE_NAME, token, {
        path: '/',
        maxAge: 60 * 60 * 24 * COOKIE_TTL_DAYS,
        sameSite: 'lax',
        httpOnly: true,
        secure: isProd(),
      });
    }
    return response;
  }

  const originHeader = request.headers.get('Origin');
  // NOTE: You may need to use `X-Forwarded-Host` instead
  const hostHeader = request.headers.get('Host');
  if (originHeader === null || hostHeader === null) {
    return new NextResponse(null, {status: 403});
  }
  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return new NextResponse(null, {status: 403});
  }
  if (origin.host !== hostHeader) {
    return new NextResponse(null, {status: 403});
  }
  return NextResponse.next();
}

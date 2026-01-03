import {COOKIE_NAME, COOKIE_TTL_DAYS, SIGN_OUT_URL} from '@/lib/auth/const';
import {isProd} from '@/lib/util/env';
import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

const FORBIDDEN = new NextResponse(null, {status: 403});

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname == '/api/_ratesz') {
    // Proceed with the request for the admin handlers.
    // The admin handlers have their own auth mechanism and not visible from the wider internet, but only from the same server.
    return NextResponse.next();
  }

  // Do not interfere with sign-out flow, allow it straight away.
  if (request.nextUrl.pathname == SIGN_OUT_URL) {
    return NextResponse.next();
  }
  // Only extend cookie expiration on GET requests since we can be sure
  // a new session wasn't set when handling the request.
  if (request.method === 'GET') {
    const response = NextResponse.next();
    extendAuthCookie(request, response);
    return response;
  }
  const sameOrigin = isSameOrigin(request);
  if (!sameOrigin) {
    return FORBIDDEN;
  }
  return NextResponse.next();
}

function extendAuthCookie(request: NextRequest, response: NextResponse): void {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? null;
  if (!token) {
    return;
  }
  response.cookies.set(COOKIE_NAME, token, {
    path: '/',
    maxAge: 60 * 60 * 24 * COOKIE_TTL_DAYS,
    sameSite: 'lax',
    httpOnly: true,
    secure: isProd(),
  });
}

function isSameOrigin(request: NextRequest): boolean {
  const originHeader = request.headers.get('Origin');
  const sameOrigin = (host: string | null): boolean => {
    if (originHeader === null || host === null) {
      return false;
    }
    let origin: URL;
    try {
      origin = new URL(originHeader);
    } catch {
      return false;
    }
    return origin.host === host;
  };
  return (
    sameOrigin(request.headers.get('Host')) ||
    sameOrigin(request.headers.get('X-Forwarded-Host'))
  );
}

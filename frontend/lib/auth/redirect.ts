import {
  DEFAULT_AUTHENTICATED_PAGE,
  RETURN_PATH_PARAM,
  SIGN_IN_URL,
} from '@/lib/auth/const';

// A path is safe to redirect to only if it points back into this site.
// Protocol-relative ("//host") and backslash-prefixed ("/\\host") values are
// rejected because browsers resolve them to an external origin, which would
// allow an open redirect.
function isSafeReturnPath(path: string): boolean {
  return (
    path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')
  );
}

// Builds the sign-in URL, remembering the path to return to after a successful
// login. A missing or off-site path is dropped, so the URL never carries an
// unsafe redirect target.
export function signInUrlWithReturnPath(
  maybeUnsafePath: string | null
): string {
  if (!maybeUnsafePath || !isSafeReturnPath(maybeUnsafePath)) {
    return SIGN_IN_URL;
  }
  const query = new URLSearchParams({[RETURN_PATH_PARAM]: maybeUnsafePath});
  return `${SIGN_IN_URL}?${query.toString()}`;
}

// Resolves where to send the user once signed in, reading it from the
// user-controlled return-path parameter and falling back to the default
// authenticated page for missing or off-site values.
export function returnPathOrDefault(maybeUnsafePath: string | null): string {
  if (!maybeUnsafePath || !isSafeReturnPath(maybeUnsafePath)) {
    return DEFAULT_AUTHENTICATED_PAGE;
  }
  return maybeUnsafePath;
}

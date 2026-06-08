// The address of the login page.
export const SIGN_IN_URL = '/auth/signin';
export const SIGN_OUT_URL = '/api/auth/signout';
// The default page to redirect to after a user has successfully authenticated.
export const DEFAULT_AUTHENTICATED_PAGE = '/overview';
export const POST_SIGNUP_PAGE = '/config/banks';
export const WRONG_LOGIN_OR_PASSWORD_ERROR = 'Wrong login or password';
export const COOKIE_NAME = 'session';
export const COOKIE_TTL_DAYS = 7;
export const SESSION_TOKEN_LENGTH = 64;
// Request header carrying the path the user is currently visiting. The proxy
// sets it so server components can send the user back there after an
// authentication redirect.
export const REQUESTED_PATH_HEADER = 'x-requested-path';
// Query parameter on the sign-in URL holding the path to return to once the
// user has authenticated.
export const RETURN_PATH_PARAM = 'next';

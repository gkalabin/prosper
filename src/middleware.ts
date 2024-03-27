import {LOGIN_PAGE} from '@/lib/const';
import {withAuth} from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: LOGIN_PAGE,
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - auth/signup (signup page)
     * - api/signup (signup API route)
     */
    '/((?!auth/signup|api/signup).*)',
  ],
};

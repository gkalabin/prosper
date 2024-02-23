import {LOGIN_PAGE} from '@/lib/const';
import {withAuth} from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: LOGIN_PAGE,
  },
});

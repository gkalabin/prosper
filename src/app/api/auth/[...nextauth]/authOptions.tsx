import {LOGIN_PAGE} from '@/lib/const';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import {AuthOptions, User} from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: AuthOptions = {
  pages: {
    signIn: LOGIN_PAGE,
  },
  events: {
    async signIn(message) {
      console.log('[AUTH] signIn:', message);
    },
    async signOut(message) {
      console.log('[AUTH] signOut:', message);
    },
    async createUser(message) {
      console.log('[AUTH] createUser:', message);
    },
    async updateUser(message) {
      console.log('[AUTH] updateUser:', message);
    },
    async linkAccount(message) {
      console.log('[AUTH] linkAccount:', message);
    },
  },
  callbacks: {
    jwt({token, account, user}) {
      if (account) {
        token.id = user.id;
      }
      return token;
    },
    session({session, token}) {
      session.user.id = token.id as number;
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: 'Login and password',
      credentials: {
        login: {label: 'Login', type: 'text', placeholder: 'login'},
        password: {label: 'Password', type: 'password'},
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials || !credentials.login || !credentials.password) {
          return null;
        }
        const [found] = await prisma.user.findMany({
          where: {
            login: credentials.login,
          },
        });
        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          found?.password ?? ''
        );
        if (!passwordsMatch) {
          return null;
        }
        return {
          id: found.id,
          name: found.login,
        };
      },
    }),
  ],
};

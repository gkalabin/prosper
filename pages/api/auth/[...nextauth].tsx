import bcrypt from "bcrypt";
import prisma from "lib/prisma";
import NextAuth, { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
export const authOptions = {
  events: {
    async signIn(message) { console.log("[AUTH] signIn:", message)},
    async signOut(message) { console.log("[AUTH] signOut:", message)},
    async createUser(message) { console.log("[AUTH] createUser:", message)},
    async updateUser(message) { console.log("[AUTH] updateUser:", message)},
    async linkAccount(message) { console.log("[AUTH] linkAccount:", message)},
  },
  callbacks: {
    jwt({ token, account, user }) {
      if (account) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      return session;
    },
  },
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Login and password",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        login: { label: "Login", type: "text", placeholder: "login" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const [found] = await prisma.user.findMany({
          where: {
            login: credentials.login,
          },
        });
        if (!found) {
          return null;
        }
        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          found.password
        );
        if (!passwordsMatch) {
          return null;
        }
        return {
          id: found.id + "",
          name: found.login,
        } as User;
      },
    }),
  ],
};
export default NextAuth(authOptions);

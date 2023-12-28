import NextAuth, { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        login: { label: "Login", type: "text", placeholder: "login" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials.login != process.env.LOGIN ||
          credentials.password != process.env.PASSWORD
        ) {
          return null;
        }
        const user: User = {
          id: credentials.login,
          name: credentials.login,
        };
        return user;
      },
    }),
  ],
};
export default NextAuth(authOptions);

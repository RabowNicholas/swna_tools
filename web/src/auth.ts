import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { findUserByEmail, getUserById, verifyPassword } from '@/lib/users';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Required for Vercel/production deployments
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        const user = findUserByEmail(credentials.email as string);

        if (!user) {
          throw new Error('Invalid email or password');
        }

        const isPasswordValid = await verifyPassword(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        // Return user object (without password)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    authorized: async ({ auth, request }) => {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth;
      const isLoginPage = pathname.startsWith('/login');

      console.log('[MIDDLEWARE] Path:', pathname);
      console.log('[MIDDLEWARE] Is logged in:', isLoggedIn);

      // Allow access to login page
      if (isLoginPage) {
        return true;
      }

      // Require authentication for all other pages
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;

        // Read the name, email and role off the user list rather than trusting
        // the token's copy of them. A JWT session is written once at sign-in
        // and then rolled forward on every renewal, carrying those values with
        // it — so editing someone in users.ts never reaches a browser that
        // stayed signed in. Renaming the nickswna account from "Admin User"
        // left it signing client texts as "Admin User" for weeks. The id is
        // what identifies the user; everything else is looked up fresh.
        const user = getUserById(token.id as string);
        if (user) {
          session.user.name = user.name;
          session.user.email = user.email;
          session.user.role = user.role;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

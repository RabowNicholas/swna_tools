import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { findUserByEmail, verifyPassword } from '@/lib/users';

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

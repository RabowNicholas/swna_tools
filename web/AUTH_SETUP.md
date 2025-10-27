# Authentication System Setup

This application uses **NextAuth.js** with credentials provider for secure authentication.

## ✅ What's Protected

- **All pages** except `/login` require authentication
- **All API routes** (`/api/*`) require authentication
- Unauthenticated users are automatically redirected to `/login`

## 🔐 Initial Login Credentials

**Email**: `admin@swna.com`
**Password**: `Admin123!`

⚠️ **IMPORTANT**: Change this password after first login!

## 👥 Adding New Users

### Step 1: Generate Hashed Password

```bash
node scripts/hash-password.js "YourSecurePassword123!"
```

This will output a hashed password that you can use in the next step.

### Step 2: Add User to Database

Edit `src/lib/users.ts` and add a new user to the `users` array:

```typescript
{
  id: '2',  // Increment ID
  email: 'user@example.com',
  name: 'User Name',
  hashedPassword: '$2b$10$...',  // Paste the hash from Step 1
  role: 'user',  // 'admin' or 'user'
},
```

### Step 3: Restart the Development Server

```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

Required in `.env.local`:

```env
# NextAuth
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=http://localhost:3000

# Airtable (already configured)
AIRTABLE_PAT=<your-token>
AIRTABLE_BASE_ID=<your-base-id>
```

The `NEXTAUTH_SECRET` is already generated. For production, update `NEXTAUTH_URL` to your domain.

## 🚀 Production Deployment

### Update Environment Variables

When deploying to production (e.g., Vercel, Netlify):

1. Add all environment variables from `.env.local`
2. Update `NEXTAUTH_URL` to your production domain:
   ```
   NEXTAUTH_URL=https://your-domain.com
   ```

### Security Checklist

- [ ] Change default admin password
- [ ] Update `NEXTAUTH_SECRET` in production
- [ ] Set correct `NEXTAUTH_URL`
- [ ] Review and remove unnecessary users
- [ ] Enable HTTPS (required for production)

## 🔑 User Roles

### Admin Role
- Full access to all features
- Can manage users (when admin panel is added)

### User Role
- Access to all forms and client data
- Cannot manage users

## 📝 Session Management

- **Session Duration**: 7 days
- **Strategy**: JWT (no database required)
- **Storage**: HTTP-only cookies (secure)

## 🛠 Troubleshooting

### Can't Login?

1. Check that the email and password are correct
2. Verify the user exists in `src/lib/users.ts`
3. Check the hashed password matches
4. Look at server logs for authentication errors

### Redirected to Login Loop?

1. Clear your browser cookies
2. Check `NEXTAUTH_SECRET` is set in `.env.local`
3. Restart the development server

### API Routes Return 401?

This is expected! All API routes now require authentication. Make sure:
1. You're logged in
2. Your session is valid
3. Cookies are enabled in your browser

## 📚 File Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # NextAuth configuration
│   └── login/
│       └── page.tsx                  # Login page
├── components/
│   └── auth/
│       ├── SessionProvider.tsx       # Session context provider
│       └── UserButton.tsx            # Logout button component
├── lib/
│   ├── auth.ts                       # Auth utility functions
│   └── users.ts                      # User database
├── types/
│   └── next-auth.d.ts                # TypeScript types
└── middleware.ts                     # Route protection

scripts/
└── hash-password.js                  # Password hashing utility
```

## 🔐 Security Features

- ✅ Bcrypt password hashing (10 rounds)
- ✅ HTTP-only session cookies
- ✅ CSRF protection (built-in)
- ✅ Secure session tokens (JWT)
- ✅ Automatic redirect for unauth users
- ✅ API route protection
- ✅ No passwords in localStorage

## 📖 Need Help?

- NextAuth.js Docs: https://next-auth.js.org/
- Report issues: Contact your administrator

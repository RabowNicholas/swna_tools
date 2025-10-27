import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  hashedPassword: string;
  role: 'admin' | 'user';
}

/**
 * User database
 *
 * To add a new user, generate a hashed password:
 * 1. Run: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YOUR_PASSWORD', 10));"
 * 2. Add the user with the hashed password below
 */
export const users: User[] = [
  {
    id: '1',
    email: 'admin@swna.com',
    name: 'Admin User',
    hashedPassword: '$2b$10$i38QWh7JcjBgwnDtZlXfYOuKJL58mBDxIyCOBXiiyP7OOkdryL1tG', // Password: Admin123!
    role: 'admin',
  },
  // Add more users here as needed
  // Use: node scripts/hash-password.js YOUR_PASSWORD to generate hashed passwords
];

/**
 * Find user by email
 */
export function findUserByEmail(email: string): User | undefined {
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

/**
 * Verify user password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Hash a password for storing in the users array
 * Use this function to generate hashed passwords for new users
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Get user by ID (without password)
 */
export function getUserById(id: string): Omit<User, 'hashedPassword'> | undefined {
  const user = users.find(u => u.id === id);
  if (!user) return undefined;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hashedPassword, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

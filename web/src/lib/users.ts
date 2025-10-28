import bcrypt from "bcryptjs";

export interface User {
  id: string;
  email: string;
  name: string;
  hashedPassword: string;
  role: "admin" | "user";
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
    id: "1",
    email: "nickswna@outlook.com",
    name: "Admin User",
    hashedPassword:
      "$2b$10$i38QWh7JcjBgwnDtZlXfYOuKJL58mBDxIyCOBXiiyP7OOkdryL1tG", // Password: Admin123!
    role: "admin",
  },
  {
    id: "2",
    email: "swnadvocates@outlook.com",
    name: "Tyler",
    hashedPassword:
      "$2b$10$l8zl3SjKtZn1xAOUJFEI..3IBpu0XorhkvPfNuzxjoK6Tsf3xeXse",
    role: "user",
  },
  {
    id: "3",
    email: "taylorswna@outlook.com",
    name: "Taylor",
    hashedPassword:
      "$2b$10$buJqjKam2L1a1aCuT0.M..t3i/RzJRPPO7BOFyDbrwwGS/4MBoHSe",
    role: "user",
  },
  {
    id: "4",
    email: "leslieswna@outlook.com",
    name: "Leslie",
    hashedPassword:
      "$2b$10$9DnckHUtkBllB980Aro85eH7nKFAy7t6V733XAjKr4I.lXKu4aF5W",
    role: "user",
  },
  {
    id: "5",
    email: "jessicapswna@outlook.com",
    name: "Jessica",
    hashedPassword:
      "$2b$10$h26xBsMzlV3kYEydlmjbF.oRMP6yXY414Q/pUcEH9MgCKmZwD.Iv2",
    role: "user",
  },
  {
    id: "6",
    email: "celesteswna@outlook.com",
    name: "Celeste",
    hashedPassword:
      "$2b$10$WUISBiUncSQr6XmVqYH37.X9wX78hr/50MFHOdGjOGSuPKK/U5UFO",
    role: "user",
  },
  {
    id: "7",
    email: "mekellswna@outlook.com",
    name: "Mekell",
    hashedPassword:
      "$2b$10$WRrKgeF3d4C5uSDX5Ya7QO5zvjFzV9ZUX8jukc27d8mnY8w9YKX0m",
    role: "user",
  },
  {
    id: "8",
    email: "emmaswna@outlook.com",
    name: "Emma",
    hashedPassword:
      "$2b$10$XgvN/F65Yyw9kqrFm9Ny8OwkSm4w5Y3gO0QtAtXzIuzEA9ivYt.Ne",
    role: "user",
  },
  {
    id: "9",
    email: "jodyswna@outlook.com",
    name: "Jody",
    hashedPassword:
      "$2b$10$qf.oavP.O/5QXV9u8cAE..g6DbInZNYZCGEHxquPYr6a2SIQY4EWq",
    role: "user",
  },
  {
    id: "10",
    email: "devenyswna@outlook.com",
    name: "Deveny",
    hashedPassword:
      "$2b$10$GEYRyKAEToOfCpj9X/yaHedvFQvFOrkXL/w2ZAGoShfm0NGq.y6pG",
    role: "user",
  },
];

/**
 * Find user by email
 */
export function findUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

/**
 * Verify user password
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
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
export function getUserById(
  id: string
): Omit<User, "hashedPassword"> | undefined {
  const user = users.find((u) => u.id === id);
  if (!user) return undefined;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hashedPassword, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

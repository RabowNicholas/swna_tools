/**
 * Script to generate hashed passwords for users
 *
 * Usage: node scripts/hash-password.js YOUR_PASSWORD
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Please provide a password as an argument');
  console.log('\nUsage: node scripts/hash-password.js YOUR_PASSWORD');
  console.log('Example: node scripts/hash-password.js MySecurePassword123!');
  process.exit(1);
}

const hashedPassword = bcrypt.hashSync(password, 10);

console.log('\n✅ Password hashed successfully!\n');
console.log('Add this to your users array in src/lib/users.ts:\n');
console.log(`{
  id: 'unique-id-here',
  email: 'user@example.com',
  name: 'User Name',
  hashedPassword: '${hashedPassword}',
  role: 'user',
},`);
console.log('\n');

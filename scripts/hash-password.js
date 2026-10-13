/**
 * Password Hash Generator
 * Usage: node scripts/hash-password.js "YourPassword123"
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Please provide a password');
  console.log('Usage: node scripts/hash-password.js "YourPassword123"');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Error: Password must be at least 8 characters long');
  process.exit(1);
}

bcrypt.hash(password, 10)
  .then(hash => {
    console.log('\n✅ Password hashed successfully!\n');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nUse this SQL to update admin password:');
    console.log('----------------------------------------');
    console.log(`UPDATE admins SET password_hash = '${hash}' WHERE email = 'admin@sportlife.com';`);
    console.log('----------------------------------------\n');
  })
  .catch(error => {
    console.error('❌ Error generating hash:', error);
    process.exit(1);
  });

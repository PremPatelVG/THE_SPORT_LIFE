/**
 * Generate Password Hash
 * Run: node scripts/generatePasswordHash.js
 */

const bcrypt = require('bcryptjs');

const generateHash = async () => {
  const password = 'Admin@123';
  const saltRounds = 10;

  console.log('\n🔐 Generating password hash...\n');
  console.log('Password:', password);
  console.log('Salt Rounds:', saltRounds);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const hash = await bcrypt.hash(password, saltRounds);

  console.log('Generated Hash:');
  console.log(hash);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test the hash
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash Verification:', isValid ? '✅ Valid' : '❌ Invalid');
  console.log('\n');
};

generateHash();

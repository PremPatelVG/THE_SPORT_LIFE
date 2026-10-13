/**
 * Create Admin User Script
 * Run: node scripts/createAdminUser.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const createAdminUser = async () => {
  let connection;
  
  try {
    console.log('🔐 Creating admin user...\n');

    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'tournament_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'sports_tournament_db_v3'
    });

    console.log('✅ Connected to database');

    // Admin credentials
    const adminEmail = 'admin@sportlife.com';
    const adminPassword = 'Admin@123';
    const adminPhone = '+919999999999';

    // Hash password
    console.log('🔒 Hashing password...');
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Check if admin already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      [adminEmail]
    );

    if (existingUsers.length > 0) {
      console.log('⚠️  Admin user already exists. Updating...');
      
      // Update existing user to admin role
      await connection.execute(
        `UPDATE users 
         SET role = 'admin', 
             password_hash = ?,
             is_verified = TRUE,
             phone_verified = TRUE
         WHERE email = ?`,
        [passwordHash, adminEmail]
      );
      
      console.log('✅ Admin user updated successfully!');
    } else {
      console.log('➕ Creating new admin user...');
      
      // Create new admin user
      await connection.execute(
        `INSERT INTO users (
          email,
          phone,
          password_hash,
          first_name,
          last_name,
          role,
          is_verified,
          phone_verified,
          auth_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adminEmail,
          adminPhone,
          passwordHash,
          'Admin',
          'User',
          'admin',
          true,
          true,
          'email'
        ]
      );
      
      console.log('✅ Admin user created successfully!');
    }

    // Fetch and display admin user details
    const [adminUser] = await connection.execute(
      'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE email = ?',
      [adminEmail]
    );

    console.log('\n📋 Admin User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:         ${adminUser[0].id}`);
    console.log(`Email:      ${adminUser[0].email}`);
    console.log(`Name:       ${adminUser[0].first_name} ${adminUser[0].last_name}`);
    console.log(`Role:       ${adminUser[0].role}`);
    console.log(`Created:    ${adminUser[0].created_at}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔑 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:      ${adminEmail}`);
    console.log(`Password:   ${adminPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed\n');
    }
  }
};

// Run the script
createAdminUser();

/**
 * Run the bracket foreign key fix migration
 * This removes the old foreign key constraints that reference tournament_participants
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🔧 Starting bracket foreign key fix migration...\n');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'tournament_user',
      password: process.env.DB_PASSWORD || 'Tournament@2025!',
      database: process.env.DB_NAME || 'sports_tournament_db_v3',
      multipleStatements: true
    });
    
    console.log('✅ Connected to database\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'fix_bracket_foreign_keys.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration...\n');
    
    // Execute migration
    const [results] = await connection.query(migrationSQL);
    
    // Display results
    if (Array.isArray(results)) {
      results.forEach((result, index) => {
        if (result && result.length > 0) {
          console.log(`Step ${index + 1}:`, result[0]);
        }
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Removed foreign key from tournament_brackets.participant_id');
    console.log('   - Removed foreign key from group_participants.participant_id');
    console.log('   - Removed foreign key from tournament_standings.participant_id');
    console.log('   - Removed foreign keys from matches table');
    console.log('   - Added comments documenting new behavior');
    console.log('\n⚠️  Note: participant_id fields now reference different tables based on tournament category:');
    console.log('   - Singles: tournament_registrations.id');
    console.log('   - Doubles: pairs.id');
    console.log('   - Teams: teams.id');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();

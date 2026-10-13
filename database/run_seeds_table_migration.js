const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔄 Running tournament_seeds table migration...\n');

    // Create tournament_seeds table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tournament_seeds (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tournament_id INT NOT NULL,
        seed_number INT NOT NULL,
        
        participant_type ENUM('player', 'pair', 'team') NOT NULL,
        player_registration_id INT NULL COMMENT 'For singles tournaments',
        pair_id INT NULL COMMENT 'For pairs/doubles tournaments',
        team_id INT NULL COMMENT 'For teams tournaments',
        
        assigned_by INT NOT NULL COMMENT 'Organizer who assigned the seed',
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT NULL COMMENT 'Optional notes about seed assignment',
        
        INDEX idx_tournament (tournament_id),
        INDEX idx_seed_number (tournament_id, seed_number),
        INDEX idx_participant_type (tournament_id, participant_type),
        
        UNIQUE KEY unique_seed_per_tournament (tournament_id, seed_number),
        
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (player_registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE,
        FOREIGN KEY (pair_id) REFERENCES tournament_pairs(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES tournament_teams(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ tournament_seeds table created successfully!');
    console.log('\n📋 Table structure:');
    console.log('   - Centralized seeding for all tournament types');
    console.log('   - Supports: Singles, Pairs/Doubles, Teams');
    console.log('   - Includes audit trail (assigned_by, assigned_at)');
    console.log('   - Proper foreign key constraints');
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  tournament_seeds table already exists');
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();

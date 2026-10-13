#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sports_tournament_db_v2',
  multipleStatements: true
};

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

class MigrationManager {
  constructor() {
    this.connection = null;
  }

  async connect() {
    this.connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ Disconnected from database');
    }
  }

  async ensureMigrationsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await this.connection.execute(createTableSQL);
  }

  async getExecutedMigrations() {
    const [rows] = await this.connection.execute(
      `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY name`
    );
    return rows.map(row => row.name);
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(MIGRATIONS_DIR);
      return files
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(MIGRATIONS_DIR, { recursive: true });
        return [];
      }
      throw error;
    }
  }

  async parseMigrationFile(filename) {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const content = await fs.readFile(filepath, 'utf8');
    
    // Split by -- UP and -- DOWN markers
    const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
    const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);
    
    return {
      up: upMatch ? upMatch[1].trim() : '',
      down: downMatch ? downMatch[1].trim() : ''
    };
  }

  async migrateUp() {
    await this.ensureMigrationsTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = await this.getMigrationFiles();
    const pendingMigrations = allMigrations.filter(
      m => !executedMigrations.includes(m)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`\n📦 Found ${pendingMigrations.length} pending migration(s)\n`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`⏳ Applying: ${migration}`);
        
        const { up } = await this.parseMigrationFile(migration);
        
        if (!up) {
          console.log(`⚠️  Skipping ${migration} - No UP section found`);
          continue;
        }

        // Execute migration
        await this.connection.query(up);
        
        // Record migration
        await this.connection.execute(
          `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`,
          [migration]
        );
        
        console.log(`✅ Applied: ${migration}\n`);
      } catch (error) {
        console.error(`❌ Failed to apply ${migration}:`);
        console.error(error.message);
        throw error;
      }
    }

    console.log('✅ All migrations applied successfully!');
  }

  async migrateDown() {
    await this.ensureMigrationsTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }

    const lastMigration = executedMigrations[executedMigrations.length - 1];
    
    try {
      console.log(`\n⏳ Rolling back: ${lastMigration}`);
      
      const { down } = await this.parseMigrationFile(lastMigration);
      
      if (!down) {
        console.log(`⚠️  No DOWN section found in ${lastMigration}`);
        console.log('⚠️  Migration will be removed from tracking but not rolled back');
      } else {
        // Execute rollback
        await this.connection.query(down);
      }
      
      // Remove migration record
      await this.connection.execute(
        `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = ?`,
        [lastMigration]
      );
      
      console.log(`✅ Rolled back: ${lastMigration}\n`);
    } catch (error) {
      console.error(`❌ Failed to rollback ${lastMigration}:`);
      console.error(error.message);
      throw error;
    }
  }

  async status() {
    await this.ensureMigrationsTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = await this.getMigrationFiles();
    
    console.log('\n📊 Migration Status\n');
    console.log('='.repeat(60));
    
    if (allMigrations.length === 0) {
      console.log('No migration files found');
      return;
    }

    for (const migration of allMigrations) {
      const isExecuted = executedMigrations.includes(migration);
      const status = isExecuted ? '✅ Applied' : '⏳ Pending';
      console.log(`${status}  ${migration}`);
    }
    
    console.log('='.repeat(60));
    console.log(`Total: ${allMigrations.length} | Applied: ${executedMigrations.length} | Pending: ${allMigrations.length - executedMigrations.length}`);
    console.log('');
  }

  async createMigration(name) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, '')
      .split('.')[0];
    
    const filename = `${timestamp}_${name}.sql`;
    const filepath = path.join(MIGRATIONS_DIR, filename);
    
    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString().split('T')[0]}
-- Description: Add description here

-- UP
-- Add your schema changes here


-- DOWN
-- Add rollback changes here

`;

    await fs.mkdir(MIGRATIONS_DIR, { recursive: true });
    await fs.writeFile(filepath, template);
    
    console.log(`✅ Created migration: ${filename}`);
    console.log(`📝 Edit: database/migrations/${filename}`);
  }
}

// CLI
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  const manager = new MigrationManager();
  
  try {
    await manager.connect();
    
    switch (command) {
      case 'up':
        await manager.migrateUp();
        break;
      
      case 'down':
        await manager.migrateDown();
        break;
      
      case 'status':
        await manager.status();
        break;
      
      case 'create':
        if (!arg) {
          console.error('❌ Please provide a migration name');
          console.log('Usage: npm run migrate:create <name>');
          process.exit(1);
        }
        await manager.createMigration(arg);
        break;
      
      default:
        console.log('Usage:');
        console.log('  npm run migrate:up      - Apply pending migrations');
        console.log('  npm run migrate:down    - Rollback last migration');
        console.log('  npm run migrate:status  - Show migration status');
        console.log('  npm run migrate:create <name> - Create new migration');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await manager.disconnect();
  }
}

main();

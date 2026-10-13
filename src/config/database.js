const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'sportlife',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: '+05:30',   // ✅ Thailand Time (ICT)
    dateStrings: true  // Keep DATE/DATETIME as strings to avoid timezone conversion
});

// Test database connection
const testConnection = async () => {
    try {
        const conn = await pool.getConnection();
        await conn.query("SET time_zone = '+05:30'");
        conn.release();
        return true;
    } catch (error) {
        logger.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Execute query with error handling
const query = async (sql, params = []) => {
    try {
        const [results] = await pool.query(sql, params);
        return results;
    } catch (error) {
        logger.error('Database query error:', error);
        throw error;
    }
};

// Execute stored procedure
const callProcedure = async (procedureName, params = []) => {
    const connection = await pool.getConnection();
    try {
        // Explicitly set timezone to Thailand (ICT) for this session
        await connection.query("SET time_zone = '+05:30'");
        
        const placeholders = params.map(() => '?').join(', ');
        const sql = `CALL ${procedureName}(${placeholders})`;
        const [results] = await connection.query(sql, params);
        return results;
    } catch (error) {
        logger.error(`Stored procedure ${procedureName} error:`, error);
        throw error;
    } finally {
        connection.release();
    }
};

// Transaction helper
const transaction = async (callback) => {
    const connection = await pool.getConnection();
    try {
        // Explicitly set timezone to Thailand (ICT) for this session
        await connection.query("SET time_zone = '+05:30'");
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    pool,
    query,
    callProcedure,
    transaction,
    testConnection
};

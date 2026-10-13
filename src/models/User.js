const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Create a new user
 */
const create = async (userData) => {
  const {
    email,
    phone,
    password,
    google_id,
    facebook_id,
    apple_id,
    first_name,
    last_name,
    gender,
    handedness,
    date_of_birth,
    profile_image,
    role = 'player',
    phone_verified = false,
    auth_method = 'mobile'
  } = userData;

  const password_hash = password ? await bcrypt.hash(password, 10) : null;

  const sql = `
    INSERT INTO users (
      email, phone, password_hash, google_id, facebook_id, apple_id, first_name, last_name,
      gender, handedness, date_of_birth, profile_image, role, is_verified,
      phone_verified, auth_method
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    email,
    phone,
    password_hash,
    google_id || null,
    facebook_id || null,
    apple_id || null,
    first_name,
    last_name,
    gender,
    handedness || null,
    date_of_birth || null,
    profile_image || null,
    role,
    google_id || facebook_id || apple_id ? true : false, // Auto-verify OAuth users
    phone_verified,
    auth_method
  ]);

  return result.insertId;
};

/**
 * Find user by email
 */
const findByEmail = async (email) => {
  const sql = 'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL';
  const users = await query(sql, [email]);
  return users.length > 0 ? users[0] : null;
};

/**
 * Find user by phone (checks both with and without +91 prefix)
 */
const findByPhone = async (phone) => {
  // Normalize phone number - remove +91 prefix if present
  const normalizedPhone = phone.startsWith('+91') ? phone.substring(3) : phone;
  const phoneWithPrefix = phone.startsWith('+91') ? phone : `+91${phone}`;
  
  // Check for both formats: with and without +91
  const sql = 'SELECT * FROM users WHERE (phone = ? OR phone = ?) AND deleted_at IS NULL LIMIT 1';
  const users = await query(sql, [normalizedPhone, phoneWithPrefix]);
  return users.length > 0 ? users[0] : null;
};

/**
 * Find user by Google ID
 */
const findByGoogleId = async (googleId) => {
  const sql = 'SELECT * FROM users WHERE google_id = ? AND deleted_at IS NULL';
  const users = await query(sql, [googleId]);
  return users.length > 0 ? users[0] : null;
};

/**
 * Find user by Facebook ID
 */
const findByFacebookId = async (facebookId) => {
  const sql = 'SELECT * FROM users WHERE facebook_id = ? AND deleted_at IS NULL';
  const users = await query(sql, [facebookId]);
  return users.length > 0 ? users[0] : null;
};

/**
 * Find user by Apple ID
 */
const findByAppleId = async (appleId) => {
  const sql = 'SELECT * FROM users WHERE apple_id = ? AND deleted_at IS NULL';
  const users = await query(sql, [appleId]);
  return users.length > 0 ? users[0] : null;
};

/**
 * Find user by ID
 */
const findById = async (id) => {
  const sql = 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL';
  const users = await query(sql, [id]);
  return users.length > 0 ? users[0] : null;
};

/**
 * Update user
 */
const update = async (id, updateData) => {
  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'gender', 'handedness',
    'date_of_birth', 'profile_image', 'is_verified', 'is_active',
    'phone_verified', 'google_id', 'facebook_id', 'apple_id'
  ];

  const updates = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(updateData[key]);
    }
  });

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id);
  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  
  await query(sql, values);
  return findById(id);
};

/**
 * Update password
 */
const updatePassword = async (id, newPassword) => {
  const password_hash = await bcrypt.hash(newPassword, 10);
  const sql = 'UPDATE users SET password_hash = ? WHERE id = ?';
  await query(sql, [password_hash, id]);
};

/**
 * Verify password
 */
const verifyPassword = async (user, password) => {
  if (!user.password_hash) {
    return false;
  }
  return await bcrypt.compare(password, user.password_hash);
};

/**
 * Mark email as verified
 */
const markEmailVerified = async (id) => {
  const sql = 'UPDATE users SET is_verified = TRUE WHERE id = ?';
  await query(sql, [id]);
};

/**
 * Soft delete user
 */
const softDelete = async (id) => {
  const sql = 'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
  await query(sql, [id]);
};

/**
 * Mark phone as verified
 */
const markPhoneVerified = async (id) => {
  const sql = 'UPDATE users SET phone_verified = TRUE WHERE id = ?';
  await query(sql, [id]);
};

/**
 * Get user profile with sports
 */
const getProfileWithSports = async (userId) => {
  const userSql = `
    SELECT 
      u.id, u.email, u.phone, u.first_name, u.last_name, u.gender,
      u.handedness, u.date_of_birth, u.profile_image, u.role,
      u.is_verified, u.phone_verified, u.auth_method, u.created_at , u.updated_at
    FROM users u
    WHERE u.id = ? AND u.deleted_at IS NULL
  `;
  
  const sportsSql = `
    SELECT s.id, s.name, us.skill_level
    FROM user_sports us
    JOIN sports s ON us.sport_id = s.id
    WHERE us.user_id = ?
  `;

  const users = await query(userSql, [userId]);
  if (users.length === 0) return null;

  const user = users[0];
  const sports = await query(sportsSql, [userId]);
  
  return {
    ...user,
    sports
  };
};

/**
 * Check if email exists
 */
const emailExists = async (email, excludeUserId = null) => {
  let sql = 'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL';
  const params = [email];
  
  if (excludeUserId) {
    sql += ' AND id != ?';
    params.push(excludeUserId);
  }
  
  const users = await query(sql, params);
  return users.length > 0;
};

/**
 * Check if phone exists (checks both with and without +91 prefix)
 */
const phoneExists = async (phone, excludeUserId = null) => {
  // Normalize phone number - remove +91 prefix if present
  const normalizedPhone = phone.startsWith('+91') ? phone.substring(3) : phone;
  const phoneWithPrefix = phone.startsWith('+91') ? phone : `+91${phone}`;
  
  // Check for both formats: with and without +91
  let sql = 'SELECT id FROM users WHERE (phone = ? OR phone = ?) AND deleted_at IS NULL';
  const params = [normalizedPhone, phoneWithPrefix];
  
  if (excludeUserId) {
    sql += ' AND id != ?';
    params.push(excludeUserId);
  }
  
  const users = await query(sql, params);
  return users.length > 0;
};

/**
 * Find deleted user by phone (checks both with and without +91 prefix)
 */
const findDeletedByPhone = async (phone) => {
  // Normalize phone number - remove +91 prefix if present
  const normalizedPhone = phone.startsWith('+91') ? phone.substring(3) : phone;
  const phoneWithPrefix = phone.startsWith('+91') ? phone : `+91${phone}`;
  
  const sql = 'SELECT * FROM users WHERE (phone = ? OR phone = ?) AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 1';
  const users = await query(sql, [normalizedPhone, phoneWithPrefix]);
  return users.length > 0 ? users[0] : null;
};

/**
 * Find deleted user by email
 */
const findDeletedByEmail = async (email) => {
  const sql = 'SELECT * FROM users WHERE email = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 1';
  const users = await query(sql, [email]);
  return users.length > 0 ? users[0] : null;
};

/**
 * Recover deleted account
 */
const recoverAccount = async (id) => {
  const sql = 'UPDATE users SET deleted_at = NULL WHERE id = ?';
  await query(sql, [id]);
  return findById(id);
};

module.exports = {
  create,
  findByEmail,
  findByPhone,
  findByGoogleId,
  findByFacebookId,
  findByAppleId,
  findById,
  update,
  updatePassword,
  verifyPassword,
  markEmailVerified,
  markPhoneVerified,
  softDelete,
  getProfileWithSports,
  emailExists,
  phoneExists,
  findDeletedByPhone,
  findDeletedByEmail,
  recoverAccount
};

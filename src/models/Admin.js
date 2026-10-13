const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Create a new admin
 */
const create = async (adminData) => {
  const {
    email,
    phone,
    password,
    first_name,
    last_name,
    gender,
    profile_image,
    role = 'admin',
    permissions = null
  } = adminData;

  const password_hash = await bcrypt.hash(password, 10);

  const sql = `
    INSERT INTO admins (
      email, phone, password_hash, first_name, last_name,
      gender, profile_image, role, permissions, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    email,
    phone || null,
    password_hash,
    first_name,
    last_name,
    gender || null,
    profile_image || null,
    role,
    permissions ? JSON.stringify(permissions) : null,
    true // Admins are verified by default
  ]);

  return result.insertId;
};

/**
 * Find admin by email
 */
const findByEmail = async (email) => {
  const sql = 'SELECT * FROM admins WHERE email = ? AND deleted_at IS NULL';
  const admins = await query(sql, [email]);
  return admins.length > 0 ? admins[0] : null;
};

/**
 * Find admin by phone
 */
const findByPhone = async (phone) => {
  const normalizedPhone = phone.startsWith('+91') ? phone.substring(3) : phone;
  const phoneWithPrefix = phone.startsWith('+91') ? phone : `+91${phone}`;
  
  const sql = 'SELECT * FROM admins WHERE (phone = ? OR phone = ?) AND deleted_at IS NULL LIMIT 1';
  const admins = await query(sql, [normalizedPhone, phoneWithPrefix]);
  return admins.length > 0 ? admins[0] : null;
};

/**
 * Find admin by ID
 */
const findById = async (id) => {
  const sql = 'SELECT * FROM admins WHERE id = ? AND deleted_at IS NULL';
  const admins = await query(sql, [id]);
  return admins.length > 0 ? admins[0] : null;
};

/**
 * Update admin
 */
const update = async (id, updateData) => {
  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'gender',
    'profile_image', 'is_verified', 'is_active', 'permissions', 'role'
  ];

  const updates = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      if (key === 'permissions' && updateData[key]) {
        values.push(JSON.stringify(updateData[key]));
      } else {
        values.push(updateData[key]);
      }
    }
  });

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id);
  const sql = `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`;
  
  await query(sql, values);
  return findById(id);
};

/**
 * Update password
 */
const updatePassword = async (id, newPassword) => {
  const password_hash = await bcrypt.hash(newPassword, 10);
  const sql = 'UPDATE admins SET password_hash = ? WHERE id = ?';
  await query(sql, [password_hash, id]);
};

/**
 * Verify password
 */
const verifyPassword = async (admin, password) => {
  if (!admin.password_hash) {
    return false;
  }
  return await bcrypt.compare(password, admin.password_hash);
};

/**
 * Update last login
 */
const updateLastLogin = async (id, ipAddress) => {
  const sql = 'UPDATE admins SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?';
  await query(sql, [ipAddress, id]);
};

/**
 * Soft delete admin
 */
const softDelete = async (id) => {
  const sql = 'UPDATE admins SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
  await query(sql, [id]);
};

/**
 * Get admin profile
 */
const getProfile = async (adminId) => {
  const sql = `
    SELECT 
      id, email, phone, first_name, last_name, gender,
      profile_image, role, permissions, is_verified, is_active,
      last_login_at, last_login_ip, created_at, updated_at
    FROM admins
    WHERE id = ? AND deleted_at IS NULL
  `;
  
  const admins = await query(sql, [adminId]);
  if (admins.length === 0) return null;

  const admin = admins[0];
  
  // Parse permissions if exists
  if (admin.permissions) {
    try {
      admin.permissions = JSON.parse(admin.permissions);
    } catch (e) {
      admin.permissions = null;
    }
  }
  
  return admin;
};

/**
 * Check if email exists
 */
const emailExists = async (email, excludeAdminId = null) => {
  let sql = 'SELECT id FROM admins WHERE email = ? AND deleted_at IS NULL';
  const params = [email];
  
  if (excludeAdminId) {
    sql += ' AND id != ?';
    params.push(excludeAdminId);
  }
  
  const admins = await query(sql, params);
  return admins.length > 0;
};

/**
 * Check if phone exists
 */
const phoneExists = async (phone, excludeAdminId = null) => {
  const normalizedPhone = phone.startsWith('+91') ? phone.substring(3) : phone;
  const phoneWithPrefix = phone.startsWith('+91') ? phone : `+91${phone}`;
  
  let sql = 'SELECT id FROM admins WHERE (phone = ? OR phone = ?) AND deleted_at IS NULL';
  const params = [normalizedPhone, phoneWithPrefix];
  
  if (excludeAdminId) {
    sql += ' AND id != ?';
    params.push(excludeAdminId);
  }
  
  const admins = await query(sql, params);
  return admins.length > 0;
};

/**
 * Get all admins (for super admin)
 */
const getAll = async (filters = {}) => {
  let sql = `
    SELECT 
      id, email, phone, first_name, last_name, gender,
      profile_image, role, is_verified, is_active,
      last_login_at, created_at, updated_at
    FROM admins
    WHERE deleted_at IS NULL
  `;
  
  const params = [];
  
  if (filters.role) {
    sql += ' AND role = ?';
    params.push(filters.role);
  }
  
  if (filters.is_active !== undefined) {
    sql += ' AND is_active = ?';
    params.push(filters.is_active);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }
  
  return await query(sql, params);
};

/**
 * Count admins
 */
const count = async (filters = {}) => {
  let sql = 'SELECT COUNT(*) as total FROM admins WHERE deleted_at IS NULL';
  const params = [];
  
  if (filters.role) {
    sql += ' AND role = ?';
    params.push(filters.role);
  }
  
  if (filters.is_active !== undefined) {
    sql += ' AND is_active = ?';
    params.push(filters.is_active);
  }
  
  const result = await query(sql, params);
  return result[0].total;
};

module.exports = {
  create,
  findByEmail,
  findByPhone,
  findById,
  update,
  updatePassword,
  verifyPassword,
  updateLastLogin,
  softDelete,
  getProfile,
  emailExists,
  phoneExists,
  getAll,
  count
};

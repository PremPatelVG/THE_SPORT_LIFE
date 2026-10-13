const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Generate JWT tokens for admin
 */
const generateTokens = (admin) => {
  const payload = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    type: 'admin'
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { id: admin.id, type: 'admin' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Admin login with email and password
 */
const login = async (email, password, deviceInfo, ipAddress) => {
  const admin = await Admin.findByEmail(email);
  
  if (!admin) {
    throw new Error('Invalid email or password');
  }

  if (!admin.is_active) {
    throw new Error('Admin account is deactivated. Please contact super admin.');
  }

  const isPasswordValid = await Admin.verifyPassword(admin, password);
  
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const tokens = generateTokens(admin);

  await query(
    `INSERT INTO admin_sessions (admin_id, refresh_token, device_info, ip_address, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
    [admin.id, tokens.refreshToken, deviceInfo, ipAddress]
  );

  await Admin.updateLastLogin(admin.id, ipAddress);

  delete admin.password_hash;

  logger.info(`Admin login successful: ${admin.email} (ID: ${admin.id})`);

  return {
    message: 'Login successful',
    admin,
    tokens
  };
};

/**
 * Refresh access token
 */
const refreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'admin') {
      throw new Error('Invalid token type');
    }

    const sessions = await query(
      'SELECT * FROM admin_sessions WHERE refresh_token = ? AND expires_at > NOW()',
      [refreshToken]
    );

    if (sessions.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    const admin = await Admin.findById(decoded.id);
    
    if (!admin || !admin.is_active) {
      throw new Error('Admin not found or inactive');
    }

    const newAccessToken = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    return {
      message: 'Token refreshed successfully',
      accessToken: newAccessToken
    };
  } catch (error) {
    logger.error('Refresh token error:', error);
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Logout admin
 */
const logout = async (refreshToken) => {
  await query(
    'DELETE FROM admin_sessions WHERE refresh_token = ?',
    [refreshToken]
  );

  return { message: 'Logout successful' };
};

/**
 * Logout from all devices
 */
const logoutAll = async (adminId) => {
  await query(
    'DELETE FROM admin_sessions WHERE admin_id = ?',
    [adminId]
  );

  return { message: 'Logged out from all devices successfully' };
};

/**
 * Change password
 */
const changePassword = async (adminId, currentPassword, newPassword) => {
  const admin = await Admin.findById(adminId);
  
  if (!admin) {
    throw new Error('Admin not found');
  }

  const isPasswordValid = await Admin.verifyPassword(admin, currentPassword);
  
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long');
  }

  await Admin.updatePassword(adminId, newPassword);

  await query(
    'DELETE FROM admin_sessions WHERE admin_id = ?',
    [adminId]
  );

  logger.info(`Admin password changed: ${admin.email} (ID: ${admin.id})`);

  return { message: 'Password changed successfully. Please login again.' };
};

/**
 * Create new admin (only super_admin can create)
 */
const createAdmin = async (adminData, createdBy) => {
  const creator = await Admin.findById(createdBy);
  
  if (!creator || creator.role !== 'super_admin') {
    throw new Error('Only super admins can create new admins');
  }

  const { email, phone, password, first_name, last_name, gender, role } = adminData;

  if (!email || !password || !first_name || !last_name) {
    throw new Error('Email, password, first name, and last name are required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const emailExists = await Admin.emailExists(email);
  if (emailExists) {
    throw new Error('Email already exists');
  }

  if (phone) {
    const phoneExists = await Admin.phoneExists(phone);
    if (phoneExists) {
      throw new Error('Phone number already exists');
    }
  }

  const allowedRoles = ['admin', 'moderator'];
  const adminRole = allowedRoles.includes(role) ? role : 'admin';

  const adminId = await Admin.create({
    email,
    phone,
    password,
    first_name,
    last_name,
    gender,
    role: adminRole
  });

  const newAdmin = await Admin.findById(adminId);
  delete newAdmin.password_hash;

  logger.info(`New admin created: ${email} (ID: ${adminId}) by ${creator.email}`);

  return {
    message: 'Admin created successfully',
    admin: newAdmin
  };
};

/**
 * Update admin profile
 */
const updateProfile = async (adminId, updateData) => {
  const admin = await Admin.findById(adminId);
  
  if (!admin) {
    throw new Error('Admin not found');
  }

  if (updateData.email && updateData.email !== admin.email) {
    const emailExists = await Admin.emailExists(updateData.email, adminId);
    if (emailExists) {
      throw new Error('Email already exists');
    }
  }

  if (updateData.phone && updateData.phone !== admin.phone) {
    const phoneExists = await Admin.phoneExists(updateData.phone, adminId);
    if (phoneExists) {
      throw new Error('Phone number already exists');
    }
  }

  const updatedAdmin = await Admin.update(adminId, updateData);
  delete updatedAdmin.password_hash;

  return {
    message: 'Profile updated successfully',
    admin: updatedAdmin
  };
};

/**
 * Get all admins (super admin only)
 */
const getAllAdmins = async (requesterId, filters = {}) => {
  const requester = await Admin.findById(requesterId);
  
  if (!requester || requester.role !== 'super_admin') {
    throw new Error('Only super admins can view all admins');
  }

  const admins = await Admin.getAll(filters);
  
  return {
    message: 'Admins retrieved successfully',
    admins,
    total: admins.length
  };
};

/**
 * Update admin status (super admin only)
 */
const updateAdminStatus = async (requesterId, adminId, isActive) => {
  const requester = await Admin.findById(requesterId);
  
  if (!requester || requester.role !== 'super_admin') {
    throw new Error('Only super admins can update admin status');
  }

  if (requesterId === adminId) {
    throw new Error('Cannot deactivate your own account');
  }

  const admin = await Admin.update(adminId, { is_active: isActive });
  
  if (!isActive) {
    await query('DELETE FROM admin_sessions WHERE admin_id = ?', [adminId]);
  }

  logger.info(`Admin status updated: ${admin.email} (ID: ${adminId}) - Active: ${isActive}`);

  return {
    message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
    admin
  };
};

/**
 * Delete admin (super admin only)
 */
const deleteAdmin = async (requesterId, adminId) => {
  const requester = await Admin.findById(requesterId);
  
  if (!requester || requester.role !== 'super_admin') {
    throw new Error('Only super admins can delete admins');
  }

  if (requesterId === adminId) {
    throw new Error('Cannot delete your own account');
  }

  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw new Error('Admin not found');
  }

  if (admin.role === 'super_admin') {
    throw new Error('Cannot delete super admin account');
  }

  await Admin.softDelete(adminId);
  await query('DELETE FROM admin_sessions WHERE admin_id = ?', [adminId]);

  logger.info(`Admin deleted: ${admin.email} (ID: ${adminId}) by ${requester.email}`);

  return {
    message: 'Admin deleted successfully'
  };
};

module.exports = {
  login,
  refreshToken,
  logout,
  logoutAll,
  changePassword,
  createAdmin,
  updateProfile,
  getAllAdmins,
  updateAdminStatus,
  deleteAdmin,
  generateTokens
};

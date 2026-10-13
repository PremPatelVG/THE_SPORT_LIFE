const { query } = require('../config/database');

/**
 * Create payment record
 */
const create = async (paymentData) => {
  const sql = `
    INSERT INTO payments 
    (user_id, tournament_id, participant_id, amount, currency, payment_method, 
     payment_gateway_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    paymentData.user_id,
    paymentData.tournament_id,
    paymentData.participant_id || null,
    paymentData.amount,
    paymentData.currency || 'INR',
    paymentData.payment_method,
    paymentData.payment_gateway_id,
    paymentData.status || 'pending'
  ]);
  
  return result.insertId;
};

/**
 * Find payment by ID
 */
const findById = async (paymentId) => {
  const sql = `
    SELECT 
      p.*,
      u.first_name as user_first_name,
      u.last_name as user_last_name,
      u.email as user_email,
      t.name as tournament_name,
      t.entry_fee as tournament_entry_fee
    FROM payments p
    JOIN users u ON p.user_id = u.id
    JOIN tournaments t ON p.tournament_id = t.id
    WHERE p.id = ?
  `;
  
  const payments = await query(sql, [paymentId]);
  return payments[0] || null;
};

/**
 * Find payment by gateway ID
 */
const findByGatewayId = async (gatewayId) => {
  const sql = `
    SELECT * FROM payments
    WHERE payment_gateway_id = ?
  `;
  
  const payments = await query(sql, [gatewayId]);
  return payments[0] || null;
};

/**
 * Update payment status
 */
const updateStatus = async (paymentId, status, gatewayId = null) => {
  let sql = 'UPDATE payments SET status = ?';
  const params = [status];
  
  if (gatewayId) {
    sql += ', payment_gateway_id = ?';
    params.push(gatewayId);
  }
  
  sql += ' WHERE id = ?';
  params.push(paymentId);
  
  await query(sql, params);
};

/**
 * Get user payments
 */
const getUserPayments = async (userId, filters = {}) => {
  let sql = `
    SELECT 
      p.*,
      t.name as tournament_name,
      t.start_date as tournament_start_date
    FROM payments p
    JOIN tournaments t ON p.tournament_id = t.id
    WHERE p.user_id = ?
  `;
  
  const params = [userId];
  
  if (filters.status) {
    sql += ' AND p.status = ?';
    params.push(filters.status);
  }
  
  if (filters.tournament_id) {
    sql += ' AND p.tournament_id = ?';
    params.push(filters.tournament_id);
  }
  
  sql += ' ORDER BY p.transaction_date DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }
  
  return await query(sql, params);
};

/**
 * Get tournament payments
 */
const getTournamentPayments = async (tournamentId, filters = {}) => {
  let sql = `
    SELECT 
      p.*,
      u.first_name,
      u.last_name,
      u.email,
      tp.registration_date
    FROM payments p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN tournament_participants tp ON p.participant_id = tp.id
    WHERE p.tournament_id = ?
  `;
  
  const params = [tournamentId];
  
  if (filters.status) {
    sql += ' AND p.status = ?';
    params.push(filters.status);
  }
  
  sql += ' ORDER BY p.transaction_date DESC';
  
  return await query(sql, params);
};

/**
 * Process refund
 */
const processRefund = async (paymentId, refundAmount, refundReason, refundedBy) => {
  const sql = `
    UPDATE payments
    SET status = 'refunded',
        refunded_amount = ?,
        refund_date = NOW(),
        refund_reason = ?,
        refunded_by = ?
    WHERE id = ?
  `;
  
  await query(sql, [refundAmount, refundReason, refundedBy, paymentId]);
};

/**
 * Get payment statistics
 */
const getStatistics = async (filters = {}) => {
  let sql = `
    SELECT 
      COUNT(*) as total_payments,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_payments,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
      SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded_payments,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
      SUM(refunded_amount) as total_refunded
    FROM payments
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.tournament_id) {
    sql += ' AND tournament_id = ?';
    params.push(filters.tournament_id);
  }
  
  if (filters.user_id) {
    sql += ' AND user_id = ?';
    params.push(filters.user_id);
  }
  
  if (filters.start_date && filters.end_date) {
    sql += ' AND DATE(transaction_date) BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }
  
  const result = await query(sql, params);
  return result[0];
};

/**
 * Get wallet balance
 */
const getWalletBalance = async (userId) => {
  const sql = `
    SELECT * FROM tournament_creator_wallets
    WHERE user_id = ?
  `;
  
  const wallets = await query(sql, [userId]);
  return wallets[0] || null;
};

/**
 * Get wallet transactions
 */
const getWalletTransactions = async (userId, filters = {}) => {
  let sql = `
    SELECT 
      wt.*,
      t.name as tournament_name
    FROM wallet_transactions wt
    JOIN tournament_creator_wallets tcw ON wt.wallet_id = tcw.id
    LEFT JOIN tournaments t ON wt.tournament_id = t.id
    WHERE tcw.user_id = ?
  `;
  
  const params = [userId];
  
  if (filters.transaction_type) {
    sql += ' AND wt.transaction_type = ?';
    params.push(filters.transaction_type);
  }
  
  if (filters.start_date && filters.end_date) {
    sql += ' AND DATE(wt.created_at) BETWEEN ? AND ?';
    params.push(filters.start_date, filters.end_date);
  }
  
  sql += ' ORDER BY wt.created_at DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }
  
  return await query(sql, params);
};

/**
 * Request withdrawal
 */
const requestWithdrawal = async (userId, amount, bankDetails) => {
  const sql = `
    INSERT INTO wallet_transactions 
    (wallet_id, transaction_type, amount, description, balance_after)
    SELECT 
      id,
      'debit',
      ?,
      'Withdrawal request',
      balance - ?
    FROM tournament_creator_wallets
    WHERE user_id = ? AND balance >= ?
  `;
  
  const result = await query(sql, [amount, amount, userId, amount]);
  
  if (result.affectedRows === 0) {
    throw new Error('Insufficient balance or wallet not found');
  }
  
  // Update wallet balance
  await query(
    'UPDATE tournament_creator_wallets SET balance = balance - ?, total_withdrawn = total_withdrawn + ? WHERE user_id = ?',
    [amount, amount, userId]
  );
  
  return result.insertId;
};

/**
 * Get prize distribution
 */
const getPrizeDistribution = async (tournamentId) => {
  const sql = `
    SELECT 
      pd.*,
      tp.user_id,
      u.first_name,
      u.last_name,
      u.email
    FROM prize_distribution pd
    LEFT JOIN tournament_participants tp ON pd.participant_id = tp.id
    LEFT JOIN users u ON tp.user_id = u.id
    WHERE pd.tournament_id = ?
    ORDER BY pd.position
  `;
  
  return await query(sql, [tournamentId]);
};

/**
 * Create prize distribution
 */
const createPrizeDistribution = async (prizeData) => {
  const sql = `
    INSERT INTO prize_distribution 
    (tournament_id, position, position_name, prize_amount, participant_id, payment_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const result = await query(sql, [
    prizeData.tournament_id,
    prizeData.position,
    prizeData.position_name,
    prizeData.prize_amount,
    prizeData.participant_id || null,
    prizeData.payment_status || 'pending'
  ]);
  
  return result.insertId;
};

/**
 * Update prize distribution
 */
const updatePrizeDistribution = async (prizeId, updateData) => {
  const fields = [];
  const values = [];
  
  if (updateData.participant_id !== undefined) {
    fields.push('participant_id = ?');
    values.push(updateData.participant_id);
  }
  
  if (updateData.payment_status) {
    fields.push('payment_status = ?');
    values.push(updateData.payment_status);
  }
  
  if (updateData.payment_reference) {
    fields.push('payment_reference = ?');
    values.push(updateData.payment_reference);
  }
  
  if (updateData.payment_status === 'paid') {
    fields.push('paid_at = NOW()');
  }
  
  if (fields.length === 0) return;
  
  values.push(prizeId);
  const sql = `UPDATE prize_distribution SET ${fields.join(', ')} WHERE id = ?`;
  
  await query(sql, values);
};

module.exports = {
  create,
  findById,
  findByGatewayId,
  updateStatus,
  getUserPayments,
  getTournamentPayments,
  processRefund,
  getStatistics,
  getWalletBalance,
  getWalletTransactions,
  requestWithdrawal,
  getPrizeDistribution,
  createPrizeDistribution,
  updatePrizeDistribution
};

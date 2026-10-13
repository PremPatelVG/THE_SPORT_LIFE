const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create payment intent for tournament registration
 */
const createPaymentIntent = async (userId, tournamentId, participantId) => {
  try {
    // Get tournament details
    const tournaments = await query('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
    
    if (tournaments.length === 0) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournaments[0];
    
    if (tournament.entry_fee <= 0) {
      throw new Error('This tournament is free, no payment required');
    }
    
    // Check if user already paid
    const existingPayments = await query(
      'SELECT * FROM payments WHERE user_id = ? AND tournament_id = ? AND status IN ("completed", "pending")',
      [userId, tournamentId]
    );
    
    if (existingPayments.length > 0) {
      throw new Error('Payment already exists for this tournament');
    }
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(tournament.entry_fee * 100), // Convert to cents
      currency: 'inr',
      metadata: {
        user_id: userId,
        tournament_id: tournamentId,
        participant_id: participantId || '',
        tournament_name: tournament.name
      },
      description: `Registration for ${tournament.name}`
    });
    
    // Create payment record
    const paymentId = await Payment.create({
      user_id: userId,
      tournament_id: tournamentId,
      participant_id: participantId,
      amount: tournament.entry_fee,
      currency: 'INR',
      payment_method: 'stripe',
      payment_gateway_id: paymentIntent.id,
      status: 'pending'
    });
    
    logger.info(`Payment intent created: ${paymentIntent.id} for user ${userId}`);
    
    return {
      payment_id: paymentId,
      client_secret: paymentIntent.client_secret,
      amount: tournament.entry_fee,
      currency: 'INR'
    };
  } catch (error) {
    logger.error('Create payment intent error:', error);
    throw error;
  }
};

/**
 * Confirm payment
 */
const confirmPayment = async (paymentIntentId) => {
  try {
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Find payment in database
    const payment = await Payment.findByGatewayId(paymentIntentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status === 'completed') {
      return { success: true, message: 'Payment already completed', payment };
    }
    
    // Update payment status based on Stripe status
    if (paymentIntent.status === 'succeeded') {
      await transaction(async (conn) => {
        // Update payment status
        await conn.query(
          'UPDATE payments SET status = "completed" WHERE id = ?',
          [payment.id]
        );
        
        // Update participant payment status
        if (payment.participant_id) {
          await conn.query(
            'UPDATE tournament_participants SET payment_status = "paid" WHERE id = ?',
            [payment.participant_id]
          );
        }
        
        // Update tournament total collected
        await conn.query(
          'UPDATE tournaments SET total_collected = total_collected + ? WHERE id = ?',
          [payment.amount, payment.tournament_id]
        );
      });
      
      logger.info(`Payment confirmed: ${payment.id}`);
      
      return {
        success: true,
        message: 'Payment completed successfully',
        payment: await Payment.findById(payment.id)
      };
    } else {
      await Payment.updateStatus(payment.id, 'failed');
      throw new Error(`Payment ${paymentIntent.status}`);
    }
  } catch (error) {
    logger.error('Confirm payment error:', error);
    throw error;
  }
};

/**
 * Handle Stripe webhook
 */
const handleStripeWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await confirmPayment(event.data.object.id);
        break;
        
      case 'payment_intent.payment_failed':
        const payment = await Payment.findByGatewayId(event.data.object.id);
        if (payment) {
          await Payment.updateStatus(payment.id, 'failed');
          logger.info(`Payment failed: ${payment.id}`);
        }
        break;
        
      case 'charge.refunded':
        const refundedPayment = await Payment.findByGatewayId(event.data.object.payment_intent);
        if (refundedPayment) {
          await Payment.processRefund(
            refundedPayment.id,
            event.data.object.amount_refunded / 100,
            'Refunded via Stripe',
            null
          );
          logger.info(`Payment refunded: ${refundedPayment.id}`);
        }
        break;
        
      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }
    
    return { received: true };
  } catch (error) {
    logger.error('Webhook handling error:', error);
    throw error;
  }
};

/**
 * Process refund
 */
const processRefund = async (paymentId, refundAmount, refundReason, refundedBy) => {
  try {
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status !== 'completed') {
      throw new Error('Can only refund completed payments');
    }
    
    if (refundAmount > payment.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }
    
    // Process refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.payment_gateway_id,
      amount: Math.round(refundAmount * 100) // Convert to cents
    });
    
    // Update database
    await transaction(async (conn) => {
      // Update payment
      await conn.query(
        `UPDATE payments 
         SET status = 'refunded', refunded_amount = ?, refund_date = NOW(), 
             refund_reason = ?, refunded_by = ?
         WHERE id = ?`,
        [refundAmount, refundReason, refundedBy, paymentId]
      );
      
      // Update participant status if full refund
      if (refundAmount === payment.amount && payment.participant_id) {
        await conn.query(
          'UPDATE tournament_participants SET payment_status = "refunded" WHERE id = ?',
          [payment.participant_id]
        );
      }
      
      // Update tournament total collected
      await conn.query(
        'UPDATE tournaments SET total_collected = total_collected - ? WHERE id = ?',
        [refundAmount, payment.tournament_id]
      );
    });
    
    logger.info(`Refund processed: ${paymentId}, amount: ${refundAmount}`);
    
    return {
      success: true,
      message: 'Refund processed successfully',
      refund_id: refund.id,
      amount: refundAmount
    };
  } catch (error) {
    logger.error('Process refund error:', error);
    throw error;
  }
};

/**
 * Get payment details
 */
const getPaymentDetails = async (paymentId, userId) => {
  try {
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // Check if user has access to this payment
    if (payment.user_id !== userId) {
      // Check if user is tournament organizer
      const tournaments = await query(
        'SELECT organizer_id FROM tournaments WHERE id = ?',
        [payment.tournament_id]
      );
      
      if (tournaments.length === 0 || tournaments[0].organizer_id !== userId) {
        // Check if user is admin
        const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
        if (!users[0] || users[0].role !== 'admin') {
          throw new Error('Access denied');
        }
      }
    }
    
    return payment;
  } catch (error) {
    logger.error('Get payment details error:', error);
    throw error;
  }
};

/**
 * Get user payments
 */
const getUserPayments = async (userId, filters = {}) => {
  try {
    return await Payment.getUserPayments(userId, filters);
  } catch (error) {
    logger.error('Get user payments error:', error);
    throw error;
  }
};

/**
 * Get tournament payments
 */
const getTournamentPayments = async (tournamentId, userId, filters = {}) => {
  try {
    // Check if user is organizer or admin
    const tournaments = await query(
      'SELECT organizer_id FROM tournaments WHERE id = ?',
      [tournamentId]
    );
    
    if (tournaments.length === 0) {
      throw new Error('Tournament not found');
    }
    
    if (tournaments[0].organizer_id !== userId) {
      const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
      if (!users[0] || users[0].role !== 'admin') {
        throw new Error('Access denied');
      }
    }
    
    return await Payment.getTournamentPayments(tournamentId, filters);
  } catch (error) {
    logger.error('Get tournament payments error:', error);
    throw error;
  }
};

/**
 * Get payment statistics
 */
const getPaymentStatistics = async (filters = {}) => {
  try {
    return await Payment.getStatistics(filters);
  } catch (error) {
    logger.error('Get payment statistics error:', error);
    throw error;
  }
};

/**
 * Get wallet balance
 */
const getWalletBalance = async (userId) => {
  try {
    const wallet = await Payment.getWalletBalance(userId);
    
    if (!wallet) {
      // Create wallet if doesn't exist
      await query(
        'INSERT INTO tournament_creator_wallets (user_id, balance, total_earned, total_withdrawn) VALUES (?, 0, 0, 0)',
        [userId]
      );
      
      return {
        user_id: userId,
        balance: 0,
        total_earned: 0,
        total_withdrawn: 0
      };
    }
    
    return wallet;
  } catch (error) {
    logger.error('Get wallet balance error:', error);
    throw error;
  }
};

/**
 * Get wallet transactions
 */
const getWalletTransactions = async (userId, filters = {}) => {
  try {
    return await Payment.getWalletTransactions(userId, filters);
  } catch (error) {
    logger.error('Get wallet transactions error:', error);
    throw error;
  }
};

/**
 * Request withdrawal
 */
const requestWithdrawal = async (userId, amount, bankDetails) => {
  try {
    const wallet = await Payment.getWalletBalance(userId);
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }
    
    if (amount < 100) {
      throw new Error('Minimum withdrawal amount is ₹100');
    }
    
    // Verify bank details
    if (!wallet.bank_account_verified) {
      throw new Error('Please verify your bank account first');
    }
    
    const transactionId = await Payment.requestWithdrawal(userId, amount, bankDetails);
    
    logger.info(`Withdrawal requested: ${transactionId}, amount: ${amount}`);
    
    // TODO: Integrate with payment gateway for payout
    
    return {
      success: true,
      message: 'Withdrawal request submitted successfully',
      transaction_id: transactionId,
      amount,
      estimated_processing_time: '3-5 business days'
    };
  } catch (error) {
    logger.error('Request withdrawal error:', error);
    throw error;
  }
};

/**
 * Get prize distribution
 */
const getPrizeDistribution = async (tournamentId) => {
  try {
    return await Payment.getPrizeDistribution(tournamentId);
  } catch (error) {
    logger.error('Get prize distribution error:', error);
    throw error;
  }
};

/**
 * Create prize distribution
 */
const createPrizeDistribution = async (tournamentId, prizeData, userId) => {
  try {
    // Check if user is organizer or admin
    const tournaments = await query(
      'SELECT organizer_id, status FROM tournaments WHERE id = ?',
      [tournamentId]
    );
    
    if (tournaments.length === 0) {
      throw new Error('Tournament not found');
    }
    
    if (tournaments[0].organizer_id !== userId) {
      const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
      if (!users[0] || users[0].role !== 'admin') {
        throw new Error('Only tournament organizer can create prize distribution');
      }
    }
    
    if (tournaments[0].status !== 'completed') {
      throw new Error('Can only distribute prizes for completed tournaments');
    }
    
    const prizeId = await Payment.createPrizeDistribution({
      tournament_id: tournamentId,
      ...prizeData
    });
    
    logger.info(`Prize distribution created: ${prizeId} for tournament ${tournamentId}`);
    
    return {
      success: true,
      prize_id: prizeId,
      message: 'Prize distribution created successfully'
    };
  } catch (error) {
    logger.error('Create prize distribution error:', error);
    throw error;
  }
};

/**
 * Distribute prize
 */
const distributePrize = async (prizeId, userId) => {
  try {
    const prizes = await query('SELECT * FROM prize_distribution WHERE id = ?', [prizeId]);
    
    if (prizes.length === 0) {
      throw new Error('Prize distribution not found');
    }
    
    const prize = prizes[0];
    
    if (prize.payment_status === 'paid') {
      throw new Error('Prize already distributed');
    }
    
    if (!prize.participant_id) {
      throw new Error('No participant assigned to this prize');
    }
    
    // Check authorization
    const tournaments = await query(
      'SELECT organizer_id FROM tournaments WHERE id = ?',
      [prize.tournament_id]
    );
    
    if (tournaments[0].organizer_id !== userId) {
      const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
      if (!users[0] || users[0].role !== 'admin') {
        throw new Error('Access denied');
      }
    }
    
    // TODO: Integrate with payment gateway for payout to winner
    
    // Update prize status
    await Payment.updatePrizeDistribution(prizeId, {
      payment_status: 'paid',
      payment_reference: `PRIZE_${Date.now()}`
    });
    
    logger.info(`Prize distributed: ${prizeId}`);
    
    return {
      success: true,
      message: 'Prize distributed successfully',
      amount: prize.prize_amount
    };
  } catch (error) {
    logger.error('Distribute prize error:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  handleStripeWebhook,
  processRefund,
  getPaymentDetails,
  getUserPayments,
  getTournamentPayments,
  getPaymentStatistics,
  getWalletBalance,
  getWalletTransactions,
  requestWithdrawal,
  getPrizeDistribution,
  createPrizeDistribution,
  distributePrize
};

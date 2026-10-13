const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create payment intent
 * POST /api/v1/payments/create-intent
 */
const createPaymentIntent = async (req, res) => {
  try {
    const { tournament_id, participant_id } = req.body;
    const userId = req.user.id;

    if (!tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'tournament_id is required'
      });
    }

    const result = await paymentService.createPaymentIntent(userId, tournament_id, participant_id);

    res.json({
      success: true,
      data: result,
      message: 'Payment intent created successfully'
    });
  } catch (error) {
    logger.error('Create payment intent error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('already') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Confirm payment
 * POST /api/v1/payments/confirm
 */
const confirmPayment = async (req, res) => {
  try {
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_intent_id is required'
      });
    }

    const result = await paymentService.confirmPayment(payment_intent_id);

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Confirm payment error:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Stripe webhook handler
 * POST /api/v1/payments/webhook
 */
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await paymentService.handleStripeWebhook(event);
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handling error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Process refund
 * POST /api/v1/payments/:paymentId/refund
 */
const processRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { refund_amount, refund_reason } = req.body;
    const refundedBy = req.user.id;

    if (!refund_amount) {
      return res.status(400).json({
        success: false,
        error: 'refund_amount is required'
      });
    }

    const result = await paymentService.processRefund(
      paymentId,
      refund_amount,
      refund_reason,
      refundedBy
    );

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Process refund error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('Can only') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get payment details
 * GET /api/v1/payments/:paymentId
 */
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await paymentService.getPaymentDetails(paymentId, userId);

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    logger.error('Get payment details error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('Access denied') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get user payments
 * GET /api/v1/payments/user/me
 */
const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      status: req.query.status,
      tournament_id: req.query.tournament_id,
      limit: req.query.limit
    };

    const payments = await paymentService.getUserPayments(userId, filters);

    res.json({
      success: true,
      data: payments,
      total: payments.length
    });
  } catch (error) {
    logger.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get tournament payments
 * GET /api/v1/payments/tournament/:tournamentId
 */
const getTournamentPayments = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.id;
    const filters = {
      status: req.query.status
    };

    const payments = await paymentService.getTournamentPayments(tournamentId, userId, filters);

    res.json({
      success: true,
      data: payments,
      total: payments.length
    });
  } catch (error) {
    logger.error('Get tournament payments error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('Access denied') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get payment statistics
 * GET /api/v1/payments/statistics
 */
const getPaymentStatistics = async (req, res) => {
  try {
    const filters = {
      tournament_id: req.query.tournament_id,
      user_id: req.query.user_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const statistics = await paymentService.getPaymentStatistics(filters);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get payment statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get wallet balance
 * GET /api/v1/payments/wallet/balance
 */
const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallet = await paymentService.getWalletBalance(userId);

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    logger.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get wallet transactions
 * GET /api/v1/payments/wallet/transactions
 */
const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      transaction_type: req.query.transaction_type,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit
    };

    const transactions = await paymentService.getWalletTransactions(userId, filters);

    res.json({
      success: true,
      data: transactions,
      total: transactions.length
    });
  } catch (error) {
    logger.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Request withdrawal
 * POST /api/v1/payments/wallet/withdraw
 */
const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bank_details } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'amount is required'
      });
    }

    const result = await paymentService.requestWithdrawal(userId, amount, bank_details);

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Request withdrawal error:', error);
    res.status(error.message.includes('Insufficient') ? 400 : 
               error.message.includes('Minimum') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get prize distribution
 * GET /api/v1/payments/prizes/:tournamentId
 */
const getPrizeDistribution = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const prizes = await paymentService.getPrizeDistribution(tournamentId);

    res.json({
      success: true,
      data: prizes
    });
  } catch (error) {
    logger.error('Get prize distribution error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create prize distribution
 * POST /api/v1/payments/prizes/:tournamentId
 */
const createPrizeDistribution = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const prizeData = req.body;
    const userId = req.user.id;

    if (!prizeData.position || !prizeData.prize_amount) {
      return res.status(400).json({
        success: false,
        error: 'position and prize_amount are required'
      });
    }

    const result = await paymentService.createPrizeDistribution(tournamentId, prizeData, userId);

    res.status(201).json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Create prize distribution error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('Only tournament') ? 403 : 500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Distribute prize
 * POST /api/v1/payments/prizes/:prizeId/distribute
 */
const distributePrize = async (req, res) => {
  try {
    const { prizeId } = req.params;
    const userId = req.user.id;

    const result = await paymentService.distributePrize(prizeId, userId);

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Distribute prize error:', error);
    res.status(error.message.includes('not found') ? 404 : 
               error.message.includes('Access denied') ? 403 :
               error.message.includes('already') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
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

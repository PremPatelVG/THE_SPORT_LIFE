const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// Stripe webhook (no auth - verified by Stripe signature)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Payment intent & confirmation
router.post('/create-intent', auth, paymentController.createPaymentIntent);
router.post('/confirm', auth, paymentController.confirmPayment);

// Payment details & management
router.get('/:paymentId', auth, paymentController.getPaymentDetails);
router.post('/:paymentId/refund', auth, paymentController.processRefund);

// User payments
router.get('/user/me', auth, paymentController.getUserPayments);

// Tournament payments
router.get('/tournament/:tournamentId', auth, paymentController.getTournamentPayments);

// Statistics
router.get('/statistics/all', auth, paymentController.getPaymentStatistics);

// Wallet management
router.get('/wallet/balance', auth, paymentController.getWalletBalance);
router.get('/wallet/transactions', auth, paymentController.getWalletTransactions);
router.post('/wallet/withdraw', auth, paymentController.requestWithdrawal);

// Prize distribution
router.get('/prizes/:tournamentId', auth, paymentController.getPrizeDistribution);
router.post('/prizes/:tournamentId', auth, paymentController.createPrizeDistribution);
router.post('/prizes/:prizeId/distribute', auth, paymentController.distributePrize);

module.exports = router;

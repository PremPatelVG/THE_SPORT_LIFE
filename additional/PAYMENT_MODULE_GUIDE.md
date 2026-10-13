# 💳 Payment System Module - Complete Guide

## Overview

The Payment System module provides comprehensive payment processing with Stripe integration, wallet management, refunds, and prize distribution for tournament management.

## 📁 Module Structure

```
src/
├── models/
│   └── Payment.js                 # Database operations
├── services/
│   └── paymentService.js          # Business logic (function-based) + Stripe
├── controllers/
│   └── paymentController.js       # HTTP request handlers
└── routes/
    └── payment.routes.js          # API route definitions
```

## 🗄️ Database Tables

### 1. **payments**
Main payment transactions table.

```sql
- id
- user_id
- tournament_id
- participant_id
- amount
- currency (default: INR)
- payment_method
- payment_gateway_id (Stripe payment intent ID)
- status (pending, completed, failed, refunded)
- transaction_date
- refund_date
- refund_reason
- refunded_amount
- refunded_by
```

### 2. **tournament_creator_wallets**
Organizer earnings wallet.

```sql
- id
- user_id (UNIQUE)
- balance
- total_earned
- total_withdrawn
- bank_account_verified
- bank_details (JSON)
```

### 3. **wallet_transactions**
Transaction history for wallets.

```sql
- id
- wallet_id
- tournament_id
- payment_id
- participant_id
- transaction_type (credit, debit)
- amount
- commission_percentage
- description
- balance_after
```

### 4. **prize_distribution**
Prize money distribution tracking.

```sql
- id
- tournament_id
- position (1st, 2nd, 3rd, etc.)
- position_name
- prize_amount
- participant_id
- payment_status (pending, processing, paid)
- paid_at
- payment_reference
```

## 🚀 API Endpoints

### 1. Create Payment Intent
```http
POST /api/v1/payments/create-intent
Authorization: Bearer <token>

Request Body:
{
  "tournament_id": 123,
  "participant_id": 456
}

Response:
{
  "success": true,
  "data": {
    "payment_id": 789,
    "client_secret": "pi_xxx_secret_xxx",
    "amount": 500.00,
    "currency": "INR"
  },
  "message": "Payment intent created successfully"
}
```

**Use Case:** User initiates tournament registration payment.

### 2. Confirm Payment
```http
POST /api/v1/payments/confirm
Authorization: Bearer <token>

Request Body:
{
  "payment_intent_id": "pi_xxx"
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Payment completed successfully",
    "payment": {
      "id": 789,
      "status": "completed",
      "amount": 500.00
    }
  },
  "message": "Payment completed successfully"
}
```

**Use Case:** Confirm payment after Stripe processing.

### 3. Stripe Webhook
```http
POST /api/v1/payments/webhook
Stripe-Signature: <signature>

Request Body: (Stripe event object)

Response:
{
  "received": true
}
```

**Events Handled:**
- `payment_intent.succeeded` - Auto-confirm payment
- `payment_intent.payment_failed` - Mark as failed
- `charge.refunded` - Process refund

### 4. Process Refund
```http
POST /api/v1/payments/:paymentId/refund
Authorization: Bearer <token>

Request Body:
{
  "refund_amount": 500.00,
  "refund_reason": "Tournament cancelled"
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Refund processed successfully",
    "refund_id": "re_xxx",
    "amount": 500.00
  },
  "message": "Refund processed successfully"
}
```

**Authorization:** Tournament organizer or admin

### 5. Get Payment Details
```http
GET /api/v1/payments/:paymentId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": 789,
    "user_id": 123,
    "tournament_id": 456,
    "amount": 500.00,
    "currency": "INR",
    "status": "completed",
    "transaction_date": "2025-10-15T10:00:00Z",
    "user_first_name": "John",
    "user_last_name": "Doe",
    "tournament_name": "Summer Championship"
  }
}
```

### 6. Get User Payments
```http
GET /api/v1/payments/user/me?status=completed&limit=20
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 789,
      "tournament_name": "Summer Championship",
      "amount": 500.00,
      "status": "completed",
      "transaction_date": "2025-10-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

**Query Parameters:**
- `status` - Filter by status
- `tournament_id` - Filter by tournament
- `limit` - Limit results

### 7. Get Tournament Payments
```http
GET /api/v1/payments/tournament/:tournamentId?status=completed
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 789,
      "user_id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "amount": 500.00,
      "status": "completed",
      "transaction_date": "2025-10-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

**Authorization:** Tournament organizer or admin

### 8. Get Payment Statistics
```http
GET /api/v1/payments/statistics/all?tournament_id=123
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total_payments": 50,
    "completed_payments": 45,
    "pending_payments": 3,
    "failed_payments": 1,
    "refunded_payments": 1,
    "total_amount": 25000.00,
    "total_refunded": 500.00
  }
}
```

**Query Parameters:**
- `tournament_id` - Filter by tournament
- `user_id` - Filter by user
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)

### 9. Get Wallet Balance
```http
GET /api/v1/payments/wallet/balance
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "user_id": 123,
    "balance": 15000.00,
    "total_earned": 20000.00,
    "total_withdrawn": 5000.00,
    "bank_account_verified": true
  }
}
```

### 10. Get Wallet Transactions
```http
GET /api/v1/payments/wallet/transactions?transaction_type=credit&limit=50
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tournament_name": "Summer Championship",
      "transaction_type": "credit",
      "amount": 450.00,
      "commission_percentage": 10.00,
      "description": "Registration fee from tournament #123",
      "balance_after": 15000.00,
      "created_at": "2025-10-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

**Query Parameters:**
- `transaction_type` - credit or debit
- `start_date` - Start date
- `end_date` - End date
- `limit` - Limit results

### 11. Request Withdrawal
```http
POST /api/v1/payments/wallet/withdraw
Authorization: Bearer <token>

Request Body:
{
  "amount": 5000.00,
  "bank_details": {
    "account_number": "1234567890",
    "ifsc_code": "ABCD0123456",
    "account_holder_name": "John Doe"
  }
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Withdrawal request submitted successfully",
    "transaction_id": 123,
    "amount": 5000.00,
    "estimated_processing_time": "3-5 business days"
  },
  "message": "Withdrawal request submitted successfully"
}
```

**Requirements:**
- Minimum withdrawal: ₹100
- Bank account must be verified
- Sufficient balance

### 12. Get Prize Distribution
```http
GET /api/v1/payments/prizes/:tournamentId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tournament_id": 123,
      "position": 1,
      "position_name": "Winner",
      "prize_amount": 10000.00,
      "participant_id": 456,
      "user_id": 789,
      "first_name": "John",
      "last_name": "Doe",
      "payment_status": "paid",
      "paid_at": "2025-10-20T15:00:00Z"
    }
  ]
}
```

### 13. Create Prize Distribution
```http
POST /api/v1/payments/prizes/:tournamentId
Authorization: Bearer <token>

Request Body:
{
  "position": 1,
  "position_name": "Winner",
  "prize_amount": 10000.00,
  "participant_id": 456
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "prize_id": 1,
    "message": "Prize distribution created successfully"
  },
  "message": "Prize distribution created successfully"
}
```

**Authorization:** Tournament organizer or admin
**Requirement:** Tournament must be completed

### 14. Distribute Prize
```http
POST /api/v1/payments/prizes/:prizeId/distribute
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "success": true,
    "message": "Prize distributed successfully",
    "amount": 10000.00
  },
  "message": "Prize distributed successfully"
}
```

**Authorization:** Tournament organizer or admin

## 💰 Payment Flow

### Tournament Registration Payment Flow

```
1. User registers for tournament
   ↓
2. Frontend calls /api/v1/payments/create-intent
   ↓
3. Backend creates Stripe PaymentIntent
   ↓
4. Backend creates payment record (status: pending)
   ↓
5. Frontend receives client_secret
   ↓
6. Frontend shows Stripe payment form
   ↓
7. User completes payment
   ↓
8. Stripe sends webhook to /api/v1/payments/webhook
   ↓
9. Backend updates payment status to "completed"
   ↓
10. Backend updates participant payment_status to "paid"
    ↓
11. Backend updates tournament total_collected
    ↓
12. Backend credits organizer wallet (minus commission)
```

### Wallet & Commission Flow

```
Payment Completed (₹500)
    ↓
Platform Commission (10%) = ₹50
Organizer Amount (90%) = ₹450
    ↓
Organizer Wallet Balance += ₹450
    ↓
Wallet Transaction Created (credit)
```

### Refund Flow

```
1. Organizer/Admin initiates refund
   ↓
2. Backend validates refund eligibility
   ↓
3. Backend creates Stripe refund
   ↓
4. Backend updates payment status to "refunded"
   ↓
5. Backend updates participant payment_status
   ↓
6. Backend decreases tournament total_collected
   ↓
7. Stripe processes refund (3-5 business days)
```

## 🔐 Security

### Stripe Integration
- ✅ Webhook signature verification
- ✅ Secure API key storage (environment variables)
- ✅ Payment intent confirmation
- ✅ Idempotency for duplicate requests

### Authorization
- ✅ JWT authentication required
- ✅ User can view own payments
- ✅ Organizer can view tournament payments
- ✅ Admin has full access
- ✅ Refunds require organizer/admin role

### Data Protection
- ✅ Sensitive data encrypted
- ✅ Bank details stored securely
- ✅ PCI DSS compliance via Stripe
- ✅ No card details stored locally

## 🧪 Testing

### Test Mode Setup
```bash
# Use Stripe test keys in .env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

### Test Cards (Stripe)
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
```

### Testing Webhooks Locally
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/v1/payments/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
```

### Manual Testing Flow
```bash
# 1. Create payment intent
curl -X POST http://localhost:3000/api/v1/payments/create-intent \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tournament_id": 123, "participant_id": 456}'

# 2. Confirm payment (after Stripe processing)
curl -X POST http://localhost:3000/api/v1/payments/confirm \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payment_intent_id": "pi_xxx"}'

# 3. Get user payments
curl -X GET http://localhost:3000/api/v1/payments/user/me \
  -H "Authorization: Bearer TOKEN"
```

## 📊 Commission Structure

### Default Configuration
```javascript
Platform Commission: 10%
Organizer Earnings: 90%

Example:
Entry Fee: ₹500
Platform Commission: ₹50
Organizer Receives: ₹450
```

### Configurable Per Tournament
Set `platform_commission_percent` in tournaments table.

## 🔄 Automatic Triggers

### Database Triggers (Already in Schema)

#### 1. **trg_update_wallet_on_payment**
Automatically credits organizer wallet when payment is completed.

```sql
AFTER UPDATE ON payments
- Checks if status changed to 'completed'
- Calculates organizer amount (minus commission)
- Updates tournament_creator_wallets
- Creates wallet_transaction record
```

## 💡 Use Cases

### Use Case 1: Tournament Registration
```javascript
// 1. User clicks "Register & Pay"
POST /api/v1/payments/create-intent
{
  "tournament_id": 123,
  "participant_id": 456
}

// 2. Show Stripe payment form with client_secret
// 3. User completes payment
// 4. Webhook auto-confirms payment
// 5. User is registered and paid
```

### Use Case 2: Tournament Cancellation Refund
```javascript
// 1. Organizer cancels tournament
// 2. Organizer issues refunds to all participants
POST /api/v1/payments/789/refund
{
  "refund_amount": 500.00,
  "refund_reason": "Tournament cancelled"
}

// 3. Stripe processes refund
// 4. Participants receive money back
```

### Use Case 3: Organizer Withdrawal
```javascript
// 1. Check wallet balance
GET /api/v1/payments/wallet/balance

// 2. Request withdrawal
POST /api/v1/payments/wallet/withdraw
{
  "amount": 5000.00,
  "bank_details": {...}
}

// 3. Admin processes payout
// 4. Money transferred to bank account
```

### Use Case 4: Prize Distribution
```javascript
// 1. Tournament completes
// 2. Organizer creates prize distribution
POST /api/v1/payments/prizes/123
{
  "position": 1,
  "position_name": "Winner",
  "prize_amount": 10000.00,
  "participant_id": 456
}

// 3. Organizer distributes prize
POST /api/v1/payments/prizes/1/distribute

// 4. Winner receives prize money
```

## 🚨 Error Handling

| Error | Status | Cause |
|-------|--------|-------|
| Tournament not found | 404 | Invalid tournament ID |
| Payment already exists | 400 | Duplicate payment |
| Can only refund completed payments | 400 | Invalid status |
| Insufficient balance | 400 | Wallet balance too low |
| Minimum withdrawal amount is ₹100 | 400 | Amount too small |
| Access denied | 403 | Unauthorized access |
| Stripe API error | 500 | Payment gateway issue |

## 🎯 Future Enhancements

- [ ] Multiple payment gateways (Razorpay, PayPal)
- [ ] Subscription-based tournaments
- [ ] Installment payments
- [ ] Cryptocurrency support
- [ ] Automated prize distribution
- [ ] Tax invoice generation
- [ ] Payment analytics dashboard
- [ ] Fraud detection system

## 📝 Notes

- All amounts in database are in decimal format (10,2)
- Currency defaults to INR but can be changed
- Stripe handles currency conversion
- Webhook endpoint must be publicly accessible
- Test mode doesn't charge real money
- Refunds take 3-5 business days
- Commission is deducted automatically

---

**Module Status**: ✅ Complete and Production Ready

**Last Updated**: October 15, 2025

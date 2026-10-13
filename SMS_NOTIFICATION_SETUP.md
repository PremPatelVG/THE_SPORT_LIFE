# SMS Notification Setup - Tournament Player Management

## Overview
Tournament management mein player registration ke liye 3 important SMS notifications implement kiye gaye hain:
1. **Player Acceptance** - Jab organizer player ko accept karta hai
2. **Player Rejection** - Jab organizer player ko reject karta hai
3. **Player Lock/Confirmation** - Jab organizer player ko lock karta hai (final confirmation)

---

## Required MSG91 Template IDs

Aapko MSG91 dashboard mein 3 templates create karne honge aur unki template IDs `.env` file mein add karni hongi:

### 1. Player Acceptance Template
**Environment Variable:** `MSG91_PLAYER_ACCEPT_TEMPLATE_ID`

**Template Variables:**
- `name` - Player ka naam
- `tname` - Tournament ka naam

**Sample Message:**
```
Hi {{name}}, Your registration for "{{tname}}" has been accepted! We look forward to seeing you at the tournament.
```

---

### 2. Player Rejection Template
**Environment Variable:** `MSG91_PLAYER_REJECT_TEMPLATE_ID`

**Template Variables:**
- `name` - Player ka naam
- `tname` - Tournament ka naam
- `reason` - Rejection reason (optional)

**Sample Message:**
```
Hi {{name}}, Your registration for "{{tname}}" has been rejected. Reason: {{reason}}
```

---

### 3. Player Lock/Confirmation Template
**Environment Variable:** `MSG91_PLAYER_LOCK_TEMPLATE_ID`

**Template Variables:**
- `name` - Player ka naam
- `tname` - Tournament ka naam
- `tdate` - Tournament start date

**Sample Message:**
```
Hi {{name}}, Your participation in "{{tname}}" has been confirmed! Tournament date: {{tdate}}. You are locked in. See you there!
```

---

## .env Configuration

Apni `.env` file mein ye template IDs add karein:

```bash
# MSG91 Player Management Templates
MSG91_PLAYER_ACCEPT_TEMPLATE_ID=your_accept_template_id_here
MSG91_PLAYER_REJECT_TEMPLATE_ID=your_reject_template_id_here
MSG91_PLAYER_LOCK_TEMPLATE_ID=your_lock_template_id_here
```

---

## How It Works

### Development Mode
- Development environment mein actual SMS nahi jayega
- Console mein mock response print hoga
- Testing ke liye perfect hai

### Production Mode
- Agar template IDs configured hain, toh template-based SMS jayega
- Agar template IDs nahi hain, toh simple SMS jayega (fallback)
- Errors log honge but player management process fail nahi hoga

---

## API Endpoints

### 1. Accept Player
**Endpoint:** `PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/accept`
**SMS:** Player ko acceptance notification jayega

### 2. Reject Player
**Endpoint:** `PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/reject`
**Body:** `{ "reason": "Optional rejection reason" }`
**SMS:** Player ko rejection notification jayega (with reason if provided)

### 3. Lock Player
**Endpoint:** `PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/lock`
**SMS:** Player ko confirmation notification jayega

---

## Testing

### Development Testing
```bash
# Development mode mein test karo
NODE_ENV=development npm run dev

# Console mein ye dikhega:
🔧 [DEV MODE] MSG91 Player Acceptance - Mock Response
📱 Mobile: 919157567535
👤 Player: Pawan Patil
🏆 Tournament: Football tournament CCT2111
```

### Production Testing
```bash
# Production mode mein test karo (template IDs ke saath)
NODE_ENV=production npm start

# Actual SMS jayega player ke number par
```

---

## Complete Flow

1. **Player Request** → Organizer ko notification
2. **Organizer Accept** → ✅ Player ko acceptance SMS
3. **Organizer Reject** → ❌ Player ko rejection SMS (with reason)
4. **Organizer Lock** → 🔒 Player ko confirmation SMS

---

## Files Modified

### Backend Files:
1. `/src/utils/msg91Service.js` - 3 new SMS methods added
   - `sendPlayerAcceptance()`
   - `sendPlayerRejection()`
   - `sendPlayerLockConfirmation()`

2. `/src/controllers/registrationController.js` - Updated 3 functions
   - `acceptRegistration()` - Line 422-439
   - `rejectRegistration()` - Line 527-546
   - `lockPlayer()` - Line 620-641

---

## Troubleshooting

### SMS nahi ja raha?
1. Check `.env` file mein `MSG91_AUTH_KEY` set hai
2. Check template IDs correct hain
3. Check mobile number format (should be 919XXXXXXXXX)
4. Check console logs for error messages

### Development mode mein test karna hai?
```bash
NODE_ENV=development npm run dev
```
Console mein mock SMS dikhega, actual SMS nahi jayega.

---

## Summary

✅ **Accept Player** - SMS notification implemented  
✅ **Reject Player** - SMS notification implemented (with reason)  
✅ **Lock Player** - SMS notification implemented (with date)  
✅ Development mode support  
✅ Production mode with template support  
✅ Fallback to simple SMS if templates not configured  
✅ Error handling - SMS failure won't break player management  

**Total Template IDs Required:** 3

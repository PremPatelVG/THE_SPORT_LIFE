# MSG91 Tournament Invitation SMS Guide

## 📋 Overview

Send tournament invitation SMS to participants using MSG91 with automatic dev/production environment handling.

---

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:

```bash
# MSG91 Configuration
MSG91_AUTH_KEY=481367AukcilfN46953ab17P1
MSG91_TOURNAMENT_INVITATION_TEMPLATE_ID=694f781d80fdbe42883fe9b2

# Environment
NODE_ENV=development  # or 'production'
```

### MSG91 Template

**Template ID:** `694f781d80fdbe42883fe9b2`

**Template Message:**
```
Hi ##name##, The sportlife has invited you to participate in "##tname##"! 
Tournament Details: ##URL1## 
Accept Invitation: ##URL2## 
Looking forward to see you there! 
Best regards, The sportlife Team
```

**Template Variables:**
- `##name##` - Recipient's name
- `##tname##` - Tournament name
- `##URL1##` - Tournament details page URL
- `##URL2##` - Accept invitation URL

---

## 🚀 Usage

### Basic Import

```javascript
const msg91Service = require('./utils/msg91Service');
```

### Send Tournament Invitation

```javascript
// Format mobile number
const mobile = msg91Service.formatMobileNumber('9408373007', '91');
// Returns: "919408373007"

// Send invitation
const result = await msg91Service.sendTournamentInvitation(
  mobile,                                    // Mobile number with country code
  'John Doe',                                // Recipient's name
  'Summer Cricket Championship 2025',        // Tournament name
  'https://sportlife.com/tournament/123',    // Details URL
  'https://sportlife.com/accept/abc123'      // Accept invitation URL
);

if (result.success) {
  console.log('✅ Invitation sent successfully');
} else {
  console.error('❌ Failed to send invitation:', result.message);
}
```

---

## 🎯 Environment Behavior

### Development Mode (`NODE_ENV=development`)

**Behavior:**
- ✅ No SMS sent (saves costs)
- ✅ Console logs for debugging
- ✅ Mock response returned

**Console Output:**
```
🔧 [DEV MODE] MSG91 Tournament Invitation - Mock Response
📱 Mobile: 919408373007
👤 Name: John Doe
🏆 Tournament: Summer Cricket Championship 2025
🔗 Details URL: https://sportlife.com/tournament/123
✅ Accept URL: https://sportlife.com/accept/abc123
```

**Response:**
```json
{
  "success": true,
  "message": "Tournament invitation sent successfully (DEV MODE - Mock)",
  "data": {
    "type": "success",
    "message": "Mock invitation for development",
    "mobile": "919408373007",
    "environment": "development"
  }
}
```

### Production Mode (`NODE_ENV=production`)

**Behavior:**
- ✅ Actual SMS sent via MSG91
- ✅ Real API integration
- ✅ Requires valid credentials

**Console Output:**
```
📤 [PRODUCTION] Sending Tournament Invitation via MSG91...
📱 Mobile: 919408373007
👤 Name: John Doe
🏆 Tournament: Summer Cricket Championship 2025
✅ Tournament invitation sent successfully via MSG91
```

**Response:**
```json
{
  "success": true,
  "message": "Tournament invitation sent successfully",
  "data": {
    "type": "success",
    "message": "Message sent successfully"
  }
}
```

---

## 💡 Integration Examples

### Example 1: Send Invitation from Tournament Service

```javascript
// services/tournamentService.js
const msg91Service = require('../utils/msg91Service');

const sendTournamentInvitation = async (tournamentId, userId) => {
  try {
    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    
    // Get user details
    const user = await User.findById(userId);
    
    if (!user.phone) {
      throw new Error('User phone number not found');
    }
    
    // Format mobile number
    const mobile = msg91Service.formatMobileNumber(user.phone, '91');
    
    // Generate URLs
    const detailsUrl = `${process.env.FRONTEND_URL}/tournaments/${tournamentId}`;
    const acceptUrl = `${process.env.FRONTEND_URL}/tournaments/${tournamentId}/accept`;
    
    // Send invitation SMS
    const result = await msg91Service.sendTournamentInvitation(
      mobile,
      `${user.first_name} ${user.last_name}`,
      tournament.name,
      detailsUrl,
      acceptUrl
    );
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    // Log invitation sent
    await TournamentInvitation.create({
      tournament_id: tournamentId,
      user_id: userId,
      invitation_method: 'sms',
      sent_at: new Date()
    });
    
    return {
      success: true,
      message: 'Invitation sent successfully'
    };
    
  } catch (error) {
    console.error('Send invitation error:', error);
    throw error;
  }
};
```

### Example 2: Controller for Sending Invitations

```javascript
// controllers/tournamentController.js
const msg91Service = require('../utils/msg91Service');

exports.inviteParticipant = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { phone, name } = req.body;
    
    // Validate inputs
    if (!phone || !name) {
      return res.status(400).json({
        success: false,
        error: 'Phone and name are required'
      });
    }
    
    // Get tournament
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }
    
    // Format mobile number
    const mobile = msg91Service.formatMobileNumber(phone, '91');
    
    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    
    // Generate URLs
    const detailsUrl = `${process.env.FRONTEND_URL}/tournaments/${tournamentId}`;
    const acceptUrl = `${process.env.FRONTEND_URL}/tournaments/accept/${invitationToken}`;
    
    // Send invitation SMS
    const result = await msg91Service.sendTournamentInvitation(
      mobile,
      name,
      tournament.name,
      detailsUrl,
      acceptUrl
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.message
      });
    }
    
    // Store invitation in database
    await query(
      `INSERT INTO tournament_invitations 
       (tournament_id, phone, name, invitation_token, expires_at) 
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [tournamentId, mobile, name, invitationToken]
    );
    
    return res.json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        mobile: mobile,
        name: name,
        tournament: tournament.name
      }
    });
    
  } catch (error) {
    console.error('Invite participant error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send invitation'
    });
  }
};
```

### Example 3: Bulk Invitations

```javascript
// services/tournamentService.js
const sendBulkInvitations = async (tournamentId, participants) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    const results = [];
    
    for (const participant of participants) {
      try {
        const mobile = msg91Service.formatMobileNumber(participant.phone, '91');
        
        const detailsUrl = `${process.env.FRONTEND_URL}/tournaments/${tournamentId}`;
        const acceptUrl = `${process.env.FRONTEND_URL}/tournaments/${tournamentId}/accept`;
        
        const result = await msg91Service.sendTournamentInvitation(
          mobile,
          participant.name,
          tournament.name,
          detailsUrl,
          acceptUrl
        );
        
        results.push({
          phone: mobile,
          name: participant.name,
          success: result.success,
          message: result.message
        });
        
        // Add delay to avoid rate limiting (optional)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({
          phone: participant.phone,
          name: participant.name,
          success: false,
          message: error.message
        });
      }
    }
    
    return {
      success: true,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results: results
    };
    
  } catch (error) {
    console.error('Bulk invitation error:', error);
    throw error;
  }
};
```

### Example 4: API Route

```javascript
// routes/tournament.routes.js
const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const { auth } = require('../middleware/auth');

/**
 * @route   POST /api/v1/tournaments/:tournamentId/invite
 * @desc    Send tournament invitation via SMS
 * @access  Private (Tournament organizer only)
 */
router.post('/:tournamentId/invite', auth, tournamentController.inviteParticipant);

/**
 * @route   POST /api/v1/tournaments/:tournamentId/invite-bulk
 * @desc    Send bulk tournament invitations via SMS
 * @access  Private (Tournament organizer only)
 */
router.post('/:tournamentId/invite-bulk', auth, tournamentController.inviteBulkInvite);

module.exports = router;
```

---

## 📊 Database Schema (Recommended)

### Tournament Invitations Table

```sql
CREATE TABLE tournament_invitations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tournament_id INT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  name VARCHAR(100) NOT NULL,
  invitation_token VARCHAR(64) UNIQUE,
  invitation_method ENUM('sms', 'email', 'both') DEFAULT 'sms',
  status ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tournament (tournament_id),
  INDEX idx_phone (phone),
  INDEX idx_token (invitation_token),
  INDEX idx_status (status),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);
```

---

## 🧪 Testing

### Development Testing

```bash
# Set environment
NODE_ENV=development

# Test invitation
curl -X POST http://localhost:5000/api/v1/tournaments/123/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "phone": "9408373007",
    "name": "John Doe"
  }'

# Check console for mock output
```

### Production Testing

```bash
# Set environment
NODE_ENV=production
MSG91_AUTH_KEY=481367AukcilfN46953ab17P1
MSG91_TOURNAMENT_INVITATION_TEMPLATE_ID=694f781d80fdbe42883fe9b2

# Send invitation
# Check mobile for actual SMS
```

---

## 🔐 Security Best Practices

1. **Validate Phone Numbers**: Always validate and format phone numbers
2. **Rate Limiting**: Implement rate limiting to prevent spam
3. **Token Expiry**: Set expiration for invitation tokens (e.g., 7 days)
4. **Authorization**: Only tournament organizers can send invitations
5. **Logging**: Log all invitation attempts for audit trail
6. **Error Handling**: Handle MSG91 API failures gracefully

---

## 🐛 Troubleshooting

### Issue 1: Invitation not received in production

**Check:**
```bash
# Verify environment variables
echo $MSG91_AUTH_KEY
echo $MSG91_TOURNAMENT_INVITATION_TEMPLATE_ID

# Check template is active in MSG91 dashboard
# Verify mobile number format (should include country code)
```

### Issue 2: Template variables not replaced

**Ensure:**
- Variable names match exactly: `##name##`, `##tname##`, `##URL1##`, `##URL2##`
- Template is approved in MSG91 dashboard
- All required variables are provided in the API call

### Issue 3: URLs too long

**Solution:**
- Use URL shortener service
- Create short redirect URLs in your backend
- Store full URLs in database and use short IDs

---

## 📝 Complete Flow Example

```javascript
// Complete tournament invitation flow
const inviteTournamentParticipant = async (tournamentId, participantData) => {
  try {
    // 1. Validate tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    // 2. Check if already invited
    const existingInvitation = await query(
      'SELECT * FROM tournament_invitations WHERE tournament_id = ? AND phone = ?',
      [tournamentId, participantData.phone]
    );
    
    if (existingInvitation.length > 0) {
      throw new Error('Participant already invited');
    }
    
    // 3. Format mobile number
    const mobile = msg91Service.formatMobileNumber(participantData.phone, '91');
    
    // 4. Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    
    // 5. Create URLs
    const detailsUrl = `${process.env.FRONTEND_URL}/tournaments/${tournamentId}`;
    const acceptUrl = `${process.env.FRONTEND_URL}/tournaments/accept/${invitationToken}`;
    
    // 6. Send SMS invitation
    const smsResult = await msg91Service.sendTournamentInvitation(
      mobile,
      participantData.name,
      tournament.name,
      detailsUrl,
      acceptUrl
    );
    
    if (!smsResult.success) {
      throw new Error(`Failed to send SMS: ${smsResult.message}`);
    }
    
    // 7. Store invitation in database
    await query(
      `INSERT INTO tournament_invitations 
       (tournament_id, phone, name, invitation_token, expires_at) 
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [tournamentId, mobile, participantData.name, invitationToken]
    );
    
    // 8. Return success
    return {
      success: true,
      message: 'Invitation sent successfully',
      data: {
        mobile: mobile,
        name: participantData.name,
        tournament: tournament.name,
        invitationToken: invitationToken
      }
    };
    
  } catch (error) {
    console.error('Tournament invitation error:', error);
    throw error;
  }
};
```

---

## ✅ Summary

**Features:**
- ✅ Send tournament invitations via SMS
- ✅ Automatic dev/production handling
- ✅ Custom template with tournament details
- ✅ URL support for details and acceptance
- ✅ Error handling and logging

**Next Steps:**
1. Add `MSG91_TOURNAMENT_INVITATION_TEMPLATE_ID` to `.env`
2. Create invitation controller/service
3. Add API routes for sending invitations
4. Test in development mode
5. Deploy to production

🎉 **Ready to send tournament invitations!**

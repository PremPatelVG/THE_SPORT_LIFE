/**
 * MSG91 Tournament Invitation - Usage Examples
 * 
 * This file demonstrates how to use the tournament invitation SMS feature
 */

const msg91Service = require('./msg91Service');

// ============================================
// Example 1: Send Single Tournament Invitation
// ============================================
async function sendSingleInvitation() {
  try {
    // Format mobile number
    const mobile = msg91Service.formatMobileNumber('9408373007', '91');
    
    // Send invitation
    const result = await msg91Service.sendTournamentInvitation(
      mobile,                                          // Mobile with country code
      'John Doe',                                      // Recipient's name
      'Summer Cricket Championship 2025',              // Tournament name
      'https://sportlife.com/tournaments/123',         // Details URL
      'https://sportlife.com/tournaments/accept/abc'   // Accept URL
    );
    
    if (result.success) {
      console.log('✅ Invitation sent successfully');
      console.log('Message:', result.message);
      
      // In DEV mode, no SMS is sent
      // In PRODUCTION mode, SMS is sent via MSG91
    } else {
      console.error('❌ Failed to send invitation:', result.message);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ============================================
// Example 2: Send Invitation from Tournament Service
// ============================================
async function inviteParticipantToTournament(tournamentId, userId) {
  try {
    // Get tournament and user from database
    // const tournament = await Tournament.findById(tournamentId);
    // const user = await User.findById(userId);
    
    // Mock data for example
    const tournament = {
      id: 123,
      name: 'Summer Cricket Championship 2025'
    };
    
    const user = {
      id: 456,
      first_name: 'John',
      last_name: 'Doe',
      phone: '+919408373007'
    };
    
    // Format mobile
    const mobile = msg91Service.formatMobileNumber(user.phone, '91');
    
    // Generate URLs
    const frontendUrl = process.env.FRONTEND_URL || 'https://sportlife.com';
    const detailsUrl = `${frontendUrl}/tournaments/${tournament.id}`;
    const acceptUrl = `${frontendUrl}/tournaments/${tournament.id}/accept`;
    
    // Send invitation
    const result = await msg91Service.sendTournamentInvitation(
      mobile,
      `${user.first_name} ${user.last_name}`,
      tournament.name,
      detailsUrl,
      acceptUrl
    );
    
    if (result.success) {
      // Log invitation in database
      // await TournamentInvitation.create({
      //   tournament_id: tournamentId,
      //   user_id: userId,
      //   phone: mobile,
      //   sent_at: new Date()
      // });
      
      return {
        success: true,
        message: 'Invitation sent successfully'
      };
    }
    
    return {
      success: false,
      message: result.message
    };
    
  } catch (error) {
    console.error('Invite participant error:', error);
    throw error;
  }
}

// ============================================
// Example 3: Bulk Invitations
// ============================================
async function sendBulkInvitations(tournamentId, participants) {
  try {
    const tournament = {
      id: tournamentId,
      name: 'Summer Cricket Championship 2025'
    };
    
    const results = [];
    
    for (const participant of participants) {
      try {
        const mobile = msg91Service.formatMobileNumber(participant.phone, '91');
        
        const detailsUrl = `https://sportlife.com/tournaments/${tournamentId}`;
        const acceptUrl = `https://sportlife.com/tournaments/${tournamentId}/accept`;
        
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
        
        // Add delay to avoid rate limiting (1 second between SMS)
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
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log(`✅ Sent: ${successCount}, ❌ Failed: ${failedCount}`);
    
    return {
      success: true,
      totalSent: successCount,
      totalFailed: failedCount,
      results: results
    };
    
  } catch (error) {
    console.error('Bulk invitation error:', error);
    throw error;
  }
}

// ============================================
// Example 4: Controller Integration
// ============================================
class TournamentInvitationController {
  async inviteParticipant(req, res) {
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
      // const tournament = await Tournament.findById(tournamentId);
      const tournament = {
        id: tournamentId,
        name: 'Summer Cricket Championship 2025'
      };
      
      // Format mobile
      const mobile = msg91Service.formatMobileNumber(phone, '91');
      
      // Generate URLs
      const frontendUrl = process.env.FRONTEND_URL || 'https://sportlife.com';
      const detailsUrl = `${frontendUrl}/tournaments/${tournamentId}`;
      const acceptUrl = `${frontendUrl}/tournaments/${tournamentId}/accept`;
      
      // Send invitation
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
  }
  
  async bulkInvite(req, res) {
    try {
      const { tournamentId } = req.params;
      const { participants } = req.body; // Array of { phone, name }
      
      if (!Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Participants array is required'
        });
      }
      
      const result = await sendBulkInvitations(tournamentId, participants);
      
      return res.json({
        success: true,
        message: `Invitations sent: ${result.totalSent} successful, ${result.totalFailed} failed`,
        data: result
      });
      
    } catch (error) {
      console.error('Bulk invite error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send bulk invitations'
      });
    }
  }
}

// ============================================
// Example 5: Check Environment
// ============================================
function checkInvitationEnvironment() {
  console.log('MSG91 Tournament Invitation Service');
  console.log('Environment:', msg91Service.getEnvironment());
  console.log('Dev Mode:', msg91Service.isDevMode());
  
  if (msg91Service.isDevMode()) {
    console.log('⚠️  Running in DEVELOPMENT mode');
    console.log('💡 Invitations will NOT be sent via SMS');
    console.log('💡 Check console for mock output');
  } else {
    console.log('🚀 Running in PRODUCTION mode');
    console.log('📤 Invitations will be sent via MSG91');
  }
}

// Export examples
module.exports = {
  sendSingleInvitation,
  inviteParticipantToTournament,
  sendBulkInvitations,
  TournamentInvitationController,
  checkInvitationEnvironment
};

// ============================================
// Quick Test (Uncomment to run)
// ============================================
/*
(async () => {
  console.log('\n=== Testing Tournament Invitation ===\n');
  
  // Check environment
  checkInvitationEnvironment();
  
  console.log('\n--- Sending Single Invitation ---\n');
  await sendSingleInvitation();
  
  console.log('\n--- Sending Bulk Invitations ---\n');
  const participants = [
    { phone: '9408373007', name: 'John Doe' },
    { phone: '9876543210', name: 'Jane Smith' },
    { phone: '9123456789', name: 'Bob Johnson' }
  ];
  await sendBulkInvitations(123, participants);
  
  console.log('\n=== Test Complete ===\n');
})();
*/

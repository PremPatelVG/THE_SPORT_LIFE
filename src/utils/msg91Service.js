const axios = require('axios');

/**
 * MSG91 OTP Service
 * Handles OTP sending via MSG91 API with environment-based logic
 * - DEV: Returns mock OTP (123456) without sending SMS
 * - PRODUCTION: Sends actual OTP via MSG91
 */

class MSG91Service {
  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.templateId = process.env.MSG91_OTP_TEMPLATE_ID;
    this.apiUrl = 'https://control.msg91.com/api/v5/flow';
    this.environment = process.env.NODE_ENV || 'development';
    this.isDevelopment = this.environment === 'development';
  }

  /**
   * Send OTP to mobile number
   * @param {string} mobile - Mobile number with country code (e.g., "919408373007")
   * @param {string} otp - OTP code to send
   * @param {string} validityMinutes - OTP validity in minutes (default: "10")
   * @returns {Promise<Object>} Response object with success status and data
   */
  async sendOTP(mobile, otp, validityMinutes = '10') {
    try {
      // Validate inputs
      if (!mobile) {
        throw new Error('Mobile number is required');
      }

      if (!otp) {
        throw new Error('OTP is required');
      }

      // DEV MODE: Return mock response without sending SMS
      if (this.isDevelopment) {
        // console.log('🔧 [DEV MODE] MSG91 OTP Service - Mock Response');
        // console.log(`📱 Mobile: ${mobile}`);
        // console.log(`🔑 OTP: 123456 (Mock OTP for development)`);
        // console.log(`⏱️  Validity: ${validityMinutes} minutes`);
        
        return {
          success: true,
          message: 'OTP sent successfully (DEV MODE - Mock)',
          data: {
            type: 'success',
            message: 'Mock OTP for development',
            otp: '123456', // Always return 123456 in dev mode
            mobile: mobile,
            environment: 'development'
          }
        };
      }

      // PRODUCTION MODE: Send actual SMS via MSG91
      if (!this.authKey || !this.templateId) {
        throw new Error('MSG91 credentials not configured. Please set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID in .env file');
      }

      const options = {
        method: 'POST',
        url: this.apiUrl,
        headers: {
          accept: 'application/json',
          authkey: this.authKey,
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          template_id: this.templateId,
          recipients: [
            {
              mobiles: mobile,
              otp: otp,
              time: validityMinutes
            }
          ]
        })
      };

      console.log('📤 [PRODUCTION] Sending OTP via MSG91...');
      console.log(`📱 Mobile: ${mobile}`);
      console.log(`⏱️  Validity: ${validityMinutes} minutes`);

      const { data } = await axios.request(options);

      console.log('✅ OTP sent successfully via MSG91');

      return {
        success: true,
        message: 'OTP sent successfully',
        data: data
      };

    } catch (error) {
      console.error('❌ MSG91 OTP Service Error:', error.message);
      
      // Return detailed error information
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send OTP',
        error: {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        }
      };
    }
  }

  /**
   * Send Tournament Invitation SMS
   * @param {string} mobile - Mobile number with country code (e.g., "919408373007")
   * @param {string} name - Recipient's name
   * @param {string} tournamentName - Tournament name
   * @param {string} detailsUrl - URL to tournament details page
   * @param {string} acceptUrl - URL to accept invitation
   * @returns {Promise<Object>} Response object with success status and data
   */
  async sendTournamentInvitation(mobile, name, tournamentName, detailsUrl, acceptUrl) {
    try {
      // Validate inputs
      if (!mobile) {
        throw new Error('Mobile number is required');
      }

      if (!name || !tournamentName) {
        throw new Error('Name and tournament name are required');
      }

      // DEV MODE: Return mock response without sending SMS
      if (this.isDevelopment) {
        console.log('🔧 [DEV MODE] MSG91 Tournament Invitation - Mock Response');
        console.log(`📱 Mobile: ${mobile}`);
        console.log(`👤 Name: ${name}`);
        console.log(`🏆 Tournament: ${tournamentName}`);
        console.log(`🔗 Details URL: ${detailsUrl}`);
        console.log(`✅ Accept URL: ${acceptUrl}`);
        
        return {
          success: true,
          message: 'Tournament invitation sent successfully (DEV MODE - Mock)',
          data: {
            type: 'success',
            message: 'Mock invitation for development',
            mobile: mobile,
            environment: 'development'
          }
        };
      }

      // PRODUCTION MODE: Send actual SMS via MSG91
      const invitationTemplateId = process.env.MSG91_TOURNAMENT_INVITATION_TEMPLATE_ID;
      
      if (!this.authKey || !invitationTemplateId) {
        throw new Error('MSG91 credentials not configured. Please set MSG91_AUTH_KEY and MSG91_TOURNAMENT_INVITATION_TEMPLATE_ID in .env file');
      }

      const options = {
        method: 'POST',
        url: this.apiUrl,
        headers: {
          accept: 'application/json',
          authkey: this.authKey,
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          template_id: invitationTemplateId,
          recipients: [
            {
              mobiles: mobile,
              name: name,
              tname: tournamentName,
              URL1: detailsUrl || '',
              URL2: acceptUrl || ''
            }
          ]
        })
      };

      console.log('📤 [PRODUCTION] Sending Tournament Invitation via MSG91...');
      console.log(`📱 Mobile: ${mobile}`);
      console.log(`👤 Name: ${name}`);
      console.log(`🏆 Tournament: ${tournamentName}`);

      const { data } = await axios.request(options);

      console.log('✅ Tournament invitation sent successfully via MSG91');

      return {
        success: true,
        message: 'Tournament invitation sent successfully',
        data: data
      };

    } catch (error) {
      console.error('❌ MSG91 Tournament Invitation Error:', error.message);
      
      // Return detailed error information
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send tournament invitation',
        error: {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        }
      };
    }
  }

  /**
   * Send Team Invitation SMS
   * @param {string} mobile - Mobile number with country code (e.g., "919408373007")
   * @param {string} name - Recipient's name
   * @param {string} inviterName - Name of person who sent invitation
   * @param {string} teamName - Team name
   * @param {string} teamUrl - URL to team page
   * @returns {Promise<Object>} Response object with success status and data
   */
  async sendTeamInvitation(mobile, name, inviterName, teamName, teamUrl) {
    try {
      // Validate inputs
      if (!mobile) {
        throw new Error('Mobile number is required');
      }

      if (!name || !teamName || !inviterName) {
        throw new Error('Name, inviter name, and team name are required');
      }

      // DEV MODE: Return mock response without sending SMS
      if (this.isDevelopment) {
        console.log('🔧 [DEV MODE] MSG91 Team Invitation - Mock Response');
        console.log(`📱 Mobile: ${mobile}`);
        console.log(`👤 Name: ${name}`);
        console.log(`👥 Inviter: ${inviterName}`);
        console.log(`⚽ Team: ${teamName}`);
        console.log(`🔗 Team URL: ${teamUrl}`);
        console.log(`📝 Message: Hi ${name}, ${inviterName} invited you to join the team "${teamName}"! Please approve or reject the invitation: ${teamUrl}`);
        
        return {
          success: true,
          message: 'Team invitation sent successfully (DEV MODE - Mock)',
          data: {
            type: 'success',
            message: 'Mock team invitation for development',
            mobile: mobile,
            environment: 'development'
          }
        };
      }

      // PRODUCTION MODE: Send actual SMS via MSG91
      const teamInvitationTemplateId = process.env.MSG91_TEAM_INVITATION_TEMPLATE_ID;
      
      if (!this.authKey) {
        throw new Error('MSG91 credentials not configured. Please set MSG91_AUTH_KEY in .env file');
      }

      // If template ID is not configured, log warning and skip SMS
      if (!teamInvitationTemplateId) {
        console.log('⚠️  MSG91_TEAM_INVITATION_TEMPLATE_ID not configured');
        console.log('📝 Team invitation created but SMS not sent');
        console.log('💡 To enable SMS: Create team invitation template in MSG91 and add MSG91_TEAM_INVITATION_TEMPLATE_ID to .env');
        console.log(`📱 Would send to: ${mobile}`);
        console.log(`👤 Name: ${name}`);
        console.log(`👥 Inviter: ${inviterName}`);
        console.log(`⚽ Team: ${teamName}`);
        console.log(`🔗 URL: ${teamUrl}`);
        
        return {
          success: true,
          message: 'Team invitation created (SMS not sent - template not configured)',
          data: {
            type: 'warning',
            message: 'Template ID not configured',
            mobile: mobile,
            skipped: true
          }
        };
      }

      // Template ID is configured, use template-based SMS
      const options = {
        method: 'POST',
        url: this.apiUrl,
        headers: {
          accept: 'application/json',
          authkey: this.authKey,
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          template_id: teamInvitationTemplateId,
          recipients: [
            {
              mobiles: mobile,
              name: name,
              inviter: inviterName,
              teamname: teamName,
              URL: teamUrl || ''
            }
          ]
        })
      };

      console.log('📤 [PRODUCTION] Sending Team Invitation via MSG91 (Template)...');
      console.log(`📱 Mobile: ${mobile}`);
      console.log(`👤 Name: ${name}`);
      console.log(`👥 Inviter: ${inviterName}`);
      console.log(`⚽ Team: ${teamName}`);

      const { data } = await axios.request(options);

      console.log('✅ Team invitation sent successfully via MSG91 (Template)');
      console.log('📊 Response:', data);

      return {
        success: true,
        message: 'Team invitation sent successfully',
        data: data
      };

    } catch (error) {
      console.error('❌ MSG91 Team Invitation Error:', error.message);
      
      // Return detailed error information
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send team invitation',
        error: {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        }
      };
    }
  }

  /**
   * Send Pair Invitation SMS
   * @param {string} mobile - Mobile number with country code (e.g., "919408373007")
   * @param {string} name - Recipient's name
   * @param {string} inviterName - Name of person who sent invitation
   * @param {string} sportName - Sport name
   * @param {string} acceptUrl - URL to accept invitation
   * @returns {Promise<Object>} Response object with success status and data
   */
  async sendPairInvitation(mobile, name, inviterName, sportName, acceptUrl) {
    try {
      // Validate inputs
      if (!mobile) {
        throw new Error('Mobile number is required');
      }

      if (!name || !sportName || !inviterName) {
        throw new Error('Name, inviter name, and sport name are required');
      }

      // DEV MODE: Return mock response without sending SMS
      if (this.isDevelopment) {
        console.log('🔧 [DEV MODE] MSG91 Pair Invitation - Mock Response');
        console.log(`📱 Mobile: ${mobile}`);
        console.log(`👤 Name: ${name}`);
        console.log(`👥 Inviter: ${inviterName}`);
        console.log(`🏸 Sport: ${sportName}`);
        console.log(`🔗 Accept URL: ${acceptUrl}`);
        console.log(`📝 Message: Hi ${name}, ${inviterName} invited you to form a pair for ${sportName}! Accept or reject: ${acceptUrl}`);
        
        return {
          success: true,
          message: 'Pair invitation sent successfully (DEV MODE - Mock)',
          data: {
            type: 'success',
            message: 'Mock pair invitation for development',
            mobile: mobile,
            environment: 'development'
          }
        };
      }

      // PRODUCTION MODE: Send actual SMS via MSG91
      const pairInvitationTemplateId = process.env.MSG91_PAIR_INVITATION_TEMPLATE_ID;
      
      if (!this.authKey) {
        throw new Error('MSG91 credentials not configured. Please set MSG91_AUTH_KEY in .env file');
      }

      // If template ID is not configured, log warning and skip SMS
      if (!pairInvitationTemplateId) {
        console.log('⚠️  MSG91_PAIR_INVITATION_TEMPLATE_ID not configured');
        console.log('📝 Pair invitation created but SMS not sent');
        console.log('💡 To enable SMS: Create pair invitation template in MSG91 and add MSG91_PAIR_INVITATION_TEMPLATE_ID to .env');
        console.log(`📱 Would send to: ${mobile}`);
        console.log(`👤 Name: ${name}`);
        console.log(`👥 Inviter: ${inviterName}`);
        console.log(`🏸 Sport: ${sportName}`);
        console.log(`🔗 URL: ${acceptUrl}`);
        
        return {
          success: true,
          message: 'Pair invitation created (SMS not sent - template not configured)',
          data: {
            type: 'warning',
            message: 'Template ID not configured',
            mobile: mobile,
            skipped: true
          }
        };
      }

      // Template ID is configured, use template-based SMS
      const options = {
        method: 'POST',
        url: this.apiUrl,
        headers: {
          accept: 'application/json',
          authkey: this.authKey,
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          template_id: pairInvitationTemplateId,
          recipients: [
            {
              mobiles: mobile,
              name: name,
              inviter: inviterName,
              sport: sportName,
              URL: acceptUrl || ''
            }
          ]
        })
      };

      console.log('📤 [PRODUCTION] Sending Pair Invitation via MSG91 (Template)...');
      console.log(`📱 Mobile: ${mobile}`);
      console.log(`👤 Name: ${name}`);
      console.log(`👥 Inviter: ${inviterName}`);
      console.log(`🏸 Sport: ${sportName}`);

      const { data } = await axios.request(options);

      console.log('✅ Pair invitation sent successfully via MSG91 (Template)');
      console.log('📊 Response:', data);

      return {
        success: true,
        message: 'Pair invitation sent successfully',
        data: data
      };

    } catch (error) {
      console.error('❌ MSG91 Pair Invitation Error:', error.message);
      
      // Return detailed error information
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send pair invitation',
        error: {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        }
      };
    }
  }

  /**
   * Send Tournament Rejection SMS
   * @param {string} mobile - Mobile number with country code (e.g., "919408373007")
   * @param {string} name - Organizer's name
   * @param {string} tournamentName - Tournament name
   * @param {string} reason - Rejection reason (optional)
   * @returns {Promise<Object>} Response object with success status and data
   */
  async sendTournamentRejection(mobile, name, tournamentName, reason = null) {
    try {
      // Validate inputs
      if (!mobile) {
        throw new Error('Mobile number is required');
      }

      if (!name || !tournamentName) {
        throw new Error('Name and tournament name are required');
      }

      // DEV MODE: Return mock response without sending SMS
      if (this.isDevelopment) {
        console.log('🔧 [DEV MODE] MSG91 Tournament Rejection - Mock Response');
        console.log(`📱 Mobile: ${mobile}`);
        console.log(`👤 Name: ${name}`);
        console.log(`🏆 Tournament: ${tournamentName}`);
        console.log(`❌ Reason: ${reason || 'Not provided'}`);
        
        const message = reason 
          ? `Hi ${name}, your tournament "${tournamentName}" has been rejected by admin. Reason: ${reason}`
          : `Hi ${name}, your tournament "${tournamentName}" has been rejected by admin.`;
        
        console.log(`📝 Message: ${message}`);
        
        return {
          success: true,
          message: 'Tournament rejection sent successfully (DEV MODE - Mock)',
          data: {
            type: 'success',
            message: 'Mock rejection notification for development',
            mobile: mobile,
            environment: 'development'
          }
        };
      }

      // PRODUCTION MODE: Send actual SMS via MSG91
      const rejectionTemplateId = process.env.MSG91_TOURNAMENT_REJECTION_TEMPLATE_ID;
      
      if (!this.authKey) {
        throw new Error('MSG91 credentials not configured. Please set MSG91_AUTH_KEY in .env file');
      }

      // If template ID is not configured, use simple SMS
      if (!rejectionTemplateId) {
        console.log('⚠️  MSG91_TOURNAMENT_REJECTION_TEMPLATE_ID not configured');
        console.log('📝 Sending rejection via simple SMS');
        
        const message = reason 
          ? `Hi ${name}, your tournament "${tournamentName}" has been rejected. Reason: ${reason}`
          : `Hi ${name}, your tournament "${tournamentName}" has been rejected by admin.`;
        
        // Use MSG91 simple SMS API
        const options = {
          method: 'POST',
          url: 'https://control.msg91.com/api/v5/flow',
          headers: {
            accept: 'application/json',
            authkey: this.authKey,
            'content-type': 'application/json'
          },
          data: JSON.stringify({
            sender: 'SPORTL',
            route: '4',
            country: '91',
            sms: [
              {
                message: message,
                to: [mobile]
              }
            ]
          })
        };

        console.log('📤 [PRODUCTION] Sending Tournament Rejection SMS...');
        console.log(`📱 Mobile: ${mobile}`);
        console.log(`📝 Message: ${message}`);

        const { data } = await axios.request(options);

        console.log('✅ Tournament rejection SMS sent successfully');

        return {
          success: true,
          message: 'Tournament rejection sent successfully',
          data: data
        };
      }

      // Template ID is configured, use template-based SMS
      const options = {
        method: 'POST',
        url: this.apiUrl,
        headers: {
          accept: 'application/json',
          authkey: this.authKey,
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          template_id: rejectionTemplateId,
          recipients: [
            {
              mobiles: mobile,
              name: name,
              tname: tournamentName,
              reason: reason || 'Not specified'
            }
          ]
        })
      };

      console.log('📤 [PRODUCTION] Sending Tournament Rejection via MSG91 (Template)...');
      console.log(`📱 Mobile: ${mobile}`);
      console.log(`👤 Name: ${name}`);
      console.log(`🏆 Tournament: ${tournamentName}`);

      const { data } = await axios.request(options);

      console.log('✅ Tournament rejection sent successfully via MSG91 (Template)');

      return {
        success: true,
        message: 'Tournament rejection sent successfully',
        data: data
      };

    } catch (error) {
      console.error('❌ MSG91 Tournament Rejection Error:', error.message);
      
      // Return detailed error information
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send tournament rejection',
        error: {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        }
      };
    }
  }

  /**
   * Send player registration acceptance notification
   * @param {string} mobile - Player's mobile number
   * @param {string} playerName - Player's name
   * @param {string} tournamentName - Tournament name
   * @returns {Promise<Object>} Response object
   */
  async sendPlayerAcceptance(mobile, playerName, tournamentName) {
    try {
      if (!mobile || !playerName || !tournamentName) {
        throw new Error('Mobile, player name, and tournament name are required');
      }

      // DEV MODE: Return mock response
      if (this.isDevelopment) {
        console.log('🔧 [DEV MODE] MSG91 Player Acceptance - Mock Response');
        console.log(`📱 Mobile: ${mobile}`);
        console.log(`👤 Player: ${playerName}`);
        console.log(`🏆 Tournament: ${tournamentName}`);
        console.log(`📝 Message: Hi ${playerName}, Your registration for "${tournamentName}" has been accepted! We look forward to seeing you at the tournament.`);
        
        return {
          success: true,
          message: 'Player acceptance notification sent (DEV MODE - Mock)',
          data: { type: 'success', environment: 'development' }
        };
      }

      // PRODUCTION MODE
      const acceptTemplateId = process.env.MSG91_PLAYER_ACCEPT_TEMPLATE_ID;
      
      if (!this.authKey) {
        throw new Error('MSG91 credentials not configured');
      }

      // If no template, use simple SMS
      if (!acceptTemplateId) {
        console.log('⚠️  MSG91_PLAYER_ACCEPT_TEMPLATE_ID not configured, using simple SMS');
        const message = `Hi ${playerName}, Your registration for "${tournamentName}" has been accepted! We look forward to seeing you at the tournament.`;
        
        const options = {
          method: 'POST',
          url: 'https://control.msg91.com/api/v5/flow',
          headers: { accept: 'application/json', authkey: this.authKey, 'content-type': 'application/json' },
          data: JSON.stringify({ sender: 'SPORTL', route: '4', country: '91', sms: [{ message: message, to: [mobile] }] })
        };

        const { data } = await axios.request(options);
        return { success: true, message: 'Player acceptance sent', data: data };
      }

      // Use template
      const options = {
        method: 'POST',
        url: this.apiUrl,
        headers: { accept: 'application/json', authkey: this.authKey, 'content-type': 'application/json' },
        data: JSON.stringify({
          template_id: acceptTemplateId,
          recipients: [{ mobiles: mobile, name: playerName, tname: tournamentName }]
        })
      };

      const { data } = await axios.request(options);
      return { success: true, message: 'Player acceptance sent', data: data };

    } catch (error) {
      console.error('❌ MSG91 Player Acceptance Error:', error.message);
      return { success: false, message: error.message, error: { status: error.response?.status, data: error.response?.data } };
    }
  }

  /**
   * Send player registration rejection notification
   * @param {string} mobile - Player's mobile number
   * @param {string} playerName - Player's name
   * @param {string} tournamentName - Tournament name
   * @param {string} reason - Rejection reason (optional)
   * @returns {Promise<Object>} Response object
   */
  async sendPlayerRejection(mobile, playerName, tournamentName, reason = null) {
    try {
      if (!mobile || !playerName || !tournamentName) {
        throw new Error('Mobile, player name, and tournament name are required');
      }

      // DEV MODE: Return mock response
      if (this.isDevelopment) {
        console.log('🔧 [DEV MODE] MSG91 Player Rejection - Mock Response');
        console.log(`📱 Mobile: ${mobile}`);
        console.log(`👤 Player: ${playerName}`);
        console.log(`🏆 Tournament: ${tournamentName}`);
        console.log(`❌ Reason: ${reason || 'Not provided'}`);
        
        const message = reason 
          ? `Hi ${playerName}, Your registration for "${tournamentName}" has been rejected. Reason: ${reason}`
          : `Hi ${playerName}, Your registration for "${tournamentName}" has been rejected.`;
        
        console.log(`📝 Message: ${message}`);
        
        return {
          success: true,
          message: 'Player rejection notification sent (DEV MODE - Mock)',
          data: { type: 'success', environment: 'development' }
        };
      }

      // PRODUCTION MODE
      const rejectTemplateId = process.env.MSG91_PLAYER_REJECT_TEMPLATE_ID;
      
      if (!this.authKey) {
        throw new Error('MSG91 credentials not configured');
      }

      // If no template, use simple SMS
      if (!rejectTemplateId) {
        console.log('⚠️  MSG91_PLAYER_REJECT_TEMPLATE_ID not configured, using simple SMS');
        const message = reason 
          ? `Hi ${playerName}, Your registration for "${tournamentName}" has been rejected. Reason: ${reason}`
          : `Hi ${playerName}, Your registration for "${tournamentName}" has been rejected.`;
        
        const options = {
          method: 'POST',
          url: 'https://control.msg91.com/api/v5/flow',
          headers: { accept: 'application/json', authkey: this.authKey, 'content-type': 'application/json' },
          data: JSON.stringify({ sender: 'SPORTL', route: '4', country: '91', sms: [{ message: message, to: [mobile] }] })
        };

        const { data } = await axios.request(options);
        return { success: true, message: 'Player rejection sent', data: data };
      }

      // Use template
      const options = {
        method: 'POST',
        url: this.apiUrl,
        headers: { accept: 'application/json', authkey: this.authKey, 'content-type': 'application/json' },
        data: JSON.stringify({
          template_id: rejectTemplateId,
          recipients: [{ mobiles: mobile, name: playerName, tname: tournamentName, reason: reason || 'Not specified' }]
        })
      };

      const { data } = await axios.request(options);
      return { success: true, message: 'Player rejection sent', data: data };

    } catch (error) {
      console.error('❌ MSG91 Player Rejection Error:', error.message);
      return { success: false, message: error.message, error: { status: error.response?.status, data: error.response?.data } };
    }
  }

  /**
   * Send player lock/confirmation notification
   * @param {string} mobile - Player's mobile number
   * @param {string} playerName - Player's name
   * @param {string} tournamentName - Tournament name
   * @param {string} tournamentDate - Tournament start date
   * @returns {Promise<Object>} Response object
   */
  async sendPlayerLockConfirmation(mobile, playerName, tournamentName, tournamentDate) {
    try {
      if (!mobile || !playerName || !tournamentName) {
        throw new Error('Mobile, player name, and tournament name are required');
      }

      // DEV MODE: Return mock response
      if (this.isDevelopment) {
        console.log('🔧 [DEV MODE] MSG91 Player Lock Confirmation - Mock Response');
        console.log(`📱 Mobile: ${mobile}`);
        console.log(`👤 Player: ${playerName}`);
        console.log(`🏆 Tournament: ${tournamentName}`);
        console.log(`📅 Date: ${tournamentDate || 'TBD'}`);
        console.log(`📝 Message: Hi ${playerName}, Your participation in "${tournamentName}" has been confirmed! You are locked in for the tournament. See you there!`);
        
        return {
          success: true,
          message: 'Player lock confirmation sent (DEV MODE - Mock)',
          data: { type: 'success', environment: 'development' }
        };
      }

      // PRODUCTION MODE
      const lockTemplateId = process.env.MSG91_PLAYER_LOCK_TEMPLATE_ID;
      
      if (!this.authKey) {
        throw new Error('MSG91 credentials not configured');
      }

      // If no template, use simple SMS
      if (!lockTemplateId) {
        console.log('⚠️  MSG91_PLAYER_LOCK_TEMPLATE_ID not configured, using simple SMS');
        const message = `Hi ${playerName}, Your participation in "${tournamentName}" has been confirmed! You are locked in for the tournament. See you there!`;
        
        const options = {
          method: 'POST',
          url: 'https://control.msg91.com/api/v5/flow',
          headers: { accept: 'application/json', authkey: this.authKey, 'content-type': 'application/json' },
          data: JSON.stringify({ sender: 'SPORTL', route: '4', country: '91', sms: [{ message: message, to: [mobile] }] })
        };

        const { data } = await axios.request(options);
        return { success: true, message: 'Player lock confirmation sent', data: data };
      }

      // Use template
      const options = {
        method: 'POST',
        url: this.apiUrl,
        headers: { accept: 'application/json', authkey: this.authKey, 'content-type': 'application/json' },
        data: JSON.stringify({
          template_id: lockTemplateId,
          recipients: [{ mobiles: mobile, name: playerName, tname: tournamentName, tdate: tournamentDate || 'TBD' }]
        })
      };

      const { data } = await axios.request(options);
      return { success: true, message: 'Player lock confirmation sent', data: data };

    } catch (error) {
      console.error('❌ MSG91 Player Lock Confirmation Error:', error.message);
      return { success: false, message: error.message, error: { status: error.response?.status, data: error.response?.data } };
    }
  }

  /**
   * Generate random 6-digit OTP
   * @returns {string} 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Format mobile number with country code
   * @param {string} mobile - Mobile number
   * @param {string} countryCode - Country code (default: "91" for India)
   * @returns {string} Formatted mobile number
   */
  formatMobileNumber(mobile, countryCode = '91') {
    // Remove any non-digit characters
    const cleanMobile = mobile.replace(/\D/g, '');
    
    // If already has country code, return as is
    if (cleanMobile.startsWith(countryCode)) {
      return cleanMobile;
    }
    
    // Add country code
    return `${countryCode}${cleanMobile}`;
  }

  /**
   * Get current environment
   * @returns {string} Current environment (development/production)
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Check if service is in development mode
   * @returns {boolean} True if in development mode
   */
  isDevMode() {
    return this.isDevelopment;
  }
}

// Export singleton instance
module.exports = new MSG91Service();

const axios = require('axios');
const logger = require('../utils/logger');

// WhatsApp Business API Configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '816922451512751';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAlXjZBZCpsicBP6Su7nl3WD4Ct8gwzFkZBxfkm1xLvLysQ50VTnJHlDPV3nauDDKMkNp3ADk4tKZCKy14hXkrmsWHXqJcP3bJ243UlM6nrx93iAslrbmRMXxLORWgfBBXmZAOjsNhAVvWN0KJQgEd93ssGoHIBK6n9JvEhXYl9V6wRPnbXoZBm9V5YYoLah12o1yJNik9Ee4xoGXYjZBnsvwTvsYK8k3yvQ7eZAZBZCjy58hf1NbmNkp5pxZBj218gZA4Bc30USIq6R52IuL16Bx1YhCYwJ';

/**
 * Format phone number to WhatsApp format (remove + and spaces)
 * Example: +91 9408373007 -> 919408373007
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-numeric characters except +
  let formatted = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  if (formatted.startsWith('+')) {
    formatted = formatted.substring(1);
  }
  
  // If number doesn't start with country code, assume India (+91)
  if (formatted.length === 10) {
    formatted = '91' + formatted;
  }
  
  return formatted;
};

/**
 * Send WhatsApp template message
 * @param {string} to - Phone number in format: 919408373007
 * @param {string} templateName - Template name (e.g., 'hello_world')
 * @param {string} languageCode - Language code (e.g., 'en_US')
 * @param {Array} components - Template components (optional)
 */
const sendTemplateMessage = async (to, templateName, languageCode = 'en_US', components = []) => {
  try {
    const formattedPhone = formatPhoneNumber(to);
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number');
    }
    
    const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        }
      }
    };
    
    // Add components if provided (for dynamic templates)
    if (components && components.length > 0) {
      payload.template.components = components;
    }
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`WhatsApp template message sent to ${formattedPhone}:`, response.data);
    
    return {
      success: true,
      messageId: response.data.messages[0].id,
      phone: formattedPhone
    };
  } catch (error) {
    logger.error('WhatsApp send template error:', {
      message: error.message,
      response: error.response?.data,
      phone: to
    });
    
    throw error;
  }
};

/**
 * Send WhatsApp text message (requires approved template or 24-hour window)
 * @param {string} to - Phone number
 * @param {string} message - Message text
 * @param {boolean} enablePreview - Enable URL preview (default: false)
 */
const sendTextMessage = async (to, message, enablePreview = false) => {
  try {
    const formattedPhone = formatPhoneNumber(to);
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number');
    }
    
    const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        preview_url: enablePreview,
        body: message
      }
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`WhatsApp text message sent to ${formattedPhone}:`, response.data);
    
    return {
      success: true,
      messageId: response.data.messages[0].id,
      phone: formattedPhone
    };
  } catch (error) {
    logger.error('WhatsApp send text error:', {
      message: error.message,
      response: error.response?.data,
      phone: to
    });
    
    throw error;
  }
};

/**
 * Send tournament invitation via WhatsApp
 * @param {string} phone - Phone number
 * @param {string} playerName - Player name
 * @param {string} tournamentName - Tournament name
 * @param {number} tournamentId - Tournament ID
 * @param {number} invitationId - Invitation ID
 */
const sendTournamentInvitation = async (phone, playerName, tournamentName, tournamentId, invitationId) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Build tournament and invitation links
    const tournamentLink = `${frontendUrl}/tournaments/${tournamentId}`;
    const invitationLink = `${frontendUrl}/tournaments/invitations/${invitationId}`;
    
    // Create message with tournament name and links
    const message = `Hi ${playerName},\n\nYou have been invited to participate in "${tournamentName}"!\n\n🏆 Tournament Details: ${tournamentLink}\n\n✉️ Accept Invitation: ${invitationLink}\n\nWe look forward to seeing you there!`;
    
    // Try sending as text message (works within 24-hour window)
    // Enable URL preview for links
    try {
      return await sendTextMessage(phone, message, true);
    } catch (textError) {
      logger.warn('Text message failed, trying template:', textError.message);
      
      // Fallback to hello_world template
      return await sendTemplateMessage(phone, 'hello_world', 'en_US');
    }
  } catch (error) {
    logger.error('Send tournament invitation error:', error);
    throw error;
  }
};

/**
 * Send registration acceptance via WhatsApp
 * @param {string} phone - Phone number
 * @param {string} playerName - Player name
 * @param {string} tournamentName - Tournament name
 */
const sendRegistrationAcceptance = async (phone, playerName, tournamentName) => {
  try {
    const message = `Hi ${playerName}, Your registration for "${tournamentName}" has been accepted! We look forward to seeing you at the tournament.`;
    
    // Try sending as text message
    try {
      return await sendTextMessage(phone, message);
    } catch (textError) {
      logger.warn('Text message failed, trying template:', textError.message);
      
      // Fallback to hello_world template
      return await sendTemplateMessage(phone, 'hello_world', 'en_US');
    }
  } catch (error) {
    logger.error('Send registration acceptance error:', error);
    throw error;
  }
};

/**
 * Send match notification via WhatsApp
 * @param {string} phone - Phone number
 * @param {string} playerName - Player name
 * @param {string} matchDetails - Match details
 */
const sendMatchNotification = async (phone, playerName, matchDetails) => {
  try {
    const message = `Hi ${playerName}, ${matchDetails}`;
    
    try {
      return await sendTextMessage(phone, message);
    } catch (textError) {
      logger.warn('Text message failed, trying template:', textError.message);
      return await sendTemplateMessage(phone, 'hello_world', 'en_US');
    }
  } catch (error) {
    logger.error('Send match notification error:', error);
    throw error;
  }
};

module.exports = {
  sendTemplateMessage,
  sendTextMessage,
  sendTournamentInvitation,
  sendRegistrationAcceptance,
  sendMatchNotification,
  formatPhoneNumber
};

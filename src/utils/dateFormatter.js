/**
 * Date formatting utilities for consistent date display across the application
 * Format: dd/mm/yyyy (European/International format)
 */

/**
 * Parse MySQL DATETIME string to Date object without timezone conversion
 * @param {string} dateString - MySQL DATETIME string (YYYY-MM-DD HH:MM:SS)
 * @returns {Date} Date object in local timezone
 */
export const parseMySQLDate = (dateString) => {
  if (!dateString) return null;
  
  // Parse MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) without timezone conversion
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (match) {
    const [, year, month, day, hours = '00', minutes = '00', seconds = '00'] = match;
    // Create date in local timezone (months are 0-indexed in JavaScript)
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds));
  }
  
  // Fallback to Date constructor for other formats
  return new Date(dateString);
};

/**
 * Formats a date to dd/mm/yyyy format
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date string in dd/mm/yyyy format
 */
export const formatDate = (date) => {
  // console.log('🔍 formatDate input:', date, 'Type:', typeof date, 'Is Date?:', date instanceof Date);
  
  if (!date) return 'N/A';
  
  // If it's a string, parse it directly without timezone conversion
  if (typeof date === 'string') {
    // Parse MySQL DATE or DATETIME format - extract only the date part (YYYY-MM-DD)
    // This ignores time completely and avoids timezone conversion issues
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const result = `${day}/${month}/${year}`;
      // console.log('✅ formatDate output (from string):', result);
      return result;
    }
  }
  
  // Handle Date objects - extract date parts in LOCAL timezone
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      // console.log('❌ Invalid Date object');
      return 'N/A';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const result = `${day}/${month}/${year}`;
    // console.log('✅ formatDate output (from Date):', result, 'Original Date:', date.toISOString());
    return result;
  }
  
  // console.log('❌ formatDate: Could not format, returning N/A');
  return 'N/A';
};

/**
 * Formats a date to dd/mm/yyyy with time
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date string in dd/mm/yyyy HH:MM:SS format
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  if (typeof date === 'string') {
    // Parse MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) without timezone conversion
    const dateTimeMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (dateTimeMatch) {
      const [, year, month, day, hours, minutes, seconds] = dateTimeMatch;
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  const formattedDate = formatDate(dateObj);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  return `${formattedDate} ${hours}:${minutes}:${seconds}`;
};

/**
 * Formats a date to short format (dd MMM yyyy)
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date string in dd MMM yyyy format
 */
export const formatDateShort = (date) => {
  if (!date) return 'N/A';
  
  // If it's a string, parse it directly without timezone conversion
  if (typeof date === 'string') {
    // Parse MySQL DATE or DATETIME format - extract only the date part (YYYY-MM-DD)
    // This ignores time completely and avoids timezone conversion issues
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${parseInt(day)} ${monthNames[parseInt(month) - 1]}`;
    }
  }
  
  // Handle Date objects - extract date parts in LOCAL timezone
  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = date.getMonth();
    return `${day} ${monthNames[month]}`;
  }
  
  return 'N/A';
};

/**
 * Formats a date to time only (HH:MM:SS)
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Formats a date for display in short month format (MMM dd)
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date string in MMM dd format
 */
export const formatDateMonthDay = (date) => {
  if (!date) return 'N/A';
  
  let dateObj;
  
  if (typeof date === 'string') {
    // Parse MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) without timezone conversion
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${parseInt(day)} ${monthNames[parseInt(month) - 1]}`;
    }
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-GB', { month: 'short' });
  
  return `${day} ${month}`;
};

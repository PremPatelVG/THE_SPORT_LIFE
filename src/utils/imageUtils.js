/**
 * Utility function to get the complete image URL
 * @param {string} imagePath - The relative image path from the API
 * @returns {string} - Complete image URL with base URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If the path already includes http/https, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Otherwise, prepend the API base URL
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl}${imagePath}`;
};

/**
 * Get user initials from first and last name
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {string} - User initials (e.g., "JD")
 */
export const getUserInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return '?';
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase();
};

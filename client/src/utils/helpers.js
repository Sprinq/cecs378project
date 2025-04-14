// utils/helpers.js - Utility functions for the application

/**
 * Format bytes to a human-readable string
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted string (e.g. "1.5 MB")
 */
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  /**
   * Safely truncate a string to a maximum length
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add when truncated (default: "...")
   * @returns {string} - Truncated string
   */
  export const truncateString = (str, maxLength, suffix = '...') => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    
    return str.substring(0, maxLength - suffix.length) + suffix;
  };
  
  /**
   * Debounce a function call
   * @param {function} func - Function to debounce
   * @param {number} wait - Debounce delay in milliseconds
   * @returns {function} - Debounced function
   */
  export const debounce = (func, wait) => {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  /**
   * Generate a random string (useful for keys, IDs, etc.)
   * @param {number} length - Length of the random string
   * @returns {string} - Random string
   */
  export const generateRandomString = (length = 16) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  };
  
  /**
   * Check if a string is a valid URL
   * @param {string} url - URL to check
   * @returns {boolean} - True if valid URL
   */
  export const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  /**
   * Get initials from a name (e.g. "John Doe" -> "JD")
   * @param {string} name - Name to get initials from
   * @param {number} limit - Maximum number of initials (default: 2)
   * @returns {string} - Initials
   */
  export const getInitials = (name, limit = 2) => {
    if (!name) return '';
    
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, limit)
      .join('')
      .toUpperCase();
  };
  
  /**
   * Pluralize a word based on count
   * @param {string} singular - Singular form of the word
   * @param {string} plural - Plural form of the word
   * @param {number} count - Count to base pluralization on
   * @returns {string} - Pluralized word
   */
  export const pluralize = (singular, plural, count) => {
    return count === 1 ? singular : plural;
  };
  
  /**
   * Format a date relative to now (e.g. "5 minutes ago")
   * @param {Date|string|number} date - Date to format
   * @returns {string} - Formatted relative time
   */
  export const formatRelativeTime = (date) => {
    const now = new Date();
    const inputDate = new Date(date);
    const diffMs = now - inputDate;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} ${pluralize('minute', 'minutes', diffMin)} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} ${pluralize('hour', 'hours', diffHour)} ago`;
    } else if (diffDay < 7) {
      return `${diffDay} ${pluralize('day', 'days', diffDay)} ago`;
    } else {
      // Format as MM/DD/YYYY
      return inputDate.toLocaleDateString();
    }
  };
  
  /**
   * Get a color based on a string (useful for generating consistent avatar colors)
   * @param {string} str - String to derive color from
   * @returns {string} - Hex color code
   */
  export const stringToColor = (str) => {
    if (!str) return '#4f46e5'; // Default to indigo
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  };
  
  /**
   * Calculate encryption key entropy to estimate strength
   * @param {string} key - Key to check
   * @returns {string} - Strength rating ('weak', 'medium', 'strong', 'very strong')
   */
  export const calculateKeyStrength = (key) => {
    if (!key) return 'weak';
    
    // Basic entropy calculation
    const length = key.length;
    let charset = 0;
    
    if (/[a-z]/.test(key)) charset += 26;
    if (/[A-Z]/.test(key)) charset += 26;
    if (/[0-9]/.test(key)) charset += 10;
    if (/[^a-zA-Z0-9]/.test(key)) charset += 33;
    
    const entropy = Math.log2(Math.pow(charset, length));
    
    if (entropy < 64) return 'weak';
    if (entropy < 128) return 'medium';
    if (entropy < 256) return 'strong';
    return 'very strong';
  };
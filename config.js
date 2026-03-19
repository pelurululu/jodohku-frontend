/* ══════════════════════════════════════
   CONFIGURATION
   ══════════════════════════════════════ */

const CONFIG = {
  // Backend API configuration
  API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api/v1'
    : 'https://api.jodohku.my/api/v1',
  
  // WebSocket configuration
  get WS_BASE() {
    return this.API_BASE
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')
      .replace('/api/v1', '');
  },
  
  // Pagination
  GALLERY_PAGE_SIZE: 10,
  
  // Chat
  CHAT_RECONNECT_DELAY: 3000,
  
  // Toast duration
  TOAST_DURATION: 3500,
  
  // Storage keys
  STORAGE: {
    TOKEN: 'jk_token',
    REFRESH: 'jk_refresh',
    USER: 'jk_user'
  },
  
  // Validation rules
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_NUMBER: true
  },
  
  OTP: {
    LENGTH: 6,
    VALIDITY_MINUTES: 10
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

/* ══════════════════════════════════════
   UTILITY FUNCTIONS
   ══════════════════════════════════════ */

const Utils = {
  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || document.body;
    
    // Remove existing toast
    const existing = document.getElementById('jk-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = 'jk-toast';
    
    const colors = {
      info: '#1B2A4A',
      error: '#EF4444',
      success: '#1A7A45',
      warn: '#C8A23C'
    };
    
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${colors[type] || colors.info};
      color: #fff;
      padding: 12px 22px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 16px rgba(0,0,0,.2);
      animation: fadeUp .3s ease;
      white-space: nowrap;
      max-width: 90vw;
    `;
    
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, CONFIG.TOAST_DURATION);
  },
  
  /**
   * Set loading state on button
   */
  setLoading(button, isLoading, label) {
    if (!button) return;
    
    button.disabled = isLoading;
    
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = 'Sila tunggu...';
    } else {
      button.textContent = label || button.dataset.originalText || button.textContent;
    }
  },
  
  /**
   * Format date/time in Malay locale
   */
  formatDateTime(date, options = {}) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('ms-MY', options);
  },
  
  /**
   * Format time only
   */
  formatTime(date) {
    return this.formatDateTime(date, {
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  /**
   * Validate email
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  /**
   * Validate password
   */
  validatePassword(password) {
    const errors = [];
    
    if (password.length < CONFIG.PASSWORD.MIN_LENGTH) {
      errors.push(`Minimum ${CONFIG.PASSWORD.MIN_LENGTH} aksara`);
    }
    
    if (CONFIG.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Mesti ada huruf besar');
    }
    
    if (CONFIG.PASSWORD.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
      errors.push('Mesti ada nombor');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  /**
   * Scroll to top smoothly
   */
  scrollToTop() {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  },
  
  /**
   * Generate initials from name
   */
  getInitials(name) {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
};

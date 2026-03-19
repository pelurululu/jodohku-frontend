/* ══════════════════════════════════════
   AUTHENTICATION MODULE
   ══════════════════════════════════════ */

const Auth = {
  /**
   * Get access token from localStorage
   */
  getToken() {
    return localStorage.getItem(CONFIG.STORAGE.TOKEN);
  },
  
  /**
   * Get refresh token from localStorage
   */
  getRefresh() {
    return localStorage.getItem(CONFIG.STORAGE.REFRESH);
  },
  
  /**
   * Store tokens in localStorage
   */
  setTokens(accessToken, refreshToken) {
    localStorage.setItem(CONFIG.STORAGE.TOKEN, accessToken);
    if (refreshToken) {
      localStorage.setItem(CONFIG.STORAGE.REFRESH, refreshToken);
    }
  },
  
  /**
   * Clear all auth data
   */
  clear() {
    Object.values(CONFIG.STORAGE).forEach(key => {
      localStorage.removeItem(key);
    });
    State.reset();
  },
  
  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.getToken();
  },
  
  /**
   * Get current user from localStorage
   */
  getUser() {
    try {
      const userData = localStorage.getItem(CONFIG.STORAGE.USER);
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      console.error('Failed to parse user data:', e);
      return null;
    }
  },
  
  /**
   * Store user data in localStorage
   */
  setUser(user) {
    localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(user));
    State.currentUser = user;
  },
  
  /**
   * Login user
   */
  async login(email, password) {
    try {
      const response = await API.post('/auth/login', { email, password });
      
      if (response.access_token) {
        this.setTokens(response.access_token, response.refresh_token);
        this.setUser(response);
        return { success: true, data: response };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed' };
    }
  },
  
  /**
   * Register new user
   */
  async register(email, password) {
    try {
      const response = await API.post('/auth/register', { email, password });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  },
  
  /**
   * Verify OTP
   */
  async verifyOTP(email, otpCode) {
    try {
      const response = await API.post('/auth/verify-otp', { 
        email, 
        otp_code: otpCode 
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message || 'OTP verification failed' };
    }
  },
  
  /**
   * Refresh access token
   */
  async refreshToken() {
    const refreshToken = this.getRefresh();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await fetch(`${CONFIG.API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch (error) {
      this.clear();
      throw error;
    }
  },
  
  /**
   * Logout user
   */
  async logout() {
    try {
      await API.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clear();
      Navigation.go('landing');
    }
  }
};

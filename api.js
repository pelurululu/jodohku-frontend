/* ══════════════════════════════════════
   API CLIENT MODULE
   ══════════════════════════════════════ */

const API = {
  /**
   * Make authenticated API request
   */
  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add auth token if available
    const token = Auth.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      let response = await fetch(`${CONFIG.API_BASE}${path}`, {
        ...options,
        headers
      });
      
      // Handle 401 - try to refresh token
      if (response.status === 401 && Auth.getRefresh()) {
        try {
          const newToken = await Auth.refreshToken();
          headers['Authorization'] = `Bearer ${newToken}`;
          
          // Retry original request with new token
          response = await fetch(`${CONFIG.API_BASE}${path}`, {
            ...options,
            headers
          });
        } catch (refreshError) {
          // Refresh failed - redirect to login
          Auth.clear();
          Navigation.go('login');
          throw new Error('Session expired. Please login again.');
        }
      }
      
      // Parse response
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(data.detail || data.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  /**
   * GET request
   */
  async get(path, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${path}?${queryString}` : path;
    return this.request(url, { method: 'GET' });
  },
  
  /**
   * POST request
   */
  async post(path, data = {}) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * PUT request
   */
  async put(path, data = {}) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * PATCH request
   */
  async patch(path, data = {}) {
    return this.request(path, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * DELETE request
   */
  async delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
};

/**
 * Gallery API endpoints
 */
API.Gallery = {
  async fetchProfiles(page = 1, pageSize = CONFIG.GALLERY_PAGE_SIZE) {
    return API.get('/gallery/', { page, page_size: pageSize });
  },
  
  async performAction(targetUserId, action) {
    return API.post('/gallery/action', {
      target_user_id: targetUserId,
      action
    });
  },
  
  async saveFavorite(userId) {
    return this.performAction(userId, 'save_favorite');
  },
  
  async unlike(userId) {
    return this.performAction(userId, 'unlike');
  },
  
  async skip(userId) {
    return this.performAction(userId, 'skip');
  }
};

/**
 * Chat API endpoints
 */
API.Chat = {
  async getConversations() {
    return API.get('/chat/conversations');
  },
  
  async getMessages(conversationId, page = 1) {
    return API.get(`/chat/conversations/${conversationId}/messages`, { page });
  },
  
  async sendMessage(conversationId, content, isIceBreaker = false) {
    return API.post(`/chat/conversations/${conversationId}/messages`, {
      content,
      is_ice_breaker: isIceBreaker
    });
  },
  
  async markAsRead(conversationId) {
    return API.post(`/chat/conversations/${conversationId}/read`);
  }
};

/**
 * Profile API endpoints
 */
API.Profile = {
  async getMe() {
    return API.get('/profile/me');
  },
  
  async updateProfile(data) {
    return API.put('/profile/me', data);
  },
  
  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return API.request('/profile/photo', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData
    });
  }
};

/**
 * Notifications API endpoints
 */
API.Notifications = {
  async getAll() {
    return API.get('/notifications/');
  },
  
  async markAsRead(notificationId) {
    return API.post(`/notifications/${notificationId}/read`);
  },
  
  async markAllAsRead() {
    return API.post('/notifications/read-all');
  }
};

/**
 * Payment API endpoints
 */
API.Payment = {
  async getSubscription() {
    return API.get('/payment/subscription');
  },
  
  async createCheckout(planId) {
    return API.post('/payment/checkout', { plan_id: planId });
  },
  
  async cancelSubscription() {
    return API.post('/payment/subscription/cancel');
  }
};

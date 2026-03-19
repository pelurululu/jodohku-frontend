/* ══════════════════════════════════════
   STATE MANAGEMENT
   ══════════════════════════════════════ */

const State = {
  // Current page
  currentPage: 'landing',
  
  // Registration flow
  registration: {
    step: 1,
    email: '',
    password: ''
  },
  
  // Chat state
  chat: {
    activeChatIdx: 0,
    messages: [],
    conversations: [],
    wsConnection: null
  },
  
  // Gallery state
  gallery: {
    profiles: [],
    favorites: new Set(),
    page: 1,
    loading: false,
    hasMore: true
  },
  
  // Notifications
  notifications: [],
  
  // Current user
  currentUser: null,
  
  // Reset methods
  reset() {
    this.currentPage = 'landing';
    this.registration = { step: 1, email: '', password: '' };
    this.chat = { activeChatIdx: 0, messages: [], conversations: [], wsConnection: null };
    this.gallery = { profiles: [], favorites: new Set(), page: 1, loading: false, hasMore: true };
    this.notifications = [];
    this.currentUser = null;
  },
  
  // Getters
  getUnreadCount() {
    return this.chat.conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  },
  
  getUnreadNotifications() {
    return this.notifications.filter(n => !n.read).length;
  }
};

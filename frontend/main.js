/* ══════════════════════════════════════
   MAIN APPLICATION INITIALIZATION
   ══════════════════════════════════════ */

// Navigation module
const Navigation = {
  /**
   * Navigate to a page
   */
  async go(pageName) {
    const protectedPages = ['gallery', 'chat', 'profile', 'payment', 'notif', 'settings', 'success'];
    
    // Check authentication for protected pages
    if (protectedPages.includes(pageName) && !Auth.isLoggedIn()) {
      Utils.showToast('Sila log masuk dahulu.', 'warn');
      return this.go('login');
    }
    
    // Hide all pages
    document.querySelectorAll('.pg').forEach(page => {
      page.classList.remove('on');
    });
    
    // Update state
    State.currentPage = pageName;
    
    // Show target page
    const targetPage = document.getElementById(`pg-${pageName}`);
    if (targetPage) {
      targetPage.classList.add('on');
      Utils.scrollToTop();
    }
    
    // Load page-specific data
    await this.loadPageData(pageName);
    
    // Close mobile sidebar if open
    this.closeMobileSidebar();
  },
  
  /**
   * Load page-specific data
   */
  async loadPageData(pageName) {
    try {
      switch(pageName) {
        case 'gallery':
          if (State.gallery.profiles.length === 0) {
            await GalleryPage.loadProfiles();
          } else {
            GalleryPage.render();
          }
          break;
          
        case 'chat':
          await ChatPage.loadConversations();
          ChatPage.setupWebSocket();
          ChatPage.render();
          break;
          
        case 'profile':
          await ProfilePage.loadProfile();
          ProfilePage.render();
          break;
          
        case 'payment':
          await PaymentPage.loadSubscription();
          PaymentPage.render();
          break;
          
        case 'notif':
          await NotificationsPage.loadNotifications();
          NotificationsPage.render();
          break;
          
        case 'settings':
          SettingsPage.render();
          break;
          
        case 'success':
          SuccessPage.render();
          break;
          
        case 'landing':
          LandingPage.render();
          break;
          
        case 'login':
          AuthPage.renderLogin();
          break;
          
        case 'register':
          AuthPage.renderRegister();
          break;
      }
    } catch (error) {
      console.error(`Error loading ${pageName}:`, error);
      Utils.showToast('Ralat memuatkan halaman. Sila cuba lagi.', 'error');
    }
  },
  
  /**
   * Open mobile sidebar
   */
  openMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('side-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  
  /**
   * Close mobile sidebar
   */
  closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('side-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  },
  
  /**
   * Start a chat with a user
   */
  async startChat(userId) {
    // Find or create conversation
    const existingConv = State.chat.conversations.find(
      c => c.partner && c.partner.id === userId
    );
    
    if (existingConv) {
      State.chat.activeChatIdx = State.chat.conversations.indexOf(existingConv);
      this.go('chat');
    } else {
      // Create new conversation via API
      try {
        const conv = await API.Chat.createConversation(userId);
        State.chat.conversations.unshift(conv);
        State.chat.activeChatIdx = 0;
        this.go('chat');
      } catch (error) {
        Utils.showToast('Gagal memulakan sembang.', 'error');
      }
    }
  }
};

// Components module
const Components = {
  Sidebar: {
    render(activePage) {
      const items = [
        { id: 'gallery', label: 'Bilik Pameran', icon: 'gallery' },
        { id: 'chat', label: 'Sembang', icon: 'chat', badge: State.getUnreadCount() },
        { id: 'profile', label: 'Profil Saya', icon: 'profile' },
        { id: 'payment', label: 'Langganan', icon: 'payment' },
        { id: 'success', label: 'Kisah Kejayaan', icon: 'success' },
        { id: 'notif', label: 'Notifikasi', icon: 'notif', badge: State.getUnreadNotifications() },
        { id: 'settings', label: 'Tetapan', icon: 'settings' }
      ];
      
      const user = Auth.getUser();
      const codeName = user?.code_name || '---';
      const profileProgress = user?.profile_completion || 0;
      
      return `
        <div class="side" id="app-sidebar">
          <div class="side-hd">
            <div class="logo" onclick="Navigation.go('landing')">
              <div class="logo-ic" style="width:32px;height:32px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
              </div>
              <div class="logo-tx" style="font-size:16px">Jodohku<b>.my</b></div>
            </div>
          </div>
          <div class="side-user">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="side-av">${Utils.getInitials(codeName)}</div>
              <div>
                <div style="font-family:var(--fm);font-size:13px;font-weight:600">${Utils.escapeHtml(codeName)}</div>
                <div class="badge b-gld" style="font-size:8px;padding:2px 8px;margin-top:3px">${user?.tier?.toUpperCase() || 'RAHMAH'}</div>
              </div>
            </div>
            <div style="margin-top:10px">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--im)">
                <span>Profil</span>
                <span>${profileProgress}%</span>
              </div>
              <div class="progress" style="margin-top:4px">
                <div class="progress-fill" style="width:${profileProgress}%"></div>
              </div>
            </div>
          </div>
          <nav class="side-nav">
            ${items.map(item => `
              <button class="nav-i ${activePage === item.id ? 'on' : ''}" onclick="Navigation.go('${item.id}')">
                ${ICONS[item.icon]}
                <span style="flex:1">${item.label}</span>
                ${item.badge ? `<span class="nb">${item.badge}</span>` : ''}
              </button>
            `).join('')}
          </nav>
          <div class="side-bt">
            <button class="nav-i" style="color:#EF4444;width:100%" onclick="Auth.logout()">
              ${ICONS.logout} <span>Log Keluar</span>
            </button>
          </div>
        </div>
        <div class="main">
          <div class="topbar">
            <div class="topbar-left">
              <button class="mob-menu-btn" onclick="Navigation.openMobileSidebar()">
                ${ICONS.menu}
              </button>
            </div>
            <div class="topbar-right">
              <button class="icon-btn" onclick="Navigation.go('notif')" title="Notifikasi">
                ${ICONS.notif}
                ${State.getUnreadNotifications() ? '<span class="notif-dot"></span>' : ''}
              </button>
            </div>
          </div>
          <div class="pgc">
      `;
    },
    
    renderEnd() {
      return `
          </div>
        </div>
      `;
    }
  },
  
  BottomNav: {
    update(activePage) {
      const items = [
        { id: 'gallery', label: 'Galeri', icon: 'gallery' },
        { id: 'chat', label: 'Sembang', icon: 'chat', badge: State.getUnreadCount() },
        { id: 'profile', label: 'Profil', icon: 'profile' },
        { id: 'notif', label: 'Notif', icon: 'notif', badge: State.getUnreadNotifications() }
      ];
      
      const nav = document.getElementById('bottom-nav-inner');
      if (!nav) {
        // Create bottom nav if it doesn't exist
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'bottom-nav';
        bottomNav.innerHTML = '<div class="bottom-nav-inner" id="bottom-nav-inner"></div>';
        document.body.appendChild(bottomNav);
        return this.update(activePage);
      }
      
      nav.innerHTML = items.map(item => `
        <button class="bn-item ${activePage === item.id ? 'on' : ''}" onclick="Navigation.go('${item.id}')">
          ${item.badge ? `<span class="bn-badge">${item.badge}</span>` : ''}
          ${ICONS[item.icon]}
          <span>${item.label}</span>
        </button>
      `).join('');
    }
  }
};

// Mobile menu toggle
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const menuIcon = document.getElementById('nav-icon-menu');
  const closeIcon = document.getElementById('nav-icon-close');
  
  const isOpen = menu.classList.toggle('open');
  
  if (menuIcon) menuIcon.style.display = isOpen ? 'none' : 'block';
  if (closeIcon) closeIcon.style.display = isOpen ? 'block' : 'none';
}

// Scroll to section
function scrollToSection(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    toggleMobileMenu(); // Close menu after clicking
  }
}

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Jodohku.my initializing...');
  
  // Check if user is logged in
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    State.currentUser = user;
    
    // Load initial data
    try {
      await Promise.all([
        API.Profile.getMe().then(data => {
          Auth.setUser(data);
          State.currentUser = data;
        }),
        API.Notifications.getAll().then(data => {
          State.notifications = (data.notifications || data.items || []).map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body || n.message || '',
            time: Utils.formatDateTime(n.created_at),
            read: n.is_read
          }));
        })
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
    
    // Navigate to gallery by default
    Navigation.go('gallery');
  } else {
    // Show landing page
    LandingPage.render();
  }
  
  // Setup side overlay click handler
  const overlay = document.getElementById('side-overlay');
  if (overlay) {
    overlay.addEventListener('click', Navigation.closeMobileSidebar);
  }
  
  console.log('✅ Jodohku.my ready!');
});

// Handle browser back/forward
window.addEventListener('popstate', () => {
  // Could implement routing history here if needed
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Could send to error tracking service here
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Could send to error tracking service here
});

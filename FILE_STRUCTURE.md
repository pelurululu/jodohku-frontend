# 📋 Remaining Files to Create

This document lists all the remaining files you need to create to complete the Jodohku.my frontend.

## CSS Files

### css/pages.css
Contains styles for all page-specific components:
- Landing page (hero, sections, footer)
- Auth pages (login/register forms, step indicators)
- Gallery (profile cards, filters)
- Chat (conversation list, message bubbles)
- Profile (user info display)
- Payment (subscription cards)
- Notifications (notification items)
- Settings (settings groups)
- Success stories (testimonial cards)

**Key sections to include:**
```css
/* Navigation */
.topnav { ... }
.mobile-menu { ... }

/* Hero section */
.hero { ... }
.hero-glow { ... }

/* Profile cards */
.pcard { ... }
.pcard-ph { ... }
.pcard-info { ... }

/* Chat interface */
.chat-wrap { ... }
.chat-list { ... }
.chat-area { ... }
.msg { ... }

/* Auth pages */
.auth { ... }
.auth-brand { ... }
.auth-form { ... }
.steps { ... }
```

### css/responsive.css
Mobile-specific styles and breakpoints:

```css
@media (max-width: 768px) {
  /* Hide desktop nav */
  .nav-links { display: none; }
  .nav-toggle { display: flex; }
  
  /* Mobile sidebar */
  .side { transform: translateX(-100%); }
  .side.open { transform: translateX(0); }
  .main { margin-left: 0; }
  
  /* Show bottom nav */
  .bottom-nav { display: block; }
  .mob-menu-btn { display: flex; }
  
  /* Adjust layouts */
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .chat-list { width: 100%; }
  
  /* Hide auth brand panel */
  .auth-brand { display: none; }
}

@media (max-width: 480px) {
  .grid-4 { grid-template-columns: 1fr; }
  .hero h1 { font-size: 1.8rem; }
}
```

## JavaScript - Page Modules

### js/pages/landing.js
```javascript
const LandingPage = {
  render() {
    // Render landing page content
    // - Hero section
    // - How it works
    // - Features
    // - Pricing tiers
    // - Footer
  },
  
  buildPricingTiers() {
    // Render pricing cards
  },
  
  setupEventListeners() {
    // Scroll animations, etc.
  }
};
```

### js/pages/auth.js
```javascript
const AuthPage = {
  renderLogin() {
    // Render login form
  },
  
  renderRegister() {
    // Render registration multi-step form
  },
  
  async handleLogin(event) {
    // Process login
  },
  
  async handleRegister(event) {
    // Process registration
  },
  
  async handleVerifyOTP(event) {
    // Verify OTP
  },
  
  nextStep() {
    // Move to next registration step
  },
  
  prevStep() {
    // Go back to previous step
  }
};
```

### js/pages/chat.js
```javascript
const ChatPage = {
  async loadConversations() {
    // Load conversations from API
  },
  
  async loadMessages(conversationId) {
    // Load messages for a conversation
  },
  
  async sendMessage() {
    // Send a new message
  },
  
  setupWebSocket() {
    // Setup WebSocket connection
  },
  
  handleWebSocketMessage(data) {
    // Handle incoming WebSocket messages
  },
  
  render() {
    // Render chat interface
  },
  
  showConversation(index) {
    // Show specific conversation (mobile)
  },
  
  showConversationList() {
    // Back to list (mobile)
  }
};
```

### js/pages/profile.js
```javascript
const ProfilePage = {
  async loadProfile() {
    // Load current user profile
  },
  
  async updateProfile(data) {
    // Update profile data
  },
  
  async uploadPhoto(file) {
    // Upload profile photo
  },
  
  render() {
    // Render profile page
  }
};
```

### js/pages/payment.js
```javascript
const PaymentPage = {
  async loadSubscription() {
    // Load current subscription
  },
  
  async createCheckout(planId) {
    // Create payment checkout
  },
  
  async cancelSubscription() {
    // Cancel subscription
  },
  
  render() {
    // Render payment/subscription page
  },
  
  renderPricingCards() {
    // Render subscription tiers
  }
};
```

### js/pages/notifications.js
```javascript
const NotificationsPage = {
  async loadNotifications() {
    // Load notifications from API
  },
  
  async markAsRead(index) {
    // Mark single notification as read
  },
  
  async markAllAsRead() {
    // Mark all notifications as read
  },
  
  render() {
    // Render notifications page
  }
};
```

### js/pages/settings.js
```javascript
const SettingsPage = {
  render() {
    // Render settings page
    // - Account & security
    // - Preferences
    // - Wali mode
    // - Danger zone
  },
  
  async changePassword() {
    // Change password
  },
  
  async updatePreferences(data) {
    // Update user preferences
  },
  
  async deleteAccount() {
    // Delete user account
  }
};
```

### js/pages/success.js
```javascript
const SuccessPage = {
  render() {
    // Render success stories page
  },
  
  async loadSuccessStories() {
    // Load success stories from API
  }
};
```

## JavaScript - Component Modules

### js/components/sidebar.js
Already created in main.js as Components.Sidebar, but you may want to extract it:

```javascript
const Sidebar = {
  render(activePage) {
    // Render sidebar
  },
  
  renderEnd() {
    // Close sidebar HTML
  }
};
```

### js/components/navigation.js
Already created in main.js as Navigation, but you may want to extract it.

## Additional Files

### .gitignore
```
# Dependencies
node_modules/

# Production
/build
/dist

# Misc
.DS_Store
.env
.env.local
.env.production

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor
.vscode/
.idea/
*.swp
*.swo

# OS
Thumbs.db
```

### netlify.toml (if using Netlify)
```toml
[build]
  publish = "."
  
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### vercel.json (if using Vercel)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### package.json (optional, for development)
```json
{
  "name": "jodohku-frontend",
  "version": "1.0.0",
  "description": "Jodohku.my Frontend",
  "scripts": {
    "dev": "python -m http.server 3000",
    "deploy": "netlify deploy --prod"
  },
  "devDependencies": {
    "netlify-cli": "^17.0.0"
  }
}
```

## Priority Order for Implementation

1. **Critical (Must have for MVP)**
   - ✅ css/variables.css (DONE)
   - ✅ css/base.css (DONE)
   - ✅ css/components.css (DONE)
   - css/pages.css
   - css/responsive.css
   - js/pages/auth.js
   - js/pages/gallery.js (DONE)
   - js/pages/chat.js

2. **Important (Needed for launch)**
   - js/pages/landing.js
   - js/pages/profile.js
   - js/pages/payment.js
   - js/pages/notifications.js

3. **Nice to have**
   - js/pages/settings.js
   - js/pages/success.js

## Quick Start Commands

```bash
# Create directory structure
mkdir -p css js/pages js/components

# Create all CSS files
touch css/pages.css css/responsive.css

# Create all JS page files
touch js/pages/landing.js js/pages/auth.js js/pages/chat.js
touch js/pages/profile.js js/pages/payment.js js/pages/notifications.js
touch js/pages/settings.js js/pages/success.js

# Create component files
touch js/components/sidebar.js js/components/navigation.js

# Create config files
touch .gitignore netlify.toml vercel.json
```

## Testing Each Page

After creating each page module:

1. Test navigation to the page
2. Verify API calls work
3. Check mobile responsiveness
4. Test error handling
5. Verify loading states
6. Check accessibility

## Notes

- All pages should use the `Utils` module for common functions
- All pages should use the `API` module for backend calls
- All pages should update `State` when data changes
- All pages should handle errors gracefully
- All user input must be escaped to prevent XSS

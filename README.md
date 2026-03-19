# Jodohku.my Frontend

Production-ready frontend for Jodohku.my - Malaysia's #1 Islamic Matchmaking Platform.

## 📁 Project Structure

```
jodohku-frontend/
├── index.html              # Main HTML entry point
├── css/
│   ├── variables.css       # CSS custom properties
│   ├── base.css           # Base styles & animations
│   ├── components.css     # Shared component styles
│   ├── pages.css          # Page-specific styles
│   └── responsive.css     # Mobile responsive styles
├── js/
│   ├── config.js          # Configuration & environment
│   ├── icons.js           # SVG icon library
│   ├── state.js           # Global state management
│   ├── auth.js            # Authentication logic
│   ├── api.js             # API client with auto-refresh
│   ├── utils.js           # Utility functions
│   ├── main.js            # App initialization
│   ├── components/
│   │   ├── sidebar.js     # Sidebar component
│   │   └── navigation.js  # Navigation logic
│   └── pages/
│       ├── landing.js     # Landing page
│       ├── auth.js        # Login/Register
│       ├── gallery.js     # Profile gallery
│       ├── chat.js        # Messaging
│       ├── profile.js     # User profile
│       ├── payment.js     # Subscription
│       ├── notifications.js
│       ├── settings.js
│       └── success.js     # Success stories
└── README.md
```

## 🚀 Deployment

### Prerequisites

- Backend API running at `https://api.jodohku.my`
- CORS properly configured on backend
- SSL certificate for HTTPS

### Environment Configuration

The app automatically detects the environment:

- **Development**: `localhost` → `http://localhost:8000/api/v1`
- **Production**: Any other domain → `https://api.jodohku.my/api/v1`

To change the production API URL, edit `js/config.js`:

```javascript
API_BASE: 'https://your-api-domain.com/api/v1'
```

### Option 1: Static File Hosting (Recommended)

Deploy to any static hosting service:

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### GitHub Pages
```bash
# Push to GitHub
git push origin main

# Enable GitHub Pages in repo settings
# Point to main branch
```

#### AWS S3 + CloudFront
```bash
# Upload to S3 bucket
aws s3 sync . s3://your-bucket-name --exclude ".git/*"

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Option 2: Traditional Web Server

#### Nginx
```nginx
server {
    listen 80;
    server_name jodohku.my www.jodohku.my;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jodohku.my www.jodohku.my;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/jodohku;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caching for static assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### Apache
```apache
<VirtualHost *:80>
    ServerName jodohku.my
    ServerAlias www.jodohku.my
    Redirect permanent / https://jodohku.my/
</VirtualHost>

<VirtualHost *:443>
    ServerName jodohku.my
    ServerAlias www.jodohku.my

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    DocumentRoot /var/www/jodohku
    
    <Directory /var/www/jodohku>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # SPA routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Caching
    <FilesMatch "\.(css|js|jpg|jpeg|png|gif|ico|svg)$">
        Header set Cache-Control "max-age=31536000, public"
    </FilesMatch>
</VirtualHost>
```

## 🔧 Backend Integration Checklist

### 1. CORS Configuration

Your backend must allow requests from the frontend domain:

```python
# FastAPI example
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jodohku.my",
        "https://www.jodohku.my",
        "http://localhost:3000"  # Development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Required API Endpoints

Ensure these endpoints are implemented:

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/verify-otp` - OTP verification
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - User logout

#### Gallery
- `GET /api/v1/gallery/?page={page}&page_size={size}` - Get profiles
- `POST /api/v1/gallery/action` - Profile actions (save/skip/unlike)

#### Chat
- `GET /api/v1/chat/conversations` - Get conversations
- `GET /api/v1/chat/conversations/{id}/messages` - Get messages
- `POST /api/v1/chat/conversations/{id}/messages` - Send message
- `WS /api/v1/chat/ws/{token}` - WebSocket connection

#### Profile
- `GET /api/v1/profile/me` - Get current user
- `PUT /api/v1/profile/me` - Update profile
- `POST /api/v1/profile/photo` - Upload photo

#### Notifications
- `GET /api/v1/notifications/` - Get notifications
- `POST /api/v1/notifications/{id}/read` - Mark as read
- `POST /api/v1/notifications/read-all` - Mark all as read

#### Payment
- `GET /api/v1/payment/subscription` - Get subscription
- `POST /api/v1/payment/checkout` - Create checkout
- `POST /api/v1/payment/subscription/cancel` - Cancel subscription

### 3. Response Format

All API responses should follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

Error responses:
```json
{
  "detail": "Error message in Malay"
}
```

## 🔒 Security Considerations

1. **HTTPS Only** - Always use HTTPS in production
2. **Token Storage** - Access tokens stored in localStorage
3. **XSS Protection** - All user input is escaped
4. **CORS** - Backend must validate origin
5. **CSP Headers** - Recommended:
   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.jodohku.my wss://api.jodohku.my;";
   ```

## 🧪 Testing

### Local Development

1. Start a local server:
   ```bash
   # Python
   python -m http.server 3000
   
   # Node.js
   npx serve -l 3000
   
   # PHP
   php -S localhost:3000
   ```

2. Open `http://localhost:3000`

3. Ensure backend is running on `http://localhost:8000`

### Production Testing

1. Test all authentication flows
2. Verify token refresh works
3. Test WebSocket connections
4. Check mobile responsiveness
5. Verify all API endpoints return expected data

## 📱 Mobile Optimization

The app is fully responsive with:
- Mobile-first design
- Bottom navigation on mobile
- Touch-optimized buttons
- Viewport meta tag configured
- Safe area insets for iOS

## 🐛 Troubleshooting

### "Failed to load gallery"
- Check backend API is running
- Verify CORS is configured
- Check network tab for errors

### "Session expired"
- Token refresh may have failed
- Check if refresh token is valid
- Verify `/auth/refresh` endpoint works

### WebSocket not connecting
- Ensure WebSocket endpoint is accessible
- Check if token is being passed correctly
- Verify backend WebSocket handler

### Blank page after login
- Check browser console for errors
- Verify all JS files are loaded
- Check if API responses match expected format

## 📊 Performance

- All assets < 5MB total
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Lazy loading for images
- Debounced search inputs
- Pagination for large lists

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

## 📞 Support

For technical issues:
- Email: support@jodohku.my
- Documentation: https://docs.jodohku.my

## 📝 License

Copyright © 2025 Asas Technologies Sdn Bhd. All rights reserved.

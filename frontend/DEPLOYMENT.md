# 🚀 Jodohku.my Deployment Checklist

## Pre-Deployment

### Backend Verification
- [ ] Backend API is running at `https://api.jodohku.my`
- [ ] All required endpoints are implemented (see README)
- [ ] CORS is configured for production domain
- [ ] WebSocket endpoint is accessible
- [ ] SSL certificate is valid and not expired
- [ ] Database migrations are complete
- [ ] Environment variables are set correctly

### Frontend Preparation
- [ ] Update `js/config.js` with production API URL
- [ ] Remove any console.log statements
- [ ] Test all pages in production build
- [ ] Verify all images and assets load
- [ ] Check mobile responsiveness
- [ ] Test on multiple browsers

### Security
- [ ] HTTPS is enforced (no HTTP)
- [ ] CSP headers are configured
- [ ] XSS protection is enabled
- [ ] CORS is properly restricted
- [ ] Rate limiting is implemented on backend
- [ ] Input validation is working
- [ ] File upload limits are set

## Deployment Steps

### 1. Choose Hosting Platform

**Option A: Netlify (Recommended for simplicity)**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=.
```

**Option B: Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Option C: AWS S3 + CloudFront**
```bash
# Create S3 bucket
aws s3 mb s3://jodohku-frontend

# Enable static website hosting
aws s3 website s3://jodohku-frontend --index-document index.html --error-document index.html

# Upload files
aws s3 sync . s3://jodohku-frontend --delete --exclude ".git/*"

# Create CloudFront distribution (manual or CLI)
# Point to S3 bucket
# Configure custom domain and SSL
```

**Option D: Traditional Server (Nginx)**
```bash
# Upload files to server
scp -r * user@server:/var/www/jodohku/

# Configure Nginx (see README for config)
sudo nano /etc/nginx/sites-available/jodohku

# Enable site
sudo ln -s /etc/nginx/sites-available/jodohku /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 2. DNS Configuration

- [ ] Add A record pointing to server IP or CDN
- [ ] Add CNAME record for www subdomain
- [ ] Verify DNS propagation (use `dig` or `nslookup`)
- [ ] Wait for full propagation (up to 48 hours)

### 3. SSL Certificate

**Let's Encrypt (Free)**
```bash
sudo certbot --nginx -d jodohku.my -d www.jodohku.my
```

**Or use platform-managed SSL:**
- Netlify: Automatic
- Vercel: Automatic
- CloudFront: AWS Certificate Manager

### 4. Post-Deployment Testing

#### Functional Tests
- [ ] Landing page loads correctly
- [ ] Registration flow works (including OTP)
- [ ] Login works
- [ ] Gallery loads profiles from backend
- [ ] Chat functionality works
- [ ] Profile page displays user data
- [ ] Payment integration works
- [ ] Notifications load
- [ ] Settings page functional
- [ ] Logout works

#### Performance Tests
- [ ] Page load time < 3 seconds
- [ ] Images are optimized
- [ ] API responses < 500ms
- [ ] WebSocket connects successfully
- [ ] No console errors

#### Security Tests
- [ ] HTTPS redirect works (HTTP → HTTPS)
- [ ] Mixed content warnings absent
- [ ] CORS errors absent
- [ ] Tokens are properly secured
- [ ] Token refresh works automatically
- [ ] Session expiry handled correctly

#### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari
- [ ] Chrome Android

#### Mobile Testing
- [ ] Responsive design works
- [ ] Touch interactions work
- [ ] Bottom navigation appears
- [ ] Forms are usable
- [ ] Images scale properly
- [ ] Text is readable

## Monitoring Setup

### Analytics
- [ ] Google Analytics configured
- [ ] Facebook Pixel installed (if applicable)
- [ ] Conversion tracking set up

### Error Monitoring
- [ ] Sentry or similar error tracking
- [ ] Backend error logging
- [ ] Uptime monitoring (UptimeRobot, Pingdom)

### Performance Monitoring
- [ ] Google PageSpeed Insights score > 80
- [ ] Core Web Vitals pass
- [ ] Lighthouse audit score > 90

## Post-Launch

### Week 1
- [ ] Monitor error rates daily
- [ ] Check user feedback
- [ ] Fix critical bugs immediately
- [ ] Monitor server resources
- [ ] Check conversion funnel

### Week 2-4
- [ ] Analyze user behavior
- [ ] A/B test key features
- [ ] Optimize slow pages
- [ ] Address user complaints
- [ ] Plan feature updates

## Rollback Plan

If critical issues occur:

1. **Immediate Rollback**
   ```bash
   # Netlify
   netlify rollback
   
   # Vercel
   vercel rollback [deployment-url]
   
   # S3
   # Restore from previous version
   ```

2. **Notify Users**
   - Post maintenance notice
   - Update status page
   - Send email if necessary

3. **Fix and Redeploy**
   - Identify root cause
   - Test fix locally
   - Deploy to staging first
   - Then to production

## Environment Variables

### Frontend (js/config.js)
```javascript
API_BASE: 'https://api.jodohku.my/api/v1'
```

### Backend (.env)
```
CORS_ORIGINS=https://jodohku.my,https://www.jodohku.my
FRONTEND_URL=https://jodohku.my
```

## Backup Strategy

- [ ] Automated daily database backups
- [ ] Code repository backed up (GitHub)
- [ ] User-uploaded files backed up
- [ ] SSL certificates backed up
- [ ] Configuration files versioned

## Compliance

### PDPA (Malaysia)
- [ ] Privacy policy linked
- [ ] Terms of service linked
- [ ] Cookie consent (if using cookies)
- [ ] Data deletion option in settings
- [ ] User data export option

### Security
- [ ] e-KYC verification working
- [ ] Data encryption at rest
- [ ] Data encryption in transit (HTTPS)
- [ ] Regular security audits scheduled

## Support Channels

- [ ] Support email configured
- [ ] Help documentation published
- [ ] FAQ section completed
- [ ] Contact form working
- [ ] Social media accounts active

## Success Metrics

Track these KPIs:
- Registration completion rate
- OTP verification rate
- Profile completion rate
- Match acceptance rate
- Subscription conversion rate
- User retention (Day 1, 7, 30)
- Average session duration
- Pages per session

## Final Checklist

- [ ] All items above completed
- [ ] Team notified of launch
- [ ] Marketing materials ready
- [ ] Social media posts scheduled
- [ ] Press release prepared (if applicable)
- [ ] Customer support team briefed
- [ ] Incident response plan documented
- [ ] Celebration planned! 🎉

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Sign-off:** _______________

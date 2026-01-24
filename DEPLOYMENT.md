# Vault Deployment Guide

Complete guide to deploying Vault to production.

---

## Pre-Deployment Checklist

- [ ] All dependencies installed (`npm install`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] All tests pass (if applicable)
- [ ] Environment variables configured
- [ ] SSL/HTTPS enabled on server
- [ ] HSTS headers configured
- [ ] CSP headers configured

---

## Option 1: Deploy to Vercel (Recommended)

### Easiest & Fastest

**Advantages**:
- One-click deployment
- Auto-scaling
- Global CDN
- Free tier available
- Custom domains
- Git integration

### Step 1: Connect Repository

```bash
# Option A: Via GitHub
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Connect GitHub account
4. Select vault repository
5. Click Deploy

# Option B: CLI
vercel
# Follow interactive prompts
```

### Step 2: Configure Environment Variables

In Vercel Dashboard:
```
Settings → Environment Variables

NEXT_PUBLIC_NOSTR_RELAYS=wss://relay.example.com
NEXT_PUBLIC_BLOSSOM_SERVER=https://cdn.example.com
```

### Step 3: Deploy

```bash
# Automatic on every git push to main

# Or manual:
vercel --prod
```

### Step 4: Configure Domain

```
Settings → Domains

Add custom domain
Update DNS records
Enable HTTPS
```

### Auto-Deployment Configuration

`.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## Option 2: Docker & Self-Hosted

### Build Docker Image

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

RUN npm ci --only=production

EXPOSE 3000

CMD ["npm", "start"]
```

### Build & Push

```bash
# Build image
docker build -t vault:latest .

# Tag for registry
docker tag vault:latest your-registry.com/vault:latest

# Push to registry
docker push your-registry.com/vault:latest
```

### Deploy with Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  vault:
    image: your-registry.com/vault:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_NOSTR_RELAYS: wss://relay.example.com
      NEXT_PUBLIC_BLOSSOM_SERVER: https://cdn.example.com
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Run Deployment

```bash
docker-compose up -d
# App available at http://localhost:3000
```

---

## Option 3: Static Export & CDN

### Build Static Export

```bash
# Update next.config.mjs
export default {
  output: 'export',
  distDir: 'out'
}

# Build
npm run build

# Output in ./out directory
```

### Deploy to AWS S3 + CloudFront

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Create S3 bucket
aws s3 mb s3://vault-app --region us-east-1

# Upload files
aws s3 sync ./out s3://vault-app --delete

# Create CloudFront distribution
# (Use AWS Console or CDK)
```

### Deploy to Cloudflare Pages

```bash
# Install Wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Deploy
wrangler pages deploy ./out
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Authenticate
netlify login

# Deploy
netlify deploy --prod --dir=out
```

---

## Option 4: Kubernetes

### Create Kubernetes Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vault
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vault
  template:
    metadata:
      labels:
        app: vault
    spec:
      containers:
      - name: vault
        image: your-registry.com/vault:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: vault-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: vault
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace vault

# Deploy
kubectl apply -f k8s/ -n vault

# Check status
kubectl get deployments -n vault
kubectl logs -f deployment/vault -n vault

# Expose service
kubectl port-forward svc/vault-service 8080:80 -n vault
```

---

## Security Configuration

### HTTPS/SSL

```bash
# Using Let's Encrypt with Nginx

certbot certonly --standalone -d vault.example.com

# Auto-renewal
certbot renew --dry-run
```

### HTTP Security Headers

```nginx
# nginx.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" always;
```

### Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/vault
upstream vault_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name vault.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vault.example.com;

    ssl_certificate /etc/letsencrypt/live/vault.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vault.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://vault_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /.next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /public/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Reverse Proxy (Apache)

```apache
# /etc/apache2/sites-available/vault.conf
<VirtualHost *:443>
    ServerName vault.example.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/vault.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/vault.example.com/privkey.pem

    # Security headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"

    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
    </IfModule>

    # Proxy
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Cache
    <FilesMatch "\.(js|css|woff|woff2|ttf|eot|svg)$">
        Header set Cache-Control "max-age=31536000, public"
    </FilesMatch>
</VirtualHost>
```

---

## Monitoring & Logging

### Application Monitoring

```bash
# PM2 process manager
npm install -g pm2

pm2 start npm --name "vault" -- start
pm2 logs vault
pm2 monit
```

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' })
}
```

### Error Tracking (Sentry)

```typescript
// next.config.mjs
import { withSentryConfig } from '@sentry/nextjs'

export default withSentryConfig(
  {
    // ... config
  },
  {
    org: 'your-org',
    project: 'vault',
    authToken: process.env.SENTRY_AUTH_TOKEN,
  }
)
```

### Analytics

```typescript
// Track page views, user events
import { Analytics } from '@vercel/analytics/react'

export default function App() {
  return <Analytics />
}
```

---

## Performance Optimization

### Next.js Configuration

```javascript
// next.config.mjs
export default {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
    ],
  },
}
```

### Image Optimization

```typescript
// Components using images
import Image from 'next/image'

export function OptimizedImage() {
  return (
    <Image
      src="/image.jpg"
      alt="Description"
      width={1200}
      height={600}
      priority
    />
  )
}
```

### Bundle Analysis

```bash
npm install --save-dev @next/bundle-analyzer

# next.config.mjs
import withBundleAnalyzer from '@next/bundle-analyzer'

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})({
  // config
})

# Run analysis
ANALYZE=true npm run build
```

---

## Environment Variables

### Production Variables

```env
# Security
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://vault.example.com

# Nostr
NEXT_PUBLIC_NOSTR_RELAYS=wss://relay1.example.com,wss://relay2.example.com

# Blossom
NEXT_PUBLIC_BLOSSOM_SERVER=https://cdn.example.com

# Analytics
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id

# Sentry
SENTRY_AUTH_TOKEN=your-token
NEXT_PUBLIC_SENTRY_DSN=your-dsn
```

---

## Backup & Disaster Recovery

### Database Backups

```bash
# Automatic daily backups
0 2 * * * /scripts/backup-db.sh

# Retention: 30 days
find /backups -type f -mtime +30 -delete
```

### Code Backups

```bash
# Git push to multiple remotes
git remote add backup https://backup-repo.git
git push origin main && git push backup main
```

---

## Rollback Procedure

### Vercel

```bash
# Automatic rollback via dashboard
Dashboard → Deployments → Select previous version → Promote
```

### Docker

```bash
# Rollback to previous image
docker pull your-registry.com/vault:previous-tag
docker-compose down
docker-compose up -d
```

### Kubernetes

```bash
# View rollout history
kubectl rollout history deployment/vault

# Rollback to previous version
kubectl rollout undo deployment/vault
```

---

## Monitoring Checklist

- [ ] Application running
- [ ] Health check endpoint responding
- [ ] HTTPS working
- [ ] Security headers set
- [ ] Gzip compression enabled
- [ ] Cache headers correct
- [ ] Error logs monitored
- [ ] Performance metrics tracked
- [ ] Backups running
- [ ] Failover configured

---

## Support

- **Issues**: https://github.com/yourusername/vault/issues
- **Discussions**: https://github.com/yourusername/vault/discussions
- **Documentation**: https://vault.example.com/docs

---

**Happy deploying! 🚀**

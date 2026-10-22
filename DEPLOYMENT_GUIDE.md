# Hostinger VPS Deployment Guide — DisplayDelight V2

This guide walks you through deploying the **DisplayDelight E-commerce Platform** (React 19 + TypeScript frontend and FastAPI + SQLite backend) onto a **Hostinger VPS** using **Nginx**, **Uvicorn**, and **systemd**.

---

## 1. Prerequisites

Before starting, ensure you have:
1. **Hostinger VPS Details**:
   - OS: **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS** (recommended)
   - Your VPS IP Address (find it in Hostinger hPanel &rarr; VPS &rarr; Manage)
   - Root SSH credentials
2. **Domain Name DNS Setup** (if you have a domain, e.g. `displaydelight.in`):
   - In your domain DNS manager (Hostinger, Cloudflare, GoDaddy, etc.), create:
     - **A Record**: `@` &rarr; `YOUR_VPS_IP`
     - **A Record**: `www` &rarr; `YOUR_VPS_IP`
     *(Allow 5–15 minutes for DNS propagation)*

---

## 2. Step 1: Connect to Your VPS

Open your terminal (PowerShell, Command Prompt, or Git Bash) on your computer and connect to your VPS:

```bash
ssh root@YOUR_VPS_IP
```
*(Enter your VPS password when prompted)*

---

## 3. Step 2: Upload or Clone the Project to the VPS

### Option A: Clone from Git (Recommended)
If your repository is hosted on GitHub / GitLab:
```bash
cd /root
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git displaydelight
cd displaydelight
```

### Option B: Upload Directly from Your Computer
If uploading from your local Windows machine using PowerShell or Command Prompt:
```powershell
scp -r "c:\Users\Sangamithra\Downloads\E-commerce Platform Redesign" root@YOUR_VPS_IP:/root/displaydelight
```
Then on the VPS:
```bash
cd /root/displaydelight
```

---

## 4. Step 3: Run the Automated Deployment Script

We have provided a production-grade automated deployment script that handles:
- Installing Nginx, Python 3, Node.js 20 LTS, Certbot, and build tools
- Compiling the React frontend (`dist/`)
- Setting up the Python backend virtual environment and installing all dependencies
- Setting up SQLite database and file permissions for `www-data`
- Creating and enabling the background systemd service (`displaydelight-backend.service`)
- Configuring the Nginx reverse proxy and SPA routing

Make the script executable and run it:

```bash
chmod +x scripts/deploy_vps.sh
sudo bash scripts/deploy_vps.sh
```

---

## 5. Step 4: Configure Your Domain in Nginx

1. Open the Nginx site configuration:
```bash
nano /etc/nginx/sites-available/displaydelight
```

2. Locate the line with `server_name`:
```nginx
server_name YOUR_DOMAIN_OR_IP;
```
Replace `YOUR_DOMAIN_OR_IP` with your actual domain or IP, for example:
```nginx
server_name displaydelight.in www.displaydelight.in;
```

3. Save and exit (In nano: Press `Ctrl + O`, then `Enter`, then `Ctrl + X`).

4. Test and reload Nginx:
```bash
nginx -t
systemctl reload nginx
```

---

## 6. Step 5: Enable Free HTTPS (SSL) with Let's Encrypt

Once your domain points to your VPS IP, run Certbot to automatically obtain and configure SSL:

```bash
certbot --nginx -d displaydelight.in -d www.displaydelight.in
```

- Enter your email address for renewal notifications.
- Agree to the Terms of Service.
- Certbot will automatically issue certificates, configure HTTPS redirection, and set up auto-renewal.

---

## 7. Step 6: Configure Environment Variables

Edit the production backend environment file:

```bash
nano /var/www/displaydelight/backend/.env
```

Configure your live production credentials:
- **`RAZORPAY_KEY_ID`**: Your live or test Razorpay Key ID (e.g., `rzp_live_...`)
- **`RAZORPAY_KEY_SECRET`**: Your live Razorpay Key Secret
- **`RAZORPAY_WEBHOOK_SECRET`**: Your Razorpay webhook secret
- **`SMTP_HOST`**, **`SMTP_USER`**, **`SMTP_PASSWORD`**: For transactional customer email notifications
- **`FRONTEND_ORIGIN`**: `https://yourdomain.com`

After updating `.env`, restart the backend service:
```bash
systemctl restart displaydelight-backend
```

---

## 8. Managing and Monitoring the Service

### Check Service Status
```bash
# Check FastAPI backend status
systemctl status displaydelight-backend

# Check Nginx web server status
systemctl status nginx
```

### View Live Backend Logs
```bash
journalctl -u displaydelight-backend -f
```

### View Nginx Logs
```bash
# Error logs
tail -f /var/log/nginx/error.log

# Access logs
tail -f /var/log/nginx/access.log
```

---

## 9. How Future Updates / Deployments Work

When you make changes to your codebase and want to deploy updates to the VPS:

```bash
cd /var/www/displaydelight

# 1. Pull latest code (if using git)
git pull origin main

# 2. Rebuild frontend
npm run build

# 3. Update backend dependencies (if requirements changed)
backend/venv/bin/pip install -r backend/requirements.txt

# 4. Restart backend and reload Nginx
systemctl restart displaydelight-backend
systemctl reload nginx
```

---

## 10. Summary Architecture on VPS

| Component | Path / Port | Managed By | Description |
|---|---|---|---|
| **Frontend** | `/var/www/displaydelight/dist` | Nginx | High-speed static SPA with Brotli/Gzip and client caching |
| **Backend** | `/var/www/displaydelight/backend` | systemd (`displaydelight-backend`) | FastAPI + Uvicorn on `127.0.0.1:8000` |
| **Reverse Proxy** | `/etc/nginx/sites-available/displaydelight` | Nginx | Routes `/api/*` to backend and `/*` to React SPA |
| **Media Uploads** | `/var/www/displaydelight/backend/uploads` | Nginx | Direct high-speed static delivery of uploaded assets |
| **SSL / HTTPS** | Port 443 | Certbot | Auto-renewing Let's Encrypt TLS certificate |

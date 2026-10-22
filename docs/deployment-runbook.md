# DisplayDelight V3 — Production & Staging Deployment Runbook

> **Target Systems:** Production Linux Server (Ubuntu 22.04 LTS+) / Containerized Deployment  
> **Process Architecture:** Nginx Reverse Proxy + Gunicorn/Uvicorn Backend Workers + Static Asset CDN / Vite SPA

---

## 1. Prerequisites & Environment Setup

### 1.1 System Packages
```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3.11-dev \
    postgresql postgresql-contrib nginx redis-server git ufw
```

### 1.2 Python Virtual Environment
```bash
cd /opt/displaydelight/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 1.3 Node.js Frontend Toolchain
```bash
cd /opt/displaydelight
npm install
npm run build
```

---

## 2. Environment Variables & Secret Configuration

Create `/opt/displaydelight/backend/.env` with production permissions (`chmod 600 .env`):

```bash
# Core Application
APP_NAME="DisplayDelight V3"
APP_ENV="production"
DEBUG=false
SECRET_KEY="<GENERATE_RANDOM_64_CHAR_HEX_KEY>"

# PostgreSQL Database
DATABASE_URL="postgresql+psycopg2://dd_user:<DB_PASSWORD>@localhost:5432/displaydelight_prod"

# Web Origins
FRONTEND_ORIGIN="https://displaydelight.com"
ALLOWED_ORIGINS="https://displaydelight.com,https://admin.displaydelight.com"

# Razorpay Production Keys
RAZORPAY_MODE="live"
RAZORPAY_KEY_ID="rzp_live_<KEY_ID>"
RAZORPAY_KEY_SECRET="<KEY_SECRET>"
RAZORPAY_WEBHOOK_SECRET="<WEBHOOK_SECRET>"

# Transactional SMTP
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_TLS=true
SMTP_USER="apikey"
SMTP_PASSWORD="<SENDGRID_API_KEY>"
EMAIL_FROM_NAME="DisplayDelight Orders"
EMAIL_FROM_ADDRESS="orders@displaydelight.com"

# Cloudflare Media Storage (Optional)
CLOUDFLARE_ACCOUNT_ID="<CF_ACCOUNT_ID>"
CLOUDFLARE_API_TOKEN="<CF_TOKEN>"
CLOUDFLARE_R2_BUCKET="displaydelight-production-media"

# Business & Tax
DEFAULT_GST_RATE=18
COMPANY_GSTIN="29AABCD1234E1ZK"
COMPANY_NAME="DisplayDelight Pvt Ltd"
```

---

## 3. Database Initialization & Migrations

```bash
cd /opt/displaydelight/backend
source .venv/bin/activate

# Execute Alembic migrations
alembic upgrade head

# Run automated integration test verification
python -m pytest tests -v
```

---

## 4. Systemd Service Configuration

### 4.1 Backend API Service (`/etc/systemd/system/displaydelight-api.service`)
```ini
[Unit]
Description=DisplayDelight V3 FastAPI Backend
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/displaydelight/backend
Environment="PATH=/opt/displaydelight/backend/.venv/bin"
EnvironmentFile=/opt/displaydelight/backend/.env
ExecStart=/opt/displaydelight/backend/.venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/displaydelight/api-access.log \
    --error-logfile /var/log/displaydelight/api-error.log

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable displaydelight-api
sudo systemctl start displaydelight-api
sudo systemctl status displaydelight-api
```

---

## 5. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/displaydelight.conf`:

```nginx
server {
    listen 80;
    server_name displaydelight.com www.displaydelight.com admin.displaydelight.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name displaydelight.com www.displaydelight.com;

    ssl_certificate /etc/letsencrypt/live/displaydelight.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/displaydelight.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root /opt/displaydelight/dist;
    index index.html;

    # Frontend Single-Page App Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }

    # Uploads & Media
    location /uploads/ {
        alias /opt/displaydelight/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Health Check
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/displaydelight.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Backup & Disaster Recovery

### 6.1 Automated Daily Database Backup
Add to root crontab (`sudo crontab -e`):
```bash
0 2 * * * pg_dump -U postgres -d displaydelight_prod | gzip > /opt/backups/db/dd_db_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

### 6.2 Restoration Procedure
```bash
# Decompress and restore
gunzip < /opt/backups/db/dd_db_YYYYMMDD_HHMMSS.sql.gz | psql -U postgres -d displaydelight_prod
```

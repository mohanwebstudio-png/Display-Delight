#!/usr/bin/env bash
# ==============================================================================
# DisplayDelight V2 — Automated Hostinger VPS Deployment Script (Ubuntu/Debian)
# ==============================================================================
set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  DisplayDelight V2 — Hostinger VPS Setup & Deploy   ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run as root (use: sudo bash scripts/deploy_vps.sh)${NC}"
  exit 1
fi

APP_DIR="/var/www/displaydelight"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${YELLOW}[1/7] Updating system and installing dependencies...${NC}"
apt-get update -y
apt-get install -y nginx python3 python3-venv python3-pip curl git rsync certbot python3-certbot-nginx

# Install Node.js 20 LTS if node is not found or older than v18
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
  echo -e "${YELLOW}Installing Node.js 20 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo -e "${GREEN}✓ Node.js $(node -v) & npm $(npm -v) ready${NC}"
echo -e "${GREEN}✓ Python $(python3 --version) ready${NC}"

echo -e "${YELLOW}[2/7] Preparing application directory at ${APP_DIR}...${NC}"
mkdir -p "${APP_DIR}"
rsync -av --exclude 'node_modules' --exclude '.venv' --exclude 'dist' "${REPO_DIR}/" "${APP_DIR}/"

cd "${APP_DIR}"

echo -e "${YELLOW}[3/7] Building frontend production bundle...${NC}"
npm install --production=false
npm run build

if [ ! -d "${APP_DIR}/dist" ]; then
  echo -e "${RED}Error: Frontend build failed. Directory ${APP_DIR}/dist not found.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Frontend compiled successfully into ${APP_DIR}/dist${NC}"

echo -e "${YELLOW}[4/7] Setting up Python virtual environment for backend...${NC}"
cd "${APP_DIR}/backend"
if [ ! -d "${APP_DIR}/backend/venv" ]; then
  python3 -m venv "${APP_DIR}/backend/venv"
fi

"${APP_DIR}/backend/venv/bin/pip" install --upgrade pip
"${APP_DIR}/backend/venv/bin/pip" install -r "${APP_DIR}/backend/requirements.txt"

# Create .env if not exists
if [ ! -f "${APP_DIR}/backend/.env" ]; then
  echo -e "${YELLOW}Creating backend/.env from .env.example...${NC}"
  cp "${APP_DIR}/backend/.env.example" "${APP_DIR}/backend/.env"
  # Generate a fresh SECRET_KEY
  NEW_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  sed -i "s/SECRET_KEY=.*/SECRET_KEY=${NEW_SECRET}/" "${APP_DIR}/backend/.env"
fi

# Ensure uploads directory exists
mkdir -p "${APP_DIR}/backend/uploads"

echo -e "${GREEN}✓ Backend Python environment and dependencies installed${NC}"

echo -e "${YELLOW}[5/7] Configuring file permissions for www-data...${NC}"
chown -R www-data:www-data "${APP_DIR}"
chmod -R 755 "${APP_DIR}"
chmod -R 775 "${APP_DIR}/backend/uploads"
chmod 664 "${APP_DIR}/backend/displaydelight.db" 2>/dev/null || true

echo -e "${YELLOW}[6/7] Installing and starting systemd backend service...${NC}"
cp "${APP_DIR}/systemd/displaydelight-backend.service" /etc/systemd/system/displaydelight-backend.service
systemctl daemon-reload
systemctl enable displaydelight-backend.service
systemctl restart displaydelight-backend.service

# Check service status
sleep 2
if systemctl is-active --quiet displaydelight-backend.service; then
  echo -e "${GREEN}✓ displaydelight-backend service is running${NC}"
else
  echo -e "${RED}Warning: Backend service might not have started. Checking logs:${NC}"
  journalctl -u displaydelight-backend.service -n 20 --no-pager
fi

echo -e "${YELLOW}[7/7] Configuring Nginx reverse proxy...${NC}"
cp "${APP_DIR}/nginx/displaydelight.conf" /etc/nginx/sites-available/displaydelight
ln -sf /etc/nginx/sites-available/displaydelight /etc/nginx/sites-enabled/displaydelight

# Remove default nginx welcome page if active
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
systemctl reload nginx

echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}  ✓ Deployment completed successfully!              ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e ""
echo -e "Next steps:"
echo -e "1. Edit your domain/IP in Nginx config:"
echo -e "   nano /etc/nginx/sites-available/displaydelight"
echo -e "   (Replace YOUR_DOMAIN_OR_IP with your domain e.g. displaydelight.in)"
echo -e "   systemctl reload nginx"
echo -e ""
echo -e "2. Enable Free HTTPS / SSL with Let's Encrypt Certbot:"
echo -e "   certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo -e ""
echo -e "3. Check backend status:"
echo -e "   systemctl status displaydelight-backend"
echo -e "   journalctl -u displaydelight-backend -f"
echo -e "====================================================="

#!/bin/bash

# Bank API Deployment Script
# This script deploys the Bank API to a server with Nginx

# Exit on error
set -e

# Configuration
APP_DIR="/var/www/bank-api"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
SERVICE_NAME="bank-api"
NODE_ENV="production"
GIT_REPO="https://github.com/yourusername/bankapi.git"

# Create directories if they don't exist
mkdir -p $APP_DIR

# Clone or pull the latest code
if [ -d "$APP_DIR/.git" ]; then
    echo "Updating existing repository..."
    cd $APP_DIR
    git pull
else
    echo "Cloning repository..."
    git clone $GIT_REPO $APP_DIR
fi

# Install dependencies
cd $APP_DIR
npm install --production

# Create .env file
cat > $APP_DIR/.env << EOF
PORT=5000
DATABASE_PATH=database.sqlite
JWT_SECRET=$(openssl rand -hex 32)
CENTRAL_BANK_URL=https://henno.cfd/central-bank
BANK_NAME=Eero Bank
BANK_PREFIX=353
API_KEY=$API_KEY
TRANSACTION_URL=https://bank.eerovallistu.site/transfers/incoming
JWKS_URL=https://bank.eerovallistu.site/jwks.json
NODE_ENV=$NODE_ENV
TEST_MODE=false
EOF

# Set up systemd service
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Bank API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/src/index.js
Restart=on-failure
Environment=NODE_ENV=$NODE_ENV
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

# Copy Nginx config
cp $APP_DIR/nginx/bank-api.conf $NGINX_AVAILABLE/
ln -sf $NGINX_AVAILABLE/bank-api.conf $NGINX_ENABLED/

# Reload systemd and restart services
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME
nginx -t && systemctl reload nginx

echo "Deployment complete! Bank API is now running at https://bank.eerovallistu.site"

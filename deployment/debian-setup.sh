#!/bin/bash

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y nginx certbot python3-certbot-nginx nodejs npm sqlite3

# Create user for the application
useradd -m -s /bin/bash bankapi

# Create application directory
mkdir -p /opt/bankapi
chmod 755 /opt/bankapi

# Copy application files
cp -r /path/to/bankapi/* /opt/bankapi/

# Create data directory for SQLite
mkdir -p /opt/bankapi/data
chown -R bankapi:bankapi /opt/bankapi/data
chmod 750 /opt/bankapi/data

# Install dependencies
cd /opt/bankapi
npm install --production

# Generate keys directory
mkdir -p /opt/bankapi/keys
chmod 700 /opt/bankapi/keys

# Set up environment file
cat > /opt/bankapi/.env << EOL
PORT=3000
DATABASE_PATH=/opt/bankapi/data/database.sqlite
JWT_SECRET=change_this_to_a_secure_random_string
CENTRAL_BANK_URL=https://henno.cfd/central-bank
BANK_NAME=Eero Bank
BANK_PREFIX=353
API_KEY=f2f003ea-43ec-4bb0-a114-8a53d28cd9d1
TRANSACTION_URL=https://bank.eerovallistu.site/transactions/b2b
JWKS_URL=https://bank.eerovallistu.site/jwks.json
TEST_MODE=false
EOL

# Set proper permissions
chown -R bankapi:bankapi /opt/bankapi
chmod 600 /opt/bankapi/.env

# Copy systemd service file
cp /opt/bankapi/deployment/bankapi.service /etc/systemd/system/

# Copy Nginx configuration
cp /opt/bankapi/deployment/nginx-conf /etc/nginx/sites-available/bankapi

# Enable Nginx site
ln -s /etc/nginx/sites-available/bankapi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload systemd daemon
systemctl daemon-reload

# Enable and start bankapi service
systemctl enable bankapi
systemctl start bankapi

# Restart Nginx
systemctl restart nginx

# Set up SSL with Certbot
certbot --nginx -d bank.eerovallistu.site --non-interactive --agree-tos --email your-email@example.com

echo "Setup complete! Bank API should be running at https://bank.eerovallistu.site"

#!/bin/bash

# KTMG-VAULT: Ubuntu Server Setup Script
# This script installs Node.js, PM2, and Nginx on a fresh Ubuntu instance.

set -e

echo "--- Starting Server Setup ---"

# 1. Update system
sudo apt-get update
sudo apt-get upgrade -y

# 2. Install Node.js (Version 18 LTS)
echo "--- Installing Node.js ---"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 Globally
echo "--- Installing PM2 ---"
sudo npm install -g pm2

# 4. Install Nginx
echo "--- Installing Nginx ---"
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 5. Create Directory Structure
echo "--- Creating Directories ---"
sudo mkdir -p /var/www/html/inventory
sudo chown -R $USER:$USER /var/www/html/inventory
mkdir -p ~/ktmg-inventory/api

# 6. Install MJML Dependencies (for email templates)
echo "--- Installing MJML dependencies ---"
sudo npm install -g mjml

echo "--- Setup Complete! ---"
echo "You can now run the GitHub Actions deployment."

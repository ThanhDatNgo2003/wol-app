#!/bin/bash

set -e

echo "🚀 Wake-on-LAN PWA - Raspberry Pi Setup Script"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null && ! grep -q "BCM" /proc/cpuinfo 2>/dev/null; then
    echo -e "${YELLOW}⚠️  This doesn't appear to be a Raspberry Pi${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Running as root${NC}"
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo -e "${GREEN}✓ Node.js already installed $(node --version)${NC}"
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt-get install -y nginx
else
    echo -e "${GREEN}✓ Nginx already installed${NC}"
fi

# Install Cloudflared if not present
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Installing Cloudflare Tunnel..."
    ARCH=$(uname -m)
    if [[ $ARCH == "armv7l" ]]; then
        ARCH="arm"
    elif [[ $ARCH == "aarch64" ]]; then
        ARCH="arm64"
    fi

    curl -L --output /tmp/cloudflared.tgz "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.tgz"
    tar -xzf /tmp/cloudflared.tgz -C /tmp/
    cp /tmp/cloudflared /usr/local/bin/
    chmod +x /usr/local/bin/cloudflared
    rm -f /tmp/cloudflared*
else
    echo -e "${GREEN}✓ Cloudflare Tunnel already installed${NC}"
fi

# Install ImageMagick for icon conversion
if ! command -v convert &> /dev/null; then
    echo "📦 Installing ImageMagick..."
    apt-get install -y imagemagick
else
    echo -e "${GREEN}✓ ImageMagick already installed${NC}"
fi

echo ""
echo -e "${GREEN}✓ All packages installed${NC}"
echo ""

# Get directory where script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Install npm dependencies
echo "📦 Installing npm dependencies..."
cd "$SCRIPT_DIR"
npm install

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your PC's MAC address:"
echo "   nano $SCRIPT_DIR/.env"
echo ""
echo "2. Find your PC's MAC address:"
echo "   - Windows: ipconfig /all | grep 'Physical Address'"
echo "   - Linux: ip link show"
echo "   - Mac: ifconfig | grep ether"
echo ""
echo "3. Test the app locally:"
echo "   cd $SCRIPT_DIR"
echo "   npm start"
echo "   Then visit http://localhost:3000"
echo ""
echo "4. Setup Cloudflare Tunnel:"
echo "   cloudflared tunnel login"
echo ""
echo "5. Create systemd services (see README.md)"
echo ""

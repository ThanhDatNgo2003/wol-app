# Wake-on-LAN PWA

A simple Progressive Web App (PWA) to control Wake-on-LAN remotely from your phone or computer. Install as an app on your home screen and control your PC with one tap.

## Features

✅ **PWA** - Install as app without browser URL bar
✅ **Offline Support** - Works offline with caching
✅ **Mobile Optimized** - Beautiful responsive design
✅ **No Browser Bar** - Full screen when installed as shortcut
✅ **Simple UI** - One-tap PC wake
✅ **Status Check** - Check if PC is online

## Prerequisites

- Raspberry Pi (or any Linux server)
- Node.js 14+ installed
- PC with Wake-on-LAN (WoL) enabled in BIOS
- Domain name pointing to your server
- Cloudflare account

## Setup on Raspberry Pi

### 1. Install Node.js & npm

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### 2. Setup wakepc Command

You need a `wakepc` command available on your system. This can be:
- An alias to your WoL command
- A shell script that triggers wake-on-LAN
- Any executable that wakes your PC

Example alias:
```bash
# Add to ~/.bashrc or ~/.zshrc
alias wakepc='wakeonlan AA:BB:CC:DD:EE:FF'
# or with custom broadcast:
alias wakepc='wakeonlan -i 192.168.1.255 AA:BB:CC:DD:EE:FF'

# Then reload:
source ~/.bashrc
```

Or create a script `/usr/local/bin/wakepc`:
```bash
#!/bin/bash
# Wake PC via WoL
/usr/bin/wakeonlan AA:BB:CC:DD:EE:FF
```

### 3. Clone & Setup Project

```bash
cd ~
git clone <your-repo-url> wol-app
cd wol-app

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env
```

Edit `.env` and set:
```
WAKE_CMD=wakepc        # Your wake command
PC_IP=192.168.1.100    # Optional, for status check
PORT=3000
```

### 4. Test Locally

```bash
npm start
```

Visit `http://localhost:3000` - Should see the PWA UI.

### 5. Install Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl start nginx
```

### 6. Configure Nginx

Create `/etc/nginx/sites-available/wol`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /home/pi/wol-app/public;
    index index.html;

    # Serve static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/wol /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Run Node.js as Service

Create `/etc/systemd/system/wol.service`:

```ini
[Unit]
Description=Wake-on-LAN PWA Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/wol-app
Environment="NODE_ENV=production"
EnvironmentFile=/home/pi/wol-app/.env
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable & start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable wol.service
sudo systemctl start wol.service
sudo systemctl status wol.service
```

### 8. Setup Cloudflare Tunnel

**On Raspberry Pi:**

```bash
# Install Cloudflare Tunnel
curl -L --output cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.tgz
tar -xzf cloudflared.tgz
sudo cp cloudflared /usr/local/bin/
sudo chmod +x /usr/local/bin/cloudflared

# Login to Cloudflare
cloudflared tunnel login
```

**On Cloudflare Dashboard:**
1. Go to Zero Trust → Networks → Tunnels
2. Click "Create a tunnel"
3. Name: `wol-app`
4. Copy the command and run it on your Pi
5. Once connected, configure routing:
   - Domain: `wol.yourdomain.com`
   - Service: `http://localhost`

**Create systemd service for tunnel:**

```ini
# /etc/systemd/system/cloudflared.service
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/cloudflared tunnel run wol-app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable cloudflared.service
sudo systemctl start cloudflared.service
sudo systemctl status cloudflared.service
```

### 9. Verify Setup

```bash
# Check Node.js app
curl http://localhost:3000

# Check Nginx
curl http://localhost

# Check Cloudflare tunnel
curl https://wol.yourdomain.com
```

## Usage

1. **On Phone:**
   - Visit `https://wol.yourdomain.com`
   - Tap "Install" or "Add to Home Screen"
   - Icon appears on home screen
   - Tap to open PWA without browser bar

2. **Click "Wake PC"** to execute wakepc command

3. **Check Status** to see if PC is online

## Troubleshooting

### PC won't wake up?

1. **Test wakepc command directly on Pi:**
   ```bash
   wakepc
   ```
   If this doesn't work, the command is not set up correctly.

2. **Check command is available:**
   ```bash
   which wakepc
   # Should show path like: /usr/bin/wakepc or /home/pi/.bashrc alias

   # Test in same shell as service:
   source ~/.bashrc
   wakepc
   ```

3. **Check logs:**
   ```bash
   sudo journalctl -u wol.service -f
   # Look for: [Wake] Command executed successfully
   ```

4. **Verify WoL enabled in BIOS:**
   - Restart PC, enter BIOS
   - Look for "Wake on LAN", "WoL", "Network Boot"
   - Enable and save

5. **Test with direct call:**
   ```bash
   curl -X POST http://localhost:3000/api/wake
   # Should see success response
   ```

### Cloudflare tunnel not connecting?

```bash
cloudflared tunnel validate
cloudflared tunnel route dns wol-app wol.yourdomain.com
```

### Icons not showing?

Convert SVG to PNG (192x192 and 512x512):
```bash
sudo apt-get install imagemagick
convert public/icon.svg public/icon-192.png
convert public/icon.svg public/icon-512.png
```

## Security

⚠️ **Important:**
- This app sends requests over HTTPS via Cloudflare
- The `wakepc` command is executed with proper timeout (5 seconds)
- Only expose to trusted networks
- Consider adding authentication if exposed publicly
- Ensure `wakepc` command is safe to execute remotely

## Environment Variables

```bash
WAKE_CMD=wakepc              # Required: Command to execute (default: wakepc)
PC_IP=192.168.1.100          # Optional: Your PC's IP for status check
PORT=3000                     # Optional: Server port (default 3000)
NODE_ENV=production           # Optional: Environment (default: development)
```

## Project Structure

```
wol-app/
├── public/              # PWA frontend files
│   ├── index.html      # Main page
│   ├── app.js          # JavaScript logic
│   ├── styles.css      # Styling
│   ├── manifest.json   # PWA manifest
│   ├── sw.js           # Service worker
│   └── icon*.png       # App icons
├── server/
│   └── index.js        # Express backend
├── scripts/            # Helper scripts
├── .env.example        # Environment example
└── package.json        # Dependencies
```

## License

MIT

## Support

Found an issue? Check logs:
```bash
# Node.js app
sudo journalctl -u wol.service -f

# Nginx
sudo tail -f /var/log/nginx/error.log

# Cloudflare tunnel
sudo journalctl -u cloudflared.service -f
```

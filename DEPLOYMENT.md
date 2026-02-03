# Deployment Checklist

## 📋 Pre-Deployment Checklist

### PC Configuration
- [ ] PC supports Wake-on-LAN (check motherboard manual)
- [ ] WoL enabled in BIOS/UEFI
- [ ] Network adapter WoL enabled (check Device Manager / network settings)
- [ ] Know your PC's MAC address (e.g., `AA:BB:CC:DD:EE:FF`)
- [ ] Know your PC's local IP address (e.g., `192.168.1.100`)

### Raspberry Pi Preparation
- [ ] SSH access to Raspberry Pi working
- [ ] Internet connection stable
- [ ] Sufficient disk space (< 500MB needed)
- [ ] Have your domain name ready

### Cloudflare Setup
- [ ] Cloudflare account created
- [ ] Domain nameservers pointed to Cloudflare
- [ ] Subdomain prepared (e.g., `wol.yourdomain.com`)

## 🚀 Deployment Steps

### 1. Clone Project
```bash
git clone <your-repo> ~/wol-app
cd ~/wol-app
```
- [ ] Project cloned successfully

### 2. Run Setup Script
```bash
sudo scripts/setup-raspi.sh
```
- [ ] Node.js installed
- [ ] Nginx installed
- [ ] Cloudflare Tunnel installed
- [ ] npm dependencies installed

### 3. Configure Environment
```bash
cp .env.example .env
nano .env
```
Update with:
- [ ] PC_MAC set correctly
- [ ] PC_IP set (optional but recommended)
- [ ] BROADCAST_ADDR set (usually 255.255.255.255)
- [ ] PORT set to 3000 or higher

### 4. Test Node.js App
```bash
npm start
```
- [ ] App starts without errors
- [ ] Visit http://localhost:3000
- [ ] UI loads correctly
- [ ] "Wake PC" button visible

### 5. Stop Node.js (Ctrl+C) and Setup Services

#### Node.js Service
```bash
sudo cp systemd/wol.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wol.service
sudo systemctl start wol.service
```
- [ ] Service enabled
- [ ] Service started successfully
- [ ] No errors in `sudo systemctl status wol.service`

#### Nginx Configuration
```bash
sudo cp nginx/wol.conf /etc/nginx/sites-available/wol
sudo ln -s /etc/nginx/sites-available/wol /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```
- [ ] Config file copied
- [ ] Nginx test passes
- [ ] Nginx restarted
- [ ] Access http://localhost works

### 6. Setup Cloudflare Tunnel

#### Login to Cloudflare
```bash
cloudflared tunnel login
```
- [ ] Browser opens for login
- [ ] Domain selected
- [ ] Credentials saved

#### Create Tunnel
```bash
cloudflared tunnel create wol-app
cloudflared tunnel route dns wol-app wol.yourdomain.com
```
- [ ] Tunnel created
- [ ] DNS route added
- [ ] Credentials file generated

#### Configure Tunnel
```bash
nano ~/.cloudflared/config.yml
```
Add:
```yaml
tunnel: wol-app
credentials-file: /home/pi/.cloudflared/wol-app.json

ingress:
  - hostname: wol.yourdomain.com
    service: http://localhost
  - service: http_status:404
```
- [ ] Config file created
- [ ] Credentials path correct
- [ ] Hostname matches your domain

#### Start Tunnel Service
```bash
sudo cp systemd/cloudflared.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cloudflared.service
sudo systemctl start cloudflared.service
```
- [ ] Service enabled
- [ ] Service started
- [ ] No errors in `sudo systemctl status cloudflared.service`

## ✅ Post-Deployment Verification

### Local Testing
```bash
curl http://localhost:3000           # Node.js app
curl http://localhost                 # Nginx proxy
ps aux | grep node                   # Check if running
sudo systemctl status wol.service    # Check service status
```
- [ ] All endpoints respond with 200 status
- [ ] Node.js process is running
- [ ] Service is active

### Remote Testing
```bash
curl https://wol.yourdomain.com
```
- [ ] Cloudflare tunnel accessible
- [ ] HTTPS certificate valid
- [ ] Frontend loads

### Live Test
1. Visit https://wol.yourdomain.com in browser
2. Click "Wake PC" button
3. Check if PC wakes up

- [ ] Button visible
- [ ] "Magic packet sent" message appears
- [ ] PC wakes up within 10 seconds

### Mobile Installation
1. Open https://wol.yourdomain.com on phone
2. Add to home screen
3. Launch app
4. No browser address bar visible
5. Click "Wake PC"

- [ ] App installs successfully
- [ ] No browser chrome visible
- [ ] Standalone mode works
- [ ] Wake-on-LAN works from phone

## 📱 PWA Testing

Visit https://wol.yourdomain.com and test:

### Chrome DevTools (F12)
- [ ] Lighthouse audit score 90+
- [ ] Service worker registered
- [ ] Manifest loaded correctly
- [ ] Icons display properly

### Installation
- [ ] "Install" button visible
- [ ] App installs cleanly
- [ ] Icon appears on home screen

### Offline
- [ ] App works offline (after visiting once)
- [ ] UI loads without network
- [ ] API calls queue and retry when online (optional)

## 🔒 Security Verification

- [ ] HTTPS only (no HTTP fallback)
- [ ] Cloudflare DDoS protection enabled
- [ ] Rate limiting configured (recommended)
- [ ] PC_MAC not hardcoded in code
- [ ] .env file in .gitignore
- [ ] No sensitive data in logs

## 📊 Logs and Monitoring

Check logs regularly:
```bash
# Node.js app errors
sudo journalctl -u wol.service -n 50

# Nginx errors
sudo tail -20 /var/log/nginx/error.log

# Cloudflare tunnel
sudo journalctl -u cloudflared.service -n 50
```

- [ ] No error messages
- [ ] App logs show successful wake attempts
- [ ] Tunnel connected messages visible

## 🚨 Troubleshooting Checklist

If issues occur:

### PC won't wake up
- [ ] Verify PC_MAC is correct
- [ ] Verify WoL enabled in BIOS
- [ ] Test locally first: `npm start` then click button
- [ ] Check BROADCAST_ADDR is correct for your network

### Can't access remote URL
- [ ] Verify Cloudflare tunnel is running: `sudo systemctl status cloudflared.service`
- [ ] Check domain points to Cloudflare nameservers
- [ ] Verify subdomain configured in tunnel settings
- [ ] Check no firewall blocking port 7844 (Cloudflare tunnel port)

### App loads but can't find service worker
- [ ] Verify HTTPS is being used
- [ ] Check browser DevTools for console errors
- [ ] Verify manifest.json is accessible
- [ ] Clear browser cache and reload

### Icons not showing
- [ ] Convert SVG to PNG: `convert public/icon.svg public/icon-192.png`
- [ ] Verify files exist: `ls -la public/icon-*.png`
- [ ] Check manifest.json paths are correct

## 🎉 Post-Deployment

Once everything is working:

1. **Backup Configuration**
   ```bash
   cp .env ~/.config/wol-app.env.backup
   cp ~/.cloudflared/config.yml ~/.config/cloudflared-config.backup
   ```
   - [ ] Backed up environment variables
   - [ ] Backed up Cloudflare config

2. **Monitor Services**
   - [ ] Setup cron job to check services every hour
   - [ ] Monitor system logs for errors
   - [ ] Test wake command weekly

3. **Document Changes**
   - [ ] Document any custom configurations
   - [ ] Note down important IPs and MAC addresses
   - [ ] Record Cloudflare account details in secure location

4. **Optional Improvements**
   - [ ] Add authentication (Basic Auth, OAuth, etc.)
   - [ ] Add multiple PC support
   - [ ] Add wake history/logs
   - [ ] Add admin dashboard
   - [ ] Add scheduled wake-ups

## 📞 Support

If you encounter issues not covered here:

1. Check README.md for detailed information
2. Check QUICKSTART.md for step-by-step guide
3. Review logs: `sudo journalctl -u wol.service -f`
4. Test locally: `npm start`
5. Verify network connectivity: `ping 192.168.1.100`

Good luck! 🚀

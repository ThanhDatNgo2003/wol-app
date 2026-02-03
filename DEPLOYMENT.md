# Deployment Checklist

## 📋 Pre-Deployment Checklist

### PC Configuration
- [ ] PC supports Wake-on-LAN (check motherboard manual)
- [ ] WoL enabled in BIOS/UEFI
- [ ] Network adapter WoL enabled (check Device Manager / network settings)
- [ ] Know your PC's MAC address (e.g., `AA:BB:CC:DD:EE:FF`) - for `wakepc` setup
- [ ] Know your PC's local IP address (e.g., `192.168.1.100`) - optional

### Raspberry Pi Preparation
- [ ] SSH access to Raspberry Pi working
- [ ] Internet connection stable
- [ ] Sufficient disk space (~200MB needed)
- [ ] Have your domain name ready
- [ ] Node.js 14+ or willing to install it

### Cloudflare Setup
- [ ] Cloudflare account created
- [ ] Domain nameservers pointed to Cloudflare
- [ ] Subdomain prepared (e.g., `wol.yourdomain.com`)

## 🚀 Deployment Steps

### 1. Clone Project
```bash
cd ~
git clone <your-repo> wol-app
cd wol-app
```
- [ ] Project cloned successfully

### 2. Install Dependencies
```bash
npm install
```
- [ ] All npm packages installed (express, cors)
- [ ] node_modules created
- [ ] No error messages

### 3. Setup `wakepc` Command

**Before configuring the PWA, you MUST setup the `wakepc` command on your Pi.**

See [WAKEPC_SETUP.md](WAKEPC_SETUP.md) for 5 ways to setup:
- Option 1: Simple bash alias (easiest)
- Option 2: Shell script in `/usr/local/bin/`
- Option 3: Script with broadcast address
- Option 4: Node.js script
- Option 5: Python script

Test it works:
```bash
wakepc
# Should output: Sending magic packet to AA:BB:CC:DD:EE:FF
```
- [ ] `wakepc` command available
- [ ] Command executes without errors
- [ ] PC wakes up successfully

### 4. Configure Environment
```bash
cp .env.example .env
nano .env
```
Update with:
- [ ] `WAKE_CMD=wakepc` (or your custom command)
- [ ] `PC_IP=192.168.1.100` (optional, for status check)
- [ ] `PORT=3000` (or higher if needed)
- [ ] `NODE_ENV=production` (optional)

### 5. Test Node.js App Locally
```bash
npm start
```
- [ ] App starts without errors
- [ ] Visit http://localhost:3000
- [ ] UI loads correctly
- [ ] "Wake PC" button visible
- [ ] Click "Wake PC" → PC wakes up

**Stop server:** Press `Ctrl+C`

### 6. Setup Systemd Services

#### Node.js Service
```bash
sudo cp systemd/wol.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wol.service
sudo systemctl start wol.service
```
- [ ] Service enabled
- [ ] Service started successfully
- [ ] Check: `sudo systemctl status wol.service` shows active

#### Nginx Configuration
```bash
sudo apt-get install -y nginx
sudo cp nginx/wol.conf /etc/nginx/sites-available/wol
sudo ln -s /etc/nginx/sites-available/wol /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```
- [ ] Nginx installed
- [ ] Config file copied
- [ ] Nginx test passes (`sudo nginx -t` shows OK)
- [ ] Access http://localhost loads page

### 7. Setup Cloudflare Tunnel

**Prerequisite:** Cloudflare account and domain nameservers pointing to Cloudflare

#### Install Cloudflared
```bash
curl -L --output cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.tgz
tar -xzf cloudflared.tgz
sudo cp cloudflared /usr/local/bin/
sudo chmod +x /usr/local/bin/cloudflared
```
- [ ] Cloudflared installed
- [ ] Check: `cloudflared --version` shows version

#### Login to Cloudflare
```bash
cloudflared tunnel login
```
- [ ] Browser opens and logs in
- [ ] Domain selected
- [ ] Credentials saved in `~/.cloudflared/`

#### Create Tunnel
```bash
cloudflared tunnel create wol-app
cloudflared tunnel route dns wol-app wol.yourdomain.com
```
- [ ] Tunnel created (`wol-app`)
- [ ] DNS route added
- [ ] JSON credentials file created

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
Save and exit (Ctrl+X → Y → Enter)

- [ ] Config file created
- [ ] Credentials path is correct
- [ ] Hostname matches your subdomain

#### Start Tunnel Service
```bash
sudo cp systemd/cloudflared.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cloudflared.service
sudo systemctl start cloudflared.service
```
- [ ] Service enabled
- [ ] Service started
- [ ] Check: `sudo systemctl status cloudflared.service` shows active

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
- [ ] ✓ Success message appears
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

- [ ] HTTPS only (Cloudflare enforces)
- [ ] Cloudflare DDoS protection enabled
- [ ] Rate limiting configured (optional)
- [ ] WAKE_CMD not hardcoded in code
- [ ] `.env` file in `.gitignore`
- [ ] `.env` file NOT committed to git
- [ ] No sensitive data in logs
- [ ] Only trusted users have access to `wakepc` command

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

### PC won't wake up
1. **Test `wakepc` command directly:**
   ```bash
   wakepc
   # Should output: Sending magic packet to AA:BB:CC:DD:EE:FF
   ```
   - [ ] Command exists and runs
   - [ ] PC wakes up when run directly

2. **Verify PC configuration:**
   - [ ] WoL enabled in BIOS
   - [ ] Network adapter supports WoL
   - [ ] Power supply allows WoL

3. **Check application logs:**
   ```bash
   sudo journalctl -u wol.service -f
   # Should show: [Wake] Command executed successfully
   ```
   - [ ] No error messages
   - [ ] Confirm wakepc command is being executed

4. **Verify systemd service can access wakepc:**
   ```bash
   sudo -u pi bash -c 'source ~/.bashrc && wakepc'
   # Test if service user can run command
   ```
   - [ ] Command works as pi user

### Can't access remote URL
- [ ] Verify Cloudflare tunnel running: `sudo systemctl status cloudflared.service`
- [ ] Check domain nameservers point to Cloudflare (use `dig ns yourdomain.com`)
- [ ] Verify subdomain configured in Cloudflare tunnel settings
- [ ] Test locally first: `curl http://localhost:3000`
- [ ] Check Cloudflare has active connection in dashboard

### Nginx shows 502 Bad Gateway
- [ ] Verify Node.js is running: `sudo systemctl status wol.service`
- [ ] Check Node.js listening on port 3000: `netstat -tlnp | grep 3000`
- [ ] Check Nginx logs: `sudo tail -20 /var/log/nginx/error.log`
- [ ] Verify Nginx config: `sudo nginx -t`

### App loads but button doesn't work
- [ ] Check browser console for errors (F12)
- [ ] Verify `/api/wake` endpoint is accessible: `curl -X POST http://localhost:3000/api/wake`
- [ ] Check that `wakepc` command is in PATH
- [ ] Verify systemd service has execute permissions on wakepc

### Service worker not registered
- [ ] Verify HTTPS is being used (Cloudflare enforces)
- [ ] Check browser DevTools → Application → Service Workers
- [ ] Clear cache: DevTools → Application → Clear storage
- [ ] Reload page (Ctrl+Shift+R for hard refresh)

### Icons not showing
- [ ] Convert SVG to PNG: `convert public/icon.svg public/icon-192.png`
- [ ] Verify files exist: `ls -la public/icon-*.png`
- [ ] Check manifest.json paths are correct
- [ ] Restart Node.js: `sudo systemctl restart wol.service`

## 🎉 Post-Deployment

Once everything is working:

### 1. Backup Configuration
```bash
mkdir -p ~/.config/wol-backup
cp .env ~/.config/wol-backup/
cp ~/.cloudflared/config.yml ~/.config/wol-backup/
```
- [ ] Backed up `.env` file
- [ ] Backed up Cloudflare config
- [ ] Store backups securely

### 2. Monitor Services
```bash
# Check all services are running
sudo systemctl status wol.service cloudflared.service nginx

# View logs for issues
sudo journalctl -u wol.service -n 50
```
- [ ] All services are active (running)
- [ ] No recent errors in logs
- [ ] Test wake command works: `wakepc`

### 3. Document Setup
- [ ] Document `wakepc` command location
- [ ] Note PC MAC address and IP address
- [ ] Record Cloudflare tunnel name (`wol-app`)
- [ ] Save domain URL for reference

### 4. Optional Improvements
- [ ] Add authentication (password protect)
- [ ] Add multiple PC support
- [ ] Add wake history tracking
- [ ] Add admin dashboard
- [ ] Add scheduled wake-ups
- [ ] Setup alerting for service failures

## 📞 Support

If you encounter issues:

1. **See WAKEPC_SETUP.md** - 5 ways to setup `wakepc` command
2. **Check README.md** - Full documentation
3. **View logs:**
   ```bash
   sudo journalctl -u wol.service -f           # App logs
   sudo journalctl -u cloudflared.service -f   # Tunnel logs
   sudo tail -f /var/log/nginx/error.log       # Nginx logs
   ```
4. **Test API locally:**
   ```bash
   curl -X POST http://localhost:3000/api/wake
   ```
5. **Verify network:**
   ```bash
   ping 192.168.1.100  # Your PC IP
   ```

✅ **Deployment complete!** You now have a fully functional PWA for controlling Wake-on-LAN. 🚀

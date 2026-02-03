# 📝 Changes Made - Shell Command Execution

## Summary

Backend đã được chỉnh sửa để **execute shell command** (`wakepc`) thay vì gửi magic packet trực tiếp.

### ✅ Điều này có nghĩa:

1. **Đơn giản hơn**: Bạn chỉ cần có một `wakepc` command trên Pi
2. **Linh hoạt hơn**: Có thể sử dụng bất kỳ WoL tool nào
3. **Không cần cấu hình MAC**: MAC address không cần đặt trong `.env`
4. **Dễ test**: Có thể test command trực tiếp: `wakepc`

---

## Files Changed

### 1. `server/index.js` ✏️
**Trước:**
```javascript
const wol = require('wake-on-lan');

app.post('/api/wake', (req, res) => {
  wol.wake(PC_MAC_ADDRESS, { address: BROADCAST_ADDRESS }, (err) => {
    // Send magic packet...
  });
});
```

**Sau:**
```javascript
const { exec } = require('child_process');

app.post('/api/wake', (req, res) => {
  exec(WAKE_CMD, { timeout: 5000 }, (error, stdout, stderr) => {
    // Execute wakepc command...
  });
});
```

**Thay đổi:**
- ❌ Loại bỏ `wake-on-lan` package
- ✅ Thêm `child_process.exec()` để chạy shell commands
- ✅ Cập nhật endpoint để execute `WAKE_CMD`
- ✅ Cập nhật health check endpoint

---

### 2. `package.json` ✏️
**Trước:**
```json
"dependencies": {
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "wake-on-lan": "^2.1.0"
}
```

**Sau:**
```json
"dependencies": {
  "express": "^4.18.2",
  "cors": "^2.8.5"
}
```

**Thay đổi:**
- ❌ Loại bỏ `wake-on-lan` dependency
- ✅ Giảm kích thước package.json

---

### 3. `.env.example` ✏️
**Trước:**
```env
PC_MAC=00:00:00:00:00:00
PC_IP=192.168.1.100
BROADCAST_ADDR=255.255.255.255
PORT=3000
```

**Sau:**
```env
WAKE_CMD=wakepc
PC_IP=192.168.1.100
PORT=3000
NODE_ENV=production
```

**Thay đổi:**
- ❌ Loại bỏ `PC_MAC`
- ❌ Loại bỏ `BROADCAST_ADDR`
- ✅ Thêm `WAKE_CMD` (command to execute)
- ✅ Thêm `NODE_ENV`

---

### 4. `README.md` ✏️
**Cập nhật các phần:**
- Setup wakepc command (section 2)
- Environment variables
- Troubleshooting (wakepc specific)
- Security notes

---

### 5. `WAKEPC_SETUP.md` ✅ (New File)
Tài liệu chi tiết về 5 cách setup `wakepc`:
- Option 1: Alias (dễ nhất)
- Option 2: Shell script
- Option 3: Script với broadcast address
- Option 4: Node.js script
- Option 5: Python script

---

## API Changes

### POST /api/wake

**Request:**
```bash
curl -X POST http://localhost:3000/api/wake
```

**Response:**
```json
{
  "success": true,
  "message": "wakepc executed successfully",
  "output": "Sending magic packet to AA:BB:CC:DD:EE:FF",
  "timestamp": "2026-02-04T00:00:00.000Z"
}
```

---

## Migration Guide

Nếu bạn đã setup cũ rồi, làm theo các bước này:

### 1. Update code
```bash
cd ~/wol-app
git pull
npm install  # Reinstall (will remove wake-on-lan)
```

### 2. Setup wakepc command
```bash
# Option A: Simple alias
alias wakepc='wakeonlan AA:BB:CC:DD:EE:FF'
echo "alias wakepc='wakeonlan AA:BB:CC:DD:EE:FF'" >> ~/.bashrc

# Option B: Script
sudo nano /usr/local/bin/wakepc
# Add: #!/bin/bash
#      /usr/bin/wakeonlan AA:BB:CC:DD:EE:FF
sudo chmod +x /usr/local/bin/wakepc
```

### 3. Update .env
```bash
# Old (delete):
PC_MAC=AA:BB:CC:DD:EE:FF
PC_IP=192.168.1.100
BROADCAST_ADDR=255.255.255.255

# New (add):
WAKE_CMD=wakepc
PC_IP=192.168.1.100
PORT=3000
```

### 4. Test
```bash
# Test command directly
wakepc

# Test via API
npm start
curl -X POST http://localhost:3000/api/wake

# Should see output: "wakepc executed successfully"
```

### 5. Restart service
```bash
sudo systemctl restart wol.service
sudo systemctl restart nginx

# Check logs
sudo journalctl -u wol.service -f
```

---

## Benefits

| Feature | Trước | Sau |
|---------|--------|------|
| Setup complexity | High (MAC, broadcast) | Low (just `wakepc`) |
| Dependencies | wake-on-lan pkg | None (uses shell) |
| Flexibility | Fixed to WoL | Any command works |
| Testing | Need API | `wakepc` directly |
| Performance | Direct UDP | Shell execution |
| Package size | ~50KB | ~35KB |

---

## Troubleshooting New Setup

### Command not found
```bash
# 1. Check alias exists
alias | grep wakepc

# 2. Reload shell
source ~/.bashrc

# 3. Check script path
which wakepc
ls -la /usr/local/bin/wakepc

# 4. For systemd service, test as pi user
sudo -u pi bash -c 'source ~/.bashrc && wakepc'
```

### API says command failed
```bash
# Check logs
sudo journalctl -u wol.service -f

# Test directly
wakepc

# Check command exists
which wakepc
wakepc --help 2>/dev/null || echo "Command not found"
```

### Systemd service can't find command
```bash
# Add to /etc/systemd/system/wol.service:
[Service]
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/node server/index.js

# Then:
sudo systemctl daemon-reload
sudo systemctl restart wol.service
```

---

## Quick Start (After Changes)

```bash
# 1. Setup wakepc (if not done yet)
alias wakepc='wakeonlan AA:BB:CC:DD:EE:FF'
source ~/.bashrc

# 2. Update .env
cp .env.example .env
nano .env
# Set: WAKE_CMD=wakepc

# 3. Test
npm start
curl -X POST http://localhost:3000/api/wake

# 4. All set!
```

---

See `WAKEPC_SETUP.md` for detailed setup options.

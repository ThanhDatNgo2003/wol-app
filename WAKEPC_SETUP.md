# 🔧 Setup wakepc Command

Hướng dẫn thiết lập `wakepc` command để PWA có thể gọi nó.

## Option 1: Alias (Dễ nhất)

Thêm vào `~/.bashrc` hoặc `~/.zshrc`:

```bash
# Find your PC's MAC address first
# Windows: ipconfig /all (look for Physical Address)
# Linux: ip link show
# Mac: ifconfig | grep ether

# Add alias (replace AA:BB:CC:DD:EE:FF with your MAC)
alias wakepc='wakeonlan AA:BB:CC:DD:EE:FF'

# If wakeonlan not installed:
# sudo apt-get install wakeonlan
```

Sau đó reload:
```bash
source ~/.bashrc
```

## Option 2: Shell Script

Tạo file `/usr/local/bin/wakepc`:

```bash
sudo nano /usr/local/bin/wakepc
```

Thêm nội dung:
```bash
#!/bin/bash
# Wake your PC via WoL
/usr/bin/wakeonlan AA:BB:CC:DD:EE:FF
```

Lưu (Ctrl+X → Y → Enter) và cấp quyền:
```bash
sudo chmod +x /usr/local/bin/wakepc
```

Test:
```bash
wakepc
# Should output: Sending magic packet to AA:BB:CC:DD:EE:FF
```

## Option 3: Script with Broadcast Address

Nếu wakeonlan không hoạt động, thử chỉ định broadcast address:

```bash
#!/bin/bash
# Wake your PC via WoL with broadcast
/usr/bin/wakeonlan -i 192.168.1.255 AA:BB:CC:DD:EE:FF
```

Thay `192.168.1.255` bằng subnet broadcast của bạn:
```bash
# Find your broadcast address
ip route show | grep default

# Ví dụ: nếu IP là 192.168.1.50, broadcast là 192.168.1.255
# Nếu IP là 10.0.0.50, broadcast là 10.0.0.255
```

## Option 4: Using Direct WoL Library

Nếu không có `wakeonlan` command, tạo script Node.js:

```bash
sudo nano /usr/local/bin/wakepc
```

Thêm:
```bash
#!/usr/bin/env node
const wol = require('wake-on-lan');

const MAC = 'AA:BB:CC:DD:EE:FF';
const BROADCAST = '255.255.255.255';

wol.wake(MAC, { address: BROADCAST }, (err) => {
  if (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
  console.log('Magic packet sent to', MAC);
});
```

Cấp quyền:
```bash
sudo chmod +x /usr/local/bin/wakepc
```

## Option 5: Using Python

```bash
sudo nano /usr/local/bin/wakepc
```

Thêm:
```python
#!/usr/bin/env python3
import socket

def wake_on_lan(mac_address):
    """Send a WoL magic packet"""
    # Broadcast the magic packet
    mac_bytes = bytes.fromhex(mac_address.replace(':', ''))
    magic_packet = b'\xff' * 6 + mac_bytes * 16

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.sendto(magic_packet, ('255.255.255.255', 9))

    print(f'Magic packet sent to {mac_address}')

if __name__ == '__main__':
    wake_on_lan('AA:BB:CC:DD:EE:FF')
```

Cấp quyền:
```bash
sudo chmod +x /usr/local/bin/wakepc
```

## Verify Setup

Test command hoạt động:

```bash
# Direct test
wakepc

# Should output something like:
# Sending magic packet to AA:BB:CC:DD:EE:FF
# or
# Magic packet sent to AA:BB:CC:DD:EE:FF
```

## Test with PWA

1. Bật Node.js server:
```bash
npm start
```

2. Mở trình duyệt: `http://localhost:3000`

3. Click "Wake PC" button

4. Kiểm tra logs:
```bash
# Terminal sẽ hiển thị:
# [Wake] Executing: wakepc
# [Wake] Command executed successfully
```

## Troubleshooting

### "command not found: wakepc"
- Alias chưa được load: `source ~/.bashrc`
- Script không trong PATH: `ls -la /usr/local/bin/wakepc`

### "wakeonlan: command not found"
```bash
sudo apt-get update
sudo apt-get install wakeonlan
```

### "Magic packet sent but PC won't wake"
- Check WoL enabled in BIOS
- Try with broadcast address: `alias wakepc='wakeonlan -i 192.168.1.255 AA:BB:CC:DD:EE:FF'`
- Check network cable is connected
- Verify MAC address is correct

### Test systemd service can execute it
```bash
# Service runs as 'pi' user, test with:
sudo -u pi bash -c 'source ~/.bashrc && wakepc'
```

## For Systemd Service

Nếu dùng systemd service, đảm bảo:

1. **User có bash profile**: Systemd services load từ `/etc/profile` hoặc `/etc/default/wol`

2. **Tạo environment file**:
```bash
sudo nano /etc/default/wol
```

Thêm:
```bash
WAKE_CMD=wakepc
PATH=/usr/local/bin:/usr/bin:/bin
SHELL=/bin/bash
```

3. **Update systemd service** (`/etc/systemd/system/wol.service`):
```ini
[Service]
EnvironmentFile=/etc/default/wol
ExecStart=/usr/bin/node server/index.js
```

4. **Reload & test**:
```bash
sudo systemctl daemon-reload
sudo systemctl restart wol.service
curl -X POST http://localhost:3000/api/wake
```

## Common Commands

```bash
# Test wake command
wakepc

# View aliases
alias | grep wakepc

# Check where command is
which wakepc
type wakepc

# View script content
cat /usr/local/bin/wakepc

# Check script permissions
ls -la /usr/local/bin/wakepc

# Make executable if needed
sudo chmod +x /usr/local/bin/wakepc

# Test with timeout (like systemd service)
timeout 5 wakepc
```

---

**Chọn một trong các option trên, test nó hoạt động, sau đó PWA sẽ có thể gọi nó!** ✅

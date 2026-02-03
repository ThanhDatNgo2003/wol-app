# 🚀 Quick Start Guide - WoL PWA

Hướng dẫn nhanh để thiết lập ứng dụng Wake-on-LAN trên Raspberry Pi của bạn.

## ⚡ Bước 1: Chuẩn Bị PC (5 phút)

### Tìm MAC Address của PC

**Windows (CMD as Admin):**
```cmd
ipconfig /all
```
Tìm dòng "Physical Address" - đó chính là MAC Address. Ví dụ: `AA:BB:CC:DD:EE:FF`

**Linux:**
```bash
ip link show
```

### Bật Wake-on-LAN trong BIOS
1. Restart PC, vào BIOS (thường là Delete, F2, F10, F12 tùy hãng)
2. Tìm "Wake on LAN", "WoL", hoặc "Power on by PCI-E"
3. Bật Enable
4. Lưu và thoát

## ⚡ Bước 2: Chuẩn Bị Raspberry Pi (10 phút)

### SSH vào Pi
```bash
ssh pi@192.168.1.100  # Thay IP của Pi của bạn
```

### Clone project & run setup
```bash
git clone https://github.com/yourname/wol-app.git ~/wol-app
cd ~/wol-app
chmod +x scripts/setup-raspi.sh
sudo scripts/setup-raspi.sh
```

Kịch bản sẽ cài đặt:
- ✅ Node.js
- ✅ Nginx
- ✅ Cloudflare Tunnel
- ✅ ImageMagick (cho icons)
- ✅ NPM dependencies

### Cấu hình PC MAC Address
```bash
nano .env
```

Thay đổi:
```env
PC_MAC=AA:BB:CC:DD:EE:FF  # ← Dán MAC address của PC ở đây
PC_IP=192.168.1.100        # ← IP của PC (optional, cho status check)
PORT=3000
```

Lưu: `Ctrl+X` → `Y` → `Enter`

## ⚡ Bước 3: Test Locally (3 phút)

```bash
npm start
```

Mở trình duyệt: `http://192.168.1.50:3000` (IP của Pi)

Kiểm tra:
- [ ] Thấy nút "Wake PC"
- [ ] Click nút - thấy "Magic packet sent"
- [ ] PC thức dậy → ✅ Success!

## ⚡ Bước 4: Setup Systemd Services (5 phút)

### Node.js Service
```bash
sudo cp systemd/wol.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wol.service
sudo systemctl start wol.service
sudo systemctl status wol.service
```

### Nginx
```bash
sudo cp nginx/wol.conf /etc/nginx/sites-available/wol
sudo ln -s /etc/nginx/sites-available/wol /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## ⚡ Bước 5: Setup Cloudflare Tunnel (10 phút)

### Login với Cloudflare
```bash
cloudflared tunnel login
```

Sẽ mở trình duyệt - đăng nhập và chọn domain của bạn.

### Tạo tunnel
```bash
cloudflared tunnel create wol-app
cloudflared tunnel route dns wol-app wol.yourdomain.com
```

### Cấu hình route
```bash
nano ~/.cloudflared/config.yml
```

Thêm:
```yaml
tunnel: wol-app
credentials-file: /home/pi/.cloudflared/wol-app.json

ingress:
  - hostname: wol.yourdomain.com
    service: http://localhost
  - service: http_status:404
```

### Start Cloudflare service
```bash
sudo cp systemd/cloudflared.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cloudflared.service
sudo systemctl start cloudflared.service
sudo systemctl status cloudflared.service
```

## ✅ Xác Minh Setup

```bash
# Check Node.js app (port 3000)
curl http://localhost:3000

# Check Nginx (port 80)
curl http://localhost

# Check Cloudflare tunnel
curl https://wol.yourdomain.com
```

## 📱 Cài Đặt trên Điện Thoại

1. Mở `https://wol.yourdomain.com` trên điện thoại
2. Nhấn menu (⋯) → "Add to Home Screen" (Android) hoặc Share → Add to Home Screen (iOS)
3. Ứng dụng sẽ xuất hiện trên home screen mà không có thanh trình duyệt
4. Tap để mở và click "Wake PC"

## 🔧 Troubleshooting

### PC không thức dậy?

**Kiểm tra WoL được bật:**
```bash
# Trên PC (Linux)
ethtool eth0 | grep "Wake-on"
# Kết quả phải là: Wake-on: g

# Hoặc thay đổi
sudo ethtool -s eth0 wol g
```

**Kiểm tra magic packet được gửi:**
```bash
sudo journalctl -u wol.service -f
# Tìm "[WoL] Magic packet sent successfully"
```

**Thử ping PC:**
```bash
ping 192.168.1.100
```

### Cloudflare tunnel không kết nối?

```bash
cloudflared tunnel validate
sudo journalctl -u cloudflared.service -f
```

### Không thấy icon?

```bash
# Convert SVG to PNG (192x192 và 512x512)
convert public/icon.svg public/icon-192.png
convert public/icon.svg public/icon-512.png
```

## 📊 Kiểm Tra Logs

```bash
# Node.js app
sudo journalctl -u wol.service -f

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Cloudflare tunnel
sudo journalctl -u cloudflared.service -f
```

## 🎉 Done!

Xong! Bây giờ bạn có thể thức dậy PC từ bất kỳ nơi nào bằng điện thoại.

**Lưu ý:**
- URL được bảo vệ bởi Cloudflare
- MAC address chỉ lưu trong `.env` file
- Tất cả dữ liệu đi qua HTTPS

Có vấn đề? Xem `README.md` để hiểu chi tiết hơn.

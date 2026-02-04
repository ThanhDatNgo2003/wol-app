/**
 * Login History Modal Component
 * Shows detailed login history in a popup modal
 */
class LoginHistoryModal {
  constructor() {
    this.sessions = [];
    this.isOpen = false;
  }

  async loadSessions(limit = 100) {
    this.sessions = await window.app.authManager.getLoginSessions(limit);
  }

  parseUserAgent(userAgent) {
    if (!userAgent) return { device: 'Unknown', browser: 'Unknown' };

    const ua = userAgent;
    let device = 'Unknown Device';
    let browser = 'Unknown Browser';

    // Device detection
    if (/iPad/.test(ua)) {
      device = 'iPad';
    } else if (/iPhone/.test(ua)) {
      device = 'iPhone';
    } else if (/Android/.test(ua)) {
      device = 'Android Phone';
    } else if (/Windows/.test(ua)) {
      device = 'Windows PC';
    } else if (/Macintosh|Mac OS X/.test(ua)) {
      device = 'macOS';
    } else if (/Linux/.test(ua)) {
      device = 'Linux';
    }

    // Browser detection
    if (/Chrome/.test(ua) && !/Chromium/.test(ua)) {
      browser = 'Chrome';
    } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
      browser = 'Safari';
    } else if (/Firefox/.test(ua)) {
      browser = 'Firefox';
    } else if (/Edge/.test(ua)) {
      browser = 'Edge';
    }

    return { device, browser };
  }

  maskIP(ip) {
    if (!ip) return 'Unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
    }
    return ip;
  }

  render() {
    if (!this.isOpen) return '';

    const sessionsHtml = this.sessions.length === 0
      ? '<p class="modal-no-data">No login history available</p>'
      : this.sessions.map((session, index) => {
        const { device, browser } = this.parseUserAgent(session.userAgent);
        const loginDate = new Date(session.loginTime);
        const formattedTime = loginDate.toLocaleString();
        const isRecent = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;

        return `
          <div class="modal-history-item ${isRecent ? 'recent' : ''}">
            <div class="modal-item-number">${index + 1}</div>
            <div class="modal-item-info">
              <div class="modal-item-header">
                <span class="modal-device">${device}</span>
                <span class="modal-browser">• ${browser}</span>
                ${isRecent ? '<span class="modal-badge">Recent</span>' : ''}
              </div>
              <div class="modal-item-details">
                <span class="modal-ip">IP: ${this.maskIP(session.ip)}</span>
                <span class="modal-time">${formattedTime}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

    return `
      <div class="login-modal-overlay" onclick="if(event.target === this) window.app.loginHistoryModal.close()">
        <div class="login-modal">
          <div class="modal-header">
            <h2>Login History</h2>
            <button class="modal-close" onclick="window.app.loginHistoryModal.close()">✕</button>
          </div>
          <div class="modal-content">
            <div class="modal-stats">
              <span class="modal-stat">Total Logins: ${this.sessions.length}</span>
            </div>
            <div class="modal-sessions">
              ${sessionsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async open() {
    await this.loadSessions(100);
    this.isOpen = true;
    this.update();
  }

  close() {
    this.isOpen = false;
    this.update();
  }

  update() {
    const existing = document.getElementById('loginHistoryModal');
    if (existing) {
      existing.remove();
    }

    if (this.isOpen) {
      const modal = document.createElement('div');
      modal.id = 'loginHistoryModal';
      modal.innerHTML = this.render();
      document.body.appendChild(modal);
    }
  }
}

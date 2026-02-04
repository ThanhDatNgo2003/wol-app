/**
 * Login Monitor Component
 * Displays recent login history and suspicious login attempts
 */
class LoginMonitor {
  constructor(container) {
    this.container = container;
    this.sessions = [];
  }

  async loadSessions() {
    this.sessions = await window.app.authManager.getLoginSessions(5);
  }

  parseUserAgent(userAgent) {
    if (!userAgent) return { device: 'Unknown Device', browser: 'Unknown' };

    const ua = userAgent;
    let device = 'Unknown Device';

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

    return { device };
  }

  maskIP(ip) {
    if (!ip) return 'Unknown';

    // Handle IPv6 localhost
    if (ip === '::1' || ip === '127.0.0.1') {
      return 'Local Network';
    }

    // Handle IPv4 addresses
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
    }

    // Handle other IPv6 addresses
    if (ip.includes(':')) {
      const segments = ip.split(':').slice(0, 2).join(':');
      return `${segments}:*`;
    }

    return ip;
  }

  render() {
    let historyHtml = '';
    if (this.sessions.length === 0) {
      historyHtml = '<p class="no-activity">No login history</p>';
    } else {
      historyHtml = this.sessions.map(session => {
        const { device } = this.parseUserAgent(session.userAgent);
        const loginDate = new Date(session.loginTime);
        const formattedTime = loginDate.toLocaleTimeString();
        return `
          <div class="login-item login-known">
            <span class="login-icon">✓</span>
            <div class="login-details">
              <span class="login-ip">${this.maskIP(session.ip)}</span>
              <span class="login-device">${device}</span>
            </div>
            <span class="login-time">${formattedTime}</span>
          </div>
        `;
      }).join('');
    }

    const suspiciousAttempts = window.storage.getSuspiciousAttempts();
    let suspiciousHtml = '';
    if (suspiciousAttempts.length > 0) {
      suspiciousHtml = `
        <div class="suspicious-section">
          <div class="suspicious-header">
            <h4>⚠️ Suspicious Activity</h4>
            <span class="suspicious-count">${suspiciousAttempts.length}</span>
          </div>
          <div class="suspicious-list">
            ${suspiciousAttempts.map(attempt => `
              <div class="suspicious-item">
                <span class="suspicious-icon">🚨</span>
                <div class="suspicious-details">
                  <span class="suspicious-ip">${this.maskIP(attempt.ip)}</span>
                  <span class="suspicious-reason">${attempt.count}x failed attempts</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="login-monitor">
        <div class="monitor-header">
          <h3>Recent Logins</h3>
          <button class="btn-view-all" onclick="window.app.loginHistoryModal.open()">View All</button>
        </div>
        <div class="login-list">
          ${historyHtml}
        </div>
        ${suspiciousHtml}
      </div>
    `;
  }

  async update() {
    await this.loadSessions();
    if (this.container) {
      this.container.innerHTML = this.render();
    }
  }
}

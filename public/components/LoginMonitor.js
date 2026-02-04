/**
 * Login Monitor Component
 * Displays login history, session activity, and suspicious login attempts
 */
class LoginMonitor {
  constructor(container) {
    this.container = container;
  }

  render() {
    const loginHistory = window.storage.getLoginHistory();
    const suspiciousAttempts = window.storage.getSuspiciousAttempts();

    let historyHtml = '';
    if (loginHistory.length === 0) {
      historyHtml = '<p class="no-activity">No login history</p>';
    } else {
      historyHtml = loginHistory.slice(0, 5).map(session => {
        const isNewDevice = session.isNew ? ' (New Device)' : '';
        const statusClass = session.isNew ? 'login-new-device' : 'login-known';
        return `
          <div class="login-item ${statusClass}">
            <span class="login-icon">${session.isNew ? '⚠️' : '✓'}</span>
            <div class="login-details">
              <span class="login-ip">${this.maskIP(session.ip)}</span>
              <span class="login-device">${session.device}${isNewDevice}</span>
            </div>
            <span class="login-time">${session.loginTime}</span>
          </div>
        `;
      }).join('');
    }

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
          <h3>Login History</h3>
        </div>
        <div class="login-list">
          ${historyHtml}
        </div>
        ${suspiciousHtml}
      </div>
    `;
  }

  maskIP(ip) {
    if (!ip) return 'Unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
    }
    return ip;
  }

  update() {
    if (this.container) {
      this.container.innerHTML = this.render();
    }
  }
}

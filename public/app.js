/**
 * Wake-on-LAN PWA Application
 * Main app controller with authentication, dashboard, and security features
 */
class WoLApp {
  constructor() {
    this.authManager = new AuthManager();
    this.statusCard = null;
    this.activityLog = null;
    this.initApp();
  }

  async initApp() {
    const authStatus = await this.authManager.checkAuthStatus();

    if (authStatus.authEnabled && !authStatus.authenticated) {
      this.showLoginUI();
    } else {
      this.showDashboard();
    }
  }

  showLoginUI() {
    const container = document.querySelector('.container');
    container.innerHTML = `
      <div class="card login-card">
        <div class="icon">
          <img src="onoff-high-resolution-logo.png" alt="Logo" class="logo-img">
        </div>
        <h1>Wake PC</h1>
        <p class="status">Enter PIN to continue</p>

        <form id="loginForm" class="login-form">
          <input
            type="password"
            id="pinInput"
            class="pin-input"
            placeholder="Enter PIN"
            maxlength="6"
            pattern="[0-9]*"
            inputmode="numeric"
            autocomplete="off"
            required
          >
          <button type="submit" class="btn btn-primary">
            <span id="loginBtnText">Login</span>
            <span id="loginBtnSpinner" class="spinner" style="display: none;"></span>
          </button>
        </form>

        <div id="loginMessage" class="message"></div>
      </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin(document.getElementById('pinInput').value);
    });

    setTimeout(() => document.getElementById('pinInput').focus(), 100);
  }

  async handleLogin(pin) {
    const btn = document.querySelector('#loginForm button');
    const text = document.getElementById('loginBtnText');
    const spinner = document.getElementById('loginBtnSpinner');
    const message = document.getElementById('loginMessage');

    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'inline-block';

    const result = await this.authManager.login(pin);

    if (result.success) {
      message.textContent = '✓ Login successful!';
      message.className = 'message show success';
      setTimeout(() => this.showDashboard(), 500);
    } else {
      message.textContent = `✗ ${result.error || 'Invalid PIN'}`;
      message.className = 'message show error';
      btn.disabled = false;
      text.style.display = 'inline';
      spinner.style.display = 'none';
      document.getElementById('pinInput').value = '';
      document.getElementById('pinInput').focus();
    }
  }

  showDashboard() {
    const container = document.querySelector('.container');
    container.innerHTML = `
      <div class="dashboard">
        <div class="dashboard-header">
          <div class="header-content">
            <img src="onoff-high-resolution-logo.png" alt="Logo" class="header-logo">
            <h1>Wake-on-LAN Control</h1>
          </div>
          ${this.authManager.isAuthEnabled() ? `
            <button class="btn-logout-header" onclick="window.app.handleLogout()">Logout</button>
          ` : ''}
        </div>

        <div class="dashboard-main">
          <div class="dashboard-column">
            <div class="card main-card">
              <div id="statusCard"></div>

              <div class="actions">
                <button id="wakeBtn" class="btn btn-primary btn-large">
                  <span id="wakeBtnText">💤 Wake PC</span>
                  <span id="wakeBtnSpinner" class="spinner" style="display: none;"></span>
                </button>
                <button id="statusBtn" class="btn btn-secondary">🔍 Check Status</button>
              </div>

              <div id="message" class="message"></div>
            </div>
          </div>

          <div class="dashboard-column">
            <div class="card">
              <div id="activityLog"></div>
            </div>
          </div>
        </div>

        <div class="dashboard-footer">
          <small>Last wake: <span id="lastWake">Never</span></small>
        </div>
      </div>
    `;

    this.statusCard = new StatusCard(document.getElementById('statusCard'));
    this.activityLog = new ActivityLog(document.getElementById('activityLog'));

    this.statusCard.update('unknown');
    this.activityLog.update();

    this.wakeBtn = document.getElementById('wakeBtn');
    this.statusBtn = document.getElementById('statusBtn');
    this.messageEl = document.getElementById('message');
    this.lastWakeEl = document.getElementById('lastWake');

    this.wakeBtn.addEventListener('click', () => this.wakePC());
    this.statusBtn.addEventListener('click', () => this.checkStatus());

    this.loadLastWake();
    setTimeout(() => this.checkStatus(), 500);
  }

  async wakePC() {
    const text = document.getElementById('wakeBtnText');
    const spinner = document.getElementById('wakeBtnSpinner');

    this.wakeBtn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'inline-block';
    this.statusCard.update('waking');

    const response = await fetch('/api/wake', {
      method: 'POST',
      credentials: 'include'
    });

    if (response.status === 401) {
      this.showMessage('✗ Session expired. Please log in.', 'error');
      setTimeout(() => this.showLoginUI(), 2000);
      return;
    }

    const data = await response.json();

    if (response.ok) {
      this.showMessage('✓ Wake signal sent!', 'success');
      this.statusCard.update('waking');
      this.updateLastWake();
      window.storage.addActivity('Wake PC', true, 'Signal sent');
      this.activityLog.update();
      setTimeout(() => this.checkStatus(), 5000);
    } else {
      this.showMessage(`✗ ${data.error}`, 'error');
      this.statusCard.update('error');
      window.storage.addActivity('Wake PC', false, data.error);
      this.activityLog.update();
    }

    this.wakeBtn.disabled = false;
    text.style.display = 'inline';
    spinner.style.display = 'none';
  }

  async checkStatus() {
    this.statusBtn.disabled = true;

    const response = await fetch('/api/status', {
      credentials: 'include'
    });

    if (response.status === 401) {
      this.showMessage('✗ Session expired', 'error');
      setTimeout(() => this.showLoginUI(), 2000);
      return;
    }

    const data = await response.json();

    if (response.ok) {
      const isOnline = data.online;
      this.statusCard.update(isOnline ? 'online' : 'offline');
      this.showMessage(`PC is ${isOnline ? 'online ✓' : 'offline'}`, isOnline ? 'success' : 'info');
      window.storage.addActivity('Status Check', true, isOnline ? 'Online' : 'Offline');
      this.activityLog.update();
    } else {
      this.statusCard.update('error');
      this.showMessage(`✗ ${data.error}`, 'error');
      window.storage.addActivity('Status Check', false, data.error);
      this.activityLog.update();
    }

    this.statusBtn.disabled = false;
  }

  async handleLogout() {
    await this.authManager.logout();
    this.showLoginUI();
  }

  clearActivityLog() {
    window.storage.clearActivityLog();
    this.activityLog.update();
    this.showMessage('Activity log cleared', 'info');
  }

  showMessage(text, type) {
    this.messageEl.textContent = text;
    this.messageEl.className = `message show ${type}`;
    setTimeout(() => {
      this.messageEl.classList.remove('show');
    }, 5000);
  }

  updateLastWake() {
    const time = new Date().toLocaleTimeString();
    window.storage.setLastWake(time);
    this.lastWakeEl.textContent = time;
  }

  loadLastWake() {
    this.lastWakeEl.textContent = window.storage.getLastWake();
  }
}

// Initialize app when DOM is ready
window.app = null;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new WoLApp();
  });
} else {
  window.app = new WoLApp();
}

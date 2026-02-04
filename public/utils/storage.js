/**
 * Storage Manager
 * Handles localStorage operations with JSON serialization
 */
class StorageManager {
  constructor(prefix = 'wol_') {
    this.prefix = prefix;
  }

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify({
        value,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Storage error:', error);
      return false;
    }
  }

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return defaultValue;

      const { value } = JSON.parse(item);
      return value;
    } catch (error) {
      console.error('Storage error:', error);
      return defaultValue;
    }
  }

  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }

  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Application-specific methods

  // Login History Management
  getLoginHistory() {
    return this.get('loginHistory', []);
  }

  addLoginSession(ip, device = 'Unknown', isNew = false) {
    const history = this.getLoginHistory();
    history.unshift({
      ip,
      device,
      isNew,
      loginTime: new Date().toLocaleString(),
      timestamp: Date.now()
    });
    // Keep last 20 login sessions
    this.set('loginHistory', history.slice(0, 20));
  }

  getSuspiciousAttempts() {
    return this.get('suspiciousAttempts', []);
  }

  addSuspiciousAttempt(ip, reason) {
    const attempts = this.getSuspiciousAttempts();
    const existingAttempt = attempts.find(a => a.ip === ip);

    if (existingAttempt) {
      existingAttempt.count += 1;
      existingAttempt.lastAttempt = Date.now();
    } else {
      attempts.push({
        ip,
        reason,
        count: 1,
        firstAttempt: Date.now(),
        lastAttempt: Date.now()
      });
    }

    // Keep suspicious attempts for 24 hours
    const filtered = attempts.filter(a => {
      return Date.now() - a.lastAttempt < 24 * 60 * 60 * 1000;
    });

    this.set('suspiciousAttempts', filtered);
  }

  getLastWake() {
    return this.get('lastWake', 'Never');
  }

  setLastWake(timestamp) {
    return this.set('lastWake', timestamp);
  }
}

// Create global instance
window.storage = new StorageManager();

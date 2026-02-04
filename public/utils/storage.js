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

  getActivityLog() {
    return this.get('activityLog', []);
  }

  addActivity(action, success, message = '') {
    const log = this.getActivityLog();
    log.unshift({
      action,
      success,
      message,
      timestamp: Date.now()
    });

    // Keep only last 50 entries
    const trimmed = log.slice(0, 50);
    this.set('activityLog', trimmed);
  }

  clearActivityLog() {
    this.set('activityLog', []);
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

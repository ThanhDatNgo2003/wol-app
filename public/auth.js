/**
 * Authentication Manager
 * Handles login, logout, and session management
 */
class AuthManager {
  constructor() {
    this.authenticated = false;
    this.authEnabled = true;
  }

  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      const data = await response.json();

      this.authenticated = data.authenticated;
      this.authEnabled = data.authEnabled;

      return data;
    } catch (error) {
      console.error('Auth status check failed:', error);
      return { authenticated: false, authEnabled: true };
    }
  }

  async login(pin) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ pin })
      });

      const data = await response.json();

      if (response.ok) {
        this.authenticated = true;

        // Track login session with device info
        const device = this.detectDevice();
        const ip = data.ip || 'Unknown';
        const isNewDevice = data.isNewDevice || false;

        window.storage.addLoginSession(ip, device, isNewDevice);

        return { success: true };
      } else {
        // Track failed attempt
        if (data.ip) {
          window.storage.addSuspiciousAttempt(data.ip, 'Failed PIN attempt');
        }
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Network error' };
    }
  }

  detectDevice() {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(ua)) {
      if (/iPad/.test(ua)) return 'iPad';
      if (/iPhone/.test(ua)) return 'iPhone';
      return 'Mobile';
    }
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown Device';
  }

  async logout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        this.authenticated = false;
        return { success: true };
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
    return { success: false };
  }

  isAuthenticated() {
    return this.authenticated;
  }

  isAuthEnabled() {
    return this.authEnabled;
  }
}

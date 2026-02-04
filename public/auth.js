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
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Network error' };
    }
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

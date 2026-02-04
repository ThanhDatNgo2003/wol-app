/**
 * Status Card Component
 * Displays the current status of the PC
 */
class StatusCard {
  constructor(container) {
    this.container = container;
    this.status = 'unknown';
  }

  render() {
    const statusClass = {
      'online': 'status-online',
      'offline': 'status-offline',
      'waking': 'status-waking',
      'error': 'status-error'
    }[this.status] || 'status-unknown';

    const icon = {
      'online': '✓',
      'offline': '○',
      'waking': '↻',
      'error': '⚠'
    }[this.status] || '?';

    const text = {
      'online': 'Online',
      'offline': 'Offline',
      'waking': 'Waking up...',
      'error': 'Error'
    }[this.status] || 'Unknown';

    return `
      <div class="status-card ${statusClass}">
        <div class="status-icon">${icon}</div>
        <div class="status-info">
          <h3>PC Status</h3>
          <p class="status-text">${text}</p>
        </div>
      </div>
    `;
  }

  update(status) {
    this.status = status;
    if (this.container) {
      this.container.innerHTML = this.render();
    }
  }
}

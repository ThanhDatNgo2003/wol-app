/**
 * Activity Log Component
 * Displays recent activities and actions taken
 */
class ActivityLog {
  constructor(container) {
    this.container = container;
    this.maxVisible = 5;
  }

  render() {
    const activities = window.storage.getActivityLog();

    if (activities.length === 0) {
      return `
        <div class="activity-log">
          <h3>Recent Activity</h3>
          <p class="no-activity">No recent activity</p>
        </div>
      `;
    }

    const items = activities.slice(0, this.maxVisible).map(a => {
      const icon = a.success ? '✓' : '✗';
      const className = a.success ? 'activity-success' : 'activity-error';
      const time = new Date(a.timestamp).toLocaleTimeString();

      return `
        <div class="activity-item ${className}">
          <span class="activity-icon">${icon}</span>
          <div class="activity-details">
            <span class="activity-action">${a.action}</span>
            ${a.message ? `<span class="activity-message">${a.message}</span>` : ''}
          </div>
          <span class="activity-time">${time}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="activity-log">
        <div class="activity-header">
          <h3>Recent Activity</h3>
          <button class="btn-clear-log" onclick="window.app.clearActivityLog()">Clear</button>
        </div>
        <div class="activity-list">
          ${items}
        </div>
      </div>
    `;
  }

  update() {
    if (this.container) {
      this.container.innerHTML = this.render();
    }
  }
}

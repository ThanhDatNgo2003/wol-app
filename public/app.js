const API_URL = '/api';

class WoLApp {
    constructor() {
        this.wakeBtn = document.getElementById('wakeBtn');
        this.statusBtn = document.getElementById('statusBtn');
        this.statusEl = document.getElementById('status');
        this.messageEl = document.getElementById('message');
        this.lastWakeEl = document.getElementById('lastWake');

        this.initEventListeners();
        this.loadLastWake();
    }

    initEventListeners() {
        this.wakeBtn.addEventListener('click', () => this.wakePC());
        this.statusBtn.addEventListener('click', () => this.checkStatus());
    }

    async wakePC() {
        this.wakeBtn.classList.add('loading');
        this.wakeBtn.disabled = true;
        this.clearMessage();

        try {
            const response = await fetch(`${API_URL}/wake`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('PC wake signal sent!', 'success');
                this.statusEl.textContent = 'Wake signal sent';
                this.statusEl.classList.add('active');
                this.updateLastWake();
            } else {
                this.showMessage(data.error || 'Failed to send wake signal', 'error');
                this.statusEl.textContent = 'Error sending signal';
                this.statusEl.classList.add('error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Network error: ' + error.message, 'error');
            this.statusEl.textContent = 'Network error';
            this.statusEl.classList.add('error');
        } finally {
            this.wakeBtn.classList.remove('loading');
            this.wakeBtn.disabled = false;
        }
    }

    async checkStatus() {
        this.statusBtn.disabled = true;
        this.clearMessage();

        try {
            const response = await fetch(`${API_URL}/status`);
            const data = await response.json();

            if (response.ok) {
                this.showMessage('PC Status: ' + (data.online ? 'Online' : 'Offline'), 'info');
            } else {
                this.showMessage('Unable to check status', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error checking status', 'error');
        } finally {
            this.statusBtn.disabled = false;
        }
    }

    showMessage(text, type) {
        this.messageEl.textContent = text;
        this.messageEl.className = `message show ${type}`;
        setTimeout(() => {
            this.messageEl.classList.remove('show');
        }, 5000);
    }

    clearMessage() {
        this.messageEl.classList.remove('show');
    }

    updateLastWake() {
        const now = new Date();
        const time = now.toLocaleTimeString();
        this.lastWakeEl.textContent = time;
        localStorage.setItem('lastWake', time);
    }

    loadLastWake() {
        const lastWake = localStorage.getItem('lastWake');
        if (lastWake) {
            this.lastWakeEl.textContent = lastWake;
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new WoLApp();
    });
} else {
    new WoLApp();
}

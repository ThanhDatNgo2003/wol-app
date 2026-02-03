const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const USE_SHELL_CMD = process.env.USE_SHELL_CMD === 'true' || true;
const WAKE_CMD = process.env.WAKE_CMD || 'wakepc';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes

/**
 * POST /api/wake
 * Execute wakepc command to wake the PC
 */
app.post('/api/wake', (req, res) => {
  try {
    console.log(`[Wake] Executing: ${WAKE_CMD}`);

    exec(WAKE_CMD, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Wake] Error: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: 'Failed to execute wake command',
          details: error.message
        });
      }

      console.log('[Wake] Command executed successfully');
      console.log('[Wake] Output:', stdout);

      res.json({
        success: true,
        message: `${WAKE_CMD} executed successfully`,
        output: stdout.trim(),
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message,
      success: false
    });
  }
});

/**
 * GET /api/status
 * Check if PC is online (simple ICMP ping)
 */
app.get('/api/status', async (req, res) => {
  try {
    // This is a placeholder - you would need to implement actual PC detection
    // Options:
    // 1. Ping the PC's IP address (requires IP knowledge)
    // 2. Check if PC is responding on a specific port
    // 3. Use arp-scan to detect MAC address on network

    const { exec } = require('child_process');
    const pcIP = process.env.PC_IP;

    if (!pcIP) {
      return res.json({
        online: null,
        message: 'PC_IP not configured',
        note: 'Set PC_IP environment variable to enable status checks'
      });
    }

    // Try to ping the PC
    const cmd = process.platform === 'win32'
      ? `ping -n 1 -w 1000 ${pcIP}`
      : `ping -c 1 -W 1000 ${pcIP}`;

    exec(cmd, (error) => {
      res.json({
        online: !error,
        ip: pcIP,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check status',
      success: false
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    config: {
      wakeCommand: WAKE_CMD,
      useShellCmd: USE_SHELL_CMD,
      pcIpConfigured: !!process.env.PC_IP
    }
  });
});

/**
 * GET /
 * Serve index.html for all other routes (SPA)
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    success: false
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 WoL Server running on http://localhost:${PORT}`);
  console.log(`\n📋 Configuration:`);
  console.log(`   Wake Command: ✅ ${WAKE_CMD}`);
  console.log(`   PC IP Address: ${process.env.PC_IP ? '✅ ' + process.env.PC_IP : '⚠️  Not set (status check disabled)'}`);
  console.log(`\n📝 To customize, set environment variables:`);
  console.log(`   export WAKE_CMD="wakepc"         # Command to execute (default)`);
  console.log(`   export PC_IP="192.168.1.100"     # For status check (optional)`);
  console.log(`\n📡 Available endpoints:`);
  console.log(`   POST /api/wake    - Execute wake command`);
  console.log(`   GET  /api/status  - Check PC status`);
  console.log(`   GET  /api/health  - Health check\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down gracefully...');
  process.exit(0);
});

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { execFile } = require('child_process');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CRITICAL: Validate environment variables
// ============================================
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('[CRITICAL] SESSION_SECRET not set! Exiting...');
  process.exit(1);
}

// Configuration
const WAKE_CMD = process.env.WAKE_CMD || 'wakepc';
const PC_IP = process.env.PC_IP;

// Whitelist of allowed commands (prevent injection)
const ALLOWED_COMMANDS = {
  'wakepc': '/usr/local/bin/wakepc',
  'wakeonlan': '/usr/bin/wakeonlan'
};

// ============================================
// Session Configuration (before auth)
// ============================================
app.use(cookieParser());
app.use(session({
  secret: SESSION_SECRET,
  name: 'wol.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours max
    sameSite: 'strict'
  }
}));

// ============================================
// Security Middleware
// ============================================

// CORS Hardening
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['https://wol.thanhdatngo.site'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

// Security Headers
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// Rate Limiting
// ============================================
const rateLimit = require('express-rate-limit');

const wakeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many wake requests. Please wait before trying again.', success: false },
  standardHeaders: true,
  legacyHeaders: false,
});

const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many status checks. Please slow down.', success: false }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.', success: false }
});

// ============================================
// Authentication Middleware
// ============================================
const bcrypt = require('bcryptjs');

// PIN Manager
class PinManager {
  constructor() {
    this.hashedPin = process.env.PIN_HASH;
    this.authEnabled = !!this.hashedPin;

    if (!this.authEnabled) {
      console.warn('[Security] No PIN_HASH set. Authentication disabled!');
    } else {
      console.log('[Security] PIN authentication enabled');
    }
  }

  async verifyPin(pin) {
    if (!this.authEnabled) return true;
    if (!pin || !/^\d{4,6}$/.test(pin)) return false;

    try {
      return await bcrypt.compare(pin, this.hashedPin);
    } catch (error) {
      console.error('[Auth] PIN verification error:', error);
      return false;
    }
  }

  isEnabled() {
    return this.authEnabled;
  }
}

const pinManager = new PinManager();

// Require Authentication Middleware
const requireAuth = (req, res, next) => {
  if (!pinManager.isEnabled()) return next();

  if (req.session && req.session.authenticated) {
    // Check 15-minute inactive timeout
    const now = Date.now();
    const lastActivity = req.session.lastActivity || req.session.createdAt;
    const inactiveTimeout = 15 * 60 * 1000; // 15 minutes

    if (now - lastActivity > inactiveTimeout) {
      req.session.destroy();
      return res.status(401).json({
        error: 'Session expired due to inactivity',
        success: false,
        requiresAuth: true
      });
    }

    req.session.lastActivity = Date.now();
    return next();
  }

  return res.status(401).json({
    error: 'Authentication required',
    success: false,
    requiresAuth: true
  });
};

// IP-based Brute Force Detection
const ipLoginAttempts = new Map();
const BRUTE_FORCE_THRESHOLD = 3;
const BRUTE_FORCE_WINDOW = 5 * 60 * 1000; // 5 minutes

const trackFailedAttempt = (ip) => {
  if (!ipLoginAttempts.has(ip)) {
    ipLoginAttempts.set(ip, { count: 0, firstAttempt: Date.now() });
  }
  const attempt = ipLoginAttempts.get(ip);
  attempt.count += 1;
  attempt.lastAttempt = Date.now();

  // Clean up old entries
  if (Date.now() - attempt.firstAttempt > BRUTE_FORCE_WINDOW) {
    ipLoginAttempts.delete(ip);
  }
};

const isBruteForceSuspect = (ip) => {
  if (!ipLoginAttempts.has(ip)) return false;
  const attempt = ipLoginAttempts.get(ip);
  return attempt.count >= BRUTE_FORCE_THRESHOLD &&
         Date.now() - attempt.firstAttempt < BRUTE_FORCE_WINDOW;
};

// ============================================
// Server-side Login History Storage
// ============================================
const loginSessions = [];
const MAX_SESSIONS = 100;

const recordLoginSession = (ip, userAgent) => {
  const session = {
    id: Date.now().toString(),
    ip,
    userAgent,
    loginTime: new Date().toISOString(),
    timestamp: Date.now()
  };

  loginSessions.unshift(session);

  // Keep only last 100 sessions
  if (loginSessions.length > MAX_SESSIONS) {
    loginSessions.pop();
  }

  return session;
};

const getLoginSessions = (limit = 100) => {
  return loginSessions.slice(0, limit);
};

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ============================================
// Authentication Routes (Public)
// ============================================

/**
 * POST /api/auth/login
 * Authenticate with PIN
 */
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { pin } = req.body;
    const clientIP = req.ip;

    if (!pin) {
      return res.status(400).json({
        error: 'PIN is required',
        success: false,
        ip: clientIP
      });
    }

    // Check for brute force attempts
    if (isBruteForceSuspect(clientIP)) {
      console.warn(`[Security] Brute force detected from ${clientIP} - blocking`);
      return res.status(429).json({
        error: 'Too many failed attempts. Please wait before trying again.',
        success: false,
        ip: clientIP
      });
    }

    // Verify PIN
    const isValid = await pinManager.verifyPin(pin);

    if (!isValid) {
      trackFailedAttempt(clientIP);
      console.warn(`[Auth] Failed login attempt from ${clientIP} (${ipLoginAttempts.get(clientIP)?.count || 1}/${BRUTE_FORCE_THRESHOLD})`);
      return res.status(401).json({
        error: 'Invalid PIN',
        success: false,
        ip: clientIP
      });
    }

    // Reset failed attempts on successful login
    ipLoginAttempts.delete(clientIP);

    // Check if this is a new device (first time from this IP)
    const isNewDevice = !req.session || !req.session.ip || req.session.ip !== clientIP;

    // Record login session on server
    const userAgent = req.headers['user-agent'] || 'Unknown';
    recordLoginSession(clientIP, userAgent);

    // Create session
    req.session.authenticated = true;
    req.session.createdAt = Date.now();
    req.session.lastActivity = Date.now();
    req.session.ip = clientIP;

    console.log(`[Auth] Successful login from ${clientIP}${isNewDevice ? ' (New Device)' : ''}`);

    res.json({
      success: true,
      message: 'Authentication successful',
      ip: clientIP,
      isNewDevice: isNewDevice
    });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      success: false
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroy session
 */
app.post('/api/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({
          error: 'Logout failed',
          success: false
        });
      }

      res.clearCookie('wol.sid');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } else {
    res.json({
      success: true,
      message: 'No active session'
    });
  }
});

/**
 * GET /api/auth/status
 * Check authentication status
 */
app.get('/api/auth/status', (req, res) => {
  const isAuthenticated = !!(req.session && req.session.authenticated);

  res.json({
    authenticated: isAuthenticated,
    authEnabled: pinManager.isEnabled(),
    sessionAge: req.session && req.session.createdAt
      ? Date.now() - req.session.createdAt
      : null
  });
});

/**
 * GET /api/auth/sessions
 * Get login history (requires authentication)
 */
app.get('/api/auth/sessions', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const sessions = getLoginSessions(limit);

  res.json({
    success: true,
    sessions: sessions,
    total: loginSessions.length
  });
});

// ============================================
// Protected API Routes
// ============================================

/**
 * POST /api/wake
 * Execute wake command (requires authentication)
 */
app.post('/api/wake', requireAuth, wakeLimiter, (req, res) => {
  try {
    // Validate WAKE_CMD against whitelist
    const commandPath = ALLOWED_COMMANDS[WAKE_CMD];

    if (!commandPath) {
      console.error(`[Wake] Invalid command: ${WAKE_CMD}`);
      return res.status(500).json({
        error: 'Invalid wake command configuration',
        success: false
      });
    }

    console.log(`[Wake] Executing: ${WAKE_CMD}`);

    // Use execFile instead of exec for security (no shell)
    execFile(commandPath, [], { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Wake] Error: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: 'Failed to execute wake command'
        });
      }

      console.log('[Wake] Command executed successfully');

      res.json({
        success: true,
        message: `Wake signal sent successfully`,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('[Wake] Unexpected error:', error);
    res.status(500).json({
      error: 'Server error',
      success: false
    });
  }
});

/**
 * GET /api/status
 * Check if PC is online (requires authentication)
 */
app.get('/api/status', requireAuth, statusLimiter, async (req, res) => {
  try {
    if (!PC_IP) {
      return res.status(400).json({
        success: false,
        error: 'PC_IP not configured',
        online: null
      });
    }

    // ============================================
    // SECURITY: Validate IP address format
    // ============================================
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(PC_IP)) {
      console.error(`[Status] Invalid IP format: ${PC_IP}`);
      return res.status(400).json({
        error: 'Invalid PC_IP configuration',
        success: false,
        online: null
      });
    }

    // Additional validation: each octet must be 0-255
    const octets = PC_IP.split('.').map(Number);
    if (octets.some(o => o < 0 || o > 255)) {
      console.error(`[Status] IP octets out of range: ${PC_IP}`);
      return res.status(400).json({
        error: 'Invalid PC_IP configuration',
        success: false,
        online: null
      });
    }

    // ============================================
    // Use execFile with separate arguments (no shell)
    // ============================================
    const pingCmd = process.platform === 'win32' ? 'ping' : 'ping';
    const pingArgs = process.platform === 'win32'
      ? ['-n', '1', '-w', '1000', PC_IP]
      : ['-c', '1', '-W', '1', PC_IP];

    execFile(pingCmd, pingArgs, { timeout: 3000 }, (error) => {
      const isOnline = !error;

      res.json({
        success: true,
        online: isOnline,
        ip: PC_IP,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('[Status] Unexpected error:', error);
    res.status(500).json({
      error: 'Failed to check status',
      success: false,
      online: null
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint (public, does not expose config)
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    authEnabled: pinManager.isEnabled()
    // Note: Do NOT expose: wakeCommand, pcIp, or other config
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
  console.log(`\n🔐 Security Status:`);
  console.log(`   Authentication: ${pinManager.isEnabled() ? '✅ Enabled (PIN required)' : '⚠️  Disabled'}`);
  console.log(`   Rate Limiting: ✅ Enabled (5 wake/min, 30 status/min, 5 auth/15min)`);
  console.log(`   CORS: ✅ Restricted to allowed origins`);
  console.log(`   Security Headers: ✅ Helmet enabled`);
  console.log(`\n📋 Configuration:`);
  console.log(`   Wake Command: ✅ ${WAKE_CMD}`);
  console.log(`   PC IP Address: ${PC_IP ? '✅ ' + PC_IP : '⚠️  Not set (status check disabled)'}`);
  console.log(`\n📡 Available endpoints:`);
  console.log(`   POST /api/auth/login   - Authenticate with PIN`);
  console.log(`   POST /api/auth/logout  - Logout`);
  console.log(`   GET  /api/auth/status  - Check auth status`);
  console.log(`   POST /api/wake         - Execute wake command (requires auth)`);
  console.log(`   GET  /api/status       - Check PC status (requires auth)`);
  console.log(`   GET  /api/health       - Health check\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down gracefully...');
  process.exit(0);
});

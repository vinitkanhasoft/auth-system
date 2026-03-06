/**
 * System information and contact details
 */

export const SYSTEM_INFO = {
  // Application information
  APP: {
    NAME: 'Node.js Authentication System',
    VERSION: '1.0.0',
    DESCRIPTION: 'Production-ready authentication system with JWT, Redis, and MongoDB',
    AUTHOR: 'Development Team',
    LICENSE: 'ISC',
    REPOSITORY: 'https://github.com/your-org/node-auth-system',
  },

  // Contact information
  CONTACT: {
    EMAIL: 'support@yourapp.com',
    WEBSITE: 'https://yourapp.com',
    SUPPORT: 'https://support.yourapp.com',
    DOCUMENTATION: 'https://docs.yourapp.com',
    GITHUB: 'https://github.com/your-org/node-auth-system/issues',
    TWITTER: '@yourapp',
    LINKEDIN: 'https://linkedin.com/company/yourapp',
  },

  // Security and legal
  LEGAL: {
    PRIVACY_POLICY: 'https://yourapp.com/privacy',
    TERMS_OF_SERVICE: 'https://yourapp.com/terms',
    COOKIE_POLICY: 'https://yourapp.com/cookies',
    GDPR_COMPLIANCE: true,
    DATA_RETENTION_DAYS: 365,
  },

  // Rate limiting defaults
  RATE_LIMITS: {
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 100,
    },
    LOGIN: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 5,
    },
    REGISTRATION: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_REQUESTS: 3,
    },
    PASSWORD_RESET: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_REQUESTS: 3,
    },
    EMAIL_VERIFICATION: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_REQUESTS: 5,
    },
    API: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 1000,
    },
  },

  // Token configuration
  TOKENS: {
    ACCESS_TOKEN: {
      EXPIRES_IN: '15m',
      SECRET_LENGTH: 64,
    },
    REFRESH_TOKEN: {
      EXPIRES_IN: '7d',
      SECRET_LENGTH: 64,
    },
    PASSWORD_RESET: {
      EXPIRES_IN: '1h',
      SECRET_LENGTH: 32,
    },
    EMAIL_VERIFICATION: {
      EXPIRES_IN: '24h',
      SECRET_LENGTH: 32,
    },
  },

  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SPECIAL_CHARS: '@$!%*?&',
    PATTERN: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]',
  },

  // Email configuration
  EMAIL: {
    FROM_NAME: 'YourApp Team',
    SUPPORT_EMAIL: 'support@yourapp.com',
    NO_REPLY_EMAIL: 'noreply@yourapp.com',
    TEMPLATE_LOGO: 'https://yourapp.com/logo.png',
    BRAND_COLOR: '#007bff',
    FOOTER_TEXT: '© 2024 YourApp. All rights reserved.',
  },

  // Database configuration
  DATABASE: {
    MAX_CONNECTION_POOL_SIZE: 10,
    SERVER_SELECTION_TIMEOUT_MS: 5000,
    SOCKET_TIMEOUT_MS: 45000,
    BUFFER_COMMANDS: false,
    BUFFER_MAX_ENTRIES: 0,
  },

  // Redis configuration
  REDIS: {
    MAX_RECONNECT_ATTEMPTS: 10,
    RECONNECT_DELAY_MS: 50,
    MAX_DELAY_MS: 500,
    KEY_PREFIX: 'auth_system:',
    DEFAULT_TTL_SECONDS: 3600, // 1 hour
  },

  // Security settings
  SECURITY: {
    BCRYPT_ROUNDS: 12,
    JWT_ALGORITHM: 'HS256',
    CORS_MAX_AGE: 86400, // 24 hours
    HELMET_CSP_DIRECTIVES: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
    SESSION_SECRET_MIN_LENGTH: 32,
  },

  // File upload limits
  UPLOAD: {
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Cache settings
  CACHE: {
    USER_CACHE_TTL_SECONDS: 300, // 5 minutes
    TOKEN_CACHE_TTL_SECONDS: 60, // 1 minute
    CONFIG_CACHE_TTL_SECONDS: 3600, // 1 hour
  },

  // Monitoring and logging
  MONITORING: {
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    REQUEST_LOG_FORMAT: 'combined',
    HEALTH_CHECK_INTERVAL_MS: 30000, // 30 seconds
    METRICS_COLLECTION_ENABLED: process.env.NODE_ENV === 'production',
  },
} as const;

/**
 * Get system information for API responses
 */
export const getSystemInfo = () => ({
  name: SYSTEM_INFO.APP.NAME,
  version: SYSTEM_INFO.APP.VERSION,
  environment: process.env.NODE_ENV || 'development',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  contact: {
    email: SYSTEM_INFO.CONTACT.EMAIL,
    website: SYSTEM_INFO.CONTACT.WEBSITE,
    support: SYSTEM_INFO.CONTACT.SUPPORT,
  },
});

/**
 * Get contact information for support
 */
export const getContactInfo = () => ({
  email: SYSTEM_INFO.CONTACT.EMAIL,
  website: SYSTEM_INFO.CONTACT.WEBSITE,
  support: SYSTEM_INFO.CONTACT.SUPPORT,
  documentation: SYSTEM_INFO.CONTACT.DOCUMENTATION,
  github: SYSTEM_INFO.CONTACT.GITHUB,
  social: {
    twitter: SYSTEM_INFO.CONTACT.TWITTER,
    linkedin: SYSTEM_INFO.CONTACT.LINKEDIN,
  },
});

/**
 * Get legal information
 */
export const getLegalInfo = () => ({
  privacyPolicy: SYSTEM_INFO.LEGAL.PRIVACY_POLICY,
  termsOfService: SYSTEM_INFO.LEGAL.TERMS_OF_SERVICE,
  cookiePolicy: SYSTEM_INFO.LEGAL.COOKIE_POLICY,
  gdprCompliant: SYSTEM_INFO.LEGAL.GDPR_COMPLIANCE,
  dataRetentionDays: SYSTEM_INFO.LEGAL.DATA_RETENTION_DAYS,
});

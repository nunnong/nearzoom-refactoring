export const AUTH_CONFIG = {
  SESSION_TIMEOUT: 2 * 60 * 60 * 1000, // 2시간
  IDLE_TIMEOUT: 2 * 60 * 60 * 1000, // 2시간
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'nearzoom_access_token',
    SESSION_TIMESTAMP: 'nearzoom_session_timestamp',
  },
  IDLE_EVENTS: [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ],
} as const
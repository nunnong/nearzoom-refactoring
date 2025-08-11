import { AUTH_CONFIG } from './config'

export const sessionManager = {
  saveTimestamp: (): void => {
    try {
      const timestamp = Date.now()
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_TIMESTAMP, timestamp.toString())
      console.log('✅ Session timestamp saved:', new Date(timestamp).toLocaleString())
    } catch (error) {
      console.error('❌ Failed to save session timestamp:', error)
    }
  },

  getTimestamp: (): number | null => {
    try {
      const timestamp = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_TIMESTAMP)
      return timestamp ? parseInt(timestamp) : null
    } catch (error) {
      console.error('❌ Failed to get session timestamp:', error)
      return null
    }
  },

  removeTimestamp: (): void => {
    try {
      localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_TIMESTAMP)
      console.log('🗑️ Session timestamp removed from localStorage')
    } catch (error) {
      console.error('❌ Failed to remove session timestamp:', error)
    }
  },

  isExpired: (): boolean => {
    const timestamp = sessionManager.getTimestamp()
    if (!timestamp) return true
    
    const now = Date.now()
    const isExpired = (now - timestamp) > AUTH_CONFIG.SESSION_TIMEOUT
    
    if (isExpired) {
      console.log('🕐 Session expired:', {
        sessionStart: new Date(timestamp).toLocaleString(),
        now: new Date(now).toLocaleString(),
        elapsed: Math.floor((now - timestamp) / 1000 / 60) + ' minutes'
      })
    }
    
    return isExpired
  },

  updateActivity: (): void => {
    sessionManager.saveTimestamp()
  }
}
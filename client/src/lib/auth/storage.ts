import { AUTH_CONFIG } from './config'

export const tokenStorage = {
  save: (token: string): void => {
    try {
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token)
      console.log('✅ Access token saved to localStorage')
    } catch (error) {
      console.error('❌ Failed to save access token:', error)
    }
  },

  get: (): string | null => {
    try {
      return localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN)
    } catch (error) {
      console.error('❌ Failed to get access token from localStorage:', error)
      return null
    }
  },

  remove: (): void => {
    try {
      localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.ACCESS_TOKEN)
      console.log('🗑️ Access token removed from localStorage')
    } catch (error) {
      console.error('❌ Failed to remove access token:', error)
    }
  }
}
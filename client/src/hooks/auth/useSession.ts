import { useCallback, useEffect } from 'react'
import { sessionManager } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'

export const useSession = () => {
  const { logoutDueToInactivity } = useAuthStore()

  const checkSessionExpiration = useCallback(() => {
    if (sessionManager.isExpired()) {
      logoutDueToInactivity()
      return false
    }
    return true
  }, [logoutDueToInactivity])

  const updateActivity = useCallback(() => {
    sessionManager.updateActivity()
  }, [])

  const initializeSession = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    if (sessionManager.isExpired()) {
      logoutDueToInactivity()
      return false
    }
    
    sessionManager.updateActivity()
    return true
  }, [logoutDueToInactivity])

  useEffect(() => {
    const interval = setInterval(checkSessionExpiration, 60000) // 1분마다 체크
    return () => clearInterval(interval)
  }, [checkSessionExpiration])

  return {
    checkSessionExpiration,
    updateActivity,
    initializeSession,
  }
}
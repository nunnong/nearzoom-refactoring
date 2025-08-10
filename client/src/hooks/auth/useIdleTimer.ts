import { useEffect, useRef, useCallback } from 'react'
import { AUTH_CONFIG, sessionManager } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'

interface UseIdleTimerOptions {
  timeout?: number
  events?: string[]
  enabled?: boolean
}

export const useIdleTimer = ({ 
  timeout = AUTH_CONFIG.IDLE_TIMEOUT,
  events = AUTH_CONFIG.IDLE_EVENTS,
  enabled = true
}: UseIdleTimerOptions = {}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { logoutDueToInactivity } = useAuthStore()

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        logoutDueToInactivity()
      }, timeout)
    }
  }, [timeout, enabled, logoutDueToInactivity])

  const handleActivity = useCallback(() => {
    resetTimer()
    sessionManager.updateActivity()
  }, [resetTimer])

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    resetTimer()

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [events, handleActivity, resetTimer, enabled])

  return { resetTimer }
}
import { useEffect, useRef, useCallback } from 'react'

interface UseIdleTimerOptions {
  timeout: number // 밀리초 단위
  onIdle: () => void
  events?: string[]
  enabled?: boolean
}

export const useIdleTimer = ({ 
  timeout, 
  onIdle, 
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  enabled = true 
}: UseIdleTimerOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onIdleRef = useRef(onIdle)

  onIdleRef.current = onIdle

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        onIdleRef.current()
      }, timeout)
    }
  }, [timeout, enabled])

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    const handleActivity = () => {
      resetTimer()
    }

    // 초기 타이머 설정
    resetTimer()

    // 이벤트 리스너 등록
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
  }, [events, resetTimer, enabled])

  return { resetTimer }
}
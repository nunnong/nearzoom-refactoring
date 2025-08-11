'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useIdleTimer } from '@/hooks/useIdleTimer'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { initializeAuth } = useAuth()
  const { isAuthenticated, logoutDueToInactivity } = useAuthStore()

  // 2시간(7200000ms) 비활성화 후 자동 로그아웃
  useIdleTimer({
    timeout: 2 * 60 * 60 * 1000, // 2시간
    onIdle: logoutDueToInactivity,
    enabled: isAuthenticated, // 로그인된 경우에만 활성화
  })

  useEffect(() => {
    // 앱 시작 시 저장된 토큰으로 인증 상태 복원
    initializeAuth()
  }, [initializeAuth])

  return <>{children}</>
}
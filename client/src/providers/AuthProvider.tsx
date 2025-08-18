'use client'

import { useEffect } from 'react'

import { useIdleTimer } from '@/hooks/auth'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, initializeAuth } = useAuthStore()

  // 인증된 사용자의 비활성화 타이머
  useIdleTimer({
    enabled: isAuthenticated,
  })

  useEffect(() => {
    // 앱 시작 시 인증 상태 초기화
    initializeAuth()
  }, [initializeAuth])

  return <>{children}</>
}

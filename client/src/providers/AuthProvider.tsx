'use client'

import { useEffect } from 'react'

import { useAuth, useIdleTimer } from '@/hooks/auth'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { initializeAuth } = useAuth()
  const { isAuthenticated } = useAuthStore()

  // 인증된 사용자의 비활성화 타이머
  useIdleTimer({
    enabled: isAuthenticated,
  })

  useEffect(() => {
    // 앱 시작 시 저장된 토큰으로 인증 상태 복원
    initializeAuth()
  }, [initializeAuth])

  return <>{children}</>
}
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
    // authStore의 통합된 초기화 함수 사용
    initializeAuth()
  }, [initializeAuth])

  return <>{children}</>
}
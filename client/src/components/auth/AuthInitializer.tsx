'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/auth'

/**
 * 앱 시작 시 인증 상태를 초기화하는 컴포넌트
 * layout.tsx에서 사용하여 페이지 로드 시 자동으로 토큰을 복원합니다
 */
const AuthInitializer = () => {
  const { initializeAuth } = useAuth()

  useEffect(() => {
    // 앱 시작 시 localStorage에서 토큰 복원 및 검증
    initializeAuth()
  }, [initializeAuth])

  // UI를 렌더링하지 않는 로직 전용 컴포넌트
  return null
}

export default AuthInitializer
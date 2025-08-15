'use client'

import { useEffect } from 'react'

import { useIdleTimer } from '@/hooks/auth'
import { useAuthStore } from '@/stores/authStore'
import { tokenStorage } from '@/lib/auth'
import { userService } from '@/services/userService'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, setTokens, setUser, setLoading } = useAuthStore()

  // 인증된 사용자의 비활성화 타이머
  useIdleTimer({
    enabled: isAuthenticated,
  })

  useEffect(() => {
    // 앱 시작 시 저장된 토큰으로 인증 상태 복원
    const initializeAuth = async () => {
      setLoading(true)
      try {
        const savedToken = tokenStorage.get()
        if (savedToken) {
          setTokens({ accessToken: savedToken })
          
          // 저장된 토큰으로 사용자 정보 가져오기
          try {
            const userInfo = await userService.getUserInfo()
            setUser(userInfo.data)
          } catch (error) {
            // 토큰이 유효하지 않은 경우
            tokenStorage.remove()
            setTokens({ accessToken: null })
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [setTokens, setUser, setLoading])

  return <>{children}</>
}
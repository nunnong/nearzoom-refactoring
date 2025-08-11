import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { userTransformer } from '@/lib/auth'
import type { SocialType } from '@/types/auth'

export const useAuth = () => {
  const router = useRouter()

  const {
    accessToken,
    user,
    isLoading,
    isAuthenticated,
    setTokens,
    setUser,
    setLoading,
    clearTokens,
    initializeAuth,
    logout,
  } = useAuthStore()

  const startSocialLogin = (provider: SocialType) => {
    const loginUrl = authService.getSocialLoginUrl(provider)
    window.location.href = loginUrl
  }

  const handleLoginSuccess = (accessToken: string) => {
    setTokens({ accessToken })
  }

  const fetchUserInfo = async () => {
    try {
      setLoading(true)
      const response = await userService.getUserInfo()
      
      const rawData = response
      const userData = userTransformer.fromBackend(rawData)
      setUser(userData)
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error)
      clearTokens()
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    router.push('/login')
  }

  const handleKakaoLoginClick = () => {
    startSocialLogin('KAKAO')
  }

  const handleGoogleLoginClick = () => {
    startSocialLogin('GOOGLE')
  }

  const handleLogout = () => {
    logout()
  }

  const handleMyPage = () => {
    if (isAuthenticated) {
      router.push('/myroom')
    } else {
      router.push('/login')
    }
  }

  const handleMyFeed = () => {
    if (isAuthenticated) {
      router.push('/myfeed')
    } else {
      router.push('/login')
    }
  }

  const handleAfterLoginClick = () => {
    if (isAuthenticated) {
      router.push('/groupcall/waiting')
    } else {
      router.push('/login')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await userService.deleteUser()
      
      // 백엔드에서 세션/쿠키 정리가 완료된 후 클라이언트 토큰도 즉시 제거
      clearTokens()
      
      // 카카오 로그아웃 (소셜 로그인 세션 제거)
      if (typeof window !== 'undefined' && window.Kakao?.Auth) {
        try {
          await window.Kakao.Auth.logout()
        } catch (kakaoError) {
          console.warn('카카오 로그아웃 실패:', kakaoError)
        }
      }
      
      // 구글 로그아웃
      if (typeof window !== 'undefined' && window.google?.accounts) {
        try {
          window.google.accounts.id.disableAutoSelect()
        } catch (googleError) {
          console.warn('구글 로그아웃 실패:', googleError)
        }
      }
      
      // router 대신 window.location으로 강제 새로고침하여 모든 상태 초기화
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error: any) {
      console.error('회원탈퇴 실패:', {
        message: error?.message,
        status: error?.status,
        response: error?.response?.data,
        error: error
      })
      throw error
    }
  }

  return {
    // 상태
    accessToken,
    user,
    isLoading,
    isAuthenticated,
    isLoggedIn: isAuthenticated,

    // 액션
    startSocialLogin,
    handleLoginSuccess,
    fetchUserInfo,
    handleLogin,
    handleLogout,
    handleMyPage,
    handleMyFeed,
    handleKakaoLoginClick,
    handleGoogleLoginClick,
    handleAfterLoginClick,
    handleDeleteAccount,
    logout,
    initializeAuth,
  }
}
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
    console.log('handleLoginSuccess 호출됨, 토큰:', accessToken)
    setTokens({ accessToken })
    console.log('setTokens 완료')
  }

  const fetchUserInfo = async () => {
    try {
      setLoading(true)
      const response = await userService.getUserInfo()
      console.log('Raw user info response:', response)
      
      const rawData = response.data || response
      const userData = userTransformer.fromBackend(rawData)
      
      console.log('Converted user data:', userData)
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
      logout()
      router.replace('/')
    } catch (error) {
      console.error('회원탈퇴 실패:', error)
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
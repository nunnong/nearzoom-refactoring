import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import type { SocialType } from '@/types/auth'

export const useAuth = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
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

  // 소셜 로그인 시작
  const startSocialLogin = (provider: SocialType) => {
    const loginUrl = authService.getSocialLoginUrl(provider)
    window.location.href = loginUrl
  }

  // 로그인 성공 후 토큰 처리
  const handleLoginSuccess = (accessToken: string) => {
    setTokens({ accessToken })
  }
  // 사용자 정보 가져오기
  const fetchUserInfo = async () => {
    try {
      setLoading(true)
      const userData = await authService.validateToken()
      setUser(userData)
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error)
      clearTokens()
    } finally {
      setLoading(false)
    }
  }

  // (메인화면에서) 로그인 클릭 핸들러
  const handleLogin = () => {
    setIsLoginModalOpen(true)
  }

  // 카카오 로그인 클릭 핸들러
  const handleKakaoLoginClick = () => {
    startSocialLogin('KAKAO')
  }

  // 구글 로그인 클릭 핸들러
  const handleGoogleLoginClick = () => {
    startSocialLogin('GOOGLE')
  }

  // 로그아웃 핸들러
  const handleLogout = () => {
    logout()
  }

  // 마이룸 이동 핸들러
  const handleMyPage = () => {
    if (isAuthenticated) {
      router.push('/myroom')
    } else {
      setIsLoginModalOpen(true)
    }
  }
  // 로그인 후 액션 핸들러
  const handleAfterLoginClick = () => {
    if (isAuthenticated) {
      router.push('/upload-selfie')
    } else {
      setIsLoginModalOpen(true)
    }
  }

  return {
    // 상태
    accessToken,
    user,
    isLoading,
    isAuthenticated,
    isLoggedIn: isAuthenticated,
    isLoginModalOpen,

    // 액션
    setIsLoginModalOpen,
    startSocialLogin,
    handleLoginSuccess,
    fetchUserInfo,
    handleLogin,
    handleLogout,
    handleMyPage,
    handleKakaoLoginClick,
    handleGoogleLoginClick,
    handleAfterLoginClick,
    logout,
    initializeAuth,
  }
}

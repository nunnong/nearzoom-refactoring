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
    console.log('handleLoginSuccess 호출됨, 토큰:', accessToken)
    setTokens({ accessToken })
    console.log('setTokens 완료')
  }
  // 사용자 정보 가져오기
  const fetchUserInfo = async () => {
    try {
      setLoading(true)
      const response = await authService.validateToken()
      console.log('Raw user info response:', response)
      
      // ApiResponse 구조에서 실제 데이터 추출
      const rawData = response.data || response
      
      // 백엔드 응답을 프론트엔드 User 타입에 맞게 변환
      const userData = {
        id: rawData.id || 0,
        name: rawData.userName || rawData.name || '',
        email: rawData.userEmail || rawData.email || '',
        profileImage: rawData.userProfileImage || rawData.profileImage,
        socialType: rawData.socialType || 'GOOGLE', // 구글 로그인이므로 GOOGLE로 설정
        createdAt: rawData.createdAt || new Date().toISOString(),
        updatedAt: rawData.updatedAt || new Date().toISOString(),
      }
      
      console.log('Converted user data:', userData)
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

  // 마이피드 이동 핸들러
  const handleMyFeed = () => {
    if (isAuthenticated) {
      router.push('/myfeed')
    } else {
      setIsLoginModalOpen(true)
    }
  }
  // 로그인 후 액션 핸들러
  const handleAfterLoginClick = () => {
    if (isAuthenticated) {
      router.push('/groupcall/waiting')
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
    handleMyFeed,
    handleKakaoLoginClick,
    handleGoogleLoginClick,
    handleAfterLoginClick,
    logout,
    initializeAuth,
  }
}

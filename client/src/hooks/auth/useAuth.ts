import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { userTransformer } from '@/lib/auth'
import { roomAPI } from '@/lib/api/room' // 🔥 추가: 방 API import
import type { SocialType } from '@/types/auth'

export const useAuth = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false) // 🔥 추가: 방 생성 상태
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

  // hooks/useAuth.ts - fetchUserInfo 함수
const fetchUserInfo = async () => {
  try {
    setLoading(true)
    const response = await userService.getUserInfo()
    console.log('Raw user info response:', response)
    
    // 백엔드 응답 구조 확인을 위한 로그
    console.log('Response structure:', JSON.stringify(response, null, 2))
    
    // 응답 구조에 따라 조건부로 데이터 추출
    let rawData
    if (response.data) {
      rawData = response.data
    } else {
      rawData = response
    }
    
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
    setIsLoginModalOpen(true)
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
      setIsLoginModalOpen(true)
    }
  }

  const handleMyFeed = () => {
    if (isAuthenticated) {
      router.push('/myfeed')
    } else {
      setIsLoginModalOpen(true)
    }
  }

  // 🔥 수정: 방 생성 로직 추가
  const handleAfterLoginClick = async () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true)
      return
    }

    if (isCreatingRoom) return // 중복 클릭 방지

    setIsCreatingRoom(true)

    try {
      console.log('방 생성 시작...')
      
      // 즉시 방 생성 API 호출
      const roomData = await roomAPI.createRoom()
      
      console.log('방 생성 성공:', roomData)
      
      // sessionStorage에 roomData 저장
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('roomData', JSON.stringify(roomData))
      }
      
      // 생성된 방으로 즉시 이동 (방장으로 접속)
      const roomUrl = `/room/${roomData.roomId}?isHost=true&skipJoin=true`
      
      router.push(roomUrl)
      
    } catch (error) {
      console.error('방 생성 실패:', error)
      
      // 🔥 인증 관련 에러 처리
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      
      if (errorMessage.includes('인증') || errorMessage.includes('로그인') || errorMessage.includes('토큰')) {
        // 인증 에러인 경우 로그인 모달 표시
        alert('로그인이 필요합니다.')
        setIsLoginModalOpen(true)
      } else {
        alert('방 생성에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsCreatingRoom(false)
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
    isCreatingRoom, // 🔥 추가: 방 생성 상태 반환

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
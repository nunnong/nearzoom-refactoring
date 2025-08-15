import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { userTransformer } from '@/lib/auth'
import { useRoomStore } from '@/stores/roomStore'
import { roomAPI } from '@/lib/api/room' // 🔥 방 API import
import type { SocialType } from '@/types/auth'

interface Filter {
  id: string
  type: 'heart' | 'name' | 'date' | 'edited'
  value: string
  display: string
}

export const useAuth = () => {
  // 🔥 방 생성 상태만 추가 (로그인 모달은 제거)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const router = useRouter()
  const [filters, setFilters] = useState<Filter[]>([])

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

  // 🔥 팀원의 간단한 fetchUserInfo 사용
  const fetchUserInfo = async () => {
    try {
      setLoading(true)
      const response = await userService.getUserInfo()
      
      const rawData = response.data
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

  // 🔥 방 생성 로직 (로그인 페이지로 리다이렉트 방식으로 수정)
  const handleAfterLoginClick = async () => {
    if (!isAuthenticated) {
      // 🔥 현재 페이지를 저장하고 로그인 페이지로 이동
      if (typeof window !== 'undefined') {
        localStorage.setItem('redirectAfterLogin', window.location.pathname)
        localStorage.setItem('actionAfterLogin', 'createRoom') // 로그인 후 방 생성 액션
      }
      router.push('/login')
      return
    }

    if (isCreatingRoom) return // 중복 클릭 방지

    setIsCreatingRoom(true)

    try {
      console.log('방 생성 시작...')
      
      // 즉시 방 생성 API 호출
      const roomData = await roomAPI.createRoom()
      
      console.log('방 생성 성공:', roomData)
      
      const { setRoomData, setIsHost } = useRoomStore.getState()
      setRoomData(roomData)
      setIsHost(true)
      
      // 생성된 방으로 이동
      const roomUrl = `/room/${roomData.roomId}?isHost=true&skipJoin=true`
      router.push(roomUrl)
      
    } catch (error) {
      console.error('방 생성 실패:', error)
      
      // 인증 관련 에러 처리
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      
      if (errorMessage.includes('인증') || errorMessage.includes('로그인') || errorMessage.includes('토큰')) {
        // 인증 에러인 경우 로그인 페이지로 이동
        alert('로그인이 필요합니다.')
        router.push('/login')
      } else {
        alert('방 생성에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsCreatingRoom(false)
    }
  }

  // 🔥 팀원의 회원탈퇴 기능 추가
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
    isCreatingRoom, // 🔥 방 생성 상태만 유지

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
    handleDeleteAccount, // 🔥 회원탈퇴 기능 추가
    logout,
    initializeAuth,
  }
}
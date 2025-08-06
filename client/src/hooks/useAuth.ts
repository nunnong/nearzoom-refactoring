import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  isLoggedIn,
  clearUserAuth,
  getCurrentUser,
  handleKakaoLogin,
  handleGoogleLogin,
} from '@/utils/auth'
import type { UserInfo } from '@/utils/auth'

export const useAuth = () => {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // 컴포넌트 마운트 시 로그인 상태 확인
  useEffect(() => {
    const checkAuthStatus = () => {
      const loginStatus = isLoggedIn()
      const user = getCurrentUser()

      setIsUserLoggedIn(loginStatus)
      setCurrentUser(user)
      setIsLoading(false)
    }

    checkAuthStatus()
  }, [])

  const handleLogin = () => {
    if (isUserLoggedIn) {
      return
    }
    setIsLoginModalOpen(true)
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true)

      // 소셜 로그인 제공자별 로그아웃 처리
      if (currentUser?.provider === 'kakao') {
        // TODO: 카카오 로그아웃 API 호출
        console.log('🟡 Kakao logout initiated')
      } else if (currentUser?.provider === 'google') {
        // TODO: 구글 로그아웃 API 호출
        console.log('🔵 Google logout initiated')
      }

      // 로컬 인증 데이터 삭제
      clearUserAuth()

      // 상태 업데이트
      setIsUserLoggedIn(false)
      setCurrentUser(null)

      console.log('✅ Logout successful')

      // 메인 페이지로 리다이렉트
      router.push('/')
    } catch (error) {
      console.error('❌ Logout failed:', error)
      alert('로그아웃 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMyPage = () => {
    if (isUserLoggedIn) {
      console.log('Navigate to MyPage')
      router.push('/myroom')
    } else {
      setIsLoginModalOpen(true)
    }
  }

  const handleKakaoLoginClick = async () => {
    try {
      setIsLoading(true)
      const success = await handleKakaoLogin()

      if (success) {
        const user = getCurrentUser()
        setIsUserLoggedIn(true)
        setCurrentUser(user)
        setIsLoginModalOpen(false)
        console.log('✅ Kakao login successful')
        return true
      } else {
        alert('카카오 로그인에 실패했습니다.')
        return false
      }
    } catch (error) {
      console.error('❌ Kakao login error:', error)
      alert('카카오 로그인 중 오류가 발생했습니다.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLoginClick = async () => {
    try {
      setIsLoading(true)
      const success = await handleGoogleLogin()

      if (success) {
        const user = getCurrentUser()
        setIsUserLoggedIn(true)
        setCurrentUser(user)
        setIsLoginModalOpen(false)
        console.log('✅ Google login successful')
        return true
      } else {
        alert('구글 로그인에 실패했습니다.')
        return false
      }
    } catch (error) {
      console.error('❌ Google login error:', error)
      alert('구글 로그인 중 오류가 발생했습니다.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const handleAfterLoginClick = () => {
    if (isUserLoggedIn) {
      router.push('/groupcall/waiting')
    } else {
      setIsLoginModalOpen(true)
    }
  }

  return {
    isLoggedIn: isUserLoggedIn,
    isLoginModalOpen,
    currentUser,
    isLoading,
    setIsLoginModalOpen,
    handleLogin,
    handleLogout,
    handleMyPage,
    handleKakaoLoginClick,
    handleGoogleLoginClick,
    handleAfterLoginClick,
  }
}

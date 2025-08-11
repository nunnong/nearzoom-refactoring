"use client"

import type { JSX } from "react"
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'

const LoginPage = (): JSX.Element => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { startSocialLogin, isAuthenticated, isLoading } = useAuth()
  
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [actionAfterLogin, setActionAfterLogin] = useState<string | null>(null)

  // 🔥 디버깅을 위한 로그 추가
  useEffect(() => {
    console.log('=== LoginPage 디버깅 ===')
    console.log('URL 파라미터:', {
      redirect: searchParams.get('redirect'),
      returnUrl: searchParams.get('returnUrl'),
      action: searchParams.get('action')
    })
    console.log('localStorage:', {
      redirectAfterLogin: localStorage.getItem('redirectAfterLogin'),
      actionAfterLogin: localStorage.getItem('actionAfterLogin')
    })
  }, [searchParams])

  // URL 파라미터나 localStorage에서 리다이렉트 정보 확인
  useEffect(() => {
    // 🔥 더 많은 파라미터 확인
    const redirectParam = searchParams.get('redirect') || searchParams.get('returnUrl')
    const actionParam = searchParams.get('action')
    const storedRedirect = localStorage.getItem('redirectAfterLogin')
    const storedAction = localStorage.getItem('actionAfterLogin')
    
    console.log('🔍 리다이렉트 정보 수집:', {
      redirectParam,
      actionParam,
      storedRedirect,
      storedAction
    })
    
    if (redirectParam) {
      const decodedUrl = decodeURIComponent(redirectParam)
      setRedirectUrl(decodedUrl)
      console.log('✅ redirectUrl 설정:', decodedUrl)
    } else if (storedRedirect) {
      setRedirectUrl(storedRedirect)
      console.log('✅ redirectUrl 설정 (localStorage):', storedRedirect)
    }
    
    if (actionParam) {
      setActionAfterLogin(actionParam)
      console.log('✅ actionAfterLogin 설정:', actionParam)
    } else if (storedAction) {
      setActionAfterLogin(storedAction)
      console.log('✅ actionAfterLogin 설정 (localStorage):', storedAction)
    }
  }, [searchParams])

  // 로그인 상태 확인 및 리다이렉트 처리
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      handleLoginSuccess()
    }
  }, [isAuthenticated, isLoading])

  // 로그아웃 상태 정리 함수
  const clearLoginData = () => {
    localStorage.removeItem('redirectAfterLogin')
    localStorage.removeItem('actionAfterLogin')
  }

  // 🔥 수정된 로그인 성공 후 처리
  const handleLoginSuccess = () => {
    console.log('🎉 handleLoginSuccess 실행')
    console.log('현재 상태:', { redirectUrl, actionAfterLogin })
    
    // 🔥 항상 참조사진 페이지를 거치도록 수정
    if (redirectUrl) {
      console.log('✅ 로그인 완료 - 참조사진 페이지로 이동 (공유 URL 보존)')
      const encodedRedirectUrl = encodeURIComponent(redirectUrl)
      router.push(`/upload-photo?returnUrl=${encodedRedirectUrl}`)
    } else if (actionAfterLogin === 'createRoom') {
      console.log('✅ 로그인 완료 - 참조사진 페이지로 이동 (방 생성 예정)')
      router.push('/upload-photo?action=createRoom')
    } else {
      // 🔥 기본값도 참조사진 페이지로 변경 (사용자가 직접 로그인한 경우)
      console.log('✅ 로그인 완료 - 참조사진 페이지로 이동 (기본)')
      router.push('/upload-photo')
    }
    
    // 🔥 이동 후에 localStorage 정리
    setTimeout(() => {
      clearLoginData()
    }, 1000)
  }

  // 뒤로가기 처리 (브라우저 기록 고려)
  // const handleGoBack = () => {
  //   clearLoginData()
    
  //   if (window.history.length > 1) {
  //     router.back()
  //   } else {
  //     router.push('/')
  //   }
  // }

  // 메인페이지로 강제 이동
  const handleGoToMain = () => {
    clearLoginData()
    router.push('/')
  }

  // ESC 키로 닫기 기능
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleGoToMain()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // 🔥 수정된 소셜 로그인 시작 (더 안전한 데이터 보존)
  const handleKakaoLogin = () => {
    console.log('🔥 카카오 로그인 시작')
    console.log('보존할 데이터:', { redirectUrl, actionAfterLogin })
    
    // 🔥 URL 파라미터도 함께 저장
    const currentRedirect = redirectUrl || searchParams.get('redirect') || searchParams.get('returnUrl')
    const currentAction = actionAfterLogin || searchParams.get('action')
    
    if (currentRedirect) {
      localStorage.setItem('redirectAfterLogin', currentRedirect)
      console.log('💾 redirectAfterLogin 저장:', currentRedirect)
    }
    if (currentAction) {
      localStorage.setItem('actionAfterLogin', currentAction)
      console.log('💾 actionAfterLogin 저장:', currentAction)
    }
    
    startSocialLogin('KAKAO')
  }

  const handleGoogleLogin = () => {
    console.log('🔥 구글 로그인 시작')
    console.log('보존할 데이터:', { redirectUrl, actionAfterLogin })
    
    const currentRedirect = redirectUrl || searchParams.get('redirect') || searchParams.get('returnUrl')
    const currentAction = actionAfterLogin || searchParams.get('action')
    
    if (currentRedirect) {
      localStorage.setItem('redirectAfterLogin', currentRedirect)
      console.log('💾 redirectAfterLogin 저장:', currentRedirect)
    }
    if (currentAction) {
      localStorage.setItem('actionAfterLogin', currentAction)
      console.log('💾 actionAfterLogin 저장:', currentAction)
    }
    
    startSocialLogin('GOOGLE')
  }

  // 이미 로그인된 경우 리다이렉트
  if (isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>리다이렉트 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md mx-4 relative">
        {/* 제목 */}
        <h3 className="text-center text-2xl font-bold text-black">로그인</h3>
        <p className="mt-2 text-center text-sm text-gray-600">
          {redirectUrl ? '로그인 후 🔗초대된 방🔗으로 이동합니다' : '소셜 계정으로 간편하게 로그인하세요'}
        </p>
        
        {/* 리다이렉트 정보 표시 */}
        {actionAfterLogin === 'createRoom' && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-center text-sm text-blue-700">
              ✨ 로그인 후 방을 생성합니다
            </p>
          </div>
        )}

        {/* {redirectUrl && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-center text-sm text-green-700">
              🔗 초대받은 방으로 입장합니다
            </p>
          </div>
        )} */}


        {/* 소셜 로그인 버튼들 */}
        <div className="mt-6 flex flex-col gap-3">
          {/* 카카오 로그인 버튼 */}
          <button
            onClick={handleKakaoLogin}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-lg font-medium transition-colors bg-[#FEE500] text-black hover:bg-[#FDD835] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center space-x-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 3C7.03 3 3 6.14 3 10.1c0 2.54 1.66 4.77 4.16 6.07l-1.09 4.02c-.07.26.2.47.43.33l4.75-3.15c.25.01.5.02.75.02 4.97 0 9-3.14 9-7.1S16.97 3 12 3z"
                />
              </svg>
              <span>{isLoading ? '로그인 중...' : '카카오로 계속하기'}</span>
            </div>
          </button>

          {/* 구글 로그인 버튼 */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-lg font-medium transition-colors bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center space-x-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC04"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>{isLoading ? '로그인 중...' : 'Google로 계속하기'}</span>
            </div>
          </button>
        </div>

        {/* 구분선 */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center bg-white px-2 text-xs text-gray-500">또는</div>
        </div>

        {/* 여러 이동 옵션들 */}
        <div className="space-y-2">
          <button
            onClick={handleGoToMain}
            className="w-full text-sm text-gray-600 hover:text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🏠 메인으로 돌아가기
          </button>
        </div>

        {/* 약관 */}
        <p className="mt-2 text-center text-xs text-gray-500">
          로그인 시{" "}
          <a href="#" className="font-medium text-gray-600 underline hover:text-gray-800">
            이용약관 및 개인정보처리방침
          </a>
          에 동의합니다
        </p>
      </div>
    </div>
  )
}

export default LoginPage
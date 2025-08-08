"use client"

import type { JSX } from "react"
import { useAuth } from '@/hooks/useAuth'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onKakaoLogin?: () => void
  onGoogleLogin?: () => void
  isLoading?: boolean
}

const LoginModal = ({ isOpen, onClose, onKakaoLogin, onGoogleLogin, isLoading = false }: LoginModalProps): JSX.Element => {
  const { startSocialLogin } = useAuth()

  if (!isOpen) return <></>

  const handleKakaoLogin = () => {
    startSocialLogin('KAKAO')
    onClose() // 모달 닫고 리다이렉트
  }

  const handleGoogleLogin = () => {
    startSocialLogin('GOOGLE')
    onClose() // 모달 닫고 리다이렉트
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />

      {/* 모달 컨테이너 */}
      <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-md relative">
          {/* X 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors group"
            aria-label="닫기"
            disabled={isLoading}
          >
            <svg
              className="w-4 h-4 text-gray-600 group-hover:text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 제목 */}
          <h3 className="text-center text-2xl font-bold text-black">로그인</h3>
          <p className="mt-2 text-center text-sm text-gray-600">소셜 계정으로 간편하게 로그인하세요</p>

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
                <span>카카오로 계속하기</span>
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
                <span>Google로 계속하기</span>
              </div>
            </button>
          </div>

          {/* 로딩 상태 표시 */}
          {isLoading && (
            <div className="mt-4 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-600">로그인 중...</span>
            </div>
          )}

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center bg-white px-2 text-xs text-gray-500">또는</div>
          </div>

          {/* 약관 */}
          <p className="text-center text-xs text-gray-500">
            로그인 시{" "}
            <a href="#" className="font-medium text-gray-600 underline hover:text-gray-800">
              이용약관 및 개인정보처리방침
            </a>
            에 동의합니다
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
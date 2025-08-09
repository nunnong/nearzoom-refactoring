"use client"

import type { JSX } from "react"
import KakaoLoginButton from "./KakaoLoginButton"
import GoogleLoginButton from "./GoogleLoginButton"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onKakaoLogin: () => Promise<boolean>
  onGoogleLogin: () => Promise<boolean>
  isLoading?: boolean
}

const LoginModal = ({ isOpen, onClose, onKakaoLogin, onGoogleLogin, isLoading = false }: LoginModalProps): JSX.Element => {
  if (!isOpen) return <></>

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

          {/* 소셜 로그인 버튼 */}
          <div className="mt-6 flex flex-col gap-3">
            <KakaoLoginButton
              onClick={onKakaoLogin}
              disabled={isLoading}
            />
            <GoogleLoginButton
              onClick={onGoogleLogin}
              disabled={isLoading}
            />
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

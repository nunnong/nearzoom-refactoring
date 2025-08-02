'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState, type JSX } from 'react'
import KakaoLoginButton from '@/components/page/main/KakaoLoginButton'
import GoogleLoginButton from '@/components/page/main/GoogleLoginButton'

const LoginModal = (): JSX.Element => {
  const [isOpen, setIsOpen] = useState(true)

  const close = () => setIsOpen(false)

  return (
    <Dialog open={isOpen} onClose={close} className="relative z-10">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* 모달 컨테이너 */}
      <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-md">
          {/* 제목 */}
          <DialogTitle
            as="h3"
            className="text-center text-2xl font-bold text-black"
          >
            로그인
          </DialogTitle>
          <p className="mt-2 text-center text-sm text-gray-600">
            소셜 계정으로 간편하게 로그인하세요
          </p>

          {/* 소셜 로그인 버튼 */}
          <div className="mt-6 flex flex-col gap-3">
            <KakaoLoginButton onClick={() => console.log('카카오 로그인')} />
            <GoogleLoginButton onClick={() => console.log('구글 로그인')} />
          </div>

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center bg-white px-2 text-xs text-gray-500">
              또는
            </div>
          </div>

          {/* 약관 */}
          <p className="text-center text-xs text-gray-500">
            로그인 시{' '}
            <a
              href="#"
              className="font-medium text-gray-600 underline hover:text-gray-800"
            >
              이용약관 및 개인정보처리방침
            </a>
            에 동의합니다
          </p>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default LoginModal

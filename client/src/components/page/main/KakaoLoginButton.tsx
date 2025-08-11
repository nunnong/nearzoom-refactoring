'use client'

import type { JSX } from 'react'

import { cn } from '@/lib/utils'

interface KakaoLoginButtonProps {
  onClick: () => void
  className?: string
  disabled?: boolean
}

const KakaoLoginButton = ({ onClick, className, disabled = false }: KakaoLoginButtonProps): JSX.Element => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
        "bg-[#FEE500] text-[#191919] hover:bg-[#FFEB3B] disabled:cursor-not-allowed disabled:opacity-50",
        "border border-[#FEE500] hover:border-[#FFEB3B]",
        "focus:ring-2 focus:ring-[#FEE500] focus:ring-offset-2 focus:outline-none",
        className,
      )}
    >
      {/* 카카오 로고 SVG */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9 1.5C4.85775 1.5 1.5 4.41075 1.5 8.025C1.5 10.2473 2.60775 12.2355 4.37775 13.4348L3.6045 16.047C3.54225 16.2323 3.75 16.38 3.91125 16.2668L7.26225 14.3348C7.8285 14.424 8.409 14.4705 9 14.4705C13.1423 14.4705 16.5 11.5598 16.5 7.9455C16.5 4.33125 13.1423 1.42125 9 1.42125V1.5Z"
          fill="#191919"
        />
      </svg>
      카카오로 로그인
    </button>
  )
}

export default KakaoLoginButton

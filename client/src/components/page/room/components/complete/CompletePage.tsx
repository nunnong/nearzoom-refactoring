'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CompletePageProps {
  className?: string
}

export default function CompletePage({ className }: CompletePageProps) {
  return (
    <div className={cn(
      'flex flex-1 flex-col gap-4',
      'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
      'p-4 md:p-6 lg:p-8',
      'items-center justify-center',
      className
    )}>
      {/* 완료 카드 */}
      <div className="w-full max-w-lg mx-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* 완료 아이콘 */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <svg 
                className="w-10 h-10 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>

          {/* 완료 메시지 */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🎉 모두 완료되었습니다!
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              모든 사진의 배경 편집이 성공적으로 완료되었습니다.<br />
              마이페이지에서 결과를 확인해보세요.
            </p>
          </div>

          {/* 마이페이지 버튼 */}
          <div className="flex justify-center">
            <Link 
              href="/myroom"
              className={cn(
                'inline-flex items-center justify-center',
                'px-10 py-4 rounded-xl',
                'bg-gradient-to-r from-blue-600 to-purple-600',
                'text-white font-bold text-lg',
                'hover:from-blue-700 hover:to-purple-700',
                'transform hover:scale-105 transition-all duration-300',
                'shadow-xl hover:shadow-2xl',
                'focus:outline-none focus:ring-4 focus:ring-blue-500/50',
                'min-w-[200px]'
              )}
            >
              <svg 
                className="w-6 h-6 mr-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
              마이페이지로 이동
            </Link>
          </div>

          {/* 부가 정보 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              처리된 사진들이 마이페이지에 저장되었습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
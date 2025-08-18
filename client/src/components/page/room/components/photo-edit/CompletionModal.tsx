'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CompletionModalProps {
  isOpen: boolean
  className?: string
}

export default function CompletionModal({ 
  isOpen, 
  className 
}: CompletionModalProps) {
  if (!isOpen) return null

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-black/50 backdrop-blur-sm',
      className
    )}>
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-100">
          {/* 완료 아이콘 */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>

          {/* 완료 메시지 */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              모두 완료되었습니다!
            </h2>
            <p className="text-gray-600">
              모든 사진의 배경 편집이 완료되었습니다.
            </p>
          </div>

          {/* 마이페이지 버튼 */}
          <div className="flex justify-center">
            <Link 
              href="/myroom"
              className={cn(
                'inline-flex items-center justify-center',
                'px-8 py-3 rounded-xl',
                'bg-gradient-to-r from-blue-600 to-purple-600',
                'text-white font-semibold',
                'hover:from-blue-700 hover:to-purple-700',
                'transform hover:scale-105 transition-all duration-200',
                'shadow-lg hover:shadow-xl',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              )}
            >
              <svg 
                className="w-5 h-5 mr-2" 
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
        </div>
      </div>
    </div>
  )
}
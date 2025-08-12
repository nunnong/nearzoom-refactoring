'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/types/auth'
import HomeButton from '@/components/page/myroom/HomeButton'
import LogoutButton from '@/components/page/myroom/LogoutButton'
import MainNavigation from './MainNavigation'

interface EnhancedHeaderProps {
  title?: string
  userProfile?: User | null
  onMenuToggle?: () => void
  showNavigation?: boolean
  children?: React.ReactNode
}

const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  title,
  userProfile,
  onMenuToggle,
  showNavigation = true,
  children,
}) => {
  const router = useRouter()

  const handleMyDiaryClick = () => {
    router.push('/')
  }

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {/* MyDiary 브랜드 - 왼쪽 상단 */}
          <div 
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleMyDiaryClick}
          >
            <span className="text-xl font-semibold text-blue-600">📖 MyDiary</span>
          </div>

          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Toggle sidebar"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          
          {title && (
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          )}
          
          {children}
        </div>

        {/* 중앙 네비게이션 */}
        {showNavigation && (
          <div className="hidden lg:block">
            <MainNavigation variant="header" />
          </div>
        )}

        {/* 우측 버튼들 */}
        <div className="flex items-center space-x-3">
          <HomeButton />
          <LogoutButton />
        </div>
      </div>

      {/* 모바일 네비게이션 */}
      {showNavigation && (
        <div className="border-t bg-gray-50 px-4 py-2 lg:hidden">
          <MainNavigation variant="header" className="justify-center" />
        </div>
      )}
    </header>
  )
}

export default EnhancedHeader
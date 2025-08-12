'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import ExploreRandom from '@/components/page/explore/ExploreRandom'
import { useRouter } from 'next/navigation'
import { 
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon
} from '@heroicons/react/24/solid'

const ExplorePage: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 🔥 요구사항대로 수정된 네비게이션 메뉴 항목들
  const navigationItems = [
    {
      name: 'Timeline',
      href: '/timeline',
      icon: HomeIcon, // 홈 아이콘으로 변경
      activeIcon: HomeSolidIcon,
      current: false,
      showLabel: false // 라벨 표시
    },
    {
      name: 'Explore',
      href: '/explore',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassSolidIcon,
      current: true, // 현재 페이지
      showLabel: false // 아이콘만 표시
    },
    {
      name: 'My Profile',
      href: '/my',
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      current: false,
      showLabel: false // 아이콘만 표시
    },
    {
      name: 'My Room',
      href: '/myroom', // URL 수정
      icon: CalendarIcon,
      activeIcon: CalendarSolidIcon,
      current: false,
      showLabel: true // 라벨 표시
    }
  ]

  // 네비게이션 핸들러
  const handleNavigation = (href: string) => {
    router.push(href)
    setIsMobileMenuOpen(false) // 모바일 메뉴 닫기
  }

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 경우
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-4">탐색하려면 로그인해 주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 네비게이션 헤더 */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* MyDiary 브랜드 - 메인페이지로 이동 */}
            <div className="flex items-center">
              <button
                onClick={() => handleNavigation('/')}
                className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                📖 MyDiary
              </button>
            </div>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.map((item) => {
                  const Icon = item.current ? item.activeIcon : item.icon
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title={item.name} // 툴팁 추가
                    >
                      <Icon className="h-5 w-5" />
                      {/* showLabel이 true인 경우만 라벨 표시 */}
                      {item.showLabel && <span>{item.name}</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 사용자 정보 (데스크톱) */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img
                  src={user.profileImage || `/api/placeholder/40/40?seed=${user.id}`}
                  alt={user.name || 'User'}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {user.name || 'User'}
                </span>
              </div>
            </div>

            {/* 모바일 메뉴 버튼 */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 🔥 모바일 네비게이션 메뉴 */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
              {/* 사용자 정보 */}
              <div className="flex items-center space-x-3 px-3 py-2 mb-3">
                <img
                  src={user.profileImage || `/api/placeholder/40/40?seed=${user.id}`}
                  alt={user.name || 'User'}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {user.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.email || 'user@example.com'}
                  </div>
                </div>
              </div>

              {/* 네비게이션 항목들 - 모바일에서는 모든 라벨 표시 */}
              {navigationItems.map((item) => {
                const Icon = item.current ? item.activeIcon : item.icon
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 ${
                      item.current
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 🔥 메인 컨텐츠 */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ExploreRandom />
        </div>
      </main>

      {/* 🔥 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className={`grid grid-cols-${navigationItems.length} py-2`}>
          {navigationItems.map((item) => {
            const Icon = item.current ? item.activeIcon : item.icon
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center py-2 px-1 ${
                  item.current
                    ? 'text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 🔥 모바일 하단 네비게이션 공간 확보 */}
      <div className="md:hidden h-20"></div>
    </div>
  )
}

export default ExplorePage
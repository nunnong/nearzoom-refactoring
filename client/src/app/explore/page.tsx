// src/app/explore/page.tsx - Masonry 그리드 적용

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon
} from '@heroicons/react/24/solid'

// 🔥 Masonry 그리드 탐색 컴포넌트 import (InfiniteScrollTimeline 대신)
import ExploreRandom from '@/components/page/explore/ExploreRandom'

import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', className = '', text }: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string;
  text?: string;
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

// ============================================================================
// 🔥 백엔드 연동 타입 정의
// ============================================================================

interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

interface BackendUserInfo {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
}

// ============================================================================
// 🔥 백엔드 API 함수들
// ============================================================================

const exploreAPI = {
  getCurrentUser: async (): Promise<BackendUserInfo> => {
    const endpoints = ['/users/me', '/users/profile', '/auth/me'];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 사용자 정보 조회: ${endpoint}`);
        
        const response = await api.get<ApiResponse<BackendUserInfo>>(endpoint);
        
        if (response.data.error || !response.data.data) {
          continue;
        }
        
        console.log(`✅ 사용자 정보 조회 성공: ${endpoint}`, response.data.data);
        return response.data.data;
        
      } catch (error) {
        console.warn(`❌ ${endpoint} 실패:`, error);
        continue;
      }
    }

    throw new Error('사용자 정보를 가져올 수 없습니다.');
  }
};

// ============================================================================
// ExplorePage 컴포넌트
// ============================================================================

const ExplorePage: React.FC = () => {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore()

  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [currentUserInfo, setCurrentUserInfo] = useState<BackendUserInfo | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // ============================================================================
  // 🔥 현재 사용자 정보 로드
  // ============================================================================

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const userInfo = await exploreAPI.getCurrentUser();
        setCurrentUserInfo(userInfo);
      } catch (error) {
        console.warn('현재 사용자 정보 로드 실패:', error);
        // Fallback: authUser 정보 사용
        if (user) {
          setCurrentUserInfo({
            userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
            accountName: (user as any)?.accountName || user.email?.split('@')[0] || 'user',
            userName: user.name || user.email || 'User',
            userEmail: user.email || 'user@example.com',
            profileImage: (user as any)?.profileImage,
          });
        }
      }
    };

    loadCurrentUser();
  }, [isAuthenticated, user]);

  // ============================================================================
  // 🔥 통일된 네비게이션 설정
  // ============================================================================

  const navigationItems = [
    {
      name: 'Timeline',
      href: '/timeline',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon,
      current: false,
      showLabel: false
    },
    {
      name: 'Explore',
      href: '/explore',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassSolidIcon,
      current: true, // 현재 페이지
      showLabel: false
    },
    {
      name: 'My Profile',
      href: '/my',
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      current: false,
      showLabel: false
    },
    {
      name: 'My Room',
      href: '/myroom',
      icon: CalendarIcon,
      activeIcon: CalendarSolidIcon,
      current: false,
      showLabel: false
    }
  ];

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // 사용자 정보 (백엔드 우선, fallback으로 auth 사용)
  const displayUser = currentUserInfo || (user ? {
    userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
    accountName: (user as any)?.accountName || user.email?.split('@')[0] || 'user',
    userName: user.name || user.email || 'User',
    userEmail: user.email || 'user@example.com',
    profileImage: (user as any)?.profileImage,
  } : null);

  // ============================================================================
  // 렌더링 조건부 처리
  // ============================================================================

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="lg" 
          text="인증 확인 중..."
        />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">탐색을 하려면 로그인해 주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 통일된 네비게이션 헤더 */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 브랜드 - 로고 클릭 시 / 로 이동 */}
            <div className="flex items-center">
              <button
                onClick={handleLogoClick}
                className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                📖 NearZoom
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
                      title={item.name}
                    >
                      <Icon className="h-5 w-5" />
                      {item.showLabel && <span>{item.name}</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 사용자 정보 & 설정 (데스크톱) */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => router.push('/profile')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="프로필 설정"
              >
                <CogIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <img
                  src={displayUser?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=32&background=random`}
                  alt={displayUser?.userName || 'User'}
                  className="h-8 w-8 rounded-full ring-2 ring-gray-100"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=32&background=random`;
                  }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {displayUser?.userName || 'User'}
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
                  src={displayUser?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=40&background=random`}
                  alt={displayUser?.userName || 'User'}
                  className="h-10 w-10 rounded-full ring-2 ring-gray-100"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=40&background=random`;
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {displayUser?.userName || 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    @{displayUser?.accountName || 'user'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    router.push('/profile');
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <CogIcon className="h-5 w-5" />
                </button>
              </div>

              {/* 네비게이션 항목들 */}
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

              {/* 홈으로 가기 버튼 추가 */}
              <button
                onClick={handleLogoClick}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <HomeIcon className="h-5 w-5" />
                <span>Home</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* 🔥 메인 컨텐츠 - Masonry 그리드로 변경 */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 🔥 ExploreRandom 컴포넌트 - Instagram 스타일 Masonry 그리드 */}
          <ExploreRandom />
        </div>
      </main>

      {/* 🔥 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 py-2">
          {navigationItems.map((item) => {
            const Icon = item.current ? item.activeIcon : item.icon
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center py-2 px-1 transition-colors ${
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
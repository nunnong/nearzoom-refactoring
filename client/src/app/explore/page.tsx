// src/app/explore/page.tsx - 백엔드 연동 완료

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import InfiniteScrollTimeline from '@/components/page/timeline/InfiniteScrollTimeline'
import { useRouter } from 'next/navigation'
import {
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon,
} from '@heroicons/react/24/solid'
import axios from 'axios'

// ============================================================================
// 백엔드 연동 설정
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 인증 토큰 인터셉터
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ============================================================================
// 백엔드 연동 타입 정의
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 백엔드 사용자 정보
interface BackendUserInfo {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const exploreAPI = {
  // 🔥 GET /users/me - 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<BackendUserInfo> => {
    try {
      const response = await api.get<ApiResponse<BackendUserInfo>>('/users/me');
      
      if (response.data.error) {
        throw new Error(response.data.message || '사용자 정보를 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('사용자 데이터가 없습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      // fallback: /auth/me 시도
      try {
        const fallbackResponse = await api.get<ApiResponse<BackendUserInfo>>('/auth/me');
        if (!fallbackResponse.data.error && fallbackResponse.data.data) {
          return fallbackResponse.data.data;
        }
      } catch (fallbackError) {
        console.warn('Failed to get user info from both endpoints');
      }
      throw error;
    }
  },
};

// ============================================================================
// ExplorePage 컴포넌트
// ============================================================================

const ExplorePage: React.FC = () => {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // ============================================================================
  // 백엔드 연동 상태 관리
  // ============================================================================

  const [currentUser, setCurrentUser] = useState<BackendUserInfo | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)

  // ============================================================================
  // 백엔드 연동 - 사용자 정보 로드
  // ============================================================================

  const loadCurrentUser = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentUser(null);
      return;
    }

    setIsLoadingUser(true);
    setUserError(null);

    try {
      console.log('=== Explore 페이지 사용자 정보 로드 시작 ===');

      const userInfo = await exploreAPI.getCurrentUser();
      setCurrentUser(userInfo);
      
      console.log('✅ Explore 사용자 정보 로드 완료:', userInfo);
    } catch (error) {
      console.warn('❌ Explore 사용자 정보 로드 실패:', error);
      setUserError(error instanceof Error ? error.message : '사용자 정보를 불러올 수 없습니다.');
      
      // 에러 시 authUser 정보 사용 (fallback)
      if (authUser) {
        setCurrentUser({
          userId: typeof authUser.id === 'string' ? parseInt(authUser.id) : authUser.id,
          accountName: (authUser as any)?.accountName || authUser.email.split('@')[0],
          userName: authUser.name || authUser.email,
          userEmail: authUser.email,
          profileImage: (authUser as any)?.profileImage,
        });
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, authUser]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentUser();
    } else {
      setCurrentUser(null);
      setUserError(null);
    }
  }, [isAuthenticated, loadCurrentUser]);

  // ============================================================================
  // 네비게이션 설정 (동적 프로필 링크)
  // ============================================================================

  const getNavigationItems = useCallback(() => {
    return [
      {
        name: 'Timeline',
        href: '/timeline',
        icon: HomeIcon,
        activeIcon: HomeSolidIcon,
        current: false,
        showLabel: true, // Timeline은 라벨 표시
      },
      {
        name: 'Explore',
        href: '/explore',
        icon: MagnifyingGlassIcon,
        activeIcon: MagnifyingGlassSolidIcon,
        current: true, // 현재 페이지
        showLabel: false, // 아이콘만 표시
      },
      {
        name: 'My Profile',
        href: currentUser 
          ? `/feeds/users/account/${currentUser.accountName}` 
          : '/profile',
        icon: UserIcon,
        activeIcon: UserSolidIcon,
        current: false,
        showLabel: false, // 아이콘만 표시
      },
      {
        name: 'My Room',
        href: '/myroom',
        icon: CalendarIcon,
        activeIcon: CalendarSolidIcon,
        current: false,
        showLabel: true, // 라벨 표시
      },
    ];
  }, [currentUser]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 네비게이션 핸들러
  const handleNavigation = useCallback((href: string) => {
    router.push(href)
    setIsMobileMenuOpen(false)
  }, [router]);

  // 모바일 메뉴 토글
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }, [isMobileMenuOpen]);

  // 사용자 정보 재시도
  const retryUserLoad = useCallback(() => {
    setUserError(null);
    loadCurrentUser();
  }, [loadCurrentUser]);

  // ============================================================================
  // 사용자 정보 결정
  // ============================================================================

  const displayUser = currentUser || (authUser ? {
    userId: typeof authUser.id === 'string' ? parseInt(authUser.id) : authUser.id,
    accountName: (authUser as any)?.accountName || authUser.email.split('@')[0],
    userName: authUser.name || authUser.email,
    userEmail: authUser.email,
    profileImage: (authUser as any)?.profileImage,
  } : null);

  // ============================================================================
  // 렌더링 조건
  // ============================================================================

  // 인증 로딩 상태
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 경우
  if (!isAuthenticated || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-700">
            로그인이 필요합니다
          </h2>
          <p className="mb-4 text-gray-500">탐색하려면 로그인해 주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  const navigationItems = getNavigationItems();

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 네비게이션 헤더 */}
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* MyDiary 브랜드 */}
            <div className="flex items-center">
              <button
                onClick={() => handleNavigation('/')}
                className="text-2xl font-bold text-blue-600 transition-colors hover:text-blue-700"
              >
                📖 MyDiary
              </button>
            </div>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.map(item => {
                  const Icon = item.current ? item.activeIcon : item.icon
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      disabled={item.name === 'My Profile' && isLoadingUser}
                      className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                      title={item.name}
                    >
                      <Icon className="h-5 w-5" />
                      {/* showLabel이 true인 경우만 라벨 표시 */}
                      {item.showLabel && <span>{item.name}</span>}
                      {/* 프로필 로딩 표시 */}
                      {item.name === 'My Profile' && isLoadingUser && (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin ml-1"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 사용자 정보 (데스크톱) */}
            <div className="hidden items-center space-x-4 md:flex">
              {displayUser ? (
                <div className="flex items-center space-x-3">
                  {/* 프로필 이미지 */}
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200">
                    {displayUser.profileImage ? (
                      <img
                        src={displayUser.profileImage}
                        alt={displayUser.userName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser.userName)}&size=32&background=random`;
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        {displayUser.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {displayUser.userName}
                    </div>
                    <div className="text-xs text-gray-500">
                      @{displayUser.accountName}
                    </div>
                  </div>
                </div>
              ) : isLoadingUser ? (
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-2 w-12 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ) : userError ? (
                <button
                  onClick={retryUserLoad}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                  title={userError}
                >
                  다시 시도
                </button>
              ) : null}
            </div>

            {/* 모바일 메뉴 버튼 */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-500"
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
            <div className="space-y-1 border-t border-gray-200 bg-gray-50 px-2 pt-2 pb-3 sm:px-3">
              {/* 사용자 정보 */}
              {displayUser && (
                <div className="mb-3 flex items-center space-x-3 px-3 py-2">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200">
                    {displayUser.profileImage ? (
                      <img
                        src={displayUser.profileImage}
                        alt={displayUser.userName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser.userName)}&size=40&background=random`;
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                        {displayUser.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {displayUser.userName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {displayUser.userEmail}
                    </div>
                  </div>
                </div>
              )}

              {/* 네비게이션 항목들 - 모바일에서는 모든 라벨 표시 */}
              {navigationItems.map(item => {
                const Icon = item.current ? item.activeIcon : item.icon
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    disabled={item.name === 'My Profile' && isLoadingUser}
                    className={`flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-base font-medium transition-colors disabled:opacity-50 ${
                      item.current
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    {item.name === 'My Profile' && isLoadingUser && (
                      <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin ml-auto"></div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 🔥 메인 컨텐츠 - InfiniteScrollTimeline 사용 */}
      <main className="pb-20 md:pb-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
          {/* 페이지 제목 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">탐색</h1>
            <p className="text-gray-600 mt-1">새로운 사람들과 콘텐츠를 발견해보세요</p>
          </div>

          {/* 🔥 백엔드 연동된 Timeline 컴포넌트 사용 */}
          <InfiniteScrollTimeline 
            type="explore"
            className="py-0"
          />
        </div>
      </main>

      {/* 🔥 모바일 하단 네비게이션 */}
      <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200 bg-white md:hidden">
        <div className="grid grid-cols-4 py-2">
          {navigationItems.map(item => {
            const Icon = item.current ? item.activeIcon : item.icon
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                disabled={item.name === 'My Profile' && isLoadingUser}
                className={`flex flex-col items-center px-1 py-2 disabled:opacity-50 ${
                  item.current
                    ? 'text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="mt-1 text-xs font-medium">{item.name}</span>
                {item.name === 'My Profile' && isLoadingUser && (
                  <div className="absolute top-1 right-1 w-2 h-2 border border-current border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 개발 모드에서 사용자 정보 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-20 left-4 md:bottom-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔧 Explore 페이지 상태</div>
          <div>인증됨: {isAuthenticated ? 'Yes' : 'No'}</div>
          <div>사용자 로딩: {isLoadingUser ? 'Yes' : 'No'}</div>
          <div>에러: {userError ? 'Yes' : 'No'}</div>
          {displayUser && (
            <div className="mt-1">
              <div>사용자: {displayUser.accountName}</div>
              <div>이름: {displayUser.userName}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ExplorePage
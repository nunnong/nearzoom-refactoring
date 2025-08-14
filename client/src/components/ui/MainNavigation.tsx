// src/components/ui/MainNavigation.tsx - 백엔드 연동 완료

'use client'

import { 
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  BellIcon,
} from '@heroicons/react/24/outline'
import { 
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  BellIcon as BellSolidIcon,
} from '@heroicons/react/24/solid'
import { useRouter, usePathname } from 'next/navigation'
import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
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

// 백엔드 사용자 정보 (간소화된 버전)
interface BackendUserInfo {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
}

// 알림 관련 타입 (향후 확장용)
interface NotificationData {
  unreadCount: number;
}

// 네비게이션 아이템 인터페이스
interface NavigationItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  solidIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  badge?: string | number
  showLabel?: boolean
  requireAuth?: boolean  // 🔥 인증 필요 여부
  isDynamic?: boolean    // 🔥 동적 href (사용자 정보 필요)
}

interface MainNavigationProps {
  className?: string
  variant?: 'header' | 'sidebar'
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const navigationAPI = {
  // 🔥 GET /users/me - 현재 사용자 정보 조회 (프로필 링크용)
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

  // 🔥 GET /notifications/unread-count - 읽지 않은 알림 수 (향후 확장용)
  getUnreadNotificationCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<NotificationData>>('/notifications/unread-count');
      
      if (response.data.error) {
        return 0;
      }
      
      return response.data.data?.unreadCount || 0;
    } catch (error) {
      console.warn('Failed to get notification count:', error);
      return 0;
    }
  },
};

// ============================================================================
// MainNavigation 컴포넌트
// ============================================================================

const MainNavigation: React.FC<MainNavigationProps> = ({
  className = '',
  variant = 'header'
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user: authUser } = useAuthStore()

  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [currentUser, setCurrentUser] = useState<BackendUserInfo | null>(null)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoadingUser, setIsLoadingUser] = useState(false)

  // ============================================================================
  // 백엔드 연동 - 사용자 정보 로드
  // ============================================================================

  const loadCurrentUser = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentUser(null);
      return;
    }

    setIsLoadingUser(true);

    try {
      const userInfo = await navigationAPI.getCurrentUser();
      setCurrentUser(userInfo);
      
      console.log('✅ 네비게이션 사용자 정보 로드:', userInfo);
    } catch (error) {
      console.warn('Failed to load user info for navigation:', error);
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

  // 알림 수 로드 (향후 확장용)
  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await navigationAPI.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.warn('Failed to load notification count:', error);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentUser();
      loadUnreadCount();
    } else {
      setCurrentUser(null);
      setUnreadCount(0);
    }
  }, [isAuthenticated, loadCurrentUser, loadUnreadCount]);

  // ============================================================================
  // 동적 네비게이션 아이템 생성
  // ============================================================================

  const getNavigationItems = useCallback((): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: 'timeline',
        label: 'Timeline', 
        href: '/timeline',
        icon: HomeIcon,
        solidIcon: HomeSolidIcon,
        showLabel: true,
        requireAuth: false, // 로그인 없이도 접근 가능
      },
      {
        id: 'explore',
        label: 'Explore',
        href: '/explore',
        icon: MagnifyingGlassIcon,
        solidIcon: MagnifyingGlassSolidIcon,
        showLabel: false,
        requireAuth: false,
      },
    ];

    // 🔥 인증된 사용자만 접근 가능한 아이템들
    if (isAuthenticated) {
      const authenticatedItems: NavigationItem[] = [
        {
          id: 'profile',
          label: 'My Profile',
          href: currentUser 
            ? `/feeds/users/account/${currentUser.accountName}` 
            : '/profile',
          icon: UserIcon,
          solidIcon: UserSolidIcon,
          showLabel: false,
          requireAuth: true,
          isDynamic: true, // 사용자 정보에 따라 href 변경
        },
        {
          id: 'myroom',
          label: 'My Room',
          href: '/myroom',
          icon: CalendarIcon,
          solidIcon: CalendarSolidIcon,
          showLabel: true,
          requireAuth: true,
        },
      ];

      // 알림 기능 (향후 확장용 - 백엔드 지원 시 활성화)
      if (process.env.NODE_ENV === 'development') {
        authenticatedItems.push({
          id: 'notifications',
          label: 'Notifications',
          href: '/notifications',
          icon: BellIcon,
          solidIcon: BellSolidIcon,
          showLabel: false,
          requireAuth: true,
          badge: unreadCount > 0 ? unreadCount : undefined,
        });
      }

      return [...baseItems, ...authenticatedItems];
    }

    return baseItems;
  }, [isAuthenticated, currentUser, unreadCount]);

  // ============================================================================
  // 네비게이션 핸들러
  // ============================================================================

  const handleNavigate = useCallback((item: NavigationItem) => {
    // 🔥 인증이 필요한 페이지인데 로그인하지 않은 경우
    if (item.requireAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // 🔥 동적 href이지만 사용자 정보가 없는 경우 로딩 체크
    if (item.isDynamic && !currentUser && isLoadingUser) {
      console.warn('사용자 정보 로딩 중...');
      return;
    }

    router.push(item.href);
  }, [isAuthenticated, currentUser, isLoadingUser, router]);

  // ============================================================================
  // 활성 상태 체크
  // ============================================================================

  const isActive = useCallback((item: NavigationItem) => {
    if (item.id === 'profile' && currentUser) {
      // 프로필 페이지는 동적 URL 체크
      return pathname.startsWith(`/feeds/users/account/${currentUser.accountName}`) ||
             pathname === '/profile' ||
             pathname === '/my';
    }
    
    return pathname.startsWith(item.href) || 
           (item.href === '/my' && pathname === '/');
  }, [pathname, currentUser]);

  // ============================================================================
  // 네비게이션 아이템 생성
  // ============================================================================

  const navigationItems = getNavigationItems();

  // ============================================================================
  // 렌더링 - 헤더 버전
  // ============================================================================

  if (variant === 'header') {
    return (
      <nav className={`flex items-center space-x-1 ${className}`}>
        {navigationItems.map((item) => {
          const Icon = item.icon
          const SolidIcon = item.solidIcon
          const active = isActive(item)
          
          // 인증이 필요한 아이템인데 로그인하지 않은 경우 숨김 (선택적)
          if (item.requireAuth && !isAuthenticated && item.id !== 'profile') {
            return null;
          }
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item)}
              disabled={item.isDynamic && isLoadingUser}
              className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                active
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-label={`Navigate to ${item.label}`}
              title={item.label}
            >
              {/* 🔥 활성 상태에 따라 아이콘 변경 */}
              {active && SolidIcon ? (
                <SolidIcon className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              
              {/* showLabel이 true인 경우만 라벨 표시 */}
              {item.showLabel && (
                <span className="hidden md:block">{item.label}</span>
              )}
              
              {/* 🔥 배지 표시 (알림 수 등) */}
              {item.badge && (
                <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {item.badge}
                </span>
              )}
              
              {/* 로딩 상태 표시 */}
              {item.isDynamic && isLoadingUser && (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin ml-1"></div>
              )}
            </button>
          )
        })}
      </nav>
    )
  }

  // ============================================================================
  // 렌더링 - 사이드바 버전
  // ============================================================================

  return (
    <nav className={`space-y-1 ${className}`}>
      {navigationItems.map((item) => {
        const Icon = item.icon
        const SolidIcon = item.solidIcon
        const active = isActive(item)
        
        // 인증이 필요한 아이템인데 로그인하지 않은 경우 숨김
        if (item.requireAuth && !isAuthenticated && item.id !== 'profile') {
          return null;
        }
        
        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item)}
            disabled={item.isDynamic && isLoadingUser}
            className={`group flex w-full items-center rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
              active
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            aria-label={`Navigate to ${item.label}`}
          >
            {/* 🔥 활성 상태에 따라 아이콘 변경 */}
            {active && SolidIcon ? (
              <SolidIcon className={`mr-3 h-5 w-5 ${active ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
            ) : (
              <Icon className={`mr-3 h-5 w-5 ${active ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
            )}
            
            <span className="flex-1">{item.label}</span>
            
            {/* 🔥 배지 표시 */}
            {item.badge && (
              <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                {item.badge}
              </span>
            )}
            
            {/* 로딩 상태 표시 */}
            {item.isDynamic && isLoadingUser && (
              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin ml-2"></div>
            )}
          </button>
        )
      })}
      
      {/* 🔥 로그인하지 않은 경우 로그인 유도 */}
      {!isAuthenticated && (
        <div className="px-4 py-3 mt-4 border-t border-gray-200">
          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인
          </button>
        </div>
      )}
      
      {/* 개발 모드에서 사용자 정보 표시 */}
      {process.env.NODE_ENV === 'development' && isAuthenticated && (
        <div className="px-4 py-2 mt-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="font-medium">🔧 네비게이션 상태</div>
          {currentUser ? (
            <div className="mt-1">
              <div>User: {currentUser.accountName}</div>
              <div>Notifications: {unreadCount}</div>
            </div>
          ) : (
            <div className="mt-1">사용자 정보 로딩 중...</div>
          )}
        </div>
      )}
    </nav>
  )
}

export default MainNavigation
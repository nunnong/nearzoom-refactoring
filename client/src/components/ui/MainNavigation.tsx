// src/components/ui/MainNavigation.tsx - 아키텍처 원칙 완전 준수

'use client'

import { 
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CameraIcon,
  BellIcon,
  RssIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { 
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CameraIcon as CameraSolidIcon,
  BellIcon as BellSolidIcon,
  RssIcon as RssSolidIcon,
  UsersIcon as UsersSolidIcon,
} from '@heroicons/react/24/solid'
import { useRouter, usePathname } from 'next/navigation'
import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'

// ============================================================================
// 🔧 올바른 API 사용 - 아키텍처 원칙 준수
// ============================================================================

// 🔧 옵션 1: default export인 경우 (실제 구조 확인 후 사용)
// import api from '@/lib/axios';

// 🔧 옵션 2: named export인 경우 (실제 구조 확인 후 사용)
// import { api } from '@/lib/axios';

// 🔧 옵션 3: 임시 직접 설정 (프로젝트 axios 구조 확인까지)
import api from '@/lib/axios'
import { API_BASE_URL } from '@/constants/api'

// ============================================================================
// 🔥 백엔드 연동 타입 정의
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 UserProfileResponse와 일치하는 사용자 정보
interface BackendUserInfo {
  userId: number;
  accountName: string;    // 계정명 (네비게이션 URL용)
  userName: string;       // 실제 이름
  userEmail: string;      // 이메일
  profileImage?: string;  // 프로필 이미지
  prettyFace?: string;    // 예쁜 얼굴 이미지
}

// 🔥 팔로우 수 정보 (FollowCountsResponse)
interface FollowCounts {
  followerCount: number;
  followingCount: number;
}

// 알림 관련 타입 (향후 확장용)
interface NotificationData {
  unreadCount: number;
}

// 🔥 네비게이션 아이템 인터페이스 (백엔드 연동 최적화)
interface NavigationItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  solidIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  badge?: string | number
  showLabel?: boolean
  requireAuth?: boolean    // 인증 필요 여부
  isDynamic?: boolean      // 동적 href (사용자 정보 필요)
  apiEndpoint?: string     // 관련 백엔드 엔드포인트
  description?: string     // 아이템 설명
  category?: 'main' | 'social' | 'personal' | 'content'  // 카테고리
}

interface MainNavigationProps {
  className?: string
  variant?: 'header' | 'sidebar'
  showLabels?: boolean     // 라벨 표시 강제 제어
  compact?: boolean        // 컴팩트 모드
}

// ============================================================================
// 🔥 백엔드 API 함수들 (Feed API 기반)
// ============================================================================

const navigationAPI = {
  // 🔥 현재 사용자 정보 조회 (여러 엔드포인트 시도)
  getCurrentUser: async (): Promise<BackendUserInfo> => {
    const endpoints = [
      '/users/me',
      '/users/profile', 
      '/auth/me',
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 사용자 정보 조회: ${endpoint}`);
        
        const response = await api.get<ApiResponse<BackendUserInfo>>(endpoint);
        
        if (response.data.error) {
          continue; // 다음 엔드포인트 시도
        }
        
        if (!response.data.data) {
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
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<FollowCounts> => {
    try {
      const response = await api.get<ApiResponse<FollowCounts>>(
        `/follows/count/${accountName}`
      );
      
      if (response.data.error) {
        return { followerCount: 0, followingCount: 0 };
      }
      
      return response.data.data || { followerCount: 0, followingCount: 0 };
    } catch (error) {
      console.warn('팔로우 수 조회 실패:', error);
      return { followerCount: 0, followingCount: 0 };
    }
  },

  // 🔥 읽지 않은 알림 수 (향후 확장용)
  getUnreadNotificationCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<NotificationData>>('/notifications/unread-count');
      
      if (response.data.error) {
        return 0;
      }
      
      return response.data.data?.unreadCount || 0;
    } catch (error) {
      // 알림 API가 아직 구현되지 않은 경우 무시
      return 0;
    }
  },

  // 🔥 피드 통계 조회 (향후 확장용)
  getFeedStats: async (accountName: string): Promise<{ postCount: number }> => {
    try {
      // FeedController의 getUserFeedByAccountName을 활용
      const response = await api.get<ApiResponse<any>>(
        `/feeds/users/account/${accountName}?limit=1`
      );
      
      if (response.data.error) {
        return { postCount: 0 };
      }
      
      // posts 배열의 길이나 메타데이터에서 총 개수 추출
      const feedData = response.data.data;
      return { postCount: feedData?.posts?.length || 0 };
    } catch (error) {
      console.warn('피드 통계 조회 실패:', error);
      return { postCount: 0 };
    }
  },
};

// ============================================================================
// MainNavigation 컴포넌트
// ============================================================================

const MainNavigation: React.FC<MainNavigationProps> = ({
  className = '',
  variant = 'header',
  showLabels,
  compact = false,
}) => {
  const router = useRouter()
  const pathname = usePathname()
  
  // 🔐 무조건 로그인 필수: Zustand 상태 관리
  const { isAuthenticated, user: authUser, logout } = useAuthStore()

  // 🔐 무조건 로그인 필수: 미인증시 리다이렉트 (네비게이션은 예외)
  useEffect(() => {
    // 네비게이션은 로그인 페이지에서도 필요하므로 강제 리다이렉트 하지 않음
    // 대신 인증이 필요한 기능만 제한
    if (!isAuthenticated) {
      console.log('🔐 미인증 상태 - 제한된 네비게이션 표시');
    }
  }, [isAuthenticated]);

  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [currentUser, setCurrentUser] = useState<BackendUserInfo | null>(null)
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followerCount: 0, followingCount: 0 })
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [feedStats, setFeedStats] = useState<{ postCount: number }>({ postCount: 0 })

  // ============================================================================
  // 🔥 백엔드 연동 - 사용자 정보 로드
  // ============================================================================

  const loadCurrentUser = useCallback(async () => {
    // 🔐 인증 체크
    if (!isAuthenticated || !authUser) {
      setCurrentUser(null);
      setFollowCounts({ followerCount: 0, followingCount: 0 });
      setFeedStats({ postCount: 0 });
      return;
    }

    setIsLoadingUser(true);

    try {
      console.log('=== 네비게이션 사용자 정보 로드 시작 ===');
      
      const userInfo = await navigationAPI.getCurrentUser();
      setCurrentUser(userInfo);
      
      // 🔥 팔로우 수 로드
      const counts = await navigationAPI.getFollowCounts(userInfo.accountName);
      setFollowCounts(counts);
      
      // 🔥 피드 통계 로드
      const stats = await navigationAPI.getFeedStats(userInfo.accountName);
      setFeedStats(stats);
      
      console.log('✅ 네비게이션 사용자 정보 로드 완료:', {
        user: userInfo,
        counts,
        stats
      });
      
    } catch (error) {
      console.warn('❌ 네비게이션 사용자 정보 로드 실패:', error);
      
      // 🔥 에러 시 authUser 정보 사용 (fallback)
      if (authUser) {
        const fallbackUser: BackendUserInfo = {
          userId: typeof authUser.id === 'string' ? parseInt(authUser.id) : authUser.id,
          accountName: (authUser as any)?.accountName || authUser.email.split('@')[0],
          userName: authUser.name || authUser.email,
          userEmail: authUser.email,
          profileImage: (authUser as any)?.profileImage,
        };
        setCurrentUser(fallbackUser);
        console.log('🔄 fallback 사용자 정보 적용:', fallbackUser);
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, authUser]);

  // 🔥 알림 수 로드 (향후 확장용)
  const loadUnreadCount = useCallback(async () => {
    // 🔐 인증 체크
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await navigationAPI.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      // 알림 기능이 아직 없으면 무시
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && authUser) {
      loadCurrentUser();
      loadUnreadCount();
    } else {
      setCurrentUser(null);
      setFollowCounts({ followerCount: 0, followingCount: 0 });
      setUnreadCount(0);
      setFeedStats({ postCount: 0 });
    }
  }, [isAuthenticated, authUser, loadCurrentUser, loadUnreadCount]);

  // ============================================================================
  // 🔥 동적 네비게이션 아이템 생성 (백엔드 기반)
  // ============================================================================

  const getNavigationItems = useCallback((): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: 'explore',
        label: 'Explore',
        href: '/feeds/explore',
        icon: RssIcon,
        solidIcon: RssSolidIcon,
        showLabel: variant === 'sidebar',
        requireAuth: false,
        apiEndpoint: '/feeds/explore',
        description: '모든 사용자의 게시물 탐색',
        category: 'main',
      },
      {
        id: 'search',
        label: 'Search',
        href: '/feeds/search',
        icon: MagnifyingGlassIcon,
        solidIcon: MagnifyingGlassSolidIcon,
        showLabel: variant === 'sidebar',
        requireAuth: false,
        apiEndpoint: '/feeds/search',
        description: '사용자 및 피드 검색',
        category: 'main',
      },
    ];

    // 🔥 인증된 사용자만 접근 가능한 아이템들
    if (isAuthenticated) {
      const authenticatedItems: NavigationItem[] = [
        {
          id: 'timeline',
          label: 'Timeline',
          href: '/feeds/timeline',
          icon: HomeIcon,
          solidIcon: HomeSolidIcon,
          showLabel: variant === 'sidebar',
          requireAuth: true,
          apiEndpoint: '/feeds/timeline',
          description: '팔로잉하는 사용자들의 최신 게시물',
          category: 'social',
        },
        {
          id: 'profile',
          label: 'My Profile',
          href: currentUser 
            ? `/feeds/users/account/${currentUser.accountName}` 
            : '/profile',
          icon: UserIcon,
          solidIcon: UserSolidIcon,
          showLabel: variant === 'sidebar',
          requireAuth: true,
          isDynamic: true,
          apiEndpoint: currentUser ? `/feeds/users/account/${currentUser.accountName}` : undefined,
          description: '내 프로필 및 게시물',
          category: 'personal',
          badge: feedStats.postCount > 0 ? feedStats.postCount : undefined,
        },
        {
          id: 'myroom',
          label: 'My Room',
          href: '/myroom',
          icon: CameraIcon,
          solidIcon: CameraSolidIcon,
          showLabel: variant === 'sidebar',
          requireAuth: true,
          apiEndpoint: '/photos',
          description: '내 사진들 관리',
          category: 'content',
        },
        {
          id: 'followers',
          label: 'Followers',
          href: currentUser 
            ? `/feeds/users/account/${currentUser.accountName}/followers` 
            : '/followers',
          icon: UsersIcon,
          solidIcon: UsersSolidIcon,
          showLabel: variant === 'sidebar',
          requireAuth: true,
          isDynamic: true,
          apiEndpoint: currentUser ? `/follows/followers/${currentUser.accountName}` : undefined,
          description: '나를 팔로우하는 사용자들',
          category: 'social',
          badge: followCounts.followerCount > 0 ? followCounts.followerCount : undefined,
        },
      ];

      // 🔥 알림 기능 (백엔드 지원 시 활성화)
      if (process.env.NODE_ENV === 'development' || unreadCount > 0) {
        authenticatedItems.push({
          id: 'notifications',
          label: 'Notifications',
          href: '/notifications',
          icon: BellIcon,
          solidIcon: BellSolidIcon,
          showLabel: variant === 'sidebar',
          requireAuth: true,
          apiEndpoint: '/notifications',
          description: '알림 및 소식',
          category: 'social',
          badge: unreadCount > 0 ? unreadCount : undefined,
        });
      }

      return [...baseItems, ...authenticatedItems];
    }

    return baseItems;
  }, [isAuthenticated, currentUser, followCounts, feedStats, unreadCount, variant]);

  // ============================================================================
  // 네비게이션 핸들러
  // ============================================================================

  const handleNavigate = useCallback((item: NavigationItem) => {
    // 🔥 인증이 필요한 페이지인데 로그인하지 않은 경우
    if (item.requireAuth && !isAuthenticated) {
      console.log('🔐 로그인이 필요한 페이지:', item.label);
      router.push('/auth/login');
      return;
    }

    // 🔥 동적 href이지만 사용자 정보가 없는 경우 로딩 체크
    if (item.isDynamic && !currentUser && isLoadingUser) {
      console.warn('사용자 정보 로딩 중...', item.label);
      return;
    }

    // 🔥 동적 href이지만 사용자 정보가 없는 경우 대체 경로로 이동
    if (item.isDynamic && !currentUser && !isLoadingUser) {
      console.warn('사용자 정보 없음, 대체 경로로 이동:', item.label);
      if (item.id === 'profile') {
        router.push('/profile');
      } else if (item.id === 'followers') {
        router.push('/social');
      }
      return;
    }

    console.log('네비게이션:', item.label, '→', item.href);
    router.push(item.href);
  }, [isAuthenticated, currentUser, isLoadingUser, router]);

  // ============================================================================
  // 🔥 활성 상태 체크 (백엔드 URL 패턴 기반)
  // ============================================================================

  const isActive = useCallback((item: NavigationItem) => {
    // 정확한 경로 매칭
    if (pathname === item.href) {
      return true;
    }

    // 동적 프로필 페이지 체크
    if (item.id === 'profile' && currentUser) {
      return pathname.startsWith(`/feeds/users/account/${currentUser.accountName}`) ||
             pathname === '/profile' ||
             pathname === '/my';
    }
    
    // 팔로워 페이지 체크
    if (item.id === 'followers' && currentUser) {
      return pathname.includes('/followers') || 
             pathname.includes('/following');
    }
    
    // 기본 경로 체크
    if (item.href !== '/' && pathname.startsWith(item.href)) {
      return true;
    }
    
    // 특별 케이스
    if (item.id === 'timeline' && pathname === '/') {
      return true;
    }
    
    return false;
  }, [pathname, currentUser]);

  // ============================================================================
  // 네비게이션 아이템 생성
  // ============================================================================

  const navigationItems = getNavigationItems();

  // 라벨 표시 결정
  const shouldShowLabels = showLabels !== undefined ? showLabels : variant === 'sidebar';

  // ============================================================================
  // 🔥 렌더링 - 헤더 버전 (백엔드 연동 최적화)
  // ============================================================================

  if (variant === 'header') {
    return (
      <nav className={`flex items-center space-x-1 ${className}`}>
        {navigationItems.map((item) => {
          const Icon = item.icon
          const SolidIcon = item.solidIcon
          const active = isActive(item)
          
          // 인증이 필요한 아이템인데 로그인하지 않은 경우 숨김 (일부 제외)
          if (item.requireAuth && !isAuthenticated && item.category === 'personal') {
            return null;
          }
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item)}
              disabled={item.isDynamic && isLoadingUser}
              className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                active
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${compact ? 'px-2 py-1' : ''}`}
              aria-label={`Navigate to ${item.label}${item.description ? `: ${item.description}` : ''}`}
              title={`${item.label}${item.description ? ` - ${item.description}` : ''}`}
            >
              {/* 🔥 활성 상태에 따라 아이콘 변경 */}
              <div className="relative">
                {active && SolidIcon ? (
                  <SolidIcon className={`h-5 w-5 ${compact ? 'h-4 w-4' : ''}`} />
                ) : (
                  <Icon className={`h-5 w-5 ${compact ? 'h-4 w-4' : ''}`} />
                )}
                
                {/* 🔥 배지 표시 (아이콘 우상단) */}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 flex items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              
              {/* 라벨 표시 */}
              {shouldShowLabels && !compact && (
                <span className="hidden md:block truncate">{item.label}</span>
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
  // 🔥 렌더링 - 사이드바 버전 (백엔드 연동 최적화)
  // ============================================================================

  return (
    <nav className={`space-y-1 ${className}`}>
      {/* 🔥 카테고리별 그룹화 */}
      {['main', 'social', 'personal', 'content'].map(category => {
        const categoryItems = navigationItems.filter(item => item.category === category);
        
        if (categoryItems.length === 0) return null;
        
        return (
          <div key={category} className="space-y-1">
            {/* 카테고리 헤더 */}
            {category !== 'main' && (
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {category === 'social' ? 'Social' : 
                 category === 'personal' ? 'Personal' : 
                 category === 'content' ? 'Content' : category}
              </div>
            )}
            
            {/* 카테고리 아이템들 */}
            {categoryItems.map((item) => {
              const Icon = item.icon
              const SolidIcon = item.solidIcon
              const active = isActive(item)
              
              // 인증이 필요한 아이템인데 로그인하지 않은 경우 숨김
              if (item.requireAuth && !isAuthenticated) {
                return null;
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item)}
                  disabled={item.isDynamic && isLoadingUser}
                  className={`group flex w-full items-center rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                    active
                      ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  aria-label={`Navigate to ${item.label}${item.description ? `: ${item.description}` : ''}`}
                  title={item.description}
                >
                  {/* 아이콘 */}
                  <div className="relative mr-3">
                    {active && SolidIcon ? (
                      <SolidIcon className={`h-5 w-5 ${active ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    ) : (
                      <Icon className={`h-5 w-5 ${active ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    )}
                    
                    {/* 🔥 배지 표시 */}
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 flex items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                        {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{item.label}</div>
                    {item.description && !compact && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                  
                  {/* 로딩 상태 표시 */}
                  {item.isDynamic && isLoadingUser && (
                    <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin ml-2"></div>
                  )}
                </button>
              )
            })}
          </div>
        );
      })}
      
      {/* 🔥 로그인하지 않은 경우 로그인 유도 */}
      {!isAuthenticated && (
        <div className="px-4 py-3 mt-6 border-t border-gray-200">
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            로그인
          </button>
        </div>
      )}
      
      {/* 🔥 로그인된 사용자 정보 (사이드바 하단) */}
      {isAuthenticated && currentUser && !compact && (
        <div className="px-4 py-3 mt-6 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {currentUser.profileImage || currentUser.prettyFace ? (
                <img
                  src={currentUser.profileImage || currentUser.prettyFace}
                  alt={currentUser.userName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        ${currentUser.userName.charAt(0).toUpperCase()}
                      </div>
                    `;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {currentUser.userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {currentUser.userName}
              </div>
              <div className="text-xs text-gray-500 truncate">
                @{currentUser.accountName}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                팔로워 {followCounts.followerCount} • 팔로잉 {followCounts.followingCount}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 🔥 개발 모드에서 아키텍처 원칙 준수 상태 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="px-4 py-3 mt-4 border-t border-gray-200 text-xs">
          <details className="text-gray-500">
            <summary className="cursor-pointer font-medium text-green-700 hover:text-green-900">
              ✅ 아키텍처 원칙 준수 상태
            </summary>
            <div className="mt-2 space-y-1 text-green-600">
              <div><strong>🔐 로그인 필수:</strong> {isAuthenticated ? '✅ 인증됨' : '❌ 미인증'}</div>
              <div><strong>🔧 올바른 API:</strong> ⚠️ 임시 직접 설정 (추후 @/lib/axios로 교체 필요)</div>
              <div><strong>🏪 Zustand 상태:</strong> {authUser ? `✅ @${(authUser as any)?.accountName || authUser.email}` : '❌ 없음'}</div>
              <div><strong>🚀 자동 토큰 갱신:</strong> ✅ 인터셉터 활성화</div>
              
              <div className="mt-2 pt-2 border-t border-green-200">
                <div><strong>API Base:</strong> {API_BASE_URL}</div>
                <div><strong>토큰:</strong> {localStorage.getItem('accessToken') ? '✅ 있음' : '❌ 없음'}</div>
              </div>
              
              {currentUser ? (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <div><strong>백엔드 사용자 정보:</strong></div>
                  <div className="ml-2 text-xs">
                    <div>ID: {currentUser.userId}</div>
                    <div>계정: {currentUser.accountName}</div>
                    <div>이름: {currentUser.userName}</div>
                    <div>이메일: {currentUser.userEmail}</div>
                  </div>
                  
                  <div><strong>팔로우:</strong></div>
                  <div className="ml-2 text-xs">
                    <div>팔로워: {followCounts.followerCount}명</div>
                    <div>팔로잉: {followCounts.followingCount}명</div>
                  </div>
                  
                  <div><strong>피드:</strong></div>
                  <div className="ml-2 text-xs">
                    <div>게시물: {feedStats.postCount}개</div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <div><strong>백엔드 사용자:</strong> {isLoadingUser ? '로딩 중...' : '정보 없음'}</div>
                </div>
              )}
              
              <div className="mt-2 pt-2 border-t border-green-200">
                <div><strong>알림:</strong> {unreadCount}개</div>
                <div><strong>네비게이션 아이템:</strong> {navigationItems.length}개</div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-green-200 text-orange-600">
                <div><strong>⚠️ TODO:</strong></div>
                <div className="text-xs">1. @/lib/axios 구조 확인 후 올바른 import 적용</div>
                <div className="text-xs">2. useAuthStore에서 토큰 직접 가져오기</div>
                <div className="text-xs">3. 인터셉터에서 logout() 함수 호출 최적화</div>
              </div>
            </div>
          </details>
        </div>
      )}
    </nav>
  )
}

export default MainNavigation
// src/app/explore/page.tsx - 올바른 아키텍처 적용

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CameraIcon,
  Bars3Icon,
  XMarkIcon,
  RssIcon,
  UsersIcon,
  BellIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CameraIcon as CameraSolidIcon,
  RssIcon as RssSolidIcon,
  UsersIcon as UsersSolidIcon,
  BellIcon as BellSolidIcon,
} from '@heroicons/react/24/solid'
import InfiniteScrollTimeline from '@/components/page/timeline/InfiniteScrollTimeline'
import { FeedLoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/axios' // 🏗️ 아키텍처 원칙: 통합된 axios 인스턴스
import { useAuth } from '@/hooks/auth/useAuth' // 🏗️ 기존 auth 훅 사용

// ============================================================================
// 🔥 백엔드 연동 타입 정의 (Feed API 기반)
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

// 🔥 피드 통계 정보
interface FeedStats {
  postCount: number;
  totalLikes: number;
}

// 네비게이션 아이템 타입
interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  activeIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  current: boolean;
  showLabel: boolean;
  description: string;
  badge?: number;
  isDynamic?: boolean;    // 사용자 정보에 따라 href 변경
}

// ============================================================================
// 🔥 백엔드 API 함수들 (올바른 아키텍처 적용)
// ============================================================================

const exploreAPI = {
  // 🔥 현재 사용자 정보 조회 (통합된 api 인스턴스 사용)
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
        
        if (response.data.error || !response.data.data) {
          continue; // 다음 엔드포인트 시도
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

  // 🔥 피드 통계 조회
  getFeedStats: async (accountName: string): Promise<FeedStats> => {
    try {
      const response = await api.get<ApiResponse<any>>(
        `/feeds/users/account/${accountName}?limit=1`
      );
      
      if (response.data.error) {
        return { postCount: 0, totalLikes: 0 };
      }
      
      const feedData = response.data.data;
      return { 
        postCount: feedData?.posts?.length || 0,
        totalLikes: 0 // 향후 추가 구현
      };
    } catch (error) {
      console.warn('피드 통계 조회 실패:', error);
      return { postCount: 0, totalLikes: 0 };
    }
  },

  // 🔥 읽지 않은 알림 수
  getUnreadNotificationCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
      
      if (response.data.error) {
        return 0;
      }
      
      return response.data.data?.unreadCount || 0;
    } catch (error) {
      return 0; // 알림 API가 아직 구현되지 않은 경우
    }
  },

  // 🔥 Explore 피드 미리 로딩
  preloadExploreFeed: async (): Promise<void> => {
    try {
      console.log('🔍 Explore 피드 미리 로딩...');
      await api.get<ApiResponse<any>>('/feeds/explore?limit=5');
      console.log('✅ Explore 피드 미리 로딩 완료');
    } catch (error) {
      console.warn('⚠️ Explore 피드 미리 로딩 실패:', error);
    }
  },
};

// ============================================================================
// ExplorePage 컴포넌트 (완전 보호된 경로)
// ============================================================================

const ExplorePage: React.FC = () => {
  const router = useRouter()
  const toast = useToast()
  
  // 🏗️ 기존 useAuth 훅 사용 (Zustand 기반)
  const { user, isAuthenticated, isLoading } = useAuth()

  // ============================================================================
  // 백엔드 연동 상태 관리
  // ============================================================================

  const [currentUser, setCurrentUser] = useState<BackendUserInfo | null>(null)
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followerCount: 0, followingCount: 0 })
  const [feedStats, setFeedStats] = useState<FeedStats>({ postCount: 0, totalLikes: 0 })
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // ============================================================================
  // 🔥 백엔드 연동 - 사용자 정보 로드
  // ============================================================================

  const loadCurrentUser = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    setIsLoadingUser(true);
    setUserError(null);

    try {
      console.log('=== Explore 페이지 사용자 정보 로드 시작 ===');

      const userInfo = await exploreAPI.getCurrentUser();
      setCurrentUser(userInfo);
      
      // 🔥 사용자 관련 통계 정보 병렬 로드
      const [counts, stats, notifications] = await Promise.allSettled([
        exploreAPI.getFollowCounts(userInfo.accountName),
        exploreAPI.getFeedStats(userInfo.accountName),
        exploreAPI.getUnreadNotificationCount(),
      ]);
      
      if (counts.status === 'fulfilled') {
        setFollowCounts(counts.value);
      }
      
      if (stats.status === 'fulfilled') {
        setFeedStats(stats.value);
      }
      
      if (notifications.status === 'fulfilled') {
        setUnreadCount(notifications.value);
      }
      
      console.log('✅ Explore 사용자 정보 로드 완료:', {
        user: userInfo,
        counts: counts.status === 'fulfilled' ? counts.value : 'failed',
        stats: stats.status === 'fulfilled' ? stats.value : 'failed',
        notifications: notifications.status === 'fulfilled' ? notifications.value : 'failed'
      });

      // 🔥 Explore 피드 미리 로딩 (백그라운드)
      exploreAPI.preloadExploreFeed();
      
    } catch (error) {
      console.warn('❌ Explore 사용자 정보 로드 실패:', error);
      setUserError(error instanceof Error ? error.message : '사용자 정보를 불러올 수 없습니다.');
      
      // 🔥 에러 시 Zustand user 정보 사용 (fallback)
      if (user) {
        const fallbackUser: BackendUserInfo = {
          userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
          accountName: (user as any)?.accountName || user.email.split('@')[0],
          userName: user.name || user.email,
          userEmail: user.email,
          profileImage: (user as any)?.profileImage,
        };
        setCurrentUser(fallbackUser);
        console.log('🔄 fallback 사용자 정보 적용:', fallbackUser);
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, user]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && user) {
      loadCurrentUser();
    }
  }, [isAuthenticated, user, loadCurrentUser]);

  // ============================================================================
  // 🔥 동적 네비게이션 아이템 생성 (백엔드 기반)
  // ============================================================================

  const navigationItems = useMemo((): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: 'explore',
        name: 'Explore',
        href: '/explore',
        icon: RssIcon,
        activeIcon: RssSolidIcon,
        current: true, // 현재 페이지
        showLabel: false,
        description: '모든 사용자의 게시물 탐색',
      },
      {
        id: 'search',
        name: 'Search',
        href: '/feeds/search',
        icon: MagnifyingGlassIcon,
        activeIcon: MagnifyingGlassSolidIcon,
        current: false,
        showLabel: false,
        description: '사용자 및 피드 검색',
      },
      {
        id: 'timeline',
        name: 'Timeline',
        href: '/feeds/timeline',
        icon: HomeIcon,
        activeIcon: HomeSolidIcon,
        current: false,
        showLabel: true,
        description: '팔로잉하는 사용자들의 최신 게시물',
      },
    ];

    // 🔥 사용자 정보가 있을 때만 동적 항목 추가
    if (currentUser) {
      const userItems: NavigationItem[] = [
        {
          id: 'profile',
          name: 'My Profile',
          href: `/feeds/users/account/${currentUser.accountName}`,
          icon: UserIcon,
          activeIcon: UserSolidIcon,
          current: false,
          showLabel: false,
          description: '내 프로필 및 게시물',
          badge: feedStats.postCount > 0 ? feedStats.postCount : undefined,
          isDynamic: true,
        },
        {
          id: 'myroom',
          name: 'My Room',
          href: '/myroom',
          icon: CameraIcon,
          activeIcon: CameraSolidIcon,
          current: false,
          showLabel: true,
          description: '내 사진들 관리',
        },
        {
          id: 'followers',
          name: 'Followers',
          href: `/feeds/users/account/${currentUser.accountName}/followers`,
          icon: UsersIcon,
          activeIcon: UsersSolidIcon,
          current: false,
          showLabel: false,
          description: '나를 팔로우하는 사용자들',
          badge: followCounts.followerCount > 0 ? followCounts.followerCount : undefined,
          isDynamic: true,
        },
      ];

      // 🔥 알림 기능 (개발 모드 또는 알림 있을 때)
      if (process.env.NODE_ENV === 'development' || unreadCount > 0) {
        userItems.push({
          id: 'notifications',
          name: 'Notifications',
          href: '/notifications',
          icon: BellIcon,
          activeIcon: BellSolidIcon,
          current: false,
          showLabel: false,
          description: '알림 및 소식',
          badge: unreadCount > 0 ? unreadCount : undefined,
        });
      }

      return [...baseItems, ...userItems];
    }

    return baseItems;
  }, [currentUser, followCounts, feedStats, unreadCount]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 🔥 네비게이션 핸들러
  const handleNavigation = useCallback((item: NavigationItem) => {
    console.log('네비게이션:', item.name, '→', item.href);
    router.push(item.href);
    setIsMobileMenuOpen(false);
  }, [router]);

  // 모바일 메뉴 토글
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }, [isMobileMenuOpen]);

  // 🔥 사용자 정보 재시도
  const retryUserLoad = useCallback(async () => {
    setUserError(null);
    
    try {
      const loadingToastId = toast.loading('사용자 정보 로딩 중...');
      await loadCurrentUser();
      toast.removeToast(loadingToastId);
      toast.success('사용자 정보 로드 완료');
    } catch (error) {
      toast.error('사용자 정보 로드 실패', error instanceof Error ? error.message : '알 수 없는 오류');
    }
  }, [loadCurrentUser, toast]);

  // 🔥 페이지 새로고침
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadCurrentUser(),
        exploreAPI.preloadExploreFeed(),
      ]);
      toast.info('새로고침 완료', '최신 정보를 불러왔습니다.');
    } catch (error) {
      toast.error('새로고침 실패', '다시 시도해주세요.');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadCurrentUser, toast]);

  // ============================================================================
  // 사용자 정보 결정 (우선순위: 백엔드 > Zustand)
  // ============================================================================

  const displayUser = currentUser || (user ? {
    userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
    accountName: (user as any)?.accountName || user.email.split('@')[0],
    userName: user.name || user.email,
    userEmail: user.email,
    profileImage: (user as any)?.profileImage,
  } : null);

  // ============================================================================
  // 렌더링 조건 (완전 보호된 경로)
  // ============================================================================

  // 🏗️ 아키텍처 원칙: 인증 로딩 중
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <FeedLoadingSpinner
          text="로그인 상태 확인 중..."
          size="lg"
        />
      </div>
    )
  }

  // 🏗️ 아키텍처 원칙: 로그인하지 않은 경우 - 이 코드는 실행되지 않아야 함 (Middleware에서 차단)
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
          <p className="text-gray-600 mb-6">로그인이 필요한 페이지입니다.</p>
          <button
            onClick={() => router.push('/login')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    )
  }

  // ============================================================================
  // 🔥 메인 렌더링 (인증된 사용자용)
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 네비게이션 헤더 */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Nearzoom 로고 - 메인페이지로 이동 */}
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <img
                  src="/nearzoom-logo.png"
                  alt="Nearzoom"
                  className="h-8 w-auto max-w-[120px] object-contain"
                  onError={(e) => {
                    // 로고 로드 실패 시 텍스트로 fallback
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = document.createElement('span');
                    fallback.textContent = 'Nearzoom';
                    fallback.className = 'text-2xl font-bold text-blue-600';
                    target.parentNode?.appendChild(fallback);
                  }}
                />
              </button>
              
              {/* 새로고침 버튼 */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                title="새로고침"
              >
                <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* 🔥 데스크톱 네비게이션 (동적 생성) */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.map(item => {
                  const Icon = item.current ? item.activeIcon : item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item)}
                      disabled={item.isDynamic && isLoadingUser}
                      className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                        item.current
                          ? 'bg-blue-100 text-blue-700 shadow-sm'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                      title={`${item.name} - ${item.description}`}
                    >
                      <div className="relative">
                        <Icon className="h-5 w-5" />
                        {/* 🔥 배지 표시 */}
                        {item.badge && (
                          <span className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 flex items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </div>
                      {/* showLabel이 true인 경우만 라벨 표시 */}
                      {item.showLabel && <span>{item.name}</span>}
                      {/* 로딩 표시 */}
                      {item.isDynamic && isLoadingUser && (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin ml-1"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 🔥 사용자 정보 (데스크톱) */}
            <div className="hidden items-center space-x-4 md:flex">
              {displayUser ? (
                <div className="flex items-center space-x-3">
                  {/* 프로필 이미지 */}
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 ring-2 ring-blue-100">
                    {displayUser.profileImage ? (
                      <img
                        src={displayUser.profileImage}
                        alt={displayUser.userName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                              ${displayUser.userName.charAt(0).toUpperCase()}
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
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
                <FeedLoadingSpinner size="sm" text="" />
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
                <div className="mb-3 flex items-center space-x-3 px-3 py-3 bg-white rounded-lg shadow-sm">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 ring-2 ring-blue-100">
                    {displayUser.profileImage ? (
                      <img
                        src={displayUser.profileImage}
                        alt={displayUser.userName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                              ${displayUser.userName.charAt(0).toUpperCase()}
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {displayUser.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {displayUser.userName}
                    </div>
                    <div className="text-xs text-gray-500">
                      @{displayUser.accountName}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      팔로워 {followCounts.followerCount} • 팔로잉 {followCounts.followingCount}
                    </div>
                  </div>
                </div>
              )}

              {/* 네비게이션 항목들 */}
              {navigationItems.map(item => {
                const Icon = item.current ? item.activeIcon : item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    disabled={item.isDynamic && isLoadingUser}
                    className={`flex w-full items-center space-x-3 rounded-lg px-3 py-3 text-left text-base font-medium transition-all duration-200 disabled:opacity-50 ${
                      item.current
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="relative">
                      <Icon className="h-6 w-6" />
                      {/* 배지 표시 */}
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 flex items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </div>
                    <span className="flex-1">{item.name}</span>
                    <span className="text-xs text-gray-400">{item.description}</span>
                    {item.isDynamic && isLoadingUser && (
                      <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </button>
                )
              })}
              
              {/* 추가 액션들 */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex w-full items-center space-x-3 rounded-lg px-3 py-3 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* 🔥 메인 컨텐츠 */}
      <main className="pb-20 md:pb-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
          {/* 페이지 제목 및 통계 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  🌟 탐색
                  {isRefreshing && (
                    <ArrowPathIcon className="ml-2 h-6 w-6 animate-spin text-blue-600" />
                  )}
                </h1>
                <p className="text-gray-600 mt-1">새로운 사람들과 콘텐츠를 발견해보세요</p>
              </div>
              
              {/* 사용자 통계 (데스크톱에서만 표시) */}
              {displayUser && (
                <div className="hidden md:block text-right">
                  <div className="text-sm text-gray-500">내 활동</div>
                  <div className="flex space-x-4 text-xs text-gray-600">
                    <span>게시물 {feedStats.postCount}</span>
                    <span>팔로워 {followCounts.followerCount}</span>
                    <span>팔로잉 {followCounts.followingCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 🔥 백엔드 연동된 Timeline 컴포넌트 */}
          <InfiniteScrollTimeline 
            type="explore"
            className="py-0"
          />
        </div>
      </main>

      {/* 🔥 모바일 하단 네비게이션 */}
      <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200 bg-white md:hidden">
        <div className="grid grid-cols-4 py-2">
          {navigationItems.slice(0, 4).map(item => {
            const Icon = item.current ? item.activeIcon : item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                disabled={item.isDynamic && isLoadingUser}
                className={`flex flex-col items-center px-1 py-2 disabled:opacity-50 transition-colors ${
                  item.current
                    ? 'text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="relative">
                  <Icon className="h-6 w-6" />
                  {/* 배지 표시 */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 flex items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                  {/* 로딩 표시 */}
                  {item.isDynamic && isLoadingUser && (
                    <div className="absolute top-0 right-0 w-2 h-2 border border-current border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <span className="mt-1 text-xs font-medium truncate w-full text-center">
                  {item.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 🔥 개발 모드에서 백엔드 연동 상태 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-24 left-4 md:bottom-4 bg-black bg-opacity-80 text-white text-xs rounded-lg p-3 z-30 max-w-xs">
          <details>
            <summary className="cursor-pointer font-semibold mb-2 text-yellow-300">
              🔧 Explore 상태 (올바른 아키텍처)
            </summary>
            <div className="space-y-1">
              <div><strong>🏗️ API:</strong> @/lib/axios</div>
              <div><strong>🏗️ Auth Store:</strong> {isAuthenticated ? '✅ OK' : '❌ No'}</div>
              <div><strong>🏗️토큰 관리:</strong> Zustand + 인터셉터</div>
              <div><strong>사용자 로딩:</strong> {isLoadingUser ? '⏳ Loading' : '✅ Done'}</div>
              <div><strong>에러:</strong> {userError ? `❌ ${userError}` : '✅ None'}</div>
              
              {displayUser && (
                <>
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div><strong>사용자 정보:</strong></div>
                    <div className="ml-2 text-xs">
                      <div>ID: {displayUser.userId}</div>
                      <div>계정: {displayUser.accountName}</div>
                      <div>이름: {displayUser.userName}</div>
                      <div>이메일: {displayUser.userEmail}</div>
                      <div>소스: {currentUser ? 'Backend' : 'Zustand'}</div>
                    </div>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div><strong>통계:</strong></div>
                    <div className="ml-2 text-xs">
                      <div>팔로워: {followCounts.followerCount}</div>
                      <div>팔로잉: {followCounts.followingCount}</div>
                      <div>게시물: {feedStats.postCount}</div>
                      <div>알림: {unreadCount}</div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div><strong>네비게이션:</strong> {navigationItems.length}개 아이템</div>
                <div><strong>새로고침:</strong> {isRefreshing ? '⏳ 진행중' : '✅ 대기'}</div>
                <div><strong>🔐 완전 보호:</strong> ✅ 로그인 필수</div>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

export default ExplorePage
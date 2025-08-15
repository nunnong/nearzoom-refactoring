// src/app/my/page.tsx - 완성된 마이페이지 컴포넌트

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  CogIcon,
  PhotoIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import { HeartIcon } from '@heroicons/react/24/outline';

// 🏗️ 올바른 아키텍처: 통합된 api 인스턴스 사용
import api from '@/lib/axios';

// 🏗️ 올바른 아키텍처: Zustand 스토어 사용
import { useAuthStore } from '@/stores/authStore';

// ============================================================================
// 🔥 백엔드 타입 정의 (Feed API 기반)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 PostResponse 타입 (FeedController에서 반환)
interface PostResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string;
  displayOrder: number | null;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
}

// 🔥 백엔드 FeedWithPostsResponse 타입 (커서 기반 무한스크롤)
interface FeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  isFollowing: boolean;
  hasNext: boolean;
  nextCursor: number | null;
}

// 🔥 백엔드 FollowCountsResponse 타입
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// 🔥 백엔드 사용자 정보 타입
interface BackendUserInfo {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
}

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
// 🔥 백엔드 API 함수들 (올바른 아키텍처 적용)
// ============================================================================

const myPageAPI = {
  // 🔥 GET /users/me - 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<BackendUserInfo> => {
    const endpoints = ['/users/me', '/users/profile', '/auth/me'];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 사용자 정보 조회: ${endpoint}`);
        
        // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
        const response = await api.get<ApiResponse<BackendUserInfo>>(endpoint);
        
        if (response.data.error) {
          continue;
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

  // 🔥 GET /feeds/users/account/{accountName} - 사용자 피드 조회 (커서 기반 무한스크롤 지원)
  getUserFeedWithPosts: async (accountName: string, limit: number = 20, cursor?: number): Promise<FeedWithPostsResponse> => {
    try {
      console.log(`🔍 사용자 피드 조회: ${accountName}, limit=${limit}, cursor=${cursor}`);
      
      const params: any = { limit };
      if (cursor) {
        params.cursor = cursor;
      }
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
      const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
        `/feeds/users/account/${accountName}`,
        { params }
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '피드를 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('피드 데이터가 없습니다.');
      }
      
      console.log(`✅ 피드 조회 성공: posts=${response.data.data.posts.length}개, hasNext=${response.data.data.hasNext}, nextCursor=${response.data.data.nextCursor}`);
      return response.data.data;
    } catch (error) {
      console.error('❌ 피드 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 통계 조회
  getFollowStats: async (accountName: string): Promise<FollowCountsResponse> => {
    try {
      console.log(`🔍 팔로우 통계 조회: ${accountName}`);
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
      const response = await api.get<ApiResponse<FollowCountsResponse>>(
        `/follows/count/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우 통계를 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('팔로우 통계 데이터가 없습니다.');
      }
      
      console.log(`✅ 팔로우 통계 조회 성공:`, response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ 팔로우 통계 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 게시물 좋아요 토글
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    try {
      console.log(`🔍 좋아요 ${isCurrentlyLiked ? '취소' : '추가'}: postId=${postId}`);
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
      if (isCurrentlyLiked) {
        await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`);
      } else {
        await api.post<ApiResponse<void>>(`/likes/posts/${postId}`);
      }
      
      console.log(`✅ 좋아요 ${isCurrentlyLiked ? '취소' : '추가'} 성공`);
    } catch (error) {
      console.error('❌ 좋아요 처리 실패:', error);
      throw error;
    }
  },

  // 🔥 GET /feeds/posts/{postId} - 게시물 상세 조회
  getPostDetail: async (postId: number): Promise<any> => {
    try {
      console.log(`🔍 게시물 상세 조회: postId=${postId}`);
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
      const response = await api.get<ApiResponse<any>>(`/feeds/posts/${postId}`);
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물을 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('게시물 데이터가 없습니다.');
      }
      
      console.log(`✅ 게시물 상세 조회 성공`);
      return response.data.data;
    } catch (error) {
      console.error('❌ 게시물 상세 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 추가 게시물 로드 (커서 기반 무한스크롤)
  loadMorePosts: async (accountName: string, cursor: number, limit: number = 20): Promise<PostResponse[]> => {
    try {
      const feedData = await myPageAPI.getUserFeedWithPosts(accountName, limit, cursor);
      return feedData.posts;
    } catch (error) {
      console.error('❌ 추가 게시물 로드 실패:', error);
      throw error;
    }
  }
};

export default function MyPage() {
  const router = useRouter();
  
  // 🏗️ 올바른 아키텍처: Zustand 스토어에서 인증 상태 관리
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();
  
  // ============================================================================
  // 🔥 상태 관리 (백엔드 타입 적용)
  // ============================================================================
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<BackendUserInfo | null>(null);
  const [myFeed, setMyFeed] = useState<FeedWithPostsResponse | null>(null);
  const [followStats, setFollowStats] = useState<FollowCountsResponse>({ 
    followerCount: 0, 
    followingCount: 0 
  });
  const [loading, setLoading] = useState({
    initial: true,
    loadMore: false,
    userInfo: false
  });
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  // ============================================================================
  // 🔥 백엔드 데이터 로딩
  // ============================================================================

  const loadUserData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(prev => ({ ...prev, initial: true }));
      setError(null);

      console.log('=== 내 페이지 데이터 로딩 시작 ===');

      // 🔥 1단계: 사용자 정보 조회
      const userInfo = await myPageAPI.getCurrentUser();
      setCurrentUser(userInfo);

      // 🔥 2단계: 병렬로 피드와 팔로우 통계 조회
      const [feedResult, statsResult] = await Promise.allSettled([
        myPageAPI.getUserFeedWithPosts(userInfo.accountName, 20),
        myPageAPI.getFollowStats(userInfo.accountName)
      ]);

      // 피드 데이터 처리 (커서 기반)
      if (feedResult.status === 'fulfilled') {
        setMyFeed(feedResult.value);
        setHasMore(feedResult.value.hasNext);
        setNextCursor(feedResult.value.nextCursor);
      } else {
        console.warn('피드 조회 실패:', feedResult.reason);
        // 빈 피드로 초기화 (새 사용자일 수 있음)
        setMyFeed({
          feedId: 0,
          userId: userInfo.userId,
          accountName: userInfo.accountName,
          profileImage: userInfo.profileImage || null,
          createdAt: new Date().toISOString(),
          posts: [],
          isFollowing: false,
          hasNext: false,
          nextCursor: null
        });
      }

      // 팔로우 통계 처리
      if (statsResult.status === 'fulfilled') {
        setFollowStats(statsResult.value);
      } else {
        console.warn('팔로우 통계 조회 실패:', statsResult.reason);
        setFollowStats({ followerCount: 0, followingCount: 0 });
      }

      console.log('✅ 내 페이지 데이터 로딩 완료:', {
        userInfo,
        postsCount: feedResult.status === 'fulfilled' ? feedResult.value.posts.length : 0,
        followStats: statsResult.status === 'fulfilled' ? statsResult.value : null,
        hasMore: feedResult.status === 'fulfilled' ? feedResult.value.hasNext : false,
        nextCursor: feedResult.status === 'fulfilled' ? feedResult.value.nextCursor : null
      });

    } catch (error: any) {
      console.error('❌ 데이터 로딩 실패:', error);
      
      // 백엔드 에러 메시지 처리
      let errorMessage = '데이터를 불러오는데 실패했습니다.';
      
      if (error.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.';
        router.push('/login');
        return;
      } else if (error.response?.status === 403) {
        errorMessage = '접근 권한이 없습니다.';
      } else if (error.response?.status === 404) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, [isAuthenticated, user, router]);

  // 초기 데이터 로드
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // ============================================================================
  // 🔥 커서 기반 무한스크롤 - 추가 게시물 로드
  // ============================================================================

  const loadMorePosts = useCallback(async () => {
    if (!currentUser || !hasMore || loading.loadMore || !nextCursor) return;

    try {
      setLoading(prev => ({ ...prev, loadMore: true }));

      console.log('🔍 커서 기반 추가 게시물 로드:', { cursor: nextCursor });

      const newPosts = await myPageAPI.loadMorePosts(currentUser.accountName, nextCursor, 20);
      
      setMyFeed(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          posts: [...prev.posts, ...newPosts],
          hasNext: newPosts.length === 20,
          nextCursor: newPosts.length > 0 ? newPosts[newPosts.length - 1].postId : null
        };
      });

      setHasMore(newPosts.length === 20);
      setNextCursor(newPosts.length > 0 ? newPosts[newPosts.length - 1].postId : null);

      console.log(`✅ 커서 기반 추가 게시물 ${newPosts.length}개 로드 완료`);

    } catch (error: any) {
      console.error('❌ 추가 게시물 로드 실패:', error);
      
      const errorMessage = error?.response?.data?.message || '추가 게시물을 불러오는데 실패했습니다.';
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, loadMore: false }));
    }
  }, [currentUser, hasMore, loading.loadMore, nextCursor]);

  // ============================================================================
  // 🔥 이벤트 핸들러들
  // ============================================================================

  // 게시물 좋아요 토글
  const handleLike = async (post: PostResponse) => {
    if (!myFeed) return;

    try {
      // 낙관적 업데이트
      const updatedPosts = myFeed.posts.map(p => 
        p.postId === post.postId 
          ? { 
              ...p, 
              isLikedByMe: !p.isLikedByMe,
              likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1
            }
          : p
      );
      
      setMyFeed({
        ...myFeed,
        posts: updatedPosts
      });

      // 백엔드 API 호출
      await myPageAPI.togglePostLike(post.postId, post.isLikedByMe);
      
      console.log(`✅ 좋아요 ${post.isLikedByMe ? '취소' : '추가'} 완료: postId=${post.postId}`);
      
    } catch (error: any) {
      console.error('❌ 좋아요 처리 실패:', error);
      
      // 실패 시 롤백
      const revertedPosts = myFeed.posts.map(p => 
        p.postId === post.postId ? post : p
      );
      
      setMyFeed({
        ...myFeed,
        posts: revertedPosts
      });
      
      const errorMessage = error?.response?.data?.message || '좋아요 처리에 실패했습니다.';
      alert(errorMessage);
    }
  };

  // 네비게이션
  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  // 게시물 상세로 이동
  const handlePostClick = (post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`);
  };

  // 새 게시물 만들기
  const handleCreatePost = () => {
    router.push('/myroom');
  };

  // 프로필 설정으로 이동
  const handleProfileSettings = () => {
    router.push('/profile');
  };

  // 에러 재시도
  const handleRetry = () => {
    setError(null);
    loadUserData();
  };

  // 팔로워/팔로잉 목록 보기
  const handleViewFollowers = () => {
    const accountName = currentUser?.accountName || displayUser?.accountName;
    if (accountName) {
      router.push(`/follows/followers/${accountName}`);
    }
  };

  const handleViewFollowing = () => {
    const accountName = currentUser?.accountName || displayUser?.accountName;
    if (accountName) {
      router.push(`/follows/following/${accountName}`);
    }
  };

  // 네비게이션 메뉴 항목들
  const navigationItems = [
    {
      name: 'Timeline',
      href: '/feeds/timeline',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon,
      current: false
    },
    {
      name: 'Explore',
      href: '/feeds/explore',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassSolidIcon,
      current: false
    },
    {
      name: 'My Profile',
      href: '/my',
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      current: true
    },
    {
      name: 'My Room',
      href: '/myroom',
      icon: CalendarIcon,
      activeIcon: CalendarSolidIcon,
      current: false
    }
  ];

  // ============================================================================
  // 🔥 렌더링 조건부 처리 (완전 보호된 경로)
  // ============================================================================

  const displayUser = currentUser || (user ? {
    userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
    accountName: (user as any)?.accountName || user.email?.split('@')[0] || 'user',
    userName: user.name || user.email || 'User',
    userEmail: user.email || 'user@example.com',
    profileImage: (user as any)?.profileImage,
    prettyFace: (user as any)?.prettyFace,
  } : null);

  // 🏗️ 아키텍처 원칙: 인증 로딩 중
  if (authLoading || loading.initial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="lg" 
          text={authLoading ? "인증 확인 중..." : "내 게시물을 불러오는 중..."}
        />
      </div>
    );
  }

  // 🏗️ 아키텍처 원칙: 로그인하지 않은 경우
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">내 페이지를 보려면 로그인해 주세요.</p>
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

  // 에러 상태 처리
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 네비게이션 헤더 */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 브랜드 */}
            <div className="flex items-center">
              <button
                onClick={() => handleNavigation('/')}
                className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                📖 NearZoom
              </button>
            </div>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.map((item) => {
                  const Icon = item.current ? item.activeIcon : item.icon;
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
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 사용자 정보 & 설정 */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={handleProfileSettings}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="프로필 설정"
              >
                <CogIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <img
                  src={displayUser?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=32&background=random`}
                  alt={displayUser?.userName || 'User'}
                  className="h-8 w-8 rounded-full"
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
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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

        {/* 모바일 네비게이션 메뉴 */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
              {/* 사용자 정보 */}
              <div className="flex items-center space-x-3 px-3 py-2 mb-3">
                <img
                  src={displayUser?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=40&background=random`}
                  alt={displayUser?.userName || 'User'}
                  className="h-10 w-10 rounded-full"
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
                  onClick={handleProfileSettings}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <CogIcon className="h-5 w-5" />
                </button>
              </div>

              {/* 네비게이션 항목들 */}
              {navigationItems.map((item) => {
                const Icon = item.current ? item.activeIcon : item.icon;
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
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {/* 프로필 이미지 */}
              <div className="flex-shrink-0">
                <img
                  src={displayUser?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=120&background=random`}
                  alt={displayUser?.userName || 'User'}
                  className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-gray-100"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=120&background=random`;
                  }}
                />
              </div>

              {/* 프로필 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-4 sm:mb-0">
                    <h1 className="text-2xl font-bold text-gray-900 truncate">
                      {displayUser?.userName || 'User'}
                    </h1>
                    <p className="text-gray-500 text-lg">
                      @{displayUser?.accountName || 'user'}
                    </p>
                    {displayUser?.userEmail && (
                      <p className="text-gray-400 text-sm mt-1">
                        {displayUser.userEmail}
                      </p>
                    )}
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleCreatePost}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>새 게시물</span>
                    </button>
                    <button
                      onClick={handleProfileSettings}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      <CogIcon className="h-4 w-4" />
                      <span>설정</span>
                    </button>
                  </div>
                </div>

                {/* 통계 정보 */}
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {myFeed?.posts.length || 0}
                    </div>
                    <div className="text-sm text-gray-500">게시물</div>
                  </div>
                  <button
                    onClick={handleViewFollowers}
                    className="hover:bg-gray-50 rounded-lg p-2 transition-colors"
                  >
                    <div className="text-2xl font-bold text-gray-900">
                      {followStats.followerCount}
                    </div>
                    <div className="text-sm text-gray-500">팔로워</div>
                  </button>
                  <button
                    onClick={handleViewFollowing}
                    className="hover:bg-gray-50 rounded-lg p-2 transition-colors"
                  >
                    <div className="text-2xl font-bold text-gray-900">
                      {followStats.followingCount}
                    </div>
                    <div className="text-sm text-gray-500">팔로잉</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 게시물 그리드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">내 게시물</h2>
              <div className="text-sm text-gray-500">
                총 {myFeed?.posts.length || 0}개
              </div>
            </div>

            {/* 게시물이 없는 경우 */}
            {(!myFeed?.posts || myFeed.posts.length === 0) && (
              <div className="text-center py-12">
                <PhotoIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 게시물이 없습니다
                </h3>
                <p className="text-gray-500 mb-6">
                  첫 번째 게시물을 만들어보세요!
                </p>
                <button
                  onClick={handleCreatePost}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>첫 게시물 만들기</span>
                </button>
              </div>
            )}

            {/* 게시물 그리드 */}
            {myFeed?.posts && myFeed.posts.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {myFeed.posts.map((post) => (
                    <div
                      key={post.postId}
                      className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handlePostClick(post)}
                    >
                      {/* 게시물 이미지 */}
                      <div className="aspect-square bg-gray-100">
                        <img
                          src={post.imgUrl}
                          alt={post.caption || '게시물 이미지'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/400x400?text=Image+Not+Found';
                          }}
                        />
                      </div>

                      {/* 호버 오버레이 */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="text-white text-center">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <HeartSolidIcon className="h-6 w-6" />
                              <span className="font-medium">{post.likeCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 게시물 정보 */}
                      <div className="p-4">
                        {post.caption && (
                          <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                            {post.caption}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLike(post);
                              }}
                              className={`p-1 rounded-full transition-colors ${
                                post.isLikedByMe
                                  ? 'text-red-600 hover:text-red-700'
                                  : 'text-gray-400 hover:text-red-600'
                              }`}
                            >
                              {post.isLikedByMe ? (
                                <HeartSolidIcon className="h-5 w-5" />
                              ) : (
                                <HeartIcon className="h-5 w-5" />
                              )}
                            </button>
                            <span className="text-sm text-gray-500">
                              {post.likeCount}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 더 보기 버튼 */}
                {hasMore && (
                  <div className="text-center">
                    <button
                      onClick={loadMorePosts}
                      disabled={loading.loadMore}
                      className="inline-flex items-center space-x-2 px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading.loadMore ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>로딩 중...</span>
                        </>
                      ) : (
                        <span>더 보기</span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
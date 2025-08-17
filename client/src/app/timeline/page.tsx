// src/app/timeline/page.tsx - 통일된 네비게이션 바 적용

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
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  ArrowUpIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid'

// 🏗️ 올바른 아키텍처: 통합된 api 인스턴스 사용
import api from '@/lib/axios'

// 🏗️ 올바른 아키텍처: 타임라인 API 사용
import { getFollowingTimeline, toggleTimelinePostLike } from '@/lib/api/timeline'

// 🏗️ 올바른 아키텍처: 타입들 import
import type { PostCardForUI, CursorPostsResult, PostResponse } from '@/lib/types/feed'

// 🏗️ 올바른 아키텍처: Zustand 스토어 사용
import { useAuthStore } from '@/stores/authStore'

// 디바이스별 최적 limit 계산
const getOptimalLimit = (): number => {
  if (typeof window === 'undefined') return 20;

  const width = window.innerWidth;
  if (width < 768) return 12;      // 모바일
  if (width < 1024) return 18;     // 태블릿
  return 24;                       // 데스크톱
};

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
// 🔥 백엔드 타입 정의 (정확한 API 응답 구조)
// ============================================================================

// 🔥 백엔드 사용자 정보 타입
interface BackendUserInfo {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
}

// Timeline 컴포넌트
const Timeline: React.FC = () => {
  const router = useRouter();

  // ============================================================================
  // 🔥 상태 관리
  // ============================================================================

  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState({
    initial: true,
    loadMore: false
  });
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ============================================================================
  // 🔥 스크롤 관리
  // ============================================================================

  useEffect(() => {
    const handleScroll = () => {
      // 스크롤 상단 버튼 표시 여부
      setShowScrollTop(window.scrollY > 300);

      // 커서 기반 무한스크롤 트리거 (하단 500px 전에 로드)
      if (
        hasMore &&
        !loading.loadMore &&
        nextCursor &&
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 500
      ) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading.loadMore, nextCursor]);

  // 상단으로 스크롤
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================================================
  // 🔥 백엔드 데이터 로딩 (팔로잉한 사용자들의 게시물만)
  // ============================================================================

  const loadTimelinePosts = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, initial: true }));
      setError(null);

      console.log('=== 팔로잉 타임라인 로딩 시작 ===');

      // 🔥 인증 상태 디버깅
      const { isAuthenticated, accessToken, user } = useAuthStore.getState();
      console.log('🔐 인증 상태:', {
        isAuthenticated,
        hasToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        hasUser: !!user,
        userId: user?.id
      });

      const limit = getOptimalLimit();

      // 🔥 올바른 API 함수 사용
      const result = await getFollowingTimeline({ limit });

      if (!result.success) {
        throw new Error(result.error || '타임라인을 불러오는데 실패했습니다.');
      }

      if (!result.data) {
        throw new Error('타임라인 데이터가 없습니다.');
      }

      // 타입 안전성을 위한 null 체크
      const timelineData = result.data;

      setPosts(timelineData.posts);
      setHasMore(timelineData.hasNext);
      setNextCursor(timelineData.nextCursor);

      console.log('✅ 팔로잉 타임라인 로딩 완료:', {
        postsCount: timelineData.posts.length,
        hasMore: timelineData.hasNext,
        nextCursor: timelineData.nextCursor,
        limit
      });

    } catch (error: any) {
      console.error('❌ 팔로잉 타임라인 로딩 실패:', error);

      // 🔥 더 자세한 에러 분석
      console.error('🔍 Error details:', {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStatus: error?.status,
        isAxiosError: error?.isAxiosError,
        hasResponse: !!error?.response,
        hasRequest: !!error?.request,
        errorKeys: Object.keys(error || {}),
        errorValues: Object.values(error || {})
      });

      // 백엔드 에러 메시지 처리
      let errorMessage = '팔로잉 타임라인을 불러오는데 실패했습니다.';

      if (error?.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.';
        console.log('🔒 인증 에러 - 로그인 페이지로 이동');
        router.push('/login');
        return;
      } else if (error?.response?.status === 403) {
        errorMessage = '타임라인에 접근할 권한이 없습니다.';
      } else if (error?.response?.status === 404) {
        errorMessage = '팔로잉한 사용자가 없거나 게시물이 없습니다.';
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === 'ERR_NETWORK') {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else if (error?.code === 'ECONNREFUSED') {
        errorMessage = '서버에 연결할 수 없습니다.';
      }

      console.error('🚨 최종 에러 메시지:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, [router]);

  // 초기 데이터 로드
  useEffect(() => {
    loadTimelinePosts();
  }, [loadTimelinePosts]);

  // ============================================================================
  // 🔥 커서 기반 무한스크롤 - 추가 게시물 로드
  // ============================================================================

  const loadMorePosts = useCallback(async () => {
    if (!hasMore || loading.loadMore || !nextCursor) return;

    try {
      setLoading(prev => ({ ...prev, loadMore: true }));

      console.log('🔍 커서 기반 추가 게시물 로드:', { cursor: nextCursor });

      const limit = getOptimalLimit();

      // 🔥 올바른 API 함수 사용
      const result = await getFollowingTimeline({ limit, cursor: nextCursor });

      if (!result.success) {
        throw new Error(result.error || '추가 게시물을 불러오는데 실패했습니다.');
      }

      if (!result.data) {
        throw new Error('추가 게시물 데이터가 없습니다.');
      }

      // 타입 안전성을 위한 null 체크
      const moreData = result.data;

      setPosts(prev => [...prev, ...moreData.posts]);
      setHasMore(moreData.hasNext);
      setNextCursor(moreData.nextCursor);

      console.log(`✅ 커서 기반 추가 게시물 ${moreData.posts.length}개 로드 완료`);

    } catch (error: any) {
      console.error('❌ 추가 게시물 로드 실패:', error);

      const errorMessage = error?.message || '추가 게시물을 불러오는데 실패했습니다.';

      // 토스트나 간단한 알림 표시 (alert 대신)
      if (window.confirm(`${errorMessage}\n다시 시도하시겠습니까?`)) {
        setTimeout(() => loadMorePosts(), 1000);
      }
    } finally {
      setLoading(prev => ({ ...prev, loadMore: false }));
    }
  }, [hasMore, loading.loadMore, nextCursor]);

  // ============================================================================
  // 🔥 이벤트 핸들러들
  // ============================================================================

  // 좋아요 토글
  const handleLike = async (post: PostCardForUI) => {
    try {
      // 낙관적 업데이트
      setPosts(prev => prev.map(p =>
        p.postId === post.postId
          ? {
            ...p,
            isLikedByMe: !p.isLikedByMe,
            likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1
          }
          : p
      ));

      // 🔥 올바른 API 함수 사용
      const result = await toggleTimelinePostLike(post.postId, post.isLikedByMe);

      if (!result.success) {
        // 실패 시 롤백
        setPosts(prev => prev.map(p =>
          p.postId === post.postId ? post : p
        ));
        throw new Error(result.error || '좋아요 처리에 실패했습니다.');
      }

      console.log(`✅ 좋아요 ${post.isLikedByMe ? '취소' : '추가'} 완료: postId=${post.postId}`);

    } catch (error: any) {
      console.error('❌ 좋아요 처리 실패:', error);

      const errorMessage = error?.message || '좋아요 처리에 실패했습니다.';
      alert(errorMessage);
    }
  };

  // 게시물 상세로 이동
  const handlePostClick = (post: PostCardForUI) => {
    router.push(`/feeds/posts/${post.postId}`);
  };

  // 작성자 프로필로 이동
  const handleAuthorClick = (post: PostCardForUI, event: React.MouseEvent) => {
    event.stopPropagation();

    console.log('🔍 프로필 클릭 - 원본:', post.authorAccountName);

    // 이메일을 URL에 안전하게 인코딩
    const encodedAccountName = encodeURIComponent(post.authorAccountName);
    console.log('🔍 인코딩된 URL:', `/profile/${encodedAccountName}`);

    router.push(`/profile/${encodedAccountName}`);
  };

  // 공유 기능
  const handleShare = (post: PostCardForUI, event: React.MouseEvent) => {
    event.stopPropagation();

    const shareUrl = `${window.location.origin}/feeds/posts/${post.postId}`;

    if (navigator.share) {
      navigator.share({
        title: `${post.authorAccountName}님의 게시물`,
        text: post.caption || '게시물을 확인해보세요!',
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('링크가 클립보드에 복사되었습니다!');
    }
  };

  // 에러 재시도
  const handleRetry = () => {
    setError(null);
    loadTimelinePosts();
  };

  // 새로고침
  const handleRefresh = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      loadTimelinePosts();
    }, 300);
  };

  // ============================================================================
  // 🔥 렌더링 조건부 처리
  // ============================================================================

  if (loading.initial) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <LoadingSpinner
            size="lg"
            text="팔로잉 타임라인을 불러오는 중..."
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">오류가 발생했습니다</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.push('/explore')}
              className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              탐색 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <HomeIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">팔로잉 타임라인이 비어있습니다</h3>
          <p className="text-gray-500 mb-6">
            팔로우하는 사용자가 없거나 아직 게시물이 없습니다.<br />
            다른 사용자를 팔로우하여 타임라인을 채워보세요!
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/explore')}
              className="block w-full sm:w-auto sm:inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlusIcon className="h-5 w-5 mr-2 inline" />
              다른 사용자 탐색하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 🔥 새로고침 버튼 */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">팔로잉 타임라인</h1>
        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          새로고침
        </button>
      </div>

      {(posts as PostCardForUI[]).map((post: PostCardForUI) => (
        <div key={post.postId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
          {/* 🔥 게시물 헤더 (백엔드 작성자 정보) */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => handleAuthorClick(post, e)}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
              >
                <img
                  src={post.authorProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorAccountName)}&size=40&background=random`}
                  alt={post.authorAccountName}
                  className="h-10 w-10 rounded-full ring-2 ring-gray-100"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorAccountName)}&size=40&background=random`;
                  }}
                />
                <div className="text-left">
                  <p className="font-medium text-gray-900">@{post.authorAccountName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </button>

              <button
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 🔥 게시물 이미지 */}
          <div className="relative">
            <img
              src={post.imgUrl}
              alt={post.caption || '게시물 이미지'}
              className="w-full h-auto cursor-pointer"
              onClick={() => handlePostClick(post)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://picsum.photos/600/600?seed=${post.postId}`;
              }}
            />

            {/* 게시물 순서 표시 (displayOrder가 있는 경우) */}
            {post.displayOrder !== null && post.displayOrder !== undefined && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                #{post.displayOrder}
              </div>
            )}
          </div>

          {/* 🔥 게시물 액션 바 */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleLike(post)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
                >
                  {post.isLikedByMe ? (
                    <HeartSolidIcon className="h-6 w-6 text-red-500" />
                  ) : (
                    <HeartIcon className="h-6 w-6" />
                  )}
                  <span className="text-sm font-medium">{post.likeCount}</span>
                </button>

                <button
                  onClick={(e) => handleShare(post, e)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors"
                >
                  <ShareIcon className="h-6 w-6" />
                  <span className="text-sm">공유</span>
                </button>
              </div>
            </div>

            {/* 🔥 좋아요 수 표시 */}
            {post.likeCount > 0 && (
              <p className="text-sm font-medium text-gray-900 mb-2">
                좋아요 {post.likeCount}개
                {post.isLikedByMe && <span className="text-red-500 ml-1">❤️</span>}
              </p>
            )}

            {/* 🔥 캡션 */}
            {post.caption && (
              <div className="mb-2">
                <span className="font-medium text-gray-900 mr-2">@{post.authorAccountName}</span>
                <span className="text-gray-800">{post.caption}</span>
              </div>
            )}

            {/* 🔥 게시 시간 */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{new Date(post.createdAt).toLocaleString('ko-KR')}</span>
            </div>
          </div>
        </div>
      ))}

      {/* 🔥 커서 기반 무한스크롤 로딩 인디케이터 */}
      {loading.loadMore && (
        <div className="text-center py-6">
          <LoadingSpinner
            size="md"
            text="추가 게시물을 불러오는 중..."
          />
        </div>
      )}

      {/* 🔥 더 이상 게시물이 없을 때 */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-gray-500 mb-4">팔로잉한 모든 게시물을 확인했습니다!</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            새로고침
          </button>
        </div>
      )}

      {/* 🔥 게시물 총계 정보 */}
      <div className="text-center py-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          팔로잉 피드에서 <strong>{posts.length}</strong>개의 게시물
          {hasMore && <span className="ml-1">• 더 많은 게시물이 있습니다</span>}
          {nextCursor && <span className="ml-1">• 다음 커서: {nextCursor}</span>}
        </p>
      </div>

      {/* 🔥 상단으로 스크롤 버튼 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 md:bottom-8 md:right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50"
        >
          <ArrowUpIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

const TimelinePage: React.FC = () => {
  // 🏗️ 올바른 아키텍처: Zustand 스토어에서 인증 상태 관리
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<BackendUserInfo | null>(null);

  // ============================================================================
  // 🔥 현재 사용자 정보 로드 (백엔드에 API 없으므로 auth store만 사용)
  // ============================================================================

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!isAuthenticated || !user) return;

      try {
        // 백엔드에 사용자 정보 API가 없으므로 auth store 정보만 사용
        console.log('백엔드에 사용자 정보 API가 없으므로 auth store 정보 사용');
        setCurrentUserInfo({
          userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
          accountName: (user as any)?.accountName || user.email?.split('@')[0] || 'user',
          userName: user.name || user.email || 'User',
          userEmail: user.email || 'user@example.com',
          profileImage: (user as any)?.profileImage,
        });
      } catch (error) {
        console.warn('현재 사용자 정보 설정 실패:', error);
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
      current: true, // 현재 페이지
      showLabel: false
    },
    {
      name: 'Explore',
      href: '/explore',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassSolidIcon,
      current: false,
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

  // 네비게이션 핸들러
  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  // 로고 클릭 핸들러 (홈으로 이동)
  const handleLogoClick = () => {
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  // 모바일 메뉴 토글
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
  // 🔥 렌더링 조건부 처리 (완전 보호된 경로)
  // ============================================================================

  // 🏗️ 아키텍처 원칙: 인증 로딩 중
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

  // 🏗️ 아키텍처 원칙: 로그인하지 않은 경우 - 이 코드는 실행되지 않아야 함 (Middleware에서 차단)
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">팔로잉 타임라인을 보려면 로그인해 주세요.</p>
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
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${item.current
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

              {/* 네비게이션 항목들 - 모바일에서는 모든 라벨 표시 */}
              {navigationItems.map((item) => {
                const Icon = item.current ? item.activeIcon : item.icon
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 ${item.current
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

      {/* 🔥 메인 컨텐츠 */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Timeline />
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
                className={`flex flex-col items-center py-2 px-1 transition-colors ${item.current
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

export default TimelinePage
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useRouter } from 'next/navigation';
import { 
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import { HeartIcon } from '@heroicons/react/24/outline';

// ✅ 백엔드 API 연동
import { 
  getUserFeeds, 
  getFollowStats,
  toggleFeedLike,
  getCurrentUser,
  handleApiError 
} from '@/lib/api/feed';
import { CanvasFeedItem } from '@/lib/types/feed';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function MyPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // ✅ 백엔드 연동 상태
  const [feeds, setFeeds] = useState<CanvasFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{ createdAt: string; feedId: number } | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 네비게이션 메뉴 항목들
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
      current: false,
      showLabel: false
    },
    {
      name: 'My Profile',
      href: '/my',
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      current: true, // 현재 페이지
      showLabel: false
    },
    {
      name: 'My Room',
      href: '/myroom',
      icon: CalendarIcon,
      activeIcon: CalendarSolidIcon,
      current: false,
      showLabel: true
    }
  ];

  // ✅ 내 피드의 게시물들 로드
  useEffect(() => {
    const loadMyFeedPosts = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // 내 피드의 게시물들 조회 (사용자당 1개 피드 원칙)
        const feedsResult = await getUserFeeds(Number(user.id), undefined, undefined, 20);
        
        if (feedsResult.success && feedsResult.data) {
          setFeeds(feedsResult.data.items); // 실제로는 "게시물들"
          setHasMore(feedsResult.data.hasMore);
          setNextCursor(feedsResult.data.nextCursor || null);
        } else {
          // 피드가 없으면 빈 배열로 설정 (에러가 아님)
          setFeeds([]);
          setHasMore(false);
          setNextCursor(null);
        }

        // 팔로우 통계 조회
        const statsResult = await getFollowStats(user.id.toString());
        if (statsResult.success && statsResult.data) {
          setFollowStats(statsResult.data);
        }
        
      } catch (error) {
        console.error('Failed to load my feed posts:', error);
        setError(handleApiError(error));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAuthenticated && user) {
      loadMyFeedPosts();
    }
  }, [isAuthenticated, user]);

  // ✅ 더 많은 게시물 로드
  const loadMorePosts = async () => {
    if (!user?.id || !hasMore || !nextCursor || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const result = await getUserFeeds(
        Number(user.id), 
        nextCursor.createdAt, 
        nextCursor.feedId, 
        20
      );
      
      if (result.success && result.data) {
        setFeeds(prev => [...prev, ...result.data!.items]); // 게시물들 추가
        setHasMore(result.data.hasMore);
        setNextCursor(result.data.nextCursor || null);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // ✅ 게시물 좋아요 토글
  const handleLike = async (post: CanvasFeedItem) => {
    try {
      const result = await toggleFeedLike(Number(post.photoId));
      
      if (result.success && result.data !== undefined) {
        // 게시물 목록에서 좋아요 상태 업데이트
        setFeeds(prev => prev.map(p => 
          p.id === post.id 
            ? { ...p, isLiked: result.data!.isLiked }
            : p
        ));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // 네비게이션 핸들러
  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // 게시물 상세 페이지로 이동
  const handlePostClick = (postId: string) => {
    router.push(`/feed/${postId}`);
  };

  // 새 게시물 만들기
  const handleCreatePost = () => {
    router.push('/myroom'); // 사진 선택을 위해 myroom으로 이동
  };

  // 로딩 상태
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">내 게시물을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-4">내 페이지를 보려면 로그인해 주세요.</p>
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
      {/* 네비게이션 헤더 */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* MyDiary 브랜드 */}
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
                      {item.showLabel && <span>{item.name}</span>}
                    </button>
                  );
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

        {/* 모바일 네비게이션 메뉴 */}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={user.profileImage || `/api/placeholder/80/80?seed=${user.id}`}
                alt={user.name || 'User'}
                className="h-20 w-20 rounded-full"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.name || 'User'}의 피드</h1>
                <p className="text-gray-500">{user.email || 'user@example.com'}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-600">
                    <strong>{feeds.length}</strong> 게시물
                  </span>
                  <span className="text-sm text-gray-600">
                    <strong>{followStats.followersCount}</strong> 팔로워
                  </span>
                  <span className="text-sm text-gray-600">
                    <strong>{followStats.followingCount}</strong> 팔로잉
                  </span>
                </div>
              </div>
            </div>
            
            {/* 새 게시물 만들기 버튼 */}
            <button
              onClick={handleCreatePost}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              새 게시물 만들기
            </button>
          </div>
        </div>

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-red-600 hover:text-red-800 font-medium"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 게시물 목록 */}
        {feeds.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <UserIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
            <p className="text-gray-500 mb-6">첫 번째 게시물을 만들어보세요!</p>
            <button
              onClick={handleCreatePost}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              첫 게시물 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feeds.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePostClick(post.id)}
              >
                {/* 게시물 이미지 */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={post.photoUrl || post.backgroundImageUrl || `/api/placeholder/300/300?seed=${post.id}`}
                    alt={post.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* 좋아요 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white/90 transition-colors"
                  >
                    {post.isLiked ? (
                      <HeartSolidIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                </div>

                {/* 게시물 정보 */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-1 truncate">{post.name}</h3>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{post.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-2">
                      {post.isLiked && (
                        <span className="flex items-center">
                          <HeartSolidIcon className="h-3 w-3 text-red-500 mr-1" />
                          좋아요
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 더 보기 버튼 */}
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={loadMorePosts}
              disabled={isLoadingMore}
              className="inline-flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {isLoadingMore ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  로딩 중...
                </>
              ) : (
                '더 보기'
              )}
            </button>
          </div>
        )}
      </main>

      {/* 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className={`grid grid-cols-${navigationItems.length} py-2`}>
          {navigationItems.map((item) => {
            const Icon = item.current ? item.activeIcon : item.icon;
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
            );
          })}
        </div>
      </div>

      {/* 모바일 하단 네비게이션 공간 확보 */}
      <div className="md:hidden h-20"></div>
    </div>
  );
}
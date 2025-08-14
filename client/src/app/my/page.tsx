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
  CogIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import { HeartIcon } from '@heroicons/react/24/outline';

// ============================================================================
// 🔥 백엔드 API 연동 - 정확한 타입 정의
// ============================================================================
import api from '@/lib/axios'

// 백엔드 API 응답 타입
interface ApiResponse<T> {
  error: boolean
  message: string
  data: T
}

// 🔥 수정: 백엔드 PostResponse 타입에 맞춤
interface PostResponse {
  postId: number
  photoId: number
  imgUrl: string
  caption: string
  displayOrder: number
  createdAt: string
  likeCount: number
  isLikedByMe: boolean
  authorId: number
  authorAccountName: string
  authorProfileImage: string
}

// 🔥 수정: 백엔드 FeedWithPostsResponse 타입에 맞춤
interface FeedWithPostsResponse {
  feedId: number
  userId: number
  accountName: string
  profileImage: string
  createdAt: string
  posts: PostResponse[]
  isFollowing: boolean
}

// 백엔드 FollowCountsResponse 타입
interface FollowCountsResponse {
  followerCount: number
  followingCount: number
}

// 🔥 새로 추가: 내 피드 통계 타입
interface MyFeedStatsResponse {
  postCount: number
  totalLikes: number
  followerCount: number
  followingCount: number
}

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

// ============================================================================
// 🔥 백엔드 API 함수들 - 정확한 엔드포인트 사용
// ============================================================================

// 🔥 수정: 현재 사용자의 피드 조회 (FeedController.getUserFeedByAccountName)
const getMyFeedWithPosts = async (accountName: string): Promise<FeedWithPostsResponse> => {
  try {
    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(`/feeds/users/account/${accountName}`)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch my feed:', error)
    throw error
  }
}

// 🔥 수정: 계정명으로 팔로우 통계 조회 (FollowController.countFollow)
const getFollowStats = async (accountName: string): Promise<FollowCountsResponse> => {
  try {
    const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${accountName}`)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch follow stats:', error)
    throw error
  }
}

// 🔥 수정: 게시물 좋아요 토글 (LikesController.likePost/unlikePost)
const togglePostLike = async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
  try {
    if (isCurrentlyLiked) {
      // 좋아요 취소
      await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`)
    } else {
      // 좋아요 추가
      await api.post<ApiResponse<void>>(`/likes/posts/${postId}`)
    }
  } catch (error: any) {
    console.error('Failed to toggle like:', error)
    throw error
  }
}

// 🔥 수정: 게시물 상세 조회 (FeedController.getPostDetail)
const getPostDetail = async (postId: number): Promise<any> => {
  try {
    const response = await api.get<ApiResponse<any>>(`/feeds/posts/${postId}`)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch post detail:', error)
    throw error
  }
}

export default function MyPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 🔥 수정: 상태 타입 변경
  const [myFeed, setMyFeed] = useState<FeedWithPostsResponse | null>(null);
  const [followStats, setFollowStats] = useState({ followerCount: 0, followingCount: 0 });
  const [loading, setLoading] = useState({ initial: true, loadMore: false });
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // 🔥 백엔드 데이터 로딩 - 수정된 API 사용
  // ============================================================================

  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated || !user) return;

      try {
        setLoading({ initial: true, loadMore: false });
        setError(null);

        // 🔥 수정: accountName 사용
        const accountName = (user as any)?.accountName || user.email?.split('@')[0] || 'user';

        // 병렬로 데이터 로드
        const [feedResult, statsResult] = await Promise.all([
          getMyFeedWithPosts(accountName),
          getFollowStats(accountName)
        ]);

        setMyFeed(feedResult);
        setFollowStats({
          followerCount: statsResult.followerCount,
          followingCount: statsResult.followingCount
        });

        console.log('내 데이터 로드 완료:', {
          postsCount: feedResult.posts.length,
          stats: statsResult
        });

      } catch (error: any) {
        console.error('데이터 로드 실패:', error);
        
        // 백엔드 에러 메시지 처리
        let errorMessage = '데이터를 불러오는데 실패했습니다.';
        if (error?.response?.status === 401) {
          errorMessage = '로그인이 필요합니다.';
          router.push('/login');
          return;
        } else if (error?.response?.status === 403) {
          errorMessage = '접근 권한이 없습니다.';
        } else if (error?.response?.status === 404) {
          errorMessage = '피드를 찾을 수 없습니다. 첫 게시물을 만들어보세요!';
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
      } finally {
        setLoading({ initial: false, loadMore: false });
      }
    };

    loadUserData();
  }, [isAuthenticated, user, router]);

  // ============================================================================
  // 🔥 이벤트 핸들러들 - 수정된 API 사용
  // ============================================================================

  // 🔥 수정: 게시물 좋아요 토글
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
      await togglePostLike(post.postId, post.isLikedByMe);
      
      console.log(`좋아요 ${post.isLikedByMe ? '취소' : '추가'} 완료:`, post.postId);
      
    } catch (error: any) {
      console.error('좋아요 처리 실패:', error);
      
      // 실패 시 롤백
      const revertedPosts = myFeed.posts.map(p => 
        p.postId === post.postId 
          ? post  // 원래 상태로 복원
          : p
      );
      
      setMyFeed({
        ...myFeed,
        posts: revertedPosts
      });
      
      // 에러 메시지 표시
      const errorMessage = error?.response?.data?.message || '좋아요 처리에 실패했습니다.';
      alert(errorMessage);
    }
  };

  // 네비게이션
  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  // 🔥 수정: 게시물 상세로 이동
  const handlePostClick = (post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`);
  };

  // 새 게시물 만들기
  const handleCreatePost = () => {
    router.push('/myroom'); // 사진 선택을 위해 myroom으로 이동
  };

  // 프로필 설정으로 이동
  const handleProfileSettings = () => {
    router.push('/profile');
  };

  // 에러 재시도
  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };

  // 네비게이션 메뉴 항목들
  const navigationItems = [
    {
      name: 'Timeline',
      href: '/timeline',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon,
      current: false
    },
    {
      name: 'Explore',
      href: '/explore',
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
  // 🔥 렌더링 조건부 처리
  // ============================================================================

  // 로딩 상태
  if (authLoading || loading.initial) {
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
            {/* 브랜드 */}
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
                  src={(user as any)?.profileImage || user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&size=32&background=random`}
                  alt={user.name || 'User'}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {(user as any)?.userName || user.name || 'User'}
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
                  src={(user as any)?.profileImage || user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&size=40&background=random`}
                  alt={user.name || 'User'}
                  className="h-10 w-10 rounded-full"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {(user as any)?.userName || user.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(user as any)?.userEmail || user.email || 'user@example.com'}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={myFeed?.profileImage || (user as any)?.profileImage || user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&size=80&background=random`}
                alt={user.name || 'User'}
                className="h-20 w-20 rounded-full"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {(user as any)?.userName || user.name || 'User'}의 피드
                </h1>
                <p className="text-gray-500">
                  @{myFeed?.accountName || (user as any)?.accountName || 'user'}
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-600">
                    <strong>{myFeed?.posts?.length || 0}</strong> 게시물
                  </span>
                  <span className="text-sm text-gray-600">
                    <strong>{followStats.followerCount}</strong> 팔로워
                  </span>
                  <span className="text-sm text-gray-600">
                    <strong>{followStats.followingCount}</strong> 팔로잉
                  </span>
                </div>
              </div>
            </div>
            
            {/* 액션 버튼들 */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleProfileSettings}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <CogIcon className="h-5 w-5 mr-2" />
                프로필 설정
              </button>
              <button
                onClick={handleCreatePost}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                새 게시물 만들기
              </button>
            </div>
          </div>

          {/* AI 보정 이미지 (있는 경우) */}
          {(user as any)?.prettyFace && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">AI 보정 이미지</h3>
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={(user as any).prettyFace}
                  alt="AI 보정된 얼굴"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-red-600 hover:text-red-800 font-medium"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 게시물 목록 */}
        {!myFeed || myFeed.posts.length === 0 ? (
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
            {myFeed.posts.map((post) => (
              <div
                key={post.postId}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePostClick(post)}
              >
                {/* 게시물 이미지 */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={post.imgUrl}
                    alt={post.caption || '게시물 이미지'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://picsum.photos/300/300?seed=${post.postId}`;
                    }}
                  />
                  
                  {/* 좋아요 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white/90 transition-colors"
                  >
                    {post.isLikedByMe ? (
                      <HeartSolidIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                </div>

                {/* 게시물 정보 */}
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.caption || '캡션 없음'}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                    <div className="flex items-center space-x-2">
                      {post.likeCount > 0 && (
                        <span className="flex items-center text-red-500">
                          <HeartSolidIcon className="h-3 w-3 mr-1" />
                          {post.likeCount}
                        </span>
                      )}
                      {post.isLikedByMe && (
                        <span className="text-blue-600 text-xs">내가 좋아함</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 py-2">
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
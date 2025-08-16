// src/app/my/page.tsx - 최종 완전 버전

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HomeIcon, MagnifyingGlassIcon, UserIcon, CalendarIcon, Bars3Icon, XMarkIcon,
  PlusIcon, CogIcon, PhotoIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon, MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon, CalendarIcon as CalendarSolidIcon, HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import { HeartIcon } from '@heroicons/react/24/outline';

import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { useFollowModal } from '@/hooks/useFollowModal';

// 타입 정의
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

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

interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

interface BackendUserInfo {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
}

// 컴포넌트들
const LoadingSpinner = ({ size = 'md', className = '', text }: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string;
  text?: string;
}) => {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

const FollowModal: React.FC<{
  isOpen: boolean;
  modalType: 'followers' | 'following';
  targetAccountName: string;
  users: any[];
  followStats: any;
  loading: boolean;
  error: string | null;
  hasNext: boolean;
  isLoadingMore: boolean;
  onClose: () => void;
  onLoadMore: () => void;
  onUserClick: (accountName: string) => void;
  onToggleFollow: (accountName: string) => void;
  clearError: () => void;
  currentUser?: any;
}> = ({
  isOpen, modalType, targetAccountName, users, followStats, loading, error,
  hasNext, isLoadingMore, onClose, onLoadMore, onUserClick, onToggleFollow, clearError, currentUser
}) => {
  if (!isOpen) return null;

  const title = modalType === 'followers' ? '팔로워' : '팔로잉';
  const count = modalType === 'followers' ? followStats?.followerCount : followStats?.followingCount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">@{targetAccountName} • {count || 0}명</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text={`${title} 목록을 불러오는 중...`} />
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2">오류가 발생했습니다</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button onClick={clearError} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                다시 시도
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 px-4">
              <UserIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {modalType === 'followers' ? '아직 팔로워가 없습니다' : '아직 팔로잉하는 사용자가 없습니다'}
              </h3>
              <p className="text-gray-500">
                {modalType === 'followers' ? '첫 번째 팔로워를 기다려보세요!' : '관심 있는 사용자를 팔로우해보세요!'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <button onClick={() => onUserClick(user.accountName)} className="flex items-center space-x-3 flex-1 text-left">
                    <img
                      src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&size=40&background=random`}
                      alt={user.displayName}
                      className="h-10 w-10 rounded-full ring-2 ring-gray-100"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&size=40&background=random`;
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{user.displayName}</p>
                      <p className="text-sm text-gray-500">@{user.accountName}</p>
                    </div>
                  </button>

                  {currentUser && user.accountName !== currentUser.accountName && (
                    <button
                      onClick={() => onToggleFollow(user.accountName)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                        user.isFollowing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {user.isFollowing ? '언팔로우' : '팔로우'}
                    </button>
                  )}
                </div>
              ))}

              {hasNext && (
                <div className="text-center pt-4">
                  <button
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <LoadingSpinner size="sm" className="inline-block mr-2" />
                        로딩 중...
                      </>
                    ) : (
                      '더 보기'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// API 함수들
const myPageAPI = {
  getUserFeedWithPosts: async (accountName: string, limit: number = 20, cursor?: number): Promise<FeedWithPostsResponse> => {
    try {
      const params: any = { limit };
      if (cursor) params.cursor = cursor;
      
      const response = await api.get<ApiResponse<FeedWithPostsResponse>>(`/feeds/users/account/${accountName}`, { params });
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '피드를 가져올 수 없습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('❌ 피드 조회 실패:', error);
      throw error;
    }
  },

  getFollowStats: async (accountName: string): Promise<FollowCountsResponse> => {
    try {
      const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${accountName}`);
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '팔로우 통계를 가져올 수 없습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('❌ 팔로우 통계 조회 실패:', error);
      throw error;
    }
  },

  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    try {
      if (isCurrentlyLiked) {
        await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`);
      } else {
        await api.post<ApiResponse<void>>(`/likes/posts/${postId}`);
      }
    } catch (error) {
      console.error('❌ 좋아요 처리 실패:', error);
      throw error;
    }
  },

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

// 메인 컨텐츠 컴포넌트
const MyPageContent: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();
  const followModal = useFollowModal();
  
  const [currentUser, setCurrentUser] = useState<BackendUserInfo | null>(null);
  const [myFeed, setMyFeed] = useState<FeedWithPostsResponse | null>(null);
  const [followStats, setFollowStats] = useState<FollowCountsResponse>({ followerCount: 0, followingCount: 0 });
  const [loading, setLoading] = useState({ initial: true, loadMore: false, userInfo: false });
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const loadUserData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(prev => ({ ...prev, initial: true }));
      setError(null);

      const userInfo: BackendUserInfo = {
        userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
        accountName: (user as any)?.accountName || user.email?.split('@')[0] || 'user',
        userName: user.name || user.email || 'User',
        userEmail: user.email || 'user@example.com',
        profileImage: (user as any)?.profileImage,
        prettyFace: (user as any)?.prettyFace,
      };
      
      setCurrentUser(userInfo);

      const [feedResult, statsResult] = await Promise.allSettled([
        myPageAPI.getUserFeedWithPosts(userInfo.accountName, 20),
        myPageAPI.getFollowStats(userInfo.accountName)
      ]);

      if (feedResult.status === 'fulfilled') {
        setMyFeed(feedResult.value);
        setHasMore(feedResult.value.hasNext);
        setNextCursor(feedResult.value.nextCursor);
      } else {
        setMyFeed({
          feedId: 0, userId: userInfo.userId, accountName: userInfo.accountName,
          profileImage: userInfo.profileImage || null, createdAt: new Date().toISOString(),
          posts: [], isFollowing: false, hasNext: false, nextCursor: null
        });
        setHasMore(false);
        setNextCursor(null);
      }

      if (statsResult.status === 'fulfilled') {
        setFollowStats(statsResult.value);
      } else {
        setFollowStats({ followerCount: 0, followingCount: 0 });
      }

    } catch (error: any) {
      console.error('❌ 데이터 로딩 실패:', error);
      let errorMessage = '데이터를 불러오는데 실패했습니다.';
      
      if (error.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.';
        try {
          await useAuthStore.getState().logout();
        } catch (logoutError) {
          useAuthStore.getState().clearTokens();
        }
        router.push('/login');
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const loadMorePosts = useCallback(async () => {
    if (!currentUser || !hasMore || loading.loadMore || !nextCursor) return;

    try {
      setLoading(prev => ({ ...prev, loadMore: true }));
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
    } catch (error: any) {
      alert(error?.response?.data?.message || '추가 게시물을 불러오는데 실패했습니다.');
    } finally {
      setLoading(prev => ({ ...prev, loadMore: false }));
    }
  }, [currentUser, hasMore, loading.loadMore, nextCursor]);

  const handleLike = async (post: PostResponse) => {
    if (!myFeed) return;

    try {
      const updatedPosts = myFeed.posts.map(p => 
        p.postId === post.postId 
          ? { ...p, isLikedByMe: !p.isLikedByMe, likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      );
      
      setMyFeed({ ...myFeed, posts: updatedPosts });
      await myPageAPI.togglePostLike(post.postId, post.isLikedByMe);
    } catch (error: any) {
      const revertedPosts = myFeed.posts.map(p => p.postId === post.postId ? post : p);
      setMyFeed({ ...myFeed, posts: revertedPosts });
      alert(error?.response?.data?.message || '좋아요 처리에 실패했습니다.');
    }
  };

  const handleViewFollowers = () => {
    const accountName = currentUser?.accountName || displayUser?.accountName;
    if (accountName) followModal.openFollowerModal(accountName);
  };

  const handleViewFollowing = () => {
    const accountName = currentUser?.accountName || displayUser?.accountName;
    if (accountName) followModal.openFollowingModal(accountName);
  };

  const handleModalUserClick = (accountName: string) => {
    followModal.closeModal();
    router.push(`/profile/${accountName}`);
  };

  const displayUser = currentUser || (user ? {
    userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
    accountName: (user as any)?.accountName || user.email?.split('@')[0] || 'user',
    userName: user.name || user.email || 'User',
    userEmail: user.email || 'user@example.com',
    profileImage: (user as any)?.profileImage,
    prettyFace: (user as any)?.prettyFace,
  } : null);

  if (loading.initial) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" text="내 게시물을 불러오는 중..." />
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
            <button onClick={() => { setError(null); loadUserData(); }} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              다시 시도
            </button>
            <button onClick={() => router.push('/explore')} className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              탐색 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
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

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-4 sm:mb-0">
                    <h1 className="text-2xl font-bold text-gray-900 truncate">{displayUser?.userName || 'User'}</h1>
                    <p className="text-gray-500 text-lg">@{displayUser?.accountName || 'user'}</p>
                    {displayUser?.userEmail && <p className="text-gray-400 text-sm mt-1">{displayUser.userEmail}</p>}
                  </div>

                  <div className="flex items-center space-x-3">
                    <button onClick={() => router.push('/myroom')} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                      <PlusIcon className="h-4 w-4" />
                      <span>새 게시물</span>
                    </button>
                    <button onClick={() => router.push('/profile')} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">
                      <CogIcon className="h-4 w-4" />
                      <span>설정</span>
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{myFeed?.posts.length || 0}</div>
                    <div className="text-sm text-gray-500">게시물</div>
                  </div>
                  <button onClick={handleViewFollowers} className="hover:bg-gray-50 rounded-lg p-2 transition-colors">
                    <div className="text-2xl font-bold text-gray-900">{followStats.followerCount}</div>
                    <div className="text-sm text-gray-500">팔로워</div>
                  </button>
                  <button onClick={handleViewFollowing} className="hover:bg-gray-50 rounded-lg p-2 transition-colors">
                    <div className="text-2xl font-bold text-gray-900">{followStats.followingCount}</div>
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
              <div className="text-sm text-gray-500">총 {myFeed?.posts.length || 0}개</div>
            </div>

            {(!myFeed?.posts || myFeed.posts.length === 0) && (
              <div className="text-center py-12">
                <PhotoIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
                <p className="text-gray-500 mb-6">첫 번째 게시물을 만들어보세요!</p>
                <button onClick={() => router.push('/myroom')} className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  <PlusIcon className="h-5 w-5" />
                  <span>첫 게시물 만들기</span>
                </button>
              </div>
            )}

            {myFeed?.posts && myFeed.posts.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {myFeed.posts.map((post) => (
                    <div key={post.postId} className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                         onClick={() => router.push(`/feeds/posts/${post.postId}`)}>
                      <div className="aspect-square bg-gray-100">
                        <img src={post.imgUrl} alt={post.caption || '게시물 이미지'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                             onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=Image+Not+Found'; }} />
                      </div>

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

                      <div className="p-4">
                        {post.caption && <p className="text-sm text-gray-700 line-clamp-2 mb-2">{post.caption}</p>}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button onClick={(e) => { e.stopPropagation(); handleLike(post); }}
                                    className={`p-1 rounded-full transition-colors ${post.isLikedByMe ? 'text-red-600 hover:text-red-700' : 'text-gray-400 hover:text-red-600'}`}>
                              {post.isLikedByMe ? <HeartSolidIcon className="h-5 w-5" /> : <HeartIcon className="h-5 w-5" />}
                            </button>
                            <span className="text-sm text-gray-500">{post.likeCount}</span>
                          </div>
                          <div className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString('ko-KR')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center">
                    <button onClick={loadMorePosts} disabled={loading.loadMore}
                            className="inline-flex items-center space-x-2 px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading.loadMore ? (<><LoadingSpinner size="sm" /><span>로딩 중...</span></>) : <span>더 보기</span>}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <FollowModal
        isOpen={followModal.isOpen}
        modalType={followModal.modalType}
        targetAccountName={followModal.targetAccountName}
        users={followModal.users}
        followStats={followModal.followStats}
        loading={followModal.loading}
        error={followModal.error}
        hasNext={followModal.hasNext}
        isLoadingMore={followModal.isLoadingMore}
        onClose={followModal.closeModal}
        onLoadMore={followModal.loadMoreUsers}
        onUserClick={handleModalUserClick}
        onToggleFollow={followModal.toggleFollow}
        clearError={followModal.clearError}
        currentUser={displayUser}
      />
    </>
  );
};

// 메인 페이지 컴포넌트
const MyPage: React.FC = () => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: 'Timeline', href: '/timeline', icon: HomeIcon, activeIcon: HomeSolidIcon, current: false, showLabel: false },
    { name: 'Explore', href: '/explore', icon: MagnifyingGlassIcon, activeIcon: MagnifyingGlassSolidIcon, current: false, showLabel: false },
    { name: 'My Profile', href: '/my', icon: UserIcon, activeIcon: UserSolidIcon, current: true, showLabel: false },
    { name: 'My Room', href: '/myroom', icon: CalendarIcon, activeIcon: CalendarSolidIcon, current: false, showLabel: false }
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  const displayUser = user ? {
    userId: typeof user.id === 'string' ? parseInt(user.id) : user.id,
    accountName: (user as any)?.accountName || user.email?.split('@')[0] || 'user',
    userName: user.name || user.email || 'User',
    userEmail: user.email || 'user@example.com',
    profileImage: (user as any)?.profileImage,
  } : null;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="인증 확인 중..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">내 페이지를 보려면 로그인해 주세요.</p>
          <button onClick={() => router.push('/login')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
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
            <div className="flex items-center">
              <button onClick={handleLogoClick} className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                📖 NearZoom
              </button>
            </div>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.map((item) => {
                  const Icon = item.current ? item.activeIcon : item.icon;
                  return (
                    <button key={item.name} onClick={() => handleNavigation(item.href)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                              item.current ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`} title={item.name}>
                      <Icon className="h-5 w-5" />
                      {item.showLabel && <span>{item.name}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 사용자 정보 & 설정 (데스크톱) */}
            <div className="hidden md:flex items-center space-x-4">
              <button onClick={() => router.push('/profile')} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors" title="프로필 설정">
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
                <span className="text-sm font-medium text-gray-700">{displayUser?.userName || 'User'}</span>
              </div>
            </div>

            {/* 모바일 메뉴 버튼 */}
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors">
                {isMobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
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
                  className="h-10 w-10 rounded-full ring-2 ring-gray-100"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.userName || 'User')}&size=40&background=random`;
                  }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{displayUser?.userName || 'User'}</div>
                  <div className="text-xs text-gray-500">@{displayUser?.accountName || 'user'}</div>
                </div>
                <button onClick={() => { router.push('/profile'); setIsMobileMenuOpen(false); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <CogIcon className="h-5 w-5" />
                </button>
              </div>

              {/* 네비게이션 항목들 - 모바일에서는 모든 라벨 표시 */}
              {navigationItems.map((item) => {
                const Icon = item.current ? item.activeIcon : item.icon;
                return (
                  <button key={item.name} onClick={() => handleNavigation(item.href)}
                          className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 ${
                            item.current ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}>
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}

              {/* 홈으로 가기 버튼 추가 */}
              <button onClick={handleLogoClick} className="w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <HomeIcon className="h-5 w-5" />
                <span>Home</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MyPageContent />
        </div>
      </main>

      {/* 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 py-2">
          {navigationItems.map((item) => {
            const Icon = item.current ? item.activeIcon : item.icon;
            return (
              <button key={item.name} onClick={() => handleNavigation(item.href)}
                      className={`flex flex-col items-center py-2 px-1 transition-colors ${
                        item.current ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                      }`}>
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
};

export default MyPage;
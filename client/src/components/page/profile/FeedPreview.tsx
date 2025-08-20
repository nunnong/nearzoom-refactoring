// =============================================================================
// 📁 FeedPreview.tsx - 인증된 사용자 전용 + 완전한 백엔드 연동 버전
// =============================================================================

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { 
  EyeIcon, 
  PencilSquareIcon, 
  HeartIcon, 
  ShareIcon, 
  UsersIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  LockClosedIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 연동
import api from '@/lib/axios'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 완전 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 PostResponse.java 기반 (백엔드와 100% 일치)
interface PostResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string | null;
  displayOrder: number | null;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
}

// 🔥 FeedWithPostsResponse.java 기반
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

// 🔥 FollowCountsResponse.java 기반
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// 🔥 PostListResponse.java 타입
interface PostListResponse {
  posts: PostResponse[];
  hasNext: boolean;
  nextCursor: number | null;
}

// FeedPreview 컴포넌트용 통합 타입
interface UserFeedData {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  name: string;
  description?: string;
  isPublic: boolean;
  posts: PostResponse[];
  isFollowing: boolean;
  followersCount: number;
  likesCount: number;
  totalHeight: number;
  createdAt: string;
  updatedAt: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  hasMorePosts: boolean;
  nextPostCursor: number | null;
  isLoadingMore: boolean;
}

interface FeedPreviewProps {
  feed: UserFeedData;
  isOwnFeed: boolean;
  onLikeChange?: (isLiked: boolean, likesCount: number) => void;
  onFollowChange?: (isFollowing: boolean, followersCount: number) => void;
  onFeedUpdate?: (updatedFeed: UserFeedData) => void;
  showActions?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  enableAutoRefresh?: boolean;
  previewPostLimit?: number;
  enableInfiniteScroll?: boolean;
}

// 프리뷰 요소 타입 정의
interface PreviewElement {
  id: string;
  type: 'photo' | 'text' | 'sticker';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  imageUrl?: string;
}

// ============================================================================
// 백엔드 API 함수들 (완전한 인증 처리)
// ============================================================================

const feedPreviewAPI = {
  getUserFeedWithPosts: async (
    accountName: string, 
    limit: number = 10, 
    cursor?: number
  ): Promise<FeedWithPostsResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      `/feeds/user/account/${accountName}`,
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '피드 정보를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 사용자 피드:', response.data.data);
    return response.data.data;
  },

  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    if (isCurrentlyFollowing) {
      console.log('🔥 API 요청 - DELETE /follows/' + accountName);
      const response = await api.delete<ApiResponse<void>>(`/follows/${accountName}`);
      if (response.data.error) {
        throw new Error(response.data.message || '언팔로우에 실패했습니다.');
      }
    } else {
      console.log('🔥 API 요청 - POST /follows/' + accountName);
      const response = await api.post<ApiResponse<void>>(`/follows/${accountName}`);
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우에 실패했습니다.');
      }
    }
    console.log('🔥 API 응답 - 팔로우 토글 완료');
  },

  getFollowCounts: async (accountName: string): Promise<FollowCountsResponse> => {
    console.log('🔥 API 요청 - GET /follows/count/' + accountName);

    const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${accountName}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우 수 조회에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 팔로우 수:', response.data.data);
    return response.data.data;
  },

  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      console.log('🔥 API 요청 - DELETE /likes/posts/' + postId);
      const response = await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`);
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 취소에 실패했습니다.');
      }
    } else {
      console.log('🔥 API 요청 - POST /likes/posts/' + postId);
      const response = await api.post<ApiResponse<void>>(`/likes/posts/${postId}`);
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요에 실패했습니다.');
      }
    }
    console.log('🔥 API 응답 - 좋아요 토글 완료');
  },

  getPostLikeCount: async (postId: number): Promise<number> => {
    console.log('🔥 API 요청 - GET /likes/posts/' + postId + '/count');

    const response = await api.get<ApiResponse<number>>(`/likes/posts/${postId}/count`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '좋아요 수 조회에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 좋아요 수:', response.data.data);
    return response.data.data;
  },

  checkPostLiked: async (postId: number): Promise<boolean> => {
    console.log('🔥 API 요청 - GET /likes/posts/' + postId + '/check');

    const response = await api.get<ApiResponse<boolean>>(`/likes/posts/${postId}/check`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '좋아요 상태 확인에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 좋아요 상태:', response.data.data);
    return response.data.data;
  },
};

// ============================================================================
// 유틸리티 함수들
// ============================================================================

const createUserFeedData = (
  feedResponse: FeedWithPostsResponse, 
  followCounts?: FollowCountsResponse,
  additionalPosts?: PostResponse[]
): UserFeedData => {
  const allPosts = additionalPosts ? [...feedResponse.posts, ...additionalPosts] : feedResponse.posts;
  const totalLikes = allPosts.reduce((sum, post) => sum + (post.likeCount || 0), 0);
  
  return {
    feedId: feedResponse.feedId,
    userId: feedResponse.userId,
    accountName: feedResponse.accountName,
    profileImage: feedResponse.profileImage,
    name: feedResponse.accountName,
    description: `${allPosts.length}개의 게시물`,
    isPublic: true,
    posts: allPosts,
    isFollowing: feedResponse.isFollowing,
    followersCount: followCounts?.followerCount || 0,
    likesCount: totalLikes,
    totalHeight: allPosts.length * 100,
    createdAt: feedResponse.createdAt,
    updatedAt: allPosts.length > 0 ? allPosts[0].createdAt : feedResponse.createdAt,
    backgroundColor: '#f8fafc',
    backgroundImageUrl: allPosts[0]?.imgUrl || undefined,
    hasMorePosts: feedResponse.hasNext,
    nextPostCursor: feedResponse.nextCursor,
    isLoadingMore: false
  };
};

// ============================================================================
// 인증 보호 컴포넌트
// ============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  className?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, className = '' }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-48 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 text-sm">인증 상태를 확인하는 중...</p>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-48 text-center p-6 bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LockClosedIcon className="h-8 w-8 text-red-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          로그인이 필요합니다
        </h3>
        
        <p className="text-gray-600 mb-4 text-sm">
          피드 미리보기를 보시려면 먼저 로그인해주세요.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인하러 가기
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4 inline mr-1" />
            새로고침
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <strong>안전한 서비스:</strong> 모든 피드 기능은 로그인한 사용자만 이용할 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};

// ============================================================================
// FeedPreview 컴포넌트 (인증 보호 + 완전한 백엔드 연동)
// ============================================================================

function FeedPreview({
  feed,
  isOwnFeed,
  onLikeChange,
  onFollowChange,
  onFeedUpdate,
  showActions = true,
  size = 'md',
  className = '',
  enableAutoRefresh = true,
  previewPostLimit = 4,
  enableInfiniteScroll = false
}: FeedPreviewProps): React.ReactElement {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  
  // 상태 관리
  const [localFeed, setLocalFeed] = useState<UserFeedData>(feed);
  const [isLiking, setIsLiking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPreview, setExpandedPreview] = useState(false);

  // Props 변경 시 로컬 상태 동기화
  useEffect(() => {
    setLocalFeed(feed);
  }, [feed]);

  // 토스트 메시지 표시
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 에러 처리 (인증 관련 에러 포함)
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage = '로그인이 필요합니다.';
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('404') || err.message.includes('Not Found')) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
    showToast(errorMessage, 'error');
    
    // 인증 에러인 경우 로그인 페이지로 이동
    if (errorMessage.includes('로그인이 필요') || errorMessage.includes('권한이 없')) {
      setTimeout(() => router.push('/login'), 2000);
    }
    
    setTimeout(() => setError(null), 5000);
  }, [showToast, router]);

  // 크기별 스타일 정의
  const sizeConfig = useMemo(() => ({
    sm: {
      container: 'text-sm',
      title: 'text-base',
      preview: 'aspect-[3/2]',
      button: 'py-1.5 px-3 text-sm',
      padding: 'p-4',
    },
    md: {
      container: 'text-sm',
      title: 'text-lg',
      preview: 'aspect-[4/3]',
      button: 'py-2 px-4',
      padding: 'p-6',
    },
    lg: {
      container: 'text-base',
      title: 'text-xl',
      preview: 'aspect-[4/3]',
      button: 'py-3 px-6 text-lg',
      padding: 'p-8',
    },
  }), []);

  // 피드 새로고침 (인증 체크 포함)
  const refreshFeedData = useCallback(async () => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => router.push('/login'), 1500);
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      console.log('🔥 피드 새로고침 시작:', localFeed.accountName);

      const refreshedFeed = await feedPreviewAPI.getUserFeedWithPosts(
        localFeed.accountName,
        previewPostLimit
      );

      const followCounts = await feedPreviewAPI.getFollowCounts(localFeed.accountName);
      const updatedFeedData = createUserFeedData(refreshedFeed, followCounts);
      
      setLocalFeed(updatedFeedData);
      
      if (onFeedUpdate) {
        onFeedUpdate(updatedFeedData);
      }

      console.log('🔥 피드 새로고침 완료:', updatedFeedData);
      showToast('피드가 새로고침되었습니다!');

    } catch (err: any) {
      console.error('피드 새로고침 실패:', err);
      
      // 인증 관련 에러 처리
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '피드 새로고침');
      } else {
        handleError(err, '피드 새로고침');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [localFeed.accountName, previewPostLimit, onFeedUpdate, handleError, showToast, isAuthenticated, router]);

  // 추가 게시물 로드 (인증 체크 포함)
  const loadMorePosts = useCallback(async () => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    if (!localFeed.hasMorePosts || !localFeed.nextPostCursor || isLoadingMorePosts) {
      return;
    }

    setIsLoadingMorePosts(true);

    try {
      console.log('🔥 추가 게시물 로드 시작:', {
        accountName: localFeed.accountName,
        cursor: localFeed.nextPostCursor
      });

      const moreFeedData = await feedPreviewAPI.getUserFeedWithPosts(
        localFeed.accountName,
        previewPostLimit,
        localFeed.nextPostCursor
      );

      const updatedFeedData: UserFeedData = {
        ...localFeed,
        posts: [...localFeed.posts, ...moreFeedData.posts],
        hasMorePosts: moreFeedData.hasNext,
        nextPostCursor: moreFeedData.nextCursor,
        likesCount: localFeed.likesCount + moreFeedData.posts.reduce((sum, post) => sum + (post.likeCount || 0), 0),
        description: `${localFeed.posts.length + moreFeedData.posts.length}개의 게시물`
      };

      setLocalFeed(updatedFeedData);

      if (onFeedUpdate) {
        onFeedUpdate(updatedFeedData);
      }

      console.log('🔥 추가 게시물 로드 완료:', {
        newCount: moreFeedData.posts.length,
        totalCount: updatedFeedData.posts.length,
        hasMore: updatedFeedData.hasMorePosts
      });

    } catch (err: any) {
      console.error('추가 게시물 로드 실패:', err);
      
      // 인증 관련 에러 처리
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '추가 게시물 로드');
      } else {
        handleError(err, '추가 게시물 로드');
      }
    } finally {
      setIsLoadingMorePosts(false);
    }
  }, [
    localFeed.hasMorePosts,
    localFeed.nextPostCursor,
    localFeed.accountName,
    localFeed.posts.length,
    localFeed.likesCount,
    isLoadingMorePosts,
    previewPostLimit,
    onFeedUpdate,
    handleError,
    isAuthenticated,
    showToast
  ]);

  // 자동 새로고침 (인증된 사용자만)
  useEffect(() => {
    if (!enableAutoRefresh || !isAuthenticated) return;

    const interval = setInterval(() => {
      refreshFeedData();
    }, 60000);

    return () => clearInterval(interval);
  }, [enableAutoRefresh, refreshFeedData, isAuthenticated]);

  // 네비게이션 핸들러들
  const handleViewFullFeed = useCallback(() => {
    if (isOwnFeed) {
      router.push('/feed');
    } else {
      router.push(`/@${localFeed.accountName}`);
    }
  }, [isOwnFeed, localFeed.accountName, router]);

  const handleEditFeed = useCallback(() => {
    router.push('/feed/edit');
  }, [router]);

  // 팔로우 핸들러 (인증 체크 포함)
  const handleFollow = useCallback(async () => {
    if (isFollowing || !isAuthenticated) {
      if (!isAuthenticated) {
        showToast('로그인이 필요합니다.', 'error');
        setTimeout(() => router.push('/login'), 1500);
      }
      return;
    }

    setIsFollowing(true);
    const originalFollowing = localFeed.isFollowing;
    const originalCount = localFeed.followersCount;

    try {
      console.log('🔥 팔로우 토글 시작:', { 
        accountName: localFeed.accountName, 
        currentFollowing: originalFollowing 
      });

      const newFollowing = !originalFollowing;
      const newCount = newFollowing ? originalCount + 1 : Math.max(0, originalCount - 1);
      
      // 낙관적 업데이트
      setLocalFeed(prev => ({
        ...prev,
        isFollowing: newFollowing,
        followersCount: newCount
      }));

      // 🔥 실제 백엔드 API 호출 (자동 인증 처리)
      await feedPreviewAPI.toggleFollow(localFeed.accountName, originalFollowing);

      console.log('🔥 팔로우 토글 성공:', { 
        accountName: localFeed.accountName, 
        newFollowing 
      });

      if (onFollowChange) {
        onFollowChange(newFollowing, newCount);
      }

      showToast(newFollowing ? '팔로우했습니다!' : '언팔로우했습니다.');

    } catch (error: any) {
      console.error('팔로우/언팔로우 실패:', error);
      
      // 실패 시 롤백
      setLocalFeed(prev => ({
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      }));
      
      // 인증 관련 에러 처리
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '팔로우 토글');
      } else {
        handleError(error, '팔로우 토글');
      }
    } finally {
      setIsFollowing(false);
    }
  }, [
    isFollowing, 
    isAuthenticated, 
    localFeed.isFollowing, 
    localFeed.followersCount, 
    localFeed.accountName, 
    onFollowChange, 
    showToast, 
    handleError,
    router
  ]);

  // 좋아요 핸들러 (인증 체크 포함)
  const handleLike = useCallback(async () => {
    if (isLiking || !isAuthenticated || localFeed.posts.length === 0) {
      if (!isAuthenticated) {
        showToast('로그인이 필요합니다.', 'error');
        setTimeout(() => router.push('/login'), 1500);
      }
      return;
    }

    setIsLiking(true);
    const latestPost = localFeed.posts[0];
    const originalLiked = latestPost.isLikedByMe;
    const originalPostLikeCount = latestPost.likeCount || 0;
    const originalTotalLikesCount = localFeed.likesCount;

    try {
      console.log('🔥 게시물 좋아요 토글 시작:', { 
        postId: latestPost.postId, 
        currentLiked: originalLiked 
      });

      const newLiked = !originalLiked;
      const likeDiff = newLiked ? 1 : -1;
      const newPostLikeCount = Math.max(0, originalPostLikeCount + likeDiff);
      const newTotalLikesCount = Math.max(0, originalTotalLikesCount + likeDiff);
      
      // 낙관적 업데이트
      setLocalFeed(prev => ({
        ...prev,
        posts: prev.posts.map(post => 
          post.postId === latestPost.postId 
            ? { ...post, isLikedByMe: newLiked, likeCount: newPostLikeCount }
            : post
        ),
        likesCount: newTotalLikesCount
      }));

      // 🔥 실제 백엔드 API 호출 (자동 인증 처리)
      await feedPreviewAPI.togglePostLike(latestPost.postId, originalLiked);

      console.log('🔥 게시물 좋아요 토글 성공:', { 
        postId: latestPost.postId, 
        newLiked 
      });

      if (onLikeChange) {
        onLikeChange(newLiked, newTotalLikesCount);
      }

      showToast(newLiked ? '좋아요를 눌렀습니다!' : '좋아요를 취소했습니다.');

    } catch (error: any) {
      console.error('좋아요 처리 실패:', error);
      
      // 실패 시 롤백
      setLocalFeed(prev => ({
        ...prev,
        posts: prev.posts.map(post => 
          post.postId === latestPost.postId 
            ? { ...post, isLikedByMe: originalLiked, likeCount: originalPostLikeCount }
            : post
        ),
        likesCount: originalTotalLikesCount
      }));
      
      // 인증 관련 에러 처리
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '좋아요 토글');
      } else {
        handleError(error, '좋아요 토글');
      }
    } finally {
      setIsLiking(false);
    }
  }, [
    isLiking, 
    isAuthenticated, 
    localFeed.posts, 
    localFeed.likesCount, 
    onLikeChange, 
    showToast, 
    handleError,
    router
  ]);

  // 공유 핸들러
  const handleShare = useCallback(async () => {
    const url = isOwnFeed 
      ? `${window.location.origin}/feed` 
      : `${window.location.origin}/@${localFeed.accountName}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${localFeed.name}의 피드`,
          text: localFeed.description || `${localFeed.name}님의 피드를 확인해보세요!`,
          url: url,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showToast('링크가 클립보드에 복사되었습니다!');
      } catch (error) {
        console.error('Failed to copy URL:', error);
        showToast('링크 복사에 실패했습니다.', 'error');
      }
    }
  }, [isOwnFeed, localFeed.accountName, localFeed.name, localFeed.description, showToast]);

  // 실제 게시물 기반 프리뷰 요소들 생성
  const previewElements = useMemo((): PreviewElement[] => {
    const elements: PreviewElement[] = [];
    
    const postsToShow = localFeed.posts.slice(0, expandedPreview ? 8 : 4);
    
    postsToShow.forEach((post, index) => {
      const positions = [
        { x: 20, y: 30, width: 120, height: 80 },
        { x: 160, y: 50, width: 100, height: 120 },
        { x: 50, y: 130, width: 80, height: 60 },
        { x: 180, y: 200, width: 90, height: 70 },
        { x: 30, y: 210, width: 70, height: 50 },
        { x: 120, y: 180, width: 60, height: 80 },
        { x: 200, y: 130, width: 80, height: 60 },
        { x: 150, y: 280, width: 100, height: 70 }
      ];
      
      const pos = positions[index] || positions[index % 4];
      
      elements.push({
        id: post.postId.toString(),
        type: 'photo',
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        imageUrl: post.imgUrl
      });
    });

    // 게시물이 없는 경우 기본 요소들
    if (elements.length === 0) {
      elements.push(
        { 
          id: '1', 
          type: 'text', 
          x: 50, 
          y: 80, 
          width: 200, 
          height: 40, 
          color: 'bg-gray-100' 
        },
        { 
          id: '2', 
          type: 'sticker', 
          x: 100, 
          y: 150, 
          width: 50, 
          height: 50, 
          color: 'bg-gradient-to-br from-blue-400 to-blue-600' 
        }
      );
    }

    return elements;
  }, [localFeed.posts, expandedPreview]);

  // 수치 포맷팅
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  // 최신 게시물의 좋아요 상태 확인
  const latestPostLiked = localFeed.posts.length > 0 ? localFeed.posts[0].isLikedByMe : false;

  // ============================================================================
  // 메인 렌더링 - AuthGuard로 감싸기
  // ============================================================================

  const renderContent = () => (
    <div className={`relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md ${sizeConfig[size].container} ${className}`}>
      {/* 헤더 */}
      <div className={`${sizeConfig[size].padding} border-b border-gray-200`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className={`font-semibold text-gray-900 truncate ${sizeConfig[size].title}`}>
                {localFeed.name}
              </h3>
              {!localFeed.isPublic && (
                <LockClosedIcon className="w-4 h-4 text-gray-400" title="비공개 피드" />
              )}
              {isRefreshing && (
                <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" title="새로고침 중" />
              )}
              {user && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  @{user.accountName}로 로그인됨
                </span>
              )}
            </div>
            {localFeed.description && (
              <p className="text-gray-500 mt-1 line-clamp-2">{localFeed.description}</p>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
              {/* 새로고침 버튼 */}
              <button
                onClick={refreshFeedData}
                disabled={isRefreshing || !isAuthenticated}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title={!isAuthenticated ? "로그인이 필요합니다" : "새로고침"}
                aria-label="피드 새로고침"
              >
                <ArrowPathIcon className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* 공유 버튼 */}
              <button
                onClick={handleShare}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                title="공유"
                aria-label="피드 공유"
              >
                <ShareIcon className="w-4 h-4 text-gray-600" />
              </button>

              {/* 좋아요 버튼 (다른 사람 피드이고 게시물이 있는 경우만) */}
              {!isOwnFeed && localFeed.posts.length > 0 && (
                <button
                  onClick={handleLike}
                  disabled={isLiking || !isAuthenticated}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title={!isAuthenticated ? "로그인이 필요합니다" : latestPostLiked ? '좋아요 취소' : '좋아요'}
                  aria-label={latestPostLiked ? '좋아요 취소' : '좋아요'}
                >
                  {latestPostLiked ? (
                    <HeartSolidIcon className="w-4 h-4 text-red-500" />
                  ) : (
                    <HeartIcon className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              )}

              {/* 편집 버튼 (본인 피드인 경우만) */}
              {isOwnFeed && (
                <button
                  onClick={handleEditFeed}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                  title="피드 편집"
                  aria-label="피드 편집"
                >
                  <PencilSquareIcon className="w-4 h-4 text-gray-600" />
                </button>
              )}

              {/* 전체보기 버튼 */}
              <button
                onClick={handleViewFullFeed}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                title="전체 피드 보기"
                aria-label="전체 피드 보기"
              >
                <EyeIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 미니 피드 프리뷰 */}
      <div className={sizeConfig[size].padding}>
        <div 
          className={`relative w-full ${expandedPreview ? 'aspect-[4/5]' : sizeConfig[size].preview} rounded-lg overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-300 transition-all duration-200 hover:shadow-sm`}
          style={{
            backgroundColor: localFeed.backgroundColor || '#f8fafc',
            backgroundImage: localFeed.backgroundImageUrl ? `url(${localFeed.backgroundImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={handleViewFullFeed}
        >
          {/* 배경 오버레이 */}
          <div className="absolute inset-0 bg-white/5" />
          
          {/* 실제 게시물 기반 프리뷰 요소들 */}
          {previewElements.map((element) => (
            <div
              key={element.id}
              className={`absolute rounded shadow-sm transition-transform hover:scale-105 ${
                element.type === 'photo' 
                  ? 'bg-cover bg-center border border-white/20'
                  : element.type === 'text'
                    ? 'bg-white border border-gray-200 flex items-center justify-center text-xs text-gray-600 font-medium'
                    : element.type === 'sticker'
                      ? `bg-gradient-to-br ${element.color || 'from-yellow-300 to-yellow-500'} rounded-full`
                      : `bg-gradient-to-br ${element.color || 'from-green-400 to-green-600'} rounded`
              }`}
              style={{
                left: `${(element.x / 300) * 100}%`,
                top: `${(element.y / 300) * 100}%`,
                width: `${(element.width / 300) * 100}%`,
                height: `${(element.height / 300) * 100}%`,
                backgroundImage: element.imageUrl ? `url(${element.imageUrl})` : undefined,
              }}
            >
              {element.type === 'text' && (
                <span className="text-center">게시물</span>
              )}
            </div>
          ))}

          {/* 더 많은 게시물이 있는 경우 표시 */}
          {localFeed.posts.length > (expandedPreview ? 8 : 4) && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              +{localFeed.posts.length - (expandedPreview ? 8 : 4)}개 더
            </div>
          )}

          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center text-gray-700">
                <EyeIcon className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">전체 피드 보기</span>
              </div>
            </div>
          </div>
        </div>

        {/* 프리뷰 확장/축소 버튼 */}
        {enableInfiniteScroll && localFeed.posts.length > 4 && (
          <div className="mt-2 flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedPreview(!expandedPreview);
              }}
              className="flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ChevronDownIcon className={`w-4 h-4 mr-1 transition-transform ${expandedPreview ? 'rotate-180' : ''}`} />
              {expandedPreview ? '접기' : '더 보기'}
            </button>
          </div>
        )}

        {/* 피드 통계 */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <UsersIcon className="w-4 h-4 mr-1" />
                <span>{formatNumber(localFeed.followersCount)}</span>
              </div>
              <div className="flex items-center">
                <HeartIcon className="w-4 h-4 mr-1" />
                <span>{formatNumber(localFeed.likesCount)}</span>
              </div>
              <span>게시물 {localFeed.posts.length}개</span>
              {localFeed.hasMorePosts && (
                <span className="text-blue-500">+더 있음</span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                localFeed.isPublic 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {localFeed.isPublic ? '공개' : '비공개'}
              </span>
              {isAuthenticated && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  인증됨
                </span>
              )}
            </div>
          </div>

          {/* 최근 업데이트 */}
          <div className="text-xs text-gray-400">
            최근 업데이트: {new Date(localFeed.updatedAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>

        {/* 무한스크롤 - 더 많은 게시물 로드 버튼 */}
        {enableInfiniteScroll && localFeed.hasMorePosts && isAuthenticated && (
          <div className="mt-4">
            <button
              onClick={loadMorePosts}
              disabled={isLoadingMorePosts}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoadingMorePosts ? '로딩 중...' : '더 많은 게시물 보기'}
            </button>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      {showActions && (
        <div className={`${sizeConfig[size].padding} bg-gray-50 border-t border-gray-200`}>
          <div className="flex space-x-2">
            <button
              onClick={handleViewFullFeed}
              className={`flex-1 ${sizeConfig[size].button} bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors`}
            >
              {isOwnFeed ? '내 피드 보기' : '피드 둘러보기'}
            </button>
            
            {/* 팔로우 버튼 (다른 사람 피드인 경우만) */}
            {!isOwnFeed && isAuthenticated && (
              <button
                onClick={handleFollow}
                disabled={isFollowing}
                className={`${sizeConfig[size].button} ${
                  localFeed.isFollowing
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-white hover:bg-gray-50 text-blue-600 border border-blue-600'
                } rounded-lg font-medium transition-colors disabled:opacity-50`}
              >
                {isFollowing ? '처리중...' : localFeed.isFollowing ? '팔로잉' : '팔로우'}
              </button>
            )}

            {/* 로그인 버튼 (인증되지 않은 경우) */}
            {!isAuthenticated && (
              <button
                onClick={() => router.push('/login')}
                className={`${sizeConfig[size].button} bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors`}
              >
                로그인 필요
              </button>
            )}
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600">{error}</p>
              {error.includes('로그인이 필요') && (
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-red-700 underline hover:text-red-900 mt-1"
                >
                  로그인하러 가기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium shadow-lg transition-all duration-300">
            {toastMessage}
          </div>
        </div>
      )}

      {/* 로딩 오버레이 */}
      {(isRefreshing || isLoadingMorePosts) && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-600">
              {isRefreshing ? '새로고침 중...' : '로딩 중...'}
            </span>
          </div>
        </div>
      )}

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔥 피드프리뷰 디버그</div>
          <div>피드 ID: {localFeed.feedId}</div>
          <div>사용자: {localFeed.accountName}</div>
          <div>게시물 수: {localFeed.posts.length}</div>
          <div>팔로워: {localFeed.followersCount}</div>
          <div>총 좋아요: {localFeed.likesCount}</div>
          <div>팔로잉 상태: {localFeed.isFollowing ? 'Yes' : 'No'}</div>
          <div>본인 피드: {isOwnFeed ? 'Yes' : 'No'}</div>
          <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
          <div>사용자: {user?.accountName || 'None'}</div>
          <div>더 있음: {localFeed.hasMorePosts ? 'Yes' : 'No'}</div>
          <div>다음 커서: {localFeed.nextPostCursor || 'None'}</div>
          <div>확장됨: {expandedPreview ? 'Yes' : 'No'}</div>
          <div>로딩 중: {isRefreshing || isLoadingMorePosts ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );

  return (
    <AuthGuard className={className}>
      {renderContent()}
    </AuthGuard>
  );
}

// ============================================================================
// 🔥 헬퍼 함수 - 백엔드 응답을 UserFeedData로 변환 (인증 체크 포함)
// ============================================================================

export const convertToUserFeedData = async (
  feedResponse: FeedWithPostsResponse,
  includeFollowCounts: boolean = true
): Promise<UserFeedData> => {
  let followCounts: FollowCountsResponse | undefined;
  
  if (includeFollowCounts) {
    try {
      // 🔥 인증이 필요한 API 호출 (자동 인증 처리)
      followCounts = await feedPreviewAPI.getFollowCounts(feedResponse.accountName);
    } catch (error: any) {
      console.error('Failed to fetch follow counts:', error);
      
      // 인증 에러인 경우 에러 던지기
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      }
      
      // 기타 에러인 경우 기본값 사용
      followCounts = { followerCount: 0, followingCount: 0 };
    }
  }
  
  return createUserFeedData(feedResponse, followCounts);
};

// ============================================================================
// 🔥 커스텀 훅 - FeedPreview 상태 관리 (인증 체크 포함)
// ============================================================================

export const useFeedPreview = (initialFeed: UserFeedData) => {
  const [feed, setFeed] = useState<UserFeedData>(initialFeed);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const updateFeed = useCallback((updatedFeed: UserFeedData) => {
    setFeed(updatedFeed);
  }, []);

  const refreshFeed = useCallback(async () => {
    if (!isAuthenticated) {
      const errorMessage = '로그인이 필요합니다.';
      setError(errorMessage);
      setTimeout(() => router.push('/login'), 2000);
      throw new Error(errorMessage);
    }

    setIsLoading(true);
    setError(null);

    try {
      // 🔥 인증이 필요한 API 호출 (자동 인증 처리)
      const refreshedFeed = await feedPreviewAPI.getUserFeedWithPosts(feed.accountName, 10);
      const followCounts = await feedPreviewAPI.getFollowCounts(feed.accountName);
      const updatedFeed = createUserFeedData(refreshedFeed, followCounts);
      
      setFeed(updatedFeed);
      return updatedFeed;
    } catch (err: any) {
      let errorMessage = err instanceof Error ? err.message : '피드 새로고침에 실패했습니다.';
      
      // 인증 관련 에러 처리
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
        setTimeout(() => router.push('/login'), 2000);
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [feed.accountName, isAuthenticated, router]);

  return {
    feed,
    updateFeed,
    refreshFeed,
    isLoading,
    error,
    setError,
    isAuthenticated
  };
};

export default FeedPreview;
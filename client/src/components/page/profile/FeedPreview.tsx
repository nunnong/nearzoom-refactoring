// =============================================================================
// 📁 FeedPreview.tsx - 백엔드 완벽 연동 버전
// =============================================================================

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { EyeIcon, PencilSquareIcon, HeartIcon, ShareIcon, UsersIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon, LockClosedIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'

// 🔥 백엔드 연동 - axios 인스턴스 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의 (Java 백엔드와 완벽 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// FeedWithPostsResponse.java 기반
interface FeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  isFollowing: boolean;
}

// PostResponse.java 기반
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

// MyFeedStatsResponse.java 기반
interface MyFeedStatsResponse {
  postCount: number;
  totalLikes: number;
  followerCount: number;
  followingCount: number;
}

// FollowCountsResponse.java 기반
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// FeedPreview 컴포넌트용 통합 타입
interface UserFeedData {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  name: string; // accountName을 기본으로 사용
  description?: string;
  isPublic: boolean;
  posts: PostResponse[];
  isFollowing: boolean;
  isLiked: boolean; // 피드 자체에 대한 좋아요는 없으므로 항상 false
  followersCount: number;
  likesCount: number; // 모든 게시물의 좋아요 합계
  totalHeight: number; // posts 개수로 계산
  createdAt: string;
  updatedAt: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
}

interface FeedPreviewProps {
  feed: UserFeedData;
  isOwnFeed: boolean;
  onLikeChange?: (isLiked: boolean, likesCount: number) => void;
  onFollowChange?: (isFollowing: boolean, followersCount: number) => void;
  showActions?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================================================
// 백엔드 API 엔드포인트 상수
// ============================================================================

const FEED_ENDPOINTS = {
  USER_FEED_BY_ACCOUNT: (accountName: string) => `/feeds/users/account/${accountName}`,
  USER_FEED: (userId: number) => `/feeds/users/${userId}`,
  MY_FEED_STATS: '/feeds/my-stats', // 가정된 엔드포인트
  FOLLOW_BY_ACCOUNT: (accountName: string) => `/follows/${accountName}`,
  UNFOLLOW_BY_ACCOUNT: (accountName: string) => `/follows/${accountName}`,
  FOLLOW_COUNTS: (accountName: string) => `/follows/count/${accountName}`,
  LIKE_POST: (postId: number) => `/likes/posts/${postId}`,
  UNLIKE_POST: (postId: number) => `/likes/posts/${postId}`,
};

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const feedPreviewAPI = {
  // 🔥 POST/DELETE /follows/{accountName} - 팔로우 토글
  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    if (isCurrentlyFollowing) {
      const response = await api.delete<ApiResponse<void>>(
        FEED_ENDPOINTS.UNFOLLOW_BY_ACCOUNT(accountName)
      );
      if (response.data.error) {
        throw new Error(response.data.message || '언팔로우에 실패했습니다.');
      }
    } else {
      const response = await api.post<ApiResponse<void>>(
        FEED_ENDPOINTS.FOLLOW_BY_ACCOUNT(accountName)
      );
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우에 실패했습니다.');
      }
    }
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<FollowCountsResponse> => {
    const response = await api.get<ApiResponse<FollowCountsResponse>>(
      FEED_ENDPOINTS.FOLLOW_COUNTS(accountName)
    );
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우 수 조회에 실패했습니다.');
    }
    return response.data.data;
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 게시물 좋아요 토글
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      const response = await api.delete<ApiResponse<void>>(
        FEED_ENDPOINTS.UNLIKE_POST(postId)
      );
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 취소에 실패했습니다.');
      }
    } else {
      const response = await api.post<ApiResponse<void>>(
        FEED_ENDPOINTS.LIKE_POST(postId)
      );
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요에 실패했습니다.');
      }
    }
  },

  // 🔥 GET /feeds/users/account/{accountName} - 사용자 피드 새로고침
  refreshUserFeed: async (accountName: string): Promise<FeedWithPostsResponse> => {
    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      FEED_ENDPOINTS.USER_FEED_BY_ACCOUNT(accountName)
    );
    if (response.data.error) {
      throw new Error(response.data.message || '피드 정보를 불러올 수 없습니다.');
    }
    return response.data.data;
  }
};

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// UserFeedData를 백엔드 응답으로부터 생성하는 헬퍼 함수
const createUserFeedData = (feedResponse: FeedWithPostsResponse, followCounts?: FollowCountsResponse): UserFeedData => {
  const totalLikes = feedResponse.posts.reduce((sum, post) => sum + post.likeCount, 0);
  
  return {
    feedId: feedResponse.feedId,
    userId: feedResponse.userId,
    accountName: feedResponse.accountName,
    profileImage: feedResponse.profileImage,
    name: feedResponse.accountName,
    description: `${feedResponse.posts.length}개의 게시물`,
    isPublic: true, // 백엔드에서 조회 가능하면 공개로 간주
    posts: feedResponse.posts,
    isFollowing: feedResponse.isFollowing,
    isLiked: false, // 피드 자체 좋아요는 없음
    followersCount: followCounts?.followerCount || 0,
    likesCount: totalLikes,
    totalHeight: feedResponse.posts.length * 100, // 게시물당 100px로 가정
    createdAt: feedResponse.createdAt,
    updatedAt: feedResponse.createdAt, // 최신 게시물 날짜로 사용
    backgroundColor: '#f8fafc',
    backgroundImageUrl: feedResponse.posts[0]?.imgUrl // 첫 번째 게시물 이미지를 배경으로
  };
};

// ✅ 피드 요소 타입 정의
interface PreviewElement {
  id: string;
  type: 'photo' | 'text' | 'sticker' | 'drawing';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

// ============================================================================
// FeedPreview 컴포넌트
// ============================================================================

const FeedPreview: React.FC<FeedPreviewProps> = ({
  feed,
  isOwnFeed,
  onLikeChange,
  onFollowChange,
  showActions = true,
  size = 'md',
  className = '',
}) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isLiking, setIsLiking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [localFollowing, setLocalFollowing] = useState(feed.isFollowing);
  const [localFollowersCount, setLocalFollowersCount] = useState(feed.followersCount);
  const [localLikesCount, setLocalLikesCount] = useState(feed.likesCount);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 토스트 메시지 표시
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ✅ 크기별 스타일 정의
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

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // ✅ 네비게이션 핸들러들
  const handleViewFullFeed = useCallback(() => {
    if (isOwnFeed) {
      router.push('/feed');
    } else {
      router.push(`/profile/${feed.accountName}`);
    }
  }, [isOwnFeed, feed.accountName, router]);

  const handleEditFeed = useCallback(() => {
    router.push('/feed/edit');
  }, [router]);

  // 🔥 백엔드 연동 - 팔로우 핸들러
  const handleFollow = useCallback(async () => {
    if (isFollowing || !isAuthenticated) return;

    setIsFollowing(true);
    const originalFollowing = localFollowing;
    const originalCount = localFollowersCount;

    try {
      console.log(`=== 팔로우 토글 시작 ===`, { 
        accountName: feed.accountName, 
        currentFollowing: originalFollowing 
      });

      // 낙관적 업데이트
      const newFollowing = !originalFollowing;
      const newCount = newFollowing ? originalCount + 1 : Math.max(0, originalCount - 1);
      
      setLocalFollowing(newFollowing);
      setLocalFollowersCount(newCount);

      // 🔥 실제 백엔드 API 호출
      await feedPreviewAPI.toggleFollow(feed.accountName, originalFollowing);

      console.log(`=== 팔로우 토글 성공 ===`, { 
        accountName: feed.accountName, 
        newFollowing 
      });

      onFollowChange?.(newFollowing, newCount);
      showToast(newFollowing ? '팔로우했습니다!' : '언팔로우했습니다.');

    } catch (error) {
      console.error('팔로우/언팔로우 실패:', error);
      
      // 실패 시 롤백
      setLocalFollowing(originalFollowing);
      setLocalFollowersCount(originalCount);
      
      const errorMessage = error instanceof Error ? error.message : '팔로우 처리에 실패했습니다.';
      showToast(errorMessage);
    } finally {
      setIsFollowing(false);
    }
  }, [isFollowing, isAuthenticated, localFollowing, localFollowersCount, feed.accountName, onFollowChange, showToast]);

  // 🔥 백엔드 연동 - 좋아요 핸들러 (최신 게시물에 좋아요)
  const handleLike = useCallback(async () => {
    if (isLiking || !isAuthenticated || feed.posts.length === 0) return;

    setIsLiking(true);
    const latestPost = feed.posts[0]; // 최신 게시물
    const originalLiked = latestPost.isLikedByMe;
    const originalCount = localLikesCount;

    try {
      console.log(`=== 게시물 좋아요 토글 시작 ===`, { 
        postId: latestPost.postId, 
        currentLiked: originalLiked 
      });

      // 낙관적 업데이트
      const newLiked = !originalLiked;
      const newCount = newLiked ? originalCount + 1 : Math.max(0, originalCount - 1);
      
      setLocalLikesCount(newCount);

      // 🔥 실제 백엔드 API 호출 (최신 게시물에 좋아요)
      await feedPreviewAPI.togglePostLike(latestPost.postId, originalLiked);

      console.log(`=== 게시물 좋아요 토글 성공 ===`, { 
        postId: latestPost.postId, 
        newLiked 
      });

      onLikeChange?.(newLiked, newCount);
      showToast(newLiked ? '좋아요를 눌렀습니다!' : '좋아요를 취소했습니다.');

    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      
      // 실패 시 롤백
      setLocalLikesCount(originalCount);
      
      const errorMessage = error instanceof Error ? error.message : '좋아요 처리에 실패했습니다.';
      showToast(errorMessage);
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, isAuthenticated, feed.posts, localLikesCount, onLikeChange, showToast]);

  // ✅ 공유 핸들러
  const handleShare = useCallback(async () => {
    const url = isOwnFeed 
      ? `${window.location.origin}/feed` 
      : `${window.location.origin}/profile/${feed.accountName}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${feed.name}의 피드`,
          text: feed.description || `${feed.name}님의 피드를 확인해보세요!`,
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
        showToast('링크 복사에 실패했습니다.');
      }
    }
  }, [isOwnFeed, feed.accountName, feed.name, feed.description, showToast]);

  // ============================================================================
  // UI 렌더링 헬퍼 함수들
  // ============================================================================

  // ✅ 실제 게시물 기반 프리뷰 요소들 생성
  const previewElements = useMemo((): PreviewElement[] => {
    const elements: PreviewElement[] = [];
    
    // 실제 게시물들을 기반으로 프리뷰 요소 생성
    feed.posts.slice(0, 4).forEach((post, index) => {
      const positions = [
        { x: 20, y: 30, width: 120, height: 80 },
        { x: 160, y: 50, width: 100, height: 120 },
        { x: 50, y: 130, width: 80, height: 60 },
        { x: 180, y: 200, width: 90, height: 70 }
      ];
      
      const pos = positions[index] || positions[0];
      
      elements.push({
        id: post.postId.toString(),
        type: 'photo',
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        color: `url(${post.imgUrl})`
      });
    });

    // 게시물이 없는 경우 기본 요소들
    if (elements.length === 0) {
      elements.push(
        { id: '1', type: 'text', x: 50, y: 80, width: 200, height: 40 },
        { id: '2', type: 'sticker', x: 100, y: 150, width: 50, height: 50, color: 'from-blue-400 to-blue-600' }
      );
    }

    return elements;
  }, [feed.posts]);

  // ✅ 수치 포맷팅
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  const formatHeight = useCallback((height: number): string => {
    if (height >= 1000) return `${(height / 1000).toFixed(1)}k`;
    return height.toString();
  }, []);

  // 최신 게시물의 좋아요 상태 확인
  const latestPostLiked = feed.posts.length > 0 ? feed.posts[0].isLikedByMe : false;

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md ${sizeConfig[size].container} ${className}`}>
      {/* 헤더 */}
      <div className={`${sizeConfig[size].padding} border-b border-gray-200`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className={`font-semibold text-gray-900 truncate ${sizeConfig[size].title}`}>
                {feed.name}
              </h3>
              {!feed.isPublic && (
                <LockClosedIcon className="w-4 h-4 text-gray-400" title="비공개 피드" />
              )}
            </div>
            {feed.description && (
              <p className="text-gray-500 mt-1 line-clamp-2">{feed.description}</p>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
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
              {!isOwnFeed && feed.posts.length > 0 && (
                <button
                  onClick={handleLike}
                  disabled={isLiking || !isAuthenticated}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title={latestPostLiked ? '좋아요 취소' : '좋아요'}
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
          className={`relative w-full ${sizeConfig[size].preview} rounded-lg overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-300 transition-all duration-200 hover:shadow-sm`}
          style={{
            backgroundColor: feed.backgroundColor || '#f8fafc',
            backgroundImage: feed.backgroundImageUrl ? `url(${feed.backgroundImageUrl})` : undefined,
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
                  ? element.color?.startsWith('url(') 
                    ? 'bg-cover bg-center' 
                    : `bg-gradient-to-br ${element.color || 'from-blue-400 to-blue-600'}`
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
                backgroundImage: element.color?.startsWith('url(') ? element.color : undefined,
              }}
            >
              {element.type === 'text' && (
                <span className="text-center">게시물</span>
              )}
            </div>
          ))}

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

        {/* 피드 통계 */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <UsersIcon className="w-4 h-4 mr-1" />
                <span>{formatNumber(localFollowersCount)}</span>
              </div>
              <div className="flex items-center">
                <HeartIcon className="w-4 h-4 mr-1" />
                <span>{formatNumber(localLikesCount)}</span>
              </div>
              <span>게시물 {feed.posts.length}개</span>
            </div>
            
            <div className="flex items-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                feed.isPublic 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {feed.isPublic ? '공개' : '비공개'}
              </span>
            </div>
          </div>

          {/* 최근 업데이트 */}
          <div className="text-xs text-gray-400">
            최근 업데이트: {new Date(feed.updatedAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
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
                  localFollowing
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-white hover:bg-gray-50 text-blue-600 border border-blue-600'
                } rounded-lg font-medium transition-colors disabled:opacity-50`}
              >
                {isFollowing ? '처리중...' : localFollowing ? '팔로잉' : '팔로우'}
              </button>
            )}
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

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔥 개발 정보</div>
          <div>피드 ID: {feed.feedId}</div>
          <div>사용자: {feed.accountName}</div>
          <div>게시물 수: {feed.posts.length}</div>
          <div>팔로워: {localFollowersCount}</div>
          <div>총 좋아요: {localLikesCount}</div>
          <div>팔로잉 상태: {localFollowing ? 'Yes' : 'No'}</div>
          <div>본인 피드: {isOwnFeed ? 'Yes' : 'No'}</div>
          <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 🔥 헬퍼 함수 - 백엔드 응답을 UserFeedData로 변환
// ============================================================================

export const convertToUserFeedData = async (
  feedResponse: FeedWithPostsResponse,
  includeFollowCounts: boolean = true
): Promise<UserFeedData> => {
  let followCounts: FollowCountsResponse | undefined;
  
  if (includeFollowCounts) {
    try {
      followCounts = await feedPreviewAPI.getFollowCounts(feedResponse.accountName);
    } catch (error) {
      console.error('Failed to fetch follow counts:', error);
      followCounts = { followerCount: 0, followingCount: 0 };
    }
  }
  
  return createUserFeedData(feedResponse, followCounts);
};

export default FeedPreview;


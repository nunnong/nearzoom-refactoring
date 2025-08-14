// =============================================================================
// 📁 FeedViewer.tsx - 백엔드 완벽 연동 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  HeartIcon, 
  ShareIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartSolidIcon 
} from '@heroicons/react/24/solid'
import { useAuth } from '@/hooks/auth/useAuth'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
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

// PostDetailResponse.java 기반
interface PostDetailResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
  authorFeedId: number;
  isMyPost: boolean;
  isFollowingAuthor: boolean;
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

// MyFeedStatsResponse.java 기반
interface MyFeedStatsResponse {
  postCount: number;
  totalLikes: number;
  followerCount: number;
  followingCount: number;
}

interface FeedViewerProps {
  userId?: number;          // 특정 사용자 피드 조회용
  accountName?: string;     // 계정명으로 피드 조회용
  isMyFeed?: boolean;       // 내 피드 여부
  feedId?: number;          // 단일 게시물 조회용 (postId)
  searchQuery?: string;     // 검색어
  type?: 'timeline' | 'explore' | 'user' | 'search';
  className?: string;
}

// ============================================================================
// 백엔드 API 엔드포인트 상수 (실제 Java Controller 엔드포인트와 일치)
// ============================================================================

const FEED_ENDPOINTS = {
  // FeedController.java 기반
  EXPLORE: '/feeds/explore',
  TIMELINE: '/feeds/timeline',
  USER_FEED: (userId: number) => `/feeds/users/${userId}`,
  USER_FEED_BY_ACCOUNT: (accountName: string) => `/feeds/users/account/${accountName}`,
  POST_DETAIL: (postId: number) => `/feeds/posts/${postId}`,
  SEARCH_FEEDS: '/feeds/search',
  
  // LikesController.java 기반
  LIKE_POST: (postId: number) => `/likes/posts/${postId}`,
  UNLIKE_POST: (postId: number) => `/likes/posts/${postId}`,
  
  // FollowController.java 기반
  FOLLOW_USER: (accountName: string) => `/follows/${accountName}`,
  UNFOLLOW_USER: (accountName: string) => `/follows/${accountName}`,
  CHECK_FOLLOW: (accountName: string) => `/follows/check/${accountName}`,
};

// ============================================================================
// 백엔드 API 함수들 (실제 Java Controller 엔드포인트 사용)
// ============================================================================

const feedViewerAPI = {
  // 🔥 GET /feeds/timeline - 타임라인 조회
  getTimelinePosts: async (size: number = 20): Promise<PostResponse[]> => {
    const response = await api.get<ApiResponse<PostResponse[]>>(
      `${FEED_ENDPOINTS.TIMELINE}?size=${size}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '타임라인을 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/explore - 탐색 피드 조회
  getExplorePosts: async (size: number = 20): Promise<PostResponse[]> => {
    const response = await api.get<ApiResponse<PostResponse[]>>(
      `${FEED_ENDPOINTS.EXPLORE}?size=${size}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '탐색 피드를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/users/{userId} - 사용자 피드 조회
  getUserFeedWithPosts: async (userId: number): Promise<FeedWithPostsResponse> => {
    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      FEED_ENDPOINTS.USER_FEED(userId)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 피드를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/users/account/{accountName} - 계정명으로 사용자 피드 조회
  getUserFeedByAccountName: async (accountName: string): Promise<FeedWithPostsResponse> => {
    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      FEED_ENDPOINTS.USER_FEED_BY_ACCOUNT(accountName)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 피드를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/posts/{postId} - 단일 게시물 상세 조회
  getPostDetail: async (postId: number): Promise<PostDetailResponse> => {
    const response = await api.get<ApiResponse<PostDetailResponse>>(
      FEED_ENDPOINTS.POST_DETAIL(postId)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '게시물을 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/search - 피드 검색
  searchFeeds: async (query: string, size: number = 10): Promise<FeedWithPostsResponse[]> => {
    const response = await api.get<ApiResponse<FeedWithPostsResponse[]>>(
      `${FEED_ENDPOINTS.SEARCH_FEEDS}?query=${encodeURIComponent(query)}&size=${size}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '검색에 실패했습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 좋아요 토글
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      // DELETE /likes/posts/{postId}
      const response = await api.delete<ApiResponse<void>>(
        FEED_ENDPOINTS.UNLIKE_POST(postId)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 취소에 실패했습니다.');
      }
    } else {
      // POST /likes/posts/{postId}
      const response = await api.post<ApiResponse<void>>(
        FEED_ENDPOINTS.LIKE_POST(postId)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요에 실패했습니다.');
      }
    }
  },

  // 🔥 POST/DELETE /follows/{accountName} - 팔로우 토글
  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    if (isCurrentlyFollowing) {
      // DELETE /follows/{accountName}
      const response = await api.delete<ApiResponse<void>>(
        FEED_ENDPOINTS.UNFOLLOW_USER(accountName)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '언팔로우에 실패했습니다.');
      }
    } else {
      // POST /follows/{accountName}
      const response = await api.post<ApiResponse<void>>(
        FEED_ENDPOINTS.FOLLOW_USER(accountName)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우에 실패했습니다.');
      }
    }
  },

  // 🔥 GET /follows/check/{accountName} - 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(
        FEED_ENDPOINTS.CHECK_FOLLOW(accountName)
      );
      
      if (response.data.error) {
        return false; // 에러 시 팔로우하지 않은 것으로 간주
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to check follow status:', error);
      return false;
    }
  }
};

// ============================================================================
// LoadingSpinner 컴포넌트 (간단한 로딩 스피너)
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        className={`animate-spin ${sizeClasses[size]} text-blue-600`} 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// ============================================================================
// FeedViewer 컴포넌트 (백엔드 완벽 연동)
// ============================================================================

const FeedViewer: React.FC<FeedViewerProps> = ({ 
  userId,
  accountName, 
  isMyFeed = false,
  feedId,
  searchQuery,
  type = 'timeline',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [feedItems, setFeedItems] = useState<PostResponse[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<PostDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 토스트 메시지 표시
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ============================================================================
  // 데이터 로드 함수들
  // ============================================================================

  // 피드 목록 로드
  const loadFeeds = useCallback(async (refresh: boolean = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      let posts: PostResponse[] = [];

      console.log(`=== ${type} 피드 로딩 시작 ===`, { 
        userId, 
        accountName, 
        feedId, 
        searchQuery 
      });

      if (feedId) {
        // 🔥 단일 게시물 조회 (GET /feeds/posts/{postId})
        const postDetail = await feedViewerAPI.getPostDetail(feedId);
        // PostDetailResponse를 PostResponse 형태로 변환
        posts = [{
          postId: postDetail.postId,
          photoId: postDetail.photoId,
          imgUrl: postDetail.imgUrl,
          caption: postDetail.caption,
          displayOrder: null,
          createdAt: postDetail.createdAt,
          likeCount: postDetail.likeCount,
          isLikedByMe: postDetail.isLikedByMe,
          authorId: postDetail.authorId,
          authorAccountName: postDetail.authorAccountName,
          authorProfileImage: postDetail.authorProfileImage
        }];
      } else if (type === 'user' && accountName) {
        // 🔥 계정명으로 사용자 피드 조회 (GET /feeds/users/account/{accountName})
        const feedWithPosts = await feedViewerAPI.getUserFeedByAccountName(accountName);
        posts = feedWithPosts.posts;
      } else if (type === 'user' && userId) {
        // 🔥 userId로 사용자 피드 조회 (GET /feeds/users/{userId})
        const feedWithPosts = await feedViewerAPI.getUserFeedWithPosts(userId);
        posts = feedWithPosts.posts;
      } else if (type === 'timeline') {
        // 🔥 타임라인 조회 (GET /feeds/timeline)
        posts = await feedViewerAPI.getTimelinePosts(20);
      } else if (type === 'explore') {
        // 🔥 Explore 조회 (GET /feeds/explore)
        posts = await feedViewerAPI.getExplorePosts(20);
      } else if (type === 'search' && searchQuery) {
        // 🔥 피드 검색 (GET /feeds/search)
        const searchResults = await feedViewerAPI.searchFeeds(searchQuery, 20);
        // 검색 결과의 모든 피드의 게시물들을 합침
        posts = searchResults.flatMap(feed => feed.posts);
      }

      if (refresh) {
        setFeedItems(posts);
      } else {
        setFeedItems(prev => [...prev, ...posts]);
      }

      // 🔥 hasMore 판단 (백엔드에서 페이징 정보가 없으므로 단순하게 처리)
      if (posts.length < 20) {
        setHasMore(false);
      }

      console.log(`=== ${type} 피드 로딩 완료 ===`, {
        count: posts.length,
        posts: posts
      });

    } catch (err) {
      console.error('Failed to load feeds:', err);
      const errorMessage = err instanceof Error ? err.message : '피드를 불러오는데 실패했습니다.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [feedId, type, userId, accountName, searchQuery, showToast]);

  // 초기 로드
  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 피드 클릭 핸들러
  const handleFeedClick = useCallback(async (post: PostResponse) => {
    try {
      // 게시물 상세 정보 조회
      const postDetail = await feedViewerAPI.getPostDetail(post.postId);
      setSelectedFeed(postDetail);
    } catch (error) {
      console.error('Failed to load post detail:', error);
      showToast('게시물 상세 정보를 불러올 수 없습니다.', 'error');
      
      // 에러 시에도 기본 정보로 모달 열기
      const basicDetail: PostDetailResponse = {
        postId: post.postId,
        photoId: post.photoId,
        imgUrl: post.imgUrl,
        caption: post.caption,
        createdAt: post.createdAt,
        likeCount: post.likeCount,
        isLikedByMe: post.isLikedByMe,
        authorId: post.authorId,
        authorAccountName: post.authorAccountName,
        authorProfileImage: post.authorProfileImage,
        authorFeedId: 0, // 기본값
        isMyPost: false, // 기본값
        isFollowingAuthor: false // 기본값
      };
      setSelectedFeed(basicDetail);
    }
  }, [showToast]);

  // 🔥 백엔드 연동 - 좋아요 토글
  const handleLikeToggle = useCallback(async (post: PostResponse | PostDetailResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    const postId = post.postId;
    const originalIsLiked = post.isLikedByMe;
    const originalLikeCount = post.likeCount;

    try {
      console.log(`=== 좋아요 토글 시작 ===`, { 
        postId, 
        currentLiked: originalIsLiked 
      });

      // 낙관적 업데이트
      setFeedItems(prev => prev.map(item => 
        item.postId === postId 
          ? { 
              ...item, 
              isLikedByMe: !originalIsLiked,
              likeCount: originalIsLiked ? originalLikeCount - 1 : originalLikeCount + 1
            }
          : item
      ));

      // 선택된 피드도 업데이트
      if (selectedFeed?.postId === postId) {
        setSelectedFeed(prev => prev ? { 
          ...prev, 
          isLikedByMe: !originalIsLiked,
          likeCount: originalIsLiked ? originalLikeCount - 1 : originalLikeCount + 1
        } : null);
      }

      // 🔥 실제 백엔드 API 호출
      await feedViewerAPI.togglePostLike(postId, originalIsLiked);

      console.log(`=== 좋아요 토글 성공 ===`, { 
        postId, 
        newLiked: !originalIsLiked 
      });

      showToast(originalIsLiked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.');

    } catch (error) {
      console.error('Failed to toggle like:', error);
      
      // 실패 시 롤백
      setFeedItems(prev => prev.map(item => 
        item.postId === postId 
          ? { ...item, isLikedByMe: originalIsLiked, likeCount: originalLikeCount }
          : item
      ));

      if (selectedFeed?.postId === postId) {
        setSelectedFeed(prev => prev ? { 
          ...prev, 
          isLikedByMe: originalIsLiked,
          likeCount: originalLikeCount
        } : null);
      }

      showToast('좋아요 처리에 실패했습니다.', 'error');
    }
  }, [selectedFeed, isAuthenticated, showToast]);

  // 🔥 백엔드 연동 - 팔로우 토글
  const handleFollowToggle = useCallback(async (post: PostResponse | PostDetailResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    try {
      console.log(`=== 팔로우 토글 시작 ===`, { 
        accountName: post.authorAccountName 
      });

      // 현재 팔로우 상태 확인 (PostDetailResponse에만 있음)
      const isCurrentlyFollowing = 'isFollowingAuthor' in post ? post.isFollowingAuthor : false;

      // 🔥 실제 백엔드 API 호출
      await feedViewerAPI.toggleFollow(post.authorAccountName, isCurrentlyFollowing);
      
      console.log(`=== 팔로우 토글 성공 ===`, { 
        accountName: post.authorAccountName,
        newFollowing: !isCurrentlyFollowing
      });

      // 선택된 피드 업데이트
      if (selectedFeed?.authorAccountName === post.authorAccountName && 'isFollowingAuthor' in selectedFeed) {
        setSelectedFeed(prev => prev ? { 
          ...prev, 
          isFollowingAuthor: !isCurrentlyFollowing
        } : null);
      }

      showToast(isCurrentlyFollowing ? '언팔로우했습니다.' : '팔로우했습니다.');

    } catch (error) {
      console.error('Failed to toggle follow:', error);
      showToast('팔로우 처리에 실패했습니다.', 'error');
    }
  }, [selectedFeed, isAuthenticated, showToast]);

  // 새로고침
  const handleRefresh = useCallback(() => {
    setHasMore(true);
    loadFeeds(true);
  }, [loadFeeds]);

  // 공유 핸들러
  const handleShare = useCallback((post: PostResponse | PostDetailResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    const url = `${window.location.origin}/post/${post.postId}`;
    
    if (navigator.share) {
      navigator.share({
        title: post.caption || '게시물',
        text: `${post.authorAccountName}의 게시물`,
        url: url,
      }).catch(() => {
        // 공유 취소됨
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        showToast('링크가 클립보드에 복사되었습니다!');
      }).catch(() => {
        showToast('링크 복사에 실패했습니다.', 'error');
      });
    }
  }, [showToast]);

  // ============================================================================
  // 렌더링 함수들
  // ============================================================================

  // 피드 아이템 렌더러
  const renderFeedItem = useCallback((post: PostResponse, index: number) => {
    return (
      <div
        key={post.postId}
        className="relative group cursor-pointer bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
        onClick={() => handleFeedClick(post)}
      >
        {/* 피드 이미지 */}
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <img
            src={post.imgUrl || '/api/placeholder/400/400'}
            alt={post.caption || '게시물 이미지'}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/api/placeholder/400/400?text=Post+Image';
            }}
          />
          
          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="flex space-x-4 text-white">
              <div className="flex items-center space-x-1">
                {post.isLikedByMe ? (
                  <HeartSolidIcon className="h-6 w-6 text-red-500" />
                ) : (
                  <HeartIcon className="h-6 w-6" />
                )}
                <span>{post.likeCount}</span>
              </div>
            </div>
          </div>

          {/* 피드 타입 배지 */}
          <div className="absolute top-2 left-2">
            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              {type === 'timeline' ? '👥 타임라인' : 
               type === 'explore' ? '🎲 탐색' : 
               type === 'user' ? '👤 사용자' : '🔍 검색'}
            </span>
          </div>
        </div>

        {/* 피드 정보 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 flex-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                {post.authorProfileImage ? (
                  <img
                    src={post.authorProfileImage}
                    alt={post.authorAccountName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    {post.authorAccountName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-gray-900 truncate">
                {post.authorAccountName}
              </span>
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {new Date(post.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          
          <p className="text-sm text-gray-800 line-clamp-2 mb-2">
            {post.caption || '캡션이 없습니다'}
          </p>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center justify-between p-4 pt-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => handleLikeToggle(post, e)}
              className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
            >
              {post.isLikedByMe ? (
                <HeartSolidIcon className="h-5 w-5 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
              <span className="text-sm">{post.likeCount}</span>
            </button>
            
            <button 
              onClick={(e) => handleShare(post, e)}
              className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors"
            >
              <ShareIcon className="h-5 w-5" />
              <span className="text-sm">공유</span>
            </button>
          </div>
        </div>
      </div>
    );
  }, [handleFeedClick, handleLikeToggle, handleShare, type]);

  // ============================================================================
  // 렌더링
  // ============================================================================

  // 로딩 상태 (첫 로드)
  if (isLoading && feedItems.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 에러 상태 (첫 로드)
  if (error && feedItems.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-center ${className}`}>
        <div className="text-red-500 text-lg font-medium mb-2">오류가 발생했습니다</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => loadFeeds(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 피드가 없는 경우
  if (feedItems.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-center ${className}`}>
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📷</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          게시물이 없습니다
        </h2>
        <p className="text-gray-600 mb-4">
          {isMyFeed ? '첫 번째 게시물을 만들어보세요!' : '아직 업로드된 게시물이 없습니다.'}
        </p>
        <button 
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`h-full overflow-y-auto ${className}`}>
      {/* 헤더 정보 */}
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {type === 'timeline' ? '타임라인' : 
               type === 'explore' ? '탐색' : 
               type === 'user' ? `${accountName || '사용자'}의 게시물` : 
               type === 'search' ? `"${searchQuery}" 검색 결과` : '게시물'}
            </h1>
            <p className="text-sm text-gray-500">
              총 {feedItems.length}개의 게시물
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? '새로고침...' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 에러 경고 메시지 (부분 로드 성공) */}
      {error && feedItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 mx-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-yellow-700 underline hover:text-yellow-900"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 피드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {feedItems.map((post, index) => renderFeedItem(post, index))}
      </div>

      {/* 더 로드하기 버튼 */}
      {hasMore && feedItems.length > 0 && (
        <div className="flex justify-center p-4">
          <button
            onClick={() => loadFeeds(false)}
            disabled={isLoadingMore}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? '로딩 중...' : '더 보기'}
          </button>
        </div>
      )}

      {/* 피드 상세 모달 */}
      {selectedFeed && (
        <FeedDetailModal
          feed={selectedFeed}
          onClose={() => setSelectedFeed(null)}
          onLike={handleLikeToggle}
          onShare={handleShare}
          onFollow={handleFollowToggle}
        />
      )}

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all duration-300 ${
            toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {toastMessage.message}
          </div>
        </div>
      )}

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔥 개발 정보</div>
          <div>타입: {type}</div>
          <div>사용자 ID: {userId || 'None'}</div>
          <div>계정명: {accountName || 'None'}</div>
          <div>피드 ID: {feedId || 'None'}</div>
          <div>검색어: {searchQuery || 'None'}</div>
          <div>게시물 수: {feedItems.length}</div>
          <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
          <div>로딩: {isLoading ? 'Yes' : 'No'}</div>
          <div>에러: {error ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 피드 상세 모달 컴포넌트
// ============================================================================

interface FeedDetailModalProps {
  feed: PostDetailResponse;
  onClose: () => void;
  onLike: (feed: PostDetailResponse, e: React.MouseEvent) => void;
  onShare: (feed: PostDetailResponse, e: React.MouseEvent) => void;
  onFollow: (feed: PostDetailResponse, e: React.MouseEvent) => void;
}

const FeedDetailModal: React.FC<FeedDetailModalProps> = ({
  feed,
  onClose,
  onLike,
  onShare,
  onFollow
}) => {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex">
          {/* 피드 이미지 영역 */}
          <div className="flex-1 bg-black flex items-center justify-center min-h-[500px]">
            <img
              src={feed.imgUrl || '/api/placeholder/600/600'}
              alt={feed.caption || '게시물 이미지'}
              className="max-w-full max-h-[80vh] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/api/placeholder/600/600?text=Post+Image';
              }}
            />
          </div>
          
          {/* 피드 정보 영역 */}
          <div className="w-80 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                  {feed.authorProfileImage ? (
                    <img
                      src={feed.authorProfileImage}
                      alt={feed.authorAccountName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      {feed.authorAccountName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{feed.authorAccountName}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(feed.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 ml-2 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 피드 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-gray-700 whitespace-pre-wrap">
                {feed.caption || '캡션이 없습니다'}
              </p>

              {/* 피드 정보 */}
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">계정:</span>
                  <span className="text-gray-700">@{feed.authorAccountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">작성일:</span>
                  <span className="text-gray-700">
                    {new Date(feed.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">좋아요:</span>
                  <span className="text-gray-700">{feed.likeCount}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">게시물 ID:</span>
                  <span className="text-gray-700">{feed.postId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">사진 ID:</span>
                  <span className="text-gray-700">{feed.photoId}</span>
                </div>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={(e) => onLike(feed, e)}
                    className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
                  >
                    {feed.isLikedByMe ? (
                      <HeartSolidIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <HeartIcon className="h-6 w-6" />
                    )}
                    <span>{feed.likeCount}</span>
                  </button>
                  
                  <button 
                    onClick={(e) => onShare(feed, e)}
                    className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors"
                  >
                    <ShareIcon className="h-6 w-6" />
                    <span>공유</span>
                  </button>
                </div>

                {/* 팔로우 버튼 (본인 게시물이 아닌 경우에만) */}
                {!feed.isMyPost && (
                  <button
                    onClick={(e) => onFollow(feed, e)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      feed.isFollowingAuthor
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {feed.isFollowingAuthor ? '언팔로우' : '팔로우'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedViewer;
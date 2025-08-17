// =============================================================================
// 📁 FeedViewer.tsx - 인증된 사용자 전용 + 완전한 백엔드 연동 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  HeartIcon, 
  ShareIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  UserMinusIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartSolidIcon 
} from '@heroicons/react/24/solid'

// 🔥 인증 및 API 연동
import { useAuth } from '@/hooks/auth/useAuth'
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
  postId: number;              // 🔑 커서로 사용
  photoId: number;
  imgUrl: string;
  caption: string | null;
  displayOrder: number | null;
  createdAt: string;
  // 📊 좋아요 관련 정보
  likeCount: number;
  isLikedByMe: boolean;
  // 👤 작성자 정보
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
}

// 🔥 PostListResponse.java 기반 (마이룸과 동일한 구조)
interface PostListResponse {
  posts: PostResponse[];       // 게시물 목록
  hasNext: boolean;           // 다음 페이지 존재 여부
  nextCursor: number | null;  // 다음 커서 (마지막 postId)
}

// 🔥 PostDetailResponse.java 기반
interface PostDetailResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string | null;
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

// 🔥 FeedWithPostsResponse.java 기반
interface FeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  isFollowing: boolean;
  // 📱 마이룸 방식: 페이징 정보
  hasNext: boolean;
  nextCursor: number | null;
}

// 🔥 FeedSearchResponse.java 기반
interface FeedSearchResponse {
  feeds: FeedWithPostsResponse[];
  hasNext: boolean;
  nextCursor: number | null;
}

interface FeedViewerProps {
  userId?: number;
  accountName?: string;
  isMyFeed?: boolean;
  postId?: number;              // 단일 게시물 조회용
  searchQuery?: string;
  type?: 'timeline' | 'explore' | 'user' | 'search' | 'single';
  className?: string;
  initialLimit?: number;        // 🔥 초기 로드 개수
}

// ============================================================================
// 디바이스별 최적화된 limit 계산
// ============================================================================

const getOptimalLimit = (): number => {
  if (typeof window === 'undefined') return 20;
  
  const width = window.innerWidth;
  
  if (width < 640) return 12;      // mobile
  if (width < 1024) return 18;     // tablet  
  return 24;                       // desktop
};

// ============================================================================
// 백엔드 API 함수들 (커서 기반 무한스크롤 + 자동 인증 처리)
// ============================================================================

const feedViewerAPI = {
  // 🔥 GET /feeds/timeline?limit=20&cursor=12345 - 타임라인 조회
  getTimelinePosts: async (limit: number = 20, cursor?: number): Promise<PostListResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /feeds/timeline:', params);

    const response = await api.get<ApiResponse<PostListResponse>>(
      '/feeds/timeline',
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '타임라인을 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 타임라인:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/explore?limit=20&cursor=12345 - 탐색 피드 조회
  getExplorePosts: async (limit: number = 20, cursor?: number): Promise<PostListResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /feeds/explore:', params);

    const response = await api.get<ApiResponse<PostListResponse>>(
      '/feeds/explore',
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '탐색 피드를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 탐색 피드:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/users/{userId}?limit=20&cursor=12345 - 사용자 피드 조회
  getUserFeedWithPosts: async (userId: number, limit: number = 20, cursor?: number): Promise<FeedWithPostsResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /feeds/users/' + userId, params);

    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      `/feeds/users/${userId}`,
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 피드를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 사용자 피드:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/users/account/{accountName}?limit=20&cursor=12345 - 계정명으로 사용자 피드 조회
  getUserFeedByAccountName: async (accountName: string, limit: number = 20, cursor?: number): Promise<FeedWithPostsResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /feeds/users/account/' + accountName, params);

    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      `/feeds/users/account/${accountName}`,
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 피드를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 계정명 기반 피드:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/posts/{postId} - 단일 게시물 상세 조회
  getPostDetail: async (postId: number): Promise<PostDetailResponse> => {
    console.log('🔥 API 요청 - GET /feeds/posts/' + postId);

    const response = await api.get<ApiResponse<PostDetailResponse>>(
      `/feeds/posts/${postId}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '게시물을 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 게시물 상세:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/search?query=user&limit=10&cursor=12345 - 피드 검색
  searchFeeds: async (query: string, limit: number = 10, cursor?: number): Promise<FeedSearchResponse> => {
    const params: Record<string, any> = { query, limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /feeds/search:', params);

    const response = await api.get<ApiResponse<FeedSearchResponse>>(
      '/feeds/search',
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '검색에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 피드 검색:', response.data.data);
    return response.data.data;
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 좋아요 토글
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

  // 🔥 POST/DELETE /follows/{accountName} - 팔로우 토글
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
};

// ============================================================================
// LoadingSpinner 컴포넌트
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
// 인증 보호 컴포넌트
// ============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  className?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, className = '' }) => {
  const { isAuthenticated, isLoading, handleLogin } = useAuth();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">인증 상태를 확인하는 중...</p>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-64 text-center p-8 ${className}`}>
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <LockClosedIcon className="h-10 w-10 text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          로그인이 필요합니다
        </h2>
        
        <p className="text-gray-600 mb-6 max-w-md">
          피드를 보시려면 먼저 로그인해주세요. <br />
          로그인 후 다양한 사용자들의 게시물을 확인하고 상호작용할 수 있습니다.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleLogin}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인하러 가기
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5 inline mr-2" />
            새로고침
          </button>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
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
// FeedViewer 컴포넌트 (인증 보호 + 백엔드 완전 연동)
// ============================================================================

const FeedViewer: React.FC<FeedViewerProps> = ({ 
  userId,
  accountName, 
  isMyFeed = false,
  postId,
  searchQuery,
  type = 'timeline',
  className = '',
  initialLimit
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user, isAuthenticated, handleLogin } = useAuth();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [feedItems, setFeedItems] = useState<PostResponse[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<PostDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 현재 피드 통계
  const [feedStats, setFeedStats] = useState<{
    totalLoaded: number;
    totalLikes: number;
    hasMore: boolean;
  }>({
    totalLoaded: 0,
    totalLikes: 0,
    hasMore: false
  });

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 토스트 메시지 표시
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 최적화된 limit 계산
  const optimalLimit = useMemo(() => {
    return initialLimit || getOptimalLimit();
  }, [initialLimit]);

  // ============================================================================
  // 백엔드 API 연동 - 첫 페이지 로드 (인증 체크 포함)
  // ============================================================================

  const loadInitialFeeds = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔒 사용자가 인증되지 않음, 로딩 중단');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`=== ${type} 첫 페이지 로딩 시작 (인증된 사용자: ${user?.accountName}) ===`, { 
        userId, accountName, postId, searchQuery, limit: optimalLimit
      });

      let response: PostListResponse | FeedWithPostsResponse | FeedSearchResponse;
      let posts: PostResponse[] = [];

      if (postId) {
        // 🔥 단일 게시물 조회
        const postDetail = await feedViewerAPI.getPostDetail(postId);
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
        setHasNextPage(false);
        setNextCursor(null);
      } else if (type === 'user' && accountName) {
        // 🔥 계정명으로 사용자 피드 조회
        response = await feedViewerAPI.getUserFeedByAccountName(accountName, optimalLimit);
        posts = response.posts;
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      } else if (type === 'user' && userId) {
        // 🔥 userId로 사용자 피드 조회
        response = await feedViewerAPI.getUserFeedWithPosts(userId, optimalLimit);
        posts = response.posts;
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      } else if (type === 'timeline') {
        // 🔥 타임라인 조회
        response = await feedViewerAPI.getTimelinePosts(optimalLimit);
        posts = response.posts;
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      } else if (type === 'explore') {
        // 🔥 Explore 조회
        response = await feedViewerAPI.getExplorePosts(optimalLimit);
        posts = response.posts;
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      } else if (type === 'search' && searchQuery) {
        // 🔥 피드 검색
        response = await feedViewerAPI.searchFeeds(searchQuery, optimalLimit);
        posts = response.feeds.flatMap(feed => feed.posts);
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      }

      setFeedItems(posts);

      // 통계 업데이트
      setFeedStats({
        totalLoaded: posts.length,
        totalLikes: posts.reduce((sum, post) => sum + post.likeCount, 0),
        hasMore: hasNextPage
      });

      console.log(`=== ${type} 첫 페이지 로딩 완료 ===`, {
        count: posts.length,
        hasNext: hasNextPage,
        nextCursor
      });

    } catch (err: any) {
      console.error('첫 페이지 로딩 실패:', err);
      
      // 인증 관련 에러 처리
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        showToast('로그인이 필요합니다. 로그인 페이지로 이동합니다.', 'error');
        setTimeout(() => handleLogin(), 2000);
      } else {
        const errorMessage = err instanceof Error ? err.message : '피드를 불러오는데 실패했습니다.';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
      
      setFeedItems([]);
      setHasNextPage(false);
      setNextCursor(null);
    } finally {
      setIsLoading(false);
    }
  }, [type, userId, accountName, postId, searchQuery, optimalLimit, hasNextPage, showToast, isAuthenticated, user, handleLogin]);

  // ============================================================================
  // 백엔드 API 연동 - 다음 페이지 로드 (무한스크롤)
  // ============================================================================

  const loadMoreFeeds = useCallback(async () => {
    if (!isAuthenticated || !hasNextPage || !nextCursor || isLoadingMore || type === 'single' || postId) {
      return;
    }

    setIsLoadingMore(true);

    try {
      console.log(`=== ${type} 다음 페이지 로딩 시작 ===`, { cursor: nextCursor });

      let response: PostListResponse | FeedWithPostsResponse | FeedSearchResponse;
      let newPosts: PostResponse[] = [];

      if (type === 'user' && accountName) {
        response = await feedViewerAPI.getUserFeedByAccountName(accountName, optimalLimit, nextCursor);
        newPosts = response.posts;
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      } else if (type === 'user' && userId) {
        response = await feedViewerAPI.getUserFeedWithPosts(userId, optimalLimit, nextCursor);
        newPosts = response.posts;
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      } else if (type === 'timeline') {
        response = await feedViewerAPI.getTimelinePosts(optimalLimit, nextCursor);
        newPosts = response.posts;
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      } else if (type === 'explore') {
        response = await feedViewerAPI.getExplorePosts(optimalLimit, nextCursor);
        newPosts = response.posts;
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      } else if (type === 'search' && searchQuery) {
        response = await feedViewerAPI.searchFeeds(searchQuery, optimalLimit, nextCursor);
        newPosts = response.feeds.flatMap(feed => feed.posts);
        setHasNextPage(response.hasNext);
        setNextCursor(response.nextCursor);
      }

      // 🔥 새로운 피드들을 기존 목록에 추가
      setFeedItems(prev => [...prev, ...newPosts]);

      // 통계 업데이트
      setFeedStats(prev => ({
        totalLoaded: prev.totalLoaded + newPosts.length,
        totalLikes: prev.totalLikes + newPosts.reduce((sum, post) => sum + post.likeCount, 0),
        hasMore: hasNextPage
      }));

      console.log(`=== ${type} 다음 페이지 로딩 완료 ===`, {
        newCount: newPosts.length,
        totalCount: feedItems.length + newPosts.length,
        hasNext: hasNextPage,
        nextCursor
      });

    } catch (err: any) {
      console.error('다음 페이지 로딩 실패:', err);
      
      // 인증 관련 에러 처리
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        showToast('인증이 만료되었습니다. 다시 로그인해주세요.', 'error');
        setTimeout(() => handleLogin(), 2000);
      } else {
        showToast('추가 피드를 불러오는데 실패했습니다.', 'error');
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [type, userId, accountName, searchQuery, hasNextPage, nextCursor, isLoadingMore, optimalLimit, feedItems.length, showToast, isAuthenticated, handleLogin]);

  // ============================================================================
  // 무한스크롤 설정
  // ============================================================================

  useEffect(() => {
    if (!isAuthenticated || !hasNextPage || isLoadingMore || type === 'single' || postId) {
      return;
    }

    const loadMoreElement = loadMoreTriggerRef.current;
    if (!loadMoreElement) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          console.log('🔥 무한스크롤 트리거됨');
          loadMoreFeeds();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px',
      }
    );

    observerRef.current.observe(loadMoreElement);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isLoadingMore, type, loadMoreFeeds, isAuthenticated]);

  // ============================================================================
  // 첫 로드 및 새로고침 시 실행
  // ============================================================================

  useEffect(() => {
    loadInitialFeeds();
  }, [refreshKey, loadInitialFeeds]);

  // ============================================================================
  // 화면 크기 변경 감지 (반응형 limit)
  // ============================================================================

  useEffect(() => {
    const handleResize = () => {
      console.log('🔥 화면 크기 변경 감지, 새로고침');
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 피드 클릭 핸들러
  const handleFeedClick = useCallback(async (post: PostResponse) => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    try {
      console.log('🔥 게시물 클릭:', post.postId);
      const postDetail = await feedViewerAPI.getPostDetail(post.postId);
      setSelectedFeed(postDetail);
    } catch (error: any) {
      console.error('게시물 상세 로딩 실패:', error);
      
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        showToast('인증이 만료되었습니다. 다시 로그인해주세요.', 'error');
        setTimeout(() => handleLogin(), 2000);
      } else {
        showToast('게시물 상세 정보를 불러올 수 없습니다.', 'error');
      }
    }
  }, [showToast, isAuthenticated, handleLogin]);

  // 🔥 백엔드 연동 - 좋아요 토글 (인증 체크 포함)
  const handleLikeToggle = useCallback(async (post: PostResponse | PostDetailResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }

    const postId = post.postId;
    const originalIsLiked = post.isLikedByMe;
    const originalLikeCount = post.likeCount;

    try {
      console.log('🔥 좋아요 토글 시작:', { postId, currentLiked: originalIsLiked });

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

      if (selectedFeed?.postId === postId) {
        setSelectedFeed(prev => prev ? { 
          ...prev, 
          isLikedByMe: !originalIsLiked,
          likeCount: originalIsLiked ? originalLikeCount - 1 : originalLikeCount + 1
        } : null);
      }

      // 🔥 실제 백엔드 API 호출 (자동 인증 처리)
      await feedViewerAPI.togglePostLike(postId, originalIsLiked);

      console.log('🔥 좋아요 토글 성공:', { postId, newLiked: !originalIsLiked });
      showToast(originalIsLiked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.');

    } catch (error: any) {
      console.error('좋아요 토글 실패:', error);
      
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

      // 인증 관련 에러 처리
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        showToast('인증이 만료되었습니다. 다시 로그인해주세요.', 'error');
        setTimeout(() => handleLogin(), 2000);
      } else {
        showToast('좋아요 처리에 실패했습니다.', 'error');
      }
    }
  }, [selectedFeed, isAuthenticated, showToast, handleLogin]);

  // 🔥 백엔드 연동 - 팔로우 토글 (인증 체크 포함)
  const handleFollowToggle = useCallback(async (post: PostResponse | PostDetailResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }

    try {
      console.log('🔥 팔로우 토글 시작:', { accountName: post.authorAccountName });

      const isCurrentlyFollowing = 'isFollowingAuthor' in post ? post.isFollowingAuthor : false;

      // 🔥 실제 백엔드 API 호출 (자동 인증 처리)
      await feedViewerAPI.toggleFollow(post.authorAccountName, isCurrentlyFollowing);
      
      console.log('🔥 팔로우 토글 성공:', { 
        accountName: post.authorAccountName,
        newFollowing: !isCurrentlyFollowing
      });

      if (selectedFeed?.authorAccountName === post.authorAccountName && 'isFollowingAuthor' in selectedFeed) {
        setSelectedFeed(prev => prev ? { 
          ...prev, 
          isFollowingAuthor: !isCurrentlyFollowing
        } : null);
      }

      showToast(isCurrentlyFollowing ? '언팔로우했습니다.' : '팔로우했습니다.');

    } catch (error: any) {
      console.error('팔로우 토글 실패:', error);
      
      // 인증 관련 에러 처리
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        showToast('인증이 만료되었습니다. 다시 로그인해주세요.', 'error');
        setTimeout(() => handleLogin(), 2000);
      } else {
        showToast('팔로우 처리에 실패했습니다.', 'error');
      }
    }
  }, [selectedFeed, isAuthenticated, showToast, handleLogin]);

  // 새로고침
  const handleRefresh = useCallback(() => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }
    
    console.log('🔥 피드 새로고침 요청');
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    
    // 새로고침 상태 해제
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [isAuthenticated, showToast]);

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
        className="relative group cursor-pointer bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
        onClick={() => handleFeedClick(post)}
      >
        {/* 피드 이미지 */}
        <div className="aspect-square relative overflow-hidden">
          <img
            src={post.imgUrl || '/api/placeholder/400/400'}
            alt={post.caption || '게시물 이미지'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/api/placeholder/400/400?text=Post+Image';
            }}
          />
          
          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="flex space-x-6 text-white">
              <div className="flex items-center space-x-2">
                {post.isLikedByMe ? (
                  <HeartSolidIcon className="h-6 w-6 text-red-500" />
                ) : (
                  <HeartIcon className="h-6 w-6" />
                )}
                <span className="font-medium">{post.likeCount}</span>
              </div>
            </div>
          </div>

          {/* 피드 타입 배지 */}
          <div className="absolute top-2 left-2">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              {type === 'timeline' ? '👥 타임라인' : 
               type === 'explore' ? '🎲 탐색' : 
               type === 'user' ? '👤 사용자' : 
               type === 'search' ? '🔍 검색' : 
               type === 'single' ? '📌 단일' : '📱 피드'}
            </span>
          </div>
        </div>

        {/* 피드 정보 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {post.authorProfileImage ? (
                  <img
                    src={post.authorProfileImage}
                    alt={post.authorAccountName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-500 text-xs font-medium">${post.authorAccountName.charAt(0).toUpperCase()}</div>`;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-medium">
                    {post.authorAccountName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-gray-900 truncate">
                @{post.authorAccountName}
              </span>
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {new Date(post.createdAt).toLocaleDateString('ko-KR', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
          
          <p className="text-sm text-gray-800 line-clamp-2 mb-3 leading-relaxed">
            {post.caption || '캡션이 없습니다'}
          </p>

          {/* 액션 버튼들 */}
          <div className="flex items-center justify-between">
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
                <span className="text-sm font-medium">{post.likeCount}</span>
              </button>
              
              <button 
                onClick={(e) => handleShare(post, e)}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors"
              >
                <ShareIcon className="h-5 w-5" />
                <span className="text-sm">공유</span>
              </button>
            </div>

            {/* 더보기 버튼 */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                // TODO: 더보기 메뉴 구현
              }}
              className="text-gray-600 hover:text-gray-800 transition-colors p-1"
            >
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }, [handleFeedClick, handleLikeToggle, handleShare, type]);

  // ============================================================================
  // 메인 렌더링 - AuthGuard로 감싸기
  // ============================================================================

  const renderContent = () => {
    // 첫 로딩 상태 (인증된 사용자)
    if (isLoading && feedItems.length === 0 && isAuthenticated) {
      return (
        <div className={`flex flex-col items-center justify-center h-64 ${className}`}>
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            {type === 'timeline' ? '타임라인을 불러오는 중...' :
             type === 'explore' ? '탐색 피드를 불러오는 중...' :
             type === 'user' ? '사용자 피드를 불러오는 중...' :
             type === 'search' ? '검색 중...' : 
             type === 'single' ? '게시물을 불러오는 중...' : '피드를 불러오는 중...'}
          </p>
        </div>
      );
    }

    // 에러 상태 (첫 로드)
    if (error && feedItems.length === 0) {
      return (
        <div className={`flex flex-col items-center justify-center h-64 text-center ${className}`}>
          <div className="text-red-500 text-lg font-medium mb-2">오류가 발생했습니다</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-3">
            <button 
              onClick={handleRefresh}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              다시 시도
            </button>
            {error.includes('인증') && (
              <button 
                onClick={handleLogin}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                로그인하기
              </button>
            )}
          </div>
        </div>
      );
    }

    // 피드가 없는 경우
    if (feedItems.length === 0 && isAuthenticated) {
      return (
        <div className={`flex flex-col items-center justify-center h-64 text-center ${className}`}>
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">
              {type === 'timeline' ? '📰' :
               type === 'explore' ? '🔍' :
               type === 'user' ? '👤' :
               type === 'search' ? '🔎' : 
               type === 'single' ? '📌' : '📷'}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {type === 'timeline' ? '타임라인이 비어있습니다' :
             type === 'explore' ? '탐색할 피드가 없습니다' :
             type === 'user' ? '게시물이 없습니다' :
             type === 'search' ? '검색 결과가 없습니다' : 
             type === 'single' ? '게시물을 찾을 수 없습니다' : '게시물이 없습니다'}
          </h2>
          <p className="text-gray-600 mb-4">
            {type === 'timeline' ? '팔로우하는 사용자들의 게시물이 나타납니다' :
             type === 'explore' ? '새로운 피드들을 발견해보세요' :
             type === 'user' && isMyFeed ? '첫 번째 게시물을 만들어보세요!' :
             type === 'user' ? '아직 업로드된 게시물이 없습니다' :
             type === 'search' ? `"${searchQuery}"와 일치하는 결과가 없습니다` : 
             type === 'single' ? '요청한 게시물이 존재하지 않거나 삭제되었습니다' : '게시물이 없습니다'}
          </p>
          <button 
            onClick={handleRefresh}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            새로고침
          </button>
        </div>
      );
    }

    // 메인 피드 콘텐츠
    return (
      <div ref={containerRef} className={`h-full overflow-y-auto ${className}`}>
        {/* 헤더 정보 */}
        <div className="sticky top-0 z-10 p-4 bg-white/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {type === 'timeline' ? '타임라인' : 
                 type === 'explore' ? '탐색' : 
                 type === 'user' ? `${accountName || '사용자'}의 게시물` : 
                 type === 'search' ? `"${searchQuery}" 검색 결과` : 
                 type === 'single' ? '게시물 상세' : '게시물'}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                <span>총 {feedStats.totalLoaded}개</span>
                <span>•</span>
                <span>좋아요 {feedStats.totalLikes}개</span>
                {hasNextPage && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">더 많은 피드 로딩 가능</span>
                  </>
                )}
                {user && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">@{user.accountName}로 로그인됨</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-blue-500 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isRefreshing ? '새로고침 중...' : '새로고침'}
            </button>
          </div>
        </div>

        {/* 에러 경고 메시지 (부분 로드 성공) */}
        {error && feedItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 mx-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">{error}</p>
                <div className="flex space-x-3 mt-2">
                  <button
                    onClick={() => setError(null)}
                    className="text-sm text-yellow-700 underline hover:text-yellow-900"
                  >
                    닫기
                  </button>
                  {error.includes('인증') && (
                    <button
                      onClick={handleLogin}
                      className="text-sm text-yellow-700 underline hover:text-yellow-900"
                    >
                      로그인하기
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 피드 그리드 (반응형) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4">
          {feedItems.map((post, index) => renderFeedItem(post, index))}
        </div>

        {/* 무한스크롤 트리거 요소 */}
        {hasNextPage && isAuthenticated && (
          <div 
            ref={loadMoreTriggerRef}
            className="flex items-center justify-center py-8"
          >
            {isLoadingMore ? (
              <div className="flex flex-col items-center space-y-2">
                <LoadingSpinner size="md" />
                <p className="text-sm text-gray-600">더 많은 피드를 불러오는 중...</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-400">스크롤하여 더 많은 피드 보기</p>
              </div>
            )}
          </div>
        )}

        {/* 더 이상 로드할 피드가 없을 때 */}
        {!hasNextPage && feedItems.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">🎉 모든 피드를 확인했습니다!</p>
              <p className="text-xs text-gray-400">새로고침하여 새로운 피드를 찾아보세요</p>
            </div>
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
              toastMessage.type === 'success' ? 'bg-green-500' : 
              toastMessage.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}>
              {toastMessage.message}
            </div>
          </div>
        )}

        {/* 개발 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white text-xs rounded-lg p-3 z-30 max-w-xs">
            <div className="font-semibold mb-2">🔥 피드뷰어 디버그</div>
            <div className="space-y-1">
              <div>타입: {type}</div>
              <div>사용자: {userId || accountName || 'None'}</div>
              <div>게시물 ID: {postId || 'None'}</div>
              <div>검색어: {searchQuery || 'None'}</div>
              <div>로드된 피드: {feedStats.totalLoaded}개</div>
              <div>총 좋아요: {feedStats.totalLikes}개</div>
              <div>다음 페이지: {hasNextPage ? 'Yes' : 'No'}</div>
              <div>다음 커서: {nextCursor || 'None'}</div>
              <div>로딩 중: {isLoadingMore ? 'Yes' : 'No'}</div>
              <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
              <div>사용자: {user?.accountName || 'None'}</div>
              <div>현재 limit: {optimalLimit}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AuthGuard className={className}>
      {renderContent()}
    </AuthGuard>
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col lg:flex-row">
          {/* 피드 이미지 영역 */}
          <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] lg:min-h-[600px]">
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
          <div className="w-full lg:w-96 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {feed.authorProfileImage ? (
                    <img
                      src={feed.authorProfileImage}
                      alt={feed.authorAccountName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-medium">
                      {feed.authorAccountName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">@{feed.authorAccountName}</div>
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
                className="text-gray-500 hover:text-gray-700 ml-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 피드 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {feed.caption || '캡션이 없습니다'}
                </p>
              </div>

              {/* 피드 정보 */}
              <div className="mt-6 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">계정:</span>
                    <span className="text-gray-900 font-medium ml-2">@{feed.authorAccountName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">좋아요:</span>
                    <span className="text-gray-900 font-medium ml-2">{feed.likeCount}개</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500">게시물 ID:</span>
                    <span className="text-gray-900 font-mono text-xs ml-2">{feed.postId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">사진 ID:</span>
                    <span className="text-gray-900 font-mono text-xs ml-2">{feed.photoId}</span>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500">작성일:</span>
                  <span className="text-gray-900 ml-2">
                    {new Date(feed.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* 관계 정보 */}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center space-x-3 text-xs">
                    <span className={`px-2 py-1 rounded-full ${feed.isMyPost ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {feed.isMyPost ? '내 게시물' : '다른 사용자 게시물'}
                    </span>
                    {!feed.isMyPost && (
                      <span className={`px-2 py-1 rounded-full ${feed.isFollowingAuthor ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        {feed.isFollowingAuthor ? '팔로잉 중' : '팔로우 안함'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="border-t p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={(e) => onLike(feed, e)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-red-500 transition-colors"
                  >
                    {feed.isLikedByMe ? (
                      <HeartSolidIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <HeartIcon className="h-6 w-6" />
                    )}
                    <span className="font-medium">{feed.likeCount}</span>
                  </button>
                  
                  <button 
                    onClick={(e) => onShare(feed, e)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition-colors"
                  >
                    <ShareIcon className="h-6 w-6" />
                    <span>공유</span>
                  </button>
                </div>

                {/* 팔로우 버튼 (본인 게시물이 아닌 경우에만) */}
                {!feed.isMyPost && (
                  <button
                    onClick={(e) => onFollow(feed, e)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      feed.isFollowingAuthor
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {feed.isFollowingAuthor ? (
                      <>
                        <UserMinusIcon className="h-4 w-4 inline mr-1" />
                        언팔로우
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="h-4 w-4 inline mr-1" />
                        팔로우
                      </>
                    )}
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
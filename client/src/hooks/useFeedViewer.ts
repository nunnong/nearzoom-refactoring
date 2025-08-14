// src/hooks/useFeedViewer.ts - 백엔드 완벽 연동 버전

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// timeline.ts에서 타입과 함수들 가져오기
import type { 
  PostResponse, 
  FeedWithPostsResponse,
  TimelinePost
} from '@/lib/types/timeline'

// 값으로 사용할 상수와 함수들은 별도로 가져오기
import { 
  TIMELINE_ENDPOINTS,
  transformPostResponseToTimelinePost 
} from '@/lib/types/timeline'

// ============================================================================
// 백엔드 API 응답 타입 정의 (실제 백엔드 구조와 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 프론트엔드에서 사용할 피드 아이템 (TimelinePost 기반으로 단순화)
interface FeedItem {
  id: string;           // postId를 문자열로 변환
  postId: number;       // 백엔드 API 호출용 숫자 ID
  accountName: string;  // 계정명
  caption: string;      // 캡션
  imageUrl: string;     // 이미지 URL
  isLiked: boolean;     // 좋아요 상태
  likeCount: number;    // 좋아요 수
  createdAt: string;    // 생성일
  author: {
    id: string;         // authorAccountName
    username: string;   // authorAccountName
    avatar?: string;    // authorProfileImage
  };
  displayOrder?: number; // 피드 내 표시 순서
}

interface UseFeedViewerOptions {
  type?: 'timeline' | 'explore' | 'user' | 'search';
  accountName?: string;     // 특정 사용자 피드
  userId?: number;          // 백엔드 userId 직접 지정
  searchQuery?: string;     // 검색 쿼리
  size?: number;            // 페이지 크기 (백엔드 파라미터와 일치)
  initialLoad?: boolean;
}

interface LoadingStates {
  initial: boolean;
  loadMore: boolean;
  refresh: boolean;
  action: boolean; // 좋아요 등의 액션
}

interface UseFeedViewerReturn {
  feedItems: FeedItem[];
  loading: LoadingStates;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  
  // 데이터 로딩
  loadMore: () => void;
  refreshFeed: () => void;
  retryLoad: () => void;
  
  // 피드 액션
  toggleLike: (postId: number) => Promise<void>;
  
  // 네비게이션
  goToPost: (postId: number) => void;
  goToUserFeed: (accountName: string) => void;
  
  // 유틸리티
  clearError: () => void;
}

// ============================================================================
// 백엔드 API 함수들 (실제 엔드포인트 사용)
// ============================================================================

const feedViewerAPI = {
  // 🔥 GET /feeds/timeline - 팔로잉 사용자들의 최신 게시물
  getTimelinePosts: async (size: number = 20): Promise<PostResponse[]> => {
    const response = await api.get<ApiResponse<PostResponse[]>>(
      TIMELINE_ENDPOINTS.TIMELINE,
      { params: { size } }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '타임라인을 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/explore - 모든 사용자의 게시물 랜덤 조회
  getExplorePosts: async (size: number = 20): Promise<PostResponse[]> => {
    const response = await api.get<ApiResponse<PostResponse[]>>(
      TIMELINE_ENDPOINTS.EXPLORE,
      { params: { size } }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || 'Explore를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/users/{userId} - 특정 사용자의 피드 조회 (게시물 포함)
  getUserFeedWithPosts: async (userId: number): Promise<FeedWithPostsResponse> => {
    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      `/feeds/users/${userId}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 피드를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/users/account/{accountName} - 계정명으로 사용자 피드 조회
  getUserFeedByAccountName: async (accountName: string): Promise<FeedWithPostsResponse> => {
    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      `/feeds/users/account/${accountName}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 피드를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/search - 피드/사용자 검색
  searchFeeds: async (query: string, size: number = 10): Promise<FeedWithPostsResponse[]> => {
    const response = await api.get<ApiResponse<FeedWithPostsResponse[]>>(
      '/feeds/search',
      { params: { query, size } }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '검색에 실패했습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 좋아요 토글 (새로운 엔드포인트)
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      // DELETE /likes/posts/{postId}
      await api.delete(`/likes/posts/${postId}`);
    } else {
      // POST /likes/posts/{postId}
      await api.post(`/likes/posts/${postId}`);
    }
  },

  // 🔥 GET /likes/posts/{postId}/check - 좋아요 상태 확인
  checkPostLikeStatus: async (postId: number): Promise<boolean> => {
    const response = await api.get<ApiResponse<boolean>>(`/likes/posts/${postId}/check`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '좋아요 상태를 확인할 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /likes/posts/{postId}/count - 좋아요 수 조회
  getPostLikeCount: async (postId: number): Promise<number> => {
    const response = await api.get<ApiResponse<number>>(`/likes/posts/${postId}/count`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '좋아요 수를 확인할 수 없습니다.');
    }
    
    return response.data.data;
  },
};

// ============================================================================
// 메인 훅 (백엔드 완벽 연동)
// ============================================================================

export const useFeedViewer = ({ 
  type = 'timeline',
  accountName,
  userId: propUserId,
  searchQuery,
  size = 20,
  initialLoad = true 
}: UseFeedViewerOptions = {}): UseFeedViewerReturn => {

  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<LoadingStates>({
    initial: false,
    loadMore: false,
    refresh: false,
    action: false
  });
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // 중복 요청 방지를 위한 ref
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);

  // 인증 상태
  const { isAuthenticated } = useAuthStore();

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 로딩 상태 업데이트 헬퍼
  const updateLoading = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  // 에러 처리 헬퍼
  const handleErrorLocal = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    setError(message);
  }, []);

  // 🔥 PostResponse를 FeedItem으로 변환
  const transformPostToFeedItem = useCallback((post: PostResponse): FeedItem => {
    return {
      id: post.postId.toString(),
      postId: post.postId,
      accountName: post.authorAccountName,
      caption: post.caption || '',
      imageUrl: post.imgUrl,
      isLiked: post.isLikedByMe,
      likeCount: post.likeCount,
      createdAt: post.createdAt,
      author: {
        id: post.authorAccountName,
        username: post.authorAccountName,
        avatar: post.authorProfileImage || undefined
      },
      displayOrder: post.displayOrder || undefined
    };
  }, []);

  // 🔥 FeedWithPostsResponse의 posts를 FeedItem으로 변환
  const transformFeedPostsToFeedItems = useCallback((feedResponse: FeedWithPostsResponse): FeedItem[] => {
    return feedResponse.posts.map(transformPostToFeedItem);
  }, [transformPostToFeedItem]);

  // ============================================================================
  // 백엔드 API 연동 - 피드 데이터 로드 (실제 엔드포인트 사용)
  // ============================================================================

  const loadFeedItems = useCallback(async (
    reset: boolean = false,
    loadingKey: keyof LoadingStates = 'initial'
  ) => {
    // 인증 확인
    if (!isAuthenticated) {
      setError('로그인이 필요합니다.');
      return;
    }

    // 중복 요청 방지
    if (loadingRef.current) return;
    loadingRef.current = true;

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    updateLoading(loadingKey, true);
    setError(null);

    try {
      let newFeedItems: FeedItem[] = [];

      console.log(`=== ${type} 피드 로딩 시작 ===`, { reset, size });

      // 🔥 백엔드 API 호출 (실제 엔드포인트 사용)
      if (type === 'timeline') {
        // GET /feeds/timeline - 팔로잉 사용자들의 최신 게시물
        const posts = await feedViewerAPI.getTimelinePosts(size);
        newFeedItems = posts.map(transformPostToFeedItem);
        
      } else if (type === 'explore') {
        // GET /feeds/explore - 모든 사용자의 게시물 랜덤 조회
        const posts = await feedViewerAPI.getExplorePosts(size);
        newFeedItems = posts.map(transformPostToFeedItem);
        
      } else if (type === 'user') {
        // GET /feeds/users/account/{accountName} 또는 GET /feeds/users/{userId}
        let feedWithPosts: FeedWithPostsResponse;
        
        if (accountName) {
          feedWithPosts = await feedViewerAPI.getUserFeedByAccountName(accountName);
        } else if (propUserId) {
          feedWithPosts = await feedViewerAPI.getUserFeedWithPosts(propUserId);
        } else {
          throw new Error('사용자 계정명 또는 ID가 필요합니다.');
        }
        
        newFeedItems = transformFeedPostsToFeedItems(feedWithPosts);
        
      } else if (type === 'search' && searchQuery) {
        // GET /feeds/search - 피드/사용자 검색
        const searchResults = await feedViewerAPI.searchFeeds(searchQuery, size);
        
        // 검색 결과의 모든 피드의 게시물들을 합침
        newFeedItems = searchResults.flatMap(transformFeedPostsToFeedItems);
        
      } else {
        throw new Error('유효하지 않은 피드 타입이거나 필수 파라미터가 누락되었습니다.');
      }

      console.log(`=== ${type} 피드 로딩 결과 ===`, { count: newFeedItems.length });

      // 상태 업데이트
      if (reset) {
        setFeedItems(newFeedItems);
        setTotalCount(newFeedItems.length);
      } else {
        setFeedItems(prev => {
          // 중복 제거 (postId 기준)
          const existingIds = new Set(prev.map(item => item.postId));
          const uniqueNewItems = newFeedItems.filter(item => !existingIds.has(item.postId));
          const combined = [...prev, ...uniqueNewItems];
          setTotalCount(combined.length);
          return combined;
        });
      }

      // 🔥 hasMore 판단 (백엔드에서 페이징 정보가 없으므로 단순하게 처리)
      // timeline과 explore는 새로고침만 지원 (페이징 없음)
      if (type === 'timeline' || type === 'explore') {
        setHasMore(false); // 한 번에 모든 데이터를 가져옴
      } else {
        // user, search 타입은 게시물 수가 size보다 적으면 더 없다고 판단
        setHasMore(newFeedItems.length >= size);
      }

      console.log(`=== 피드 아이템 업데이트 완료 ===`, {
        count: newFeedItems.length,
        hasMore: newFeedItems.length >= size
      });

    } catch (err) {
      // 요청이 취소된 경우는 에러로 처리하지 않음
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      handleErrorLocal(err, `${type} 피드 로딩`);
    } finally {
      updateLoading(loadingKey, false);
      loadingRef.current = false;
    }
  }, [type, accountName, propUserId, searchQuery, size, isAuthenticated, updateLoading, handleErrorLocal, transformPostToFeedItem, transformFeedPostsToFeedItems]);

  // ============================================================================
  // 공개 API 함수들
  // ============================================================================

  // 더 많은 피드 로드 (timeline/explore는 지원하지 않음)
  const loadMore = useCallback(() => {
    if (!hasMore || loading.loadMore || loadingRef.current) return;
    if (type === 'timeline' || type === 'explore') {
      console.warn('Timeline과 Explore는 loadMore를 지원하지 않습니다. refreshFeed를 사용하세요.');
      return;
    }
    console.log('=== loadMore 호출 ===', { hasMore, loading: loading.loadMore });
    loadFeedItems(false, 'loadMore');
  }, [hasMore, loading.loadMore, type, loadFeedItems]);

  // 피드 새로고침
  const refreshFeed = useCallback(() => {
    console.log('=== refreshFeed 호출 ===');
    setHasMore(true);
    setError(null);
    loadFeedItems(true, 'refresh');
  }, [loadFeedItems]);

  // 재시도
  const retryLoad = useCallback(() => {
    console.log('=== retryLoad 호출 ===', { feedItemsCount: feedItems.length });
    if (feedItems.length === 0) {
      refreshFeed();
    } else {
      loadFeedItems(false, 'initial');
    }
  }, [feedItems.length, refreshFeed, loadFeedItems]);

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // 피드 상호작용 (백엔드 완벽 연동)
  // ============================================================================

  // 🔥 좋아요 토글 (새로운 백엔드 API 사용)
  const toggleLike = useCallback(async (postId: number) => {
    const feedItem = feedItems.find(item => item.postId === postId);
    if (!feedItem) {
      console.warn('Feed item not found:', postId);
      return;
    }

    console.log(`=== 좋아요 토글 시작 ===`, { postId, currentLiked: feedItem.isLiked });

    updateLoading('action', true);

    // 낙관적 업데이트
    const originalIsLiked = feedItem.isLiked;
    const originalLikeCount = feedItem.likeCount;
    const newIsLiked = !originalIsLiked;
    const newLikeCount = newIsLiked ? originalLikeCount + 1 : originalLikeCount - 1;

    setFeedItems(prev => prev.map(item => 
      item.postId === postId 
        ? { ...item, isLiked: newIsLiked, likeCount: newLikeCount }
        : item
    ));

    try {
      // 🔥 실제 백엔드 API 호출 (POST/DELETE /likes/posts/{postId})
      await feedViewerAPI.togglePostLike(postId, originalIsLiked);

      console.log(`=== 좋아요 토글 성공 ===`, { postId, newLiked: newIsLiked });

      // 서버에서 실제 좋아요 수를 다시 가져와서 동기화 (선택적)
      // const actualLikeCount = await feedViewerAPI.getPostLikeCount(postId);
      // setFeedItems(prev => prev.map(item => 
      //   item.postId === postId 
      //     ? { ...item, likeCount: actualLikeCount }
      //     : item
      // ));

    } catch (err) {
      console.error('좋아요 토글 실패:', err);
      
      // 실패 시 롤백
      setFeedItems(prev => prev.map(item => 
        item.postId === postId 
          ? { ...item, isLiked: originalIsLiked, likeCount: originalLikeCount }
          : item
      ));
      
      handleErrorLocal(err, '좋아요');
    } finally {
      updateLoading('action', false);
    }
  }, [feedItems, updateLoading, handleErrorLocal]);

  // ============================================================================
  // 네비게이션
  // ============================================================================

  // 🔥 게시물 상세로 이동
  const goToPost = useCallback((postId: number) => {
    // TODO: Next.js router를 사용해서 게시물 상세 페이지로 이동
    // router.push(`/post/${postId}`)
    console.log(`Navigate to post: ${postId}`);
  }, []);

  // 🔥 사용자 피드로 이동
  const goToUserFeed = useCallback((accountName: string) => {
    // TODO: Next.js router를 사용해서 사용자 피드 페이지로 이동
    // router.push(`/@${accountName}`)
    console.log(`Navigate to user feed: ${accountName}`);
  }, []);

  // ============================================================================
  // 초기 로드 실행
  // ============================================================================

  useEffect(() => {
    if (initialLoad) {
      console.log('=== 초기 로드 실행 ===', { type, accountName, userId: propUserId, searchQuery });
      // 상태 초기화
      setFeedItems([]);
      setHasMore(true);
      setError(null);
      loadFeedItems(true, 'initial');
    }
  }, [type, accountName, propUserId, searchQuery, initialLoad, loadFeedItems]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================================================
  // 반환 값
  // ============================================================================

  return {
    feedItems,
    loading,
    error,
    hasMore,
    totalCount,
    
    // 데이터 로딩
    loadMore,
    refreshFeed,
    retryLoad,
    
    // 피드 액션
    toggleLike,
    
    // 네비게이션
    goToPost,
    goToUserFeed,
    
    // 유틸리티
    clearError,
  };
};

// ============================================================================
// 🔥 추가: 백엔드 에러 처리를 위한 유틸리티
// ============================================================================

export type FeedViewerError = 
  | 'UNAUTHORIZED'              // 로그인이 필요합니다
  | 'USER_NOT_FOUND'           // 사용자를 찾을 수 없습니다
  | 'FEED_NOT_FOUND'           // 피드를 찾을 수 없습니다
  | 'POST_NOT_FOUND'           // 게시물을 찾을 수 없습니다
  | 'LIKE_FAILED'              // 좋아요 처리 실패
  | 'NETWORK_ERROR'            // 네트워크 오류
  | 'UNKNOWN_ERROR';           // 알 수 없는 오류

// 백엔드 에러를 타입별로 분류하는 유틸리티
export const classifyFeedViewerError = (error: Error): FeedViewerError => {
  const message = error.message.toLowerCase();
  
  if (message.includes('로그인이 필요') || message.includes('unauthorized')) return 'UNAUTHORIZED';
  if (message.includes('사용자를 찾을 수 없습니다') || message.includes('user not found')) return 'USER_NOT_FOUND';
  if (message.includes('피드를 찾을 수 없습니다') || message.includes('feed not found')) return 'FEED_NOT_FOUND';
  if (message.includes('게시물을 찾을 수 없습니다') || message.includes('post not found')) return 'POST_NOT_FOUND';
  if (message.includes('좋아요') || message.includes('like')) return 'LIKE_FAILED';
  if (message.includes('network') || message.includes('timeout')) return 'NETWORK_ERROR';
  
  return 'UNKNOWN_ERROR';
};
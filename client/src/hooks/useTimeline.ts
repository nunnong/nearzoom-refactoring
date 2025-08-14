// src/hooks/useTimeline.ts - 백엔드 완벽 연동 버전

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// 🔥 타입들과 유틸리티 함수들은 /lib/types/timeline에서
import {
  TimelinePost,
  PostResponse,
  TIMELINE_ENDPOINTS,
  TIMELINE_DEFAULTS,
  transformPostResponseToTimelinePost,
  mergeTimelinePosts,
  updateTimelinePostLike,
  createOptimisticLikeUpdate
} from '@/lib/types/timeline'

// ============================================================================
// 백엔드 API 응답 타입 정의
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// ============================================================================
// 훅 인터페이스 정의
// ============================================================================

interface UseTimelineOptions {
  type?: 'timeline' | 'explore';
  size?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enabled?: boolean; // 자동 로딩 활성화 여부
}

interface UseTimelineReturn {
  posts: TimelinePost[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error: string | null;
  totalCount: number;
  
  // 액션 함수들
  loadMorePosts: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  toggleLike: (postId: number) => Promise<void>;
  
  // 상태 관리
  clearError: () => void;
  retry: () => Promise<void>;
  reset: () => void;
}

// ============================================================================
// 백엔드 API 함수들 (실제 엔드포인트 사용)
// ============================================================================

const timelineAPI = {
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

  // 🔥 POST/DELETE /likes/posts/{postId} - 좋아요 토글
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      // DELETE /likes/posts/{postId}
      const response = await api.delete<ApiResponse<void>>(
        TIMELINE_ENDPOINTS.UNLIKE_POST(postId)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 취소에 실패했습니다.');
      }
    } else {
      // POST /likes/posts/{postId}
      const response = await api.post<ApiResponse<void>>(
        TIMELINE_ENDPOINTS.LIKE_POST(postId)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요에 실패했습니다.');
      }
    }
  },

  // 🔥 GET /likes/posts/{postId}/count - 좋아요 수 조회 (선택적)
  getPostLikeCount: async (postId: number): Promise<number> => {
    const response = await api.get<ApiResponse<number>>(
      TIMELINE_ENDPOINTS.GET_LIKE_COUNT(postId)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '좋아요 수를 확인할 수 없습니다.');
    }
    
    return response.data.data;
  },
};

// ============================================================================
// 메인 훅 (백엔드 완벽 연동)
// ============================================================================

export const useTimeline = (options: UseTimelineOptions = {}): UseTimelineReturn => {
  const {
    type = 'timeline',
    size = TIMELINE_DEFAULTS.PAGE_SIZE,
    autoRefresh = false,
    refreshInterval = TIMELINE_DEFAULTS.REFRESH_INTERVAL,
    enabled = true
  } = options;

  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // 요청 관리
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 인증 상태
  const { isAuthenticated } = useAuthStore();

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 에러 처리 헬퍼
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    setError(message);
  }, []);

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 상태 리셋
  const reset = useCallback(() => {
    setPosts([]);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  // ============================================================================
  // 백엔드 API 연동 - 초기 로드
  // ============================================================================

  const loadInitialPosts = useCallback(async (isRefresh: boolean = false) => {
    if (!isAuthenticated) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!enabled) return;

    // 중복 요청 방지
    if (loadingRef.current) return;
    loadingRef.current = true;

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      console.log(`=== ${type} 타임라인 로딩 시작 ===`, { size, isRefresh });

      let backendPosts: PostResponse[];

      if (type === 'timeline') {
        // 🔥 GET /feeds/timeline
        backendPosts = await timelineAPI.getTimelinePosts(size);
      } else {
        // 🔥 GET /feeds/explore
        backendPosts = await timelineAPI.getExplorePosts(size);
      }

      // 🔥 백엔드 PostResponse를 TimelinePost로 변환
      const timelinePosts = backendPosts.map(post => 
        transformPostResponseToTimelinePost(post, type)
      );

      setPosts(timelinePosts);
      setTotalCount(timelinePosts.length);

      // 🔥 hasMore 판단 (백엔드에서 페이징 정보가 없으므로 단순하게 처리)
      // timeline과 explore는 한 번에 모든 데이터를 가져오므로 hasMore는 false
      setHasMore(false);

      console.log(`=== ${type} 타임라인 로딩 완료 ===`, {
        count: timelinePosts.length,
        posts: timelinePosts
      });

    } catch (err) {
      // 요청이 취소된 경우는 에러로 처리하지 않음
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      handleError(err, `${type} 타임라인 로딩`);
      setPosts([]);
      setHasMore(false);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      loadingRef.current = false;
    }
  }, [type, size, isAuthenticated, enabled, handleError]);

  // ============================================================================
  // 더 많은 포스트 로드 (현재 백엔드에서 페이징 미지원)
  // ============================================================================

  const loadMorePosts = useCallback(async () => {
    if (isLoading || !hasMore || loadingRef.current) {
      console.log('=== loadMore 조건 불충족 ===', {
        isLoading,
        hasMore,
        loading: loadingRef.current
      });
      return;
    }

    // 🔥 현재 백엔드에서 timeline과 explore는 페이징을 지원하지 않음
    // 새로고침으로 대체
    console.log('=== 백엔드에서 페이징을 지원하지 않으므로 새로고침으로 대체 ===');
    await refreshPosts();
  }, [isLoading, hasMore]);

  // ============================================================================
  // 새로고침
  // ============================================================================

  const refreshPosts = useCallback(async () => {
    console.log(`=== ${type} 타임라인 새로고침 ===`);
    setHasMore(true);
    await loadInitialPosts(true);
  }, [type, loadInitialPosts]);

  // ============================================================================
  // 재시도 (에러 후)
  // ============================================================================

  const retry = useCallback(async () => {
    console.log(`=== ${type} 타임라인 재시도 ===`);
    await loadInitialPosts(false);
  }, [type, loadInitialPosts]);

  // ============================================================================
  // 백엔드 API 연동 - 좋아요 토글
  // ============================================================================

  const toggleLike = useCallback(async (postId: number) => {
    const post = posts.find(p => p.postId === postId);
    if (!post) {
      console.warn('게시물을 찾을 수 없습니다:', postId);
      return;
    }

    console.log(`=== 좋아요 토글 시작 ===`, { 
      postId, 
      currentLiked: post.isLikedByMe,
      currentCount: post.likeCount 
    });

    // 낙관적 업데이트
    const originalIsLiked = post.isLikedByMe;
    const originalLikeCount = post.likeCount;
    
    setPosts(prevPosts => createOptimisticLikeUpdate(prevPosts, postId));

    try {
      // 🔥 실제 백엔드 API 호출 (POST/DELETE /likes/posts/{postId})
      await timelineAPI.togglePostLike(postId, originalIsLiked);

      console.log(`=== 좋아요 토글 성공 ===`, { 
        postId, 
        newLiked: !originalIsLiked 
      });

      // 선택적: 서버에서 실제 좋아요 수를 다시 가져와서 동기화
      // try {
      //   const actualLikeCount = await timelineAPI.getPostLikeCount(postId);
      //   setPosts(prevPosts => 
      //     updateTimelinePostLike(prevPosts, postId, !originalIsLiked, actualLikeCount)
      //   );
      // } catch (countError) {
      //   console.warn('좋아요 수 동기화 실패:', countError);
      // }

    } catch (err) {
      console.error('좋아요 토글 실패:', err);
      
      // 실패 시 낙관적 업데이트 롤백
      setPosts(prevPosts => 
        updateTimelinePostLike(prevPosts, postId, originalIsLiked, originalLikeCount)
      );
      
      handleError(err, '좋아요');
    }
  }, [posts, handleError]);

  // ============================================================================
  // 초기 로드 및 자동 새로고침
  // ============================================================================

  // 컴포넌트 마운트 시 초기 로드
  useEffect(() => {
    if (enabled) {
      console.log(`=== ${type} 타임라인 초기 로드 ===`);
      loadInitialPosts(false);
    }
  }, [type, enabled, loadInitialPosts]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (!autoRefresh || !enabled) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    console.log(`=== ${type} 자동 새로고침 활성화 ===`, { 
      interval: refreshInterval 
    });

    refreshTimerRef.current = setInterval(() => {
      console.log(`=== ${type} 자동 새로고침 실행 ===`);
      refreshPosts();
    }, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, enabled, refreshInterval, refreshPosts, type]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // 반환 값
  // ============================================================================

  return {
    posts,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    totalCount,
    
    // 액션 함수들
    loadMorePosts,
    refreshPosts,
    toggleLike,
    
    // 상태 관리
    clearError,
    retry,
    reset
  };
};

// ============================================================================
// 🔥 추가: 특화된 타임라인 훅들
// ============================================================================

// 팔로잉 타임라인 전용 훅
export const useFollowingTimeline = (options: Omit<UseTimelineOptions, 'type'> = {}) => {
  return useTimeline({ ...options, type: 'timeline' });
};

// Explore 전용 훅
export const useExploreTimeline = (options: Omit<UseTimelineOptions, 'type'> = {}) => {
  return useTimeline({ ...options, type: 'explore' });
};

// 자동 새로고침이 활성화된 라이브 타임라인 훅
export const useLiveTimeline = (options: Omit<UseTimelineOptions, 'autoRefresh'> = {}) => {
  return useTimeline({ 
    ...options, 
    autoRefresh: true,
    refreshInterval: 30000 // 30초마다 새로고침
  });
};

// ============================================================================
// 🔥 추가: 백엔드 에러 처리를 위한 유틸리티
// ============================================================================

export type TimelineError = 
  | 'UNAUTHORIZED'              // 로그인이 필요합니다
  | 'NETWORK_ERROR'            // 네트워크 오류
  | 'LOAD_FAILED'              // 데이터 로딩 실패
  | 'LIKE_FAILED'              // 좋아요 처리 실패
  | 'UNKNOWN_ERROR';           // 알 수 없는 오류

// 백엔드 에러를 타입별로 분류하는 유틸리티
export const classifyTimelineError = (error: Error): TimelineError => {
  const message = error.message.toLowerCase();
  
  if (message.includes('로그인이 필요') || message.includes('unauthorized')) return 'UNAUTHORIZED';
  if (message.includes('network') || message.includes('timeout')) return 'NETWORK_ERROR';
  if (message.includes('좋아요') || message.includes('like')) return 'LIKE_FAILED';
  if (message.includes('불러올 수 없습니다') || message.includes('load')) return 'LOAD_FAILED';
  
  return 'UNKNOWN_ERROR';
};
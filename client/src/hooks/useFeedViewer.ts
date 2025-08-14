// src/hooks/useFeedViewer.ts

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의 (단순화)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// FeedDetailResponse.java 기반 (백엔드 실제 응답)
interface BackendFeedDetailResponse {
  feedId: number;
  imgUrl: string;
  caption: string;
  authorId: number;
  accountName: string;
  profileImage: string;
  createdAt: string;
  liked: boolean;
}

// 프론트엔드에서 사용할 간단한 피드 아이템
interface FeedItem {
  id: string;          // feedId를 문자열로 변환
  feedId: number;      // 백엔드 API 호출용 숫자 ID
  accountName: string; // 계정명
  caption: string;     // 캡션 (제목 + 설명으로 사용)
  imageUrl: string;    // 🔥 단순 이미지 URL만 사용
  isLiked: boolean;    // 좋아요 상태
  createdAt: string;   // 생성일
  author: {
    id: string;        // accountName
    username: string;  // accountName
    avatar?: string;   // profileImage
  };
}

interface FeedAuthor {
  id: string;          // accountName
  username: string;    // accountName
  avatar?: string;     // profileImage
}

interface UseFeedViewerOptions {
  type?: 'following' | 'random' | 'user' | 'search';
  accountName?: string;     // 특정 사용자 피드
  userId?: number;          // 백엔드 userId 직접 지정
  searchQuery?: string;     // 검색 쿼리
  limit?: number;
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
  toggleLike: (feedId: number) => Promise<void>;
  
  // 네비게이션 (실제 구현 필요)
  goToFeed: (feedId: number) => void;
  
  // 유틸리티
  clearError: () => void;
}

// ============================================================================
// 백엔드 API 함수들 (단순화)
// ============================================================================

const feedViewerAPI = {
  // GET /feeds/users/{userId} - 특정 사용자 피드
  getUserFeeds: async (userId: number, size: number = 20, cursorCreatedAt?: string, cursorId?: number): Promise<BackendFeedDetailResponse[]> => {
    let url = `/feeds/users/${userId}?size=${size}`;
    if (cursorCreatedAt && cursorId) {
      url += `&cursorCreatedAt=${encodeURIComponent(cursorCreatedAt)}&cursorId=${cursorId}`;
    }
    
    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(url);
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
    
    return response.data.data;
  },

  // GET /feeds/following - 팔로잉 피드
  getFollowingFeeds: async (size: number = 20, cursorCreatedAt?: string, cursorId?: number): Promise<BackendFeedDetailResponse[]> => {
    let url = `/feeds/following?size=${size}`;
    if (cursorCreatedAt && cursorId) {
      url += `&cursorCreatedAt=${encodeURIComponent(cursorCreatedAt)}&cursorId=${cursorId}`;
    }
    
    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(url);
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
    
    return response.data.data;
  },

  // GET /feeds/random - 랜덤 피드
  getRandomFeeds: async (size: number = 20): Promise<BackendFeedDetailResponse[]> => {
    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      `/feeds/random?size=${size}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
    
    return response.data.data;
  },

  // GET /feeds/search - 피드 검색
  searchFeeds: async (query: string, size: number = 20): Promise<BackendFeedDetailResponse[]> => {
    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      `/feeds/search?query=${encodeURIComponent(query)}&size=${size}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
    
    return response.data.data;
  },

  // accountName으로 userId 찾기 (검색 API 활용)
  findUserIdByAccountName: async (accountName: string): Promise<number | null> => {
    try {
      const feeds = await feedViewerAPI.searchFeeds(accountName, 1);
      if (feeds.length > 0 && typeof feeds[0].authorId === 'number') {
        return feeds[0].authorId;
      }
      return null;
    } catch (error) {
      console.error('Failed to find userId by accountName:', error);
      return null;
    }
  },

  // POST/DELETE /likes/{feedId} - 좋아요 토글
  toggleLike: async (feedId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      await api.delete(`/likes/${feedId}`);
    } else {
      await api.post(`/likes/${feedId}`);
    }
  },
};

// ============================================================================
// 메인 훅 (단순화)
// ============================================================================

export const useFeedViewer = ({ 
  type = 'following',
  accountName,
  userId: propUserId,
  searchQuery,
  limit = 20,
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
  const [nextCursor, setNextCursor] = useState<{
    createdAt: string;
    feedId: number;
  } | null>(null);
  
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

  // 🔥 백엔드 응답을 FeedItem으로 변환 (단순화)
  const transformBackendToFeedItem = useCallback((backendFeed: BackendFeedDetailResponse): FeedItem => {
    return {
      id: backendFeed.feedId.toString(),
      feedId: backendFeed.feedId,
      accountName: backendFeed.accountName,
      caption: backendFeed.caption || '',
      imageUrl: backendFeed.imgUrl, // 🔥 단순 이미지 URL만 사용
      isLiked: backendFeed.liked,
      createdAt: backendFeed.createdAt,
      author: {
        id: backendFeed.accountName,
        username: backendFeed.accountName,
        avatar: backendFeed.profileImage
      }
    };
  }, []);

  // ============================================================================
  // 백엔드 API 연동 - 피드 데이터 로드 (단순화)
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
      let backendFeeds: BackendFeedDetailResponse[] = [];

      console.log(`=== ${type} 피드 로딩 시작 ===`, { reset, nextCursor });

      // 🔥 백엔드 API 호출 (타입에 따라 단순하게 매핑)
      if (type === 'following') {
        // 팔로잉 피드 (GET /feeds/following)
        backendFeeds = await feedViewerAPI.getFollowingFeeds(
          limit,
          reset ? undefined : nextCursor?.createdAt,
          reset ? undefined : nextCursor?.feedId
        );
      } else if (type === 'random') {
        // 랜덤 피드 (GET /feeds/random)
        backendFeeds = await feedViewerAPI.getRandomFeeds(limit);
      } else if (type === 'user') {
        // 특정 사용자 피드 (GET /feeds/users/{userId})
        let targetUserId: number | null = propUserId || null;
        
        if (!targetUserId && accountName) {
          targetUserId = await feedViewerAPI.findUserIdByAccountName(accountName);
          if (!targetUserId) {
            throw new Error(`사용자 '${accountName}'을 찾을 수 없습니다.`);
          }
        }
        
        if (!targetUserId || typeof targetUserId !== 'number') {
          throw new Error('사용자 ID가 필요합니다.');
        }
        
        backendFeeds = await feedViewerAPI.getUserFeeds(
          targetUserId,
          limit,
          reset ? undefined : nextCursor?.createdAt,
          reset ? undefined : nextCursor?.feedId
        );
      } else if (type === 'search' && searchQuery) {
        // 피드 검색 (GET /feeds/search)
        backendFeeds = await feedViewerAPI.searchFeeds(searchQuery, limit);
      } else {
        throw new Error('유효하지 않은 피드 타입이거나 필수 파라미터가 누락되었습니다.');
      }

      console.log(`=== ${type} 피드 로딩 결과 ===`, { count: backendFeeds.length });

      // 🔥 백엔드 응답을 FeedItem으로 변환
      const newFeedItems = backendFeeds.map(transformBackendToFeedItem);

      if (reset) {
        setFeedItems(newFeedItems);
        setTotalCount(newFeedItems.length);
      } else {
        setFeedItems(prev => {
          const combined = [...prev, ...newFeedItems];
          setTotalCount(combined.length);
          return combined;
        });
      }

      // 🔥 페이징 정보 업데이트 (단순화)
      if (backendFeeds.length < limit) {
        setHasMore(false);
        setNextCursor(null);
      } else if (backendFeeds.length > 0) {
        const lastFeed = backendFeeds[backendFeeds.length - 1];
        setNextCursor({
          createdAt: lastFeed.createdAt,
          feedId: lastFeed.feedId
        });
        setHasMore(true);
      }

      console.log(`=== 피드 아이템 업데이트 완료 ===`, {
        count: newFeedItems.length,
        hasMore: backendFeeds.length >= limit
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
  }, [type, accountName, propUserId, searchQuery, limit, isAuthenticated, nextCursor, updateLoading, handleErrorLocal, transformBackendToFeedItem]);

  // ============================================================================
  // 공개 API 함수들
  // ============================================================================

  // 더 많은 피드 로드
  const loadMore = useCallback(() => {
    if (!hasMore || loading.loadMore || loadingRef.current) return;
    console.log('=== loadMore 호출 ===', { hasMore, loading: loading.loadMore });
    loadFeedItems(false, 'loadMore');
  }, [hasMore, loading.loadMore, loadFeedItems]);

  // 피드 새로고침
  const refreshFeed = useCallback(() => {
    console.log('=== refreshFeed 호출 ===');
    setNextCursor(null);
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

  // 🔥 좋아요 토글 (백엔드 API 완벽 연동)
  const toggleLike = useCallback(async (feedId: number) => {
    const feed = feedItems.find(item => item.feedId === feedId);
    if (!feed) {
      console.warn('Feed not found:', feedId);
      return;
    }

    console.log(`=== 좋아요 토글 시작 ===`, { feedId, currentLiked: feed.isLiked });

    updateLoading('action', true);

    // 낙관적 업데이트
    const originalIsLiked = feed.isLiked;
    setFeedItems(prev => prev.map(item => 
      item.feedId === feedId 
        ? { ...item, isLiked: !item.isLiked }
        : item
    ));

    try {
      // 🔥 실제 백엔드 API 호출
      await feedViewerAPI.toggleLike(feedId, originalIsLiked);

      console.log(`=== 좋아요 토글 성공 ===`, { feedId, newLiked: !originalIsLiked });

    } catch (err) {
      console.error('좋아요 토글 실패:', err);
      
      // 실패 시 롤백
      setFeedItems(prev => prev.map(item => 
        item.feedId === feedId 
          ? { ...item, isLiked: originalIsLiked }
          : item
      ));
      
      handleErrorLocal(err, '좋아요');
    } finally {
      updateLoading('action', false);
    }
  }, [feedItems, updateLoading, handleErrorLocal]);

  // ============================================================================
  // 네비게이션 (단순화)
  // ============================================================================

  // 🔥 피드로 이동 (feedId 기반으로 단순화)
  const goToFeed = useCallback((feedId: number) => {
    // TODO: Next.js router를 사용해서 피드 상세 페이지로 이동
    // router.push(`/feed/${feedId}`)
    console.log(`Navigate to feed: ${feedId}`);
  }, []);

  // ============================================================================
  // 초기 로드 실행
  // ============================================================================

  useEffect(() => {
    if (initialLoad) {
      console.log('=== 초기 로드 실행 ===', { type, accountName, userId: propUserId, searchQuery });
      // 상태 초기화
      setFeedItems([]);
      setNextCursor(null);
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
    goToFeed,
    
    // 유틸리티
    clearError,
  };
};
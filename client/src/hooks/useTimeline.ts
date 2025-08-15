// src/hooks/useTimeline.ts - 백엔드 커서 기반 무한스크롤 완벽 연동

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 타입 import (feed.ts에서)
import {
  type ApiResponse,
  type PostResponse,
  type PostListResponse,
  type CursorPaginationParams,
  buildPaginationQuery,
  getOptimalLimit,
  formatTimeAgo,
  formatLikeCount,
  API_ENDPOINTS,
} from '@/lib/types/feed'

// 🔥 API 클라이언트 (아키텍처 원칙: 모든 컴포넌트 → api from '@/lib/axios')
import api from '@/lib/axios'

// ============================================================================
// 🎯 타임라인 포스트 타입 정의 (PostResponse 기반)
// ============================================================================

export interface TimelinePost {
  // 기본 정보 (PostResponse와 매핑)
  postId: number        // 커서로 사용 (백엔드 postId)
  photoId: number       // 마이룸 사진 ID
  imgUrl: string        // 이미지 URL
  caption: string       // 캡션
  displayOrder?: number // 표시 순서
  createdAt: string     // 생성일
  
  // 상호작용 정보
  likeCount: number     // 좋아요 수
  isLikedByMe: boolean  // 내가 좋아요 했는지
  
  // 작성자 정보
  authorId: number            // 작성자 ID
  authorAccountName: string   // 작성자 계정명
  authorProfileImage?: string // 작성자 프로필 이미지
  
  // UI 관련 계산된 필드들
  timeAgo: string            // 상대 시간 (예: "2시간 전")
  formattedLikeCount: string // 포맷된 좋아요 수 (예: "1.2k")
  
  // 메타데이터
  source: 'timeline' | 'explore' // 데이터 출처
  isLoading?: boolean           // 액션 로딩 상태 (좋아요 등)
}

// 타임라인 훅 옵션
export interface UseTimelineOptions {
  type?: 'timeline' | 'explore'
  limit?: number                // 페이지당 게시물 수 (커서 기반)
  deviceType?: 'mobile' | 'tablet' | 'desktop' // 디바이스별 최적화
  autoRefresh?: boolean         // 자동 새로고침
  refreshInterval?: number      // 새로고침 간격 (ms)
  enabled?: boolean            // 자동 로딩 활성화 여부
  enableOptimisticUpdates?: boolean // 낙관적 업데이트
  onPostsLoaded?: (posts: TimelinePost[], isRefresh: boolean) => void
  onError?: (error: string) => void
}

// 타임라인 훅 반환 타입
export interface UseTimelineReturn {
  // 📊 데이터 (마이룸과 동일한 구조)
  posts: TimelinePost[]
  loading: boolean
  loadingMore: boolean
  refreshing: boolean
  error: string | null
  hasNext: boolean
  nextCursor: number | null
  totalCount: number
  isEmpty: boolean
  
  // 📱 커서 기반 액션들 (마이룸 패턴)
  loadInitial: () => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  retry: () => Promise<void>
  
  // 🔄 상호작용
  toggleLike: (postId: number) => Promise<void>
  
  // 📊 데이터 조작
  updatePost: (postId: number, updater: (post: TimelinePost) => TimelinePost) => void
  removePost: (postId: number) => void
  prependPosts: (posts: TimelinePost[]) => void
  
  // 🎯 유틸리티
  clearError: () => void
  reset: () => void
  findPost: (postId: number) => TimelinePost | undefined
}

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

// 🔥 PostResponse를 TimelinePost로 변환 (백엔드 → 프론트엔드)
const transformPostToTimelinePost = (
  post: PostResponse, 
  source: 'timeline' | 'explore' = 'timeline'
): TimelinePost => {
  return {
    // 기본 정보
    postId: post.postId,
    photoId: post.photoId,
    imgUrl: post.imgUrl,
    caption: post.caption || '',
    displayOrder: post.displayOrder || undefined,
    createdAt: post.createdAt,
    
    // 상호작용 정보
    likeCount: post.likeCount,
    isLikedByMe: post.isLikedByMe,
    
    // 작성자 정보
    authorId: post.authorId,
    authorAccountName: post.authorAccountName,
    authorProfileImage: post.authorProfileImage || undefined,
    
    // UI 관련 계산된 필드들
    timeAgo: formatTimeAgo(post.createdAt),
    formattedLikeCount: formatLikeCount(post.likeCount),
    
    // 메타데이터
    source,
    isLoading: false,
  }
}

// 에러 처리 헬퍼 (개선됨)
const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }

    switch (axiosError.response?.status) {
      case 401:
        return '로그인이 필요합니다. 다시 로그인해주세요.'
      case 403:
        return '접근 권한이 없습니다.'
      case 404:
        return '요청한 데이터를 찾을 수 없습니다.'
      case 500:
        return '서버 오류가 발생했습니다.'
      default:
        return '네트워크 오류가 발생했습니다.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

// ============================================================================
// 🔥 백엔드 API 함수들 (커서 기반) - 인증 필수
// ============================================================================

// 📰 타임라인 피드 (팔로잉 게시물들) - GET /feeds/timeline
const fetchTimelinePosts = async (params: CursorPaginationParams): Promise<PostListResponse> => {
  const query = buildPaginationQuery(params)
  const response = await api.get<ApiResponse<PostListResponse>>(`${API_ENDPOINTS.TIMELINE}?${query}`)
  
  if (response.data.error || !response.data.data) {
    throw new Error(response.data.message || '타임라인을 불러올 수 없습니다.')
  }
  
  return response.data.data
}

// 🌍 탐색 피드 (랜덤 게시물들) - GET /feeds/explore
const fetchExplorePosts = async (params: CursorPaginationParams): Promise<PostListResponse> => {
  const query = buildPaginationQuery(params)
  const response = await api.get<ApiResponse<PostListResponse>>(`${API_ENDPOINTS.EXPLORE}?${query}`)
  
  if (response.data.error || !response.data.data) {
    throw new Error(response.data.message || '탐색 피드를 불러올 수 없습니다.')
  }
  
  return response.data.data
}

// 💖 좋아요 토글 - POST/DELETE /likes/posts/{postId}
const togglePostLike = async (postId: number, currentlyLiked: boolean): Promise<void> => {
  if (currentlyLiked) {
    // DELETE /likes/posts/{postId} - 언좋아요
    const response = await api.delete<ApiResponse<void>>(API_ENDPOINTS.UNLIKE_POST(postId))
    if (response.data.error) {
      throw new Error(response.data.message || '좋아요 취소에 실패했습니다.')
    }
  } else {
    // POST /likes/posts/{postId} - 좋아요
    const response = await api.post<ApiResponse<void>>(API_ENDPOINTS.LIKE_POST(postId))
    if (response.data.error) {
      throw new Error(response.data.message || '좋아요에 실패했습니다.')
    }
  }
}

// ============================================================================
// 🚀 메인 타임라인 훅 (백엔드 커서 기반 무한스크롤)
// ============================================================================

export const useTimeline = (options: UseTimelineOptions = {}): UseTimelineReturn => {
  const {
    type = 'timeline',
    limit,
    deviceType = 'mobile',
    autoRefresh = false,
    refreshInterval = 30000, // 30초
    enabled = true,
    enableOptimisticUpdates = true,
    onPostsLoaded,
    onError,
  } = options

  // ============================================================================
  // 상태 관리 (마이룸과 동일한 구조)
  // ============================================================================
  
  // 📱 디바이스별 최적 limit 계산
  const optimalLimit = limit || getOptimalLimit(deviceType)
  
  const [posts, setPosts] = useState<TimelinePost[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  
  // 요청 관리
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 🔐 인증 상태 (아키텍처 원칙: 무조건 로그인한 사람만 서비스 이용)
  const { isAuthenticated } = useAuthStore()

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 🔥 인증 상태 체크 (아키텍처 원칙: 무조건 로그인 필수)
  const checkAuthState = useCallback(() => {
    if (!isAuthenticated) {
      throw new Error('로그인이 필요합니다. 다시 로그인해주세요.')
    }
  }, [isAuthenticated])

  // 에러 처리 헬퍼 (개선됨)
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err)
    const message = handleApiError(err)
    setError(message)
    onError?.(message)
  }, [onError])

  // 요청 취소 및 초기화
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
  }, [])

  // ============================================================================
  // 🔥 백엔드 커서 기반 데이터 로드 (마이룸 패턴) - 인증 필수
  // ============================================================================

  const loadTimelineData = useCallback(async (isRefresh: boolean = false) => {
    // 🔐 인증 확인 (모든 API 호출 전 필수)
    if (!isAuthenticated || !enabled) {
      if (!isAuthenticated) {
        handleError(new Error('로그인이 필요합니다. 다시 로그인해주세요.'), '인증 확인')
      }
      return
    }

    // 중복 요청 방지
    if (loadingRef.current) return
    loadingRef.current = true

    // 이전 요청 취소
    cancelRequest()

    // 로딩 상태 설정
    if (isRefresh) {
      setRefreshing(true)
      setError(null)
    } else if (posts.length === 0) {
      setLoading(true)
      setError(null)
    } else {
      setLoadingMore(true)
    }

    try {
      console.log(`🔥 ${type} 타임라인 로딩 시작 (커서 기반):`, { 
        isRefresh, 
        limit: optimalLimit,
        cursor: isRefresh ? null : nextCursor
      })

      // 📱 커서 기반 파라미터 설정
      const cursorParams: CursorPaginationParams = {
        limit: optimalLimit,
        cursor: isRefresh ? undefined : nextCursor || undefined
      }

      let result: PostListResponse

      // 🔥 백엔드 API 호출 (타입별) - 인터셉터에서 토큰 자동 추가
      if (type === 'timeline') {
        // GET /feeds/timeline?limit=20&cursor=12345
        result = await fetchTimelinePosts(cursorParams)
      } else {
        // GET /feeds/explore?limit=20&cursor=12345
        result = await fetchExplorePosts(cursorParams)
      }

      // 🔥 백엔드 PostResponse를 TimelinePost로 변환
      const newTimelinePosts = result.posts.map(post => 
        transformPostToTimelinePost(post, type)
      )

      console.log(`🔥 ${type} 타임라인 로딩 완료:`, { 
        count: newTimelinePosts.length,
        hasNext: result.hasNext,
        nextCursor: result.nextCursor
      })

      // 📱 상태 업데이트 (마이룸 패턴)
      if (isRefresh) {
        // 새로고침: 전체 교체
        setPosts(newTimelinePosts)
        setHasNext(result.hasNext)
        setNextCursor(result.nextCursor)
      } else {
        // 더보기: 기존 데이터에 추가 (중복 제거)
        setPosts(prev => {
          const existingIds = new Set(prev.map(post => post.postId))
          const uniqueNewPosts = newTimelinePosts.filter(post => !existingIds.has(post.postId))
          return [...prev, ...uniqueNewPosts]
        })
        setHasNext(result.hasNext)
        setNextCursor(result.nextCursor)
      }

      onPostsLoaded?.(newTimelinePosts, isRefresh)

    } catch (err) {
      // 요청이 취소된 경우는 에러로 처리하지 않음
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      handleError(err, `${type} 타임라인 로딩`)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
      loadingRef.current = false
    }
  }, [
    type, optimalLimit, isAuthenticated, enabled, nextCursor, 
    posts.length, cancelRequest, handleError, onPostsLoaded, checkAuthState
  ])

  // ============================================================================
  // 🔥 공개 API 함수들 (마이룸과 동일한 인터페이스) - 인증 필수
  // ============================================================================

  // 📱 초기 로드 (인증 필수)
  const loadInitial = useCallback(async () => {
    // 🔐 인증 상태 확인
    try {
      checkAuthState()
    } catch (err) {
      handleError(err, '초기 로드 - 인증 확인')
      return
    }

    setPosts([])
    setHasNext(false)
    setNextCursor(null)
    await loadTimelineData(true)
  }, [loadTimelineData, checkAuthState, handleError])

  // 📱 커서 기반 더보기 로딩 (인증 필수)
  const loadMore = useCallback(async () => {
    // 🔐 인증 상태 확인
    if (!isAuthenticated) {
      handleError(new Error('로그인이 필요합니다. 다시 로그인해주세요.'), '더보기 로드 - 인증 확인')
      return
    }

    if (!hasNext || loadingMore || loading || refreshing || loadingRef.current) {
      console.log('더보기 로딩 스킵:', {
        hasNext,
        loadingMore,
        loading,
        refreshing,
        isLoading: loadingRef.current
      })
      return
    }
    
    console.log('🔥 커서 기반 더보기 로딩:', { hasNext, nextCursor })
    await loadTimelineData(false)
  }, [hasNext, loadingMore, loading, refreshing, nextCursor, loadTimelineData, isAuthenticated, handleError])

  // 🔄 새로고침 (인증 필수)
  const refresh = useCallback(async () => {
    // 🔐 인증 상태 확인
    try {
      checkAuthState()
    } catch (err) {
      handleError(err, '새로고침 - 인증 확인')
      return
    }

    console.log('🔥 커서 기반 새로고침')
    await loadTimelineData(true)
  }, [loadTimelineData, checkAuthState, handleError])

  // 🔄 재시도 (인증 필수)
  const retry = useCallback(async () => {
    // 🔐 인증 상태 확인
    try {
      checkAuthState()
    } catch (err) {
      handleError(err, '재시도 - 인증 확인')
      return
    }

    console.log('🔥 재시도 로딩:', { postsCount: posts.length })
    if (posts.length === 0) {
      await loadInitial()
    } else {
      await loadMore()
    }
  }, [posts.length, loadInitial, loadMore, checkAuthState, handleError])

  // ============================================================================
  // 🔄 좋아요 토글 (낙관적 업데이트) - 인증 필수
  // ============================================================================

  const toggleLike = useCallback(async (postId: number) => {
    // 🔐 인증 상태 확인
    try {
      checkAuthState()
    } catch (err) {
      handleError(err, '좋아요 토글 - 인증 확인')
      return
    }

    const post = posts.find(p => p.postId === postId)
    if (!post) {
      console.warn('게시물을 찾을 수 없습니다:', postId)
      return
    }

    console.log('🔥 좋아요 토글 시작:', { 
      postId, 
      currentLiked: post.isLikedByMe,
      currentCount: post.likeCount 
    })

    // 낙관적 업데이트
    if (enableOptimisticUpdates) {
      setPosts(prev => prev.map(p => 
        p.postId === postId 
          ? { 
              ...p, 
              isLikedByMe: !p.isLikedByMe,
              likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1,
              formattedLikeCount: formatLikeCount(
                p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1
              ),
              isLoading: true
            }
          : p
      ))
    }

    try {
      // 🔥 백엔드 API 호출 (인터셉터에서 토큰 자동 추가 및 갱신)
      await togglePostLike(postId, post.isLikedByMe)

      console.log('🔥 좋아요 토글 성공:', { 
        postId, 
        newLiked: !post.isLikedByMe 
      })

      // 로딩 상태 해제
      setPosts(prev => prev.map(p => 
        p.postId === postId 
          ? { ...p, isLoading: false }
          : p
      ))

    } catch (err) {
      console.error('좋아요 토글 실패:', err)
      
      // 실패 시 롤백 (낙관적 업데이트가 활성화된 경우)
      if (enableOptimisticUpdates) {
        setPosts(prev => prev.map(p => 
          p.postId === postId 
            ? { 
                ...p, 
                isLikedByMe: post.isLikedByMe, // 원래 상태로 복원
                likeCount: post.likeCount,
                formattedLikeCount: post.formattedLikeCount,
                isLoading: false
              }
            : p
        ))
      }
      
      handleError(err, '좋아요 토글')
    }
  }, [posts, enableOptimisticUpdates, handleError, checkAuthState])

  // ============================================================================
  // 📊 데이터 조작 함수들
  // ============================================================================

  const updatePost = useCallback((postId: number, updater: (post: TimelinePost) => TimelinePost) => {
    setPosts(prev => prev.map(post => 
      post.postId === postId ? updater(post) : post
    ))
  }, [])

  const removePost = useCallback((postId: number) => {
    setPosts(prev => prev.filter(post => post.postId !== postId))
  }, [])

  const prependPosts = useCallback((newPosts: TimelinePost[]) => {
    setPosts(prev => [...newPosts, ...prev])
  }, [])

  const findPost = useCallback((postId: number): TimelinePost | undefined => {
    return posts.find(post => post.postId === postId)
  }, [posts])

  // ============================================================================
  // 🎯 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setPosts([])
    setLoading(false)
    setLoadingMore(false)
    setRefreshing(false)
    setError(null)
    setHasNext(false)
    setNextCursor(null)
  }, [])

  // ============================================================================
  // 📱 초기 로드 및 자동 새로고침 (마이룸 패턴)
  // ============================================================================

  // 컴포넌트 마운트 시 초기 로드 (인증 확인 후)
  useEffect(() => {
    if (enabled && isAuthenticated) {
      console.log(`🔥 ${type} 타임라인 초기 로드 (커서 기반):`, { 
        type, limit: optimalLimit 
      })
      
      loadInitial()
    }
  }, [type, optimalLimit, enabled, isAuthenticated, loadInitial])

  // 🔐 인증 상태 변경 감지 (아키텍처 원칙: 무조건 로그인 필수)
  useEffect(() => {
    if (!isAuthenticated) {
      // 로그아웃 시 데이터 자동 리셋
      console.log('🔐 로그아웃 감지 - 타임라인 데이터 리셋')
      reset()
    }
  }, [isAuthenticated, reset])

  // 자동 새로고침 설정 (인증된 사용자만)
  useEffect(() => {
    if (!autoRefresh || !enabled || !isAuthenticated) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      return
    }

    console.log(`🔥 ${type} 자동 새로고침 활성화:`, { 
      interval: refreshInterval 
    })

    refreshTimerRef.current = setInterval(() => {
      console.log(`🔥 ${type} 자동 새로고침 실행`)
      refresh()
    }, refreshInterval)

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [autoRefresh, enabled, isAuthenticated, refreshInterval, refresh, type])

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [])

  // ============================================================================
  // 반환 값 (마이룸과 완전 호환)
  // ============================================================================

  return {
    // 📊 데이터 (마이룸과 동일)
    posts,
    loading,
    loadingMore,
    refreshing,
    error,
    hasNext,
    nextCursor,
    totalCount: posts.length,
    isEmpty: posts.length === 0 && !loading,
    
    // 📱 커서 기반 액션들 (마이룸 패턴)
    loadInitial,
    loadMore,
    refresh,
    retry,
    
    // 🔄 상호작용
    toggleLike,
    
    // 📊 데이터 조작
    updatePost,
    removePost,
    prependPosts,
    
    // 🎯 유틸리티
    clearError,
    reset,
    findPost,
  }
}

// ============================================================================
// 🔥 특화된 타임라인 훅들 (마이룸 패턴)
// ============================================================================

/**
 * 팔로잉 타임라인 전용 훅
 */
export const useFollowingTimeline = (options: Omit<UseTimelineOptions, 'type'> = {}) => {
  return useTimeline({ ...options, type: 'timeline' })
}

/**
 * 탐색 타임라인 전용 훅
 */
export const useExploreTimeline = (options: Omit<UseTimelineOptions, 'type'> = {}) => {
  return useTimeline({ ...options, type: 'explore' })
}

/**
 * 라이브 타임라인 훅 (자동 새로고침)
 */
export const useLiveTimeline = (
  type: 'timeline' | 'explore' = 'timeline',
  options: Omit<UseTimelineOptions, 'type' | 'autoRefresh'> = {}
) => {
  return useTimeline({ 
    ...options, 
    type,
    autoRefresh: true,
    refreshInterval: 30000 // 30초마다 새로고침
  })
}

/**
 * 디바이스 최적화된 타임라인 훅
 */
export const useResponsiveTimeline = (
  type: 'timeline' | 'explore',
  deviceType: 'mobile' | 'tablet' | 'desktop',
  options: Omit<UseTimelineOptions, 'type' | 'deviceType'> = {}
) => {
  return useTimeline({ 
    ...options, 
    type,
    deviceType,
    limit: getOptimalLimit(deviceType)
  })
}

// ============================================================================
// 🔧 고급 기능 훅들
// ============================================================================

/**
 * 캐싱과 함께 사용하는 타임라인 훅
 */
export const useCachedTimeline = (
  type: 'timeline' | 'explore',
  cacheKey: string,
  cacheTimeMs: number = 5 * 60 * 1000, // 5분
  options: Omit<UseTimelineOptions, 'type'> = {}
) => {
  const [cachedData, setCachedData] = useState<{
    posts: TimelinePost[]
    timestamp: number
  } | null>(null)
  
  const timeline = useTimeline({
    ...options,
    type,
    enabled: false, // 캐시 확인 후 로드
    onPostsLoaded: (posts, isRefresh) => {
      // 새로고침 시에만 캐시 업데이트
      if (isRefresh) {
        setCachedData({
          posts,
          timestamp: Date.now()
        })
      }
      options.onPostsLoaded?.(posts, isRefresh)
    }
  })
  
  // 캐시 유효성 확인
  const isCacheValid = cachedData && (Date.now() - cachedData.timestamp) < cacheTimeMs
  
  // 초기 로드 (캐시 확인 후)
  useEffect(() => {
    if (isCacheValid && cachedData) {
      // 캐시된 데이터 사용
      console.log('🔥 캐시된 타임라인 데이터 사용:', { cacheKey, count: cachedData.posts.length })
      timeline.prependPosts(cachedData.posts)
    } else {
      // 새로 로드
      console.log('🔥 캐시 만료 또는 없음, 새로 로드:', { cacheKey })
      timeline.loadInitial()
    }
  }, [cacheKey])
  
  return {
    ...timeline,
    isCacheValid,
    cacheAge: cachedData ? Date.now() - cachedData.timestamp : 0,
    clearCache: () => setCachedData(null),
  }
}

/**
 * 실시간 업데이트와 함께 사용하는 타임라인 훅
 */
export const useRealtimeTimeline = (
  type: 'timeline' | 'explore',
  options: Omit<UseTimelineOptions, 'type'> = {},
  realtimeConfig?: {
    enabled: boolean
    onNewPost?: (post: TimelinePost) => void
    onPostUpdate?: (postId: number, updates: Partial<TimelinePost>) => void
    onPostDelete?: (postId: number) => void
  }
) => {
  const timeline = useTimeline({ ...options, type })
  
  // 실시간 새 게시물 추가
  const handleNewPost = useCallback((post: TimelinePost) => {
    timeline.prependPosts([post])
    realtimeConfig?.onNewPost?.(post)
  }, [timeline, realtimeConfig])
  
  // 실시간 게시물 업데이트
  const handlePostUpdate = useCallback((postId: number, updates: Partial<TimelinePost>) => {
    timeline.updatePost(postId, (post) => ({ ...post, ...updates }))
    realtimeConfig?.onPostUpdate?.(postId, updates)
  }, [timeline, realtimeConfig])
  
  // 실시간 게시물 삭제
  const handlePostDelete = useCallback((postId: number) => {
    timeline.removePost(postId)
    realtimeConfig?.onPostDelete?.(postId)
  }, [timeline, realtimeConfig])
  
  return {
    ...timeline,
    // 실시간 이벤트 핸들러들
    handleNewPost,
    handlePostUpdate,
    handlePostDelete,
  }
}

// ============================================================================
// 🔥 에러 처리 및 타입 정의
// ============================================================================

export type TimelineError = 
  | 'UNAUTHORIZED'              // 로그인이 필요합니다
  | 'LOAD_FAILED'              // 데이터 로딩 실패
  | 'LIKE_FAILED'              // 좋아요 처리 실패
  | 'PAGINATION_ERROR'         // 페이징 오류
  | 'NETWORK_ERROR'            // 네트워크 오류
  | 'UNKNOWN_ERROR'            // 알 수 없는 오류

// 백엔드 에러를 타입별로 분류하는 유틸리티
export const classifyTimelineError = (error: Error): TimelineError => {
  const message = error.message.toLowerCase()
  
  if (message.includes('로그인이 필요') || message.includes('unauthorized')) return 'UNAUTHORIZED'
  if (message.includes('불러올 수 없습니다') || message.includes('load') || message.includes('fetch')) return 'LOAD_FAILED'
  if (message.includes('좋아요') || message.includes('like')) return 'LIKE_FAILED'
  if (message.includes('커서') || message.includes('cursor') || message.includes('pagination')) return 'PAGINATION_ERROR'
  if (message.includes('network') || message.includes('timeout')) return 'NETWORK_ERROR'
  
  return 'UNKNOWN_ERROR'
}

// 에러 타입별 사용자 친화적 메시지
export const getTimelineErrorMessage = (errorType: TimelineError): string => {
  switch (errorType) {
    case 'UNAUTHORIZED':
      return '로그인이 필요합니다. 다시 로그인해주세요.'
    case 'LOAD_FAILED':
      return '타임라인을 불러오는데 실패했습니다. 다시 시도해주세요.'
    case 'LIKE_FAILED':
      return '좋아요 처리에 실패했습니다. 다시 시도해주세요.'
    case 'PAGINATION_ERROR':
      return '페이지 로딩 중 오류가 발생했습니다. 새로고침해주세요.'
    case 'NETWORK_ERROR':
      return '네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해주세요.'
    case 'UNKNOWN_ERROR':
    default:
      return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
}

// ============================================================================
// 🎯 디버깅 및 개발 도구
// ============================================================================

/**
 * 개발 환경에서 타임라인 상태를 모니터링하는 훅
 */
export const useTimelineDebug = (timeline: UseTimelineReturn, debugKey: string = 'timeline') => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 Timeline Debug Info [${debugKey}]`)
      console.log('Timeline State:', {
        postsCount: timeline.posts.length,
        loading: timeline.loading,
        loadingMore: timeline.loadingMore,
        refreshing: timeline.refreshing,
        error: timeline.error,
        hasNext: timeline.hasNext,
        nextCursor: timeline.nextCursor,
        isEmpty: timeline.isEmpty,
      })
      console.log('Sample Posts:', timeline.posts.slice(0, 3))
      console.groupEnd()
    }
  }, [timeline, debugKey])
  
  const logAction = useCallback((action: string, details?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎬 Timeline Action [${debugKey}]: ${action}`, details)
    }
  }, [debugKey])
  
  return { logAction }
}

/**
 * 타임라인 성능 메트릭을 수집하는 훅
 */
export const useTimelineMetrics = () => {
  const metrics = useRef({
    loadTimes: [] as number[],
    loadCount: 0,
    errorCount: 0,
    likeActions: 0,
    totalPostsLoaded: 0,
    refreshCount: 0,
    lastError: null as string | null,
  })
  
  const startTimer = useCallback(() => {
    return performance.now()
  }, [])
  
  const recordLoad = useCallback((startTime: number, postCount: number = 0, isRefresh: boolean = false) => {
    const loadTime = performance.now() - startTime
    metrics.current.loadTimes.push(loadTime)
    metrics.current.loadCount++
    metrics.current.totalPostsLoaded += postCount
    
    if (isRefresh) {
      metrics.current.refreshCount++
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ Timeline load time: ${loadTime.toFixed(2)}ms (${postCount} posts, refresh: ${isRefresh})`)
    }
  }, [])
  
  const recordError = useCallback((error: string) => {
    metrics.current.errorCount++
    metrics.current.lastError = error
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ Timeline error:`, error)
    }
  }, [])
  
  const recordLikeAction = useCallback(() => {
    metrics.current.likeActions++
  }, [])
  
  const getMetrics = useCallback(() => {
    const loadTimes = metrics.current.loadTimes
    return {
      totalLoads: loadTimes.length,
      averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0,
      minLoadTime: loadTimes.length > 0 ? Math.min(...loadTimes) : 0,
      maxLoadTime: loadTimes.length > 0 ? Math.max(...loadTimes) : 0,
      errorRate: metrics.current.loadCount > 0 ? (metrics.current.errorCount / metrics.current.loadCount) : 0,
      totalPostsLoaded: metrics.current.totalPostsLoaded,
      refreshCount: metrics.current.refreshCount,
      likeActions: metrics.current.likeActions,
      lastError: metrics.current.lastError,
    }
  }, [])
  
  const reset = useCallback(() => {
    metrics.current = {
      loadTimes: [],
      loadCount: 0,
      errorCount: 0,
      likeActions: 0,
      totalPostsLoaded: 0,
      refreshCount: 0,
      lastError: null,
    }
  }, [])
  
  return {
    startTimer,
    recordLoad,
    recordError,
    recordLikeAction,
    getMetrics,
    reset,
  }
}

// ============================================================================
// 🚀 마이룸과의 완전 호환성을 위한 래퍼
// ============================================================================

/**
 * 마이룸의 useMyPhotos와 동일한 인터페이스로 타임라인을 제공하는 래퍼 훅
 */
export const useTimelineAsPhotos = (type: 'timeline' | 'explore') => {
  const timeline = useTimeline({ type })
  
  // 마이룸과 동일한 인터페이스로 변환
  const photos = timeline.posts.map(post => ({
    photoId: post.photoId,
    postId: post.postId, // 추가 정보
    imageUrl: post.imgUrl,
    caption: post.caption,
    createdAt: post.createdAt,
    heart: post.isLikedByMe, // 마이룸의 heart 필드
    likeCount: post.likeCount,
    author: {
      id: post.authorAccountName,
      username: post.authorAccountName,
      avatar: post.authorProfileImage,
    },
    timeAgo: post.timeAgo,
  }))
  
  return {
    // 마이룸 호환 데이터
    photos,
    loading: timeline.loading || timeline.loadingMore,
    error: timeline.error,
    hasNextPage: timeline.hasNext,
    isFetchingNextPage: timeline.loadingMore,
    
    // 마이룸 호환 함수들
    fetchNextPage: timeline.loadMore,
    refetch: timeline.refresh,
    
    // 추가 기능
    toggleHeart: timeline.toggleLike,
    totalCount: timeline.totalCount,
    isEmpty: timeline.isEmpty,
  }
}

// ============================================================================
// 🎨 UI 상태 계산 헬퍼
// ============================================================================

/**
 * 타임라인 상태를 바탕으로 UI 상태를 계산하는 훅
 */
export const useTimelineUI = (timeline: UseTimelineReturn) => {
  return {
    // 로딩 상태들
    showInitialLoader: timeline.loading,
    showMoreLoader: timeline.loadingMore,
    showRefreshLoader: timeline.refreshing,
    
    // 에러 상태들
    hasError: !!timeline.error,
    errorMessage: timeline.error,
    
    // 데이터 상태들
    hasData: timeline.posts.length > 0,
    isEmpty: timeline.isEmpty,
    canLoadMore: timeline.hasNext && !timeline.loadingMore && !timeline.loading,
    
    // 메시지들
    emptyMessage: timeline.isEmpty ? '표시할 게시물이 없습니다.' : null,
    loadingMessage: timeline.loading ? '타임라인을 불러오는 중...' : null,
    
    // 카운트 정보
    postCount: timeline.posts.length,
    totalCount: timeline.totalCount,
    
    // 기타
    nextCursor: timeline.nextCursor,
  }
}

// ============================================================================
// 🔄 상태 관리 헬퍼들
// ============================================================================

/**
 * 타임라인 필터링 헬퍼
 */
export const useTimelineFilter = (
  timeline: UseTimelineReturn,
  filterFn: (post: TimelinePost) => boolean
) => {
  const filteredPosts = timeline.posts.filter(filterFn)
  
  return {
    ...timeline,
    posts: filteredPosts,
    totalCount: filteredPosts.length,
    isEmpty: filteredPosts.length === 0 && !timeline.loading,
  }
}

/**
 * 타임라인 정렬 헬퍼
 */
export const useTimelineSort = (
  timeline: UseTimelineReturn,
  sortFn: (a: TimelinePost, b: TimelinePost) => number
) => {
  const sortedPosts = [...timeline.posts].sort(sortFn)
  
  return {
    ...timeline,
    posts: sortedPosts,
  }
}

/**
 * 타임라인 그룹화 헬퍼
 */
export const useTimelineGroupBy = (
  timeline: UseTimelineReturn,
  groupBy: 'date' | 'author' | 'likes'
) => {
  const groupedPosts = timeline.posts.reduce((groups, post) => {
    let key: string
    
    switch (groupBy) {
      case 'date':
        key = new Date(post.createdAt).toDateString()
        break
      case 'author':
        key = post.authorAccountName
        break
      case 'likes':
        if (post.likeCount > 100) key = 'popular'
        else if (post.likeCount > 10) key = 'liked'
        else key = 'new'
        break
      default:
        key = 'all'
    }
    
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(post)
    
    return groups
  }, {} as Record<string, TimelinePost[]>)
  
  return {
    ...timeline,
    groupedPosts,
    groupKeys: Object.keys(groupedPosts),
  }
}

// ============================================================================
// 📱 모바일 최적화 헬퍼들
// ============================================================================

/**
 * 모바일에서 스크롤 위치 기반 자동 로딩
 */
export const useTimelineAutoLoad = (
  timeline: UseTimelineReturn,
  threshold: number = 0.8 // 80% 스크롤 시 로드
) => {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)
  
  useEffect(() => {
    if (!scrollElement || !timeline.hasNext) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight
      
      if (scrollPercentage >= threshold && !timeline.loadingMore) {
        timeline.loadMore()
      }
    }
    
    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [scrollElement, timeline.hasNext, timeline.loadingMore, threshold, timeline.loadMore])
  
  return {
    ...timeline,
    setScrollElement,
  }
}

/**
 * Pull-to-refresh 기능
 */
export const useTimelinePullToRefresh = (timeline: UseTimelineReturn) => {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }, [])
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY
    const distance = currentY - startY.current
    
    if (distance > 0 && window.scrollY === 0) {
      setIsPulling(true)
      setPullDistance(Math.min(distance, 100))
    }
  }, [])
  
  const handleTouchEnd = useCallback(() => {
    if (isPulling && pullDistance > 50) {
      timeline.refresh()
    }
    setIsPulling(false)
    setPullDistance(0)
  }, [isPulling, pullDistance, timeline.refresh])
  
  return {
    ...timeline,
    isPulling,
    pullDistance,
    pullToRefreshProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}

// ============================================================================
// 기본 내보내기
// ============================================================================

export default useTimeline
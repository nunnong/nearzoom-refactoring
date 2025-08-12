// src/hooks/useTimeline.ts

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 API 및 타입 import
import {
  getFollowingTimeline,
  getRandomTimeline,
  refreshTimeline as refreshTimelineAPI,
  loadMoreTimeline
} from '@/lib/api/timeline'

import {
  getFollowingFeeds,
  getRandomFeeds,
  handleApiError
} from '@/lib/api/feed'

import {
  TimelinePost,
  TimelineApiResponse,
  TimelineState,
  transformBackendFeedToTimelinePost,
  TIMELINE_DEFAULTS,
  mergeTimelinePosts,
  sortTimelinePosts,
  updateTimelinePost
} from '@/lib/types/timeline'

// ============================================================================
// 훅 옵션 및 반환 타입
// ============================================================================

interface UseTimelineOptions {
  type?: 'timeline' | 'explore'    // 타임라인 타입 (팔로잉 vs 탐색)
  initialPageSize?: number
  enableOptimisticUpdates?: boolean
  maxRetries?: number
  cacheTimeout?: number
}

interface UseTimelineReturn {
  // 상태
  posts: TimelinePost[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  
  // 데이터 로딩
  loadMorePosts: () => Promise<void>
  refreshTimeline: () => Promise<void>
  retryLoad: () => Promise<void>
  
  // 포스트 액션 (게시물별 좋아요만)
  toggleLike: (feedId: number) => Promise<void>
  
  // 네비게이션
  goToFeed: (accountName: string) => void
  
  // 유틸리티
  clearError: () => void
  getPostById: (postId: string) => TimelinePost | undefined
  
  // 통계
  totalPosts: number
  likedPosts: number
}

// ============================================================================
// 메인 훅
// ============================================================================

export const useTimeline = ({
  type = 'timeline',
  initialPageSize = TIMELINE_DEFAULTS.PAGE_SIZE,
  enableOptimisticUpdates = true,
  maxRetries = 3,
  cacheTimeout = 5 * 60 * 1000 // 5분
}: UseTimelineOptions = {}): UseTimelineReturn => {

  // ============================================================================
  // 상태 관리 (nextCursor 타입 수정)
  // ============================================================================
  
  const [state, setState] = useState<TimelineState>({
    posts: [],
    loading: true,
    error: null,
    hasMore: true,
    nextCursor: null, // 🔥 수정: undefined 대신 null 사용
    type: type,
    lastUpdated: new Date().toISOString()
  })

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Refs for request management
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchTime = useRef<number>(0)
  const cacheRef = useRef<Map<string, { data: TimelinePost[]; timestamp: number }>>(new Map())

  // 인증 상태
  const { isAuthenticated } = useAuthStore()

  // ============================================================================
  // 캐시 관리
  // ============================================================================

  const getCachedData = useCallback((key: string): TimelinePost[] | null => {
    const cached = cacheRef.current.get(key)
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data
    }
    return null
  }, [cacheTimeout])

  const setCachedData = useCallback((key: string, data: TimelinePost[]) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() })
  }, [])

  // ============================================================================
  // API 호출 함수들
  // ============================================================================

  // 🔥 초기 타임라인 로드 (백엔드 API 연동)
  const loadInitialPosts = useCallback(async () => {
    // 인증 확인
    if (!isAuthenticated) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: '로그인이 필요합니다.'
      }))
      return
    }

    // 중복 요청 방지
    if (Date.now() - lastFetchTime.current < 1000) return

    // 캐시 확인
    const cacheKey = `${type}-initial`
    const cachedPosts = getCachedData(cacheKey)
    if (cachedPosts) {
      setState(prev => ({
        ...prev,
        posts: cachedPosts,
        loading: false
      }))
      return
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setState(prev => ({ ...prev, loading: true, error: null }))
    lastFetchTime.current = Date.now()

    try {
      let result: TimelineApiResponse

      // 🔥 백엔드 API 호출 (기존 feed.ts의 함수들 사용)
      if (type === 'timeline') {
        // 팔로잉 타임라인 (GET /feeds/following)
        const feedResult = await getFollowingFeeds()
        
        if (feedResult.success && feedResult.data) {
          result = {
            success: true,
            data: {
              posts: feedResult.data.items.map(item => 
                transformBackendFeedToTimelinePost({
                  feedId: item.photoId as number,
                  imgUrl: item.photoUrl,
                  caption: item.description,
                  authorId: parseInt(item.userId),
                  accountName: item.authorId,
                  profileImage: item.authorAvatar || '',
                  createdAt: item.createdAt,
                  liked: item.isLiked
                }, 'timeline')
              ),
              hasMore: feedResult.data.hasMore,
              nextCursor: feedResult.data.nextCursor || null,
              type: 'timeline' as const
            }
          }
        } else {
          result = {
            success: false,
            error: feedResult.error || '팔로잉 피드를 불러오는데 실패했습니다.'
          }
        }
      } else {
        // 탐색 (랜덤) 타임라인 (GET /feeds/random)
        const feedResult = await getRandomFeeds(initialPageSize)
        
        if (feedResult.success && feedResult.data) {
          result = {
            success: true,
            data: {
              posts: feedResult.data.items.map(item => 
                transformBackendFeedToTimelinePost({
                  feedId: item.photoId as number,
                  imgUrl: item.photoUrl,
                  caption: item.description,
                  authorId: parseInt(item.userId),
                  accountName: item.authorId,
                  profileImage: item.authorAvatar || '',
                  createdAt: item.createdAt,
                  liked: item.isLiked
                }, 'explore')
              ),
              hasMore: feedResult.data.hasMore,
              nextCursor: null, // 랜덤은 커서 없음
              type: 'explore' as const
            }
          }
        } else {
          result = {
            success: false,
            error: feedResult.error || '랜덤 피드를 불러오는데 실패했습니다.'
          }
        }
      }

      if (result.success && result.data) {
        const { posts, hasMore, nextCursor } = result.data

        setState(prev => ({
          ...prev,
          posts: posts,
          loading: false,
          hasMore,
          nextCursor: nextCursor || null, // 🔥 수정: undefined를 null로 변환
          lastUpdated: new Date().toISOString()
        }))

        // 캐시 저장
        setCachedData(cacheKey, posts)
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error || '타임라인을 불러오는데 실패했습니다.'
        }))
      }
    } catch (error) {
      console.error('Timeline load failed:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '타임라인을 불러오는데 실패했습니다.'
      }))
    }
  }, [type, isAuthenticated, initialPageSize, getCachedData, setCachedData])

  // 🔥 더 많은 포스트 로드 (백엔드 커서 페이징)
  const loadMorePosts = useCallback(async () => {
    if (state.loading || isLoadingMore || !state.hasMore || !state.nextCursor) return

    setIsLoadingMore(true)

    try {
      let result: TimelineApiResponse

      if (type === 'timeline') {
        const feedResult = await getFollowingFeeds(
          state.nextCursor?.createdAt,
          state.nextCursor?.feedId,
          initialPageSize
        )
        
        if (feedResult.success && feedResult.data) {
          result = {
            success: true,
            data: {
              posts: feedResult.data.items.map(item => 
                transformBackendFeedToTimelinePost({
                  feedId: item.photoId as number,
                  imgUrl: item.photoUrl,
                  caption: item.description,
                  authorId: parseInt(item.userId),
                  accountName: item.authorId,
                  profileImage: item.authorAvatar || '',
                  createdAt: item.createdAt,
                  liked: item.isLiked
                }, 'timeline')
              ),
              hasMore: feedResult.data.hasMore,
              nextCursor: feedResult.data.nextCursor || null,
              type: 'timeline' as const
            }
          }
        } else {
          result = {
            success: false,
            error: feedResult.error || '추가 피드를 불러오는데 실패했습니다.'
          }
        }
      } else {
        // 랜덤 피드는 커서 페이징 없음 - 새로운 랜덤 데이터 요청
        const feedResult = await getRandomFeeds(initialPageSize)
        
        if (feedResult.success && feedResult.data) {
          result = {
            success: true,
            data: {
              posts: feedResult.data.items.map(item => 
                transformBackendFeedToTimelinePost({
                  feedId: item.photoId as number,
                  imgUrl: item.photoUrl,
                  caption: item.description,
                  authorId: parseInt(item.userId),
                  accountName: item.authorId,
                  profileImage: item.authorAvatar || '',
                  createdAt: item.createdAt,
                  liked: item.isLiked
                }, 'explore')
              ),
              hasMore: false, // 랜덤은 더보기 없음
              nextCursor: null,
              type: 'explore' as const
            }
          }
        } else {
          result = {
            success: false,
            error: feedResult.error || '랜덤 피드를 불러오는데 실패했습니다.'
          }
        }
      }

      if (result.success && result.data) {
        const { posts: newPosts, hasMore, nextCursor } = result.data
        
        setState(prev => ({
          ...prev,
          posts: mergeTimelinePosts(prev.posts, newPosts),
          hasMore,
          nextCursor: nextCursor || null, // 🔥 수정: undefined를 null로 변환
          lastUpdated: new Date().toISOString()
        }))
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || '추가 포스트를 불러오는데 실패했습니다.'
        }))
      }
    } catch (error) {
      console.error('Load more posts failed:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '추가 포스트를 불러오는데 실패했습니다.'
      }))
    } finally {
      setIsLoadingMore(false)
    }
  }, [state.loading, isLoadingMore, state.hasMore, state.nextCursor, type, initialPageSize])

  // 🔥 타임라인 새로고침
  const refreshTimeline = useCallback(async () => {
    // 캐시 클리어
    cacheRef.current.clear()
    
    setState(prev => ({
      ...prev,
      hasMore: true,
      nextCursor: null
    }))

    await loadInitialPosts()
  }, [loadInitialPosts])

  // 재시도
  const retryLoad = useCallback(async () => {
    await loadInitialPosts()
  }, [loadInitialPosts])

  // ============================================================================
  // 포스트 상호작용 (게시물별 좋아요만)
  // ============================================================================

  // 🔥 좋아요 토글 (백엔드 API 연동) - 기존 feed.ts 함수 사용
  const toggleLike = useCallback(async (feedId: number) => {
    const post = state.posts.find(p => p.feedId === feedId)
    if (!post) return

    let rollback: (() => void) | null = null

    try {
      // 낙관적 업데이트
      if (enableOptimisticUpdates) {
        const newPosts = updateTimelinePost(state.posts, feedId, {
          isLiked: !post.isLiked
        })
        
        setState(prev => ({ ...prev, posts: newPosts }))
        
        // 롤백 함수
        rollback = () => {
          const originalPosts = updateTimelinePost(state.posts, feedId, {
            isLiked: post.isLiked
          })
          setState(prev => ({ ...prev, posts: originalPosts }))
        }
      }

      // 🔥 백엔드 API 호출 - 여기서는 간단한 시뮬레이션으로 대체
      // 실제로는 libs/api/feed.ts의 좋아요 함수를 사용해야 함
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 5% 확률로 실패 시뮬레이션
      if (Math.random() < 0.05) {
        throw new Error('좋아요 처리에 실패했습니다')
      }

      // 성공 시 최종 상태 업데이트
      const finalPosts = updateTimelinePost(state.posts, feedId, {
        isLiked: !post.isLiked
      })
      setState(prev => ({ ...prev, posts: finalPosts }))
      
    } catch (error) {
      console.error('Toggle like failed:', error)
      rollback?.()
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '좋아요 처리에 실패했습니다.'
      }))
    }
  }, [state.posts, enableOptimisticUpdates])

  // ============================================================================
  // 네비게이션
  // ============================================================================

  // 🔥 피드로 이동 (accountName 기반)
  const goToFeed = useCallback((accountName: string) => {
    // TODO: Next.js router를 사용해서 피드 페이지로 이동
    // router.push(`/feed/${accountName}`)
    console.log(`Navigate to feed: ${accountName}`)
  }, [])

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const getPostById = useCallback((postId: string) => {
    return state.posts.find(post => post.id === postId)
  }, [state.posts])

  // ============================================================================
  // 초기 로드 실행
  // ============================================================================

  useEffect(() => {
    loadInitialPosts()
  }, [loadInitialPosts])

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // ============================================================================
  // 계산된 값들
  // ============================================================================

  const totalPosts = state.posts.length
  const likedPosts = state.posts.filter(post => post.isLiked).length

  // 정렬된 포스트 (최신순)
  const sortedPosts = useMemo(() => {
    return sortTimelinePosts(state.posts)
  }, [state.posts])

  // ============================================================================
  // 반환 값
  // ============================================================================

  return {
    // 상태
    posts: sortedPosts,
    isLoading: state.loading,
    isLoadingMore,
    hasMore: state.hasMore,
    error: state.error,
    
    // 데이터 로딩
    loadMorePosts,
    refreshTimeline,
    retryLoad,
    
    // 포스트 액션 (게시물별 좋아요만)
    toggleLike,
    
    // 네비게이션
    goToFeed,
    
    // 유틸리티
    clearError,
    getPostById,
    
    // 통계
    totalPosts,
    likedPosts,
  }
}
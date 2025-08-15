// src/hooks/useTimeline.ts - 수정된 버전

import { useState, useEffect, useCallback } from 'react'

// 🔥 API 함수들은 /lib/api/timeline에서
import {
  getTimeline,
  loadMoreTimeline, // 🔥 이제 API 파일에 있음
  toggleTimelinePostLike,
} from '@/lib/api/timeline'

import {
  TimelinePost,
  TimelineApiResponse,
  TIMELINE_DEFAULTS,
  mergeTimelinePosts,
  updateTimelinePost,
} from '@/lib/types/timeline'

interface UseTimelineOptions {
  type?: 'timeline' | 'explore'
  size?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseTimelineReturn {
  posts: TimelinePost[]
  isLoading: boolean
  hasMore: boolean
  error: string | null

  // 액션 함수들
  loadMorePosts: () => Promise<void>
  refreshPosts: () => Promise<void>
  likePost: (postId: string) => Promise<void>
  unlikePost: (postId: string) => Promise<void>

  // 상태 관리
  clearError: () => void
  retry: () => Promise<void>
}

export const useTimeline = (
  options: UseTimelineOptions = {}
): UseTimelineReturn => {
  const {
    type = 'timeline',
    size = TIMELINE_DEFAULTS.PAGE_SIZE,
    autoRefresh = false,
    refreshInterval = TIMELINE_DEFAULTS.REFRESH_INTERVAL,
  } = options

  // 상태 관리
  const [posts, setPosts] = useState<TimelinePost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<{
    createdAt: string
    feedId: number
  } | null>(null)

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 초기 로드
  const loadInitialPosts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await getTimeline(type, { size })

      if (result.success && result.data) {
        setPosts(result.data.posts)
        setHasMore(result.data.hasMore)
        setNextCursor(result.data.nextCursor || null)
      } else {
        setError(result.error || '타임라인을 불러오는데 실패했습니다.')
        setPosts([])
        setHasMore(false)
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.')
      setPosts([])
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [type, size])

  // 더 많은 포스트 로드 (무한 스크롤)
  const loadMorePosts = useCallback(async () => {
    if (isLoading || !hasMore || !nextCursor || type === 'explore') {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // 🔥 이제 loadMoreTimeline 함수 사용 가능
      const result = await loadMoreTimeline(nextCursor, { size })

      if (result.success && result.data) {
        setPosts(prevPosts => mergeTimelinePosts(prevPosts, result.data!.posts))
        setHasMore(result.data.hasMore)
        setNextCursor(result.data.nextCursor || null)
      } else {
        setError(result.error || '추가 포스트를 불러오는데 실패했습니다.')
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, nextCursor, size, type])

  // 새로고침
  const refreshPosts = useCallback(async () => {
    // 커서 리셋하고 처음부터 다시 로드
    setNextCursor(null)
    setHasMore(true)
    await loadInitialPosts()
  }, [loadInitialPosts])

  // 재시도 (에러 후)
  const retry = useCallback(async () => {
    await refreshPosts()
  }, [refreshPosts])

  // 좋아요 처리
  const likePost = useCallback(
    async (postId: string) => {
      const post = posts.find(p => p.id === postId)
      if (!post || post.isLiked) return

      // 낙관적 업데이트
      setPosts(prevPosts =>
        updateTimelinePost(prevPosts, post.feedId, { isLiked: true })
      )

      try {
        const result = await toggleTimelinePostLike(post.feedId)

        if (!result.success) {
          // 실패 시 롤백
          setPosts(prevPosts =>
            updateTimelinePost(prevPosts, post.feedId, { isLiked: false })
          )
          console.error('좋아요 처리 실패:', result.error)
        }
      } catch (error) {
        // 에러 시 롤백
        setPosts(prevPosts =>
          updateTimelinePost(prevPosts, post.feedId, { isLiked: false })
        )
        console.error('좋아요 처리 중 오류:', error)
      }
    },
    [posts]
  )

  // 좋아요 취소
  const unlikePost = useCallback(
    async (postId: string) => {
      const post = posts.find(p => p.id === postId)
      if (!post || !post.isLiked) return

      // 낙관적 업데이트
      setPosts(prevPosts =>
        updateTimelinePost(prevPosts, post.feedId, { isLiked: false })
      )

      try {
        const result = await toggleTimelinePostLike(post.feedId)

        if (!result.success) {
          // 실패 시 롤백
          setPosts(prevPosts =>
            updateTimelinePost(prevPosts, post.feedId, { isLiked: true })
          )
          console.error('좋아요 취소 실패:', result.error)
        }
      } catch (error) {
        // 에러 시 롤백
        setPosts(prevPosts =>
          updateTimelinePost(prevPosts, post.feedId, { isLiked: true })
        )
        console.error('좋아요 취소 중 오류:', error)
      }
    },
    [posts]
  )

  // 컴포넌트 마운트 시 초기 로드
  useEffect(() => {
    loadInitialPosts()
  }, [loadInitialPosts])

  // 자동 새로고침 (옵션)
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshPosts()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshPosts])

  return {
    posts,
    isLoading,
    hasMore,
    error,

    loadMorePosts,
    refreshPosts,
    likePost,
    unlikePost,

    clearError,
    retry,
  }
}

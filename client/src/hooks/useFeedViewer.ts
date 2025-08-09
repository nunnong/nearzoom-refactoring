// src/hooks/useFeedViewer.ts
import { useState, useEffect, useCallback, useRef } from 'react'

// 임시 타입 정의 (실제 타입 파일이 없는 경우)
interface FeedAuthor {
  id: string
  username: string
  avatar?: string
}

interface FeedItem {
  id: string
  title: string
  description: string
  previewImage?: string
  fullImage?: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
  isSaved?: boolean
  hashtags: string[]
  createdAt: string
  author: FeedAuthor
}

interface FeedResponse {
  feeds: FeedItem[]
  hasMore: boolean
  totalCount?: number
}

interface UseFeedViewerOptions {
  userId?: string
  limit?: number
  initialLoad?: boolean
}

interface LoadingStates {
  initial: boolean
  loadMore: boolean
  refresh: boolean
  action: boolean // 좋아요, 저장 등의 액션
}

interface UseFeedViewerReturn {
  feedItems: FeedItem[]
  loading: LoadingStates
  error: string | null
  hasMore: boolean
  totalCount: number
  loadMore: () => void
  likeFeed: (feedId: string) => Promise<void>
  saveFeed: (feedId: string) => Promise<void>
  deleteFeed: (feedId: string) => Promise<void>
  refreshFeed: () => void
  retryLoad: () => void
  clearError: () => void
}

export const useFeedViewer = ({ 
  userId, 
  limit = 20,
  initialLoad = true 
}: UseFeedViewerOptions = {}): UseFeedViewerReturn => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState<LoadingStates>({
    initial: false,
    loadMore: false,
    refresh: false,
    action: false
  })
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  
  // 중복 요청 방지를 위한 ref
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)

  // 로딩 상태 업데이트 헬퍼
  const updateLoading = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }))
  }, [])

  // 에러 처리 헬퍼
  const handleError = useCallback((err: unknown, context: string) => {
    const message = err instanceof Error ? err.message : `${context} 중 오류가 발생했습니다`
    console.error(`Error in ${context}:`, err)
    setError(message)
  }, [])

  // 피드 데이터 로드
  const loadFeedItems = useCallback(async (
    pageNum: number = 1, 
    reset: boolean = false,
    loadingKey: keyof LoadingStates = 'initial'
  ) => {
    // 중복 요청 방지
    if (loadingRef.current) return
    loadingRef.current = true

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    updateLoading(loadingKey, true)
    setError(null)

    try {
      // TODO: 실제 API 호출로 교체
      const response = await fetch(
        `/api/feeds?page=${pageNum}&limit=${limit}${userId ? `&userId=${userId}` : ''}`,
        { signal: abortControllerRef.current.signal }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 피드를 불러올 수 없습니다`)
      }

      const data: FeedResponse = await response.json()
      
      if (reset) {
        setFeedItems(data.feeds)
      } else {
        setFeedItems(prev => [...prev, ...data.feeds])
      }
      
      setHasMore(data.hasMore)
      setTotalCount(data.totalCount || 0)
      setPage(pageNum)
    } catch (err) {
      // 요청이 취소된 경우는 에러로 처리하지 않음
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      handleError(err, '피드 로딩')
      
      // 개발 중에는 더미 데이터 사용
      if (process.env.NODE_ENV === 'development') {
        const dummyFeeds = generateDummyFeeds(pageNum, limit)
        if (reset) {
          setFeedItems(dummyFeeds)
        } else {
          setFeedItems(prev => [...prev, ...dummyFeeds])
        }
        setHasMore(pageNum < 5) // 5페이지까지만
        setTotalCount(100)
      }
    } finally {
      updateLoading(loadingKey, false)
      loadingRef.current = false
    }
  }, [userId, limit, updateLoading, handleError])

  // 더 많은 피드 로드
  const loadMore = useCallback(() => {
    if (!hasMore || loading.loadMore || loadingRef.current) return
    loadFeedItems(page + 1, false, 'loadMore')
  }, [hasMore, loading.loadMore, page, loadFeedItems])

  // 피드 새로고침
  const refreshFeed = useCallback(() => {
    setPage(1)
    setHasMore(true)
    setError(null)
    loadFeedItems(1, true, 'refresh')
  }, [loadFeedItems])

  // 재시도
  const retryLoad = useCallback(() => {
    if (page === 1) {
      refreshFeed()
    } else {
      loadFeedItems(page, false, 'initial')
    }
  }, [page, refreshFeed, loadFeedItems])

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 낙관적 업데이트를 위한 헬퍼
  const optimisticUpdate = useCallback(<T extends keyof FeedItem>(
    feedId: string,
    updates: Partial<Pick<FeedItem, T>>,
    rollback?: () => void
  ) => {
    setFeedItems(prev => prev.map(item => 
      item.id === feedId ? { ...item, ...updates } : item
    ))

    return () => {
      if (rollback) rollback()
      else {
        // 기본 롤백: 원래 상태로 되돌리기
        setFeedItems(prev => prev.map(item => 
          item.id === feedId ? { ...item, ...Object.keys(updates).reduce((acc, key) => {
            acc[key as T] = !updates[key as T] as any
            return acc
          }, {} as Partial<Pick<FeedItem, T>>) } : item
        ))
      }
    }
  }, [])

  // 좋아요 토글
  const likeFeed = useCallback(async (feedId: string) => {
    const feed = feedItems.find(item => item.id === feedId)
    if (!feed) return

    updateLoading('action', true)

    // 낙관적 업데이트
    const rollback = optimisticUpdate(feedId, {
      isLiked: !feed.isLiked,
      likesCount: feed.isLiked ? feed.likesCount - 1 : feed.likesCount + 1
    })

    try {
      const response = await fetch(`/api/feeds/${feedId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('좋아요 처리에 실패했습니다')
      }

      // 서버 응답에 따라 실제 상태 업데이트 (필요시)
      const result = await response.json()
      if (result.isLiked !== undefined) {
        setFeedItems(prev => prev.map(item => 
          item.id === feedId 
            ? { ...item, isLiked: result.isLiked, likesCount: result.likesCount }
            : item
        ))
      }
    } catch (err) {
      handleError(err, '좋아요')
      rollback() // 실패 시 롤백
      
      // 개발 모드에서는 낙관적 업데이트 유지
      if (process.env.NODE_ENV !== 'development') {
        rollback()
      }
    } finally {
      updateLoading('action', false)
    }
  }, [feedItems, updateLoading, optimisticUpdate, handleError])

  // 피드 저장
  const saveFeed = useCallback(async (feedId: string) => {
    const feed = feedItems.find(item => item.id === feedId)
    if (!feed) return

    updateLoading('action', true)

    // 낙관적 업데이트
    const rollback = optimisticUpdate(feedId, {
      isSaved: !feed.isSaved
    })

    try {
      const response = await fetch(`/api/feeds/${feedId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('저장 처리에 실패했습니다')
      }

      const result = await response.json()
      if (result.isSaved !== undefined) {
        setFeedItems(prev => prev.map(item => 
          item.id === feedId ? { ...item, isSaved: result.isSaved } : item
        ))
      }
    } catch (err) {
      handleError(err, '저장')
      rollback()
    } finally {
      updateLoading('action', false)
    }
  }, [feedItems, updateLoading, optimisticUpdate, handleError])

  // 피드 삭제
  const deleteFeed = useCallback(async (feedId: string) => {
    const originalItems = feedItems
    updateLoading('action', true)

    // 낙관적 업데이트: 즉시 제거
    setFeedItems(prev => prev.filter(item => item.id !== feedId))

    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다')
      }
    } catch (err) {
      handleError(err, '삭제')
      // 실패 시 롤백
      setFeedItems(originalItems)
    } finally {
      updateLoading('action', false)
    }
  }, [feedItems, updateLoading, handleError])

  // 초기 로드
  useEffect(() => {
    if (initialLoad) {
      loadFeedItems(1, true, 'initial')
    }
  }, [userId, initialLoad]) // userId가 변경될 때마다 새로 로드

  // cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    feedItems,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    likeFeed,
    saveFeed,
    deleteFeed,
    refreshFeed,
    retryLoad,
    clearError,
  }
}

// 개발용 더미 데이터 생성 함수
function generateDummyFeeds(page: number, limit: number): FeedItem[] {
  const feeds: FeedItem[] = []
  const baseIndex = (page - 1) * limit

  for (let i = 0; i < limit; i++) {
    const index = baseIndex + i
    feeds.push({
      id: `feed-${index}`,
      title: `피드 제목 ${index + 1}`,
      description: `이것은 피드 ${index + 1}의 설명입니다. Lorem ipsum dolor sit amet.`,
      previewImage: `/api/placeholder/400/400?text=Feed+${index + 1}`,
      fullImage: `/api/placeholder/800/600?text=Full+Feed+${index + 1}`,
      likesCount: Math.floor(Math.random() * 100),
      commentsCount: Math.floor(Math.random() * 50),
      isLiked: Math.random() > 0.5,
      isSaved: Math.random() > 0.7,
      hashtags: [`태그${index + 1}`, `해시태그${index + 1}`, 'daily'],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      author: {
        id: `user-${index % 10}`,
        username: `user${index % 10 + 1}`,
        avatar: `/api/placeholder/40/40?text=U${index % 10 + 1}`,
      },
    })
  }

  return feeds
}
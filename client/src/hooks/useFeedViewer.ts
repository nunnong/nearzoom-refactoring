// src/hooks/useFeedViewer.ts

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 API 및 타입 import
import {
  getFollowingFeeds,
  getRandomFeeds,
  getCurrentUser,
  handleApiError
} from '@/lib/api/feed'

import {
  getFeedDetail,
  refreshTimeline,
  loadMoreTimeline
} from '@/lib/api/timeline'

import {
  toggleLike
} from '@/lib/api/likes' // 좋아요 API (별도 파일 필요)

import {
  TimelinePost,
  transformBackendFeedToTimelinePost
} from '@/lib/types/timeline'

import {
  BackendFeedDetailResponse,
  CanvasFeedItem
} from '@/lib/types/feed'

// ============================================================================
// 타입 정의 (백엔드 연동 단순화)
// ============================================================================

interface FeedAuthor {
  id: string          // accountName
  username: string    // accountName
  avatar?: string     // profileImage
}

interface FeedItem {
  id: string          // feedId (문자열)
  feedId: number      // feedId (숫자)
  accountName: string // 계정명 (핵심 식별자)
  title: string       // caption 기반
  description: string // caption
  imageUrl: string    // imgUrl
  isLiked: boolean    // liked
  createdAt: string   // createdAt
  author: FeedAuthor  // 작성자 정보
}

interface UseFeedViewerOptions {
  type?: 'timeline' | 'explore' | 'user'  // 피드 타입
  accountName?: string                     // 특정 사용자 피드 (user 타입일 때)
  limit?: number
  initialLoad?: boolean
}

interface LoadingStates {
  initial: boolean
  loadMore: boolean
  refresh: boolean
  action: boolean // 좋아요 등의 액션
}

interface UseFeedViewerReturn {
  feedItems: FeedItem[]
  loading: LoadingStates
  error: string | null
  hasMore: boolean
  totalCount: number
  
  // 데이터 로딩
  loadMore: () => void
  refreshFeed: () => void
  retryLoad: () => void
  
  // 피드 액션 (단순화)
  likeFeed: (feedId: number) => Promise<void>
  
  // 네비게이션
  goToFeed: (accountName: string) => void
  
  // 유틸리티
  clearError: () => void
}

// ============================================================================
// 메인 훅
// ============================================================================

export const useFeedViewer = ({ 
  type = 'timeline',
  accountName,
  limit = 20,
  initialLoad = true 
}: UseFeedViewerOptions = {}): UseFeedViewerReturn => {

  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState<LoadingStates>({
    initial: false,
    loadMore: false,
    refresh: false,
    action: false
  })
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<{
    createdAt: string
    feedId: number
  } | null>(null)
  
  // 중복 요청 방지를 위한 ref
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)

  // 인증 상태
  const { isAuthenticated } = useAuthStore()

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 로딩 상태 업데이트 헬퍼
  const updateLoading = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }))
  }, [])

  // 에러 처리 헬퍼
  const handleErrorLocal = useCallback((err: unknown, context: string) => {
    const message = err instanceof Error ? err.message : `${context} 중 오류가 발생했습니다`
    console.error(`Error in ${context}:`, err)
    setError(message)
  }, [])

  // 🔥 백엔드 데이터를 FeedItem으로 변환
  const transformBackendToFeedItem = useCallback((backendFeed: BackendFeedDetailResponse): FeedItem => {
    return {
      id: backendFeed.feedId.toString(),
      feedId: backendFeed.feedId,
      accountName: backendFeed.accountName,
      title: backendFeed.caption || `${backendFeed.accountName}의 피드`,
      description: backendFeed.caption || '',
      imageUrl: backendFeed.imgUrl,
      isLiked: backendFeed.liked,
      createdAt: backendFeed.createdAt,
      author: {
        id: backendFeed.accountName,
        username: backendFeed.accountName,
        avatar: backendFeed.profileImage
      }
    }
  }, [])

  // ============================================================================
  // 백엔드 API 연동 - 피드 데이터 로드
  // ============================================================================

  const loadFeedItems = useCallback(async (
    reset: boolean = false,
    loadingKey: keyof LoadingStates = 'initial'
  ) => {
    // 인증 확인
    if (!isAuthenticated) {
      setError('로그인이 필요합니다.')
      return
    }

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
      let result: any

      // 🔥 백엔드 API 호출 (타입에 따라)
      if (type === 'timeline') {
        // 팔로잉 피드 (GET /feeds/following)
        result = await getFollowingFeeds(
          reset ? undefined : nextCursor?.createdAt,
          reset ? undefined : nextCursor?.feedId,
          limit
        )
      } else if (type === 'explore') {
        // 랜덤 피드 (GET /feeds/random)
        result = await getRandomFeeds(limit)
      } else if (type === 'user' && accountName) {
        // 특정 사용자 피드 (구현 필요 - 현재는 검색 API 활용)
        // TODO: GET /feeds/{accountName} API 추가 후 사용
        result = await getRandomFeeds(limit) // 임시로 랜덤 피드 사용
      } else {
        throw new Error('유효하지 않은 피드 타입입니다.')
      }

      if (result.success && result.data) {
        // CanvasFeedItem을 FeedItem으로 변환
        const newFeedItems = result.data.items.map((item: CanvasFeedItem) => 
          transformBackendToFeedItem({
            feedId: item.photoId as number,
            imgUrl: item.photoUrl,
            caption: item.description,
            authorId: parseInt(item.userId),
            accountName: item.authorId,
            profileImage: item.authorAvatar || '',
            createdAt: item.createdAt,
            liked: item.isLiked
          })
        )

        if (reset) {
          setFeedItems(newFeedItems)
        } else {
          setFeedItems(prev => [...prev, ...newFeedItems])
        }

        setHasMore(result.data.hasMore)
        setNextCursor(result.data.nextCursor || null)
        setTotalCount(newFeedItems.length)

      } else {
        throw new Error(result.error || '피드를 불러오는데 실패했습니다.')
      }

    } catch (err) {
      // 요청이 취소된 경우는 에러로 처리하지 않음
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      handleErrorLocal(err, '피드 로딩')
    } finally {
      updateLoading(loadingKey, false)
      loadingRef.current = false
    }
  }, [type, accountName, limit, isAuthenticated, nextCursor, updateLoading, handleErrorLocal, transformBackendToFeedItem])

  // ============================================================================
  // 공개 API 함수들
  // ============================================================================

  // 더 많은 피드 로드
  const loadMore = useCallback(() => {
    if (!hasMore || loading.loadMore || loadingRef.current) return
    loadFeedItems(false, 'loadMore')
  }, [hasMore, loading.loadMore, loadFeedItems])

  // 피드 새로고침
  const refreshFeed = useCallback(() => {
    setNextCursor(null)
    setHasMore(true)
    setError(null)
    loadFeedItems(true, 'refresh')
  }, [loadFeedItems])

  // 재시도
  const retryLoad = useCallback(() => {
    if (feedItems.length === 0) {
      refreshFeed()
    } else {
      loadFeedItems(false, 'initial')
    }
  }, [feedItems.length, refreshFeed, loadFeedItems])

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ============================================================================
  // 피드 상호작용 (단순화)
  // ============================================================================

  // 🔥 좋아요 토글 (백엔드 연동)
  const likeFeed = useCallback(async (feedId: number) => {
    const feed = feedItems.find(item => item.feedId === feedId)
    if (!feed) return

    updateLoading('action', true)

    // 낙관적 업데이트
    const originalIsLiked = feed.isLiked
    setFeedItems(prev => prev.map(item => 
      item.feedId === feedId 
        ? { ...item, isLiked: !item.isLiked }
        : item
    ))

    try {
      // TODO: 실제 좋아요 API 호출 (POST/DELETE /likes/{feedId})
      // 현재는 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 5% 확률로 실패 시뮬레이션
      if (Math.random() < 0.05) {
        throw new Error('좋아요 처리에 실패했습니다')
      }

      // 성공 시 상태 유지 (이미 낙관적 업데이트됨)
    } catch (err) {
      // 실패 시 롤백
      setFeedItems(prev => prev.map(item => 
        item.feedId === feedId 
          ? { ...item, isLiked: originalIsLiked }
          : item
      ))
      handleErrorLocal(err, '좋아요')
    } finally {
      updateLoading('action', false)
    }
  }, [feedItems, updateLoading, handleErrorLocal])

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
  // 초기 로드 실행
  // ============================================================================

  useEffect(() => {
    if (initialLoad) {
      loadFeedItems(true, 'initial')
    }
  }, [type, accountName, initialLoad]) // type이나 accountName이 변경될 때마다 새로 로드

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
    
    // 피드 액션 (단순화)
    likeFeed,
    
    // 네비게이션
    goToFeed,
    
    // 유틸리티
    clearError,
  }
}
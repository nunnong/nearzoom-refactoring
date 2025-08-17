// ============================================================================
// src/hooks/useFeedViewer.ts - 백엔드 커서 기반 무한 스크롤 완벽 연동
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 타입 import (feed.ts에서)
import {
  type ApiResponse,
  type PostResponse,
  type PostListResponse,
  type FeedWithPostsResponse,
  type FeedSearchResponse,
  type CursorPaginationParams,
  type InfiniteScrollState,
  getOptimalLimit,
  buildPaginationQuery,
  API_ENDPOINTS,
  formatTimeAgo,
  formatLikeCount,
} from '@/lib/types/feed'

// 🔧 올바른 API 사용
import api from '@/lib/axios'

// ============================================================================
// 🎯 프론트엔드 피드 아이템 타입 정의
// ============================================================================

// 프론트엔드에서 사용할 통합된 피드 아이템 (PostResponse 기반)
export interface FeedItem {
  // 기본 정보
  id: string           // postId를 문자열로 변환
  postId: number       // 백엔드 API 호출용 숫자 ID (커서로 사용)
  photoId: number      // 마이룸 사진 ID
  
  // 콘텐츠
  caption: string      // 캡션
  imageUrl: string     // 이미지 URL
  displayOrder?: number // 피드 내 표시 순서
  createdAt: string    // 생성일
  
  // 상호작용
  isLiked: boolean     // 좋아요 상태
  likeCount: number    // 좋아요 수
  
  // 작성자 정보
  author: {
    id: string         // authorAccountName
    userId: number     // authorId
    username: string   // authorAccountName
    avatar?: string    // authorProfileImage
  }
  
  // UI 상태
  isLoading?: boolean  // 로딩 상태 (좋아요 등)
  
  // 메타데이터
  source: 'timeline' | 'explore' | 'user' | 'search' // 데이터 출처
  
  // 계산된 필드들
  timeAgo?: string     // 상대 시간
  formattedLikeCount?: string // 포맷된 좋아요 수
}

// 피드 뷰어 옵션
export interface UseFeedViewerOptions {
  type?: 'timeline' | 'explore' | 'user' | 'search'
  accountName?: string     // 특정 사용자 피드
  searchQuery?: string     // 검색 쿼리
  limit?: number           // 페이지 크기 (커서 기반 파라미터)
  initialLoad?: boolean    // 자동 초기 로드
  deviceType?: 'mobile' | 'tablet' | 'desktop' // 디바이스별 최적화
  enableOptimisticUpdates?: boolean // 낙관적 업데이트 활성화
  onItemsLoaded?: (items: FeedItem[], isRefresh: boolean) => void
  onError?: (error: string) => void
}

// 로딩 상태들
export interface FeedLoadingStates {
  initial: boolean     // 초기 로드
  loadMore: boolean    // 더보기 로드
  refresh: boolean     // 새로고침
  action: boolean      // 좋아요 등의 액션
}

// 피드 뷰어 훅 반환 타입
export interface UseFeedViewerReturn {
  // 📊 데이터 (마이룸과 동일한 구조)
  feedItems: FeedItem[]
  loading: FeedLoadingStates
  error: string | null
  hasNext: boolean
  nextCursor: number | null
  totalCount: number
  isEmpty: boolean
  
  // 📱 커서 기반 데이터 로딩 (마이룸 패턴)
  loadInitial: () => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  retry: () => Promise<void>
  
  // 🔄 피드 상호작용 (낙관적 업데이트)
  toggleLike: (postId: number) => Promise<void>
  
  // 📊 데이터 조작
  updateItem: (postId: number, updater: (item: FeedItem) => FeedItem) => void
  removeItem: (postId: number) => void
  prependItems: (items: FeedItem[]) => void
  
  // 🎯 유틸리티
  clearError: () => void
  reset: () => void
  findItem: (postId: number) => FeedItem | undefined
  
  // 🔍 네비게이션 헬퍼
  goToPost: (postId: number) => void
  goToUserFeed: (accountName: string) => void
}

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

// 🔥 PostResponse를 FeedItem으로 변환 (백엔드 데이터 → 프론트엔드)
const transformPostToFeedItem = (
  post: PostResponse, 
  source: FeedItem['source'] = 'user'
): FeedItem => {
  return {
    // 기본 정보
    id: post.postId.toString(),
    postId: post.postId,
    photoId: post.photoId,
    
    // 콘텐츠
    caption: post.caption || '',
    imageUrl: post.imgUrl,
    displayOrder: post.displayOrder || undefined,
    createdAt: post.createdAt,
    
    // 상호작용
    isLiked: post.isLikedByMe,
    likeCount: post.likeCount,
    
    // 작성자 정보
    author: {
      id: post.authorAccountName,
      userId: post.authorId,
      username: post.authorAccountName,
      avatar: post.authorProfileImage || undefined
    },
    
    // UI 상태
    isLoading: false,
    
    // 메타데이터
    source,
    
    // 계산된 필드들
    timeAgo: formatTimeAgo(post.createdAt),
    formattedLikeCount: formatLikeCount(post.likeCount),
  }
}

// 에러 처리 헬퍼
const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }

    switch (axiosError.response?.status) {
      case 401:
        return '로그인이 필요합니다.'
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
// 🔥 백엔드 API 호출 함수들 (커서 기반)
// ============================================================================

// 📱 타임라인 피드 (팔로잉 게시물들) - GET /feeds/timeline
const fetchTimelineFeed = async (params: CursorPaginationParams): Promise<PostListResponse> => {
  const query = buildPaginationQuery(params)
  const response = await api.get<ApiResponse<PostListResponse>>(`${API_ENDPOINTS.TIMELINE}?${query}`)
  
  if (response.data.error || !response.data.data) {
    throw new Error(response.data.message || '타임라인을 불러올 수 없습니다.')
  }
  
  return response.data.data
}

// 🌍 탐색 피드 (랜덤 게시물들) - GET /feeds/explore  
const fetchExploreFeed = async (params: CursorPaginationParams): Promise<PostListResponse> => {
  const query = buildPaginationQuery(params)
  const response = await api.get<ApiResponse<PostListResponse>>(`${API_ENDPOINTS.EXPLORE}?${query}`)
  
  if (response.data.error || !response.data.data) {
    throw new Error(response.data.message || '탐색 피드를 불러올 수 없습니다.')
  }
  
  return response.data.data
}

// 👤 사용자 피드 - GET /feeds/user/account/{accountName}
const fetchUserFeed = async (accountName: string, params: CursorPaginationParams): Promise<FeedWithPostsResponse> => {
  const query = buildPaginationQuery(params)
  const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
    `${API_ENDPOINTS.USER_FEED_BY_ACCOUNT(accountName)}?${query}`
  )
  
  if (response.data.error || !response.data.data) {
    throw new Error(response.data.message || '사용자 피드를 불러올 수 없습니다.')
  }
  
  return response.data.data
}

// 🔍 피드 검색 - GET /feeds/search
const fetchSearchFeeds = async (searchQuery: string, params: CursorPaginationParams): Promise<FeedSearchResponse> => {
  const searchParams = new URLSearchParams({
    query: searchQuery,
    limit: (params.limit || 20).toString(),
    ...(params.cursor && { cursor: params.cursor.toString() }),
  })
  
  const response = await api.get<ApiResponse<FeedSearchResponse>>(
    `${API_ENDPOINTS.SEARCH_FEEDS}?${searchParams.toString()}`
  )
  
  if (response.data.error || !response.data.data) {
    throw new Error(response.data.message || '검색에 실패했습니다.')
  }
  
  return response.data.data
}

// 💖 좋아요 토글 - POST/DELETE /likes/posts/{postId}
const togglePostLike = async (postId: number, currentlyLiked: boolean): Promise<void> => {
  if (currentlyLiked) {
    // 언좋아요
    const response = await api.delete<ApiResponse<void>>(API_ENDPOINTS.UNLIKE_POST(postId))
    if (response.data.error) {
      throw new Error(response.data.message || '좋아요 취소에 실패했습니다.')
    }
  } else {
    // 좋아요
    const response = await api.post<ApiResponse<void>>(API_ENDPOINTS.LIKE_POST(postId))
    if (response.data.error) {
      throw new Error(response.data.message || '좋아요에 실패했습니다.')
    }
  }
}

// ============================================================================
// 🚀 메인 피드 뷰어 훅 (백엔드 커서 기반 무한스크롤)
// ============================================================================

export const useFeedViewer = (options: UseFeedViewerOptions = {}): UseFeedViewerReturn => {
  const {
    type = 'timeline',
    accountName,
    searchQuery,
    limit,
    initialLoad = true,
    deviceType = 'mobile',
    enableOptimisticUpdates = true,
    onItemsLoaded,
    onError,
  } = options

  const router = useRouter()

  // ============================================================================
  // 상태 관리 (마이룸과 동일한 구조)
  // ============================================================================
  
  // 🔐 무조건 로그인 필수: Zustand 상태 관리
  const { isAuthenticated, user } = useAuthStore()
  
  // 📱 디바이스별 최적 limit 계산
  const optimalLimit = limit || getOptimalLimit(deviceType)
  
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState<FeedLoadingStates>({
    initial: false,
    loadMore: false,
    refresh: false,
    action: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  
  // 요청 관리
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)

  // 🔐 무조건 로그인 필수 - 미인증시 즉시 리다이렉트
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.warn('🔐 인증되지 않은 사용자 - 로그인 페이지로 리다이렉트')
      router.replace('/auth/login')
      return
    }
  }, [isAuthenticated, user, router])

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 🔐 인증 체크 헬퍼 - 모든 API 호출 전 필수
  const checkAuth = useCallback((): boolean => {
    if (!isAuthenticated || !user) {
      const errorMessage = '로그인이 필요합니다.'
      setError(errorMessage)
      onError?.(errorMessage)
      router.replace('/auth/login')
      return false
    }
    return true
  }, [isAuthenticated, user, onError, router])

  // 로딩 상태 업데이트 헬퍼
  const updateLoading = useCallback((key: keyof FeedLoadingStates, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }))
  }, [])

  // 에러 처리 헬퍼
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
  // 🔥 백엔드 커서 기반 데이터 로드 (마이룸 패턴)
  // ============================================================================

  const loadFeedData = useCallback(async (
    isRefresh: boolean = false,
    loadingKey: keyof FeedLoadingStates = 'initial'
  ) => {
    // 🔐 인증 확인 (모든 API 호출 전 필수)
    if (!checkAuth()) return

    // 중복 요청 방지
    if (loadingRef.current) return
    loadingRef.current = true

    // 이전 요청 취소
    cancelRequest()

    updateLoading(loadingKey, true)
    if (isRefresh) {
      setError(null)
    }

    try {
      console.log(`🔥 ${type} 피드 로딩 시작 (커서 기반):`, { 
        isRefresh, 
        limit: optimalLimit,
        cursor: isRefresh ? null : nextCursor,
        accountName,
        searchQuery
      })

      // 📱 커서 기반 파라미터 설정
      const cursorParams: CursorPaginationParams = {
        limit: optimalLimit,
        cursor: isRefresh ? undefined : nextCursor || undefined
      }

      let newFeedItems: FeedItem[] = []
      let hasNextPage = false
      let newNextCursor: number | null = null

      // 🔥 백엔드 API 호출 (타입별)
      switch (type) {
        case 'timeline': {
          // GET /feeds/timeline?limit=20&cursor=12345
          const result = await fetchTimelineFeed(cursorParams)
          newFeedItems = result.posts.map(post => transformPostToFeedItem(post, 'timeline'))
          hasNextPage = result.hasNext
          newNextCursor = result.nextCursor
          break
        }
        
        case 'explore': {
          // GET /feeds/explore?limit=20&cursor=12345
          const result = await fetchExploreFeed(cursorParams)
          newFeedItems = result.posts.map(post => transformPostToFeedItem(post, 'explore'))
          hasNextPage = result.hasNext
          newNextCursor = result.nextCursor
          break
        }
        
        case 'user': {
          // GET /feeds/user/account/{accountName}?limit=20&cursor=12345
          if (!accountName) {
            throw new Error('사용자 계정명이 필요합니다.')
          }
          
          const result = await fetchUserFeed(accountName, cursorParams)
          newFeedItems = result.posts.map(post => transformPostToFeedItem(post, 'user'))
          hasNextPage = result.hasNext
          newNextCursor = result.nextCursor
          break
        }
        
        case 'search': {
          // GET /feeds/search?query=검색어&limit=10&cursor=12345
          if (!searchQuery) {
            throw new Error('검색어가 필요합니다.')
          }
          
          const result = await fetchSearchFeeds(searchQuery, cursorParams)
          // 검색은 피드 목록을 반환하므로 각 피드의 게시물들을 평탄화
          newFeedItems = result.feeds.flatMap(feed => 
            feed.posts.map(post => transformPostToFeedItem(post, 'search'))
          )
          hasNextPage = result.hasNext
          newNextCursor = result.nextCursor
          break
        }
        
        default:
          throw new Error(`지원하지 않는 피드 타입: ${type}`)
      }

      console.log(`🔥 ${type} 피드 로딩 완료:`, { 
        count: newFeedItems.length,
        hasNext: hasNextPage,
        nextCursor: newNextCursor
      })

      // 📱 상태 업데이트 (마이룸 패턴)
      if (isRefresh) {
        // 새로고침: 전체 교체
        setFeedItems(newFeedItems)
        setHasNext(hasNextPage)
        setNextCursor(newNextCursor)
      } else {
        // 더보기: 기존 데이터에 추가 (중복 제거)
        setFeedItems(prev => {
          const existingIds = new Set(prev.map(item => item.postId))
          const uniqueNewItems = newFeedItems.filter(item => !existingIds.has(item.postId))
          return [...prev, ...uniqueNewItems]
        })
        setHasNext(hasNextPage)
        setNextCursor(newNextCursor)
      }

      onItemsLoaded?.(newFeedItems, isRefresh)

    } catch (err) {
      // 요청이 취소된 경우는 에러로 처리하지 않음
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      handleError(err, `${type} 피드 로딩`)
    } finally {
      updateLoading(loadingKey, false)
      loadingRef.current = false
    }
  }, [
    type, accountName, searchQuery, optimalLimit, 
    nextCursor, updateLoading, handleError, cancelRequest, onItemsLoaded, checkAuth
  ])

  // ============================================================================
  // 🔥 공개 API 함수들 (마이룸과 동일한 인터페이스)
  // ============================================================================

  // 📱 초기 로드
  const loadInitial = useCallback(async () => {
    setFeedItems([])
    setHasNext(false)
    setNextCursor(null)
    await loadFeedData(true, 'initial')
  }, [loadFeedData])

  // 📱 커서 기반 더보기 로딩
  const loadMore = useCallback(async () => {
    if (!hasNext || loading.loadMore || loadingRef.current) {
      console.log('더보기 로딩 스킵:', {
        hasNext,
        loadingMore: loading.loadMore,
        isLoading: loadingRef.current
      })
      return
    }
    
    console.log('🔥 커서 기반 더보기 로딩:', { hasNext, nextCursor })
    await loadFeedData(false, 'loadMore')
  }, [hasNext, loading.loadMore, nextCursor, loadFeedData])

  // 🔄 새로고침
  const refresh = useCallback(async () => {
    console.log('🔥 커서 기반 새로고침')
    await loadFeedData(true, 'refresh')
  }, [loadFeedData])

  // 🔄 재시도
  const retry = useCallback(async () => {
    console.log('🔥 재시도 로딩:', { itemsCount: feedItems.length })
    if (feedItems.length === 0) {
      await loadInitial()
    } else {
      await loadMore()
    }
  }, [feedItems.length, loadInitial, loadMore])

  // ============================================================================
  // 🔄 피드 상호작용 (낙관적 업데이트)
  // ============================================================================

  // 💖 좋아요 토글 (낙관적 업데이트)
  const toggleLike = useCallback(async (postId: number) => {
    // 🔐 인증 확인
    if (!checkAuth()) return

    const feedItem = feedItems.find(item => item.postId === postId)
    if (!feedItem) {
      console.warn('Feed item not found:', postId)
      return
    }

    console.log('🔥 좋아요 토글 시작:', { postId, currentLiked: feedItem.isLiked })

    updateLoading('action', true)

    // 낙관적 업데이트
    if (enableOptimisticUpdates) {
      setFeedItems(prev => prev.map(item => 
        item.postId === postId 
          ? { 
              ...item, 
              isLiked: !item.isLiked,
              likeCount: item.isLiked ? item.likeCount - 1 : item.likeCount + 1,
              formattedLikeCount: formatLikeCount(
                item.isLiked ? item.likeCount - 1 : item.likeCount + 1
              ),
              isLoading: true
            }
          : item
      ))
    }

    try {
      // 🔥 백엔드 API 호출
      await togglePostLike(postId, feedItem.isLiked)

      console.log('🔥 좋아요 토글 성공:', { postId, newLiked: !feedItem.isLiked })

      // 로딩 상태 해제
      setFeedItems(prev => prev.map(item => 
        item.postId === postId 
          ? { ...item, isLoading: false }
          : item
      ))

    } catch (err) {
      console.error('좋아요 토글 실패:', err)
      
      // 실패 시 롤백 (낙관적 업데이트가 활성화된 경우)
      if (enableOptimisticUpdates) {
        setFeedItems(prev => prev.map(item => 
          item.postId === postId 
            ? { 
                ...item, 
                isLiked: feedItem.isLiked, // 원래 상태로 복원
                likeCount: feedItem.likeCount,
                formattedLikeCount: feedItem.formattedLikeCount,
                isLoading: false
              }
            : item
        ))
      }
      
      handleError(err, '좋아요 토글')
    } finally {
      updateLoading('action', false)
    }
  }, [feedItems, enableOptimisticUpdates, updateLoading, handleError, checkAuth])

  // ============================================================================
  // 📊 데이터 조작 함수들
  // ============================================================================

  const updateItem = useCallback((postId: number, updater: (item: FeedItem) => FeedItem) => {
    setFeedItems(prev => prev.map(item => 
      item.postId === postId ? updater(item) : item
    ))
  }, [])

  const removeItem = useCallback((postId: number) => {
    setFeedItems(prev => prev.filter(item => item.postId !== postId))
  }, [])

  const prependItems = useCallback((newItems: FeedItem[]) => {
    setFeedItems(prev => [...newItems, ...prev])
  }, [])

  const findItem = useCallback((postId: number): FeedItem | undefined => {
    return feedItems.find(item => item.postId === postId)
  }, [feedItems])

  // ============================================================================
  // 🎯 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setFeedItems([])
    setLoading({
      initial: false,
      loadMore: false,
      refresh: false,
      action: false,
    })
    setError(null)
    setHasNext(false)
    setNextCursor(null)
  }, [])

  // ============================================================================
  // 🔍 네비게이션 헬퍼들
  // ============================================================================

  const goToPost = useCallback((postId: number) => {
    router.push(`/feed/post/${postId}`)
  }, [router])

  const goToUserFeed = useCallback((accountName: string) => {
    router.push(`/@${accountName}`)
  }, [router])

  // ============================================================================
  // 📱 초기 로드 실행 (마이룸 패턴)
  // ============================================================================

  useEffect(() => {
    if (initialLoad && isAuthenticated && user) {
      console.log('🔥 커서 기반 초기 로드 실행:', { 
        type, accountName, searchQuery, limit: optimalLimit 
      })
      
      loadInitial()
    }
  }, [type, accountName, searchQuery, optimalLimit, initialLoad, isAuthenticated, user, loadInitial])

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
  // 🔐 미인증시 안전한 기본값 반환
  // ============================================================================

  if (!isAuthenticated || !user) {
    return {
      feedItems: [],
      loading: {
        initial: false,
        loadMore: false,
        refresh: false,
        action: false,
      },
      error: '로그인이 필요합니다.',
      hasNext: false,
      nextCursor: null,
      totalCount: 0,
      isEmpty: true,
      loadInitial: () => Promise.resolve(),
      loadMore: () => Promise.resolve(),
      refresh: () => Promise.resolve(),
      retry: () => Promise.resolve(),
      toggleLike: () => Promise.resolve(),
      updateItem: () => {},
      removeItem: () => {},
      prependItems: () => {},
      clearError: () => {},
      reset: () => {},
      findItem: () => undefined,
      goToPost: () => {},
      goToUserFeed: () => {},
    }
  }

  // ============================================================================
  // 반환 값 (마이룸과 완전 호환)
  // ============================================================================

  return {
    // 📊 데이터 (마이룸과 동일)
    feedItems,
    loading,
    error,
    hasNext,
    nextCursor,
    totalCount: feedItems.length,
    isEmpty: feedItems.length === 0 && !loading.initial,
    
    // 📱 커서 기반 데이터 로딩 (마이룸 패턴)
    loadInitial,
    loadMore,
    refresh,
    retry,
    
    // 🔄 피드 상호작용
    toggleLike,
    
    // 📊 데이터 조작
    updateItem,
    removeItem,
    prependItems,
    
    // 🎯 유틸리티
    clearError,
    reset,
    findItem,
    
    // 🔍 네비게이션
    goToPost,
    goToUserFeed,
  }
}

// ============================================================================
// 🔥 특화된 편의 훅들 (마이룸 패턴)
// ============================================================================

/**
 * 타임라인 전용 훅 (팔로잉 게시물들)
 */
export const useTimelineFeed = (options: Omit<UseFeedViewerOptions, 'type'> = {}) => {
  return useFeedViewer({ ...options, type: 'timeline' })
}

/**
 * 탐색 전용 훅 (랜덤 게시물들)
 */
export const useExploreFeed = (options: Omit<UseFeedViewerOptions, 'type'> = {}) => {
  return useFeedViewer({ ...options, type: 'explore' })
}

/**
 * 사용자 피드 전용 훅
 */
export const useUserFeed = (
  accountName: string, 
  options: Omit<UseFeedViewerOptions, 'type' | 'accountName'> = {}
) => {
  return useFeedViewer({ ...options, type: 'user', accountName })
}

/**
 * 검색 결과 전용 훅
 */
export const useSearchFeed = (
  searchQuery: string, 
  options: Omit<UseFeedViewerOptions, 'type' | 'searchQuery'> = {}
) => {
  return useFeedViewer({ ...options, type: 'search', searchQuery })
}

// ============================================================================
// 🔧 고급 기능 훅들
// ============================================================================

/**
 * 다중 피드 관리 훅 (여러 피드를 동시에 관리)
 */
export const useMultipleFeedViewer = (feeds: Array<{ id: string; options: UseFeedViewerOptions }>) => {
  const feedViewers = feeds.reduce((acc, feed) => {
    acc[feed.id] = useFeedViewer(feed.options)
    return acc
  }, {} as Record<string, UseFeedViewerReturn>)
  
  return feedViewers
}
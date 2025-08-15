// src/hooks/useInfiniteScroll.ts - 백엔드 커서 기반 무한스크롤 완벽 연동

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 타입 import (feed.ts에서)
import {
  type ApiResponse,
  type CursorPaginationParams,
  type InfiniteScrollState,
  buildPaginationQuery,
  getOptimalLimit,
} from '@/lib/types/feed'

// 🔥 API 클라이언트 (아키텍처 원칙: 모든 컴포넌트 → api from '@/lib/axios')
import api from '@/lib/axios'

// ============================================================================
// 🎯 제네릭 무한스크롤 타입 정의 (마이룸과 100% 동일)
// ============================================================================

// 백엔드 페이징 응답 구조 (마이룸 방식)
export interface CursorPaginatedResponse<T> {
  items: T[]                // 데이터 배열 (posts, photos 등)
  hasNext: boolean          // 다음 페이지 존재 여부  
  nextCursor: number | null // 다음 커서 (마지막 아이템 ID)
}

// 무한스크롤 훅 옵션
export interface UseInfiniteScrollOptions<T> {
  // 기본 설정
  initialLimit?: number             // 초기 로드 개수
  enableAutoLoad?: boolean          // 자동 로드 활성화
  threshold?: number                // 자동 로드 임계점 (px)
  
  // 성능 최적화
  enableVirtualization?: boolean    // 가상화 활성화
  cacheSize?: number               // 캐시 크기
  prefetchNext?: boolean           // 다음 페이지 미리 가져오기
  
  // 에러 처리
  maxRetries?: number              // 최대 재시도 횟수
  retryDelay?: number              // 재시도 딜레이 (ms)
  
  // 콜백 함수들
  onLoadSuccess?: (data: T[], isInitial: boolean) => void
  onLoadError?: (error: string, isInitial: boolean) => void
  onRetry?: (attempt: number, maxRetries: number) => void
  
  // 데이터 변환
  transformData?: (item: any) => T  // 백엔드 데이터 변환
  filterData?: (item: T) => boolean // 데이터 필터링
  
  // 디버그
  enableDebug?: boolean            // 디버그 로그 활성화
}

// 무한스크롤 상태
export interface InfiniteScrollData<T> {
  // 📊 데이터
  items: T[]
  totalCount: number
  
  // 📱 페이징 상태 (마이룸과 동일)
  loading: boolean
  error: string | null
  hasNext: boolean
  nextCursor: number | null
  isInitialLoad: boolean
  isLoadingMore: boolean
  
  // 🔄 추가 상태
  isRefreshing: boolean
  isEmpty: boolean
  retryCount: number
  lastUpdated: string | null
}

// 무한스크롤 액션
export interface InfiniteScrollActions<T> {
  // 📱 기본 액션 (마이룸과 동일)
  loadInitial: () => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  
  // 🔄 추가 액션
  retry: () => Promise<void>
  reset: () => void
  clearError: () => void
  
  // 📊 데이터 조작
  prependItems: (items: T[]) => void
  appendItems: (items: T[]) => void
  updateItem: (predicate: (item: T) => boolean, updater: (item: T) => T) => void
  removeItem: (predicate: (item: T) => boolean) => void
  
  // 🎯 유틸리티
  findItem: (predicate: (item: T) => boolean) => T | undefined
  scrollToTop: () => void
  scrollToItem: (predicate: (item: T) => boolean) => void
}

// API 함수 시그니처
export type InfiniteScrollApiFunction<T> = (
  params: CursorPaginationParams
) => Promise<CursorPaginatedResponse<T>>

// ============================================================================
// 🚀 메인 무한스크롤 훅 (백엔드 완벽 연동)
// ============================================================================

export function useInfiniteScroll<T>(
  apiFunction: InfiniteScrollApiFunction<T>,
  options: UseInfiniteScrollOptions<T> = {}
): InfiniteScrollData<T> & InfiniteScrollActions<T> {
  
  // ============================================================================
  // 기본 설정
  // ============================================================================
  
  const {
    initialLimit = 20,
    enableAutoLoad = true,
    threshold = 200,
    enableVirtualization = false,
    cacheSize = 100,
    prefetchNext = false,
    maxRetries = 3,
    retryDelay = 1000,
    onLoadSuccess,
    onLoadError,
    onRetry,
    transformData,
    filterData,
    enableDebug = false,
  } = options

  // ============================================================================
  // 상태 관리 (마이룸과 동일한 구조)
  // ============================================================================
  
  const [data, setData] = useState<InfiniteScrollData<T>>({
    items: [],
    totalCount: 0,
    loading: false,
    error: null,
    hasNext: false,
    nextCursor: null,
    isInitialLoad: true,
    isLoadingMore: false,
    isRefreshing: false,
    isEmpty: true,
    retryCount: 0,
    lastUpdated: null,
  })

  // 요청 관리
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)
  const containerRef = useRef<HTMLElement | null>(null)
  
  // 캐시 관리
  const cacheRef = useRef<Map<string, CursorPaginatedResponse<T>>>(new Map())
  
  // 🔐 인증 상태 (아키텍처 원칙: 무조건 로그인한 사람만 서비스 이용)
  const { isAuthenticated } = useAuthStore()

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 디버그 로그
  const debugLog = useCallback((message: string, data?: any) => {
    if (enableDebug) {
      console.log(`🔄 [InfiniteScroll] ${message}`, data)
    }
  }, [enableDebug])

  // 🔥 인증 상태 체크 (아키텍처 원칙: 무조건 로그인 필수)
  const checkAuthState = useCallback(() => {
    if (!isAuthenticated) {
      throw new Error('로그인이 필요합니다. 다시 로그인해주세요.')
    }
  }, [isAuthenticated])

  // 에러 처리 (개선됨)
  const handleError = useCallback((error: unknown, context: string) => {
    let errorMessage = '알 수 없는 오류가 발생했습니다.'
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = '로그인이 필요합니다. 다시 로그인해주세요.'
        // 자동 로그아웃은 axios 인터셉터에서 처리됨
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        errorMessage = '접근 권한이 없습니다.'
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        errorMessage = '요청한 데이터를 찾을 수 없습니다.'
      } else if (error.message.includes('Network Error') || error.message.includes('timeout')) {
        errorMessage = '네트워크 연결을 확인해주세요.'
      } else {
        errorMessage = error.message
      }
    }
    
    debugLog(`Error in ${context}:`, { error, errorMessage })
    return errorMessage
  }, [debugLog])

  // 요청 취소
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
  }, [])

  // 캐시 키 생성
  const getCacheKey = useCallback((params: CursorPaginationParams): string => {
    const limitStr = params.limit?.toString() || initialLimit.toString()
    const cursorStr = params.cursor?.toString() || 'initial'
    return `${limitStr}_${cursorStr}`
  }, [initialLimit])

  // ============================================================================
  // 🔥 백엔드 API 호출 (커서 기반, 마이룸 방식)
  // ============================================================================

  const fetchData = useCallback(async (
    params: CursorPaginationParams,
    useCache: boolean = true
  ): Promise<CursorPaginatedResponse<T>> => {
    // 🔐 인증 상태 확인 (모든 API 호출 전 필수)
    checkAuthState()
    
    const cacheKey = getCacheKey(params)
    
    // 캐시 확인
    if (useCache && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!
      debugLog('Cache hit', { cacheKey, cached })
      return cached
    }

    debugLog('API 호출 시작', { params })

    try {
      // 🔥 백엔드 API 호출 (아키텍처 원칙: api from '@/lib/axios')
      // 인터셉터에서 자동으로 토큰 추가 및 갱신 처리됨
      const response = await apiFunction(params)
      
      // 데이터 변환 및 필터링
      let items = response.items
      
      if (transformData) {
        items = items.map(transformData)
      }
      
      if (filterData) {
        items = items.filter(filterData)
      }

      const result: CursorPaginatedResponse<T> = {
        items,
        hasNext: response.hasNext,
        nextCursor: response.nextCursor,
      }

      // 캐시 저장 (크기 제한)
      if (cacheRef.current.size >= cacheSize) {
        const firstKey = cacheRef.current.keys().next().value
        if (firstKey) {
          cacheRef.current.delete(firstKey)
        }
      }
      cacheRef.current.set(cacheKey, result)

      debugLog('API 호출 성공', { params, result })
      return result

    } catch (error) {
      debugLog('API 호출 실패', { params, error })
      throw error
    }
  }, [apiFunction, transformData, filterData, getCacheKey, cacheSize, debugLog, checkAuthState])

  // ============================================================================
  // 🔥 초기 로드 (마이룸 패턴) - 인증 필수
  // ============================================================================

  const loadInitial = useCallback(async () => {
    // 🔐 인증 상태 1차 확인
    if (!isAuthenticated) {
      setData(prev => ({
        ...prev,
        error: '로그인이 필요합니다. 다시 로그인해주세요.',
        loading: false,
        isInitialLoad: false
      }))
      return
    }

    if (loadingRef.current) return
    loadingRef.current = true

    cancelRequest()

    setData(prev => ({
      ...prev,
      loading: true,
      error: null,
      isInitialLoad: true,
      isLoadingMore: false,
      isRefreshing: false,
      retryCount: 0,
    }))

    try {
      debugLog('초기 로드 시작')

      const params: CursorPaginationParams = {
        limit: initialLimit,
        cursor: null, // 초기 로드는 커서 없음
      }

      const result = await fetchData(params, false) // 초기 로드는 캐시 사용하지 않음

      const newData: InfiniteScrollData<T> = {
        items: result.items,
        totalCount: result.items.length,
        loading: false,
        error: null,
        hasNext: result.hasNext,
        nextCursor: result.nextCursor,
        isInitialLoad: false,
        isLoadingMore: false,
        isRefreshing: false,
        isEmpty: result.items.length === 0,
        retryCount: 0,
        lastUpdated: new Date().toISOString(),
      }

      setData(newData)

      debugLog('초기 로드 완료', {
        count: result.items.length,
        hasNext: result.hasNext,
        nextCursor: result.nextCursor,
      })

      onLoadSuccess?.(result.items, true)

      // 다음 페이지 미리 로드
      if (prefetchNext && result.hasNext && result.nextCursor) {
        setTimeout(() => {
          fetchData({
            limit: initialLimit,
            cursor: result.nextCursor,
          })
        }, 1000)
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      const errorMessage = handleError(error, '초기 로드')
      setData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isInitialLoad: false,
      }))

      onLoadError?.(errorMessage, true)
    } finally {
      loadingRef.current = false
    }
  }, [
    isAuthenticated, initialLimit, fetchData, handleError, onLoadSuccess, 
    onLoadError, prefetchNext, cancelRequest, debugLog
  ])

  // ============================================================================
  // 🔥 더 로드 (마이룸 패턴) - 인증 필수
  // ============================================================================

  const loadMore = useCallback(async () => {
    // 🔐 인증 상태 확인
    if (!isAuthenticated || !data.hasNext || data.isLoadingMore || loadingRef.current) {
      return
    }

    loadingRef.current = true

    setData(prev => ({
      ...prev,
      isLoadingMore: true,
      error: null,
    }))

    try {
      debugLog('더 로드 시작', { cursor: data.nextCursor })

      const params: CursorPaginationParams = {
        limit: initialLimit,
        cursor: data.nextCursor,
      }

      const result = await fetchData(params)

      setData(prev => ({
        ...prev,
        items: [...prev.items, ...result.items], // 기존 데이터에 추가
        totalCount: prev.totalCount + result.items.length,
        isLoadingMore: false,
        hasNext: result.hasNext,
        nextCursor: result.nextCursor,
        lastUpdated: new Date().toISOString(),
      }))

      debugLog('더 로드 완료', {
        newCount: result.items.length,
        totalCount: data.totalCount + result.items.length,
        hasNext: result.hasNext,
        nextCursor: result.nextCursor,
      })

      onLoadSuccess?.(result.items, false)

      // 다음 페이지 미리 로드
      if (prefetchNext && result.hasNext && result.nextCursor) {
        setTimeout(() => {
          fetchData({
            limit: initialLimit,
            cursor: result.nextCursor,
          })
        }, 1000)
      }

    } catch (error) {
      const errorMessage = handleError(error, '더 로드')
      setData(prev => ({
        ...prev,
        isLoadingMore: false,
        error: errorMessage,
      }))

      onLoadError?.(errorMessage, false)
    } finally {
      loadingRef.current = false
    }
  }, [
    isAuthenticated, data.hasNext, data.isLoadingMore, data.nextCursor, 
    data.totalCount, initialLimit, fetchData, handleError, onLoadSuccess, 
    onLoadError, prefetchNext, debugLog
  ])

  // ============================================================================
  // 🔄 새로고침 (마이룸 패턴)
  // ============================================================================

  const refresh = useCallback(async () => {
    setData(prev => ({
      ...prev,
      isRefreshing: true,
      error: null,
    }))

    // 캐시 클리어
    cacheRef.current.clear()

    // 초기 상태로 리셋 후 로드
    setData({
      items: [],
      totalCount: 0,
      loading: false,
      error: null,
      hasNext: false,
      nextCursor: null,
      isInitialLoad: true,
      isLoadingMore: false,
      isRefreshing: true,
      isEmpty: true,
      retryCount: 0,
      lastUpdated: null,
    })

    await loadInitial()

    setData(prev => ({ ...prev, isRefreshing: false }))
  }, [loadInitial])

  // ============================================================================
  // 🔄 재시도
  // ============================================================================

  const retry = useCallback(async () => {
    if (data.retryCount >= maxRetries) {
      debugLog('최대 재시도 횟수 초과', { retryCount: data.retryCount, maxRetries })
      return
    }

    const newRetryCount = data.retryCount + 1
    setData(prev => ({ ...prev, retryCount: newRetryCount }))

    onRetry?.(newRetryCount, maxRetries)

    // 재시도 딜레이
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * newRetryCount))
    }

    if (data.isInitialLoad || data.items.length === 0) {
      await loadInitial()
    } else {
      await loadMore()
    }
  }, [data.retryCount, data.isInitialLoad, data.items.length, maxRetries, retryDelay, onRetry, loadInitial, loadMore, debugLog])

  // ============================================================================
  // 📊 데이터 조작 함수들
  // ============================================================================

  const reset = useCallback(() => {
    setData({
      items: [],
      totalCount: 0,
      loading: false,
      error: null,
      hasNext: false,
      nextCursor: null,
      isInitialLoad: true,
      isLoadingMore: false,
      isRefreshing: false,
      isEmpty: true,
      retryCount: 0,
      lastUpdated: null,
    })
    cacheRef.current.clear()
  }, [])

  const clearError = useCallback(() => {
    setData(prev => ({ ...prev, error: null }))
  }, [])

  const prependItems = useCallback((newItems: T[]) => {
    setData(prev => ({
      ...prev,
      items: [...newItems, ...prev.items],
      totalCount: prev.totalCount + newItems.length,
      isEmpty: false,
      lastUpdated: new Date().toISOString(),
    }))
  }, [])

  const appendItems = useCallback((newItems: T[]) => {
    setData(prev => ({
      ...prev,
      items: [...prev.items, ...newItems],
      totalCount: prev.totalCount + newItems.length,
      isEmpty: false,
      lastUpdated: new Date().toISOString(),
    }))
  }, [])

  const updateItem = useCallback((
    predicate: (item: T) => boolean,
    updater: (item: T) => T
  ) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => predicate(item) ? updater(item) : item),
      lastUpdated: new Date().toISOString(),
    }))
  }, [])

  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setData(prev => {
      const newItems = prev.items.filter(item => !predicate(item))
      return {
        ...prev,
        items: newItems,
        totalCount: Math.max(0, prev.totalCount - (prev.items.length - newItems.length)),
        isEmpty: newItems.length === 0,
        lastUpdated: new Date().toISOString(),
      }
    })
  }, [])

  const findItem = useCallback((predicate: (item: T) => boolean): T | undefined => {
    return data.items.find(predicate)
  }, [data.items])

  // ============================================================================
  // 🎯 스크롤 관련 함수들
  // ============================================================================

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const scrollToItem = useCallback((predicate: (item: T) => boolean) => {
    const itemIndex = data.items.findIndex(predicate)
    if (itemIndex >= 0) {
      const element = document.querySelector(`[data-index="${itemIndex}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [data.items])

  // ============================================================================
  // 🔄 자동 로드 설정 (Intersection Observer)
  // ============================================================================

  useEffect(() => {
    if (!enableAutoLoad) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && data.hasNext && !data.isLoadingMore && !loadingRef.current) {
          debugLog('자동 로드 트리거')
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: `${threshold}px` }
    )

    // 감시할 요소 찾기 (마지막 아이템 또는 로드 트리거)
    const trigger = document.querySelector('[data-infinite-scroll-trigger]')
    if (trigger) {
      observer.observe(trigger)
    }

    return () => {
      if (trigger) {
        observer.unobserve(trigger)
      }
    }
  }, [enableAutoLoad, data.hasNext, data.isLoadingMore, threshold, loadMore, debugLog])

  // ============================================================================
  // 🔐 인증 상태 변경 감지 (아키텍처 원칙: 무조건 로그인 필수)
  // ============================================================================

  useEffect(() => {
    if (!isAuthenticated) {
      // 로그아웃 시 데이터 자동 리셋
      reset()
    }
  }, [isAuthenticated, reset])

  // ============================================================================
  // 🧹 Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // ============================================================================
  // 반환 값 (마이룸과 완전 호환)
  // ============================================================================

  return {
    // 📊 데이터 (마이룸과 동일)
    ...data,
    
    // 📱 액션들 (마이룸과 동일)
    loadInitial,
    loadMore,
    refresh,
    
    // 🔄 추가 액션들
    retry,
    reset,
    clearError,
    
    // 📊 데이터 조작
    prependItems,
    appendItems,
    updateItem,
    removeItem,
    
    // 🎯 유틸리티
    findItem,
    scrollToTop,
    scrollToItem,
  }
}

// ============================================================================
// 🎯 특화된 훅들 (백엔드 API 별로)
// ============================================================================

/**
 * 피드 타임라인 무한스크롤 (팔로잉 게시물들)
 */
export function useTimelineInfiniteScroll(options: UseInfiniteScrollOptions<any> = {}) {
  const apiFunction = useCallback(async (params: CursorPaginationParams) => {
    const query = buildPaginationQuery(params)
    const response = await api.get<ApiResponse<any>>(`/feeds/timeline?${query}`)
    
    if (response.data.error) {
      throw new Error(response.data.message || '타임라인 로드에 실패했습니다.')
    }
    
    return {
      items: response.data.data?.posts || [],
      hasNext: response.data.data?.hasNext || false,
      nextCursor: response.data.data?.nextCursor || null,
    }
  }, [])
  
  return useInfiniteScroll(apiFunction, {
    initialLimit: getOptimalLimit('mobile'),
    enableDebug: process.env.NODE_ENV === 'development',
    ...options,
  })
}

/**
 * 피드 탐색 무한스크롤 (랜덤 게시물들)
 */
export function useExploreInfiniteScroll(options: UseInfiniteScrollOptions<any> = {}) {
  const apiFunction = useCallback(async (params: CursorPaginationParams) => {
    const query = buildPaginationQuery(params)
    const response = await api.get<ApiResponse<any>>(`/feeds/explore?${query}`)
    
    if (response.data.error) {
      throw new Error(response.data.message || '탐색 로드에 실패했습니다.')
    }
    
    return {
      items: response.data.data?.posts || [],
      hasNext: response.data.data?.hasNext || false,
      nextCursor: response.data.data?.nextCursor || null,
    }
  }, [])
  
  return useInfiniteScroll(apiFunction, {
    initialLimit: getOptimalLimit('mobile'),
    enableDebug: process.env.NODE_ENV === 'development',
    ...options,
  })
}

/**
 * 사용자 피드 무한스크롤 (특정 사용자의 게시물들)
 */
export function useUserFeedInfiniteScroll(
  accountName: string,
  options: UseInfiniteScrollOptions<any> = {}
) {
  const apiFunction = useCallback(async (params: CursorPaginationParams) => {
    const query = buildPaginationQuery(params)
    const response = await api.get<ApiResponse<any>>(`/feeds/users/account/${accountName}?${query}`)
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 피드 로드에 실패했습니다.')
    }
    
    return {
      items: response.data.data?.posts || [],
      hasNext: response.data.data?.hasNext || false,
      nextCursor: response.data.data?.nextCursor || null,
    }
  }, [accountName])
  
  return useInfiniteScroll(apiFunction, {
    initialLimit: getOptimalLimit('mobile'),
    enableDebug: process.env.NODE_ENV === 'development',
    ...options,
  })
}

/**
 * 피드 검색 무한스크롤
 */
export function useSearchFeedsInfiniteScroll(
  query: string,
  options: UseInfiniteScrollOptions<any> = {}
) {
  const apiFunction = useCallback(async (params: CursorPaginationParams) => {
    const searchQuery = new URLSearchParams({
      query,
      limit: (params.limit || 20).toString(),
      ...(params.cursor && { cursor: params.cursor.toString() }),
    }).toString()
    
    const response = await api.get<ApiResponse<any>>(`/feeds/search?${searchQuery}`)
    
    if (response.data.error) {
      throw new Error(response.data.message || '검색에 실패했습니다.')
    }
    
    return {
      items: response.data.data?.feeds || [],
      hasNext: response.data.data?.hasNext || false,
      nextCursor: response.data.data?.nextCursor || null,
    }
  }, [query])
  
  return useInfiniteScroll(apiFunction, {
    initialLimit: 10, // 검색은 적게 로드
    enableDebug: process.env.NODE_ENV === 'development',
    ...options,
  })
}

// ============================================================================
// 🔧 유틸리티 훅들
// ============================================================================

/**
 * 무한스크롤 트리거 엘리먼트를 위한 훅
 */
export function useInfiniteScrollTrigger(
  loadMore: () => void,
  enabled: boolean = true
) {
  const triggerRef = useRef<HTMLElement>(null)
  
  useEffect(() => {
    if (!enabled) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    
    if (triggerRef.current) {
      observer.observe(triggerRef.current)
    }
    
    return () => {
      if (triggerRef.current) {
        observer.unobserve(triggerRef.current)
      }
    }
  }, [loadMore, enabled])
  
  return triggerRef
}

/**
 * 무한스크롤 성능 모니터링 훅
 */
export function useInfiniteScrollMetrics() {
  const metrics = useRef({
    loadCount: 0,
    totalLoadTime: 0,
    averageLoadTime: 0,
    errors: 0,
    cacheHits: 0,
  })
  
  const startTimer = useCallback(() => {
    return performance.now()
  }, [])
  
  const recordLoad = useCallback((startTime: number, fromCache: boolean = false) => {
    const loadTime = performance.now() - startTime
    metrics.current.loadCount++
    metrics.current.totalLoadTime += loadTime
    metrics.current.averageLoadTime = metrics.current.totalLoadTime / metrics.current.loadCount
    
    if (fromCache) {
      metrics.current.cacheHits++
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Load metrics:`, {
        loadTime: loadTime.toFixed(2),
        average: metrics.current.averageLoadTime.toFixed(2),
        fromCache,
        cacheHitRate: ((metrics.current.cacheHits / metrics.current.loadCount) * 100).toFixed(1),
      })
    }
  }, [])
  
  const recordError = useCallback(() => {
    metrics.current.errors++
  }, [])
  
  return {
    startTimer,
    recordLoad,
    recordError,
    getMetrics: () => ({ ...metrics.current }),
    reset: () => {
      metrics.current = {
        loadCount: 0,
        totalLoadTime: 0,
        averageLoadTime: 0,
        errors: 0,
        cacheHits: 0,
      }
    },
  }
}

// ============================================================================
// 🎨 컴포넌트와 함께 사용하기 위한 헬퍼 훅들
// ============================================================================

/**
 * 무한스크롤 상태를 바탕으로 UI 상태를 계산하는 훅
 */
export function useInfiniteScrollUI<T>(data: InfiniteScrollData<T>) {
  return {
    // 로딩 상태들
    showInitialLoader: data.loading && data.isInitialLoad,
    showMoreLoader: data.isLoadingMore,
    showRefreshLoader: data.isRefreshing,
    
    // 에러 상태들
    hasError: !!data.error,
    canRetry: data.retryCount < 3,
    
    // 데이터 상태들
    hasData: data.items.length > 0,
    isEmpty: data.isEmpty && !data.loading,
    canLoadMore: data.hasNext && !data.isLoadingMore && !data.loading,
    
    // 메시지들
    emptyMessage: data.isEmpty && !data.loading ? '표시할 데이터가 없습니다.' : null,
    errorMessage: data.error,
    loadingMessage: data.loading ? '로딩 중...' : null,
    
    // 카운트 정보
    itemCount: data.items.length,
    totalCount: data.totalCount,
    
    // 기타
    lastUpdated: data.lastUpdated,
    nextCursor: data.nextCursor,
  }
}

/**
 * 무한스크롤 항목에 가상화를 적용하는 훅
 */
export function useVirtualizedInfiniteScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleRange = {
    start: Math.max(0, Math.floor(scrollTop / itemHeight) - overscan),
    end: Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    ),
  }
  
  const visibleItems = items.slice(visibleRange.start, visibleRange.end + 1)
  
  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    visibleRange,
    handleScroll,
  }
}

/**
 * 무한스크롤과 함께 사용할 수 있는 검색 디바운스 훅
 */
export function useDebouncedInfiniteScroll<T>(
  searchQuery: string,
  apiFunction: InfiniteScrollApiFunction<T>,
  debounceMs: number = 300,
  options: UseInfiniteScrollOptions<T> = {}
) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  // 디바운스 처리
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, debounceMs)
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [searchQuery, debounceMs])
  
  // 디바운스된 쿼리로 API 함수 생성
  const debouncedApiFunction = useCallback(
    (params: CursorPaginationParams) => {
      if (!debouncedQuery.trim()) {
        return Promise.resolve({
          items: [],
          hasNext: false,
          nextCursor: null,
        })
      }
      return apiFunction(params)
    },
    [debouncedQuery, apiFunction]
  )
  
  const infiniteScroll = useInfiniteScroll(debouncedApiFunction, options)
  
  // 쿼리가 변경될 때마다 리셋
  useEffect(() => {
    if (debouncedQuery !== searchQuery) {
      infiniteScroll.reset()
    }
  }, [debouncedQuery, searchQuery, infiniteScroll])
  
  return {
    ...infiniteScroll,
    searchQuery: debouncedQuery,
    isSearching: searchQuery !== debouncedQuery,
  }
}

// ============================================================================
// 🔄 마이룸과의 호환성을 위한 래퍼 훅
// ============================================================================

/**
 * 마이룸의 useInfiniteQuery 패턴과 호환되는 래퍼
 */
export function useInfiniteQuery<T>(
  queryKey: string[],
  apiFunction: InfiniteScrollApiFunction<T>,
  options: UseInfiniteScrollOptions<T> = {}
) {
  const infiniteScroll = useInfiniteScroll(apiFunction, options)
  
  // React Query와 유사한 인터페이스 제공
  return {
    // 데이터
    data: {
      pages: [{ data: infiniteScroll.items }],
      pageParams: [infiniteScroll.nextCursor],
    },
    
    // 상태
    isLoading: infiniteScroll.loading,
    isError: !!infiniteScroll.error,
    error: infiniteScroll.error,
    isFetching: infiniteScroll.loading || infiniteScroll.isLoadingMore,
    isFetchingNextPage: infiniteScroll.isLoadingMore,
    hasNextPage: infiniteScroll.hasNext,
    
    // 함수들
    fetchNextPage: infiniteScroll.loadMore,
    refetch: infiniteScroll.refresh,
    
    // 추가 정보
    queryKey,
    totalCount: infiniteScroll.totalCount,
    items: infiniteScroll.items,
  }
}

/**
 * 마이룸의 useMyPhotos와 유사한 패턴으로 피드 게시물을 가져오는 훅
 */
export function useFeedPosts(type: 'timeline' | 'explore' | 'user', accountName?: string) {
  const apiFunction = useCallback(async (params: CursorPaginationParams) => {
    let endpoint = ''
    const query = buildPaginationQuery(params)
    
    switch (type) {
      case 'timeline':
        endpoint = `/feeds/timeline?${query}`
        break
      case 'explore':
        endpoint = `/feeds/explore?${query}`
        break
      case 'user':
        if (!accountName) throw new Error('accountName is required for user feed')
        endpoint = `/feeds/users/account/${accountName}?${query}`
        break
      default:
        throw new Error(`Unknown feed type: ${type}`)
    }
    
    const response = await api.get<ApiResponse<any>>(endpoint)
    
    if (response.data.error) {
      throw new Error(response.data.message || '피드 로드에 실패했습니다.')
    }
    
    const data = response.data.data
    return {
      items: data?.posts || [],
      hasNext: data?.hasNext || false,
      nextCursor: data?.nextCursor || null,
    }
  }, [type, accountName])
  
  return useInfiniteScroll(apiFunction, {
    initialLimit: getOptimalLimit('mobile'),
    enableDebug: process.env.NODE_ENV === 'development',
    transformData: (post: any) => ({
      ...post,
      timeAgo: formatTimeAgo(post.createdAt),
      formattedLikeCount: formatLikeCount(post.likeCount),
    }),
  })
}

// ============================================================================
// 🧪 테스트 및 개발용 훅들
// ============================================================================

/**
 * 개발 환경에서 무한스크롤을 시뮬레이션하는 훅
 */
export function useMockInfiniteScroll<T>(
  mockData: T[],
  pageSize: number = 20,
  delay: number = 1000
) {
  const apiFunction = useCallback(async (params: CursorPaginationParams): Promise<CursorPaginatedResponse<T>> => {
    // 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, delay))
    
    const limit = params.limit || pageSize
    const cursor = params.cursor || 0
    
    // 커서 기반 페이징 시뮬레이션
    const startIndex = mockData.findIndex((_, index) => index >= cursor)
    const endIndex = Math.min(startIndex + limit, mockData.length)
    
    const items = mockData.slice(startIndex, endIndex)
    const hasNext = endIndex < mockData.length
    const nextCursor = hasNext ? endIndex : null
    
    return {
      items,
      hasNext,
      nextCursor,
    }
  }, [mockData, pageSize, delay])
  
  return useInfiniteScroll(apiFunction, {
    enableDebug: true,
  })
}

/**
 * 무한스크롤 성능을 측정하는 개발용 훅
 */
export function useInfiniteScrollProfiler<T>(infiniteScroll: InfiniteScrollData<T> & InfiniteScrollActions<T>) {
  const renderCount = useRef(0)
  const lastUpdateTime = useRef(Date.now())
  
  useEffect(() => {
    renderCount.current++
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTime.current
    lastUpdateTime.current = now
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 InfiniteScroll render #${renderCount.current}`, {
        itemCount: infiniteScroll.items.length,
        loading: infiniteScroll.loading,
        hasNext: infiniteScroll.hasNext,
        timeSinceLastUpdate,
        memoryUsage: getMemoryUsage(),
      })
    }
  })
  
  const getMemoryUsage = () => {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      }
    }
    return 'N/A'
  }
  
  return {
    renderCount: renderCount.current,
    memoryInfo: getMemoryInfo(),
  }
}

function getMemoryInfo() {
  if ('memory' in performance && (performance as any).memory) {
    const memory = (performance as any).memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
    }
  }
  return null
}

// ============================================================================
// 📱 디바이스별 최적화 훅
// ============================================================================

/**
 * 디바이스 타입에 따라 무한스크롤 설정을 최적화하는 훅
 */
export function useResponsiveInfiniteScroll<T>(
  apiFunction: InfiniteScrollApiFunction<T>,
  baseOptions: UseInfiniteScrollOptions<T> = {}
) {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('mobile')
  
  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDeviceType('mobile')
      } else if (width < 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }
    
    updateDeviceType()
    window.addEventListener('resize', updateDeviceType)
    
    return () => window.removeEventListener('resize', updateDeviceType)
  }, [])
  
  const optimizedOptions: UseInfiniteScrollOptions<T> = {
    ...baseOptions,
    initialLimit: getOptimalLimit(deviceType),
    threshold: deviceType === 'mobile' ? 100 : 200,
    prefetchNext: deviceType !== 'mobile', // 모바일에서는 성능을 위해 미리 로드 비활성화
    cacheSize: deviceType === 'mobile' ? 50 : 100,
  }
  
  return useInfiniteScroll(apiFunction, optimizedOptions)
}

// ============================================================================
// 🎯 헬퍼 함수들
// ============================================================================

// 시간 포맷팅 함수
function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return '방금 전'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`
  
  return date.toLocaleDateString('ko-KR')
}

// 좋아요 수 포맷팅 함수
function formatLikeCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`
  return `${(count / 1000000).toFixed(1)}m`
}

// ============================================================================
// 🚀 타입 재exports (중복 제거 후 정리)
// ============================================================================

// 이미 정의된 타입들은 다시 export하지 않음 (중복 방지)
// CursorPaginatedResponse, UseInfiniteScrollOptions, InfiniteScrollData, 
// InfiniteScrollActions, InfiniteScrollApiFunction은 이미 코드 내에서 export됨

// 기본 내보내기
export default useInfiniteScroll
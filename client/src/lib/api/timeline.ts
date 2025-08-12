// src/lib/api/timeline.ts

import { 
  TimelineApiResponse, 
  TimelinePost, 
  transformBackendFeedToTimelinePost,
  BackendFeedDetailResponse,
  BackendApiResponse
} from '@/lib/types/timeline'
import { fetchWithAuth, handleApiError } from './feed'

// API 엔드포인트
const API_ENDPOINTS = {
  feeds: '/feeds',
} as const

// ============================================================================
// 타임라인 API 함수들 (백엔드 엔드포인트 기반)
// ============================================================================

// ✅ 팔로잉 타임라인 조회 (GET /feeds/following)
export const getFollowingTimeline = async (
  params?: {
    cursorCreatedAt?: string
    cursorId?: number
    size?: number
  }
): Promise<TimelineApiResponse> => {
  try {
    const urlParams = new URLSearchParams()
    if (params?.cursorCreatedAt) urlParams.append('cursorCreatedAt', params.cursorCreatedAt)
    if (params?.cursorId) urlParams.append('cursorId', params.cursorId.toString())
    urlParams.append('size', (params?.size || 20).toString())

    const url = `${API_ENDPOINTS.feeds}/following?${urlParams.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendFeedDetailResponse[]> = await response.json()
    
    if (!result.error && Array.isArray(result.data)) {
      const posts = result.data.map((feed, index) => 
        transformBackendFeedToTimelinePost(feed, 'following', index)
      )
      
      // 다음 커서 계산
      const hasMore = result.data.length === (params?.size || 20)
      let nextCursor = null
      if (hasMore && result.data.length > 0) {
        const lastFeed = result.data[result.data.length - 1]
        nextCursor = {
          createdAt: lastFeed.createdAt,
          feedId: lastFeed.feedId
        }
      }
      
      return {
        success: true,
        data: {
          posts,
          hasMore,
          nextCursor,
          type: 'following'
        }
      }
    }

    return {
      success: false,
      error: result.message || '팔로잉 타임라인을 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get following timeline:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 랜덤 피드 타임라인 조회 (GET /feeds/random)
export const getRandomTimeline = async (
  params?: {
    size?: number
  }
): Promise<TimelineApiResponse> => {
  try {
    const urlParams = new URLSearchParams()
    urlParams.append('size', (params?.size || 20).toString())

    const url = `${API_ENDPOINTS.feeds}/random?${urlParams.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendFeedDetailResponse[]> = await response.json()
    
    if (!result.error && Array.isArray(result.data)) {
      const posts = result.data.map((feed, index) => 
        transformBackendFeedToTimelinePost(feed, 'random', index)
      )
      
      return {
        success: true,
        data: {
          posts,
          hasMore: false,  // 랜덤 피드는 페이징 없음
          nextCursor: null,
          type: 'random'
        }
      }
    }

    return {
      success: false,
      error: result.message || '랜덤 타임라인을 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get random timeline:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 특정 사용자 타임라인 조회 (GET /feeds/users/{userId})
export const getUserTimeline = async (
  userId: number,
  params?: {
    cursorCreatedAt?: string
    cursorId?: number
    size?: number
  }
): Promise<TimelineApiResponse> => {
  try {
    const urlParams = new URLSearchParams()
    if (params?.cursorCreatedAt) urlParams.append('cursorCreatedAt', params.cursorCreatedAt)
    if (params?.cursorId) urlParams.append('cursorId', params.cursorId.toString())
    urlParams.append('size', (params?.size || 20).toString())

    const url = `${API_ENDPOINTS.feeds}/users/${userId}?${urlParams.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendFeedDetailResponse[]> = await response.json()
    
    if (!result.error && Array.isArray(result.data)) {
      const posts = result.data.map((feed, index) => 
        transformBackendFeedToTimelinePost(feed, 'user', index)
      )
      
      // 다음 커서 계산
      const hasMore = result.data.length === (params?.size || 20)
      let nextCursor = null
      if (hasMore && result.data.length > 0) {
        const lastFeed = result.data[result.data.length - 1]
        nextCursor = {
          createdAt: lastFeed.createdAt,
          feedId: lastFeed.feedId
        }
      }
      
      return {
        success: true,
        data: {
          posts,
          hasMore,
          nextCursor,
          type: 'user'
        }
      }
    }

    return {
      success: false,
      error: result.message || '사용자 타임라인을 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get user timeline:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 단일 피드 상세 조회 (GET /feeds/{feedId})
export const getFeedDetail = async (
  feedId: number
): Promise<{
  success: boolean
  data?: TimelinePost
  error?: string
}> => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.feeds}/${feedId}`)
    const result: BackendApiResponse<BackendFeedDetailResponse> = await response.json()
    
    if (!result.error && result.data) {
      const post = transformBackendFeedToTimelinePost(result.data, 'user', 0)
      
      return {
        success: true,
        data: post
      }
    }

    return {
      success: false,
      error: result.message || '피드를 찾을 수 없습니다.'
    }
  } catch (error) {
    console.error('Failed to get feed detail:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 타임라인 통합 조회 함수 (편의 함수)
// ============================================================================

// ✅ 타임라인 타입에 따른 통합 조회
export const getTimeline = async (
  type: 'following' | 'user' | 'random',
  options?: {
    userId?: number
    cursorCreatedAt?: string
    cursorId?: number
    size?: number
  }
): Promise<TimelineApiResponse> => {
  switch (type) {
    case 'following':
      return getFollowingTimeline({
        cursorCreatedAt: options?.cursorCreatedAt,
        cursorId: options?.cursorId,
        size: options?.size
      })
    
    case 'user':
      if (!options?.userId) {
        return {
          success: false,
          error: '사용자 타임라인 조회에는 userId가 필요합니다.'
        }
      }
      return getUserTimeline(options.userId, {
        cursorCreatedAt: options?.cursorCreatedAt,
        cursorId: options?.cursorId,
        size: options?.size
      })
    
    case 'random':
      return getRandomTimeline({
        size: options?.size
      })
    
    default:
      return {
        success: false,
        error: '지원하지 않는 타임라인 타입입니다.'
      }
  }
}

// ============================================================================
// 타임라인 새로고침 및 더 보기 함수들
// ============================================================================

// ✅ 타임라인 새로고침 (첫 페이지)
export const refreshTimeline = async (
  type: 'following' | 'user' | 'random',
  options?: {
    userId?: number
    size?: number
  }
): Promise<TimelineApiResponse> => {
  return getTimeline(type, {
    userId: options?.userId,
    size: options?.size
    // cursor 없이 첫 페이지 조회
  })
}

// ✅ 타임라인 더 보기 (다음 페이지)
export const loadMoreTimeline = async (
  type: 'following' | 'user' | 'random',
  cursor: {
    createdAt: string
    feedId: number
  },
  options?: {
    userId?: number
    size?: number
  }
): Promise<TimelineApiResponse> => {
  return getTimeline(type, {
    userId: options?.userId,
    cursorCreatedAt: cursor.createdAt,
    cursorId: cursor.feedId,
    size: options?.size
  })
}

// ============================================================================
// 타임라인 유틸리티 함수들
// ============================================================================

// ✅ 타임라인 포스트 병합 (중복 제거)
export const mergeTimelinePosts = (
  existingPosts: TimelinePost[],
  newPosts: TimelinePost[]
): TimelinePost[] => {
  const existingIds = new Set(existingPosts.map(post => post.id))
  const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id))
  return [...existingPosts, ...uniqueNewPosts]
}

// ✅ 타임라인 포스트 정렬
export const sortTimelinePosts = (
  posts: TimelinePost[],
  sortBy: 'latest' | 'oldest' = 'latest'
): TimelinePost[] => {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    
    if (sortBy === 'latest') {
      if (dateA !== dateB) return dateB - dateA
      return parseInt(b.id) - parseInt(a.id)  // feedId 역순
    } else {
      if (dateA !== dateB) return dateA - dateB
      return parseInt(a.id) - parseInt(b.id)  // feedId 순
    }
  })
}

// ✅ 타임라인 포스트 필터링
export const filterTimelinePosts = (
  posts: TimelinePost[],
  filters: {
    userId?: string
    dateRange?: {
      from: string
      to: string
    }
    excludeUserIds?: string[]
  }
): TimelinePost[] => {
  return posts.filter(post => {
    // 사용자 ID 필터
    if (filters.userId && post.userId !== filters.userId) {
      return false
    }
    
    // 제외할 사용자 ID 필터
    if (filters.excludeUserIds && filters.excludeUserIds.includes(post.userId)) {
      return false
    }
    
    // 날짜 범위 필터
    if (filters.dateRange) {
      const postDate = new Date(post.createdAt)
      const fromDate = new Date(filters.dateRange.from)
      const toDate = new Date(filters.dateRange.to)
      
      if (postDate < fromDate || postDate > toDate) {
        return false
      }
    }
    
    return true
  })
}

// ============================================================================
// 디버깅 및 개발용 함수들
// ============================================================================

// ✅ 타임라인 상태 로깅
export const logTimelineState = (
  type: string,
  posts: TimelinePost[],
  hasMore: boolean,
  nextCursor: any
): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Timeline ${type}]`, {
      postsCount: posts.length,
      hasMore,
      nextCursor,
      firstPost: posts[0]?.id,
      lastPost: posts[posts.length - 1]?.id
    })
  }
}

// ✅ 타임라인 성능 측정
export const measureTimelineLoad = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = performance.now()
  try {
    const result = await operation()
    const endTime = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Timeline Performance] ${operationName}: ${(endTime - startTime).toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    const endTime = performance.now()
    console.error(`[Timeline Performance] ${operationName} failed in ${(endTime - startTime).toFixed(2)}ms:`, error)
    throw error
  }
}
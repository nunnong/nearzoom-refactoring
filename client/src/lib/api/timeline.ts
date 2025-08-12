// src/lib/api/timeline.ts

import { 
  BackendApiResponse,
  BackendFeedDetailResponse
} from '@/lib/types/feed'
import { fetchWithAuth, handleApiError } from './feed'

// ============================================================================
// 🔥 수정된 타입 정의 (백엔드와 정확히 일치)
// ============================================================================

// ✅ 타임라인 포스트 (단순화, accountName 중심)
export interface TimelinePost {
  // 🔥 핵심: accountName이 모든 식별자의 기준
  id: string                    // feedId (문자열) 
  feedId: number               // 백엔드 feedId (숫자)
  accountName: string          // 계정명 (유일 식별자)
  
  // 작성자 정보
  authorName: string           // accountName과 동일
  authorAvatar?: string        // 프로필 이미지
  
  // 콘텐츠 정보
  content: string              // caption
  imageUrl: string             // imgUrl
  
  // 상호작용 정보
  isLiked: boolean             // 현재 사용자의 좋아요 여부
  
  // 시간 정보
  createdAt: string            // ISO 문자열
  
  // 타임라인 소스
  source: 'timeline' | 'explore'  // 팔로잉 or 랜덤
}

// ✅ 타임라인 API 응답 (백엔드 커서 페이징)
export interface TimelineApiResponse {
  success: boolean
  data?: {
    posts: TimelinePost[]
    hasMore: boolean
    nextCursor?: {
      createdAt: string
      feedId: number
    } | null
    type: 'timeline' | 'explore'
  }
  error?: string
}

// ============================================================================
// API 엔드포인트 (실제 백엔드와 일치)
// ============================================================================

const API_ENDPOINTS = {
  feeds: '/feeds',
} as const

// ============================================================================
// 🔥 백엔드 데이터 변환 함수 (수정됨)
// ============================================================================

const transformBackendFeedToTimelinePost = (
  backendFeed: BackendFeedDetailResponse,
  source: TimelinePost['source'] = 'explore'
): TimelinePost => {
  return {
    // 🔥 accountName 중심 (1사용자 = 1피드 = 1계정명)
    id: backendFeed.feedId.toString(),
    feedId: backendFeed.feedId,
    accountName: backendFeed.accountName,
    
    // 작성자 정보
    authorName: backendFeed.accountName,  // accountName을 그대로 사용
    authorAvatar: backendFeed.profileImage,
    
    // 콘텐츠 정보
    content: backendFeed.caption || '',
    imageUrl: backendFeed.imgUrl,
    
    // 상호작용 정보
    isLiked: backendFeed.liked,
    
    // 시간 정보
    createdAt: backendFeed.createdAt,
    
    // 타임라인 소스
    source
  }
}

// ============================================================================
// 🔥 수정된 타임라인 API 함수들 (백엔드 엔드포인트 기반)
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
      const posts = result.data.map(feed => 
        transformBackendFeedToTimelinePost(feed, 'timeline')
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
          type: 'timeline'
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
      const posts = result.data.map(feed => 
        transformBackendFeedToTimelinePost(feed, 'explore')
      )
      
      return {
        success: true,
        data: {
          posts,
          hasMore: false,  // 랜덤 피드는 페이징 없음
          nextCursor: null,
          type: 'explore'
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

// 🚨 백엔드에서 제거된 API - 사용하지 않음
export const getUserTimeline = async (
  userId: number,
  params?: {
    cursorCreatedAt?: string
    cursorId?: number
    size?: number
  }
): Promise<TimelineApiResponse> => {
  return {
    success: false,
    error: 'getUserTimeline API는 더 이상 지원되지 않습니다. accountName 기반 검색을 사용하세요.'
  }
}

// 🚨 백엔드에서 제거된 API - 사용하지 않음
export const getFeedDetail = async (
  feedId: number
): Promise<{
  success: boolean
  data?: TimelinePost
  error?: string
}> => {
  return {
    success: false,
    error: 'getFeedDetail API는 더 이상 지원되지 않습니다. accountName 기반 조회를 사용하세요.'
  }
}

// ============================================================================
// 🔥 수정된 통합 조회 함수 (백엔드 지원 범위만)
// ============================================================================

// ✅ 타임라인 타입에 따른 통합 조회 (지원되는 API만)
export const getTimeline = async (
  type: 'timeline' | 'explore',  // 🔥 수정: 지원되는 타입만
  options?: {
    cursorCreatedAt?: string
    cursorId?: number
    size?: number
  }
): Promise<TimelineApiResponse> => {
  switch (type) {
    case 'timeline':
      return getFollowingTimeline({
        cursorCreatedAt: options?.cursorCreatedAt,
        cursorId: options?.cursorId,
        size: options?.size
      })
    
    case 'explore':
      return getRandomTimeline({
        size: options?.size
      })
    
    default:
      return {
        success: false,
        error: '지원하지 않는 타임라인 타입입니다. timeline 또는 explore만 지원됩니다.'
      }
  }
}

// ============================================================================
// 타임라인 새로고침 및 더 보기 함수들
// ============================================================================

// ✅ 타임라인 새로고침 (첫 페이지)
export const refreshTimeline = async (
  type: 'timeline' | 'explore',  // 🔥 수정
  options?: {
    size?: number
  }
): Promise<TimelineApiResponse> => {
  return getTimeline(type, {
    size: options?.size
    // cursor 없이 첫 페이지 조회
  })
}

// ✅ 타임라인 더 보기 (다음 페이지) - timeline만 지원
export const loadMoreTimeline = async (
  cursor: {
    createdAt: string
    feedId: number
  },
  options?: {
    size?: number
  }
): Promise<TimelineApiResponse> => {
  // 🔥 수정: timeline만 커서 페이징 지원
  return getTimeline('timeline', {
    cursorCreatedAt: cursor.createdAt,
    cursorId: cursor.feedId,
    size: options?.size
  })
}

// ============================================================================
// 타임라인 유틸리티 함수들 (수정됨)
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

// ✅ 타임라인 포스트 정렬 (백엔드 기본 정렬과 동일)
export const sortTimelinePosts = (
  posts: TimelinePost[],
  sortBy: 'latest' | 'oldest' = 'latest'
): TimelinePost[] => {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    
    if (sortBy === 'latest') {
      // 백엔드와 동일한 정렬: 최신순, 같으면 feedId 역순
      if (dateA !== dateB) return dateB - dateA
      return b.feedId - a.feedId
    } else {
      if (dateA !== dateB) return dateA - dateB
      return a.feedId - b.feedId
    }
  })
}

// ✅ 타임라인 포스트 필터링 (accountName 기반)
export const filterTimelinePosts = (
  posts: TimelinePost[],
  filters: {
    accountName?: string       // 🔥 수정: userId → accountName
    dateRange?: {
      from: string
      to: string
    }
    excludeAccountNames?: string[]  // 🔥 수정: userId → accountName
  }
): TimelinePost[] => {
  return posts.filter(post => {
    // 계정명 필터
    if (filters.accountName && post.accountName !== filters.accountName) {
      return false
    }
    
    // 제외할 계정명 필터
    if (filters.excludeAccountNames && filters.excludeAccountNames.includes(post.accountName)) {
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
// 🔥 새로운 좋아요 API 연동 (likes 관련)
// ============================================================================

// ✅ 좋아요 토글
export const toggleTimelinePostLike = async (
  feedId: number
): Promise<{
  success: boolean
  data?: { isLiked: boolean }
  error?: string
}> => {
  try {
    // 현재 좋아요 상태 확인
    const checkResponse = await fetchWithAuth(`/likes/check/${feedId}`)
    const checkResult: BackendApiResponse<boolean> = await checkResponse.json()
    
    if (checkResult.error) {
      throw new Error('좋아요 상태 확인 실패')
    }
    
    const isCurrentlyLiked = checkResult.data || false
    
    // 좋아요 토글
    const toggleUrl = `/likes/${feedId}`
    const toggleMethod = isCurrentlyLiked ? 'DELETE' : 'POST'
    
    const toggleResponse = await fetchWithAuth(toggleUrl, {
      method: toggleMethod
    })
    
    const toggleResult: BackendApiResponse<void> = await toggleResponse.json()
    
    if (toggleResult.error) {
      throw new Error(toggleResult.message || '좋아요 처리에 실패했습니다.')
    }
    
    return {
      success: true,
      data: { isLiked: !isCurrentlyLiked }
    }
  } catch (error) {
    console.error('Failed to toggle like:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 타임라인 포스트 좋아요 상태 업데이트
export const updateTimelinePostLike = (
  posts: TimelinePost[],
  feedId: number,
  isLiked: boolean
): TimelinePost[] => {
  return posts.map(post => 
    post.feedId === feedId 
      ? { ...post, isLiked }
      : post
  )
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
      firstPost: posts[0]?.accountName,
      lastPost: posts[posts.length - 1]?.accountName
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

// ============================================================================
// 타입 가드 및 유틸리티
// ============================================================================

// ✅ TimelinePost 타입 가드
export const isTimelinePost = (obj: any): obj is TimelinePost => {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.feedId === 'number' &&
    typeof obj.accountName === 'string' &&
    typeof obj.authorName === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.imageUrl === 'string' &&
    typeof obj.isLiked === 'boolean' &&
    typeof obj.createdAt === 'string' &&
    ['timeline', 'explore'].includes(obj.source)
}

// ✅ 상수
export const TIMELINE_DEFAULTS = {
  PAGE_SIZE: 20,
  REFRESH_INTERVAL: 30000, // 30초
} as const

export const TIMELINE_TYPES = {
  TIMELINE: 'timeline' as const,   // 팔로잉 피드
  EXPLORE: 'explore' as const      // 랜덤 피드
} as const

// ============================================================================
// 타입 내보내기
// ============================================================================

export type {
  TimelinePost,
  TimelineApiResponse
}
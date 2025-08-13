// src/lib/api/timeline.ts - 정리된 버전 (API 함수만)

import { 
  BackendApiResponse,
  BackendFeedDetailResponse
} from '@/lib/types/feed'
import { 
  TimelinePost,
  TimelineApiResponse,
  transformBackendFeedToTimelinePost
} from '@/lib/types/timeline' // 🔥 타입들은 types에서 import
import { fetchWithAuth, handleApiError } from './feed'

// ============================================================================
// API 엔드포인트
// ============================================================================

const API_ENDPOINTS = {
  feeds: '/feeds',
} as const

// ============================================================================
// 🔥 타임라인 API 함수들 (타입은 제거, API만 남김)
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

// ============================================================================
// 🔥 통합 조회 함수
// ============================================================================

// ✅ 타임라인 타입에 따른 통합 조회
export const getTimeline = async (
  type: 'timeline' | 'explore',
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
  return getTimeline('timeline', {
    cursorCreatedAt: cursor.createdAt,
    cursorId: cursor.feedId,
    size: options?.size
  })
}

// ============================================================================
// 🔥 좋아요 API
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
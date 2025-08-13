// ============================================================================
// 🔥 백엔드 API 연동 - Timeline (완벽한 아키텍처 적용)
// ============================================================================

import api from '@/lib/axios' // 인터셉터가 설정된 axios 인스턴스
import { 
  BackendApiResponse,
  BackendFeedDetailResponse
} from '@/lib/types/feed'
import { 
  TimelinePost,
  TimelineApiResponse,
  transformBackendFeedToTimelinePost
} from '@/lib/types/timeline'

// ============================================================================
// 🔥 백엔드 API 응답 타입 (완전 호환)
// ============================================================================

interface ApiResponse<T> {
  error: boolean
  message: string
  data: T
}

// ============================================================================
// API 엔드포인트
// ============================================================================

const API_ENDPOINTS = {
  feeds: '/feeds',
} as const

// ============================================================================
// 🔥 타임라인 API 함수들 - 완벽한 아키텍처 적용
// ============================================================================

// ✅ 팔로잉 타임라인 조회 (백엔드 FeedController.followingFeeds)
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

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      `${API_ENDPOINTS.feeds}/following?${urlParams.toString()}`
    )
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    if (Array.isArray(response.data.data)) {
      const posts = response.data.data.map(feed => 
        transformBackendFeedToTimelinePost(feed, 'timeline')
      )
      
      // 다음 커서 계산
      const hasMore = response.data.data.length === (params?.size || 20)
      let nextCursor = null
      if (hasMore && response.data.data.length > 0) {
        const lastFeed = response.data.data[response.data.data.length - 1]
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
      error: '팔로잉 타임라인을 불러오는데 실패했습니다.'
    }
  } catch (error: any) {
    console.error('Failed to get following timeline:', error)
    
    let errorMessage = '팔로잉 타임라인을 불러오는데 실패했습니다.'
    if (error?.response?.status === 401) {
      errorMessage = '로그인이 필요합니다.'
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

// ✅ 랜덤 피드 타임라인 조회 (백엔드 FeedController.random)
export const getRandomTimeline = async (
  params?: {
    size?: number
  }
): Promise<TimelineApiResponse> => {
  try {
    const urlParams = new URLSearchParams()
    urlParams.append('size', (params?.size || 20).toString())

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      `${API_ENDPOINTS.feeds}/random?${urlParams.toString()}`
    )
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    if (Array.isArray(response.data.data)) {
      const posts = response.data.data.map(feed => 
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
      error: '랜덤 타임라인을 불러오는데 실패했습니다.'
    }
  } catch (error: any) {
    console.error('Failed to get random timeline:', error)
    
    let errorMessage = '랜덤 타임라인을 불러오는데 실패했습니다.'
    if (error?.response?.status === 401) {
      errorMessage = '로그인이 필요합니다.'
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return {
      success: false,
      error: errorMessage
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
// 🔥 좋아요 API - 백엔드 LikesController 연동
// ============================================================================

// 좋아요 상태 확인 (백엔드 LikesController.likedByMe)
const checkLikeStatus = async (feedId: number): Promise<boolean> => {
  try {
    const response = await api.get<ApiResponse<boolean>>(`/likes/check/${feedId}`)
    
    if (response.data.error) {
      return false
    }
    
    return response.data.data || false
  } catch (error: any) {
    console.error('Failed to check like status:', error)
    return false
  }
}

// ✅ 좋아요 토글 (백엔드 LikesController.like/unlike)
export const toggleTimelinePostLike = async (
  feedId: number
): Promise<{
  success: boolean
  data?: { isLiked: boolean }
  error?: string
}> => {
  try {
    // 현재 좋아요 상태 확인
    const isCurrentlyLiked = await checkLikeStatus(feedId)
    
    // 좋아요 토글
    if (isCurrentlyLiked) {
      // 좋아요 취소
      await api.delete<ApiResponse<void>>(`/likes/${feedId}`)
    } else {
      // 좋아요 추가
      await api.post<ApiResponse<void>>(`/likes/${feedId}`)
    }
    
    return {
      success: true,
      data: { isLiked: !isCurrentlyLiked }
    }
  } catch (error: any) {
    console.error('Failed to toggle like:', error)
    
    let errorMessage = '좋아요 처리에 실패했습니다.'
    if (error?.response?.status === 401) {
      errorMessage = '로그인이 필요합니다.'
    } else if (error?.response?.status === 404) {
      errorMessage = '존재하지 않는 게시물입니다.'
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

// ============================================================================
// 🔥 피드 검색 API (백엔드 FeedController.searchFeeds)
// ============================================================================

// ✅ 피드 검색 (사용자명 기반)
export const searchTimeline = async (
  query: string,
  params?: {
    size?: number
  }
): Promise<TimelineApiResponse> => {
  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: {
          posts: [],
          hasMore: false,
          nextCursor: null,
          type: 'explore'
        }
      }
    }

    const urlParams = new URLSearchParams()
    urlParams.append('query', query.trim())
    urlParams.append('size', (params?.size || 10).toString())

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      `${API_ENDPOINTS.feeds}/search?${urlParams.toString()}`
    )
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    if (Array.isArray(response.data.data)) {
      const posts = response.data.data.map(feed => 
        transformBackendFeedToTimelinePost(feed, 'explore')
      )
      
      return {
        success: true,
        data: {
          posts,
          hasMore: false,  // 검색 결과는 페이징 없음
          nextCursor: null,
          type: 'explore'
        }
      }
    }

    return {
      success: false,
      error: '검색 결과를 불러오는데 실패했습니다.'
    }
  } catch (error: any) {
    console.error('Failed to search timeline:', error)
    
    let errorMessage = '검색에 실패했습니다.'
    if (error?.response?.status === 401) {
      errorMessage = '로그인이 필요합니다.'
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}
// src/lib/api/timeline.ts - 백엔드 연동 수정 버전

import api from '@/lib/axios' // 인터셉터가 설정된 axios 인스턴스
import { 
  PostResponse,
  PostDetailResponse,
  ApiResponse,
  API_ENDPOINTS,
  formatTimeAgo,
  formatLikeCount,
} from '@/lib/types/feed'
import { 
  TimelinePost,
  TimelineApiResponse,
  transformPostResponseToTimelinePost,
  TimelineRequestParams,
  ExploreRequestParams,
} from '@/lib/types/timeline'

// ============================================================================
// 🔥 백엔드 연동 타임라인 API 함수들
// ============================================================================

/**
 * ✅ 팔로잉 타임라인 조회 (백엔드 GET /feeds/timeline)
 */
export const getFollowingTimeline = async (
  params?: TimelineRequestParams
): Promise<{
  success: boolean
  data?: { posts: TimelinePost[]; hasMore: boolean }
  error?: string
}> => {
  try {
    const size = params?.size || 20
    
    console.log('=== 팔로잉 타임라인 조회 API 호출 ===', { size })

    const response = await api.get<ApiResponse<PostResponse[]>>(
      `${API_ENDPOINTS.TIMELINE}?size=${size}`
    )
    
    console.log('팔로잉 타임라인 응답:', response.data)

    // 백엔드 ApiResponse 구조 체크
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로잉 타임라인을 불러오는데 실패했습니다.'
      }
    }
    
    const postsData = response.data.data || []
    
    if (!Array.isArray(postsData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    // PostResponse를 TimelinePost로 변환
    const posts = postsData.map(post => 
      transformPostResponseToTimelinePost(post, 'timeline')
    )
    
    return {
      success: true,
      data: {
        posts,
        hasMore: postsData.length >= size, // size만큼 받았으면 더 있을 가능성
      }
    }
  } catch (error: any) {
    console.error('Failed to get following timeline:', error)
    
    return {
      success: false,
      error: handleTimelineError(error)
    }
  }
}

/**
 * ✅ 랜덤 게시물 타임라인 조회 (백엔드 GET /feeds/explore)
 */
export const getExploreTimeline = async (
  params?: ExploreRequestParams
): Promise<{
  success: boolean
  data?: { posts: TimelinePost[]; hasMore: boolean }
  error?: string
}> => {
  try {
    const size = params?.size || 20
    
    console.log('=== Explore 타임라인 조회 API 호출 ===', { size })

    const response = await api.get<ApiResponse<PostResponse[]>>(
      `${API_ENDPOINTS.EXPLORE}?size=${size}`
    )
    
    console.log('Explore 타임라인 응답:', response.data)

    // 백엔드 ApiResponse 구조 체크
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || 'Explore 타임라인을 불러오는데 실패했습니다.'
      }
    }
    
    const postsData = response.data.data || []
    
    if (!Array.isArray(postsData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    // PostResponse를 TimelinePost로 변환
    const posts = postsData.map(post => 
      transformPostResponseToTimelinePost(post, 'explore')
    )
    
    return {
      success: true,
      data: {
        posts,
        hasMore: postsData.length >= size,
      }
    }
  } catch (error: any) {
    console.error('Failed to get explore timeline:', error)
    
    return {
      success: false,
      error: handleTimelineError(error)
    }
  }
}

/**
 * ✅ 피드 검색 (백엔드 GET /feeds/search)
 */
export const searchTimeline = async (
  query: string,
  params?: { size?: number }
): Promise<{
  success: boolean
  data?: { posts: TimelinePost[]; hasMore: boolean }
  error?: string
}> => {
  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: {
          posts: [],
          hasMore: false,
        }
      }
    }

    const size = params?.size || 10
    
    console.log('=== 피드 검색 API 호출 ===', { query, size })

    const response = await api.get<ApiResponse<any[]>>(
      `${API_ENDPOINTS.SEARCH_FEEDS}?query=${encodeURIComponent(query.trim())}&size=${size}`
    )
    
    console.log('피드 검색 응답:', response.data)

    // 백엔드 ApiResponse 구조 체크
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '검색에 실패했습니다.'
      }
    }
    
    const feedsData = response.data.data || []
    
    if (!Array.isArray(feedsData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    // FeedWithPostsResponse에서 게시물들 추출하여 TimelinePost로 변환
    const posts: TimelinePost[] = []
    feedsData.forEach(feed => {
      if (feed.posts && Array.isArray(feed.posts)) {
        feed.posts.forEach((post: PostResponse) => {
          posts.push(transformPostResponseToTimelinePost(post, 'explore'))
        })
      }
    })
    
    return {
      success: true,
      data: {
        posts,
        hasMore: false, // 검색 결과는 페이징 없음
      }
    }
  } catch (error: any) {
    console.error('Failed to search timeline:', error)
    
    return {
      success: false,
      error: handleTimelineError(error)
    }
  }
}

// ============================================================================
// 🔥 통합 조회 함수
// ============================================================================

/**
 * ✅ 타임라인 타입에 따른 통합 조회
 */
export const getTimeline = async (
  type: 'timeline' | 'explore',
  options?: {
    size?: number
  }
): Promise<{
  success: boolean
  data?: { posts: TimelinePost[]; hasMore: boolean; type: 'timeline' | 'explore' }
  error?: string
}> => {
  let result: any

  switch (type) {
    case 'timeline':
      result = await getFollowingTimeline({ size: options?.size })
      break
    
    case 'explore':
      result = await getExploreTimeline({ size: options?.size })
      break
    
    default:
      return {
        success: false,
        error: '지원하지 않는 타임라인 타입입니다. timeline 또는 explore만 지원됩니다.'
      }
  }

  if (result.success && result.data) {
    return {
      success: true,
      data: {
        ...result.data,
        type
      }
    }
  }

  return result
}

/**
 * ✅ 타임라인 더 보기 (무한 스크롤)
 */
export const loadMoreTimeline = async (
  type: 'timeline' | 'explore',
  currentPosts: TimelinePost[],
  options?: { size?: number }
): Promise<{
  success: boolean
  data?: { posts: TimelinePost[]; hasMore: boolean }
  error?: string
}> => {
  const result = await getTimeline(type, options)
  
  if (!result.success || !result.data) {
    return result
  }

  // 기존 게시물과 중복 제거
  const existingIds = new Set(currentPosts.map(post => post.postId))
  const newPosts = result.data.posts.filter(post => !existingIds.has(post.postId))
  
  return {
    success: true,
    data: {
      posts: [...currentPosts, ...newPosts],
      hasMore: result.data.hasMore && newPosts.length > 0,
    }
  }
}

// ============================================================================
// 🔥 좋아요 API - 백엔드 POST/DELETE /likes/posts/{postId}
// ============================================================================

/**
 * ✅ 좋아요 토글 (백엔드 LikesController)
 */
export const toggleTimelinePostLike = async (
  postId: number,
  isCurrentlyLiked: boolean
): Promise<{
  success: boolean
  data?: { isLiked: boolean }
  error?: string
}> => {
  try {
    console.log('=== 타임라인 게시물 좋아요 토글 ===', { postId, isCurrentlyLiked })

    if (isCurrentlyLiked) {
      // 좋아요 취소 (DELETE /likes/posts/{postId})
      const response = await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`)
      
      if (response.data.error) {
        return {
          success: false,
          error: response.data.message || '좋아요 취소에 실패했습니다.'
        }
      }
    } else {
      // 좋아요 추가 (POST /likes/posts/{postId})
      const response = await api.post<ApiResponse<void>>(`/likes/posts/${postId}`)
      
      if (response.data.error) {
        return {
          success: false,
          error: response.data.message || '좋아요에 실패했습니다.'
        }
      }
    }
    
    return {
      success: true,
      data: { isLiked: !isCurrentlyLiked }
    }
  } catch (error: any) {
    console.error('Failed to toggle timeline post like:', error)
    
    return {
      success: false,
      error: handleTimelineError(error)
    }
  }
}

/**
 * ✅ 좋아요 상태 확인 (백엔드 GET /likes/posts/{postId}/check)
 */
export const checkTimelinePostLikeStatus = async (
  postId: number
): Promise<{
  success: boolean
  data?: boolean
  error?: string
}> => {
  try {
    const response = await api.get<ApiResponse<boolean>>(`/likes/posts/${postId}/check`)
    
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '좋아요 상태 확인에 실패했습니다.'
      }
    }
    
    return {
      success: true,
      data: response.data.data ?? false
    }
  } catch (error: any) {
    console.error('Failed to check timeline post like status:', error)
    
    return {
      success: false,
      error: handleTimelineError(error)
    }
  }
}

/**
 * ✅ 좋아요 수 조회 (백엔드 GET /likes/posts/{postId}/count)
 */
export const getTimelinePostLikeCount = async (
  postId: number
): Promise<{
  success: boolean
  data?: number
  error?: string
}> => {
  try {
    const response = await api.get<ApiResponse<number>>(`/likes/posts/${postId}/count`)
    
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '좋아요 수 조회에 실패했습니다.'
      }
    }
    
    return {
      success: true,
      data: response.data.data ?? 0
    }
  } catch (error: any) {
    console.error('Failed to get timeline post like count:', error)
    
    return {
      success: false,
      error: handleTimelineError(error)
    }
  }
}

// ============================================================================
// 🔥 낙관적 업데이트 헬퍼 함수들
// ============================================================================

/**
 * ✅ 낙관적 좋아요 토글
 */
export const toggleTimelinePostLikeOptimistic = async (
  postId: number,
  isCurrentlyLiked: boolean,
  onOptimisticUpdate: (newState: boolean) => void,
  onError: (originalState: boolean) => void
): Promise<void> => {
  // 즉시 UI 업데이트
  onOptimisticUpdate(!isCurrentlyLiked)
  
  try {
    const result = await toggleTimelinePostLike(postId, isCurrentlyLiked)
    if (!result.success) {
      // 실패시 롤백
      onError(isCurrentlyLiked)
      throw new Error(result.error)
    }
  } catch (error) {
    // 에러 발생시 롤백
    onError(isCurrentlyLiked)
    throw error
  }
}

/**
 * ✅ 타임라인 게시물 좋아요 상태 일괄 업데이트
 */
export const syncTimelinePostsLikeData = async (
  posts: TimelinePost[]
): Promise<TimelinePost[]> => {
  const postIds = posts.map(post => post.postId)
  
  // 병렬로 좋아요 상태와 수 조회
  const likeStatusPromises = postIds.map(async (postId) => {
    try {
      const [statusResult, countResult] = await Promise.all([
        checkTimelinePostLikeStatus(postId),
        getTimelinePostLikeCount(postId)
      ])
      
      return {
        postId,
        isLiked: statusResult.success ? (statusResult.data ?? false) : false,
        likeCount: countResult.success ? (countResult.data ?? 0) : 0
      }
    } catch (error) {
      console.error(`좋아요 데이터 동기화 실패 (postId: ${postId}):`, error)
      return {
        postId,
        isLiked: false,
        likeCount: 0
      }
    }
  })

  const likeData = await Promise.all(likeStatusPromises)
  const likeDataMap = likeData.reduce((acc, { postId, isLiked, likeCount }) => {
    acc[postId] = { isLiked, likeCount }
    return acc
  }, {} as Record<number, { isLiked: boolean; likeCount: number }>)

  // 게시물 업데이트
  return posts.map(post => {
    const likeInfo = likeDataMap[post.postId]
    if (likeInfo) {
      return {
        ...post,
        isLikedByMe: likeInfo.isLiked,
        likeCount: likeInfo.likeCount,
        formattedLikeCount: formatLikeCount(likeInfo.likeCount)
      }
    }
    return post
  })
}

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

/**
 * 타임라인 에러 처리
 */
const handleTimelineError = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message
  }
  
  switch (error?.response?.status) {
    case 401:
      return '토큰이 만료되었거나 인증에 실패했습니다.'
    case 403:
      return '접근 권한이 없습니다.'
    case 404:
      return '요청한 리소스를 찾을 수 없습니다.'
    case 500:
      return '서버 오류가 발생했습니다.'
    default:
      if (error?.message) {
        return error.message
      }
      return '네트워크 오류가 발생했습니다.'
  }
}

/**
 * 타임라인 게시물 새로고침 (시간 정보 업데이트)
 */
export const refreshTimelinePostsTimeInfo = (posts: TimelinePost[]): TimelinePost[] => {
  return posts.map(post => ({
    ...post,
    timeAgo: formatTimeAgo(post.createdAt)
  }))
}

// ============================================================================
// 🔄 하위 호환성 함수들 (기존 코드 호환용)
// ============================================================================

// 기존 getRandomTimeline → getExploreTimeline 리다이렉트
export const getRandomTimeline = getExploreTimeline

// 기존 함수명들 호환성 지원
export { getFollowingTimeline as getFollowingFeeds }
export { getExploreTimeline as getRandomFeeds }
export { searchTimeline as searchFeeds }
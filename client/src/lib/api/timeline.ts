// src/lib/api/timeline.ts - 깔끔한 백엔드 연동 (아키텍처 원칙 준수)
// 🔥 아키텍처 원칙: 로그인 필수 + 커서 기반 무한스크롤 + axios 인터셉터 완전 위임

import api from '@/lib/axios' // 🔐 인터셉터가 모든 인증 처리
import { 
  type PostResponse,
  type PostListResponse,
  type ApiResponse,
  type CursorPaginationParams,
  type PostCardForUI,
  type CursorPostsResult,
  API_ENDPOINTS,
  buildPaginationQuery,
  formatTimeAgo,
  formatLikeCount,
} from '../types/feed'

// ============================================================================
// 🎯 백엔드 연동 타입들 (Long 타입 처리)
// ============================================================================

type Long = number | string

interface BackendPostResponse {
  postId: Long
  photoId: Long
  imgUrl: string
  caption: string | null
  displayOrder: Long | null
  createdAt: string
  likeCount: Long
  isLikedByMe: boolean
  authorId: Long
  authorAccountName: string
  authorProfileImage: string | null
}

interface BackendPostListResponse {
  posts: BackendPostResponse[]
  hasNext: boolean
  nextCursor: Long | null
}

// ============================================================================
// 🔧 타입 변환 함수들
// ============================================================================

const safeLongToNumber = (value: Long | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  return typeof value === 'string' ? parseInt(value, 10) : Number(value)
}

const convertBackendPost = (backendPost: BackendPostResponse): PostResponse => {
  return {
    postId: Number(backendPost.postId),
    photoId: Number(backendPost.photoId),
    imgUrl: backendPost.imgUrl,
    caption: backendPost.caption,
    displayOrder: safeLongToNumber(backendPost.displayOrder),
    createdAt: backendPost.createdAt,
    likeCount: Number(backendPost.likeCount),
    isLikedByMe: backendPost.isLikedByMe,
    authorId: Number(backendPost.authorId),
    authorAccountName: backendPost.authorAccountName,
    authorProfileImage: backendPost.authorProfileImage
  }
}

const convertBackendPostList = (backendPostList: BackendPostListResponse): PostListResponse => {
  return {
    posts: backendPostList.posts.map(convertBackendPost),
    hasNext: backendPostList.hasNext,
    nextCursor: safeLongToNumber(backendPostList.nextCursor)
  }
}

const transformPostToUICard = (post: PostResponse): PostCardForUI => {
  return {
    ...post,
    timeAgo: formatTimeAgo(post.createdAt),
    formattedLikeCount: formatLikeCount(post.likeCount),
    isLoading: false,
    isOptimistic: false,
  }
}

const transformPostListToUICards = (postList: PostListResponse): CursorPostsResult => {
  return {
    posts: postList.posts.map(transformPostToUICard),
    hasNext: postList.hasNext,
    nextCursor: postList.nextCursor
  }
}

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }
    switch (axiosError.response?.status) {
      case 401: return '인증이 필요합니다. 다시 로그인해주세요.'
      case 403: return '접근 권한이 없습니다.'
      case 404: return '요청한 리소스를 찾을 수 없습니다.'
      case 500: return '서버 오류가 발생했습니다.'
      default: return '네트워크 오류가 발생했습니다.'
    }
  }
  if (error instanceof Error) return error.message
  return '알 수 없는 오류가 발생했습니다.'
}

// ============================================================================
// 🚀 핵심 타임라인 API 함수들 (커서 기반)
// ============================================================================

/**
 * ✅ 팔로잉 타임라인 조회 (GET /feeds/timeline)
 * 🔐 인증 필수
 */
export const getFollowingTimeline = async (
  params: CursorPaginationParams = { limit: 20 }
): Promise<{ success: boolean; data?: CursorPostsResult; error?: string }> => {
  try {
    const queryString = buildPaginationQuery(params)
    const url = queryString ? `${API_ENDPOINTS.TIMELINE}?${queryString}` : API_ENDPOINTS.TIMELINE

    const response = await api.get<ApiResponse<BackendPostListResponse>>(url)

    if (response.data.error) {
      return { success: false, error: response.data.message || '팔로잉 타임라인을 불러오는데 실패했습니다.' }
    }
    if (!response.data.data) {
      return { success: false, error: '타임라인 데이터가 없습니다.' }
    }

    const convertedPostList = convertBackendPostList(response.data.data)
    const result = transformPostListToUICards(convertedPostList)
    
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

/**
 * ✅ Explore 타임라인 조회 (GET /feeds/explore)
 * 🔐 인증 필수
 */
export const getExploreTimeline = async (
  params: CursorPaginationParams = { limit: 20 }
): Promise<{ success: boolean; data?: CursorPostsResult; error?: string }> => {
  try {
    const queryString = buildPaginationQuery(params)
    const url = queryString ? `${API_ENDPOINTS.EXPLORE}?${queryString}` : API_ENDPOINTS.EXPLORE

    const response = await api.get<ApiResponse<BackendPostListResponse>>(url)

    if (response.data.error) {
      return { success: false, error: response.data.message || 'Explore 타임라인을 불러오는데 실패했습니다.' }
    }
    if (!response.data.data) {
      return { success: false, error: 'Explore 데이터가 없습니다.' }
    }

    const convertedPostList = convertBackendPostList(response.data.data)
    const result = transformPostListToUICards(convertedPostList)
    
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

/**
 * ✅ 통합 타임라인 조회 (타입에 따라 분기)
 */
export const getTimeline = async (
  type: 'timeline' | 'explore',
  params: CursorPaginationParams = { limit: 20 }
): Promise<{ success: boolean; data?: CursorPostsResult; error?: string }> => {
  switch (type) {
    case 'timeline':
      return getFollowingTimeline(params)
    case 'explore':
      return getExploreTimeline(params)
    default:
      return { success: false, error: '지원하지 않는 타임라인 타입입니다.' }
  }
}

// ============================================================================
// 📱 커서 기반 무한 스크롤 헬퍼 함수들
// ============================================================================

/**
 * ✅ 타임라인 더보기 로딩 (커서 기반)
 */
export const loadMoreTimeline = async (
  type: 'timeline' | 'explore',
  currentPosts: PostCardForUI[],
  limit: number = 20
): Promise<{
  success: boolean
  data?: { posts: PostCardForUI[]; hasNext: boolean; nextCursor: number | null }
  error?: string
}> => {
  const lastPost = currentPosts[currentPosts.length - 1]
  const cursor = lastPost?.postId

  if (!cursor) {
    return { success: false, error: '커서를 찾을 수 없습니다.' }
  }

  const result = await getTimeline(type, { limit, cursor })
  
  if (!result.success || !result.data) {
    return { success: false, error: result.error }
  }

  const existingIds = new Set(currentPosts.map(post => post.postId))
  const newPosts = result.data.posts.filter(post => !existingIds.has(post.postId))

  return {
    success: true,
    data: {
      posts: [...currentPosts, ...newPosts],
      hasNext: result.data.hasNext,
      nextCursor: result.data.nextCursor,
    },
  }
}

/**
 * ✅ 타임라인 새로고침 (처음부터 다시 로드)
 */
export const refreshTimeline = async (
  type: 'timeline' | 'explore',
  limit: number = 20
): Promise<{ success: boolean; data?: CursorPostsResult; error?: string }> => {
  return getTimeline(type, { limit })
}

// ============================================================================
// ❤️ 좋아요 관련 API 함수들
// ============================================================================

/**
 * ✅ 좋아요 토글 (POST/DELETE /likes/posts/{postId})
 * 🔐 인증 필수
 */
export const toggleTimelinePostLike = async (
  postId: number,
  isCurrentlyLiked: boolean
): Promise<{ success: boolean; isLiked: boolean; error?: string }> => {
  try {
    if (!Number.isInteger(postId) || postId <= 0) {
      return { success: false, isLiked: isCurrentlyLiked, error: '유효하지 않은 게시물 ID입니다.' }
    }

    const endpoint = isCurrentlyLiked 
      ? API_ENDPOINTS.UNLIKE_POST(postId)
      : API_ENDPOINTS.LIKE_POST(postId)
    
    const response = isCurrentlyLiked
      ? await api.delete<ApiResponse<void>>(endpoint)
      : await api.post<ApiResponse<void>>(endpoint)

    if (response.data.error) {
      const errorMsg = isCurrentlyLiked ? '좋아요 취소에 실패했습니다.' : '좋아요에 실패했습니다.'
      return { success: false, isLiked: isCurrentlyLiked, error: response.data.message || errorMsg }
    }

    return { success: true, isLiked: !isCurrentlyLiked }
  } catch (error) {
    return { success: false, isLiked: isCurrentlyLiked, error: handleApiError(error) }
  }
}

/**
 * ✅ 낙관적 좋아요 토글 (UI 먼저 업데이트, 실패시 롤백)
 */
export const toggleTimelinePostLikeOptimistic = async (
  postId: number,
  isCurrentlyLiked: boolean,
  onOptimisticUpdate: (newState: boolean) => void,
  onError: (originalState: boolean) => void
): Promise<void> => {
  onOptimisticUpdate(!isCurrentlyLiked)

  try {
    const result = await toggleTimelinePostLike(postId, isCurrentlyLiked)
    if (!result.success) {
      onError(isCurrentlyLiked)
      throw new Error(result.error)
    }
  } catch (error) {
    onError(isCurrentlyLiked)
    throw error
  }
}

/**
 * ✅ 좋아요 상태 확인 (GET /likes/posts/{postId}/check)
 * 🔐 인증 필수
 */
export const checkTimelinePostLikeStatus = async (
  postId: number
): Promise<{ success: boolean; data?: boolean; error?: string }> => {
  try {
    if (!Number.isInteger(postId) || postId <= 0) {
      return { success: false, error: '유효하지 않은 게시물 ID입니다.' }
    }

    const response = await api.get<ApiResponse<boolean>>(
      API_ENDPOINTS.CHECK_LIKE_STATUS(postId)
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '좋아요 상태 확인에 실패했습니다.' }
    }

    return { success: true, data: response.data.data ?? false }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

/**
 * ✅ 좋아요 수 조회 (GET /likes/posts/{postId}/count)
 * 🔐 인증 필수
 */
export const getTimelinePostLikeCount = async (
  postId: number
): Promise<{ success: boolean; data?: number; error?: string }> => {
  try {
    if (!Number.isInteger(postId) || postId <= 0) {
      return { success: false, error: '유효하지 않은 게시물 ID입니다.' }
    }

    const response = await api.get<ApiResponse<Long>>(
      API_ENDPOINTS.GET_LIKE_COUNT(postId)
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '좋아요 수 조회에 실패했습니다.' }
    }

    const likeCount = response.data.data ? Number(response.data.data) : 0
    return { success: true, data: likeCount }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

// ============================================================================
// 🔄 하위 호환성 함수들
// ============================================================================

export const getFollowingFeeds = async (params?: CursorPaginationParams) => {
  const result = await getFollowingTimeline(params)
  if (result.success && result.data) {
    return { success: true, data: { posts: result.data.posts, hasMore: result.data.hasNext } }
  }
  return result
}

export const getRandomFeeds = async (params?: CursorPaginationParams) => {
  const result = await getExploreTimeline(params)
  if (result.success && result.data) {
    return { success: true, data: { posts: result.data.posts, hasMore: result.data.hasNext } }
  }
  return result
}
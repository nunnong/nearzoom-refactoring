// src/lib/api/timeline.ts

import {
  TimelinePost,
  TimelineApiResponse,
  TimelineStatsResponse,
  TimelineRequest,
  TimelineSort,
  TimelineFilters,
  BackendTimelineResponse,  // 🔥 timeline.ts에서 import
  BackendFeedItem,
  BackendApiResponse
} from '@/lib/types/timeline'

import {
  CanvasFeedItem,
  BackendFeedDetailResponse,
  BackendUserInfoResponse
} from '@/lib/types/feed'

import {
  getFeed,
  getLikeCount,
  checkLikeStatus,
  toggleFeedLike,
  getCurrentUser,
  handleApiError
} from './feed'

// ============================================================================
// API 설정
// ============================================================================

const API_BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  return url.replace(/\/$/, '')
})()

const API_ENDPOINTS = {
  timeline: '/feeds/timeline',        // 팔로잉 타임라인
  explore: '/feeds/explore',          // 탐색 피드
  popular: '/feeds/popular',          // 인기 피드
  userFeeds: '/feeds/user',           // 특정 사용자 피드
  stats: '/feeds/stats',              // 타임라인 통계
} as const

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// 인증 토큰 가져오기
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
}

// HTTP 요청 헬퍼
const fetchWithAuth = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response
}

// ============================================================================
// 데이터 변환 함수들
// ============================================================================

// ✅ 백엔드 FeedItem을 TimelinePost로 변환
const transformBackendFeedToTimelinePost = async (
  backendFeed: BackendFeedItem,
  source: TimelinePost['source'] = 'explore'
): Promise<TimelinePost> => {
  try {
    // 기본 피드 정보 조회 (사용자 정보와 좋아요 정보 포함)
    const feedResult = await getFeed(backendFeed.feedId.toString())
    
    if (!feedResult.success || !feedResult.data) {
      throw new Error('피드 정보를 가져올 수 없습니다.')
    }

    const canvasFeed = feedResult.data

    // TimelinePost로 변환
    const timelinePost: TimelinePost = {
      // CanvasFeedItem의 모든 속성 상속
      ...canvasFeed,
      
      // TimelinePost 고유 속성 추가
      source,
      displayOrder: Date.now(), // 임시 값
      
      // 추가 상호작용 정보 (향후 구현)
      viewCount: 0,
      shareCount: 0,
      
      // 타임라인 컨텍스트
      context: {
        reason: getDisplayReason(source),
        relatedUsers: []
      }
    }

    return timelinePost
  } catch (error) {
    console.error('Failed to transform backend feed:', error)
    
    // 실패 시 기본값으로 변환
    const currentUser = await getCurrentUser()
    
    return {
      // 기본 Feed 속성들
      id: backendFeed.feedId.toString(),
      authorId: backendFeed.userId.toString(),
      photoId: backendFeed.photoId.toString(),
      photoUrl: backendFeed.photoUrl,
      createdAt: backendFeed.createdAt,
      updatedAt: backendFeed.createdAt,
      authorName: `User ${backendFeed.userId}`,
      likesCount: 0,
      isLiked: false,
      isFollowing: false,
      
      // UserFeed 속성들
      userId: backendFeed.userId.toString(),
      name: `Feed ${backendFeed.feedId}`,
      description: '',
      isPublic: true,
      backgroundColor: '#ffffff',
      totalHeight: 1600,
      followersCount: 0,
      
      // CanvasFeedItem 속성들
      elements: [],
      
      // TimelinePost 속성들
      source,
      displayOrder: Date.now(),
      viewCount: 0,
      shareCount: 0,
      context: {
        reason: getDisplayReason(source),
        relatedUsers: []
      }
    }
  }
}

// 표시 이유 생성
const getDisplayReason = (source: TimelinePost['source']): string => {
  switch (source) {
    case 'following':
      return '팔로우 중인 사용자의 게시물'
    case 'explore':
      return '탐색 피드'
    case 'my':
      return '내 게시물'
    default:
      return '추천 게시물'
  }
}

// ============================================================================
// 메인 API 함수들
// ============================================================================

// ✅ 팔로잉 타임라인 조회
export const getFollowingTimeline = async (
  cursor?: string,
  limit: number = 20
): Promise<TimelineApiResponse> => {
  try {
    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())
    
    const url = `${API_ENDPOINTS.timeline}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendTimelineResponse> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '팔로잉 타임라인을 불러오는데 실패했습니다.'
      }
    }
    
    // 백엔드 데이터를 TimelinePost로 변환
    const timelinePosts: TimelinePost[] = []
    for (const backendFeed of result.data.items) {
      const timelinePost = await transformBackendFeedToTimelinePost(backendFeed, 'following')
      timelinePosts.push(timelinePost)
    }
    
    return {
      success: true,
      data: {
        posts: timelinePosts,
        hasMore: result.data.hasNext,
        nextCursor: result.data.nextCursor !== null ? result.data.nextCursor.toString() : null, // 🔥 더 명확한 타입 체크
        total: timelinePosts.length,
        type: 'following'
      }
    }
  } catch (error) {
    console.error('Failed to get following timeline:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 탐색 타임라인 조회
export const getExploreTimeline = async (
  cursor?: string,
  limit: number = 20,
  sort: TimelineSort = 'latest'
): Promise<TimelineApiResponse> => {
  try {
    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())
    if (sort) params.append('sort', sort)
    
    const url = `${API_ENDPOINTS.explore}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendTimelineResponse> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '탐색 타임라인을 불러오는데 실패했습니다.'
      }
    }
    
    // 백엔드 데이터를 TimelinePost로 변환
    const timelinePosts: TimelinePost[] = []
    for (const backendFeed of result.data.items) {
      const timelinePost = await transformBackendFeedToTimelinePost(backendFeed, 'explore')
      timelinePosts.push(timelinePost)
    }
    
    return {
      success: true,
      data: {
        posts: timelinePosts,
        hasMore: result.data.hasNext,
        nextCursor: result.data.nextCursor !== null && result.data.nextCursor !== undefined ? result.data.nextCursor.toString() : null,
        total: timelinePosts.length,
        type: 'explore'
      }
    }
  } catch (error) {
    console.error('Failed to get explore timeline:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 특정 사용자 타임라인 조회
export const getUserTimeline = async (
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<TimelineApiResponse> => {
  try {
    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())
    
    const url = `${API_ENDPOINTS.userFeeds}/${userId}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendTimelineResponse> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '사용자 타임라인을 불러오는데 실패했습니다.'
      }
    }
    
    // 현재 사용자 확인
    const currentUser = await getCurrentUser()
    const source: TimelinePost['source'] = currentUser?.id === userId ? 'my' : 'explore'
    
    // 백엔드 데이터를 TimelinePost로 변환
    const timelinePosts: TimelinePost[] = []
    for (const backendFeed of result.data.items) {
      const timelinePost = await transformBackendFeedToTimelinePost(backendFeed, source)
      timelinePosts.push(timelinePost)
    }
    
    return {
      success: true,
      data: {
        posts: timelinePosts,
        hasMore: result.data.hasNext,
        nextCursor: result.data.nextCursor !== null && result.data.nextCursor !== undefined ? result.data.nextCursor.toString() : null,
        total: timelinePosts.length,
        type: 'user'
      }
    }
  } catch (error) {
    console.error('Failed to get user timeline:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 통합 타임라인 조회 (요청 타입에 따라 적절한 API 호출)
export const getTimeline = async (request: TimelineRequest): Promise<TimelineApiResponse> => {
  try {
    switch (request.type) {
      case 'following':
        return await getFollowingTimeline(request.cursor, request.limit)
      
      case 'explore':
        return await getExploreTimeline(request.cursor, request.limit, request.sort)
      
      case 'user':
        if (!request.userId) {
          return {
            success: false,
            error: '사용자 ID가 필요합니다.'
          }
        }
        return await getUserTimeline(request.userId, request.cursor, request.limit)
      
      default:
        return {
          success: false,
          error: '유효하지 않은 타임라인 타입입니다.'
        }
    }
  } catch (error) {
    console.error('Failed to get timeline:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 타임라인 통계 조회
export const getTimelineStats = async (): Promise<TimelineStatsResponse> => {
  try {
    const url = API_ENDPOINTS.stats
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<{
      totalPosts: number
      followingPosts: number
      todayPosts: number
      lastUpdate: string
    }> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '타임라인 통계를 불러오는데 실패했습니다.'
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('Failed to get timeline stats:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 타임라인 상호작용 함수들
// ============================================================================

// ✅ 타임라인 포스트 좋아요 토글
export const toggleTimelinePostLike = async (
  postId: string
): Promise<{
  success: boolean
  data?: { isLiked: boolean; likesCount: number }
  error?: string
}> => {
  try {
    // TimelinePost의 id는 실제 feedId와 동일하므로 그대로 사용
    const result = await getFeed(postId)
    
    if (!result.success || !result.data) {
      throw new Error('피드를 찾을 수 없습니다.')
    }
    
    // photoId를 사용해서 좋아요 토글
    const likeResult = await toggleFeedLike(Number(result.data.photoId))
    
    if (!likeResult.success) {
      throw new Error(likeResult.error || '좋아요 처리에 실패했습니다.')
    }
    
    return likeResult
  } catch (error) {
    console.error('Failed to toggle timeline post like:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 타임라인 새로고침
export const refreshTimeline = async (
  timelineType: 'following' | 'explore' = 'following'
): Promise<TimelineApiResponse> => {
  try {
    const request: TimelineRequest = {
      type: timelineType,
      limit: 20
    }
    
    return await getTimeline(request)
  } catch (error) {
    console.error('Failed to refresh timeline:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 검색 및 필터링 함수들
// ============================================================================

// ✅ 타임라인 검색 (백엔드 구현 필요)
export const searchTimeline = async (
  query: string,
  filters: TimelineFilters = {},
  cursor?: string,
  limit: number = 20
): Promise<TimelineApiResponse> => {
  try {
    const params = new URLSearchParams()
    params.append('q', query)
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())
    if (filters.followingOnly) params.append('followingOnly', 'true')
    if (filters.userId) params.append('userId', filters.userId)
    
    const url = `/feeds/search?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendTimelineResponse> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '타임라인 검색에 실패했습니다.'
      }
    }
    
    // 백엔드 데이터를 TimelinePost로 변환
    const timelinePosts: TimelinePost[] = []
    for (const backendFeed of result.data.items) {
      const timelinePost = await transformBackendFeedToTimelinePost(backendFeed, 'explore')
      timelinePosts.push(timelinePost)
    }
    
    return {
      success: true,
      data: {
        posts: timelinePosts,
        hasMore: result.data.hasNext,
        nextCursor: result.data.nextCursor !== null && result.data.nextCursor !== undefined ? result.data.nextCursor.toString() : null,
        total: timelinePosts.length,
        type: 'explore'
      }
    }
  } catch (error) {
    console.error('Failed to search timeline:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 호환성을 위한 레거시 함수들
// ============================================================================

// ✅ 이전 API와의 호환성을 위한 함수들
export const getUserFeedHistory = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  posts: TimelinePost[]
  hasMore: boolean
  total: number
}> => {
  const result = await getUserTimeline(userId, undefined, limit)
  
  if (!result.success || !result.data) {
    return {
      posts: [],
      hasMore: false,
      total: 0
    }
  }
  
  return {
    posts: result.data.posts,
    hasMore: result.data.hasMore,
    total: result.data.total || 0
  }
}

// ✅ 해시태그 검색 제거 (해시태그 기능 없음)
export const getFeedsByHashtag = async (
  hashtag: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  posts: TimelinePost[]
  hasMore: boolean
  total: number
}> => {
  console.warn('해시태그 기능이 제거되었습니다.')
  return {
    posts: [],
    hasMore: false,
    total: 0
  }
}

// ✅ 트렌딩 해시태그 제거 (해시태그 기능 없음)
export const getTrendingHashtags = async (
  limit: number = 10
): Promise<{ tag: string; count: number }[]> => {
  console.warn('해시태그 기능이 제거되었습니다.')
  return []
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

export const isTimelinePost = (item: any): item is TimelinePost => {
  return item && typeof item === 'object' && 'source' in item && 'displayOrder' in item
}

export const sortTimelinePosts = (
  posts: TimelinePost[],
  sortBy: TimelineSort = 'latest'
): TimelinePost[] => {
  switch (sortBy) {
    case 'latest':
      return [...posts].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    case 'popular':
      return [...posts].sort((a, b) => b.likesCount - a.likesCount)
    case 'oldest':
      return [...posts].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    default:
      return posts
  }
}
// src/lib/api/explore.ts

import { 
  CanvasFeedItem,
  BackendFeedItem,
  BackendFeedListResponse,
  BackendUserInfoResponse,
  BackendApiResponse
} from '@/lib/types/feed'

import {
  getFeed,
  toggleFeedLike,
  getLikeCount,
  checkLikeStatus,
  getCurrentUser,
  handleApiError,
  fetchWithAuth
} from './feed'

// ============================================================================
// 백엔드 연동 타입들
// ============================================================================

// ✅ 백엔드 기반 탐색 피드 (CanvasFeedItem 확장)
export interface ExploreFeed extends CanvasFeedItem {
  category?: string
  discoverScore?: number // 클라이언트에서 계산
  source: 'explore' | 'popular' | 'recent' | 'recommended'
}

// ✅ 탐색 카테고리 (백엔드에서 지원할 수 있는 범위)
export interface ExploreCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  endpoint: string  // 백엔드 API 엔드포인트
}

// ✅ 백엔드 지원 가능한 필터
export interface ExploreFilters {
  sort?: 'latest' | 'popular' | 'random'  // 백엔드에서 정렬
  cursor?: string                         // 페이지네이션 커서
  limit?: number                          // 페이지 크기
  excludeMyPosts?: boolean               // 내 게시물 제외
}

// ✅ 사용자 프로필 (백엔드 UserInfoResponse 기반)
export interface UserProfile {
  id: string
  username: string
  email: string
  avatar?: string
  bio?: string
  feedsCount: number
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isMe: boolean
}

// ============================================================================
// API 설정
// ============================================================================

const API_BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  return url.replace(/\/$/, '')
})()

const API_ENDPOINTS = {
  explore: '/feeds/explore',        // 전체 탐색 피드
  popular: '/feeds/popular',        // 인기 피드 (백엔드 구현 필요)
  recent: '/feeds/recent',          // 최신 피드 (백엔드 구현 필요)  
  userFeeds: '/feeds/user',         // 특정 사용자 피드
  users: '/users',                  // 사용자 정보
  search: '/feeds/search',          // 피드 검색 (백엔드 구현 필요)
} as const

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// ✅ nextCursor 변환 유틸리티 (타입 안전성 보장)
const convertCursorToString = (cursor: number | string | null | undefined): string | undefined => {
  if (cursor === null || cursor === undefined) {
    return undefined
  }
  return cursor.toString()
}

// ✅ 백엔드 데이터 변환 함수들
const transformBackendFeedToExploreFeed = async (
  backendFeed: BackendFeedItem,
  source: ExploreFeed['source'] = 'explore'
): Promise<ExploreFeed> => {
  try {
    // 기본 피드 정보 조회 (캐시된 사용자 정보 포함)
    const feedResult = await getFeed(backendFeed.feedId.toString())
    
    if (!feedResult.success || !feedResult.data) {
      throw new Error('피드 정보를 가져올 수 없습니다.')
    }

    const exploreFeed: ExploreFeed = {
      ...feedResult.data,
      source,
      discoverScore: calculateDiscoverScore(feedResult.data, source)
    }

    return exploreFeed
  } catch (error) {
    console.error('Failed to transform backend feed:', error)
    // 기본값으로 변환
    return {
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
      
      // UserFeed 필수 속성들
      userId: backendFeed.userId.toString(),
      name: `Feed ${backendFeed.feedId}`,
      description: '',
      isPublic: true,
      backgroundColor: '#ffffff',
      totalHeight: 1600,
      followersCount: 0,
      
      // CanvasFeedItem 필수 속성들
      elements: [],
      
      // ExploreFeed 속성들
      source,
      discoverScore: 50
    }
  }
}

// ✅ 백엔드 UserInfoResponse를 UserProfile로 변환
const transformBackendUserToProfile = (
  backendUser: BackendUserInfoResponse,
  userId: string,
  currentUserId?: string
): UserProfile => {
  return {
    id: userId,
    username: backendUser.userName,
    email: backendUser.userEmail,
    avatar: backendUser.userProfileImage || undefined,
    bio: '',
    feedsCount: 0,        // 별도 API로 조회 필요
    followersCount: 0,    // 별도 API로 조회 필요
    followingCount: 0,    // 별도 API로 조회 필요
    isFollowing: false,   // 별도 API로 조회 필요
    isMe: userId === currentUserId
  }
}

// ============================================================================
// 점수 계산 함수들
// ============================================================================

const calculateDiscoverScore = (
  feed: CanvasFeedItem, 
  source: ExploreFeed['source']
): number => {
  const likes = feed.likesCount || 0
  const ageInHours = (Date.now() - new Date(feed.createdAt).getTime()) / (1000 * 60 * 60)
  
  let score = 0
  
  switch (source) {
    case 'popular':
      // 좋아요 수 중심
      score = Math.min(100, likes * 5)
      break
    case 'recent':
      // 최신성 중심
      if (ageInHours < 1) score = 100
      else if (ageInHours < 6) score = 80
      else if (ageInHours < 24) score = 60
      else score = 30
      break
    case 'explore':
      // 좋아요와 최신성 혼합
      const popularityScore = Math.min(50, likes * 2)
      const recencyScore = ageInHours < 24 ? 50 - (ageInHours * 2) : 10
      score = popularityScore + recencyScore
      break
    default:
      score = 50
  }
  
  return Math.max(0, Math.min(100, score))
}

// ============================================================================
// 탐색 카테고리 정의
// ============================================================================

// ✅ 백엔드에서 실제 지원 가능한 카테고리들
export const getExploreCategories = (): ExploreCategory[] => {
  return [
    {
      id: 'recent',
      name: '최신',
      description: '방금 올라온 따끈한 피드들',
      icon: '🆕',
      color: 'bg-blue-500',
      endpoint: API_ENDPOINTS.recent
    },
    {
      id: 'popular',
      name: '인기',
      description: '가장 많은 사랑을 받은 피드들',
      icon: '🔥',
      color: 'bg-red-500',
      endpoint: API_ENDPOINTS.popular
    },
    {
      id: 'explore',
      name: '탐색',
      description: '새로운 발견의 재미',
      icon: '🔍',
      color: 'bg-purple-500',
      endpoint: API_ENDPOINTS.explore
    },
    {
      id: 'random',
      name: '랜덤',
      description: '예상치 못한 놀라운 피드들',
      icon: '🎲',
      color: 'bg-gray-500',
      endpoint: API_ENDPOINTS.explore + '?sort=random'
    }
  ]
}

// ============================================================================
// 메인 API 함수들
// ============================================================================

// ✅ 탐색 피드 목록 조회 (nextCursor 타입 오류 수정)
export const getExploreFeeds = async (
  category: string = 'explore',
  cursor?: string,
  limit: number = 20,
  filters: ExploreFilters = {}
): Promise<{
  success: boolean
  data?: {
    feeds: ExploreFeed[]
    hasMore: boolean
    nextCursor?: string
    total?: number
  }
  error?: string
}> => {
  try {
    const categoryConfig = getExploreCategories().find(c => c.id === category)
    const endpoint = categoryConfig?.endpoint || API_ENDPOINTS.explore
    
    // 쿼리 파라미터 구성
    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())
    if (filters.sort) params.append('sort', filters.sort)
    if (filters.excludeMyPosts) params.append('excludeMyPosts', 'true')
    
    const url = `${endpoint}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendFeedListResponse> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '탐색 피드를 불러오는데 실패했습니다.'
      }
    }
    
    // 백엔드 데이터를 ExploreFeed로 변환
    const exploreFeeds: ExploreFeed[] = []
    for (const backendFeed of result.data.items) {
      const exploreFeed = await transformBackendFeedToExploreFeed(
        backendFeed, 
        category as ExploreFeed['source']
      )
      exploreFeeds.push(exploreFeed)
    }
    
    // 점수에 따라 정렬 (백엔드에서 정렬하지 않는 경우)
    if (!filters.sort || filters.sort === 'popular') {
      exploreFeeds.sort((a, b) => (b.discoverScore || 0) - (a.discoverScore || 0))
    }
    
    return {
      success: true,
      data: {
        feeds: exploreFeeds,
        hasMore: result.data.hasNext,
        nextCursor: convertCursorToString(result.data.nextCursor), // 🔥 타입 안전 변환
        total: exploreFeeds.length
      }
    }
  } catch (error) {
    console.error('Failed to get explore feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 특정 사용자의 피드 목록 조회 (nextCursor 타입 오류 수정)
export const getUserFeeds = async (
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<{
  success: boolean
  data?: {
    feeds: ExploreFeed[]
    hasMore: boolean
    nextCursor?: string
    total?: number
  }
  error?: string
}> => {
  try {
    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())
    
    const url = `${API_ENDPOINTS.userFeeds}/${userId}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendFeedListResponse> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '사용자 피드를 불러오는데 실패했습니다.'
      }
    }
    
    // 백엔드 데이터를 ExploreFeed로 변환
    const exploreFeeds: ExploreFeed[] = []
    for (const backendFeed of result.data.items) {
      const exploreFeed = await transformBackendFeedToExploreFeed(
        backendFeed,
        'explore'
      )
      exploreFeeds.push(exploreFeed)
    }
    
    return {
      success: true,
      data: {
        feeds: exploreFeeds,
        hasMore: result.data.hasNext,
        nextCursor: convertCursorToString(result.data.nextCursor), // 🔥 타입 안전 변환
        total: exploreFeeds.length
      }
    }
  } catch (error) {
    console.error('Failed to get user feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 피드 검색 (nextCursor 타입 오류 수정)
export const searchFeeds = async (
  query: string,
  cursor?: string,
  limit: number = 20
): Promise<{
  success: boolean
  data?: {
    feeds: ExploreFeed[]
    users: UserProfile[]
    hasMore: boolean
    nextCursor?: string
  }
  error?: string
}> => {
  try {
    const params = new URLSearchParams()
    params.append('q', query)
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())
    
    const url = `${API_ENDPOINTS.search}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<{
      feeds: BackendFeedItem[]
      users: { userId: number, userInfo: BackendUserInfoResponse }[]
      hasMore: boolean
      nextCursor?: number
    }> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '검색에 실패했습니다.'
      }
    }
    
    // 피드 변환
    const exploreFeeds: ExploreFeed[] = []
    for (const backendFeed of result.data.feeds) {
      const exploreFeed = await transformBackendFeedToExploreFeed(
        backendFeed,
        'explore'
      )
      exploreFeeds.push(exploreFeed)
    }
    
    // 사용자 변환
    const currentUser = await getCurrentUser()
    const users: UserProfile[] = result.data.users.map(({ userId, userInfo }) =>
      transformBackendUserToProfile(userInfo, userId.toString(), currentUser?.id)
    )
    
    return {
      success: true,
      data: {
        feeds: exploreFeeds,
        users,
        hasMore: result.data.hasMore,
        nextCursor: convertCursorToString(result.data.nextCursor) // 🔥 타입 안전 변환
      }
    }
  } catch (error) {
    console.error('Failed to search feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 추천 사용자 목록 조회 (백엔드 구현 필요)
export const getRecommendedUsers = async (
  limit: number = 10
): Promise<{
  success: boolean
  data?: UserProfile[]
  error?: string
}> => {
  try {
    const url = `${API_ENDPOINTS.users}/recommended?limit=${limit}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<{ userId: number, userInfo: BackendUserInfoResponse }[]> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '추천 사용자를 불러오는데 실패했습니다.'
      }
    }
    
    const currentUser = await getCurrentUser()
    const users: UserProfile[] = result.data.map(({ userId, userInfo }) =>
      transformBackendUserToProfile(userInfo, userId.toString(), currentUser?.id)
    )
    
    return {
      success: true,
      data: users
    }
  } catch (error) {
    console.error('Failed to get recommended users:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 관련 피드 조회
export const getRelatedFeeds = async (
  feedId: string,
  limit: number = 10
): Promise<{
  success: boolean
  data?: ExploreFeed[]
  error?: string
}> => {
  try {
    const url = `${API_ENDPOINTS.explore}/${feedId}/related?limit=${limit}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendFeedItem[]> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '관련 피드를 불러오는데 실패했습니다.'
      }
    }
    
    const exploreFeeds: ExploreFeed[] = []
    for (const backendFeed of result.data) {
      const exploreFeed = await transformBackendFeedToExploreFeed(
        backendFeed,
        'explore'
      )
      exploreFeeds.push(exploreFeed)
    }
    
    return {
      success: true,
      data: exploreFeeds
    }
  } catch (error) {
    console.error('Failed to get related feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 탐색 통계 조회 (백엔드 구현 필요)
export const getExploreStats = async (): Promise<{
  success: boolean
  data?: {
    totalFeeds: number
    totalUsers: number
    todayFeeds: number
    popularFeeds: number
  }
  error?: string
}> => {
  try {
    const url = `${API_ENDPOINTS.explore}/stats`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<{
      totalFeeds: number
      totalUsers: number
      todayFeeds: number
      popularFeeds: number
    }> = await response.json()
    
    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '통계를 불러오는데 실패했습니다.'
      }
    }
    
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('Failed to get explore stats:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 피드 상호작용 함수들 (기존 feed.ts 재사용)
// ============================================================================

// ✅ 탐색 피드 좋아요 토글
export const toggleExploreFeedLike = async (
  feedId: string
): Promise<{
  success: boolean
  data?: { isLiked: boolean; likesCount: number }
  error?: string
}> => {
  try {
    // ExploreFeed의 id는 실제 feedId와 동일하므로 그대로 사용
    const result = await getFeed(feedId)
    
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
    console.error('Failed to toggle explore feed like:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 호환성을 위한 레거시 함수들 (간소화)
// ============================================================================

// ✅ 카테고리별 미리보기 (메인 함수 재사용)
export const getCategoryPreview = async (
  categoryId: string,
  limit: number = 6
): Promise<ExploreFeed[]> => {
  try {
    const result = await getExploreFeeds(categoryId, undefined, limit)
    return result.data?.feeds || []
  } catch (error) {
    console.error('Failed to get category preview:', error)
    return []
  }
}

// ✅ 해시태그 자동완성 제거 (해시태그 기능 없음)
export const getHashtagSuggestions = async (
  query: string,
  limit: number = 10
): Promise<string[]> => {
  console.warn('해시태그 기능이 제거되었습니다.')
  return []
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

export const isExploreFeed = (item: any): item is ExploreFeed => {
  return item && typeof item === 'object' && 'source' in item && 'discoverScore' in item
}

export const getExploreApiEndpoint = (categoryId: string): string => {
  const category = getExploreCategories().find(c => c.id === categoryId)
  return category?.endpoint || API_ENDPOINTS.explore
}
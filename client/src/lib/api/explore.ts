// src/lib/api/explore.ts

import { 
  CanvasFeedItem,
  BackendFeedDetailResponse,
  BackendUserInfoResponse,
  BackendApiResponse,
  BackendFollowCountsResponse
} from '@/lib/types/feed'

import {
  getUserFeeds,
  getFollowingFeeds,
  getRandomFeeds,
  getFeed,
  toggleFeedLike,
  checkFollowStatus,  // ✅ checkLikeStatus → checkFollowStatus
  getCurrentUser,
  handleApiError,
  fetchWithAuth
} from './feed'

// ============================================================================
// 백엔드 연동 타입들 (실제 백엔드 API 기반)
// ============================================================================

// ✅ 백엔드 기반 탐색 피드 (CanvasFeedItem 확장)
export interface ExploreFeed extends Omit<CanvasFeedItem, 'source'> {
  category?: string
  discoverScore?: number // 클라이언트에서 계산
  source: 'following' | 'user' | 'random'  // ✅ 실제 백엔드 API에 맞춤
}

// ✅ 탐색 카테고리 (실제 백엔드 엔드포인트 기반)
export interface ExploreCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  endpoint: string  // 실제 백엔드 API 엔드포인트
}

// ✅ 백엔드 지원 가능한 필터
export interface ExploreFilters {
  userId?: number                        // 특정 사용자 피드
  cursorCreatedAt?: string              // 커서 페이징
  cursorId?: number                     // 커서 페이징
  size?: number                         // 페이지 크기
  excludeMyPosts?: boolean             // 내 게시물 제외 (프론트에서 처리)
}

// ✅ 사용자 프로필 (백엔드 UserInfoResponse 기반)
export interface UserProfile {
  id: string
  username: string
  email: string
  avatar?: string
  prettyFace?: string
  bio?: string
  feedsCount: number
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isMe: boolean
}

// ============================================================================
// API 설정 (실제 백엔드 엔드포인트)
// ============================================================================

const API_BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  return url.replace(/\/$/, '')
})()

const API_ENDPOINTS = {
  following: '/feeds/following',    // ✅ 팔로잉 피드
  random: '/feeds/random',          // ✅ 랜덤 피드  
  userFeeds: '/feeds/users',        // ✅ 특정 사용자 피드
  feeds: '/feeds',                  // ✅ 피드 관련
  follows: '/follows',              // ✅ 팔로우 관련
} as const

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// ✅ 백엔드 CanvasFeedItem을 ExploreFeed로 변환
const transformCanvasFeedToExploreFeed = (
  canvasFeed: CanvasFeedItem,
  source: ExploreFeed['source'],
  category?: string
): ExploreFeed => {
  return {
    ...canvasFeed,
    source,
    category,
    discoverScore: calculateDiscoverScore(canvasFeed, source)
  }
}

// ✅ 백엔드 UserInfoResponse를 UserProfile로 변환
const transformBackendUserToProfile = async (
  backendUser: BackendUserInfoResponse,
  userId: string,
  currentUserId?: string
): Promise<UserProfile> => {
  try {
    // 팔로우 관계 확인 (자기 자신은 제외)
    const isFollowing = currentUserId && currentUserId !== userId 
      ? await checkFollowStatus(Number(userId)) 
      : false

    // 팔로우 수 조회
    let followCounts: BackendFollowCountsResponse | null = null
    try {
      const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/count/${userId}`)
      const result: BackendApiResponse<BackendFollowCountsResponse> = await response.json()
      if (!result.error && result.data) {
        followCounts = result.data
      }
    } catch (error) {
      console.warn('Failed to get follow counts:', error)
    }

    return {
      id: userId,
      username: backendUser.userName,
      email: backendUser.userEmail,
      avatar: backendUser.profileImage || undefined,
      prettyFace: backendUser.prettyFace || undefined,
      bio: '', // 백엔드에서 bio 필드 추가 필요
      feedsCount: 0, // 별도 API로 조회 필요
      followersCount: followCounts?.followerCount || 0,
      followingCount: followCounts?.followingCount || 0,
      isFollowing,
      isMe: userId === currentUserId
    }
  } catch (error) {
    console.error('Failed to transform user profile:', error)
    return {
      id: userId,
      username: backendUser.userName,
      email: backendUser.userEmail,
      avatar: backendUser.profileImage || undefined,
      prettyFace: backendUser.prettyFace || undefined,
      bio: '',
      feedsCount: 0,
      followersCount: 0,
      followingCount: 0,
      isFollowing: false,
      isMe: userId === currentUserId
    }
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
    case 'following':
      // 팔로잉 피드는 시간순으로만
      if (ageInHours < 1) score = 100
      else if (ageInHours < 6) score = 80
      else if (ageInHours < 24) score = 60
      else score = 30
      break
    case 'user':
      // 사용자 피드는 좋아요 수 중심
      score = Math.min(100, likes * 5)
      break
    case 'random':
      // 랜덤은 고정 점수
      score = 50
      break
    default:
      score = 50
  }
  
  return Math.max(0, Math.min(100, score))
}

// ============================================================================
// 탐색 카테고리 정의 (실제 백엔드 엔드포인트 기반)
// ============================================================================

export const getExploreCategories = (): ExploreCategory[] => {
  return [
    {
      id: 'following',
      name: '팔로잉',
      description: '팔로우한 사용자들의 피드',
      icon: '👥',
      color: 'bg-blue-500',
      endpoint: API_ENDPOINTS.following
    },
    {
      id: 'random',
      name: '랜덤',
      description: '예상치 못한 놀라운 피드들',
      icon: '🎲',
      color: 'bg-purple-500',
      endpoint: API_ENDPOINTS.random
    }
  ]
}

// ============================================================================
// 메인 API 함수들 (실제 백엔드 엔드포인트 기반)
// ============================================================================

// ✅ 탐색 피드 목록 조회 (실제 백엔드 API 사용)
export const getExploreFeeds = async (
  category: string = 'random',
  cursor?: string,
  limit: number = 20,
  filters: ExploreFilters = {}
): Promise<{
  success: boolean
  data?: {
    feeds: ExploreFeed[]
    hasMore: boolean
    nextCursor?: {
      createdAt: string
      feedId: number
    } | null
    total?: number
  }
  error?: string
}> => {
  try {
    let result
    
    switch (category) {
      case 'following':
        result = await getFollowingFeeds(
          filters.cursorCreatedAt,
          filters.cursorId,
          filters.size || limit
        )
        break
      case 'random':
        result = await getRandomFeeds(filters.size || limit)
        break
      case 'user':
        if (!filters.userId) {
          return {
            success: false,
            error: '사용자 피드 조회에는 userId가 필요합니다.'
          }
        }
        result = await getUserFeeds(
          filters.userId,
          filters.cursorCreatedAt,
          filters.cursorId,
          filters.size || limit
        )
        break
      default:
        // 기본값으로 랜덤 피드 조회
        result = await getRandomFeeds(filters.size || limit)
    }
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || '탐색 피드를 불러오는데 실패했습니다.'
      }
    }
    
    // CanvasFeedItem을 ExploreFeed로 변환
    const exploreFeeds: ExploreFeed[] = result.data.items.map(feed =>
      transformCanvasFeedToExploreFeed(feed, category as ExploreFeed['source'])
    )
    
    // 내 게시물 제외 필터링 (프론트엔드에서 처리)
    let filteredFeeds = exploreFeeds
    if (filters.excludeMyPosts) {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          filteredFeeds = exploreFeeds.filter(feed => feed.userId !== currentUser.id)
        }
      } catch (error) {
        console.warn('Failed to filter my posts:', error)
      }
    }
    
    // 점수에 따라 정렬
    filteredFeeds.sort((a, b) => (b.discoverScore || 0) - (a.discoverScore || 0))
    
    // nextCursor 안전 처리
    const nextCursor = (result.data as any).nextCursor || null
    
    return {
      success: true,
      data: {
        feeds: filteredFeeds,
        hasMore: result.data.hasMore,
        nextCursor,
        total: filteredFeeds.length
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

// ✅ 특정 사용자의 피드 목록 조회 (실제 백엔드 API 사용)
export const getExploreUserFeeds = async (
  userId: string,
  cursorCreatedAt?: string,
  cursorId?: number,
  limit: number = 20
): Promise<{
  success: boolean
  data?: {
    feeds: ExploreFeed[]
    hasMore: boolean
    nextCursor?: {
      createdAt: string
      feedId: number
    } | null
    total?: number
  }
  error?: string
}> => {
  try {
    const result = await getUserFeeds(
      Number(userId),
      cursorCreatedAt,
      cursorId,
      limit
    )
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || '사용자 피드를 불러오는데 실패했습니다.'
      }
    }
    
    // CanvasFeedItem을 ExploreFeed로 변환
    const exploreFeeds: ExploreFeed[] = result.data.items.map(feed =>
      transformCanvasFeedToExploreFeed(feed, 'user')
    )
    
    // nextCursor 안전 처리
    const nextCursor = (result.data as any).nextCursor || null
    
    return {
      success: true,
      data: {
        feeds: exploreFeeds,
        hasMore: result.data.hasMore,
        nextCursor,
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

// ============================================================================
// 피드 상호작용 함수들 (기존 feed.ts 재사용)
// ============================================================================

// ✅ 탐색 피드 좋아요 토글
export const toggleExploreFeedLike = async (
  feedId: string
): Promise<{
  success: boolean
  data?: { isLiked: boolean; likesCount?: number }
  error?: string
}> => {
  try {
    const result = await getFeed(feedId)
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }
    
    // photoId를 사용해서 좋아요 토글
    const likeResult = await toggleFeedLike(Number(result.data.photoId))
    
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
// 피드 검색 기능 (구현됨)
// ============================================================================

// ✅ 피드 검색 (사용자명 기반)
export const searchFeeds = async (
  query: string,
  cursorCreatedAt?: string,
  cursorId?: number,
  limit: number = 20
): Promise<{
  success: boolean
  data?: {
    feeds: ExploreFeed[]
    hasMore: boolean
    nextCursor?: {
      createdAt: string
      feedId: number
    } | null
  }
  error?: string
}> => {
  try {
    if (!query?.trim()) {
      return {
        success: true,
        data: {
          feeds: [],
          hasMore: false,
          nextCursor: null
        }
      }
    }

    const params = new URLSearchParams()
    params.append('query', query.trim())
    if (cursorCreatedAt) params.append('cursorCreatedAt', cursorCreatedAt)
    if (cursorId) params.append('cursorId', cursorId.toString())
    params.append('size', limit.toString())
    
    const url = `${API_ENDPOINTS.feeds}/search?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendFeedDetailResponse[]> = await response.json()
    
    if (result.error || !Array.isArray(result.data)) {
      return {
        success: false,
        error: result.message || '검색에 실패했습니다.'
      }
    }
    
    // BackendFeedDetailResponse를 ExploreFeed로 변환
    const exploreFeeds: ExploreFeed[] = []
    for (const backendFeed of result.data) {
      // CanvasFeedItem으로 먼저 변환
      const canvasFeed: CanvasFeedItem = {
        id: backendFeed.feedId.toString(),
        userId: backendFeed.authorId.toString(),
        userName: backendFeed.accountName,
        name: backendFeed.caption || `Feed ${backendFeed.feedId}`,
        description: backendFeed.caption || '',
        isPublic: true,
        backgroundColor: '#ffffff',
        backgroundImageUrl: backendFeed.imgUrl,
        totalHeight: 1600,
        followersCount: 0,
        isFollowing: false,
        isLiked: backendFeed.liked,
        likesCount: 0,
        authorName: backendFeed.accountName,
        authorId: backendFeed.authorId.toString(),
        authorAvatar: backendFeed.profileImage,
        elements: [],
        createdAt: backendFeed.createdAt,
        updatedAt: backendFeed.createdAt,
        photoId: backendFeed.feedId,
        photoUrl: backendFeed.imgUrl,
      }
      
      // ExploreFeed로 변환
      const exploreFeed = transformCanvasFeedToExploreFeed(canvasFeed, 'user', 'search')
      exploreFeeds.push(exploreFeed)
    }
    
    // 다음 커서 계산
    const hasMore = result.data.length === limit
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
        feeds: exploreFeeds,
        hasMore,
        nextCursor
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
// ============================================================================
// 유틸리티 함수들
// ============================================================================

export const isExploreFeed = (item: any): item is ExploreFeed => {
  return item && typeof item === 'object' && 'source' in item && 'discoverScore' in item
}

export const getExploreApiEndpoint = (categoryId: string): string => {
  const category = getExploreCategories().find(c => c.id === categoryId)
  return category?.endpoint || API_ENDPOINTS.random
}

// ✅ 커서 변환 유틸리티
export const createCursorString = (createdAt: string, feedId: number): string => {
  return `${createdAt}|${feedId}`
}

export const parseCursorString = (cursor: string): { createdAt: string; feedId: number } | null => {
  try {
    const [createdAt, feedIdStr] = cursor.split('|')
    const feedId = parseInt(feedIdStr)
    if (!createdAt || isNaN(feedId)) return null
    return { createdAt, feedId }
  } catch {
    return null
  }
}
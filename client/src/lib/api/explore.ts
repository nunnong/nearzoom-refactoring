// src/lib/api/explore.ts - 최종 axios 버전

import api from '@/lib/axios' // 🔥 기존 axios 인스턴스 사용 (인터셉터 포함)
import { useAuthStore } from '@/stores/authStore'
import {
  CanvasFeedItem,
  BackendFeedDetailResponse,
  ApiResponse,
} from '@/lib/types/feed'

// ============================================================================
// 🔥 타입 정의들 (기존과 동일)
// ============================================================================

export interface ExploreFeed extends Omit<CanvasFeedItem, 'source'> {
  category?: string
  discoverScore?: number
  source: 'following' | 'user' | 'random'
}

export interface ExploreFilters {
  userId?: number
  cursorCreatedAt?: string
  cursorId?: number
  size?: number
  excludeMyPosts?: boolean
}

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

export interface SmartSearchResult {
  users: UserProfile[]
  exactMatch?: UserProfile
  hasMore: boolean
  nextCursor?: string
  total: number
}

// ============================================================================
// 🔥 API 엔드포인트 (기존과 동일)
// ============================================================================

const API_ENDPOINTS = {
  following: '/feeds/following',
  random: '/feeds/random',
  userFeeds: '/feeds/users',
  feeds: '/feeds',
  follows: '/follows',
  feedSearch: '/feeds/search',
} as const

// ============================================================================
// 🔥 유틸리티 함수들
// ============================================================================

// 인증 상태 체크
const checkAuthState = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const authState = useAuthStore.getState()
  const isAuthenticated = authState.isAuthenticated && !!authState.accessToken
  
  console.log('인증 상태 체크:', {
    isAuthenticated: authState.isAuthenticated,
    hasToken: !!authState.accessToken,
    result: isAuthenticated
  })
  
  return isAuthenticated
}

// 에러 처리 함수
const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as any).message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return '알 수 없는 오류가 발생했습니다.'
}

// ============================================================================
// 🔥 변환 함수들 (기존과 동일)
// ============================================================================

const transformBackendFeedToExploreFeed = (
  backendFeed: BackendFeedDetailResponse,
  source: ExploreFeed['source'] = 'random',
  category?: string
): ExploreFeed => {
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
    authorId: backendFeed.accountName,
    authorAvatar: backendFeed.profileImage,
    elements: [],
    createdAt: backendFeed.createdAt,
    updatedAt: backendFeed.createdAt,
    photoId: backendFeed.feedId,
    photoUrl: backendFeed.imgUrl,
  }

  return {
    ...canvasFeed,
    source,
    category,
    discoverScore: calculateDiscoverScore(canvasFeed, source),
  }
}

const transformCanvasFeedToExploreFeed = (
  canvasFeed: CanvasFeedItem,
  source: ExploreFeed['source'],
  category?: string
): ExploreFeed => {
  return {
    ...canvasFeed,
    source,
    category,
    discoverScore: calculateDiscoverScore(canvasFeed, source),
  }
}

const transformBackendFeedToCanvasFeed = (
  backendFeed: BackendFeedDetailResponse
): CanvasFeedItem => {
  return {
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
    authorId: backendFeed.accountName,
    authorAvatar: backendFeed.profileImage,
    elements: [],
    createdAt: backendFeed.createdAt,
    updatedAt: backendFeed.createdAt,
    photoId: backendFeed.feedId,
    photoUrl: backendFeed.imgUrl,
  }
}

const calculateDiscoverScore = (
  feed: CanvasFeedItem,
  source: ExploreFeed['source']
): number => {
  const likes = feed.likesCount || 0
  const ageInHours =
    (Date.now() - new Date(feed.createdAt).getTime()) / (1000 * 60 * 60)

  let score = 0

  switch (source) {
    case 'following':
      if (ageInHours < 1) score = 100
      else if (ageInHours < 6) score = 80
      else if (ageInHours < 24) score = 60
      else score = 30
      break
    case 'user':
      score = Math.min(100, likes * 5)
      break
    case 'random':
      score = 50
      break
    default:
      score = 50
  }

  return Math.max(0, Math.min(100, score))
}

// ============================================================================
// 🔥 axios 기반 API 함수들
// ============================================================================

// ✅ 랜덤 피드 조회 (axios 사용)
export const getRandomFeeds = async (
  size: number = 20
): Promise<{
  success: boolean
  data?: { items: CanvasFeedItem[]; hasMore: boolean }
  error?: string
}> => {
  try {
    if (!checkAuthState()) {
      return {
        success: false,
        error: '로그인이 필요합니다.',
      }
    }

    console.log('랜덤 피드 조회 시작 (axios)...', { size })

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      API_ENDPOINTS.random,
      { params: { size } }
    )

    console.log('랜덤 피드 응답:', response.data)

    if (response.data.error || !Array.isArray(response.data.data)) {
      return {
        success: false,
        error: response.data.message || '랜덤 피드를 불러오는데 실패했습니다.',
      }
    }

    const items: CanvasFeedItem[] = response.data.data.map(transformBackendFeedToCanvasFeed)

    return {
      success: true,
      data: {
        items,
        hasMore: false,
      },
    }
  } catch (error) {
    console.error('Failed to get random feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ✅ 팔로잉 피드 조회 (axios 사용)
export const getFollowingFeeds = async (
  cursorCreatedAt?: string,
  cursorId?: number,
  size: number = 20
): Promise<{
  success: boolean
  data?: { items: CanvasFeedItem[]; hasMore: boolean; nextCursor?: any }
  error?: string
}> => {
  try {
    if (!checkAuthState()) {
      return {
        success: false,
        error: '로그인이 필요합니다.',
      }
    }

    console.log('팔로잉 피드 조회 시작 (axios)...', { cursorCreatedAt, cursorId, size })

    const params: any = { size }
    if (cursorCreatedAt) params.cursorCreatedAt = cursorCreatedAt
    if (cursorId) params.cursorId = cursorId

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      API_ENDPOINTS.following,
      { params }
    )

    console.log('팔로잉 피드 응답:', response.data)

    if (response.data.error || !Array.isArray(response.data.data)) {
      return {
        success: false,
        error: response.data.message || '팔로잉 피드를 불러오는데 실패했습니다.',
      }
    }

    const items: CanvasFeedItem[] = response.data.data.map(feed => 
      transformBackendFeedToCanvasFeed(feed)
    )

    const hasMore = response.data.data.length === size
    let nextCursor = null
    if (hasMore && response.data.data.length > 0) {
      const lastFeed = response.data.data[response.data.data.length - 1]
      nextCursor = {
        createdAt: lastFeed.createdAt,
        feedId: lastFeed.feedId,
      }
    }

    return {
      success: true,
      data: {
        items,
        hasMore,
        nextCursor,
      },
    }
  } catch (error) {
    console.error('Failed to get following feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ✅ 사용자 검색 (axios 사용)
export const searchUsers = async (
  query: string,
  cursor?: string,
  limit: number = 20
): Promise<{
  success: boolean
  data?: SmartSearchResult
  error?: string
}> => {
  try {
    if (!checkAuthState()) {
      return {
        success: false,
        error: '로그인이 필요합니다.',
      }
    }

    if (!query?.trim()) {
      return {
        success: true,
        data: {
          users: [],
          hasMore: false,
          total: 0,
        },
      }
    }

    console.log('사용자 검색 시작 (axios):', query)

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      API_ENDPOINTS.feedSearch,
      { 
        params: { 
          query: query.trim(), 
          size: limit 
        } 
      }
    )

    console.log('사용자 검색 응답:', response.data)

    if (response.data.error || !Array.isArray(response.data.data)) {
      return {
        success: false,
        error: response.data.message || '검색에 실패했습니다.',
      }
    }

    // BackendFeedDetailResponse[]를 UserProfile[]로 변환
    const users: UserProfile[] = []

    for (const backendFeed of response.data.data) {
      const existingUser = users.find(
        u => u.username === backendFeed.accountName
      )
      if (!existingUser) {
        const userProfile: UserProfile = {
          id: backendFeed.accountName,
          username: backendFeed.accountName,
          email: '',
          avatar: backendFeed.profileImage,
          prettyFace: undefined,
          bio: backendFeed.caption,
          feedsCount: 1,
          followersCount: 0,
          followingCount: 0,
          isFollowing: false,
          isMe: false,
        }
        users.push(userProfile)
      }
    }

    // 정확 매칭 + 관련도 정렬
    const trimmedQuery = query.trim()
    const exactMatch = users.find(
      user => user.username.toLowerCase() === trimmedQuery.toLowerCase()
    )

    const sortedUsers = [...users].sort((a, b) => {
      if (a.username.toLowerCase() === trimmedQuery.toLowerCase()) return -1
      if (b.username.toLowerCase() === trimmedQuery.toLowerCase()) return 1
      
      const aStarts = a.username.toLowerCase().startsWith(trimmedQuery.toLowerCase())
      const bStarts = b.username.toLowerCase().startsWith(trimmedQuery.toLowerCase())
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      
      return a.username.localeCompare(b.username)
    })

    return {
      success: true,
      data: {
        users: sortedUsers,
        exactMatch,
        hasMore: false,
        total: sortedUsers.length,
      },
    }
  } catch (error) {
    console.error('Failed to search users:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ✅ 메인 탐색 피드 함수 (axios 사용)
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
    nextCursor?: any
    total?: number
  }
  error?: string
}> => {
  try {
    if (!checkAuthState()) {
      return {
        success: false,
        error: '로그인이 필요합니다.',
      }
    }

    console.log('탐색 피드 조회 시작 (axios):', category)

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
      default:
        result = await getRandomFeeds(filters.size || limit)
    }

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || '탐색 피드를 불러오는데 실패했습니다.',
      }
    }

    // CanvasFeedItem을 ExploreFeed로 변환
    const exploreFeeds: ExploreFeed[] = result.data.items.map(feed =>
      transformCanvasFeedToExploreFeed(feed, category as ExploreFeed['source'])
    )

    // 점수에 따라 정렬
    exploreFeeds.sort(
      (a, b) => (b.discoverScore || 0) - (a.discoverScore || 0)
    )

    const nextCursor = (result.data as any).nextCursor || null

    return {
      success: true,
      data: {
        feeds: exploreFeeds,
        hasMore: result.data.hasMore,
        nextCursor,
        total: exploreFeeds.length,
      },
    }
  } catch (error) {
    console.error('Failed to get explore feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}
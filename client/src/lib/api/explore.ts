// src/lib/api/explore.ts
import { useAuthStore } from '@/stores/authStore'
import {
  CanvasFeedItem,
  BackendFeedDetailResponse,
  BackendUserInfoResponse,
  BackendApiResponse,  // 🔥 수정: BackendApiResponse 사용 (타입 통일)
  BackendFollowCountsResponse,
} from '@/lib/types/feed'

import {
  getUserFeeds,
  getFollowingFeeds,
  getRandomFeeds,
  getFeed,
  toggleFeedLike,
  checkFollowStatus,
  getCurrentUser,
  handleApiError,
  fetchWithAuth,
} from './feed'

// ============================================================================
// 🔥 새로운 타입 정의 (백엔드 UserProfileResponse에 대응)
// ============================================================================

// ✅ 백엔드 UserProfileResponse (accountName 포함)
export interface BackendUserProfileResponse {
  userId: number
  accountName: string
  userName: string
  userEmail: string
  userProfileImage: string
  faceImageUrl: string
}

// ============================================================================
// 백엔드 연동 타입들 (실제 백엔드 API 기반)
// ============================================================================

// ✅ 백엔드 기반 탐색 피드 (CanvasFeedItem 확장)
export interface ExploreFeed extends Omit<CanvasFeedItem, 'source'> {
  category?: string
  discoverScore?: number // 클라이언트에서 계산
  source: 'following' | 'user' | 'random' // ✅ 실제 백엔드 API에 맞춤
}

// ✅ 탐색 카테고리 (실제 백엔드 엔드포인트 기반)
export interface ExploreCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  endpoint: string // 실제 백엔드 API 엔드포인트
}

// ✅ 백엔드 지원 가능한 필터
export interface ExploreFilters {
  userId?: number // 특정 사용자 피드
  cursorCreatedAt?: string // 커서 페이징
  cursorId?: number // 커서 페이징
  size?: number // 페이지 크기
  excludeMyPosts?: boolean // 내 게시물 제외 (프론트에서 처리)
}

// ✅ 사용자 프로필 (백엔드 UserProfileResponse 기반) - accountName 중심으로 수정
export interface UserProfile {
  id: string // accountName 사용
  username: string // accountName
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

// 🔥 새로 추가: 스마트 검색 결과 타입
export interface SmartSearchResult {
  users: UserProfile[]
  exactMatch?: UserProfile  // 정확히 일치하는 결과
  hasMore: boolean
  nextCursor?: string
  total: number
}

// ============================================================================
// API 설정 (실제 백엔드 엔드포인트)
// ============================================================================

const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.nearzoom.store'
    : 'http://localhost:8080';

const API_ENDPOINTS = {
  following: '/feeds/following', // ✅ 팔로잉 피드
  random: '/feeds/random', // ✅ 랜덤 피드
  userFeeds: '/feeds/users', // ✅ 특정 사용자 피드
  feeds: '/feeds', // ✅ 피드 관련
  follows: '/follows', // ✅ 팔로우 관련
  // 🔥 새로 추가된 API 엔드포인트들
  feedSearch: '/feeds/search', // ✅ 피드/사용자 검색
} as const

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// ✅ 백엔드 FeedDetailResponse를 ExploreFeed로 변환 (새 API 응답용)
const transformBackendFeedToExploreFeed = (
  backendFeed: BackendFeedDetailResponse,
  source: ExploreFeed['source'] = 'random',
  category?: string
): ExploreFeed => {
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
    // 🔥 핵심 수정: authorId를 accountName으로 변경
    authorId: backendFeed.accountName, // ← 숫자 ID 대신 accountName 사용
    authorAvatar: backendFeed.profileImage,
    elements: [],
    createdAt: backendFeed.createdAt,
    updatedAt: backendFeed.createdAt,
    photoId: backendFeed.feedId,
    photoUrl: backendFeed.imgUrl,
  }

  // ExploreFeed로 변환
  return {
    ...canvasFeed,
    source,
    category,
    discoverScore: calculateDiscoverScore(canvasFeed, source),
  }
}

// ✅ 백엔드 CanvasFeedItem을 ExploreFeed로 변환 (기존 API용)
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

// ============================================================================
// 점수 계산 함수들
// ============================================================================

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
      endpoint: API_ENDPOINTS.following,
    },
    {
      id: 'random',
      name: '랜덤',
      description: '예상치 못한 놀라운 피드들',
      icon: '🎲',
      color: 'bg-purple-500',
      endpoint: API_ENDPOINTS.random,
    },
  ]
}

// ============================================================================
// 메인 API 함수들 (기존 + 새 API 통합)
// ============================================================================

// ✅ 탐색 피드 목록 조회 (기존 API 그대로 유지)
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
            error: '사용자 피드 조회에는 userId가 필요합니다.',
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
        error: result.error || '탐색 피드를 불러오는데 실패했습니다.',
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
          // 🔥 수정: accountName으로 비교
          filteredFeeds = exploreFeeds.filter(
            feed => feed.authorId !== currentUser.accountName
          )
        }
      } catch (error) {
        console.warn('Failed to filter my posts:', error)
      }
    }

    // 점수에 따라 정렬
    filteredFeeds.sort(
      (a, b) => (b.discoverScore || 0) - (a.discoverScore || 0)
    )

    // nextCursor 안전 처리
    const nextCursor = (result.data as any).nextCursor || null

    return {
      success: true,
      data: {
        feeds: filteredFeeds,
        hasMore: result.data.hasMore,
        nextCursor,
        total: filteredFeeds.length,
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

// 🔥 수정: accountName으로 사용자 피드 조회 (search API 활용)
export const getUserFeedByAccountName = async (
  accountName: string
): Promise<{
  success: boolean
  data?: ExploreFeed
  error?: string
}> => {
  try {
    if (!accountName?.trim()) {
      return {
        success: false,
        error: '유효하지 않은 계정명입니다.',
      }
    }

    // 🔥 수정: search API를 사용해서 정확한 계정명 검색
    const searchResult = await searchUsers(accountName.trim(), undefined, 1)
    
    if (!searchResult.success || !searchResult.data) {
      return {
        success: false,
        error: searchResult.error || '사용자를 찾을 수 없습니다.',
      }
    }

    // 정확히 일치하는 사용자 찾기
    const exactUser = searchResult.data.users.find(
      user => user.username.toLowerCase() === accountName.toLowerCase()
    )

    if (!exactUser) {
      return {
        success: false,
        error: '정확히 일치하는 사용자를 찾을 수 없습니다.',
      }
    }

    // 해당 사용자의 피드 검색
    const feedSearchResult = await searchFeeds(exactUser.username, undefined, undefined, 1)
    
    if (!feedSearchResult.success || !feedSearchResult.data?.feeds.length) {
      return {
        success: false,
        error: '사용자 피드를 찾을 수 없습니다.',
      }
    }

    return {
      success: true,
      data: feedSearchResult.data.feeds[0],
    }
  } catch (error) {
    console.error('Failed to get user feed by account name:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// 🔥 수정: 스마트 사용자 검색 (부분 검색 + 정확 검색)
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

    const trimmedQuery = query.trim()
    
    const params = new URLSearchParams()
    params.append('query', trimmedQuery)
    if (cursor) {
      const parsedCursor = parseCursorString(cursor)
      if (parsedCursor) {
        params.append('cursorCreatedAt', parsedCursor.createdAt)
        params.append('cursorId', parsedCursor.feedId.toString())
      }
    }
    params.append('size', limit.toString())

    const url = `${API_ENDPOINTS.feedSearch}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendFeedDetailResponse[]> = await response.json()

    if (result.error || !Array.isArray(result.data)) {
      return {
        success: false,
        error: result.message || '검색에 실패했습니다.',
      }
    }

    // BackendFeedDetailResponse[]를 UserProfile[]로 변환
    const currentUser = await getCurrentUser()
    const users: UserProfile[] = []

    for (const backendFeed of result.data) {
      // 중복 제거 (같은 accountName)
      const existingUser = users.find(
        u => u.username === backendFeed.accountName
      )
      if (!existingUser) {
        const userProfile: UserProfile = {
          id: backendFeed.accountName, // accountName을 ID로 사용
          username: backendFeed.accountName, // accountName
          email: '', // 검색에서는 이메일 정보 없음
          avatar: backendFeed.profileImage,
          prettyFace: undefined,
          bio: backendFeed.caption,
          feedsCount: 1, // 검색된 피드 1개
          followersCount: 0, // 별도 조회 필요
          followingCount: 0, // 별도 조회 필요
          isFollowing: false, // 별도 조회 필요
          isMe: currentUser?.accountName === backendFeed.accountName,
        }
        users.push(userProfile)
      }
    }

    // 🔥 스마트 검색 로직: 정확 매칭 + 관련도 정렬
    const exactMatch = users.find(
      user => user.username.toLowerCase() === trimmedQuery.toLowerCase()
    )

    // 정확 매칭을 맨 앞으로, 나머지는 관련도 순으로 정렬
    const sortedUsers = [...users].sort((a, b) => {
      // 1. 정확 매칭이 최우선
      if (a.username.toLowerCase() === trimmedQuery.toLowerCase()) return -1
      if (b.username.toLowerCase() === trimmedQuery.toLowerCase()) return 1
      
      // 2. 시작하는 것이 우선
      const aStarts = a.username.toLowerCase().startsWith(trimmedQuery.toLowerCase())
      const bStarts = b.username.toLowerCase().startsWith(trimmedQuery.toLowerCase())
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      
      // 3. 나머지는 알파벳 순
      return a.username.localeCompare(b.username)
    })

    // 다음 커서 계산
    const hasMore = result.data.length === limit
    let nextCursor = null
    if (hasMore && result.data.length > 0) {
      const lastFeed = result.data[result.data.length - 1]
      nextCursor = createCursorString(lastFeed.createdAt, lastFeed.feedId)
    }

    return {
      success: true,
      data: {
        users: sortedUsers,
        exactMatch,
        hasMore,
        nextCursor,
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

// ✅ 기존 피드 검색 함수는 그대로 유지 (ExploreFeed 반환)
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
          nextCursor: null,
        },
      }
    }

    const params = new URLSearchParams()
    params.append('query', query.trim())
    if (cursorCreatedAt) params.append('cursorCreatedAt', cursorCreatedAt)
    if (cursorId) params.append('cursorId', cursorId.toString())
    params.append('size', limit.toString())

    const url = `${API_ENDPOINTS.feedSearch}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendFeedDetailResponse[]> =
      await response.json()

    if (result.error || !Array.isArray(result.data)) {
      return {
        success: false,
        error: result.message || '검색에 실패했습니다.',
      }
    }

    // BackendFeedDetailResponse[]를 ExploreFeed[]로 변환
    const exploreFeeds: ExploreFeed[] = result.data.map(backendFeed =>
      transformBackendFeedToExploreFeed(backendFeed, 'user', 'search')
    )

    // 다음 커서 계산
    const hasMore = result.data.length === limit
    let nextCursor = null
    if (hasMore && result.data.length > 0) {
      const lastFeed = result.data[result.data.length - 1]
      nextCursor = {
        createdAt: lastFeed.createdAt,
        feedId: lastFeed.feedId,
      }
    }

    return {
      success: true,
      data: {
        feeds: exploreFeeds,
        hasMore,
        nextCursor,
      },
    }
  } catch (error) {
    console.error('Failed to search feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ============================================================================
// 기존 함수들 (호환성 유지)
// ============================================================================

// ✅ 특정 사용자의 피드 목록 조회 (기존 API 그대로 유지)
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
        error: result.error || '사용자 피드를 불러오는데 실패했습니다.',
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
        total: exploreFeeds.length,
      },
    }
  } catch (error) {
    console.error('Failed to get user feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
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
        error: '피드를 찾을 수 없습니다.',
      }
    }

    // photoId를 사용해서 좋아요 토글
    const likeResult = await toggleFeedLike(Number(result.data.photoId))

    return likeResult
  } catch (error) {
    console.error('Failed to toggle explore feed like:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

export const isExploreFeed = (item: any): item is ExploreFeed => {
  return (
    item &&
    typeof item === 'object' &&
    'source' in item &&
    'discoverScore' in item
  )
}

export const getExploreApiEndpoint = (categoryId: string): string => {
  const category = getExploreCategories().find(c => c.id === categoryId)
  return category?.endpoint || API_ENDPOINTS.random
}

// ✅ 커서 변환 유틸리티
export const createCursorString = (
  createdAt: string,
  feedId: number
): string => {
  return `${createdAt}|${feedId}`
}

export const parseCursorString = (
  cursor: string
): { createdAt: string; feedId: number } | null => {
  try {
    const [createdAt, feedIdStr] = cursor.split('|')
    const feedId = parseInt(feedIdStr)
    if (!createdAt || isNaN(feedId)) return null
    return { createdAt, feedId }
  } catch {
    return null
  }
}
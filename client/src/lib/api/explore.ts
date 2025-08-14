// src/lib/api/explore.ts - 백엔드 연동 수정 버전

import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import {
  PostResponse,
  PostDetailResponse,
  FeedWithPostsResponse,
  UserProfileResponse,
  ApiResponse,
  API_ENDPOINTS,
  formatTimeAgo,
  formatLikeCount,
} from '@/lib/types/feed'

// ============================================================================
// 🎯 간소화된 타입 정의들 (백엔드 중심)
// ============================================================================

// ✅ 탐색 게시물 (백엔드 PostResponse 기반)
export interface ExplorePost {
  // 백엔드 PostResponse 필드들
  postId: number
  photoId: number
  imgUrl: string
  caption: string | null
  displayOrder: number | null
  createdAt: string
  likeCount: number
  isLikedByMe: boolean
  authorId: number
  authorAccountName: string
  authorProfileImage: string | null
  
  // 탐색 전용 필드들
  source: 'explore' | 'timeline'
  discoverScore?: number
  
  // UI 편의 필드들
  timeAgo?: string
  formattedLikeCount?: string
}

// ✅ 사용자 프로필 (백엔드 UserProfileResponse + 추가 정보)
export interface UserProfile {
  userId: number
  accountName: string
  userName: string
  userEmail: string
  profileImage: string | null
  prettyFace: string | null
  
  // 추가 계산 정보
  postsCount?: number
  followersCount?: number
  followingCount?: number
  isFollowing?: boolean
  isMe?: boolean
}

// ✅ 검색 결과
export interface SearchResult {
  users: UserProfile[]
  feeds: FeedWithPostsResponse[]
  exactMatch?: UserProfile
  hasMore: boolean
  total: number
}

// ✅ 탐색 필터
export interface ExploreFilters {
  size?: number
  query?: string
}

// ============================================================================
// 🔥 유틸리티 함수들 - 수정
// ============================================================================

// 🔧 수정: 인증 상태 체크 (클라이언트 사이드에서만 실행)
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

// 🔧 수정: 백엔드 실제 에러 응답 구조에 맞춘 에러 처리
const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any
    
    // 🔥 백엔드 ApiResponse 구조: { error: boolean, message: string, data: null }
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }
    
    // HTTP 상태코드 기반 처리 (백엔드 실제 응답)
    switch (axiosError.response?.status) {
      case 401:
        return '토큰이 만료되었거나 인증에 실패했습니다.'
      case 403:
        return '접근 권한이 없습니다.'
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.'
      case 409:
        return '이미 처리된 요청입니다.'
      case 500:
        return '서버 오류가 발생했습니다.'
      default:
        return '네트워크 오류가 발생했습니다.'
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return '알 수 없는 오류가 발생했습니다.'
}

// 발견 점수 계산
const calculateDiscoverScore = (post: PostResponse, source: ExplorePost['source']): number => {
  const likes = post.likeCount || 0
  const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)

  let score = 0

  switch (source) {
    case 'timeline':
      if (ageInHours < 1) score = 100
      else if (ageInHours < 6) score = 80
      else if (ageInHours < 24) score = 60
      else score = 30
      break
    case 'explore':
      score = Math.min(100, likes * 2 + (likes > 10 ? 20 : 0))
      break
    default:
      score = 50
  }

  return Math.max(0, Math.min(100, score))
}

// ============================================================================
// 🔥 변환 함수들
// ============================================================================

// 백엔드 PostResponse를 ExplorePost로 변환
const transformPostToExplorePost = (
  post: PostResponse,
  source: ExplorePost['source'] = 'explore'
): ExplorePost => {
  return {
    ...post,
    source,
    discoverScore: calculateDiscoverScore(post, source),
    timeAgo: formatTimeAgo(post.createdAt),
    formattedLikeCount: formatLikeCount(post.likeCount),
  }
}

// 🔧 수정: 백엔드 FeedWithPostsResponse에서 UserProfile 추출
const extractUserProfileFromFeed = (
  feed: FeedWithPostsResponse,
  currentUserId?: number
): UserProfile => {
  return {
    userId: feed.userId,
    accountName: feed.accountName,
    userName: feed.accountName, // 🔥 백엔드에서 userName 필드가 없으므로 accountName 사용
    userEmail: '', // 🔥 백엔드 FeedWithPostsResponse에 userEmail 없음
    profileImage: feed.profileImage,
    prettyFace: null, // 🔥 백엔드 FeedWithPostsResponse에 prettyFace 없음
    postsCount: feed.posts.length,
    followersCount: 0, // 🔥 별도 API 호출 필요 (GET /follows/count/{accountName})
    followingCount: 0, // 🔥 별도 API 호출 필요 (GET /follows/count/{accountName})
    isFollowing: feed.isFollowing,
    isMe: currentUserId ? feed.userId === currentUserId : false,
  }
}

// ============================================================================
// 🔥 메인 API 함수들 - 백엔드 실제 응답 구조에 맞춰 수정
// ============================================================================

// ✅ 랜덤 게시물 조회 (Explore) - 백엔드 GET /feeds/explore
export const getExploreFeeds = async (
  size: number = 20
): Promise<{
  success: boolean
  data?: { posts: ExplorePost[]; hasMore: boolean }
  error?: string
}> => {
  try {
    // 🔥 인증 체크 제거 - 인터셉터에서 자동 처리
    console.log('Explore 게시물 조회 시작...', { size })

    // 🔥 수정: 백엔드 실제 응답 구조에 맞춤
    const response = await api.get<ApiResponse<PostResponse[]>>(
      `${API_ENDPOINTS.EXPLORE}?size=${size}`
    )

    console.log('Explore 응답:', response.data)

    // 🔥 수정: 백엔드 ApiResponse 구조 체크
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || 'Explore 게시물을 불러오는데 실패했습니다.',
      }
    }

    // 🔥 수정: data가 null일 수 있음 처리
    const postsData = response.data.data || []
    
    if (!Array.isArray(postsData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.',
      }
    }

    const posts: ExplorePost[] = postsData.map(post => 
      transformPostToExplorePost(post, 'explore')
    )

    // 발견 점수에 따라 정렬
    posts.sort((a, b) => (b.discoverScore || 0) - (a.discoverScore || 0))

    return {
      success: true,
      data: {
        posts,
        hasMore: postsData.length >= size, // size만큼 받았으면 더 있을 가능성
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

// ✅ 타임라인 게시물 조회 (팔로잉) - 백엔드 GET /feeds/timeline
export const getTimelineFeeds = async (
  size: number = 20
): Promise<{
  success: boolean
  data?: { posts: ExplorePost[]; hasMore: boolean }
  error?: string
}> => {
  try {
    console.log('Timeline 게시물 조회 시작...', { size })

    // 🔥 수정: 백엔드 실제 응답 구조에 맞춤
    const response = await api.get<ApiResponse<PostResponse[]>>(
      `${API_ENDPOINTS.TIMELINE}?size=${size}`
    )

    console.log('Timeline 응답:', response.data)

    // 🔥 수정: 백엔드 ApiResponse 구조 체크
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || 'Timeline 게시물을 불러오는데 실패했습니다.',
      }
    }

    const postsData = response.data.data || []
    
    if (!Array.isArray(postsData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.',
      }
    }

    const posts: ExplorePost[] = postsData.map(post => 
      transformPostToExplorePost(post, 'timeline')
    )

    return {
      success: true,
      data: {
        posts,
        hasMore: postsData.length >= size,
      },
    }
  } catch (error) {
    console.error('Failed to get timeline feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ✅ 피드/사용자 검색 - 백엔드 GET /feeds/search
export const searchFeeds = async (
  query: string,
  size: number = 10
): Promise<{
  success: boolean
  data?: SearchResult
  error?: string
}> => {
  try {
    if (!query?.trim()) {
      return {
        success: true,
        data: {
          users: [],
          feeds: [],
          hasMore: false,
          total: 0,
        },
      }
    }

    console.log('피드 검색 시작:', query)

    // 🔥 수정: 백엔드 실제 엔드포인트와 파라미터
    const response = await api.get<ApiResponse<FeedWithPostsResponse[]>>(
      `${API_ENDPOINTS.SEARCH_FEEDS}?query=${encodeURIComponent(query.trim())}&size=${size}`
    )

    console.log('검색 응답:', response.data)

    // 🔥 수정: 백엔드 ApiResponse 구조 체크
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '검색에 실패했습니다.',
      }
    }

    const feeds = response.data.data || []
    
    if (!Array.isArray(feeds)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.',
      }
    }

    // 🔥 수정: 현재 사용자 ID 가져오기 (인증된 상태에서)
    let currentUserId: number | undefined
    try {
      const authState = useAuthStore.getState()
      // authState에서 userId를 가져올 수 있다면 사용
      // 없다면 별도 API 호출로 현재 사용자 정보 조회 필요
    } catch (error) {
      console.warn('현재 사용자 ID를 가져올 수 없습니다:', error)
    }
    
    // 피드에서 사용자 정보 추출 (중복 제거)
    const usersMap = new Map<string, UserProfile>()
    
    feeds.forEach(feed => {
      if (!usersMap.has(feed.accountName)) {
        const userProfile = extractUserProfileFromFeed(feed, currentUserId)
        usersMap.set(feed.accountName, userProfile)
      }
    })

    const users = Array.from(usersMap.values())
    
    // 정확 매칭 찾기
    const trimmedQuery = query.trim().toLowerCase()
    const exactMatch = users.find(
      user => user.accountName.toLowerCase() === trimmedQuery
    )

    // 관련도에 따라 정렬
    const sortedUsers = [...users].sort((a, b) => {
      if (a.accountName.toLowerCase() === trimmedQuery) return -1
      if (b.accountName.toLowerCase() === trimmedQuery) return 1
      
      const aStarts = a.accountName.toLowerCase().startsWith(trimmedQuery)
      const bStarts = b.accountName.toLowerCase().startsWith(trimmedQuery)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      
      return a.accountName.localeCompare(b.accountName)
    })

    return {
      success: true,
      data: {
        users: sortedUsers,
        feeds,
        exactMatch,
        hasMore: feeds.length >= size,
        total: sortedUsers.length + feeds.length,
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

// ✅ 사용자 피드 조회 (계정명 기반) - 백엔드 GET /feeds/users/account/{accountName}
export const getUserFeedByAccountName = async (
  accountName: string
): Promise<{
  success: boolean
  data?: FeedWithPostsResponse
  error?: string
}> => {
  try {
    console.log('사용자 피드 조회 시작:', accountName)

    // 🔥 수정: 백엔드 실제 엔드포인트
    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      API_ENDPOINTS.USER_FEED_BY_ACCOUNT(accountName)
    )

    console.log('사용자 피드 응답:', response.data)

    // 🔥 수정: 백엔드 ApiResponse 구조 체크
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '사용자 피드를 불러오는데 실패했습니다.',
      }
    }

    if (!response.data.data) {
      return {
        success: false,
        error: '피드 데이터가 없습니다.',
      }
    }

    return {
      success: true,
      data: response.data.data,
    }
  } catch (error) {
    console.error('Failed to get user feed:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ✅ 게시물 상세 조회 - 백엔드 GET /feeds/posts/{postId}
export const getPostDetail = async (
  postId: number
): Promise<{
  success: boolean
  data?: PostDetailResponse
  error?: string
}> => {
  try {
    console.log('게시물 상세 조회 시작:', postId)

    const response = await api.get<ApiResponse<PostDetailResponse>>(
      API_ENDPOINTS.POST_DETAIL(postId)
    )

    console.log('게시물 상세 응답:', response.data)

    // 🔥 수정: 백엔드 ApiResponse 구조 체크
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '게시물을 불러오는데 실패했습니다.',
      }
    }

    if (!response.data.data) {
      return {
        success: false,
        error: '게시물 데이터가 없습니다.',
      }
    }

    return {
      success: true,
      data: response.data.data,
    }
  } catch (error) {
    console.error('Failed to get post detail:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ✅ 게시물 좋아요 토글 - 백엔드 POST/DELETE /likes/posts/{postId}
export const togglePostLike = async (
  postId: number,
  isCurrentlyLiked: boolean
): Promise<{
  success: boolean
  data?: { isLiked: boolean }
  error?: string
}> => {
  try {
    console.log('좋아요 토글:', { postId, isCurrentlyLiked })

    // 🔥 수정: 백엔드 실제 엔드포인트 사용
    const endpoint = `/likes/posts/${postId}`
    
    if (isCurrentlyLiked) {
      // 좋아요 취소
      await api.delete<ApiResponse<void>>(endpoint)
    } else {
      // 좋아요
      await api.post<ApiResponse<void>>(endpoint)
    }

    console.log('좋아요 토글 성공')

    return {
      success: true,
      data: {
        isLiked: !isCurrentlyLiked,
      },
    }
  } catch (error) {
    console.error('Failed to toggle like:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ✅ 사용자 팔로우 토글 - 백엔드 POST/DELETE /follows/{accountName}
export const toggleUserFollow = async (
  accountName: string,
  isCurrentlyFollowing: boolean
): Promise<{
  success: boolean
  data?: { isFollowing: boolean }
  error?: string
}> => {
  try {
    console.log('팔로우 토글:', { accountName, isCurrentlyFollowing })

    // 🔥 수정: 백엔드 실제 엔드포인트 사용 (accountName 기반)
    const endpoint = `/follows/${accountName}`
    
    if (isCurrentlyFollowing) {
      // 언팔로우
      await api.delete<ApiResponse<void>>(endpoint)
    } else {
      // 팔로우
      await api.post<ApiResponse<void>>(endpoint)
    }

    console.log('팔로우 토글 성공')

    return {
      success: true,
      data: {
        isFollowing: !isCurrentlyFollowing,
      },
    }
  } catch (error) {
    console.error('Failed to toggle follow:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ============================================================================
// 🔄 기존 함수들 (하위 호환성)
// ============================================================================

// 기존 getRandomFeeds 함수 (getExploreFeeds로 리다이렉트)
export const getRandomFeeds = getExploreFeeds

// 기존 getFollowingFeeds 함수 (getTimelineFeeds로 리다이렉트)
export const getFollowingFeeds = getTimelineFeeds

// 🔧 수정: 기존 searchUsers 함수 (searchFeeds로 리다이렉트, cursor 파라미터 제거)
export const searchUsers = async (
  query: string,
  cursor?: string, // 🔥 백엔드에서 cursor 페이징을 사용하지 않으므로 무시
  limit: number = 20
) => {
  const result = await searchFeeds(query, limit)
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
    }
  }

  return {
    success: true,
    data: {
      users: result.data.users,
      exactMatch: result.data.exactMatch,
      hasMore: result.data.hasMore,
      total: result.data.total,
    },
  }
}

// ============================================================================
// 🔥 추가: 백엔드 연동을 위한 유틸리티 함수들
// ============================================================================

/**
 * 팔로우 수 조회 (백엔드 GET /follows/count/{accountName})
 */
export const getFollowCounts = async (
  accountName: string
): Promise<{
  success: boolean
  data?: { followerCount: number; followingCount: number }
  error?: string
}> => {
  try {
    const response = await api.get<ApiResponse<{ followerCount: number; followingCount: number }>>(
      `/follows/count/${accountName}`
    )

    if (response.data.error || !response.data.data) {
      return {
        success: false,
        error: response.data.message || '팔로우 수를 불러올 수 없습니다.',
      }
    }

    return {
      success: true,
      data: response.data.data,
    }
  } catch (error) {
    console.error('Failed to get follow counts:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

/**
 * 좋아요 수 조회 (백엔드 GET /likes/posts/{postId}/count)
 */
export const getPostLikeCount = async (
  postId: number
): Promise<{
  success: boolean
  data?: { count: number }
  error?: string
}> => {
  try {
    const response = await api.get<ApiResponse<number>>(
      `/likes/posts/${postId}/count`
    )

    if (response.data.error || response.data.data === null) {
      return {
        success: false,
        error: response.data.message || '좋아요 수를 불러올 수 없습니다.',
      }
    }

    return {
      success: true,
      data: {
        count: response.data.data || 0,
      },
    }
  } catch (error) {
    console.error('Failed to get like count:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}
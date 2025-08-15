// src/lib/api/explore.ts - 완전한 백엔드 연동 버전
// 🔥 아키텍처 원칙: 로그인 필수 + 커서 기반 무한스크롤 + axios 인터셉터 위임

import api from '@/lib/axios' // 인터셉터가 모든 인증 처리
import {
  PostResponse,
  PostListResponse,
  PostDetailResponse,
  FeedWithPostsResponse,
  FeedSearchResponse,
  UserProfileResponse,
  ApiResponse,
  API_ENDPOINTS,
  CursorPaginationParams,
  buildPaginationQuery,
  buildSearchQuery,
  formatTimeAgo,
  formatLikeCount,
} from '@/lib/types/feed'

// ============================================================================
// 🎯 백엔드 연동 타입들 (Long 타입 처리)
// ============================================================================

type Long = number | string

// 백엔드 실제 응답 타입들
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

interface BackendFeedWithPostsResponse {
  feedId: Long
  userId: Long
  accountName: string
  profileImage: string | null
  createdAt: string
  posts: BackendPostResponse[]
  isFollowing: boolean
  hasNext: boolean
  nextCursor: Long | null
}

interface BackendFeedSearchResponse {
  feeds: BackendFeedWithPostsResponse[]
  hasNext: boolean
  nextCursor: Long | null
}

interface BackendPostDetailResponse {
  postId: Long
  photoId: Long
  imgUrl: string
  caption: string | null
  createdAt: string
  likeCount: Long
  isLikedByMe: boolean
  authorId: Long
  authorAccountName: string
  authorProfileImage: string | null
  authorFeedId: Long
  isMyPost: boolean
  isFollowingAuthor: boolean
}

interface BackendFollowCountsResponse {
  followerCount: Long
  followingCount: Long
}

// ============================================================================
// 🔧 타입 변환 함수들 (Long → number)
// ============================================================================

const convertBackendPost = (backendPost: BackendPostResponse): PostResponse => {
  return {
    postId: Number(backendPost.postId),
    photoId: Number(backendPost.photoId),
    imgUrl: backendPost.imgUrl,
    caption: backendPost.caption,
    displayOrder: backendPost.displayOrder ? Number(backendPost.displayOrder) : null,
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
    nextCursor: backendPostList.nextCursor ? Number(backendPostList.nextCursor) : null
  }
}

const convertBackendFeed = (backendFeed: BackendFeedWithPostsResponse): FeedWithPostsResponse => {
  return {
    feedId: Number(backendFeed.feedId),
    userId: Number(backendFeed.userId),
    accountName: backendFeed.accountName,
    profileImage: backendFeed.profileImage,
    createdAt: backendFeed.createdAt,
    posts: backendFeed.posts.map(convertBackendPost),
    isFollowing: backendFeed.isFollowing,
    hasNext: backendFeed.hasNext,
    nextCursor: backendFeed.nextCursor ? Number(backendFeed.nextCursor) : null
  }
}

const convertBackendPostDetail = (backendDetail: BackendPostDetailResponse): PostDetailResponse => {
  return {
    postId: Number(backendDetail.postId),
    photoId: Number(backendDetail.photoId),
    imgUrl: backendDetail.imgUrl,
    caption: backendDetail.caption,
    createdAt: backendDetail.createdAt,
    likeCount: Number(backendDetail.likeCount),
    isLikedByMe: backendDetail.isLikedByMe,
    authorId: Number(backendDetail.authorId),
    authorAccountName: backendDetail.authorAccountName,
    authorProfileImage: backendDetail.authorProfileImage,
    authorFeedId: Number(backendDetail.authorFeedId),
    isMyPost: backendDetail.isMyPost,
    isFollowingAuthor: backendDetail.isFollowingAuthor
  }
}

// ============================================================================
// 🎯 UI 타입 정의들
// ============================================================================

export interface ExplorePost {
  // 기본 PostResponse 필드들
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
  timeAgo: string
  formattedLikeCount: string
  isLoading?: boolean
}

export interface ExplorePostsResult {
  posts: ExplorePost[]
  hasNext: boolean
  nextCursor: number | null
}

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

export interface SearchResult {
  users: UserProfile[]
  feeds: FeedWithPostsResponse[]
  exactMatch?: UserProfile
  hasNext: boolean
  nextCursor: number | null
  total: number
}

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

/**
 * 🔥 통일된 에러 처리 (백엔드 ApiResponse 구조 기반)
 */
const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any
    
    // 백엔드 ApiResponse.message 우선
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }
    
    // HTTP 상태코드 기반 폴백
    switch (axiosError.response?.status) {
      case 401:
        return '인증이 필요합니다. 다시 로그인해주세요.'
      case 403:
        return '접근 권한이 없습니다.'
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.'
      case 409:
        return '이미 처리된 요청입니다.'
      case 429:
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
      case 500:
        return '서버 오류가 발생했습니다.'
      case 502:
      case 503:
      case 504:
        return '서버가 일시적으로 응답하지 않습니다.'
      default:
        return '네트워크 오류가 발생했습니다.'
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return '알 수 없는 오류가 발생했습니다.'
}

/**
 * 발견 점수 계산 (탐색 알고리즘)
 */
const calculateDiscoverScore = (post: PostResponse, source: ExplorePost['source']): number => {
  const likes = post.likeCount || 0
  const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)

  let score = 0

  switch (source) {
    case 'timeline':
      // 시간 기반 점수 (최신일수록 높음)
      if (ageInHours < 1) score = 100
      else if (ageInHours < 6) score = 80
      else if (ageInHours < 24) score = 60
      else if (ageInHours < 72) score = 40
      else score = 20
      break
    case 'explore':
      // 인기도 기반 점수 (좋아요 수 + 시간 가중치)
      const baseScore = Math.min(80, likes * 2)
      const timeWeight = ageInHours < 24 ? 20 : ageInHours < 72 ? 10 : 0
      score = baseScore + timeWeight + (likes > 10 ? 10 : 0)
      break
    default:
      score = 50
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * PostResponse를 ExplorePost로 변환
 */
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
    isLoading: false,
  }
}

/**
 * PostListResponse를 ExplorePostsResult로 변환
 */
const transformPostListToExploreResult = (
  postListResponse: PostListResponse,
  source: ExplorePost['source'] = 'explore'
): ExplorePostsResult => {
  const posts = postListResponse.posts.map(post => 
    transformPostToExplorePost(post, source)
  )
  
  // 발견 점수에 따라 정렬 (높은 순)
  posts.sort((a, b) => (b.discoverScore || 0) - (a.discoverScore || 0))
  
  return {
    posts,
    hasNext: postListResponse.hasNext,
    nextCursor: postListResponse.nextCursor
  }
}

/**
 * FeedWithPostsResponse에서 UserProfile 추출
 */
const extractUserProfileFromFeed = (feed: FeedWithPostsResponse): UserProfile => {
  return {
    userId: feed.userId,
    accountName: feed.accountName,
    userName: feed.accountName, // 백엔드에서 userName 별도 필드 없음
    userEmail: '', // 백엔드에서 제공되지 않음
    profileImage: feed.profileImage,
    prettyFace: null, // 백엔드에서 제공되지 않음
    postsCount: feed.posts.length,
    followersCount: 0, // 별도 API 호출 필요
    followingCount: 0, // 별도 API 호출 필요
    isFollowing: feed.isFollowing,
    isMe: false, // 별도 로직으로 계산
  }
}

// ============================================================================
// 🔥 메인 API 함수들 - 커서 기반 무한 스크롤
// ============================================================================

/**
 * ✅ Explore 게시물 조회 (백엔드 GET /feeds/explore)
 * 🔐 인증 필수 - axios 인터셉터가 자동 처리
 */
export const getExploreFeeds = async (
  params: CursorPaginationParams = { limit: 20 }
): Promise<{
  success: boolean
  data?: ExplorePostsResult
  error?: string
}> => {
  try {
    console.log('🔥 Explore 게시물 조회 API 호출:', params)

    // URL 파라미터 생성
    const queryString = buildPaginationQuery(params)
    const url = queryString ? `${API_ENDPOINTS.EXPLORE}?${queryString}` : API_ENDPOINTS.EXPLORE

    // 🔐 인증은 axios 인터셉터가 자동 처리 (토큰 첨부 + 자동 갱신)
    const response = await api.get<ApiResponse<BackendPostListResponse>>(url)

    console.log('Explore 응답:', response.data)

    // 백엔드 ApiResponse 구조 체크
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || 'Explore 게시물을 불러오는데 실패했습니다.',
      }
    }

    const backendData = response.data.data
    if (!backendData) {
      return {
        success: false,
        error: '게시물 데이터가 없습니다.',
      }
    }

    // 백엔드 타입 → 프론트엔드 타입 변환
    const convertedPostList = convertBackendPostList(backendData)
    const result = transformPostListToExploreResult(convertedPostList, 'explore')

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Failed to get explore feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

/**
 * ✅ 타임라인 게시물 조회 (백엔드 GET /feeds/timeline)
 * 🔐 인증 필수 - 팔로잉한 사용자들의 게시물만
 */
export const getTimelineFeeds = async (
  params: CursorPaginationParams = { limit: 20 }
): Promise<{
  success: boolean
  data?: ExplorePostsResult
  error?: string
}> => {
  try {
    console.log('🔥 Timeline 게시물 조회 API 호출:', params)

    const queryString = buildPaginationQuery(params)
    const url = queryString ? `${API_ENDPOINTS.TIMELINE}?${queryString}` : API_ENDPOINTS.TIMELINE

    // 🔐 인증은 axios 인터셉터가 자동 처리
    const response = await api.get<ApiResponse<BackendPostListResponse>>(url)

    console.log('Timeline 응답:', response.data)

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || 'Timeline 게시물을 불러오는데 실패했습니다.',
      }
    }

    const backendData = response.data.data
    if (!backendData) {
      return {
        success: false,
        error: '타임라인 데이터가 없습니다.',
      }
    }

    const convertedPostList = convertBackendPostList(backendData)
    const result = transformPostListToExploreResult(convertedPostList, 'timeline')

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Failed to get timeline feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

/**
 * ✅ 피드/사용자 검색 (백엔드 GET /feeds/search)
 * 🔐 인증 필수
 */
export const searchFeeds = async (
  query: string,
  params: CursorPaginationParams = { limit: 10 }
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
          hasNext: false,
          nextCursor: null,
          total: 0,
        },
      }
    }

    console.log('🔥 피드 검색 API 호출:', { query, params })

    const searchParams = { query: query.trim(), ...params }
    const queryString = buildSearchQuery(searchParams)
    const url = `${API_ENDPOINTS.SEARCH_FEEDS}?${queryString}`

    // 🔐 인증은 axios 인터셉터가 자동 처리
    const response = await api.get<ApiResponse<BackendFeedSearchResponse>>(url)

    console.log('검색 응답:', response.data)

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '검색에 실패했습니다.',
      }
    }

    const backendData = response.data.data
    if (!backendData) {
      return {
        success: false,
        error: '검색 결과가 없습니다.',
      }
    }

    // 백엔드 피드 목록을 프론트엔드 타입으로 변환
    const convertedFeeds = backendData.feeds.map(convertBackendFeed)
    
    // 피드에서 사용자 정보 추출 (중복 제거)
    const usersMap = new Map<string, UserProfile>()
    
    convertedFeeds.forEach(feed => {
      if (!usersMap.has(feed.accountName)) {
        const userProfile = extractUserProfileFromFeed(feed)
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
        feeds: convertedFeeds,
        exactMatch,
        hasNext: backendData.hasNext,
        nextCursor: backendData.nextCursor ? Number(backendData.nextCursor) : null,
        total: sortedUsers.length + convertedFeeds.length,
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

/**
 * ✅ 사용자 피드 조회 (백엔드 GET /feeds/users/account/{accountName})
 * 🔐 인증 필수
 */
export const getUserFeedByAccountName = async (
  accountName: string,
  params: CursorPaginationParams = { limit: 20 }
): Promise<{
  success: boolean
  data?: FeedWithPostsResponse
  error?: string
}> => {
  try {
    console.log('🔥 사용자 피드 조회 API 호출:', { accountName, params })

    const queryString = buildPaginationQuery(params)
    const baseUrl = API_ENDPOINTS.USER_FEED_BY_ACCOUNT(accountName)
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl

    // 🔐 인증은 axios 인터셉터가 자동 처리
    const response = await api.get<ApiResponse<BackendFeedWithPostsResponse>>(url)

    console.log('사용자 피드 응답:', response.data)

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '사용자 피드를 불러오는데 실패했습니다.',
      }
    }

    const backendData = response.data.data
    if (!backendData) {
      return {
        success: false,
        error: '피드 데이터가 없습니다.',
      }
    }

    const convertedFeed = convertBackendFeed(backendData)

    return {
      success: true,
      data: convertedFeed,
    }
  } catch (error) {
    console.error('Failed to get user feed:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

/**
 * ✅ 게시물 상세 조회 (백엔드 GET /feeds/posts/{postId})
 * 🔐 인증 필수
 */
export const getPostDetail = async (
  postId: number
): Promise<{
  success: boolean
  data?: PostDetailResponse
  error?: string
}> => {
  try {
    console.log('🔥 게시물 상세 조회 API 호출:', postId)

    // 🔐 인증은 axios 인터셉터가 자동 처리
    const response = await api.get<ApiResponse<BackendPostDetailResponse>>(
      API_ENDPOINTS.POST_DETAIL(postId)
    )

    console.log('게시물 상세 응답:', response.data)

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '게시물을 불러오는데 실패했습니다.',
      }
    }

    const backendData = response.data.data
    if (!backendData) {
      return {
        success: false,
        error: '게시물 데이터가 없습니다.',
      }
    }

    const convertedDetail = convertBackendPostDetail(backendData)

    return {
      success: true,
      data: convertedDetail,
    }
  } catch (error) {
    console.error('Failed to get post detail:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ============================================================================
// 🔥 소셜 기능 API들
// ============================================================================

/**
 * ✅ 게시물 좋아요 토글 (백엔드 POST/DELETE /likes/posts/{postId})
 * 🔐 인증 필수
 */
export const togglePostLike = async (
  postId: number,
  isCurrentlyLiked: boolean
): Promise<{
  success: boolean
  data?: { isLiked: boolean }
  error?: string
}> => {
  try {
    console.log('🔥 좋아요 토글 API 호출:', { postId, isCurrentlyLiked })

    if (isCurrentlyLiked) {
      // 좋아요 취소 (DELETE)
      const response = await api.delete<ApiResponse<void>>(
        API_ENDPOINTS.UNLIKE_POST(postId)
      )
      
      if (response.data.error) {
        return {
          success: false,
          error: response.data.message || '좋아요 취소에 실패했습니다.',
        }
      }
    } else {
      // 좋아요 추가 (POST)
      const response = await api.post<ApiResponse<void>>(
        API_ENDPOINTS.LIKE_POST(postId)
      )
      
      if (response.data.error) {
        return {
          success: false,
          error: response.data.message || '좋아요에 실패했습니다.',
        }
      }
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

/**
 * ✅ 사용자 팔로우 토글 (백엔드 POST/DELETE /follows/{accountName})
 * 🔐 인증 필수
 */
export const toggleUserFollow = async (
  accountName: string,
  isCurrentlyFollowing: boolean
): Promise<{
  success: boolean
  data?: { isFollowing: boolean }
  error?: string
}> => {
  try {
    console.log('🔥 팔로우 토글 API 호출:', { accountName, isCurrentlyFollowing })

    if (isCurrentlyFollowing) {
      // 언팔로우 (DELETE)
      const response = await api.delete<ApiResponse<void>>(
        API_ENDPOINTS.UNFOLLOW(accountName)
      )
      
      if (response.data.error) {
        return {
          success: false,
          error: response.data.message || '언팔로우에 실패했습니다.',
        }
      }
    } else {
      // 팔로우 (POST)
      const response = await api.post<ApiResponse<void>>(
        API_ENDPOINTS.FOLLOW(accountName)
      )
      
      if (response.data.error) {
        return {
          success: false,
          error: response.data.message || '팔로우에 실패했습니다.',
        }
      }
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

/**
 * ✅ 팔로우 수 조회 (백엔드 GET /follows/count/{accountName})
 * 🔐 인증 필수
 */
export const getFollowCounts = async (
  accountName: string
): Promise<{
  success: boolean
  data?: { followerCount: number; followingCount: number }
  error?: string
}> => {
  try {
    console.log('🔥 팔로우 수 조회 API 호출:', accountName)

    // 🔐 인증은 axios 인터셉터가 자동 처리
    const response = await api.get<ApiResponse<BackendFollowCountsResponse>>(
      API_ENDPOINTS.GET_FOLLOW_COUNTS(accountName)
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로우 수를 불러올 수 없습니다.',
      }
    }

    const backendData = response.data.data
    if (!backendData) {
      return {
        success: false,
        error: '팔로우 수 데이터가 없습니다.',
      }
    }

    return {
      success: true,
      data: {
        followerCount: Number(backendData.followerCount),
        followingCount: Number(backendData.followingCount),
      },
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
 * ✅ 좋아요 수 조회 (백엔드 GET /likes/posts/{postId}/count)
 * 🔐 인증 필수
 */
export const getPostLikeCount = async (
  postId: number
): Promise<{
  success: boolean
  data?: { count: number }
  error?: string
}> => {
  try {
    console.log('🔥 좋아요 수 조회 API 호출:', postId)

    // 🔐 인증은 axios 인터셉터가 자동 처리
    const response = await api.get<ApiResponse<Long>>(
      API_ENDPOINTS.GET_LIKE_COUNT(postId)
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '좋아요 수를 불러올 수 없습니다.',
      }
    }

    const count = response.data.data !== null ? Number(response.data.data) : 0

    return {
      success: true,
      data: { count },
    }
  } catch (error) {
    console.error('Failed to get like count:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ============================================================================
// 🔥 커서 기반 무한 스크롤 헬퍼 함수들
// ============================================================================

/**
 * ✅ Explore 더보기 로딩 (커서 기반)
 * 🔐 인증 필수 - axios 인터셉터가 자동 처리
 */
export const loadMoreExploreFeeds = async (
  currentPosts: ExplorePost[],
  limit: number = 20
): Promise<{
  success: boolean
  data?: { posts: ExplorePost[]; hasNext: boolean; nextCursor: number | null }
  error?: string
}> => {
  try {
    // 마지막 포스트의 ID를 커서로 사용
    const lastPost = currentPosts[currentPosts.length - 1]
    const cursor = lastPost?.postId

    if (!cursor) {
      return {
        success: false,
        error: '커서를 찾을 수 없습니다.',
      }
    }

    console.log('🔥 Explore 더보기 로딩:', { cursor, limit })

    const result = await getExploreFeeds({ limit, cursor })
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
      }
    }

    // 중복 제거 (혹시 모를 경우를 대비)
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
  } catch (error) {
    console.error('Failed to load more explore feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

/**
 * ✅ Timeline 더보기 로딩 (커서 기반)
 * 🔐 인증 필수 - 팔로잉한 사용자들의 게시물만
 */
export const loadMoreTimelineFeeds = async (
  currentPosts: ExplorePost[],
  limit: number = 20
): Promise<{
  success: boolean
  data?: { posts: ExplorePost[]; hasNext: boolean; nextCursor: number | null }
  error?: string
}> => {
  try {
    const lastPost = currentPosts[currentPosts.length - 1]
    const cursor = lastPost?.postId

    if (!cursor) {
      return {
        success: false,
        error: '커서를 찾을 수 없습니다.',
      }
    }

    console.log('🔥 Timeline 더보기 로딩:', { cursor, limit })

    const result = await getTimelineFeeds({ limit, cursor })
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
      }
    }

    // 중복 제거
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
  } catch (error) {
    console.error('Failed to load more timeline feeds:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

/**
 * ✅ 사용자 피드 더보기 로딩 (커서 기반)
 * 🔐 인증 필수
 */
export const loadMoreUserFeedPosts = async (
  accountName: string,
  currentFeed: FeedWithPostsResponse,
  limit: number = 20
): Promise<{
  success: boolean
  data?: FeedWithPostsResponse
  error?: string
}> => {
  try {
    const lastPost = currentFeed.posts[currentFeed.posts.length - 1]
    const cursor = lastPost?.postId

    if (!cursor) {
      return {
        success: false,
        error: '커서를 찾을 수 없습니다.',
      }
    }

    console.log('🔥 사용자 피드 더보기 로딩:', { accountName, cursor, limit })

    const result = await getUserFeedByAccountName(accountName, { limit, cursor })
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
      }
    }

    // 기존 포스트와 새 포스트 병합 (중복 제거)
    const existingIds = new Set(currentFeed.posts.map(post => post.postId))
    const newPosts = result.data.posts.filter(post => !existingIds.has(post.postId))

    const mergedFeed: FeedWithPostsResponse = {
      ...currentFeed,
      posts: [...currentFeed.posts, ...newPosts],
      hasNext: result.data.hasNext,
      nextCursor: result.data.nextCursor,
    }

    return {
      success: true,
      data: mergedFeed,
    }
  } catch (error) {
    console.error('Failed to load more user feed posts:', error)
    return {
      success: false,
      error: handleApiError(error),
    }
  }
}

// ============================================================================
// 🔄 새로고침 함수들 (커서 초기화)
// ============================================================================

/**
 * ✅ Explore 새로고침 (처음부터 로드)
 * 🔐 인증 필수
 */
export const refreshExploreFeeds = async (
  limit: number = 20
): Promise<{
  success: boolean
  data?: ExplorePostsResult
  error?: string
}> => {
  console.log('🔥 Explore 새로고침')
  return getExploreFeeds({ limit }) // cursor 없이 처음부터 로드
}

/**
 * ✅ Timeline 새로고침 (처음부터 로드)
 * 🔐 인증 필수
 */
export const refreshTimelineFeeds = async (
  limit: number = 20
): Promise<{
  success: boolean
  data?: ExplorePostsResult
  error?: string
}> => {
  console.log('🔥 Timeline 새로고침')
  return getTimelineFeeds({ limit }) // cursor 없이 처음부터 로드
}

/**
 * ✅ 사용자 피드 새로고침 (처음부터 로드)
 * 🔐 인증 필수
 */
export const refreshUserFeed = async (
  accountName: string,
  limit: number = 20
): Promise<{
  success: boolean
  data?: FeedWithPostsResponse
  error?: string
}> => {
  console.log('🔥 사용자 피드 새로고침:', accountName)
  return getUserFeedByAccountName(accountName, { limit }) // cursor 없이 처음부터 로드
}

// ============================================================================
// 🔥 낙관적 업데이트 헬퍼들
// ============================================================================

/**
 * ✅ 낙관적 좋아요 토글 (즉시 UI 업데이트 + 실패시 롤백)
 * 🔐 인증 필수
 */
export const togglePostLikeOptimistic = async (
  postId: number,
  isCurrentlyLiked: boolean,
  onOptimisticUpdate: (newState: boolean) => void,
  onError: (originalState: boolean) => void
): Promise<void> => {
  // 즉시 UI 업데이트 (낙관적 업데이트)
  onOptimisticUpdate(!isCurrentlyLiked)
  
  try {
    const result = await togglePostLike(postId, isCurrentlyLiked)
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
 * ✅ 낙관적 팔로우 토글 (즉시 UI 업데이트 + 실패시 롤백)
 * 🔐 인증 필수
 */
export const toggleUserFollowOptimistic = async (
  accountName: string,
  isCurrentlyFollowing: boolean,
  onOptimisticUpdate: (newState: boolean) => void,
  onError: (originalState: boolean) => void
): Promise<void> => {
  // 즉시 UI 업데이트 (낙관적 업데이트)
  onOptimisticUpdate(!isCurrentlyFollowing)
  
  try {
    const result = await toggleUserFollow(accountName, isCurrentlyFollowing)
    if (!result.success) {
      // 실패시 롤백
      onError(isCurrentlyFollowing)
      throw new Error(result.error)
    }
  } catch (error) {
    // 에러 발생시 롤백
    onError(isCurrentlyFollowing)
    throw error
  }
}

// ============================================================================
// 🔧 무한 스크롤 상태 관리 헬퍼들
// ============================================================================

/**
 * ✅ 무한 스크롤 상태 생성
 */
export const createInfiniteScrollState = () => {
  return {
    posts: [] as ExplorePost[],
    loading: false,
    refreshing: false,
    hasNext: true,
    nextCursor: null as number | null,
    error: null as string | null,
  }
}

/**
 * ✅ 무한 스크롤 상태 업데이트
 */
export const updateInfiniteScrollState = (
  currentState: ReturnType<typeof createInfiniteScrollState>,
  newData: ExplorePostsResult,
  isRefresh: boolean = false
) => {
  return {
    ...currentState,
    posts: isRefresh ? newData.posts : [...currentState.posts, ...newData.posts],
    hasNext: newData.hasNext,
    nextCursor: newData.nextCursor,
    loading: false,
    refreshing: false,
    error: null,
  }
}

// ============================================================================
// 🔄 하위 호환성 함수들 (기존 코드 호환용)
// ============================================================================

/**
 * ❌ Deprecated: getRandomFeeds (getExploreFeeds 사용 권장)
 */
export const getRandomFeeds = async (limit: number = 20) => {
  console.warn('getRandomFeeds는 deprecated입니다. getExploreFeeds를 사용하세요.')
  
  const result = await getExploreFeeds({ limit })
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
    }
  }

  return {
    success: true,
    data: {
      posts: result.data.posts,
      hasMore: result.data.hasNext, // hasNext → hasMore로 변경
    },
  }
}

/**
 * ❌ Deprecated: getFollowingFeeds (getTimelineFeeds 사용 권장)
 */
export const getFollowingFeeds = async (limit: number = 20) => {
  console.warn('getFollowingFeeds는 deprecated입니다. getTimelineFeeds를 사용하세요.')
  
  const result = await getTimelineFeeds({ limit })
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
    }
  }

  return {
    success: true,
    data: {
      posts: result.data.posts,
      hasMore: result.data.hasNext, // hasNext → hasMore로 변경
    },
  }
}

/**
 * ❌ Deprecated: searchUsers (searchFeeds 사용 권장)
 */
export const searchUsers = async (
  query: string,
  cursor?: number,
  limit: number = 20
) => {
  console.warn('searchUsers는 deprecated입니다. searchFeeds를 사용하세요.')
  
  const result = await searchFeeds(query, { limit, cursor })
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
      hasMore: result.data.hasNext, // hasNext → hasMore로 변경
      total: result.data.total,
    },
  }
}

// ============================================================================
// 🔥 에러 복구 및 재시도 로직
// ============================================================================

/**
 * 재시도 로직 (지수 백오프)
 */
export const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await apiCall()
    } catch (error) {
      lastError = error

      // 마지막 재시도라면 실패
      if (i === maxRetries) break

      // 401 에러는 재시도하지 않음 (토큰 만료 - axios 인터셉터가 처리해야 함)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any
        if (axiosError.response?.status === 401) {
          console.log('401 에러 감지 - axios 인터셉터가 토큰 갱신을 처리해야 함')
          break
        }
      }

      // 지수 백오프로 재시도
      const delay = delayMs * Math.pow(2, i)
      console.log(`API 재시도 ${i + 1}/${maxRetries} (${delay}ms 후)`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * 재시도를 포함한 Explore 조회
 */
export const getExploreFeedsWithRetry = async (
  params: CursorPaginationParams = { limit: 20 }
) => {
  return withRetry(() => getExploreFeeds(params), 3, 1000)
}

/**
 * 재시도를 포함한 Timeline 조회
 */
export const getTimelineFeedsWithRetry = async (
  params: CursorPaginationParams = { limit: 20 }
) => {
  return withRetry(() => getTimelineFeeds(params), 3, 1000)
}

/**
 * 재시도를 포함한 사용자 피드 조회
 */
export const getUserFeedWithRetry = async (
  accountName: string, 
  params: CursorPaginationParams = { limit: 20 }
) => {
  return withRetry(() => getUserFeedByAccountName(accountName, params), 3, 1000)
}

// ============================================================================
// 🔥 디바이스 최적화 및 성능 개선
// ============================================================================

/**
 * 디바이스별 최적 limit 계산
 */
export const getOptimalFeedLimit = (deviceType: 'mobile' | 'tablet' | 'desktop'): number => {
  switch (deviceType) {
    case 'mobile': 
      return 12 // 모바일은 적게 로드하여 성능 최적화
    case 'tablet': 
      return 18 // 태블릿은 중간
    case 'desktop': 
      return 24 // 데스크탑은 많이 로드
    default: 
      return 20
  }
}

/**
 * 안전한 좋아요 토글 (중복 방지)
 */
export const safeTogglePostLike = async (
  postId: number,
  currentLikeState: boolean
): Promise<{ success: boolean; newState: boolean; error?: string }> => {
  try {
    // 현재 상태로 토글 실행 (백엔드에서 실제 상태 확인)
    const result = await togglePostLike(postId, currentLikeState)
    
    if (!result.success) {
      return {
        success: false,
        newState: currentLikeState,
        error: result.error
      }
    }

    return {
      success: true,
      newState: result.data?.isLiked ?? !currentLikeState,
      error: undefined
    }
  } catch (error) {
    return {
      success: false,
      newState: currentLikeState,
      error: handleApiError(error)
    }
  }
}

/**
 * 안전한 팔로우 토글 (중복 방지)
 */
export const safeToggleUserFollow = async (
  accountName: string,
  currentFollowState: boolean
): Promise<{ success: boolean; newState: boolean; error?: string }> => {
  try {
    const result = await toggleUserFollow(accountName, currentFollowState)
    
    if (!result.success) {
      return {
        success: false,
        newState: currentFollowState,
        error: result.error
      }
    }

    return {
      success: true,
      newState: result.data?.isFollowing ?? !currentFollowState,
      error: undefined
    }
  } catch (error) {
    return {
      success: false,
      newState: currentFollowState,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 🔥 추가 유틸리티들
// ============================================================================

/**
 * 게시물 시간 정보 새로고침
 */
export const refreshPostsTimeInfo = (posts: ExplorePost[]): ExplorePost[] => {
  return posts.map(post => ({
    ...post,
    timeAgo: formatTimeAgo(post.createdAt),
    formattedLikeCount: formatLikeCount(post.likeCount)
  }))
}

/**
 * 게시물 중복 제거
 */
export const deduplicatePosts = (posts: ExplorePost[]): ExplorePost[] => {
  const seen = new Set<number>()
  return posts.filter(post => {
    if (seen.has(post.postId)) {
      return false
    }
    seen.add(post.postId)
    return true
  })
}

/**
 * 발견 점수에 따른 게시물 정렬
 */
export const sortPostsByDiscoverScore = (posts: ExplorePost[]): ExplorePost[] => {
  return [...posts].sort((a, b) => (b.discoverScore || 0) - (a.discoverScore || 0))
}

/**
 * 📱 네트워크 상태에 따른 최적화된 로딩
 */
export const getNetworkOptimizedLimit = (
  baseLimit: number,
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' = '4g'
): number => {
  const multipliers = {
    'slow-2g': 0.3,
    '2g': 0.5,
    '3g': 0.7,
    '4g': 1.0,
    'wifi': 1.5
  }
  
  return Math.max(1, Math.floor(baseLimit * multipliers[connectionType]))
}
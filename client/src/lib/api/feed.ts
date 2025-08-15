// src/lib/api/feed.ts - 오류 없는 백엔드 연동 (아키텍처 원칙 준수)
// 🔥 아키텍처 원칙: 로그인 필수 + 커서 기반 무한스크롤 + axios 인터셉터 완전 위임

import api from '@/lib/axios' // 🔐 인터셉터가 모든 인증 처리
import {
  // 기본 타입들
  type PostResponse,
  type PostListResponse,
  type PostDetailResponse,
  type FeedWithPostsResponse,
  type FeedSearchResponse,
  type CreatePostFromMyRoomRequest,
  type UpdatePostRequest,
  type UserProfileResponse,
  type FollowCountsResponse,
  type ApiResponse,
  type CursorPaginationParams,
  
  // UI 타입들
  type PostCardForUI,
  type UserProfileForUI,
  type CursorPostsResult,
  type CursorFeedsResult,
  
  // 유틸리티들
  API_ENDPOINTS,
  buildPaginationQuery,
  buildSearchQuery,
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

interface BackendFollowCountsResponse {
  followerCount: Long
  followingCount: Long
}

interface BackendUserProfileResponse {
  userId: Long
  accountName: string
  userName: string
  userEmail: string
  profileImage: string | null
  prettyFace: string | null
}

interface BackendPhotoForFeedResponse {
  photoId: Long
  imgUrl: string
  alreadyInFeed: boolean
  createdAt: string
}

// ============================================================================
// 🔧 타입 변환 함수들 (Long → number)
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
    nextCursor: safeLongToNumber(backendFeed.nextCursor)
  }
}

const convertBackendFeedSearch = (backendSearch: BackendFeedSearchResponse): FeedSearchResponse => {
  return {
    feeds: backendSearch.feeds.map(convertBackendFeed),
    hasNext: backendSearch.hasNext,
    nextCursor: safeLongToNumber(backendSearch.nextCursor)
  }
}

const convertBackendUserProfile = (backendUser: BackendUserProfileResponse): UserProfileResponse => {
  return {
    userId: Number(backendUser.userId),
    accountName: backendUser.accountName,
    userName: backendUser.userName,
    userEmail: backendUser.userEmail,
    profileImage: backendUser.profileImage,
    prettyFace: backendUser.prettyFace
  }
}

const convertBackendFollowCounts = (backendCounts: BackendFollowCountsResponse): FollowCountsResponse => {
  return {
    followerCount: Number(backendCounts.followerCount),
    followingCount: Number(backendCounts.followingCount)
  }
}

const convertBackendPhotoForFeed = (backendPhoto: BackendPhotoForFeedResponse) => {
  return {
    photoId: Number(backendPhoto.photoId),
    imgUrl: backendPhoto.imgUrl,
    alreadyInFeed: backendPhoto.alreadyInFeed,
    createdAt: backendPhoto.createdAt
  }
}

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

export const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }
    switch (axiosError.response?.status) {
      case 401: return '인증이 필요합니다. 다시 로그인해주세요.'
      case 403: return '접근 권한이 없습니다.'
      case 404: return '요청한 리소스를 찾을 수 없습니다.'
      case 409: return '이미 처리된 요청입니다.'
      case 422: return '입력 데이터가 올바르지 않습니다.'
      case 429: return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
      case 500: return '서버 오류가 발생했습니다.'
      default: return '네트워크 오류가 발생했습니다.'
    }
  }
  if (error instanceof Error) return error.message
  return '알 수 없는 오류가 발생했습니다.'
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

const validateInput = {
  postId: (postId: number): boolean => Number.isInteger(postId) && postId > 0,
  accountName: (accountName: string): boolean => typeof accountName === 'string' && accountName.trim().length > 0,
  caption: (caption: string): boolean => typeof caption === 'string' && caption.length <= 2000,
  photoId: (photoId: number): boolean => Number.isInteger(photoId) && photoId > 0
}

// ============================================================================
// 🚀 게시물 관련 API 함수들
// ============================================================================

export const createPostFromMyRoom = async (
  photoId: number,
  caption: string = ''
): Promise<{ success: boolean; data?: number; error?: string }> => {
  try {
    if (!validateInput.photoId(photoId)) {
      return { success: false, error: '유효하지 않은 사진 ID입니다.' }
    }
    if (!validateInput.caption(caption)) {
      return { success: false, error: '캡션이 너무 깁니다. (최대 2000자)' }
    }

    const requestBody: CreatePostFromMyRoomRequest = { photoId, caption }
    const response = await api.post<ApiResponse<Long>>(
      API_ENDPOINTS.CREATE_POST_FROM_MYROOM,
      requestBody
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '게시물 생성에 실패했습니다.' }
    }
    if (response.data.data === null || response.data.data === undefined) {
      return { success: false, error: '게시물 ID를 받을 수 없습니다.' }
    }

    return { success: true, data: Number(response.data.data) }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const getPostDetail = async (
  postId: number
): Promise<{ success: boolean; data?: PostDetailResponse; error?: string }> => {
  try {
    if (!validateInput.postId(postId)) {
      return { success: false, error: '유효하지 않은 게시물 ID입니다.' }
    }

    const response = await api.get<ApiResponse<BackendPostDetailResponse>>(
      API_ENDPOINTS.POST_DETAIL(postId)
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '게시물을 불러오는데 실패했습니다.' }
    }
    if (!response.data.data) {
      return { success: false, error: '게시물 데이터가 없습니다.' }
    }

    return { success: true, data: convertBackendPostDetail(response.data.data) }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const updatePost = async (
  postId: number,
  caption: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!validateInput.postId(postId)) {
      return { success: false, error: '유효하지 않은 게시물 ID입니다.' }
    }
    if (!validateInput.caption(caption)) {
      return { success: false, error: '캡션이 너무 깁니다. (최대 2000자)' }
    }

    const requestBody: UpdatePostRequest = { caption }
    const response = await api.put<ApiResponse<void>>(
      API_ENDPOINTS.UPDATE_POST(postId),
      requestBody
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '게시물 수정에 실패했습니다.' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const deletePost = async (
  postId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!validateInput.postId(postId)) {
      return { success: false, error: '유효하지 않은 게시물 ID입니다.' }
    }

    const response = await api.delete<ApiResponse<void>>(
      API_ENDPOINTS.DELETE_POST(postId)
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '게시물 삭제에 실패했습니다.' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

// ============================================================================
// 🏠 피드 관련 API 함수들 (커서 기반 무한 스크롤)
// ============================================================================

export const getUserFeedById = async (
  userId: number,
  params: CursorPaginationParams = { limit: 20 }
): Promise<{ success: boolean; data?: FeedWithPostsResponse; error?: string }> => {
  try {
    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: '유효하지 않은 사용자 ID입니다.' }
    }

    const queryString = buildPaginationQuery(params)
    const baseUrl = API_ENDPOINTS.USER_FEED_BY_ID(userId)
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl

    const response = await api.get<ApiResponse<BackendFeedWithPostsResponse>>(url)

    if (response.data.error) {
      return { success: false, error: response.data.message || '사용자 피드를 불러오는데 실패했습니다.' }
    }
    if (!response.data.data) {
      return { success: false, error: '피드 데이터가 없습니다.' }
    }

    return { success: true, data: convertBackendFeed(response.data.data) }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const getUserFeedByAccountName = async (
  accountName: string,
  params: CursorPaginationParams = { limit: 20 }
): Promise<{ success: boolean; data?: FeedWithPostsResponse; error?: string }> => {
  try {
    if (!validateInput.accountName(accountName)) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const queryString = buildPaginationQuery(params)
    const baseUrl = API_ENDPOINTS.USER_FEED_BY_ACCOUNT(accountName)
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl

    const response = await api.get<ApiResponse<BackendFeedWithPostsResponse>>(url)

    if (response.data.error) {
      return { success: false, error: response.data.message || '사용자 피드를 불러오는데 실패했습니다.' }
    }
    if (!response.data.data) {
      return { success: false, error: '피드 데이터가 없습니다.' }
    }

    return { success: true, data: convertBackendFeed(response.data.data) }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const getExploreFeeds = async (
  params: CursorPaginationParams = { limit: 20 }
): Promise<{ success: boolean; data?: CursorPostsResult; error?: string }> => {
  try {
    const queryString = buildPaginationQuery(params)
    const url = queryString ? `${API_ENDPOINTS.EXPLORE}?${queryString}` : API_ENDPOINTS.EXPLORE

    const response = await api.get<ApiResponse<BackendPostListResponse>>(url)

    if (response.data.error) {
      return { success: false, error: response.data.message || 'Explore 게시물을 불러오는데 실패했습니다.' }
    }
    if (!response.data.data) {
      return { success: false, error: '게시물 데이터가 없습니다.' }
    }

    const convertedPostList = convertBackendPostList(response.data.data)
    const result = transformPostListToUICards(convertedPostList)
    
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const getTimelineFeeds = async (
  params: CursorPaginationParams = { limit: 20 }
): Promise<{ success: boolean; data?: CursorPostsResult; error?: string }> => {
  try {
    const queryString = buildPaginationQuery(params)
    const url = queryString ? `${API_ENDPOINTS.TIMELINE}?${queryString}` : API_ENDPOINTS.TIMELINE

    const response = await api.get<ApiResponse<BackendPostListResponse>>(url)

    if (response.data.error) {
      return { success: false, error: response.data.message || 'Timeline 게시물을 불러오는데 실패했습니다.' }
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

export const searchFeeds = async (
  query: string,
  params: CursorPaginationParams = { limit: 10 }
): Promise<{ success: boolean; data?: CursorFeedsResult; error?: string }> => {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, data: { feeds: [], hasNext: false, nextCursor: null } }
    }

    const searchParams = { query: query.trim(), ...params }
    const queryString = buildSearchQuery(searchParams)
    const url = `${API_ENDPOINTS.SEARCH_FEEDS}?${queryString}`

    const response = await api.get<ApiResponse<BackendFeedSearchResponse>>(url)

    if (response.data.error) {
      return { success: false, error: response.data.message || '피드 검색에 실패했습니다.' }
    }
    if (!response.data.data) {
      return { success: false, error: '검색 결과가 없습니다.' }
    }

    const convertedSearch = convertBackendFeedSearch(response.data.data)

    return {
      success: true,
      data: {
        feeds: convertedSearch.feeds,
        hasNext: convertedSearch.hasNext,
        nextCursor: convertedSearch.nextCursor
      }
    }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

// ============================================================================
// ❤️ 좋아요 관련 API 함수들
// ============================================================================

export const likePost = async (
  postId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!validateInput.postId(postId)) {
      return { success: false, error: '유효하지 않은 게시물 ID입니다.' }
    }

    const response = await api.post<ApiResponse<void>>(API_ENDPOINTS.LIKE_POST(postId))

    if (response.data.error) {
      return { success: false, error: response.data.message || '좋아요에 실패했습니다.' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const unlikePost = async (
  postId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!validateInput.postId(postId)) {
      return { success: false, error: '유효하지 않은 게시물 ID입니다.' }
    }

    const response = await api.delete<ApiResponse<void>>(API_ENDPOINTS.UNLIKE_POST(postId))

    if (response.data.error) {
      return { success: false, error: response.data.message || '좋아요 취소에 실패했습니다.' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const checkLikeStatus = async (
  postId: number
): Promise<{ success: boolean; data?: boolean; error?: string }> => {
  try {
    if (!validateInput.postId(postId)) {
      return { success: false, error: '유효하지 않은 게시물 ID입니다.' }
    }

    const response = await api.get<ApiResponse<boolean>>(API_ENDPOINTS.CHECK_LIKE_STATUS(postId))

    if (response.data.error) {
      return { success: false, error: response.data.message || '좋아요 상태 확인에 실패했습니다.' }
    }

    return { success: true, data: response.data.data ?? false }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const getLikeCount = async (
  postId: number
): Promise<{ success: boolean; data?: number; error?: string }> => {
  try {
    if (!validateInput.postId(postId)) {
      return { success: false, error: '유효하지 않은 게시물 ID입니다.' }
    }

    const response = await api.get<ApiResponse<Long>>(API_ENDPOINTS.GET_LIKE_COUNT(postId))

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
// 👥 팔로우 관련 API 함수들
// ============================================================================

export const followUser = async (
  accountName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!validateInput.accountName(accountName)) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await api.post<ApiResponse<void>>(API_ENDPOINTS.FOLLOW(accountName))

    if (response.data.error) {
      return { success: false, error: response.data.message || '팔로우에 실패했습니다.' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const unfollowUser = async (
  accountName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!validateInput.accountName(accountName)) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await api.delete<ApiResponse<void>>(API_ENDPOINTS.UNFOLLOW(accountName))

    if (response.data.error) {
      return { success: false, error: response.data.message || '언팔로우에 실패했습니다.' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const checkFollowStatus = async (
  accountName: string
): Promise<{ success: boolean; data?: boolean; error?: string }> => {
  try {
    if (!validateInput.accountName(accountName)) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await api.get<ApiResponse<boolean>>(API_ENDPOINTS.CHECK_FOLLOW_STATUS(accountName))

    if (response.data.error) {
      return { success: false, error: response.data.message || '팔로우 상태 확인에 실패했습니다.' }
    }

    return { success: true, data: response.data.data ?? false }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const getFollowCounts = async (
  accountName: string
): Promise<{ success: boolean; data?: FollowCountsResponse; error?: string }> => {
  try {
    if (!validateInput.accountName(accountName)) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await api.get<ApiResponse<BackendFollowCountsResponse>>(
      API_ENDPOINTS.GET_FOLLOW_COUNTS(accountName)
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '팔로우 수 조회에 실패했습니다.' }
    }
    if (!response.data.data) {
      return { success: false, error: '팔로우 수 데이터가 없습니다.' }
    }

    return { success: true, data: convertBackendFollowCounts(response.data.data) }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const getFollowingList = async (
  accountName: string
): Promise<{ success: boolean; data?: UserProfileResponse[]; error?: string }> => {
  try {
    if (!validateInput.accountName(accountName)) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
      API_ENDPOINTS.GET_FOLLOWING_LIST(accountName)
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '팔로잉 목록 조회에 실패했습니다.' }
    }

    const backendData = response.data.data || []
    if (!Array.isArray(backendData)) {
      return { success: false, error: '잘못된 응답 형식입니다.' }
    }

    return { success: true, data: backendData.map(convertBackendUserProfile) }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

export const getFollowersList = async (
  accountName: string
): Promise<{ success: boolean; data?: UserProfileResponse[]; error?: string }> => {
  try {
    if (!validateInput.accountName(accountName)) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
      API_ENDPOINTS.GET_FOLLOWERS_LIST(accountName)
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '팔로워 목록 조회에 실패했습니다.' }
    }

    const backendData = response.data.data || []
    if (!Array.isArray(backendData)) {
      return { success: false, error: '잘못된 응답 형식입니다.' }
    }

    return { success: true, data: backendData.map(convertBackendUserProfile) }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

// ============================================================================
// 📸 마이룸 연동 API 함수들
// ============================================================================

export const getPhotoForFeedUpload = async (
  photoId: number
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    if (!validateInput.photoId(photoId)) {
      return { success: false, error: '유효하지 않은 사진 ID입니다.' }
    }

    const response = await api.get<ApiResponse<BackendPhotoForFeedResponse>>(
      API_ENDPOINTS.PHOTO_FOR_FEED_UPLOAD(photoId)
    )

    if (response.data.error) {
      return { success: false, error: response.data.message || '사진 정보 조회에 실패했습니다.' }
    }
    if (!response.data.data) {
      return { success: false, error: '사진 데이터가 없습니다.' }
    }

    return { success: true, data: convertBackendPhotoForFeed(response.data.data) }
  } catch (error) {
    return { success: false, error: handleApiError(error) }
  }
}

// ============================================================================
// 🔧 편의 함수들 (토글 기능)
// ============================================================================

export const toggleLike = async (
  postId: number,
  isCurrentlyLiked: boolean
): Promise<{ success: boolean; isLiked: boolean; error?: string }> => {
  const result = isCurrentlyLiked ? await unlikePost(postId) : await likePost(postId)

  if (result.success) {
    return { success: true, isLiked: !isCurrentlyLiked }
  }

  return { success: false, isLiked: isCurrentlyLiked, error: result.error }
}

export const toggleFollow = async (
  accountName: string,
  isCurrentlyFollowing: boolean
): Promise<{ success: boolean; isFollowing: boolean; error?: string }> => {
  const result = isCurrentlyFollowing ? await unfollowUser(accountName) : await followUser(accountName)

  if (result.success) {
    return { success: true, isFollowing: !isCurrentlyFollowing }
  }

  return { success: false, isFollowing: isCurrentlyFollowing, error: result.error }
}

// ============================================================================
// 🔥 낙관적 업데이트 헬퍼들
// ============================================================================

export const toggleLikeOptimistic = async (
  postId: number,
  isCurrentlyLiked: boolean,
  onOptimisticUpdate: (newState: boolean) => void,
  onError: (originalState: boolean) => void
): Promise<void> => {
  onOptimisticUpdate(!isCurrentlyLiked)

  try {
    const result = await toggleLike(postId, isCurrentlyLiked)
    if (!result.success) {
      onError(isCurrentlyLiked)
      throw new Error(result.error)
    }
  } catch (error) {
    onError(isCurrentlyLiked)
    throw error
  }
}

export const toggleFollowOptimistic = async (
  accountName: string,
  isCurrentlyFollowing: boolean,
  onOptimisticUpdate: (newState: boolean) => void,
  onError: (originalState: boolean) => void
): Promise<void> => {
  onOptimisticUpdate(!isCurrentlyFollowing)

  try {
    const result = await toggleFollow(accountName, isCurrentlyFollowing)
    if (!result.success) {
      onError(isCurrentlyFollowing)
      throw new Error(result.error)
    }
  } catch (error) {
    onError(isCurrentlyFollowing)
    throw error
  }
}

// ============================================================================
// 📱 커서 기반 무한 스크롤 헬퍼 함수들
// ============================================================================

export const loadMoreExploreFeeds = async (
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

  const result = await getExploreFeeds({ limit, cursor })
  
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

export const loadMoreTimelineFeeds = async (
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

  const result = await getTimelineFeeds({ limit, cursor })
  
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

export const loadMoreUserFeedPosts = async (
  accountName: string,
  currentFeed: FeedWithPostsResponse,
  limit: number = 20
): Promise<{
  success: boolean
  data?: FeedWithPostsResponse
  error?: string
}> => {
  const lastPost = currentFeed.posts[currentFeed.posts.length - 1]
  const cursor = lastPost?.postId

  if (!cursor) {
    return { success: false, error: '커서를 찾을 수 없습니다.' }
  }

  const result = await getUserFeedByAccountName(accountName, { limit, cursor })
  
  if (!result.success || !result.data) {
    return { success: false, error: result.error }
  }

  const existingIds = new Set(currentFeed.posts.map(post => post.postId))
  const newPosts = result.data.posts.filter(post => !existingIds.has(post.postId))

  const mergedFeed: FeedWithPostsResponse = {
    ...currentFeed,
    posts: [...currentFeed.posts, ...newPosts],
    hasNext: result.data.hasNext,
    nextCursor: result.data.nextCursor,
  }

  return { success: true, data: mergedFeed }
}

// ============================================================================
// 🔄 새로고침 함수들
// ============================================================================

export const refreshExploreFeeds = async (
  limit: number = 20
): Promise<{ success: boolean; data?: CursorPostsResult; error?: string }> => {
  return getExploreFeeds({ limit })
}

export const refreshTimelineFeeds = async (
  limit: number = 20
): Promise<{ success: boolean; data?: CursorPostsResult; error?: string }> => {
  return getTimelineFeeds({ limit })
}

export const refreshUserFeed = async (
  accountName: string,
  limit: number = 20
): Promise<{ success: boolean; data?: FeedWithPostsResponse; error?: string }> => {
  return getUserFeedByAccountName(accountName, { limit })
}

// ============================================================================
// 🔄 하위 호환성 함수들
// ============================================================================

export const getUserFeeds = getUserFeedById

// ============================================================================
// 🔥 타입 Export
// ============================================================================

export type {
  PostCardForUI,
  UserProfileForUI,
  CursorPostsResult,
  CursorFeedsResult
}
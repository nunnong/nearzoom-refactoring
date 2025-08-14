// src/lib/api/feed.ts - import 수정 버전

import api from '@/lib/axios'
import {
  // 타입들
  type PostResponse,
  type PostDetailResponse,
  type FeedWithPostsResponse,
  type CreatePostFromMyRoomRequest,
  type UpdatePostRequest,
  type UserProfileResponse,
  type FollowCountsResponse,
  type ApiResponse,
  
  // 값들 (함수, 상수)
  API_ENDPOINTS,
  formatTimeAgo,
  formatLikeCount,
} from '../types/feed'  // 상대 경로로 변경

// ============================================================================
// 🎯 내부 타입들 (export 없음)
// ============================================================================

type Long = number | string

interface BackendPostResponse {
  postId: Long
  photoId: Long
  imgUrl: string
  caption: string
  displayOrder: number | null
  createdAt: string
  likeCount: Long
  isLikedByMe: boolean
  authorId: Long
  authorAccountName: string
  authorProfileImage: string | null
}

interface BackendPostDetailResponse {
  postId: Long
  photoId: Long
  imgUrl: string
  caption: string
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

interface PostCardForUI extends PostResponse {
  timeAgo?: string
  formattedLikeCount?: string
  isLoading?: boolean
}

interface UserProfileForUI extends UserProfileResponse {
  postsCount?: number
  followersCount?: number
  followingCount?: number
  isFollowing?: boolean
  isMe?: boolean
}

interface CurrentUserForUI {
  userId: number
  accountName: string
  userName: string
  userEmail: string
  profileImage: string | null
}

// ============================================================================
// 🔧 변환 함수들
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
    isFollowing: backendFeed.isFollowing
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

const transformPostToUICard = (post: PostResponse): PostCardForUI => {
  return {
    ...post,
    timeAgo: formatTimeAgo(post.createdAt),
    formattedLikeCount: formatLikeCount(post.likeCount),
    isLoading: false,
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
      case 401:
        return '토큰이 만료되었거나 인증에 실패했습니다.'
      case 403:
        return '접근 권한이 없습니다.'
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.'
      case 409:
        return '이미 처리된 요청입니다. (중복 게시물/좋아요)'
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

// ============================================================================
// 🚀 게시물 관련 API 함수들
// ============================================================================

export const createPostFromMyRoom = async (
  photoId: number,
  caption: string = ''
): Promise<{ success: boolean; data?: number; error?: string }> => {
  try {
    const requestBody: CreatePostFromMyRoomRequest = { photoId, caption }

    const response = await api.post<ApiResponse<Long>>(
      API_ENDPOINTS.CREATE_POST_FROM_MYROOM,
      requestBody
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '게시물 생성에 실패했습니다.'
      }
    }

    if (response.data.data === null || response.data.data === undefined) {
      return {
        success: false,
        error: '게시물 ID를 받을 수 없습니다.'
      }
    }

    return {
      success: true,
      data: Number(response.data.data)
    }
  } catch (error) {
    console.error('Failed to create post from myroom:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const getPostDetail = async (
  postId: number
): Promise<{ success: boolean; data?: PostDetailResponse; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<BackendPostDetailResponse>>(
      API_ENDPOINTS.POST_DETAIL(postId)
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '게시물을 불러오는데 실패했습니다.'
      }
    }

    if (!response.data.data) {
      return {
        success: false,
        error: '게시물 데이터가 없습니다.'
      }
    }

    const convertedDetail = convertBackendPostDetail(response.data.data)

    return {
      success: true,
      data: convertedDetail
    }
  } catch (error) {
    console.error('Failed to get post detail:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const updatePost = async (
  postId: number,
  caption: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const requestBody: UpdatePostRequest = { caption }

    const response = await api.put<ApiResponse<void>>(
      API_ENDPOINTS.UPDATE_POST(postId),
      requestBody
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '게시물 수정에 실패했습니다.'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to update post:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const deletePost = async (
  postId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.delete<ApiResponse<void>>(
      API_ENDPOINTS.DELETE_POST(postId)
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '게시물 삭제에 실패했습니다.'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete post:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 🏠 피드 관련 API 함수들
// ============================================================================

export const getUserFeedById = async (
  userId: number
): Promise<{ success: boolean; data?: FeedWithPostsResponse; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<BackendFeedWithPostsResponse>>(
      API_ENDPOINTS.USER_FEED_BY_ID(userId)
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '사용자 피드를 불러오는데 실패했습니다.'
      }
    }

    if (!response.data.data) {
      return {
        success: false,
        error: '피드 데이터가 없습니다.'
      }
    }

    const convertedFeed = convertBackendFeed(response.data.data)

    return {
      success: true,
      data: convertedFeed
    }
  } catch (error) {
    console.error('Failed to get user feed by id:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const getUserFeedByAccountName = async (
  accountName: string
): Promise<{ success: boolean; data?: FeedWithPostsResponse; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<BackendFeedWithPostsResponse>>(
      API_ENDPOINTS.USER_FEED_BY_ACCOUNT(accountName)
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '사용자 피드를 불러오는데 실패했습니다.'
      }
    }

    if (!response.data.data) {
      return {
        success: false,
        error: '피드 데이터가 없습니다.'
      }
    }

    const convertedFeed = convertBackendFeed(response.data.data)

    return {
      success: true,
      data: convertedFeed
    }
  } catch (error) {
    console.error('Failed to get user feed by account name:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const getExploreFeeds = async (
  size: number = 20
): Promise<{ success: boolean; data?: PostCardForUI[]; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<BackendPostResponse[]>>(
      `${API_ENDPOINTS.EXPLORE}?size=${size}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || 'Explore 게시물을 불러오는데 실패했습니다.'
      }
    }

    const postsData = response.data.data || []

    if (!Array.isArray(postsData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    const convertedPosts = postsData.map(convertBackendPost)
    const postCards = convertedPosts.map(transformPostToUICard)
    
    return {
      success: true,
      data: postCards
    }
  } catch (error) {
    console.error('Failed to get explore feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const getTimelineFeeds = async (
  size: number = 20
): Promise<{ success: boolean; data?: PostCardForUI[]; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<BackendPostResponse[]>>(
      `${API_ENDPOINTS.TIMELINE}?size=${size}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || 'Timeline 게시물을 불러오는데 실패했습니다.'
      }
    }

    const postsData = response.data.data || []

    if (!Array.isArray(postsData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    const convertedPosts = postsData.map(convertBackendPost)
    const postCards = convertedPosts.map(transformPostToUICard)
    
    return {
      success: true,
      data: postCards
    }
  } catch (error) {
    console.error('Failed to get timeline feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const searchFeeds = async (
  query: string,
  size: number = 10
): Promise<{ success: boolean; data?: FeedWithPostsResponse[]; error?: string }> => {
  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: []
      }
    }

    const response = await api.get<ApiResponse<BackendFeedWithPostsResponse[]>>(
      `${API_ENDPOINTS.SEARCH_FEEDS}?query=${encodeURIComponent(query.trim())}&size=${size}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '피드 검색에 실패했습니다.'
      }
    }

    const feedsData = response.data.data || []

    if (!Array.isArray(feedsData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    const convertedFeeds = feedsData.map(convertBackendFeed)

    return {
      success: true,
      data: convertedFeeds
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
// ❤️ 좋아요 관련 API 함수들
// ============================================================================

export const likePost = async (
  postId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.post<ApiResponse<void>>(
      `/likes/posts/${postId}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '좋아요에 실패했습니다.'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to like post:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const unlikePost = async (
  postId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.delete<ApiResponse<void>>(
      `/likes/posts/${postId}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '좋아요 취소에 실패했습니다.'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to unlike post:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const checkLikeStatus = async (
  postId: number
): Promise<{ success: boolean; data?: boolean; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<boolean>>(
      `/likes/posts/${postId}/check`
    )

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
  } catch (error) {
    console.error('Failed to check like status:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const getLikeCount = async (
  postId: number
): Promise<{ success: boolean; data?: number; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<Long>>(
      `/likes/posts/${postId}/count`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '좋아요 수 조회에 실패했습니다.'
      }
    }

    const likeCount = response.data.data ? Number(response.data.data) : 0

    return {
      success: true,
      data: likeCount
    }
  } catch (error) {
    console.error('Failed to get like count:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 👥 팔로우 관련 API 함수들
// ============================================================================

export const followUser = async (
  accountName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.post<ApiResponse<void>>(
      `/follows/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로우에 실패했습니다.'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to follow user:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const unfollowUser = async (
  accountName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.delete<ApiResponse<void>>(
      `/follows/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '언팔로우에 실패했습니다.'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to unfollow user:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const checkFollowStatus = async (
  accountName: string
): Promise<{ success: boolean; data?: boolean; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<boolean>>(
      `/follows/check/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로우 상태 확인에 실패했습니다.'
      }
    }

    return {
      success: true,
      data: response.data.data ?? false
    }
  } catch (error) {
    console.error('Failed to check follow status:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const getFollowCounts = async (
  accountName: string
): Promise<{ success: boolean; data?: FollowCountsResponse; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<BackendFollowCountsResponse>>(
      `/follows/count/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로우 수 조회에 실패했습니다.'
      }
    }

    if (!response.data.data) {
      return {
        success: false,
        error: '팔로우 수 데이터가 없습니다.'
      }
    }

    const convertedCounts = convertBackendFollowCounts(response.data.data)

    return {
      success: true,
      data: convertedCounts
    }
  } catch (error) {
    console.error('Failed to get follow counts:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const getFollowingList = async (
  accountName: string
): Promise<{ success: boolean; data?: UserProfileResponse[]; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
      `/follows/following/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로잉 목록 조회에 실패했습니다.'
      }
    }

    const followingData = response.data.data || []

    if (!Array.isArray(followingData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    const convertedUsers = followingData.map(convertBackendUserProfile)

    return {
      success: true,
      data: convertedUsers
    }
  } catch (error) {
    console.error('Failed to get following list:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

export const getFollowersList = async (
  accountName: string
): Promise<{ success: boolean; data?: UserProfileResponse[]; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
      `/follows/followers/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로워 목록 조회에 실패했습니다.'
      }
    }

    const followersData = response.data.data || []

    if (!Array.isArray(followersData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    const convertedUsers = followersData.map(convertBackendUserProfile)

    return {
      success: true,
      data: convertedUsers
    }
  } catch (error) {
    console.error('Failed to get followers list:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 🔧 편의 함수들
// ============================================================================

export const toggleLike = async (
  postId: number,
  isCurrentlyLiked: boolean
): Promise<{ success: boolean; isLiked: boolean; error?: string }> => {
  const result = isCurrentlyLiked
    ? await unlikePost(postId)
    : await likePost(postId)

  if (result.success) {
    return {
      success: true,
      isLiked: !isCurrentlyLiked
    }
  }

  return {
    success: false,
    isLiked: isCurrentlyLiked,
    error: result.error
  }
}

export const toggleFollow = async (
  accountName: string,
  isCurrentlyFollowing: boolean
): Promise<{ success: boolean; isFollowing: boolean; error?: string }> => {
  const result = isCurrentlyFollowing
    ? await unfollowUser(accountName)
    : await followUser(accountName)

  if (result.success) {
    return {
      success: true,
      isFollowing: !isCurrentlyFollowing
    }
  }

  return {
    success: false,
    isFollowing: isCurrentlyFollowing,
    error: result.error
  }
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
// 🔄 하위 호환성 함수들
// ============================================================================

export const likeFeed = async (feedId: number) => {
  console.warn('likeFeed는 deprecated입니다. likePost를 사용하세요.')
  return likePost(feedId)
}

export const unlikeFeed = async (feedId: number) => {
  console.warn('unlikeFeed는 deprecated입니다. unlikePost를 사용하세요.')
  return unlikePost(feedId)
}

export const getUserFeeds = getUserFeedById
export const getFollowingFeeds = getTimelineFeeds
export const getRandomFeeds = getExploreFeeds

// ============================================================================
// 🔥 에러 복구 및 재시도 로직
// ============================================================================

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

      if (i === maxRetries) break

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any
        if (axiosError.response?.status === 401) break
      }

      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)))
    }
  }

  throw lastError
}

export const getExploreFeedsWithRetry = async (size: number = 20) => {
  return withRetry(() => getExploreFeeds(size), 3, 1000)
}

export const getTimelineFeedsWithRetry = async (size: number = 20) => {
  return withRetry(() => getTimelineFeeds(size), 3, 1000)
}

export const getUserFeedWithRetry = async (accountName: string) => {
  return withRetry(() => getUserFeedByAccountName(accountName), 3, 1000)
}

// ============================================================================
// 🔥 추가: 마이룸 연동 및 고급 기능들
// ============================================================================

/**
 * 마이룸 사진을 피드 업로드용으로 조회
 */
export const getPhotoForFeedUpload = async (
  photoId: number
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await api.get<ApiResponse<any>>(
      `/myroom/photos/${photoId}/feed-upload-info`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '사진 정보 조회에 실패했습니다.'
      }
    }

    if (!response.data.data) {
      return {
        success: false,
        error: '사진 데이터가 없습니다.'
      }
    }

    return {
      success: true,
      data: response.data.data
    }
  } catch (error) {
    console.error('Failed to get photo for feed upload:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

/**
 * 게시물의 displayOrder 기반 정렬
 */
export const sortPostsByDisplayOrder = (posts: PostCardForUI[]): PostCardForUI[] => {
  return [...posts].sort((a, b) => {
    if (a.displayOrder !== null && b.displayOrder !== null) {
      return a.displayOrder - b.displayOrder
    }
    if (a.displayOrder !== null) return -1
    if (b.displayOrder !== null) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/**
 * 중복 게시물 체크
 */
export const checkDuplicatePost = async (
  photoId: number
): Promise<{ success: boolean; isDuplicate: boolean; error?: string }> => {
  try {
    const result = await getPhotoForFeedUpload(photoId)
    if (result.success && result.data) {
      return {
        success: true,
        isDuplicate: result.data.alreadyInFeed || false
      }
    }
    return { success: false, isDuplicate: false, error: result.error }
  } catch (error) {
    return {
      success: false,
      isDuplicate: false,
      error: handleApiError(error)
    }
  }
}

/**
 * 사용자 권한 확인 헬퍼
 */
export const checkPostOwnership = (post: PostCardForUI, currentUserId: number): boolean => {
  return post.authorId === currentUserId
}

/**
 * 페이지네이션 기반 피드 로딩
 */
export const loadFeedWithPagination = async (
  feedType: 'explore' | 'timeline',
  page: number = 0,
  size: number = 20
): Promise<{ success: boolean; data?: PostCardForUI[]; hasMore: boolean; error?: string }> => {
  try {
    let result
    
    switch (feedType) {
      case 'explore':
        result = await getExploreFeeds(size)
        break
      case 'timeline':
        result = await getTimelineFeeds(size)
        break
      default:
        throw new Error('Invalid feed type')
    }

    if (!result.success) {
      return {
        success: false,
        data: [],
        hasMore: false,
        error: result.error
      }
    }

    const posts = result.data || []
    
    return {
      success: true,
      data: posts,
      hasMore: posts.length >= size,
      error: undefined
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      hasMore: false,
      error: handleApiError(error)
    }
  }
}

/**
 * 안전한 좋아요 토글 (중복 방지)
 */
export const safeToggleLike = async (
  postId: number,
  currentLikeState: boolean
): Promise<{ success: boolean; newState: boolean; error?: string }> => {
  try {
    const statusCheck = await checkLikeStatus(postId)
    if (!statusCheck.success) {
      return {
        success: false,
        newState: currentLikeState,
        error: statusCheck.error
      }
    }

    const actualCurrentState = statusCheck.data ?? false
    
    if (actualCurrentState !== currentLikeState) {
      return {
        success: true,
        newState: actualCurrentState,
        error: undefined
      }
    }

    const toggleResult = await toggleLike(postId, actualCurrentState)
    return {
      success: toggleResult.success,
      newState: toggleResult.isLiked,
      error: toggleResult.error
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
export const safeToggleFollow = async (
  accountName: string,
  currentFollowState: boolean
): Promise<{ success: boolean; newState: boolean; error?: string }> => {
  try {
    const statusCheck = await checkFollowStatus(accountName)
    if (!statusCheck.success) {
      return {
        success: false,
        newState: currentFollowState,
        error: statusCheck.error
      }
    }

    const actualCurrentState = statusCheck.data ?? false
    
    if (actualCurrentState !== currentFollowState) {
      return {
        success: true,
        newState: actualCurrentState,
        error: undefined
      }
    }

    const toggleResult = await toggleFollow(accountName, actualCurrentState)
    return {
      success: toggleResult.success,
      newState: toggleResult.isFollowing,
      error: toggleResult.error
    }
  } catch (error) {
    return {
      success: false,
      newState: currentFollowState,
      error: handleApiError(error)
    }
  }
}
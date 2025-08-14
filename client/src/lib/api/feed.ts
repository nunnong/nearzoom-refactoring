// src/lib/api/feed.ts
import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/constants/api'
import { 
  FeedElement, 
  UserFeed, 
  BackendApiResponse,
  BackendFeedDetailResponse,
  BackendCreateFeedRequest,
  BackendFollowCountsResponse,
  BackendUserInfoResponse,
  BackendUserProfileResponse
} from '@/lib/types/feed'

// 🔥 백엔드 ApiResponse 타입 (백엔드 구조에 맞춤)
type ApiResponse<T> = BackendApiResponse<T>

// ✅ 프론트엔드 타입들
interface CanvasFeedItem extends Omit<UserFeed, 'photoId'> {
  elements: FeedElement[]
  authorId: string      
  authorName: string
  authorAvatar?: string
  photoId: number        
  photoUrl: string
  likesCount: number
  commentsCount?: number
}

interface CreateFeedData {
  photoId: number
  caption: string
}

interface UpdateFeedData extends Partial<CreateFeedData> {
  elements?: FeedElement[]
  totalHeight?: number
  backgroundColor?: string
  backgroundImageUrl?: string | undefined
  name?: string
  description?: string
  isPublic?: boolean
}

interface PaginatedResponse<T> {
  items: T[]
  hasMore: boolean
  total: number
  page: number
  limit: number
}

// ✅ 현재 사용자 응답 타입
interface CurrentUserResponse {
  id: string           
  name: string         
  accountName: string  
}

// 사용자 정보 캐시
const userCache = new Map<string, { name: string; avatar?: string; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

// ✅ 백엔드 응답을 프론트엔드 타입으로 변환
const transformBackendFeedToCanvasFeed = async (
  backendFeed: BackendFeedDetailResponse
): Promise<CanvasFeedItem> => {
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
    
    authorId: backendFeed.accountName,  
    authorName: backendFeed.accountName,
    authorAvatar: backendFeed.profileImage,
    photoId: backendFeed.feedId,  
    photoUrl: backendFeed.imgUrl,
    
    elements: [],
    
    followersCount: 0,
    likesCount: 0, 
    isFollowing: false,
    isLiked: backendFeed.liked,
    
    createdAt: backendFeed.createdAt,
    updatedAt: backendFeed.createdAt
  }
}

// === API 함수들 ===

// ✅ 피드 생성 (POST /feeds)
export const createFeed = async (
  photoId: number, 
  caption: string = ''
): Promise<{ success: boolean; data?: CanvasFeedItem; error?: string }> => {
  try {
    const requestBody: BackendCreateFeedRequest = {
      photoId,
      caption
    }

    console.log('=== 피드 생성 API 호출 ===', requestBody)

    const response = await api.post<ApiResponse<number>>(API_ENDPOINTS.FEEDS, requestBody)
    const result = response.data
    
    if (!result.error && result.data) {
      const createdFeedId = result.data
      console.log('피드 생성 성공, ID:', createdFeedId)
      
      // 생성된 피드 상세 정보 조회
      const feedDetailResult = await getFeedDetail(createdFeedId)
      if (feedDetailResult.success && feedDetailResult.data) {
        return {
          success: true,
          data: feedDetailResult.data
        }
      }
    }

    return {
      success: false,
      error: result.message || '피드 생성에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to create feed:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 피드 상세 조회 (GET /feeds/{feedId})
export const getFeedDetail = async (
  feedId: number
): Promise<{ success: boolean; data?: CanvasFeedItem; error?: string }> => {
  try {
    console.log('=== 피드 상세 조회 API 호출 ===', feedId)

    const response = await api.get<ApiResponse<BackendFeedDetailResponse>>(`${API_ENDPOINTS.FEEDS}/${feedId}`)
    const result = response.data
    
    if (!result.error && result.data) {
      const canvasFeed = await transformBackendFeedToCanvasFeed(result.data)
      return {
        success: true,
        data: canvasFeed
      }
    }

    return {
      success: false,
      error: result.message || '피드를 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get feed detail:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 특정 사용자 피드 목록 조회 (GET /feeds/users/{userId})
export const getUserFeeds = async (
  userId: number,
  cursorCreatedAt?: string,
  cursorId?: number,
  size: number = 20
): Promise<{ 
  success: boolean; 
  data?: { 
    items: CanvasFeedItem[]; 
    hasMore: boolean;
    nextCursor?: { createdAt: string; feedId: number } | null;
  }; 
  error?: string 
}> => {
  try {
    const params: Record<string, any> = { size }
    if (cursorCreatedAt) params.cursorCreatedAt = cursorCreatedAt
    if (cursorId) params.cursorId = cursorId

    console.log('=== 사용자 피드 목록 조회 API 호출 ===', { userId, params })

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      `${API_ENDPOINTS.FEEDS}/users/${userId}`,
      { params }
    )
    const result = response.data
    
    if (!result.error && Array.isArray(result.data)) {
      const canvasFeeds = await Promise.all(
        result.data.map(feed => transformBackendFeedToCanvasFeed(feed))
      )
      
      // 다음 커서 계산
      const hasMore = result.data.length === size
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
          items: canvasFeeds,
          hasMore,
          nextCursor
        }
      }
    }

    return {
      success: false,
      error: result.message || '사용자 피드를 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get user feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로잉 피드 목록 조회 (GET /feeds/following)
export const getFollowingFeeds = async (
  cursorCreatedAt?: string,
  cursorId?: number,
  size: number = 20
): Promise<{ 
  success: boolean; 
  data?: { 
    items: CanvasFeedItem[]; 
    hasMore: boolean;
    nextCursor?: { createdAt: string; feedId: number } | null;
  }; 
  error?: string 
}> => {
  try {
    const params: Record<string, any> = { size }
    if (cursorCreatedAt) params.cursorCreatedAt = cursorCreatedAt
    if (cursorId) params.cursorId = cursorId

    console.log('=== 팔로잉 피드 목록 조회 API 호출 ===', params)

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      `${API_ENDPOINTS.FEEDS}/following`,
      { params }
    )
    const result = response.data
    
    if (!result.error && Array.isArray(result.data)) {
      const canvasFeeds = await Promise.all(
        result.data.map(feed => transformBackendFeedToCanvasFeed(feed))
      )
      
      // 다음 커서 계산
      const hasMore = result.data.length === size
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
          items: canvasFeeds,
          hasMore,
          nextCursor
        }
      }
    }

    return {
      success: false,
      error: result.message || '팔로잉 피드를 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get following feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 랜덤 피드 목록 조회 (GET /feeds/random)
export const getRandomFeeds = async (
  size: number = 20
): Promise<{ 
  success: boolean; 
  data?: { 
    items: CanvasFeedItem[]; 
    hasMore: boolean;
  }; 
  error?: string 
}> => {
  try {
    const params = { size }

    console.log('=== 랜덤 피드 목록 조회 API 호출 ===', params)

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      `${API_ENDPOINTS.FEEDS}/random`,
      { params }
    )
    const result = response.data
    
    if (!result.error && Array.isArray(result.data)) {
      const canvasFeeds = await Promise.all(
        result.data.map(feed => transformBackendFeedToCanvasFeed(feed))
      )
      
      return {
        success: true,
        data: {
          items: canvasFeeds,
          hasMore: false  // 랜덤 피드는 페이징 없음
        }
      }
    }

    return {
      success: false,
      error: result.message || '랜덤 피드를 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get random feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 피드 검색 (GET /feeds/search) - accountName 기반
export const searchFeeds = async (
  query: string,
  size: number = 10
): Promise<{ 
  success: boolean; 
  data?: { 
    items: CanvasFeedItem[]; 
  }; 
  error?: string 
}> => {
  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: { items: [] }
      }
    }

    const params = {
      query: query.trim(),
      size
    }

    console.log('=== 피드 검색 API 호출 ===', params)

    const response = await api.get<ApiResponse<BackendFeedDetailResponse[]>>(
      `${API_ENDPOINTS.FEEDS}/search`,
      { params }
    )
    const result = response.data
    
    if (!result.error && Array.isArray(result.data)) {
      const canvasFeeds = await Promise.all(
        result.data.map(feed => transformBackendFeedToCanvasFeed(feed))
      )
      
      return {
        success: true,
        data: {
          items: canvasFeeds
        }
      }
    }

    return {
      success: false,
      error: result.message || '피드 검색에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to search feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 좋아요 추가 (POST /likes/{feedId})
export const likeFeed = async (feedId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('=== 좋아요 API 호출 ===', feedId)

    const response = await api.post<ApiResponse<void>>(`${API_ENDPOINTS.LIKES}/${feedId}`)
    const result = response.data
    
    if (!result.error) {
      return { success: true }
    }

    return {
      success: false,
      error: result.message || '좋아요에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to like feed:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 좋아요 취소 (DELETE /likes/{feedId})
export const unlikeFeed = async (feedId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('=== 좋아요 취소 API 호출 ===', feedId)

    const response = await api.delete<ApiResponse<void>>(`${API_ENDPOINTS.LIKES}/${feedId}`)
    const result = response.data
    
    if (!result.error) {
      return { success: true }
    }

    return {
      success: false,
      error: result.message || '좋아요 취소에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to unlike feed:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 좋아요 상태 확인 (GET /likes/check/{feedId})
export const checkLikeStatus = async (feedId: number): Promise<{ success: boolean; data?: boolean; error?: string }> => {
  try {
    console.log('=== 좋아요 상태 확인 API 호출 ===', feedId)

    const response = await api.get<ApiResponse<boolean>>(`${API_ENDPOINTS.LIKES}/check/${feedId}`)
    const result = response.data
    
    if (!result.error) {
      return {
        success: true,
        data: result.data ?? false  // 🔥 null을 false로 변환
      }
    }

    return {
      success: false,
      error: result.message || '좋아요 상태 확인에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to check like status:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로우 (POST /follows/{followeeId})
export const followUser = async (followeeId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('=== 팔로우 API 호출 ===', followeeId)

    const response = await api.post<ApiResponse<void>>(`${API_ENDPOINTS.FOLLOWS}/${followeeId}`)
    const result = response.data
    
    if (!result.error) {
      return { success: true }
    }

    return {
      success: false,
      error: result.message || '팔로우에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to follow user:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 언팔로우 (DELETE /follows/{followeeId})
export const unfollowUser = async (followeeId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('=== 언팔로우 API 호출 ===', followeeId)

    const response = await api.delete<ApiResponse<void>>(`${API_ENDPOINTS.FOLLOWS}/${followeeId}`)
    const result = response.data
    
    if (!result.error) {
      return { success: true }
    }

    return {
      success: false,
      error: result.message || '언팔로우에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to unfollow user:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로우 상태 확인 (GET /follows/check/{followeeId})
export const checkFollowStatus = async (followeeId: number): Promise<{ success: boolean; data?: boolean; error?: string }> => {
  try {
    console.log('=== 팔로우 상태 확인 API 호출 ===', followeeId)

    const response = await api.get<ApiResponse<boolean>>(`${API_ENDPOINTS.FOLLOWS}/check/${followeeId}`)
    const result = response.data
    
    if (!result.error) {
      return {
        success: true,
        data: result.data ?? false  // 🔥 null을 false로 변환
      }
    }

    return {
      success: false,
      error: result.message || '팔로우 상태 확인에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to check follow status:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로우 수 조회 (GET /follows/count/{userId})
export const getFollowCounts = async (userId: number): Promise<{ success: boolean; data?: BackendFollowCountsResponse; error?: string }> => {
  try {
    console.log('=== 팔로우 수 조회 API 호출 ===', userId)

    const response = await api.get<ApiResponse<BackendFollowCountsResponse>>(`${API_ENDPOINTS.FOLLOWS}/count/${userId}`)
    const result = response.data
    
    if (!result.error && result.data) {
      return {
        success: true,
        data: result.data
      }
    }

    return {
      success: false,
      error: result.message || '팔로우 수 조회에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get follow counts:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 현재 사용자 정보 가져오기 (GET /user/userInfo)
export const getCurrentUser = async (): Promise<CurrentUserResponse | null> => {
  try {
    console.log('=== 현재 사용자 정보 조회 API 호출 ===')

    const response = await api.get<ApiResponse<BackendUserInfoResponse>>(`${API_ENDPOINTS.USER}/userInfo`)
    const result = response.data
    
    if (!result.error && result.data) {
      // 이메일에서 accountName 추출 (@ 앞부분)
      const accountName = result.data.userEmail.split('@')[0]
      
      return {
        id: result.data.userEmail, // 임시로 이메일을 ID로 사용
        name: result.data.userName,
        accountName: accountName
      }
    }
    
    throw new Error(result.message || '사용자 정보를 가져올 수 없습니다.')
    
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

// API 에러 처리 헬퍼 (다른 API 파일에서도 사용할 수 있도록 export)
export const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as any).message
  }
  if (typeof error === 'string') {
    return error
  }
  return '알 수 없는 오류가 발생했습니다.'
}

// ================================================================
// 🔥 타입 내보내기 (다른 파일에서 사용할 수 있도록)
// ================================================================

export type { 
  BackendUserProfileResponse,
  BackendFeedDetailResponse,
  BackendFollowCountsResponse,
  BackendUserInfoResponse,
  CanvasFeedItem,
  CurrentUserResponse,
  ApiResponse
}
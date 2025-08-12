// src/lib/api/feed.ts
import { useAuthStore } from '@/stores/authStore'
import { FeedElement, UserFeed } from '@/lib/types/feed'

// ✅ 백엔드 ApiResponse 구조에 정확히 맞춤
interface ApiResponse<T> {
  error: boolean      // success가 아니라 error 필드
  message: string | null
  data: T | null
}

// ✅ 백엔드 UserProfileResponse (User 도메인의 실제 구조)
interface BackendUserProfileResponse {
  userId: number
  accountName: string
  userName: string
  userEmail: string
  userProfileImage: string
  faceImageUrl: string
}

// ✅ 백엔드 DTO와 정확히 일치하는 타입들
interface BackendFeedDetailResponse {
  feedId: number
  imgUrl: string        // ✅ photoUrl → imgUrl
  caption: string       // ✅ 추가됨
  authorId: number
  accountName: string   // ✅ userName → accountName
  profileImage: string  // ✅ 사용자 프로필 이미지
  createdAt: string     // LocalDateTime → string
  liked: boolean        // ✅ 현재 사용자의 좋아요 여부
}

// ✅ 백엔드 CreateFeedRequest
interface BackendCreateFeedRequest {
  photoId: number
  caption: string
}

// ✅ 백엔드 FollowCountsResponse
interface BackendFollowCountsResponse {
  followerCount: number
  followingCount: number
}

// ✅ 백엔드 UserInfoResponse (기존 호환성 유지)
interface BackendUserInfoResponse {
  userName: string
  userEmail: string
  profileImage: string
  prettyFace: string
}

// ✅ 프론트엔드 타입들
interface CanvasFeedItem extends Omit<UserFeed, 'photoId'> {
  elements: FeedElement[]
  authorId: string      // 🔥 accountName 사용 (숫자 ID 대신)
  authorName: string
  authorAvatar?: string
  photoId: number        // ✅ 백엔드와 일치하도록 number로 고정
  photoUrl: string
  likesCount: number
  commentsCount?: number
}

interface CreateFeedData {
  photoId: number
  caption: string    // ✅ 추가됨
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
  id: string           // userId (숫자)
  name: string         // userName
  accountName: string  // 🔥 필수 필드로 변경
}

// API 설정
const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.nearzoom.store'
    : 'http://localhost:8080';

const API_ENDPOINTS = {
  feeds: '/feeds',
  likes: '/likes', 
  follows: '/follows',
  users: '/users',
  auth: '/auth'
} as const

// 사용자 정보 캐시
const userCache = new Map<string, { name: string; avatar?: string; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

// 인증 토큰 가져오기
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const authState = useAuthStore.getState();
    const token = authState.accessToken;
    
    if (token) {
      // 토큰 만료 검사
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        
        if (payload.exp <= now) {
          console.error('토큰이 만료됨');
          authState.clearTokens();
          return null;
        }
      } catch (tokenError) {
        console.error('토큰 파싱 오류:', tokenError);
        authState.clearTokens();
        return null;
      }
    }
    
    return token;
  } catch (error) {
    console.error('인증 상태 확인 오류:', error);
    return null;
  }
}

// ✅ HTTP 요청 헬퍼 (다른 API 파일에서도 사용할 수 있도록 export)
export const fetchWithAuth = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken()
  
  console.log('=== fetchWithAuth 호출 ===');
  console.log('URL:', `${API_BASE_URL}${url}`);
  console.log('토큰 존재:', !!token);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    console.log('Authorization 헤더 추가됨');
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
      credentials: 'include', // 🔥 추가
    })

    console.log('응답 상태:', response.status);

    if (response.status === 401) {
      console.error('🔴 401 에러: 백엔드에서 토큰을 인식하지 못함');
      if (typeof window !== 'undefined') {
        const authState = useAuthStore.getState();
        authState.clearTokens();
      }
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
    }

    if (response.status === 403) {
      throw new Error('접근 권한이 없습니다.')
    }

    if (response.status === 404) {
      throw new Error('요청한 리소스를 찾을 수 없습니다.')
    }

    if (!response.ok) {
      const errorData: ApiResponse<null> = await response.json().catch(() => ({ 
        error: true,
        message: `HTTP ${response.status}: ${response.statusText}`,
        data: null
      }))
      throw new Error(errorData.message || '요청이 실패했습니다.')
    }

    return response
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('네트워크 연결을 확인해주세요.')
    }
    throw error
  }
}

// ✅ 사용자 정보 API 연동 (백엔드에 사용자 정보 API 추가 필요)
const getUserInfoFromApi = async (userId: string): Promise<{ name: string; avatar?: string }> => {
  const cached = userCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { name: cached.name, avatar: cached.avatar }
  }

  try {
    // TODO: 백엔드에 사용자 정보 조회 API 추가 필요
    // GET /users/{userId} 엔드포인트
    const response = await fetchWithAuth(`${API_ENDPOINTS.users}/${userId}`)
    const result: ApiResponse<BackendUserInfoResponse> = await response.json()
    
    if (!result.error && result.data) {
      const userData = { 
        name: result.data.userName, 
        avatar: result.data.profileImage || undefined,
        timestamp: Date.now() 
      }
      userCache.set(userId, userData)
      return { name: userData.name, avatar: userData.avatar }
    }
    
    throw new Error('사용자 정보를 찾을 수 없습니다.')
  } catch (error) {
    console.error('Failed to get user info:', error)
    // 실패 시 기본값 반환
    const defaultUserData = { 
      name: `user_${userId}`, 
      avatar: undefined,
      timestamp: Date.now() 
    }
    userCache.set(userId, defaultUserData)
    return { name: defaultUserData.name, avatar: defaultUserData.avatar }
  }
}

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
    
    authorId: backendFeed.accountName,  // 🔥 핵심 수정: accountName 사용
    authorName: backendFeed.accountName,
    authorAvatar: backendFeed.profileImage,
    photoId: backendFeed.feedId,  // feedId를 photoId로 사용
    photoUrl: backendFeed.imgUrl,
    
    elements: [],
    
    followersCount: 0,
    likesCount: 0, // 별도로 조회하지 않음 (백엔드에서 좋아요 수 API 없음)
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

    const response = await fetchWithAuth(`${API_ENDPOINTS.feeds}`, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    const result: ApiResponse<number> = await response.json()  // 백엔드는 feedId(Long) 반환
    
    if (!result.error && result.data) {
      // 생성된 피드를 다시 조회
      const feedDetailResult = await getFeed(result.data.toString())
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

// ✅ 단일 피드 조회 (GET /feeds/{feedId})
export const getFeed = async (feedId: string): Promise<{ success: boolean; data?: CanvasFeedItem; error?: string }> => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.feeds}/${feedId}`)
    const result: ApiResponse<BackendFeedDetailResponse> = await response.json()
    
    if (!result.error && result.data) {
      const canvasFeed = await transformBackendFeedToCanvasFeed(result.data)
      
      return {
        success: true,
        data: canvasFeed
      }
    }

    return {
      success: false,
      error: result.message || '피드를 찾을 수 없습니다.'
    }
  } catch (error) {
    console.error('Failed to get feed:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 사용자 피드 목록 조회 (GET /feeds/users/{userId})
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
    const params = new URLSearchParams()
    if (cursorCreatedAt) params.append('cursorCreatedAt', cursorCreatedAt)
    if (cursorId) params.append('cursorId', cursorId.toString())
    params.append('size', size.toString())

    const url = `${API_ENDPOINTS.feeds}/users/${userId}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: ApiResponse<BackendFeedDetailResponse[]> = await response.json()
    
    if (!result.error && Array.isArray(result.data)) {
      const canvasFeeds = await Promise.all(
        result.data.map(feed => transformBackendFeedToCanvasFeed(feed))
      )
      
      // 다음 커서 계산 (마지막 아이템 기준)
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
    const params = new URLSearchParams()
    if (cursorCreatedAt) params.append('cursorCreatedAt', cursorCreatedAt)
    if (cursorId) params.append('cursorId', cursorId.toString())
    params.append('size', size.toString())

    const url = `${API_ENDPOINTS.feeds}/following?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: ApiResponse<BackendFeedDetailResponse[]> = await response.json()
    
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
    const params = new URLSearchParams()
    params.append('size', size.toString())

    const url = `${API_ENDPOINTS.feeds}/random?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: ApiResponse<BackendFeedDetailResponse[]> = await response.json()
    
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

// ✅ 피드 삭제 (백엔드에서 미지원)
export const deleteFeed = async (feedId: string): Promise<{ success: boolean; error?: string }> => {
  return {
    success: false,
    error: '피드 삭제는 현재 백엔드에서 지원되지 않습니다.'
  }
}

// ✅ 좋아요 토글 (POST/DELETE /likes/{feedId})
export const toggleFeedLike = async (feedId: number): Promise<{ success: boolean; data?: { isLiked: boolean; likesCount?: number }; error?: string }> => {
  try {
    const currentLikeStatus = await checkLikeStatus(feedId)
    
    let response: Response
    if (currentLikeStatus) {
      // 좋아요 취소
      response = await fetchWithAuth(`${API_ENDPOINTS.likes}/${feedId}`, {
        method: 'DELETE'
      })
    } else {
      // 좋아요 추가
      response = await fetchWithAuth(`${API_ENDPOINTS.likes}/${feedId}`, {
        method: 'POST'
      })
    }

    const result: ApiResponse<null> = await response.json()
    
    if (!result.error) {
      return {
        success: true,
        data: {
          isLiked: !currentLikeStatus
          // 좋아요 수는 백엔드에서 제공하지 않음
        }
      }
    }

    return {
      success: false,
      error: result.message || '좋아요 처리에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to toggle like:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 좋아요 상태 확인 (GET /likes/check/{feedId})
export const checkLikeStatus = async (feedId: number): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.likes}/check/${feedId}`)
    const result: ApiResponse<boolean> = await response.json()
    
    if (!result.error && typeof result.data === 'boolean') {
      return result.data
    }
    
    return false
  } catch (error) {
    console.error('Failed to check like status:', error)
    return false
  }
}

// ================================================================
// 🔥 새로운 accountName 기반 팔로우 API들
// ================================================================

// ✅ accountName으로 팔로우
export const followUserByAccountName = async (targetAccountName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!targetAccountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: '로그인이 필요합니다.' }
    }
    if (currentUser.accountName === targetAccountName) {
      return { success: false, error: '자기 자신을 팔로우할 수 없습니다.' }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/${targetAccountName}`, {
      method: 'POST'
    })
    const result: ApiResponse<null> = await response.json()
    
    if (!result.error) {
      return { success: true }
    }
    
    return { success: false, error: result.message || '팔로우에 실패했습니다.' }
  } catch (error) {
    console.error('Failed to follow user:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ✅ accountName으로 언팔로우
export const unfollowUserByAccountName = async (targetAccountName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!targetAccountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/${targetAccountName}`, {
      method: 'DELETE'
    })
    const result: ApiResponse<null> = await response.json()
    
    if (!result.error) {
      return { success: true }
    }
    
    return { success: false, error: result.message || '언팔로우에 실패했습니다.' }
  } catch (error) {
    console.error('Failed to unfollow user:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ✅ accountName으로 팔로우 토글
export const toggleFollowByAccountName = async (targetAccountName: string): Promise<{ success: boolean; data?: { isFollowing: boolean }; error?: string }> => {
  try {
    const isCurrentlyFollowing = await checkFollowStatusByAccountName(targetAccountName)
    
    let result
    if (isCurrentlyFollowing) {
      result = await unfollowUserByAccountName(targetAccountName)
    } else {
      result = await followUserByAccountName(targetAccountName)
    }
    
    if (!result.success) {
      return result
    }
    
    return { success: true, data: { isFollowing: !isCurrentlyFollowing } }
  } catch (error) {
    console.error('Failed to toggle follow:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ✅ accountName으로 팔로우 상태 확인
export const checkFollowStatusByAccountName = async (accountName: string): Promise<boolean> => {
  try {
    if (!accountName?.trim()) return false
    
    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/check/${accountName}`)
    const result: ApiResponse<boolean> = await response.json()
    
    if (!result.error && typeof result.data === 'boolean') {
      return result.data
    }
    
    return false
  } catch (error) {
    console.error('Failed to check follow status:', error)
    return false
  }
}

// ✅ accountName으로 팔로잉 목록 조회 (UserProfileResponse 사용)
export const getFollowingByAccountName = async (accountName: string): Promise<{ 
  success: boolean; 
  data?: BackendUserProfileResponse[]; 
  error?: string 
}> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/following/${accountName}`)
    const result: ApiResponse<BackendUserProfileResponse[]> = await response.json()
    
    if (!result.error && Array.isArray(result.data)) {
      return { success: true, data: result.data }
    }
    
    return { success: false, error: result.message || '팔로잉 목록 조회에 실패했습니다.' }
  } catch (error) {
    console.error('Failed to get following list:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ✅ accountName으로 팔로워 목록 조회 (UserProfileResponse 사용)
export const getFollowersByAccountName = async (accountName: string): Promise<{ 
  success: boolean; 
  data?: BackendUserProfileResponse[]; 
  error?: string 
}> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/followers/${accountName}`)
    const result: ApiResponse<BackendUserProfileResponse[]> = await response.json()
    
    if (!result.error && Array.isArray(result.data)) {
      return { success: true, data: result.data }
    }
    
    return { success: false, error: result.message || '팔로워 목록 조회에 실패했습니다.' }
  } catch (error) {
    console.error('Failed to get followers list:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ✅ accountName으로 팔로우 수 조회
export const getFollowCountsByAccountName = async (accountName: string): Promise<{ 
  success: boolean; 
  data?: BackendFollowCountsResponse; 
  error?: string 
}> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/count/${accountName}`)
    const result: ApiResponse<BackendFollowCountsResponse> = await response.json()
    
    if (!result.error && result.data) {
      return { success: true, data: result.data }
    }
    
    return { success: false, error: result.message || '팔로우 수 조회에 실패했습니다.' }
  } catch (error) {
    console.error('Failed to get follow counts:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ================================================================
// 🔥 기존 숫자 ID 기반 팔로우 API들 (호환성 유지)
// ================================================================

// ✅ 팔로우/언팔로우 (POST/DELETE /follows/{followeeId}) - 숫자 ID 기반
export const toggleFollow = async (followeeId: number): Promise<{ success: boolean; data?: boolean; error?: string }> => {
  try {
    const isCurrentlyFollowing = await checkFollowStatus(followeeId)
    
    let response: Response
    if (isCurrentlyFollowing) {
      // 언팔로우
      response = await fetchWithAuth(`${API_ENDPOINTS.follows}/${followeeId}`, {
        method: 'DELETE'
      })
    } else {
      // 팔로우
      response = await fetchWithAuth(`${API_ENDPOINTS.follows}/${followeeId}`, {
        method: 'POST'
      })
    }

    const result: ApiResponse<null> = await response.json()
    
    if (!result.error) {
      return {
        success: true,
        data: !isCurrentlyFollowing
      }
    }

    return {
      success: false,
      error: result.message || '팔로우 처리에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to toggle follow:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로우 상태 확인 (GET /follows/check/{followeeId}) - 숫자 ID 기반
export const checkFollowStatus = async (followeeId: number): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/check/${followeeId}`)
    const result: ApiResponse<boolean> = await response.json()
    
    if (!result.error && typeof result.data === 'boolean') {
      return result.data
    }
    
    return false
  } catch (error) {
    console.error('Failed to check follow status:', error)
    return false
  }
}

// ✅ 팔로잉 목록 조회 (GET /follows/following/{userId}) - 숫자 ID 기반
export const getFollowing = async (userId: number): Promise<{ success: boolean; data?: BackendUserInfoResponse[]; error?: string }> => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/following/${userId}`)
    const result: ApiResponse<BackendUserInfoResponse[]> = await response.json()
    
    if (!result.error && Array.isArray(result.data)) {
      return {
        success: true,
        data: result.data
      }
    }

    return {
      success: false,
      error: result.message || '팔로잉 목록을 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get following list:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로워 목록 조회 (GET /follows/followers/{userId}) - 숫자 ID 기반
export const getFollowers = async (userId: number): Promise<{ success: boolean; data?: BackendUserInfoResponse[]; error?: string }> => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/followers/${userId}`)
    const result: ApiResponse<BackendUserInfoResponse[]> = await response.json()
    
    if (!result.error && Array.isArray(result.data)) {
      return {
        success: true,
        data: result.data
      }
    }

    return {
      success: false,
      error: result.message || '팔로워 목록을 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get followers list:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로우 수 조회 (GET /follows/count/{userId}) - 숫자 ID 기반
export const getFollowCounts = async (userId: number): Promise<{ success: boolean; data?: BackendFollowCountsResponse; error?: string }> => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/count/${userId}`)
    const result: ApiResponse<BackendFollowCountsResponse> = await response.json()
    
    if (!result.error && result.data) {
      return {
        success: true,
        data: result.data
      }
    }

    return {
      success: false,
      error: result.message || '팔로우 수를 불러오는데 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to get follow counts:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// === 호환성을 위한 기존 함수들 (페이지네이션 방식) ===

// 피드 목록 조회 (기존 방식 호환)
export const getFeeds = async (
  userId?: string,
  page: number = 1,
  limit: number = 12
): Promise<{ success: boolean; data?: PaginatedResponse<CanvasFeedItem>; error?: string }> => {
  try {
    if (userId) {
      // 사용자별 피드 조회
      const result = await getUserFeeds(parseInt(userId), undefined, undefined, limit)
      if (result.success && result.data) {
        return {
          success: true,
          data: {
            items: result.data.items,
            hasMore: result.data.hasMore,
            total: result.data.items.length,
            page,
            limit
          }
        }
      }
      return {
        success: false,
        error: result.error
      }
    } else {
      // 랜덤 피드 조회
      const result = await getRandomFeeds(limit)
      if (result.success && result.data) {
        return {
          success: true,
          data: {
            items: result.data.items,
            hasMore: result.data.hasMore,
            total: result.data.items.length,
            page,
            limit
          }
        }
      }
      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    console.error('Failed to get feeds:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// 지원하지 않는 기능들
export const updateFeed = async (
  feedId: string, 
  updateData: UpdateFeedData
): Promise<{ success: boolean; data?: CanvasFeedItem; error?: string }> => {
  return {
    success: false,
    error: '피드 업데이트는 현재 백엔드에서 지원되지 않습니다.'
  }
}

export const addElementToFeed = async (
  feedId: string,
  element: Omit<FeedElement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; data?: FeedElement; error?: string }> => {
  return {
    success: false,
    error: '요소 추가는 현재 백엔드에서 지원되지 않습니다.'
  }
}

export const updateElementInFeed = async (
  feedId: string,
  elementId: string,
  updateData: Partial<FeedElement>
): Promise<{ success: boolean; data?: FeedElement; error?: string }> => {
  return {
    success: false,
    error: '요소 업데이트는 현재 백엔드에서 지원되지 않습니다.'
  }
}

export const removeElementFromFeed = async (
  feedId: string,
  elementId: string
): Promise<{ success: boolean; error?: string }> => {
  return {
    success: false,
    error: '요소 삭제는 현재 백엔드에서 지원되지 않습니다.'
  }
}

export const updateFeedBackground = async (
  feedId: string,
  backgroundColor: string
): Promise<{ success: boolean; data?: CanvasFeedItem; error?: string }> => {
  return updateFeed(feedId, { backgroundColor })
}

export const updateFeedBackgroundImage = async (
  feedId: string,
  backgroundImageUrl: string | undefined
): Promise<{ success: boolean; data?: CanvasFeedItem; error?: string }> => {
  return updateFeed(feedId, { backgroundImageUrl })
}

// 제거된 함수들 (백엔드에서 지원하지 않음)
export const getLikeCount = async (feedId: number): Promise<number> => {
  console.warn('getLikeCount: 백엔드에서 좋아요 수 조회 API를 지원하지 않습니다.')
  return 0
}

// === 인증 및 유틸리티 함수들 ===

// ✅ 현재 사용자 정보 가져오기 (accountName 포함)
export const getCurrentUser = async (): Promise<CurrentUserResponse | null> => {
  const token = getAuthToken()
  if (!token) return null
  
  try {
    // JWT 토큰에서 email과 social 정보 추출
    const payload = JSON.parse(atob(token.split('.')[1]))
    console.log('JWT 토큰 페이로드:', payload)
    
    const email = payload.email
    const social = payload.social
    const name = payload.name
    
    if (!email || !social) {
      throw new Error('토큰에 필요한 정보가 없습니다.')
    }
    
    // 🔥 핵심: UserRepository.searchByAccountNameOnly를 활용해서 현재 사용자 찾기
    // email을 accountName으로 사용해서 검색 (임시 방법)
    const searchQuery = email.split('@')[0] // 이메일 앞부분을 accountName으로 사용
    
    try {
      // 검색 API를 이용해서 현재 사용자 정보 얻기
      const response = await fetchWithAuth(`/feeds/search?query=${searchQuery}&size=1`)
      const result: ApiResponse<BackendFeedDetailResponse[]> = await response.json()
      
      if (!result.error && result.data && result.data.length > 0) {
        const feedData = result.data[0]
        return {
          id: feedData.authorId.toString(),
          name: feedData.accountName,
          accountName: feedData.accountName
        }
      }
    } catch (searchError) {
      console.warn('검색 API로 사용자 정보 조회 실패:', searchError)
    }
    
    // 검색 실패 시 JWT 토큰 정보로 임시 사용자 정보 생성
    const accountName = email.split('@')[0]
    return {
      id: '1', // 임시 ID
      name: name || accountName,
      accountName: accountName
    }
    
  } catch (error) {
    console.error('Failed to get current user:', error)
    if (typeof window !== 'undefined') {
      const authState = useAuthStore.getState();
      authState.clearTokens();
    }
    return null
  }
}

// ✅ accountName이 없는 경우 임시 해결책
export const getCurrentUserWithAccountName = async (): Promise<CurrentUserResponse | null> => {
  try {
    // 1. 기존 getCurrentUser 호출
    const currentUser = await getCurrentUser()
    if (!currentUser) return null
    
    // 2. accountName이 이미 있다면 그대로 반환
    if (currentUser.accountName) {
      return currentUser
    }
    
    // 3. accountName이 없다면 별도 조회 (임시 방법)
    // TODO: 백엔드에서 getCurrentUser API에 accountName 추가하면 이 로직 제거
    console.warn('getCurrentUser에 accountName이 없어서 임시 처리합니다.')
    
    // 현재로서는 accountName을 알 수 없으므로 userId를 accountName으로 사용
    return {
      id: currentUser.id,
      name: currentUser.name,
      accountName: `user_${currentUser.id}` // 임시 처리
    }
    
  } catch (error) {
    console.error('Failed to get current user with accountName:', error)
    return null
  }
}

// 인증 토큰 설정
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    const authState = useAuthStore.getState();
    authState.setTokens(token, token); // accessToken, refreshToken 동일하게 설정
  }
}

// 로그아웃
export const logout = (): void => {
  if (typeof window !== 'undefined') {
    const authState = useAuthStore.getState();
    authState.clearTokens();
  }
  userCache.clear()
}

// API 에러 처리 헬퍼 (다른 API 파일에서도 사용할 수 있도록 export)
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return '알 수 없는 오류가 발생했습니다.'
}

// 개발용 함수들
export const initializeDummyFeeds = (): void => {
  console.log('Dummy data initialization is not needed with backend API')
}

export const clearAllFeedData = (): void => {
  console.log('Clear data is not applicable with backend API')
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
// src/lib/api/feed.ts

import { FeedElement, UserFeed } from '@/lib/types/feed'

// ✅ 백엔드 ApiResponse 구조에 정확히 맞춤
interface ApiResponse<T> {
  error: boolean      // success가 아니라 error 필드
  message: string | null
  data: T | null
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

// ✅ 백엔드 UserInfoResponse
interface BackendUserInfoResponse {
  userName: string
  userEmail: string
  profileImage: string
  prettyFace: string
}

// ✅ 프론트엔드 타입들
interface CanvasFeedItem extends Omit<UserFeed, 'photoId'> {
  elements: FeedElement[]
  authorId: string
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

// API 설정
const API_BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  return url.replace(/\/$/, '')
})()

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
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
}

// ✅ HTTP 요청 헬퍼 (다른 API 파일에서도 사용할 수 있도록 export)
export const fetchWithAuth = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      logout()
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
    }

    if (response.status === 403) {
      throw new Error('접근 권한이 없습니다.')
    }

    if (response.status === 404) {
      throw new Error('요청한 리소스를 찾을 수 없습니다.')
    }

    if (!response.ok) {
      // ✅ 백엔드 에러 응답 구조에 맞춰 수정
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
    
    authorId: backendFeed.authorId.toString(),
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

// ✅ 팔로우/언팔로우 (POST/DELETE /follows/{followeeId})
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

// ✅ 팔로우 상태 확인 (GET /follows/check/{followeeId})
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

// ✅ 팔로잉 목록 조회 (GET /follows/following/{userId})
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

// ✅ 팔로워 목록 조회 (GET /follows/followers/{userId})
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

// ✅ 팔로우 수 조회 (GET /follows/count/{userId})
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

// ✅ 현재 사용자 정보 (JWT 기반 또는 별도 API)
export const getCurrentUser = async (): Promise<{ id: string; name: string } | null> => {
  const token = getAuthToken()
  if (!token) return null
  
  try {
    // TODO: 백엔드에 현재 사용자 정보 API 추가 필요
    // GET /auth/me 또는 /users/me 엔드포인트
    const response = await fetchWithAuth(`${API_ENDPOINTS.auth}/me`)
    const result: ApiResponse<{ userId: number; userName: string }> = await response.json()
    
    if (!result.error && result.data) {
      return {
        id: result.data.userId.toString(),
        name: result.data.userName
      }
    }
    
    throw new Error('사용자 정보를 가져올 수 없습니다.')
  } catch (error) {
    console.error('Failed to get current user:', error)
    logout()
    return null
  }
}

// 인증 토큰 설정
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token)
}

// 로그아웃
export const logout = (): void => {
  localStorage.removeItem('authToken')
  sessionStorage.removeItem('authToken')
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
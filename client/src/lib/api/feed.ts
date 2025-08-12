// src/lib/api/feed.ts
import { useAuthStore } from '@/stores/authStore'
import { 
  FeedElement, 
  UserFeed, 
  BackendApiResponse,      // 🔥 수정: 통일된 타입 사용
  BackendFeedDetailResponse,
  BackendCreateFeedRequest,
  BackendFollowCountsResponse,
  BackendUserInfoResponse,
  BackendUserProfileResponse
} from '@/lib/types/feed'

// 🔥 수정: ApiResponse를 BackendApiResponse의 별칭으로 사용
type ApiResponse<T> = BackendApiResponse<T>

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
      // 🔥 수정: 생성된 피드를 accountName으로 조회하도록 변경
      const currentUser = await getCurrentUser()
      if (currentUser?.accountName) {
        // explore.ts의 getUserFeedByAccountName 사용
        const { getUserFeedByAccountName } = await import('./explore')
        const feedDetailResult = await getUserFeedByAccountName(currentUser.accountName)
        if (feedDetailResult.success && feedDetailResult.data) {
          // ExploreFeed를 CanvasFeedItem으로 변환
          return {
            success: true,
            data: feedDetailResult.data as CanvasFeedItem
          }
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

// 🚨 주의: 이 함수는 더 이상 사용되지 않음 (백엔드에서 삭제됨)
export const getFeed = async (feedId: string): Promise<{ success: boolean; data?: CanvasFeedItem; error?: string }> => {
  return {
    success: false,
    error: 'getFeed API는 더 이상 지원되지 않습니다. getUserFeedByAccountName을 사용하세요.'
  }
}

// 🚨 주의: 이 함수는 더 이상 사용되지 않음 (백엔드에서 삭제됨)
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
  return {
    success: false,
    error: 'getUserFeeds API는 더 이상 지원되지 않습니다. explore.ts의 함수들을 사용하세요.'
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

// 나머지 함수들은 동일하게 유지...
// (좋아요, 팔로우 관련 함수들)

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

// ✅ 현재 사용자 정보 가져오기 (accountName 포함)
export const getCurrentUser = async (): Promise<CurrentUserResponse | null> => {
  const token = getAuthToken()
  if (!token) return null
  
  try {
    // JWT 토큰에서 email과 social 정보 추출
    const payload = JSON.parse(atob(token.split('.')[1]))
    
    const email = payload.email
    const social = payload.social
    const name = payload.name
    
    if (!email || !social) {
      throw new Error('토큰에 필요한 정보가 없습니다.')
    }
    
    // 검색 API를 이용해서 현재 사용자 정보 얻기
    const searchQuery = email.split('@')[0] // 이메일 앞부분을 accountName으로 사용
    
    try {
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

// 나머지 함수들도 동일하게 유지...
// (팔로우 관련, 좋아요 관련, 인증 관련 함수들)

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
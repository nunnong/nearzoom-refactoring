// src/lib/types/timeline.ts
// 🔥 백엔드 연동 점검 및 수정 버전
import { 
  PostResponse,
  PostDetailResponse,
  ApiResponse,
  formatTimeAgo,
  formatLikeCount
} from './feed'

// ============================================================================
// 🎯 백엔드 연동 타임라인 타입들 (PostResponse 기반)
// ============================================================================

// ✅ 타임라인 포스트 (백엔드 PostResponse 기반으로 단순화)
export interface TimelinePost {
  // 🔥 백엔드 PostResponse와 완전히 일치
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
  
  // 🔥 타임라인에서만 추가로 필요한 필드
  source: 'timeline' | 'explore'  // 데이터 출처
  
  // UI 전용 계산 필드들 (선택적)
  timeAgo?: string
  formattedLikeCount?: string
}

// ✅ 타임라인 API 응답 (백엔드 ApiResponse 구조 사용)
export type TimelineApiResponse = ApiResponse<PostResponse[]>

// ✅ Explore API 응답 (백엔드 ApiResponse 구조 사용)
export type ExploreApiResponse = ApiResponse<PostResponse[]>

// ✅ 타임라인 상태 관리
export interface TimelineState {
  posts: TimelinePost[]
  loading: boolean
  error: string | null
  hasMore: boolean
  type: 'timeline' | 'explore'
  lastUpdated: string
}

export type { PostResponse, PostDetailResponse, ApiResponse } from './feed'

// ============================================================================
// 상호작용 타입들 (백엔드 API 기반)
// ============================================================================

// ✅ 좋아요 토글 결과
export interface LikeActionResult {
  success: boolean
  postId: number
  isLiked: boolean
  likeCount?: number
  error?: string
}

// ✅ 팔로우 토글 결과
export interface FollowActionResult {
  success: boolean
  accountName: string
  isFollowing: boolean
  error?: string
}

// ============================================================================
// 백엔드 데이터 변환 함수들
// ============================================================================

// ✅ 백엔드 PostResponse를 TimelinePost로 변환
export const transformPostResponseToTimelinePost = (
  postResponse: PostResponse,
  source: TimelinePost['source'] = 'explore'
): TimelinePost => {
  return {
    // 백엔드 PostResponse 필드들 그대로 복사
    postId: postResponse.postId,
    photoId: postResponse.photoId,
    imgUrl: postResponse.imgUrl,
    caption: postResponse.caption,
    displayOrder: postResponse.displayOrder,
    createdAt: postResponse.createdAt,
    likeCount: postResponse.likeCount,
    isLikedByMe: postResponse.isLikedByMe,
    authorId: postResponse.authorId,
    authorAccountName: postResponse.authorAccountName,
    authorProfileImage: postResponse.authorProfileImage,
    
    // 타임라인 전용 필드
    source,
    
    // UI 계산 필드들 (feed.ts의 유틸리티 재사용)
    timeAgo: formatTimeAgo(postResponse.createdAt),
    formattedLikeCount: formatLikeCount(postResponse.likeCount),
  }
}

// FeedWithPostsResponse 타입 정의 추가
export interface FeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  isFollowing: boolean;
}

// ✅ 백엔드 PostResponse 배열을 TimelinePost 배열로 변환
export const transformPostsToTimeline = (
  posts: PostResponse[],
  source: TimelinePost['source']
): TimelinePost[] => {
  return posts.map(post => transformPostResponseToTimelinePost(post, source))
}

// ============================================================================
// 타임라인 유틸리티 함수들
// ============================================================================

// ✅ 타임라인 포스트 정렬 (최신순)
export const sortTimelinePosts = (posts: TimelinePost[]): TimelinePost[] => {
  return [...posts].sort((a, b) => {
    // 최신순: 생성일 역순, 같으면 postId 역순
    const dateCompare = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (dateCompare !== 0) return dateCompare
    return b.postId - a.postId
  })
}

// ✅ 타임라인 포스트 병합 (중복 제거)
export const mergeTimelinePosts = (
  existingPosts: TimelinePost[],
  newPosts: TimelinePost[]
): TimelinePost[] => {
  const existingIds = new Set(existingPosts.map(post => post.postId))
  const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.postId))
  return [...existingPosts, ...uniqueNewPosts]
}

// ✅ 타임라인 포스트 업데이트 (좋아요 상태 변경)
export const updateTimelinePostLike = (
  posts: TimelinePost[],
  postId: number,
  isLiked: boolean,
  likeCount?: number
): TimelinePost[] => {
  return posts.map(post => 
    post.postId === postId 
      ? { 
          ...post, 
          isLikedByMe: isLiked,
          likeCount: likeCount ?? (isLiked ? post.likeCount + 1 : post.likeCount - 1),
          formattedLikeCount: formatLikeCount(likeCount ?? (isLiked ? post.likeCount + 1 : post.likeCount - 1))
        }
      : post
  )
}

// ============================================================================
// 🔥 백엔드 API와 정확히 일치하도록 수정된 API 함수 타입들
// ============================================================================

// 🔧 수정: 백엔드가 ApiResponse<PostResponse[]>가 아니라 PostResponse[] 직접 반환
export type GetTimelinePostsFunction = (
  params?: {
    size?: number
  }
) => Promise<PostResponse[]>  // 🔥 ApiResponse 래핑 제거

export type GetExplorePostsFunction = (
  params?: {
    size?: number
  }
) => Promise<PostResponse[]>  // 🔥 ApiResponse 래핑 제거

// 🔧 수정: 백엔드 PostDetailResponse 직접 반환
export type GetPostDetailFunction = (
  postId: number
) => Promise<PostDetailResponse>  // 🔥 ApiResponse 래핑 제거

// 🔧 수정: 좋아요 토글은 void 반환 (상태는 클라이언트가 관리)
export type TogglePostLikeFunction = (
  postId: number,
  currentLikeStatus: boolean
) => Promise<void>  // 🔥 boolean 대신 void

// 🔧 수정: 백엔드 boolean 직접 반환
export type CheckLikeStatusFunction = (
  postId: number
) => Promise<boolean>  // 🔥 ApiResponse 래핑 제거

// 🔧 수정: 백엔드 number 직접 반환
export type GetLikeCountFunction = (
  postId: number
) => Promise<number>  // 🔥 ApiResponse 래핑 제거

// 🔧 수정: 팔로우 토글도 void 반환
export type ToggleFollowFunction = (
  accountName: string,
  currentFollowStatus: boolean
) => Promise<void>  // 🔥 boolean 대신 void

// 🔧 수정: 백엔드 boolean 직접 반환
export type CheckFollowStatusFunction = (
  accountName: string
) => Promise<boolean>  // 🔥 ApiResponse 래핑 제거

// ============================================================================
// 🔥 백엔드 실제 엔드포인트와 일치하도록 수정된 상수들
// ============================================================================

// 🔧 수정: feed.ts의 API_ENDPOINTS와 중복 제거, 실제 백엔드 엔드포인트만 정의
export const TIMELINE_ENDPOINTS = {
  // 백엔드 FeedController
  TIMELINE: '/feeds/timeline',           // GET /feeds/timeline
  EXPLORE: '/feeds/explore',             // GET /feeds/explore  
  POST_DETAIL: (postId: number) => `/feeds/posts/${postId}`,  // GET /feeds/posts/{postId}
  
  // 백엔드 LikesController - 🔥 수정: /likes/posts/{postId} 사용
  LIKE_POST: (postId: number) => `/likes/posts/${postId}`,      // POST /likes/posts/{postId}
  UNLIKE_POST: (postId: number) => `/likes/posts/${postId}`,    // DELETE /likes/posts/{postId}
  CHECK_LIKE: (postId: number) => `/likes/posts/${postId}/check`,      // GET /likes/posts/{postId}/check
  GET_LIKE_COUNT: (postId: number) => `/likes/posts/${postId}/count`,  // GET /likes/posts/{postId}/count
  
  // 백엔드 FollowController - 🔥 수정: accountName 기반
  FOLLOW_USER: (accountName: string) => `/follows/${accountName}`,         // POST /follows/{accountName}
  UNFOLLOW_USER: (accountName: string) => `/follows/${accountName}`,       // DELETE /follows/{accountName}
  CHECK_FOLLOW: (accountName: string) => `/follows/check/${accountName}`,  // GET /follows/check/{accountName}
} as const

// ============================================================================
// 타임라인 액션 타입들 (Redux/Zustand용)
// ============================================================================

export type TimelineAction = 
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; posts: TimelinePost[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; posts: TimelinePost[] }
  | { type: 'APPEND_POSTS'; posts: TimelinePost[] }
  | { type: 'UPDATE_LIKE'; postId: number; isLiked: boolean; likeCount?: number }
  | { type: 'CLEAR_POSTS' }
  | { type: 'SET_TYPE'; sourceType: 'timeline' | 'explore' }

// ============================================================================
// 🔥 백엔드 파라미터와 정확히 일치하도록 수정된 요청 타입들
// ============================================================================

// ✅ 타임라인 요청 파라미터 (백엔드 FeedController.getTimelinePosts 파라미터와 일치)
export interface TimelineRequestParams {
  size?: number  // 백엔드 기본값: 20
}

// ✅ Explore 요청 파라미터 (백엔드 FeedController.getExplorePosts 파라미터와 일치)
export interface ExploreRequestParams {
  size?: number  // 백엔드 기본값: 20
}

// ============================================================================
// 타입 가드 함수들
// ============================================================================

// ✅ TimelinePost 타입 가드
export const isTimelinePost = (obj: any): obj is TimelinePost => {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.postId === 'number' &&
    typeof obj.photoId === 'number' &&
    typeof obj.imgUrl === 'string' &&
    (obj.caption === null || typeof obj.caption === 'string') &&
    typeof obj.createdAt === 'string' &&
    typeof obj.likeCount === 'number' &&
    typeof obj.isLikedByMe === 'boolean' &&
    typeof obj.authorId === 'number' &&
    typeof obj.authorAccountName === 'string' &&
    ['timeline', 'explore'].includes(obj.source)
}

// ✅ API 응답 타입 가드
export const isValidApiResponse = <T>(obj: any): obj is ApiResponse<T> => {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.error === 'boolean' &&
    (obj.message === null || typeof obj.message === 'string')
}

// ============================================================================
// 🔥 백엔드 설정과 일치하도록 수정된 상수들
// ============================================================================

export const TIMELINE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,    // 백엔드 기본값과 일치
  MAX_PAGE_SIZE: 50,        // 백엔드 제한과 일치
  REFRESH_INTERVAL: 30000,  // 30초
  CACHE_DURATION: 300000,   // 5분
} as const

export const TIMELINE_SOURCES = {
  TIMELINE: 'timeline',  // /feeds/timeline 데이터
  EXPLORE: 'explore'     // /feeds/explore 데이터
} as const

// ============================================================================
// 🔥 백엔드 에러 코드와 일치하도록 수정된 에러 타입들
// ============================================================================

export interface TimelineError {
  code: string
  message: string
  details?: any
}

// 🔧 수정: 백엔드 실제 HTTP 상태코드와 일치
export const TIMELINE_ERROR_CODES = {
  // HTTP 상태코드
  NETWORK_ERROR: 'NETWORK_ERROR',     // 네트워크 오류
  UNAUTHORIZED: 'UNAUTHORIZED',       // 401 - 토큰 만료/인증 실패
  FORBIDDEN: 'FORBIDDEN',             // 403 - 권한 없음
  NOT_FOUND: 'NOT_FOUND',             // 404 - 리소스 없음
  
  // 비즈니스 로직 에러
  LOAD_FAILED: 'LOAD_FAILED',         // 데이터 로드 실패
  LIKE_FAILED: 'LIKE_FAILED',         // 좋아요 처리 실패
  FOLLOW_FAILED: 'FOLLOW_FAILED',     // 팔로우 처리 실패
  POST_NOT_FOUND: 'POST_NOT_FOUND',   // 게시물 없음
} as const

// ============================================================================
// 🔥 추가: 백엔드 연동을 위한 실용적인 헬퍼 함수들
// ============================================================================

/**
 * 백엔드 API 에러를 TimelineError로 변환
 */
export const transformApiErrorToTimelineError = (error: any): TimelineError => {
  if (error?.response?.status === 401) {
    return {
      code: TIMELINE_ERROR_CODES.UNAUTHORIZED,
      message: '로그인이 필요합니다.',
      details: error
    }
  }
  
  if (error?.response?.status === 403) {
    return {
      code: TIMELINE_ERROR_CODES.FORBIDDEN,
      message: '권한이 없습니다.',
      details: error
    }
  }
  
  if (error?.response?.status === 404) {
    return {
      code: TIMELINE_ERROR_CODES.NOT_FOUND,
      message: '요청한 리소스를 찾을 수 없습니다.',
      details: error
    }
  }
  
  return {
    code: TIMELINE_ERROR_CODES.NETWORK_ERROR,
    message: error?.message || '알 수 없는 오류가 발생했습니다.',
    details: error
  }
}

/**
 * 타임라인 포스트의 새로고침 시간 확인
 */
export const shouldRefreshTimeline = (lastUpdated: string, intervalMs = TIMELINE_CONSTANTS.REFRESH_INTERVAL): boolean => {
  const now = Date.now()
  const lastUpdateTime = new Date(lastUpdated).getTime()
  return now - lastUpdateTime > intervalMs
}

/**
 * 좋아요 상태 낙관적 업데이트를 위한 헬퍼
 */
export const createOptimisticLikeUpdate = (
  posts: TimelinePost[],
  postId: number
): TimelinePost[] => {
  return posts.map(post => 
    post.postId === postId 
      ? {
          ...post,
          isLikedByMe: !post.isLikedByMe,
          likeCount: post.isLikedByMe ? post.likeCount - 1 : post.likeCount + 1,
          formattedLikeCount: formatLikeCount(post.isLikedByMe ? post.likeCount - 1 : post.likeCount + 1)
        }
      : post
  )
}

// ============================================================================
// 🔥 useTimeline 훅에서 사용할 기본값들
// ============================================================================

export const TIMELINE_DEFAULTS = {
  // API 요청 기본값 (백엔드 FeedController와 일치)
  PAGE_SIZE: 20,                    // 백엔드 기본값: @RequestParam(defaultValue = "20")
  MAX_PAGE_SIZE: 50,                // 백엔드 제한값
  
  // 상태 관리 기본값
  INITIAL_STATE: {
    posts: [],
    loading: false,
    error: null,
    hasMore: true,
    type: 'explore' as const,       // 기본값은 explore
    lastUpdated: new Date().toISOString()
  } satisfies TimelineState,
  
  // 새로고침 및 캐시 설정
  REFRESH_INTERVAL: 30000,          // 30초
  CACHE_DURATION: 300000,           // 5분
  
  // 에러 메시지
  ERROR_MESSAGES: {
    NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
    UNAUTHORIZED: '로그인이 필요합니다.',
    FORBIDDEN: '권한이 없습니다.',
    NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
    LOAD_FAILED: '데이터를 불러오는데 실패했습니다.',
    LIKE_FAILED: '좋아요 처리에 실패했습니다.',
    FOLLOW_FAILED: '팔로우 처리에 실패했습니다.',
    POST_NOT_FOUND: '게시물을 찾을 수 없습니다.'
  },
  
  // 요청 옵션 기본값
  REQUEST_OPTIONS: {
    timeline: { size: 20 } satisfies TimelineRequestParams,
    explore: { size: 20 } satisfies ExploreRequestParams
  }
} as const
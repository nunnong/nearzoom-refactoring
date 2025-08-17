// src/lib/types/timeline.ts
// 🔥 백엔드 커서 기반 무한 스크롤 연동 버전

import { 
  PostResponse,
  PostListResponse,
  PostDetailResponse,
  ApiResponse,
  CursorPaginationParams,
  formatTimeAgo,
  formatLikeCount
} from './feed'

// ============================================================================
// 🎯 백엔드 커서 기반 무한 스크롤 타임라인 타입들
// ============================================================================

// ✅ 타임라인 포스트 (백엔드 PostResponse + 무한 스크롤 메타데이터)
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

// ✅ 타임라인 API 응답 (백엔드 PostListResponse 구조 - 마이룸 방식)
export type TimelineApiResponse = ApiResponse<PostListResponse>

// ✅ Explore API 응답 (백엔드 PostListResponse 구조 - 마이룸 방식)
export type ExploreApiResponse = ApiResponse<PostListResponse>

// ✅ 커서 기반 무한 스크롤 상태 관리 (🔐 인증 상태 추가)
export interface TimelineState {
  posts: TimelinePost[]
  loading: boolean
  refreshing: boolean  // 새로고침 중 상태
  error: string | null
  // 📱 마이룸 방식 무한 스크롤
  hasNext: boolean
  nextCursor: number | null
  type: 'timeline' | 'explore'
  lastUpdated: string
  
  // 🔐 아키텍처 원칙: 무조건 로그인 필수
  isAuthenticated: boolean
  requiresLogin: boolean
}

export type { PostResponse, PostListResponse, PostDetailResponse, ApiResponse } from './feed'

// ============================================================================
// 🚀 커서 기반 무한 스크롤 파라미터들
// ============================================================================

// ✅ 타임라인 요청 파라미터 (백엔드 FeedController와 완전 일치)
export interface TimelineRequestParams extends CursorPaginationParams {
  // limit?: number     // 기본값: 20 (from CursorPaginationParams)
  // cursor?: number    // 커서 (마지막 postId)
}

// ✅ Explore 요청 파라미터 (백엔드 FeedController와 완전 일치)
export interface ExploreRequestParams extends CursorPaginationParams {
  // limit?: number     // 기본값: 20
  // cursor?: number    // 커서 (마지막 postId)
}

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
// 백엔드 데이터 변환 함수들 (커서 기반)
// ============================================================================

// ✅ 백엔드 PostListResponse를 TimelinePost 배열로 변환
export const transformPostListToTimeline = (
  postListResponse: PostListResponse,
  source: TimelinePost['source'] = 'explore'
): {
  posts: TimelinePost[]
  hasNext: boolean
  nextCursor: number | null
} => {
  const timelinePosts = postListResponse.posts.map(post => 
    transformPostResponseToTimelinePost(post, source)
  )
  
  return {
    posts: timelinePosts,
    hasNext: postListResponse.hasNext,
    nextCursor: postListResponse.nextCursor
  }
}

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

// ============================================================================
// 📱 커서 기반 무한 스크롤 유틸리티 함수들
// ============================================================================

// ✅ 타임라인 포스트 병합 (커서 기반 - 중복 제거 + 정렬 유지)
export const mergeTimelinePostsWithCursor = (
  existingPosts: TimelinePost[],
  newPosts: TimelinePost[]
): TimelinePost[] => {
  const existingIds = new Set(existingPosts.map(post => post.postId))
  const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.postId))
  
  // 📱 마이룸 방식: postId 역순으로 정렬 (최신순)
  return [...existingPosts, ...uniqueNewPosts].sort((a, b) => b.postId - a.postId)
}

// ✅ 새로고침용 포스트 교체 (전체 교체)
export const replaceTimelinePostsOnRefresh = (
  newPosts: TimelinePost[]
): TimelinePost[] => {
  // 📱 마이룸 방식: postId 역순으로 정렬
  return [...newPosts].sort((a, b) => b.postId - a.postId)
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

// ✅ 다음 커서 계산 (마지막 postId)
export const getNextCursor = (posts: TimelinePost[]): number | null => {
  if (posts.length === 0) return null
  return posts[posts.length - 1].postId
}

// ============================================================================
// 🔥 백엔드 연동 API 함수 타입들 (커서 기반) - 🔐 인증 필수
// ============================================================================

// 🔧 커서 기반 타임라인 조회 (🔐 인증 필수)
export type GetTimelinePostsFunction = (
  params?: TimelineRequestParams
) => Promise<PostListResponse>  // 백엔드 PostListResponse 직접 반환

// 🔧 커서 기반 탐색 조회 (🔐 인증 필수)
export type GetExplorePostsFunction = (
  params?: ExploreRequestParams
) => Promise<PostListResponse>  // 백엔드 PostListResponse 직접 반환

// 🔧 게시물 상세 조회 (🔐 인증 필수)
export type GetPostDetailFunction = (
  postId: number
) => Promise<PostDetailResponse>

// 🔧 좋아요 토글 (void 반환 - 클라이언트가 상태 관리) (🔐 인증 필수)
export type TogglePostLikeFunction = (
  postId: number,
  currentLikeStatus: boolean
) => Promise<void>

// 🔧 좋아요 상태 확인 (🔐 인증 필수)
export type CheckLikeStatusFunction = (
  postId: number
) => Promise<boolean>

// 🔧 좋아요 수 조회 (🔐 인증 필수)
export type GetLikeCountFunction = (
  postId: number
) => Promise<number>

// 🔧 팔로우 토글 (void 반환 - 클라이언트가 상태 관리) (🔐 인증 필수)
export type ToggleFollowFunction = (
  accountName: string,
  currentFollowStatus: boolean
) => Promise<void>

// 🔧 팔로우 상태 확인 (🔐 인증 필수)
export type CheckFollowStatusFunction = (
  accountName: string
) => Promise<boolean>

// ============================================================================
// 🔥 백엔드 실제 엔드포인트 (커서 기반 파라미터 포함) - 🔐 모든 엔드포인트 인증 필수
// ============================================================================

export const TIMELINE_ENDPOINTS = {
  // 백엔드 FeedController (커서 기반 무한 스크롤) - 🔐 인증 필수
  TIMELINE: '/feeds/timeline',           // GET /feeds/timeline?limit=20&cursor=12345
  EXPLORE: '/feeds/explore',             // GET /feeds/explore?limit=20&cursor=12345
  POST_DETAIL: (postId: number) => `/feeds/posts/${postId}`,
  
  // 백엔드 LikesController (postId 기반) - 🔐 인증 필수
  LIKE_POST: (postId: number) => `/likes/posts/${postId}`,      // POST
  UNLIKE_POST: (postId: number) => `/likes/posts/${postId}`,    // DELETE
  CHECK_LIKE: (postId: number) => `/likes/posts/${postId}/check`,
  GET_LIKE_COUNT: (postId: number) => `/likes/posts/${postId}/count`,
  
  // 백엔드 FollowController (accountName 기반) - 🔐 인증 필수
  FOLLOW_USER: (accountName: string) => `/follows/${accountName}`,         // POST
  UNFOLLOW_USER: (accountName: string) => `/follows/${accountName}`,       // DELETE
  CHECK_FOLLOW: (accountName: string) => `/follows/check/${accountName}`,
} as const

// ============================================================================
// 📱 커서 기반 무한 스크롤 액션 타입들 (🔐 인증 액션 추가)
// ============================================================================

export type TimelineAction = 
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; posts: TimelinePost[]; hasNext: boolean; nextCursor: number | null }
  | { type: 'LOAD_MORE_SUCCESS'; posts: TimelinePost[]; hasNext: boolean; nextCursor: number | null }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; posts: TimelinePost[]; hasNext: boolean; nextCursor: number | null }
  | { type: 'UPDATE_LIKE'; postId: number; isLiked: boolean; likeCount?: number }
  | { type: 'CLEAR_POSTS' }
  | { type: 'SET_TYPE'; sourceType: 'timeline' | 'explore' }
  | { type: 'RESET_CURSOR' }
  // 🔐 아키텍처 원칙: 인증 관련 액션
  | { type: 'AUTH_REQUIRED' }
  | { type: 'AUTH_RESTORED'; isAuthenticated: boolean }

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

// ✅ PostListResponse 타입 가드
export const isValidPostListResponse = (obj: any): obj is PostListResponse => {
  return obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.posts) &&
    typeof obj.hasNext === 'boolean' &&
    (obj.nextCursor === null || typeof obj.nextCursor === 'number')
}

// ============================================================================
// 🔥 백엔드 설정과 일치하도록 수정된 상수들 (커서 기반)
// ============================================================================

export const TIMELINE_CONSTANTS = {
  // 📱 백엔드 기본값과 일치
  DEFAULT_LIMIT: 20,        // 백엔드 @RequestParam(defaultValue = "20")
  MAX_LIMIT: 50,            // 백엔드 제한값
  
  // 📱 디바이스별 최적 limit (마이룸 방식)
  MOBILE_LIMIT: 12,
  TABLET_LIMIT: 18,
  DESKTOP_LIMIT: 24,
  
  // 캐시 및 새로고침 설정
  REFRESH_INTERVAL: 30000,  // 30초
  CACHE_DURATION: 300000,   // 5분
} as const

export const TIMELINE_SOURCES = {
  TIMELINE: 'timeline',  // /feeds/timeline 데이터
  EXPLORE: 'explore'     // /feeds/explore 데이터
} as const

// ============================================================================
// 🔥 백엔드 에러 코드와 일치하도록 수정된 에러 타입들 (🔐 인증 오류 우선)
// ============================================================================

export interface TimelineError {
  code: string
  message: string
  details?: any
}

export const TIMELINE_ERROR_CODES = {
  // 🔐 인증 관련 오류 (최우선)
  UNAUTHORIZED: 'UNAUTHORIZED',       // 401 - 로그인 필요
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',   // 로그인 필수
  
  // HTTP 상태코드
  NETWORK_ERROR: 'NETWORK_ERROR',
  FORBIDDEN: 'FORBIDDEN',             // 403
  NOT_FOUND: 'NOT_FOUND',             // 404
  
  // 비즈니스 로직 에러
  LOAD_FAILED: 'LOAD_FAILED',
  LIKE_FAILED: 'LIKE_FAILED',
  FOLLOW_FAILED: 'FOLLOW_FAILED',
  POST_NOT_FOUND: 'POST_NOT_FOUND',
  PAGINATION_ERROR: 'PAGINATION_ERROR',  // 커서 관련 에러
} as const

// ============================================================================
// 🔥 커서 기반 무한 스크롤 헬퍼 함수들 (🔐 인증 체크 강화)
// ============================================================================

/**
 * 백엔드 API 에러를 TimelineError로 변환 (🔐 인증 오류 우선 처리)
 */
export const transformApiErrorToTimelineError = (error: any): TimelineError => {
  // 🔐 인증 오류 우선 체크
  if (error?.response?.status === 401 || 
      error?.message?.includes('unauthorized') ||
      error?.message?.includes('로그인이 필요')) {
    return {
      code: TIMELINE_ERROR_CODES.UNAUTHORIZED,
      message: '로그인이 필요합니다. 다시 로그인해주세요.',
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
 * 📱 커서 기반 URL 파라미터 생성 (마이룸 방식)
 */
export const buildTimelineCursorQuery = (params: TimelineRequestParams): string => {
  const queryParams = new URLSearchParams()
  
  if (params.limit) {
    queryParams.append('limit', params.limit.toString())
  }
  
  if (params.cursor) {
    queryParams.append('cursor', params.cursor.toString())
  }
  
  return queryParams.toString()
}

/**
 * 📱 디바이스별 최적 limit 계산
 */
export const getOptimalTimelineLimit = (deviceType: 'mobile' | 'tablet' | 'desktop'): number => {
  switch (deviceType) {
    case 'mobile': return TIMELINE_CONSTANTS.MOBILE_LIMIT
    case 'tablet': return TIMELINE_CONSTANTS.TABLET_LIMIT
    case 'desktop': return TIMELINE_CONSTANTS.DESKTOP_LIMIT
    default: return TIMELINE_CONSTANTS.DEFAULT_LIMIT
  }
}

/**
 * 타임라인 포스트의 새로고침 시간 확인
 */
export const shouldRefreshTimeline = (
  lastUpdated: string, 
  intervalMs = TIMELINE_CONSTANTS.REFRESH_INTERVAL
): boolean => {
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

/**
 * 📱 커서 초기화 (새로고침용)
 */
export const resetTimelineCursor = (): { nextCursor: null; hasNext: boolean } => ({
  nextCursor: null,
  hasNext: true
})

// 🔐 로그아웃 시 타임라인 리셋 (아키텍처 원칙: 무조건 로그인 필수)
export const resetTimelineOnLogout = (): TimelineState => ({
  posts: [],
  loading: false,
  refreshing: false,
  error: '로그인이 필요합니다.',
  hasNext: false,
  nextCursor: null,
  type: 'explore',
  lastUpdated: new Date().toISOString(),
  isAuthenticated: false,
  requiresLogin: true,
})

// ============================================================================
// 🔥 useTimeline 훅에서 사용할 기본값들 (커서 기반) - 🔐 인증 상태 포함
// ============================================================================

export const TIMELINE_DEFAULTS = {
  // 📱 API 요청 기본값 (백엔드 FeedController와 일치)
  LIMIT: TIMELINE_CONSTANTS.DEFAULT_LIMIT,
  MAX_LIMIT: TIMELINE_CONSTANTS.MAX_LIMIT,
  
  // 📱 커서 기반 상태 관리 기본값 (🔐 인증 상태 포함)
  INITIAL_STATE: {
    posts: [],
    loading: false,
    refreshing: false,
    error: null,
    hasNext: true,
    nextCursor: null,
    type: 'explore' as const,
    lastUpdated: new Date().toISOString(),
    // 🔐 아키텍처 원칙: 무조건 로그인 필수
    isAuthenticated: false,  // 초기에는 false, 인증 확인 후 업데이트
    requiresLogin: false,    // 초기에는 false, 필요 시 true로 설정
  } satisfies TimelineState,
  
  // 새로고침 및 캐시 설정
  REFRESH_INTERVAL: TIMELINE_CONSTANTS.REFRESH_INTERVAL,
  CACHE_DURATION: TIMELINE_CONSTANTS.CACHE_DURATION,
  
  // 에러 메시지 (🔐 인증 오류 우선)
  ERROR_MESSAGES: {
    // 🔐 인증 관련 오류 (최우선)
    UNAUTHORIZED: '로그인이 필요합니다. 다시 로그인해주세요.',
    LOGIN_REQUIRED: '이 기능을 사용하려면 로그인이 필요합니다.',
    
    // 일반 오류
    NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
    FORBIDDEN: '권한이 없습니다.',
    NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
    LOAD_FAILED: '데이터를 불러오는데 실패했습니다.',
    LIKE_FAILED: '좋아요 처리에 실패했습니다.',
    FOLLOW_FAILED: '팔로우 처리에 실패했습니다.',
    POST_NOT_FOUND: '게시물을 찾을 수 없습니다.',
    PAGINATION_ERROR: '페이지 로딩 중 오류가 발생했습니다.'
  },
  
  // 📱 요청 옵션 기본값 (커서 기반)
  REQUEST_OPTIONS: {
    timeline: { limit: TIMELINE_CONSTANTS.DEFAULT_LIMIT } satisfies TimelineRequestParams,
    explore: { limit: TIMELINE_CONSTANTS.DEFAULT_LIMIT } satisfies ExploreRequestParams
  }
} as const
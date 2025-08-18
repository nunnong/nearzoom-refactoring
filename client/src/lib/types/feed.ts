// src/lib/types/feed.ts - 백엔드 연동 중심 피드 시스템 타입 (커서 기반 무한 스크롤 지원)

// ============================================================================
// 🎯 백엔드 연동 중심 피드 시스템 타입 (커서 기반 무한 스크롤 지원)
// ============================================================================

// ✅ 백엔드 ApiResponse 구조 (개선됨 - 인증 오류 처리 강화)
export interface ApiResponse<T> {
  error: boolean
  message: string | null
  data: T | null
  // 🔐 인증 관련 응답 처리
  requiresAuth?: boolean
  tokenExpired?: boolean
}

// ============================================================================
// 📸 게시물 (Post) 관련 타입
// ============================================================================

// ✅ 백엔드 PostResponse와 정확히 일치
export interface PostResponse {
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
}

// ✅ 백엔드 PostListResponse와 정확히 일치 (마이룸 방식 무한 스크롤)
export interface PostListResponse {
  posts: PostResponse[]
  hasNext: boolean
  nextCursor: number | null
}

// ✅ 백엔드 PostDetailResponse와 정확히 일치
export interface PostDetailResponse {
  postId: number
  photoId: number
  imgUrl: string
  caption: string | null
  createdAt: string
  likeCount: number
  isLikedByMe: boolean
  authorId: number
  authorAccountName: string
  authorProfileImage: string | null
  authorFeedId: number
  isMyPost: boolean
  isFollowingAuthor: boolean
}

// ✅ 백엔드 CreatePostFromMyRoomRequest와 정확히 일치
export interface CreatePostFromMyRoomRequest {
  photoId: number
  caption: string
}

// ✅ 백엔드 UpdatePostRequest와 정확히 일치
export interface UpdatePostRequest {
  caption: string
}

// ============================================================================
// 🏠 피드 (Feed) 관련 타입
// ============================================================================

// ✅ 백엔드 FeedWithPostsResponse와 정확히 일치 (페이징 정보 포함)
export interface FeedWithPostsResponse {
  feedId: number
  userId: number
  accountName: string
  profileImage: string | null
  createdAt: string
  posts: PostResponse[]
  isFollowing: boolean
  // 📱 마이룸 방식: 페이징 정보를 같은 레벨에 포함
  hasNext: boolean
  nextCursor: number | null
}

// ✅ 백엔드 FeedSearchResponse와 정확히 일치 (마이룸 방식 무한 스크롤)
export interface FeedSearchResponse {
  feeds: FeedWithPostsResponse[]
  hasNext: boolean
  nextCursor: number | null
}

// ✅ 백엔드 MyFeedStatsResponse와 정확히 일치
export interface MyFeedStatsResponse {
  postCount: number
  totalLikes: number
  followerCount: number
  followingCount: number
}

// ============================================================================
// 👥 팔로우 관련 타입
// ============================================================================

// ✅ 백엔드 FollowCountsResponse와 정확히 일치
export interface FollowCountsResponse {
  followerCount: number
  followingCount: number
}

// ✅ 백엔드 UserProfileResponse와 정확히 일치
export interface UserProfileResponse {
  userId: number
  accountName: string
  userName: string
  userEmail: string
  profileImage: string | null
  prettyFace: string | null
}

// ============================================================================
// 📷 마이룸 연동 타입
// ============================================================================

// ✅ 마이룸에서 피드 업로드용 사진 정보
export interface PhotoForFeedUploadResponse {
  photoId: number
  imgUrl: string
  takenAt: string
  alreadyInFeed: boolean
}

// ============================================================================
// 🔍 프론트엔드 전용 확장 타입들 (UI 상태 관리)
// ============================================================================

// 프론트엔드에서 사용하는 게시물 카드 타입 (PostResponse 확장)
export interface PostCard extends PostResponse {
  // UI 상태 관리용
  isLoading?: boolean
  isLiking?: boolean

  // 추가 계산된 필드들
  timeAgo?: string
  formattedLikeCount?: string

  // 🔐 인증 관련 UI 상태
  requiresAuth?: boolean
  isAuthError?: boolean
}

// 프론트엔드에서 사용하는 피드 페이지 타입 (FeedWithPostsResponse 확장)
export interface FeedPage extends FeedWithPostsResponse {
  // UI 상태 관리용
  isLoading?: boolean

  // 추가 계산된 필드들
  totalPosts?: number
  formattedJoinDate?: string

  // 🔐 인증 관련 UI 상태
  requiresAuth?: boolean
  isAuthError?: boolean
}

// ============================================================================
// 📱 페이지별 API 응답 타입들 (커서 기반 무한 스크롤)
// ============================================================================

// Explore 페이지 - 랜덤 게시물들 (마이룸 방식)
export type ExplorePostsResponse = ApiResponse<PostListResponse>

// Timeline 페이지 - 팔로잉 최신 게시물들 (마이룸 방식)
export type TimelinePostsResponse = ApiResponse<PostListResponse>

// 사용자 피드 페이지 - 특정 사용자의 피드 + 게시물들 (페이징 포함)
export type UserFeedResponse = ApiResponse<FeedWithPostsResponse>

// 피드 검색 결과 (마이룸 방식 무한 스크롤)
export type SearchFeedsResponse = ApiResponse<FeedSearchResponse>

// 게시물 상세 페이지 - 단일 게시물 상세 정보
export type PostDetailApiResponse = ApiResponse<PostDetailResponse>

// 게시물 생성 - 생성된 게시물 ID 반환
export type CreatePostResponse = ApiResponse<number>

// 좋아요 수 조회
export type LikeCountResponse = ApiResponse<number>

// 좋아요 상태 확인
export type LikeStatusResponse = ApiResponse<boolean>

// 팔로우 카운트 조회
export type FollowCountApiResponse = ApiResponse<FollowCountsResponse>

// 팔로워/팔로잉 목록 조회
export type UserListResponse = ApiResponse<UserProfileResponse[]>

// 내 피드 통계
export type MyFeedStatsApiResponse = ApiResponse<MyFeedStatsResponse>

// 마이룸 사진 정보 (피드 업로드용)
export type PhotoForFeedResponse = ApiResponse<PhotoForFeedUploadResponse>

// ============================================================================
// 🔧 API 요청 파라미터 타입들 (마이룸 방식)
// ============================================================================

// 📱 마이룸 방식 페이징 파라미터 (limit + cursor)
export interface CursorPaginationParams {
  limit?: number // 기본값: 20
  cursor?: number | null // 커서 (마지막 아이템 ID)
  // 🔐 인증 관련 (필요시)
  includePrivate?: boolean
}

// 검색 파라미터 (마이룸 방식)
export interface SearchParams extends CursorPaginationParams {
  query: string
}

// 📱 디바이스별 최적 limit 계산 (성능 최적화)
export const getOptimalLimit = (
  deviceType: 'mobile' | 'tablet' | 'desktop'
): number => {
  switch (deviceType) {
    case 'mobile':
      return 12 // 모바일: 적은 수로 빠른 로딩
    case 'tablet':
      return 18 // 태블릿: 중간
    case 'desktop':
      return 24 // 데스크톱: 많은 수로 효율적 로딩
    default:
      return 20
  }
}

// ============================================================================
// 🎨 UI 상태 관리 타입들 (인증 상태 포함)
// ============================================================================

// 게시물 상호작용 상태 (인증 오류 처리 포함)
export interface PostInteractionState {
  isLiking: boolean
  isDeleting: boolean
  isEditing: boolean
  // 🔐 인증 관련 상태
  isAuthError: boolean
  requiresReauth: boolean
}

// 피드 상호작용 상태 (인증 오류 처리 포함)
export interface FeedInteractionState {
  isFollowing: boolean
  isLoadingPosts: boolean
  // 🔐 인증 관련 상태
  isAuthError: boolean
  requiresReauth: boolean
}

// 📱 무한 스크롤 로딩 상태 (마이룸 방식) - 인증 오류 처리 강화
export interface InfiniteScrollState {
  isLoading: boolean
  isRefreshing: boolean
  hasNext: boolean
  nextCursor: number | null
  error: string | null
  // 🔐 인증 관련 상태
  isAuthError: boolean
  requiresLogin: boolean
  tokenExpired: boolean
}

// ============================================================================
// 🔐 인증 관련 전용 타입들 (아키텍처 원칙: 무조건 로그인 필수)
// ============================================================================

// 인증이 필요한 API 요청의 기본 헤더
export interface AuthenticatedRequestHeaders {
  Authorization: string // Bearer token
  'Content-Type': string
}

// 인증 오류 응답 타입
export interface AuthErrorResponse {
  error: true
  message: string
  code: 'UNAUTHORIZED' | 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'LOGIN_REQUIRED'
  requiresLogin: boolean
  tokenExpired: boolean
}

// 토큰 갱신 요청/응답 타입
export interface TokenRefreshRequest {
  refreshToken: string
}

export interface TokenRefreshResponse {
  accessToken: string
  expiresIn: number
}

// 인증 상태 확인 응답
export interface AuthStatusResponse {
  isAuthenticated: boolean
  user: UserProfileResponse | null
  tokenValid: boolean
  expiresAt: string | null
}

// ============================================================================
// 🚀 유틸리티 함수들 (인증 체크 포함)
// ============================================================================

// PostResponse를 PostCard로 변환 (인증 상태 체크 포함)
export const toPostCard = (
  post: PostResponse,
  isAuthenticated: boolean = true
): PostCard => ({
  ...post,
  timeAgo: formatTimeAgo(post.createdAt),
  formattedLikeCount: formatLikeCount(post.likeCount),
  isLoading: false,
  isLiking: false,
  requiresAuth: !isAuthenticated,
  isAuthError: false,
})

// FeedWithPostsResponse를 FeedPage로 변환 (인증 상태 체크 포함)
export const toFeedPage = (
  feed: FeedWithPostsResponse,
  isAuthenticated: boolean = true
): FeedPage => ({
  ...feed,
  totalPosts: feed.posts.length,
  formattedJoinDate: formatTimeAgo(feed.createdAt),
  isLoading: false,
  requiresAuth: !isAuthenticated,
  isAuthError: false,
})

// 🔐 인증 오류 체크 함수
export const isAuthenticationError = (error: any): boolean => {
  if (!error) return false

  const status = error.response?.status
  const message = error.response?.data?.message || error.message || ''

  return (
    status === 401 ||
    status === 403 ||
    message.includes('unauthorized') ||
    message.includes('로그인이 필요') ||
    message.includes('token') ||
    message.includes('인증')
  )
}

// 🔐 토큰 만료 체크 함수
export const isTokenExpiredError = (error: any): boolean => {
  if (!error) return false

  const message = error.response?.data?.message || error.message || ''
  const code = error.response?.data?.code

  return (
    code === 'TOKEN_EXPIRED' ||
    message.includes('token expired') ||
    message.includes('토큰이 만료')
  )
}

// ============================================================================
// 🎯 API 엔드포인트 상수들 (백엔드와 완전 일치) - 인증 필수 명시
// ============================================================================

export const API_ENDPOINTS = {
  // 🔐 인증 관련 (토큰 갱신 등)
  AUTH_REFRESH: '/auth/refresh',
  AUTH_STATUS: '/auth/status',
  AUTH_LOGOUT: '/auth/logout',

  // 피드 관련 (마이룸 방식 무한 스크롤) - 🔐 모든 엔드포인트 인증 필수
  EXPLORE: '/feeds/explore', // ?limit=20&cursor=12345
  TIMELINE: '/feeds/timeline', // ?limit=20&cursor=12345 - 🔐 인증 필수 (팔로잉 기반)
  USER_FEED_BY_ID: (userId: number) => `/feeds/user/${userId}`, // ?limit=20&cursor=12345
  USER_FEED_BY_ACCOUNT: (accountName: string) =>
    `/feeds/user/account/${accountName}`, // ?limit=20&cursor=12345
  SEARCH_FEEDS: '/feeds/search', // ?query=user&limit=10&cursor=12345

  // 게시물 관련 - 🔐 모든 엔드포인트 인증 필수
  CREATE_POST_FROM_MYROOM: '/feeds/posts/from-myroom',
  POST_DETAIL: (postId: number) => `/feeds/posts/${postId}`,
  UPDATE_POST: (postId: number) => `/feeds/posts/${postId}`,
  DELETE_POST: (postId: number) => `/feeds/posts/${postId}`,

  // 좋아요 관련 (PostId 기반) - 🔐 모든 엔드포인트 인증 필수
  LIKE_POST: (postId: number) => `/likes/posts/${postId}`,
  UNLIKE_POST: (postId: number) => `/likes/posts/${postId}`,
  CHECK_LIKE_STATUS: (postId: number) => `/likes/posts/${postId}/check`,
  GET_LIKE_COUNT: (postId: number) => `/likes/posts/${postId}/count`,

  // 팔로우 관련 (accountName 기반) - 🔐 모든 엔드포인트 인증 필수
  FOLLOW: (accountName: string) => `/follows/${accountName}`,
  UNFOLLOW: (accountName: string) => `/follows/${accountName}`,
  CHECK_FOLLOW_STATUS: (accountName: string) => `/follows/check/${accountName}`,
  GET_FOLLOW_COUNTS: (accountName: string) => `/follows/count/${accountName}`,
  GET_FOLLOWING_LIST: (accountName: string) =>
    `/follows/following/${accountName}`,
  GET_FOLLOWERS_LIST: (accountName: string) =>
    `/follows/followers/${accountName}`,
  GET_MUTUAL_FOLLOWS: (accountName: string) => `/follows/mutual/${accountName}`,

  // 마이룸 연동 - 🔐 인증 필수 (개인 사진 접근)
  PHOTO_FOR_FEED_UPLOAD: (photoId: number) =>
    `/myroom/photos/${photoId}/feed-upload-info`,
} as const

// ============================================================================
// 🎭 에러 타입들 (인증 오류 강화)
// ============================================================================

export interface FeedError {
  code: string
  message: string
  details?: any
  // 🔐 인증 관련 오류 정보
  isAuthError?: boolean
  requiresLogin?: boolean
  tokenExpired?: boolean
}

export const FEED_ERROR_CODES = {
  // 🔐 인증 관련 오류 (최우선)
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',

  // 일반 오류
  NETWORK_ERROR: 'NETWORK_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_LIKED: 'ALREADY_LIKED',
  ALREADY_FOLLOWING: 'ALREADY_FOLLOWING',
  PHOTO_ALREADY_IN_FEED: 'PHOTO_ALREADY_IN_FEED',
  INVALID_CAPTION: 'INVALID_CAPTION',
  PAGINATION_ERROR: 'PAGINATION_ERROR',
} as const

// 🔐 인증 오류 생성 헬퍼
export const createAuthError = (
  message: string = '로그인이 필요합니다.'
): FeedError => ({
  code: FEED_ERROR_CODES.LOGIN_REQUIRED,
  message,
  isAuthError: true,
  requiresLogin: true,
  tokenExpired: false,
})

// 🔐 토큰 만료 오류 생성 헬퍼
export const createTokenExpiredError = (
  message: string = '토큰이 만료되었습니다. 다시 로그인해주세요.'
): FeedError => ({
  code: FEED_ERROR_CODES.TOKEN_EXPIRED,
  message,
  isAuthError: true,
  requiresLogin: true,
  tokenExpired: true,
})

// ============================================================================
// 🕒 유틸리티 함수들 (개선됨)
// ============================================================================

// 시간 포맷팅 함수
export function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return '방금 전'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`

  return date.toLocaleDateString('ko-KR')
}

// 좋아요 수 포맷팅 함수
export function formatLikeCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`
  return `${(count / 1000000).toFixed(1)}m`
}

// 팔로워 수 포맷팅 함수
export function formatFollowerCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${Math.floor(count / 1000)}k`
  return `${Math.floor(count / 1000000)}m`
}

// ============================================================================
// 🎯 API 연동용 필수 UI 타입들 (인증 상태 포함)
// ============================================================================

// UI에서 사용하는 게시물 카드 타입 (PostResponse + UI 상태 + 인증 상태)
export interface PostCardForUI extends PostResponse {
  timeAgo: string
  formattedLikeCount: string
  isLoading?: boolean
  isOptimistic?: boolean
  // 🔐 인증 관련 UI 상태
  requiresAuth?: boolean
  isAuthError?: boolean
}

// UI에서 사용하는 사용자 프로필 타입 (UserProfileResponse + UI 상태 + 인증 상태)
export interface UserProfileForUI extends UserProfileResponse {
  postsCount?: number
  followersCount?: number
  followingCount?: number
  isFollowing?: boolean
  isMe?: boolean
  lastActiveAt?: string
  // 🔐 인증 관련 UI 상태
  requiresAuth?: boolean
  isAuthError?: boolean
}

// 커서 기반 게시물 결과 타입 (인증 상태 포함)
export interface CursorPostsResult {
  posts: PostCardForUI[]
  hasNext: boolean
  nextCursor: number | null
  // 🔐 인증 관련 상태
  requiresAuth: boolean
  isAuthError: boolean
}

// 커서 기반 피드 결과 타입 (인증 상태 포함)
export interface CursorFeedsResult {
  feeds: FeedWithPostsResponse[]
  hasNext: boolean
  nextCursor: number | null
  // 🔐 인증 관련 상태
  requiresAuth: boolean
  isAuthError: boolean
}

// ============================================================================
// 🔄 무한 스크롤 헬퍼 함수들 (마이룸 방식) - 인증 체크 포함
// ============================================================================

// URL 파라미터 생성 함수
export function buildPaginationQuery(params: CursorPaginationParams): string {
  const queryParams = new URLSearchParams()

  if (params.limit) {
    queryParams.append('limit', params.limit.toString())
  }

  if (params.cursor) {
    queryParams.append('cursor', params.cursor.toString())
  }

  if (params.includePrivate) {
    queryParams.append('includePrivate', 'true')
  }

  return queryParams.toString()
}

// 검색 파라미터 생성 함수
export function buildSearchQuery(params: SearchParams): string {
  const queryParams = new URLSearchParams()

  queryParams.append('query', params.query)

  if (params.limit) {
    queryParams.append('limit', params.limit.toString())
  }

  if (params.cursor) {
    queryParams.append('cursor', params.cursor.toString())
  }

  if (params.includePrivate) {
    queryParams.append('includePrivate', 'true')
  }

  return queryParams.toString()
}

// ============================================================================
// 🔐 인증 관련 헬퍼 함수들 (아키텍처 원칙 지원)
// ============================================================================

// API 응답에서 인증 오류 체크
export function checkAuthenticationFromResponse<T>(response: ApiResponse<T>): {
  requiresAuth: boolean
  tokenExpired: boolean
  authError: FeedError | null
} {
  if (response.requiresAuth || response.tokenExpired) {
    return {
      requiresAuth: true,
      tokenExpired: response.tokenExpired || false,
      authError: response.tokenExpired
        ? createTokenExpiredError()
        : createAuthError(),
    }
  }

  return {
    requiresAuth: false,
    tokenExpired: false,
    authError: null,
  }
}

// 무한스크롤 상태에 인증 오류 적용
export function applyAuthErrorToInfiniteScroll(
  state: InfiniteScrollState,
  authError: FeedError | null
): InfiniteScrollState {
  if (!authError || !authError.isAuthError) {
    return state
  }

  return {
    ...state,
    isAuthError: true,
    requiresLogin: authError.requiresLogin || false,
    tokenExpired: authError.tokenExpired || false,
    error: authError.message,
  }
}

// 인증 상태 체크 후 UI 상태 업데이트
export function updateUIWithAuthState<
  T extends { requiresAuth?: boolean; isAuthError?: boolean },
>(item: T, isAuthenticated: boolean, hasAuthError: boolean = false): T {
  return {
    ...item,
    requiresAuth: !isAuthenticated,
    isAuthError: hasAuthError,
  }
}

// ============================================================================
// 🎯 타입 가드 함수들 (런타임 타입 체크)
// ============================================================================

// 인증 오류 응답 타입 가드
export function isAuthErrorResponse(
  response: any
): response is AuthErrorResponse {
  return (
    response &&
    response.error === true &&
    typeof response.code === 'string' &&
    [
      'UNAUTHORIZED',
      'TOKEN_EXPIRED',
      'INVALID_TOKEN',
      'LOGIN_REQUIRED',
    ].includes(response.code)
  )
}

// 피드 오류 타입 가드
export function isFeedError(error: any): error is FeedError {
  return (
    error && typeof error.code === 'string' && typeof error.message === 'string'
  )
}

// PostResponse 타입 가드
export function isPostResponse(data: any): data is PostResponse {
  return (
    data &&
    typeof data.postId === 'number' &&
    typeof data.photoId === 'number' &&
    typeof data.imgUrl === 'string' &&
    typeof data.authorAccountName === 'string'
  )
}

// PostListResponse 타입 가드
export function isPostListResponse(data: any): data is PostListResponse {
  return (
    data &&
    Array.isArray(data.posts) &&
    typeof data.hasNext === 'boolean' &&
    (data.nextCursor === null || typeof data.nextCursor === 'number')
  )
}

// ============================================================================
// 🔧 디버깅 및 개발 도구 (인증 상태 포함)
// ============================================================================

// 개발 환경에서 API 응답 로깅 (인증 정보 포함)
export function logApiResponse<T>(
  endpoint: string,
  response: ApiResponse<T>,
  isAuthenticated: boolean
): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔍 API Response [${endpoint}]`)
    console.log('Response:', response)

    if (response.error) {
      console.error('Error:', response.message)
    }
    console.groupEnd()
  }
}

// 무한스크롤 상태 디버깅 (인증 정보 포함)
export function logInfiniteScrollState(
  hookName: string,
  state: InfiniteScrollState,
  itemCount: number
): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔄 Infinite Scroll [${hookName}]`)
    console.log('State:', {
      itemCount,
      loading: state.isLoading,
      hasNext: state.hasNext,
      cursor: state.nextCursor,
      error: state.error,
    })
    console.log('Auth Status:', {
      isAuthError: state.isAuthError,
      requiresLogin: state.requiresLogin,
      tokenExpired: state.tokenExpired,
    })
    console.groupEnd()
  }
}

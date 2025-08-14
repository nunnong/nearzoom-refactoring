// src/lib/types/feed.ts

// ============================================================================
// 🎯 간소화된 피드 시스템 타입 (백엔드 연동 중심)
// ============================================================================

// ✅ 백엔드 ApiResponse 구조
export interface ApiResponse<T> {
  error: boolean
  message: string | null
  data: T | null
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
// 🏠 피드 (Feed) 관련 타입 - ⚡️ 백엔드 수정사항 반영
// ============================================================================

// ✅ 백엔드 FeedWithPostsResponse와 정확히 일치 (title, description 제거)
export interface FeedWithPostsResponse {
  feedId: number
  userId: number
  accountName: string
  profileImage: string | null
  createdAt: string
  posts: PostResponse[]
  isFollowing: boolean
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

// ✅ 백엔드 PhotoForFeedUploadResponse와 정확히 일치
export interface PhotoForFeedUploadResponse {
  photoId: number
  imgUrl: string
  takenAt: string
  alreadyInFeed: boolean
}

// ============================================================================
// 🔍 프론트엔드 전용 확장 타입들
// ============================================================================

// 프론트엔드에서 사용하는 게시물 카드 타입 (PostResponse 확장)
export interface PostCard extends PostResponse {
  // UI 상태 관리용
  isLoading?: boolean
  isLiking?: boolean
  
  // 추가 계산된 필드들
  timeAgo?: string
  formattedLikeCount?: string
}

// 프론트엔드에서 사용하는 피드 페이지 타입 (FeedWithPostsResponse 확장) - ⚡️ 수정
export interface FeedPage extends FeedWithPostsResponse {
  // UI 상태 관리용
  isLoading?: boolean
  
  // 추가 계산된 필드들
  totalPosts?: number
  formattedJoinDate?: string
}

// ============================================================================
// 📱 페이지별 API 응답 타입들
// ============================================================================

// Explore 페이지 - 랜덤 게시물들
export type ExplorePostsResponse = ApiResponse<PostResponse[]>

// Timeline 페이지 - 팔로잉 최신 게시물들
export type TimelinePostsResponse = ApiResponse<PostResponse[]>

// 사용자 피드 페이지 - 특정 사용자의 피드 + 게시물들
export type UserFeedResponse = ApiResponse<FeedWithPostsResponse>

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

// 피드 검색 결과
export type SearchFeedsResponse = ApiResponse<FeedWithPostsResponse[]>

// 내 피드 통계
export type MyFeedStatsApiResponse = ApiResponse<MyFeedStatsResponse>

// 마이룸 사진 정보 (피드 업로드용)
export type PhotoForFeedResponse = ApiResponse<PhotoForFeedUploadResponse>

// ============================================================================
// 🔧 API 요청 파라미터 타입들
// ============================================================================

// 페이징 파라미터 (size만 사용)
export interface PaginationParams {
  size?: number
}

// 검색 파라미터
export interface SearchParams extends PaginationParams {
  query: string
}

// ============================================================================
// 🎨 UI 상태 관리 타입들
// ============================================================================

// 게시물 상호작용 상태
export interface PostInteractionState {
  isLiking: boolean
  isDeleting: boolean
  isEditing: boolean
}

// 피드 상호작용 상태
export interface FeedInteractionState {
  isFollowing: boolean
  isLoadingPosts: boolean
}

// 페이지 로딩 상태
export interface PageLoadingState {
  isLoading: boolean
  isRefreshing: boolean
  hasMore: boolean
  error: string | null
}

// ============================================================================
// 🚀 유틸리티 함수들
// ============================================================================

// PostResponse를 PostCard로 변환
export const toPostCard = (post: PostResponse): PostCard => ({
  ...post,
  timeAgo: formatTimeAgo(post.createdAt),
  formattedLikeCount: formatLikeCount(post.likeCount),
  isLoading: false,
  isLiking: false,
})

// FeedWithPostsResponse를 FeedPage로 변환 - ⚡️ title, description 제거됨
export const toFeedPage = (feed: FeedWithPostsResponse): FeedPage => ({
  ...feed,
  totalPosts: feed.posts.length,
  formattedJoinDate: formatTimeAgo(feed.createdAt),
  isLoading: false,
})

// ============================================================================
// 🎯 API 엔드포인트 상수들
// ============================================================================

export const API_ENDPOINTS = {
  // 피드 관련
  EXPLORE: '/feeds/explore',
  TIMELINE: '/feeds/timeline',
  USER_FEED_BY_ID: (userId: number) => `/feeds/users/${userId}`,
  USER_FEED_BY_ACCOUNT: (accountName: string) => `/feeds/users/account/${accountName}`,
  SEARCH_FEEDS: '/feeds/search',
  
  // 게시물 관련
  CREATE_POST_FROM_MYROOM: '/feeds/posts/from-myroom',
  POST_DETAIL: (postId: number) => `/feeds/posts/${postId}`,
  UPDATE_POST: (postId: number) => `/feeds/posts/${postId}`,
  DELETE_POST: (postId: number) => `/feeds/posts/${postId}`,
  
  // 좋아요 관련
  LIKE_POST: (postId: number) => `/likes/posts/${postId}`,
  UNLIKE_POST: (postId: number) => `/likes/posts/${postId}`,
  CHECK_LIKE_STATUS: (postId: number) => `/likes/posts/${postId}/check`,
  GET_LIKE_COUNT: (postId: number) => `/likes/posts/${postId}/count`,
  
  // 팔로우 관련
  FOLLOW: (accountName: string) => `/follows/${accountName}`,
  UNFOLLOW: (accountName: string) => `/follows/${accountName}`,
  CHECK_FOLLOW_STATUS: (accountName: string) => `/follows/check/${accountName}`,
  GET_FOLLOW_COUNTS: (accountName: string) => `/follows/count/${accountName}`,
  GET_FOLLOWING_LIST: (accountName: string) => `/follows/following/${accountName}`,
  GET_FOLLOWERS_LIST: (accountName: string) => `/follows/followers/${accountName}`,
  
  // 마이룸 연동
  PHOTO_FOR_FEED_UPLOAD: (photoId: number) => `/myroom/photos/${photoId}/feed-upload-info`,
} as const

// ============================================================================
// 🎭 에러 타입들
// ============================================================================

export interface FeedError {
  code: string
  message: string
  details?: any
}

export const FEED_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_LIKED: 'ALREADY_LIKED',
  ALREADY_FOLLOWING: 'ALREADY_FOLLOWING',
  PHOTO_ALREADY_IN_FEED: 'PHOTO_ALREADY_IN_FEED',
  INVALID_CAPTION: 'INVALID_CAPTION',
} as const

// 시간 포맷팅 함수를 다시 export
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

// 좋아요 수 포맷팅 함수를 다시 export
export function formatLikeCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`
  return `${(count / 1000000).toFixed(1)}m`
}

// 팔로워 수 포맷팅 함수를 다시 export
export function formatFollowerCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${Math.floor(count / 1000)}k`
  return `${Math.floor(count / 1000000)}m`
}
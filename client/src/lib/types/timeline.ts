// src/lib/types/timeline.ts

import { 
  BackendFeedDetailResponse,
  BackendApiResponse
} from './feed'

// ============================================================================
// 🎯 단순화된 타임라인 타입들 (accountName 중심)
// ============================================================================

// ✅ 타임라인 포스트 (1사용자 = 1피드 = 1계정명)
export interface TimelinePost {
  // 🔥 핵심: accountName이 모든 식별자의 기준
  id: string                    // feedId (문자열) 
  feedId: number               // 백엔드 feedId (숫자)
  accountName: string          // 계정명 (유일 식별자, 이메일과 1:1)
  
  // 작성자 정보 (단순화)
  authorName: string           // 표시할 이름 (accountName과 동일)
  authorAvatar?: string        // 프로필 이미지
  
  // 콘텐츠 정보
  content: string              // caption
  imageUrl: string             // imgUrl
  
  // 상호작용 정보 (게시물별 좋아요만)
  isLiked: boolean             // 현재 사용자의 좋아요 여부
  
  // 시간 정보
  createdAt: string            // ISO 문자열
  
  // 타임라인 소스 (단순화)
  source: 'timeline' | 'explore'  // 타임라인(팔로잉) or 탐색(랜덤)
}

// ✅ 타임라인 API 응답 (백엔드 커서 페이징)
export interface TimelineApiResponse {
  success: boolean
  data?: {
    posts: TimelinePost[]
    hasMore: boolean
    nextCursor?: {
      createdAt: string
      feedId: number
    } | null
    type: 'timeline' | 'explore'
  }
  error?: string
}

// ✅ 타임라인 필터 (백엔드 지원 범위만)
export interface TimelineFilters {
  // 백엔드 커서 페이징
  cursorCreatedAt?: string
  cursorId?: number
  size?: number
}

// ✅ 타임라인 상태 (단순화)
export interface TimelineState {
  posts: TimelinePost[]
  loading: boolean
  error: string | null
  hasMore: boolean
  nextCursor: {
    createdAt: string
    feedId: number
  } | null
  type: 'timeline' | 'explore'
  lastUpdated: string
}

// ============================================================================
// 상호작용 타입들 (게시물별 좋아요만)
// ============================================================================

// ✅ 좋아요 액션 결과
export interface LikeActionResult {
  success: boolean
  data?: {
    feedId: number             // 게시물 ID
    isLiked: boolean
  }
  error?: string
}

// ✅ 팔로우 액션 결과 (accountName 기반)
export interface FollowActionResult {
  success: boolean
  data?: {
    accountName: string        // 계정명
    isFollowing: boolean
  }
  error?: string
}

// ============================================================================
// 백엔드 데이터 변환 함수 (단순화)
// ============================================================================

// ✅ 백엔드 FeedDetailResponse를 TimelinePost로 변환
export const transformBackendFeedToTimelinePost = (
  backendFeed: BackendFeedDetailResponse,
  source: TimelinePost['source'] = 'explore'
): TimelinePost => {
  return {
    // 🔥 accountName 중심 (1사용자 = 1피드 = 1계정명)
    id: backendFeed.feedId.toString(),
    feedId: backendFeed.feedId,
    accountName: backendFeed.accountName,
    
    // 작성자 정보
    authorName: backendFeed.accountName,  // accountName을 그대로 사용
    authorAvatar: backendFeed.profileImage,
    
    // 콘텐츠 정보
    content: backendFeed.caption || '',
    imageUrl: backendFeed.imgUrl,
    
    // 상호작용 정보 (게시물별 좋아요만)
    isLiked: backendFeed.liked,
    
    // 시간 정보
    createdAt: backendFeed.createdAt,
    
    // 타임라인 소스
    source
  }
}

// ============================================================================
// 유틸리티 함수들 (단순화)
// ============================================================================

// ✅ 타임라인 포스트 정렬 (최신순만 - 백엔드에서 이미 정렬됨)
export const sortTimelinePosts = (posts: TimelinePost[]): TimelinePost[] => {
  return [...posts].sort((a, b) => {
    // 최신순: 생성일 역순, 같으면 feedId 역순 (백엔드 기본 정렬과 동일)
    const dateCompare = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (dateCompare !== 0) return dateCompare
    return b.feedId - a.feedId
  })
}

// ✅ 타임라인 포스트 병합 (중복 제거)
export const mergeTimelinePosts = (
  existingPosts: TimelinePost[],
  newPosts: TimelinePost[]
): TimelinePost[] => {
  const existingIds = new Set(existingPosts.map(post => post.id))
  const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id))
  return [...existingPosts, ...uniqueNewPosts]
}

// ✅ 타임라인 포스트 업데이트 (좋아요 상태만)
export const updateTimelinePost = (
  posts: TimelinePost[],
  feedId: number,
  updates: Partial<Pick<TimelinePost, 'isLiked'>>
): TimelinePost[] => {
  return posts.map(post => 
    post.feedId === feedId 
      ? { ...post, ...updates }
      : post
  )
}

// ============================================================================
// 타입 가드 함수들
// ============================================================================

// ✅ TimelinePost 타입 가드
export const isTimelinePost = (obj: any): obj is TimelinePost => {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.feedId === 'number' &&
    typeof obj.accountName === 'string' &&
    typeof obj.authorName === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.imageUrl === 'string' &&
    typeof obj.isLiked === 'boolean' &&
    typeof obj.createdAt === 'string' &&
    ['timeline', 'explore'].includes(obj.source)
}

// ✅ TimelineApiResponse 타입 가드
export const isTimelineApiResponse = (obj: any): obj is TimelineApiResponse => {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.success === 'boolean' &&
    (obj.data === undefined || (
      obj.data &&
      Array.isArray(obj.data.posts) &&
      typeof obj.data.hasMore === 'boolean'
    ))
}

// ============================================================================
// 상수들
// ============================================================================

export const TIMELINE_DEFAULTS = {
  PAGE_SIZE: 20,                // 백엔드 기본 size
  REFRESH_INTERVAL: 30000,      // 30초 (단순화)
} as const

export const TIMELINE_TYPES = {
  TIMELINE: 'timeline',         // 팔로잉 피드 (GET /feeds/following)
  EXPLORE: 'explore'            // 랜덤 피드 (GET /feeds/random)
} as const

// ============================================================================
// 백엔드 API 함수 타입들 (단순화된 API)
// ============================================================================

// 타임라인 조회 (팔로잉 피드) - GET /feeds/following
export type GetTimelineApi = (
  params?: {
    cursorCreatedAt?: string
    cursorId?: number
    size?: number
  }
) => Promise<TimelineApiResponse>

// 탐색 조회 (랜덤 피드) - GET /feeds/random  
export type GetExploreApi = (
  params?: {
    size?: number
  }
) => Promise<TimelineApiResponse>

// 🔥 통합 피드 조회 (제안) - GET /feeds/{accountName}
export type GetFeedByAccountNameApi = (
  accountName: string
) => Promise<{
  success: boolean
  data?: TimelinePost
  error?: string
}>

// 게시물 좋아요 토글 - POST/DELETE /likes/{feedId}
export type ToggleLikeApi = (
  feedId: number
) => Promise<LikeActionResult>

// 팔로우 토글 - POST/DELETE /follows/{accountName}
export type ToggleFollowApi = (
  accountName: string
) => Promise<FollowActionResult>

// ============================================================================
// 타임라인 액션 (단순화)
// ============================================================================

export type TimelineAction = 
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; posts: TimelinePost[]; hasMore: boolean; nextCursor: { createdAt: string; feedId: number } | null }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; posts: TimelinePost[] }
  | { type: 'APPEND_POSTS'; posts: TimelinePost[]; hasMore: boolean; nextCursor: { createdAt: string; feedId: number } | null }
  | { type: 'UPDATE_LIKE'; feedId: number; isLiked: boolean }
  | { type: 'CLEAR_POSTS' }

// ============================================================================
// 간소화된 요청 타입들
// ============================================================================

// ✅ 타임라인 요청 (단순화)
export interface TimelineRequest {
  type: 'timeline' | 'explore'
  cursorCreatedAt?: string     // 커서 페이징
  cursorId?: number           // 커서 페이징
  size?: number               // 페이지 크기 (기본: 20)
}
// src/lib/types/timeline.ts

import { 
  CanvasFeedItem, 
  BackendFeedItem, 
  BackendFeedListResponse,
  BackendUserInfoResponse,
  BackendApiResponse 
} from './feed'

// ============================================================================
// 백엔드 연동 타임라인 타입들 (feed.ts에서 import한 타입들 재export)
// ============================================================================

// ✅ feed.ts에서 가져온 백엔드 타입들을 재export
export type {
  BackendFeedItem,
  BackendFeedListResponse,
  BackendUserInfoResponse,
  BackendApiResponse
} from './feed'

// ✅ 백엔드 기반 타임라인 포스트 (실제 백엔드 데이터 구조 기반)
export interface TimelinePost extends Omit<CanvasFeedItem, 'source'> {
  // source를 제외하고 CanvasFeedItem 확장 후 새로 정의
  source: 'following' | 'explore' | 'my'  // ✅ 타임라인 전용 source 타입
  
  // 타임라인 메타데이터
  displayOrder: number
  
  // 추가 상호작용 정보
  viewCount?: number
  shareCount?: number
  
  // 타임라인 컨텍스트
  context?: {
    reason?: string
    relatedUsers?: string[]
  }
}

// ✅ 백엔드 팔로잉 타임라인 API 응답 (백엔드 구현 필요)
export interface BackendTimelineResponse {
  items: BackendFeedItem[]
  nextCursor: number | null
  hasNext: boolean
  total?: number
}

// ✅ 백엔드 탐색 피드 API 응답 (백엔드 구현 필요) 
export interface BackendExploreResponse {
  items: BackendFeedItem[]
  nextCursor: number | null
  hasNext: boolean
  total?: number
}

// ============================================================================
// 타임라인 필터 및 정렬 (백엔드 지원 범위 내)
// ============================================================================

// ✅ 실제 구현 가능한 타임라인 필터
export interface TimelineFilters {
  // 기본 필터 (백엔드에서 지원)
  followingOnly?: boolean  // 팔로잉만 표시
  userId?: string         // 특정 사용자 피드만
  
  // 프론트엔드 필터
  dateRange?: {
    from: string
    to: string
  }
  
  // 향후 확장 가능한 필터들 (백엔드 구현 필요)
  minLikes?: number       // 최소 좋아요 수
}

// ✅ 백엔드에서 지원 가능한 정렬 옵션
export type TimelineSort = 
  | 'latest'      // 최신순 (백엔드 기본 지원)
  | 'popular'     // 인기순 (좋아요 수 기준, 백엔드 구현 필요)
  | 'oldest'      // 오래된순

// ✅ 타임라인 설정 (간소화)
export interface TimelineSettings {
  defaultSort: TimelineSort
  autoRefresh: boolean
  refreshInterval: number  // 초 단위 (기본: 60초)
  postsPerPage: number    // 페이지당 포스트 수 (기본: 20)
  enableInfiniteScroll: boolean
  
  // 표시 설정
  showMyPosts: boolean     // 내 게시물도 타임라인에 표시
  showPreview: boolean     // 피드 미리보기 표시
}

// ============================================================================
// 타임라인 상태 관리
// ============================================================================

// ✅ 타임라인 상태
export interface TimelineState {
  // 데이터
  posts: TimelinePost[]
  
  // 로딩 상태
  loading: boolean
  error: string | null
  refreshing: boolean
  
  // 페이지네이션
  hasMore: boolean
  nextCursor: string | null
  currentPage: number
  totalPosts: number
  
  // 필터/정렬 상태
  activeFilters: TimelineFilters
  appliedSort: TimelineSort
  
  // 실시간 상태
  lastRefresh: string
  newPostsAvailable: number  // 새로운 게시물 수
}

// ✅ 타임라인 액션
export type TimelineAction = 
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; posts: TimelinePost[]; hasMore: boolean; nextCursor: string | null }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; posts: TimelinePost[] }
  | { type: 'APPEND_POSTS'; posts: TimelinePost[]; hasMore: boolean; nextCursor: string | null }
  | { type: 'UPDATE_POST'; postId: string; updates: Partial<TimelinePost> }
  | { type: 'REMOVE_POST'; postId: string }
  | { type: 'SET_FILTERS'; filters: TimelineFilters }
  | { type: 'SET_SORT'; sort: TimelineSort }
  | { type: 'NEW_POSTS_AVAILABLE'; count: number }
  | { type: 'CLEAR_NEW_POSTS' }

// ============================================================================
// API 요청/응답 타입들
// ============================================================================

// ✅ 타임라인 조회 요청
export interface TimelineRequest {
  type: 'following' | 'explore' | 'user'
  userId?: string        // 특정 사용자 피드 조회 시
  cursor?: string        // 페이지네이션 커서
  limit?: number         // 조회할 게시물 수 (기본: 20)
  sort?: TimelineSort    // 정렬 방식
}

// ✅ 타임라인 API 응답
export interface TimelineApiResponse {
  success: boolean
  data?: {
    posts: TimelinePost[]
    hasMore: boolean
    nextCursor: string | null
    total?: number
    type: 'following' | 'explore' | 'user'
  }
  error?: string
}

// ✅ 타임라인 통계 응답 (백엔드 구현 필요)
export interface TimelineStatsResponse {
  success: boolean
  data?: {
    totalPosts: number
    followingPosts: number
    todayPosts: number
    lastUpdate: string
  }
  error?: string
}

// ============================================================================
// 백엔드 API 함수 타입들 (lib/api/timeline.ts에서 구현 예정)
// ============================================================================

// 팔로잉 타임라인 조회
export type GetFollowingTimelineApi = (
  cursor?: string,
  limit?: number
) => Promise<TimelineApiResponse>

// 탐색 피드 조회  
export type GetExploreTimelineApi = (
  cursor?: string,
  limit?: number,
  sort?: TimelineSort
) => Promise<TimelineApiResponse>

// 특정 사용자 피드 조회
export type GetUserTimelineApi = (
  userId: string,
  cursor?: string,
  limit?: number
) => Promise<TimelineApiResponse>

// 타임라인 통계 조회
export type GetTimelineStatsApi = () => Promise<TimelineStatsResponse>

// ============================================================================
// 유틸리티 타입들
// ============================================================================

// ✅ 백엔드 데이터 변환용
export interface TimelineTransforms {
  // 백엔드 FeedItem을 TimelinePost로 변환
  backendToTimelinePost: (
    backendItem: BackendFeedItem, 
    source: TimelinePost['source']
  ) => Promise<TimelinePost>
  
  // 백엔드 응답을 프론트엔드 응답으로 변환
  backendToTimelineResponse: (
    backendResponse: BackendTimelineResponse,
    source: TimelinePost['source']
  ) => Promise<TimelineApiResponse>
}

// ✅ 타임라인 이벤트 (분석용, 선택적 구현)
export type TimelineEvent = 
  | { type: 'POST_VIEWED'; postId: string; userId: string; duration: number }
  | { type: 'POST_LIKED'; postId: string; userId: string }
  | { type: 'POST_SHARED'; postId: string; userId: string }
  | { type: 'POST_CLICKED'; postId: string; userId: string }
  | { type: 'TIMELINE_SCROLLED'; position: number; postsViewed: string[] }
  | { type: 'FILTER_APPLIED'; filters: TimelineFilters }
  | { type: 'SORT_CHANGED'; sort: TimelineSort }

// ============================================================================
// 기본값 및 상수
// ============================================================================

export const DEFAULT_TIMELINE_SETTINGS: TimelineSettings = {
  defaultSort: 'latest',
  autoRefresh: false,
  refreshInterval: 60,
  postsPerPage: 20,
  enableInfiniteScroll: true,
  showMyPosts: false,
  showPreview: true,
}

export const DEFAULT_TIMELINE_FILTERS: TimelineFilters = {
  followingOnly: false,
}

export const TIMELINE_CONSTANTS = {
  MAX_POSTS_PER_PAGE: 50,
  MIN_POSTS_PER_PAGE: 5,
  DEFAULT_POSTS_PER_PAGE: 20,
  AUTO_REFRESH_MIN_INTERVAL: 30, // 최소 30초
  AUTO_REFRESH_MAX_INTERVAL: 300, // 최대 5분
} as const

// ============================================================================
// 타입 가드 및 유틸리티 함수들
// ============================================================================

export const isTimelinePost = (item: any): item is TimelinePost => {
  return item && typeof item === 'object' && 'id' in item && 'source' in item
}

export const isFollowingPost = (post: TimelinePost): boolean => {
  return post.source === 'following'
}

export const isExplorePost = (post: TimelinePost): boolean => {
  return post.source === 'explore'
}

export const isMyPost = (post: TimelinePost, currentUserId?: string): boolean => {
  return currentUserId ? post.authorId === currentUserId : false
}

// ============================================================================
// 호환성을 위한 기존 타입들 (deprecated)
// ============================================================================

/**
 * @deprecated 복잡한 알고리즘 기능은 현재 백엔드에서 지원하지 않습니다.
 * 향후 백엔드 구현 후 다시 활성화될 수 있습니다.
 */
export interface LegacyTimelineFeatures {
  priority?: number
  engagementScore?: number
  algorithmScore?: number
  isPromoted?: boolean
  promotionType?: 'sponsored' | 'featured' | 'trending'
  interactions?: {
    views: number
    shares: number
    saves: number
    comments: number
  }
}

/**
 * @deprecated 현재 백엔드에서 지원하지 않는 고급 분석 기능입니다.
 */
export interface LegacyTimelineAnalytics {
  // 향후 구현 예정
}

/**
 * @deprecated A/B 테스트 기능은 현재 지원하지 않습니다.
 */
export interface LegacyTimelineExperiment {
  // 향후 구현 예정
}
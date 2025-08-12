// src/lib/types/feed.ts

// ============================================================================
// 기본 위치 및 크기 타입 (캔버스 편집용 - 프론트엔드 전용)
// ============================================================================
export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Transform extends Position, Size {
  rotation: number
  zIndex: number
}

// ============================================================================
// 피드 요소 타입들 (캔버스 편집용 - 프론트엔드 전용)
// ============================================================================
interface BaseFeedElement extends Transform {
  id: string
  type: string
  createdAt: string
  updatedAt: string
}

// 사진 요소
export interface PhotoElement extends BaseFeedElement {
  type: 'PHOTO'
  photoId: string
  src: string
  alt: string
}

// 스티커 요소
export interface StickerElement extends BaseFeedElement {
  type: 'STICKER'
  stickerUrl: string
  stickerType: 'emoji' | 'icon' | 'custom'
}

// 텍스트 요소
export interface TextElement extends BaseFeedElement {
  type: 'TEXT'
  content: string
  fontSize: number
  fontFamily: string
  color: string
  textAlign: 'left' | 'center' | 'right'
}

// 드로잉 요소
export interface DrawingElement extends BaseFeedElement {
  type: 'DRAWING'
  svgData: string
  strokeWidth: number
  strokeColor: string
}

// 피드 요소 유니온 타입
export type FeedElement = PhotoElement | StickerElement | TextElement | DrawingElement

// ============================================================================
// 백엔드 연동 타입들 (실제 백엔드 DTO와 정확히 일치) ✅ 수정됨
// ============================================================================

// ✅ 백엔드 ApiResponse 구조
export interface BackendApiResponse<T> {
  error: boolean
  message: string | null
  data: T | null
}

// ✅ 백엔드 FeedDetailResponse (실제 백엔드 DTO와 일치하도록 수정)
export interface BackendFeedDetailResponse {
  feedId: number
  imgUrl: string        // ✅ photoUrl → imgUrl
  caption: string       // ✅ 추가됨
  authorId: number      // ✅ 유지
  accountName: string   // ✅ userName 대신 accountName
  profileImage: string  // ✅ 추가됨 (사용자 프로필 이미지)
  createdAt: string     // ✅ LocalDateTime → ISO string
  liked: boolean        // ✅ 추가됨 (현재 사용자의 좋아요 여부)
}

// ✅ 백엔드 CreateFeedRequest (실제 백엔드 DTO와 일치)
export interface BackendCreateFeedRequest {
  photoId: number
  caption: string
}

// ✅ 백엔드 FollowCountsResponse (실제 백엔드 DTO와 일치)
export interface BackendFollowCountsResponse {
  followerCount: number
  followingCount: number
}

// ✅ 백엔드 UserInfoResponse (실제 백엔드 DTO와 일치하도록 수정)
export interface BackendUserInfoResponse {
  userName: string
  userEmail: string
  profileImage: string
  prettyFace: string    // ✅ 추가됨
}

// ✅ 제거됨 - 백엔드에 없는 타입들
// BackendFeedItem, BackendFeedListResponse 제거

// ============================================================================
// 기존 UserFeed (api/feed.ts의 CanvasFeedItem과 호환성 유지)
// ============================================================================

// 🔥 기존 UserFeed 인터페이스 (기존 컴포넌트 호환성 유지)
export interface UserFeed {
  id: string
  userId: string
  userName?: string
  name: string
  description: string
  isPublic: boolean
  backgroundColor: string
  backgroundImageUrl?: string
  photoId?: number
  photoUrl?: string
  totalHeight: number
  followersCount: number
  isFollowing: boolean
  isLiked: boolean
  likesCount: number
  authorName?: string
  authorId?: string
  authorAvatar?: string
  elements?: FeedElement[]
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  userId: string
  userName: string
  userEmail: string
  userProfileImage?: string
  followersCount: number
  followingCount: number
  postsCount: number
  bio?: string
  website?: string
  location?: string
  joinedAt: string
  isFollowing?: boolean
  isFollowedBy?: boolean
  isBlocked?: boolean
  isPrivate?: boolean
}

// ============================================================================
// 백엔드 연동 확장 타입들 (api/feed.ts와 완벽 호환)
// ============================================================================

// ✅ 백엔드 데이터 + 캔버스 편집 기능을 모두 포함한 완전한 피드 타입
export interface CanvasFeedItem extends Omit<UserFeed, 'photoId'> {
  photoId: string | number
  
  // 백엔드에서 가져온 추가 정보
  authorId: string
  authorName: string
  authorAvatar?: string
  photoUrl: string
  
  // 피드 상호작용 정보
  likesCount: number
  
  // ExploreFeed 호환성
  source?: 'popular' | 'recent' | 'recommended' | 'random'
  discoverScore?: number
  
  // 캔버스 편집 요소들
  elements: FeedElement[]
}

// ============================================================================
// API 응답 타입들
// ============================================================================

// 피드 생성/수정/조회 API 응답
export interface FeedApiResponse {
  success: boolean
  data?: CanvasFeedItem
  error?: string
}

// 피드 목록 API 응답 (커서 페이징 지원 + 기존 페이지네이션 호환)
export interface FeedListApiResponse {
  success: boolean
  data?: {
    items: CanvasFeedItem[]
    hasMore: boolean
    nextCursor?: {
      createdAt: string
      feedId: number
    } | null
    // 기존 페이지네이션 호환성
    total?: number
    page?: number
    limit?: number
  }
  error?: string
}

// 좋아요 API 응답
export interface LikeApiResponse {
  success: boolean
  data?: {
    isLiked: boolean
    likesCount?: number
  }
  error?: string
}

// 팔로우 API 응답
export interface FollowApiResponse {
  success: boolean
  data?: boolean
  error?: string
}

// 사용자 목록 API 응답 (팔로워/팔로잉)
export interface UserListApiResponse {
  success: boolean
  data?: BackendUserInfoResponse[]
  error?: string
}

// 팔로우 카운트 API 응답
export interface FollowCountApiResponse {
  success: boolean
  data?: BackendFollowCountsResponse
  error?: string
}

// ============================================================================
// 요청 타입들 (백엔드 DTO와 일치하도록 수정)
// ============================================================================

// 피드 생성 요청 (백엔드 CreateFeedRequest와 일치)
export interface CreateFeedRequest {
  photoId: number
  caption: string
}

// 피드 업데이트 요청 (현재 백엔드 미지원)
export interface UpdateFeedRequest {
  name?: string
  description?: string
  isPublic?: boolean
  elements?: FeedElement[]
  backgroundColor?: string
  backgroundImageUrl?: string
  totalHeight?: number
}

// 커서 페이징 파라미터 (백엔드 API와 일치)
export interface CursorPagingParams {
  cursorCreatedAt?: string  // LocalDateTime
  cursorId?: number
  size?: number
}

// ============================================================================
// 유틸리티 타입들
// ============================================================================

// 페이지네이션 응답 (호환성)
export interface PaginatedResponse<T> {
  items: T[]
  hasMore: boolean
  total: number
  page: number
  limit: number
}

// 기본 API 응답 (호환성)
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// 상수들
// ============================================================================

export const DEFAULT_FEED_CONFIG = {
  backgroundColor: '#ffffff',
  totalHeight: 1600,
  elements: [] as FeedElement[],
  isPublic: true,
} as const

export const FEED_ELEMENT_TYPES = {
  PHOTO: 'PHOTO',
  STICKER: 'STICKER',
  TEXT: 'TEXT',
  DRAWING: 'DRAWING'
} as const

// ============================================================================
// 타입 가드 함수들
// ============================================================================

export const isPhotoElement = (element: FeedElement): element is PhotoElement => {
  return element.type === 'PHOTO'
}

export const isStickerElement = (element: FeedElement): element is StickerElement => {
  return element.type === 'STICKER'
}

export const isTextElement = (element: FeedElement): element is TextElement => {
  return element.type === 'TEXT'
}

export const isDrawingElement = (element: FeedElement): element is DrawingElement => {
  return element.type === 'DRAWING'
}

// ============================================================================
// 백엔드 데이터 변환 유틸리티 함수들
// ============================================================================

// 백엔드 FeedDetailResponse를 프론트엔드 CanvasFeedItem으로 변환
export const transformBackendFeedToCanvasFeed = (
  backendFeed: BackendFeedDetailResponse
): CanvasFeedItem => {
  return {
    id: backendFeed.feedId.toString(),
    userId: backendFeed.authorId.toString(),
    userName: backendFeed.accountName,
    name: backendFeed.caption || 'Untitled Feed',
    description: backendFeed.caption || '',
    isPublic: true,
    backgroundColor: '#ffffff',
    photoId: backendFeed.feedId,
    photoUrl: backendFeed.imgUrl,
    totalHeight: 1600,
    followersCount: 0,
    isFollowing: false,
    isLiked: backendFeed.liked,
    likesCount: 0,
    authorName: backendFeed.accountName,
    authorId: backendFeed.authorId.toString(),
    authorAvatar: backendFeed.profileImage,
    elements: [],
    createdAt: backendFeed.createdAt,
    updatedAt: backendFeed.createdAt,
  }
}
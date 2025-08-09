// 기존 ImageItem과 호환되도록 확장
export interface ImageItem {
  id: string
  src: string
  alt: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
}

// 피드 요소 타입들
export type FeedElementType = 'PHOTO' | 'STICKER' | 'TEXT' | 'DRAWING'

export interface BaseFeedElement {
  id: string
  type: FeedElementType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  createdAt: string
  updatedAt: string
}

export interface PhotoElement extends BaseFeedElement {
  type: 'PHOTO'
  photoId: string
  src: string
  alt: string
}

export interface StickerElement extends BaseFeedElement {
  type: 'STICKER'
  stickerUrl: string
  stickerType: 'emoji' | 'icon' | 'custom'
}

export interface TextElement extends BaseFeedElement {
  type: 'TEXT'
  content: string
  fontSize: number
  fontFamily: string
  color: string
  backgroundColor?: string
  textAlign: 'left' | 'center' | 'right'
}

export interface DrawingElement extends BaseFeedElement {
  type: 'DRAWING'
  svgData: string
  strokeWidth: number
  strokeColor: string
}

export type FeedElement = PhotoElement | StickerElement | TextElement | DrawingElement

export interface FeedItem {
  id: string
  title?: string
  description?: string
  previewImage: string
  fullImage?: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
  hashtags?: string[]
  createdAt: string
  author: {
    id: string
    username: string
    avatar: string
  }
  feed?: UserFeed
}

// 피드 정보
export interface UserFeed {
  id: string
  userId: string
  name: string
  description: string
  isPublic: boolean
  backgroundColor: string
  backgroundImageUrl?: string
  totalHeight: number
  followersCount: number
  likesCount: number
  isFollowing: boolean
  isLiked: boolean
  createdAt: string
  updatedAt: string
}

// 피드 뷰포트 정보 (무한 스크롤용)
export interface FeedViewport {
  startY: number
  endY: number
  visibleElements: FeedElement[]
}

// 팔로우 관련
export interface FollowRelation {
  id: string
  followerId: string
  followingId: string
  createdAt: string
  isApproved: boolean
}

export interface UserProfile {
  id: string
  name: string
  email: string
  profileImage?: string
  feed: UserFeed
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isFollowedBy: boolean
}

// 타임라인 포스트
export interface TimelinePost {
  id: string
  user: {
    id: string
    name: string
    profileImage?: string
  }
  element: PhotoElement
  createdAt: string
  likesCount: number
  isLiked: boolean
}

// AI 배경 생성 관련
export interface AIBackgroundRequest {
  prompt: string
  style: 'diary' | 'vintage' | 'minimal' | 'cute'
}

export interface AIBackgroundResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  imageUrl?: string
  error?: string
}

// API 응답 타입들
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
}

// 피드 범위 조회용
export interface FeedBounds {
  minY: number
  maxY: number
  totalHeight: number
}
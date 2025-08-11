// src/lib/api/timeline.ts

// 타입 분리에 따른 새로운 import 구조
export interface CanvasElement {
  id: string
  type: 'PHOTO' | 'DRAWING' | 'STICKER'
  
  // 캔버스 내 위치 & 크기
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  
  // 생성/수정 시간
  createdAt: string
  updatedAt: string
  
  // 타입별 데이터
  photoData?: {
    imageUrl: string
    tags: string[]
  }
  
  drawingData?: {
    strokePaths: Array<{
      points: Array<{ x: number; y: number }>
      color: string
      strokeWidth: number
    }>
  }
  
  stickerData?: {
    stickerUrl: string
    stickerType: string
    stickerName: string
  }
}

export interface CanvasFeedItem {
  id: string
  title: string
  
  // 작성자 정보
  authorId: string
  authorName: string
  authorAvatar?: string
  
  // 무한 캔버스 설정
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
  backgroundImage?: string
  
  // 캔버스에 배치된 모든 요소들
  elements: CanvasElement[]
  
  // 상호작용
  likesCount: number
  isLiked: boolean
  
  // 시간 정보
  createdAt: string
  updatedAt: string
}

// TimelineFeedItem 타입 정의 (일반 피드 카드용)
export interface TimelineFeedItem {
  id: string
  title: string
  
  // 작성자 정보
  authorId: string
  authorName: string
  authorAvatar?: string
  
  // 타임라인 표시용 데이터
  previewImage?: string  // 캔버스의 썸네일 이미지
  description?: string   // 피드 설명
  hashtags?: string[]    // 해시태그
  
  // 상호작용
  likesCount: number
  isLiked: boolean
  commentsCount?: number
  
  // 시간 정보
  createdAt: string
  updatedAt: string
  
  // 원본 캔버스 피드와의 연결
  canvasFeedId: string  // 원본 CanvasFeedItem의 ID
  
  // 타임라인 전용 설정
  visibility: 'public' | 'followers' | 'private'
  isPinned?: boolean
}

export interface TimelineResponse {
  posts: TimelineFeedItem[]
  hasMore: boolean
  total: number
}

// 상수 정의
const TIMELINE_CONFIG = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const

const STORAGE_KEYS = {
  FOLLOW_RELATIONS: 'follow_relations',
  CURRENT_USER_ID: 'current_user_id',
  TIMELINE_FEEDS: 'timeline_feeds_v1'  // 타임라인 전용 피드 저장소
} as const

// 커스텀 에러 클래스
class TimelineApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'TimelineApiError'
  }
}

// Storage 유틸리티 (SSR 안전)
class SafeStorage {
  private static isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  }

  static getItem(key: string): string | null {
    if (!this.isClient()) return null
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error(`Failed to get item from storage: ${key}`, error)
      return null
    }
  }

  static setItem(key: string, value: string): void {
    if (!this.isClient()) return
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error(`Failed to set item to storage: ${key}`, error)
    }
  }
}

// 현재 사용자 ID 가져오기
const getCurrentUserId = (): string => {
  return SafeStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'user_1'
}

// 팔로우 관계 가져오기
const getFollowRelations = (): any[] => {
  try {
    const relationsData = SafeStorage.getItem(STORAGE_KEYS.FOLLOW_RELATIONS)
    return relationsData ? JSON.parse(relationsData) : []
  } catch (error) {
    console.error('Failed to get follow relations:', error)
    return []
  }
}

// 타임라인 피드 가져오기
const getTimelineFeeds = (): TimelineFeedItem[] => {
  try {
    const feedsData = SafeStorage.getItem(STORAGE_KEYS.TIMELINE_FEEDS)
    return feedsData ? JSON.parse(feedsData) : []
  } catch (error) {
    console.error('Failed to get timeline feeds:', error)
    return []
  }
}

// 타임라인 피드 저장
const saveTimelineFeed = (feed: TimelineFeedItem): void => {
  try {
    const allFeeds = getTimelineFeeds()
    const existingIndex = allFeeds.findIndex(f => f.id === feed.id)
    
    if (existingIndex >= 0) {
      allFeeds[existingIndex] = feed
    } else {
      allFeeds.unshift(feed)
    }
    
    SafeStorage.setItem(STORAGE_KEYS.TIMELINE_FEEDS, JSON.stringify(allFeeds))
  } catch (error) {
    console.error('Failed to save timeline feed:', error)
  }
}

// CanvasFeedItem을 TimelineFeedItem으로 변환
const convertCanvasToTimelineFeed = (canvasFeed: CanvasFeedItem): TimelineFeedItem => {
  // 캔버스에서 대표 이미지 추출 (첫 번째 PHOTO 요소 사용)
  const photoElement = canvasFeed.elements.find((el: CanvasElement) => el.type === 'PHOTO')
  const previewImage = photoElement?.photoData?.imageUrl || generateCanvasThumbnail(canvasFeed)
  
  // 해시태그 추출 (사진 태그에서)
  const hashtags = canvasFeed.elements
    .filter((el: CanvasElement) => el.type === 'PHOTO' && el.photoData?.tags)
    .flatMap((el: CanvasElement) => el.photoData!.tags)
    .filter((tag: string, index: number, self: string[]) => self.indexOf(tag) === index) // 중복 제거
    .slice(0, 5) // 최대 5개

  return {
    id: `timeline_${canvasFeed.id}`,
    title: canvasFeed.title,
    authorId: canvasFeed.authorId,
    authorName: canvasFeed.authorName,
    authorAvatar: canvasFeed.authorAvatar,
    previewImage,
    description: generateFeedDescription(canvasFeed),
    hashtags,
    likesCount: canvasFeed.likesCount,
    isLiked: canvasFeed.isLiked,
    commentsCount: 0, // 초기값
    createdAt: canvasFeed.createdAt,
    updatedAt: canvasFeed.updatedAt,
    canvasFeedId: canvasFeed.id,
    visibility: 'public', // 기본값
    isPinned: false
  }
}

// 캔버스 썸네일 생성 (placeholder)
const generateCanvasThumbnail = (canvasFeed: CanvasFeedItem): string => {
  return `/api/canvas-thumbnail/${canvasFeed.id}?w=400&h=300`
}

// 피드 설명 생성
const generateFeedDescription = (canvasFeed: CanvasFeedItem): string => {
  const elementCount = canvasFeed.elements.length
  const photoCount = canvasFeed.elements.filter((el: CanvasElement) => el.type === 'PHOTO').length
  const drawingCount = canvasFeed.elements.filter((el: CanvasElement) => el.type === 'DRAWING').length
  const stickerCount = canvasFeed.elements.filter((el: CanvasElement) => el.type === 'STICKER').length
  
  const parts = []
  if (photoCount > 0) parts.push(`사진 ${photoCount}개`)
  if (drawingCount > 0) parts.push(`그림 ${drawingCount}개`)
  if (stickerCount > 0) parts.push(`스티커 ${stickerCount}개`)
  
  return parts.length > 0 ? parts.join(', ') + '로 구성된 캔버스' : '빈 캔버스'
}

// 네트워크 지연 시뮬레이션
const simulateNetworkDelay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 메인 타임라인 가져오기 (팔로우한 사람들의 최신 게시물만)
export const getTimeline = async (
  page: number = 1,
  limit: number = TIMELINE_CONFIG.DEFAULT_LIMIT
): Promise<TimelineResponse> => {
  // 입력 검증
  if (page < 1) {
    throw new TimelineApiError('페이지 번호는 1 이상이어야 합니다.', 'INVALID_PAGE')
  }
  
  if (limit < 1 || limit > TIMELINE_CONFIG.MAX_LIMIT) {
    throw new TimelineApiError(`제한 수는 1-${TIMELINE_CONFIG.MAX_LIMIT} 사이여야 합니다.`, 'INVALID_LIMIT')
  }

  try {
    // 동적 import로 feed.ts 모듈 가져오기
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    
    const currentUserId = getCurrentUserId()
    const relations = getFollowRelations()
    
    // 팔로잉 중인 사용자들의 ID 가져오기
    const followingIds = relations
      .filter((r: any) => r.followerId === currentUserId)
      .map((r: any) => r.followingId)

    // 자신의 피드도 포함
    followingIds.push(currentUserId)

    if (followingIds.length === 0) {
      return {
        posts: [],
        hasMore: false,
        total: 0
      }
    }

    // 팔로잉한 사용자들의 모든 캔버스 피드 가져오기
    const allCanvasFeeds: CanvasFeedItem[] = []
    
    for (const followingId of followingIds) {
      try {
        const { feeds } = await getFeeds(followingId, 1, 50)
        allCanvasFeeds.push(...feeds)
      } catch (error) {
        console.warn(`Failed to get feeds for user ${followingId}:`, error)
      }
    }

    // 캔버스 피드를 타임라인 피드로 변환
    const timelineFeeds = allCanvasFeeds.map(convertCanvasToTimelineFeed)

    // public 피드만 필터링
    const publicFeeds = timelineFeeds.filter(feed => feed.visibility === 'public')

    // 시간순으로 정렬 (최신순)
    const sortedPosts = publicFeeds.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // 페이징 처리
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedPosts = sortedPosts.slice(startIndex, endIndex)

    // 시뮬레이션된 지연
    await simulateNetworkDelay(300)

    return {
      posts: paginatedPosts,
      hasMore: endIndex < sortedPosts.length,
      total: sortedPosts.length
    }
  } catch (error) {
    if (error instanceof TimelineApiError) {
      throw error
    }
    console.error('Failed to get timeline:', error)
    throw new TimelineApiError('타임라인을 불러오는데 실패했습니다.')
  }
}

// 타임라인 새로고침
export const refreshTimeline = async (): Promise<void> => {
  try {
    await getTimeline(1, TIMELINE_CONFIG.DEFAULT_LIMIT)
    await simulateNetworkDelay(500)
  } catch (error) {
    console.error('Failed to refresh timeline:', error)
    throw new TimelineApiError('타임라인 새로고침에 실패했습니다.')
  }
}

// 사용자별 타임라인 피드 히스토리 가져오기
export const getUserFeedHistory = async (
  userId: string,
  page: number = 1,
  limit: number = TIMELINE_CONFIG.DEFAULT_LIMIT
): Promise<TimelineResponse> => {
  if (!userId?.trim()) {
    throw new TimelineApiError('사용자 ID가 필요합니다.', 'MISSING_USER_ID')
  }

  if (page < 1 || limit < 1 || limit > TIMELINE_CONFIG.MAX_LIMIT) {
    throw new TimelineApiError('유효하지 않은 페이지 매개변수입니다.', 'INVALID_PAGINATION')
  }

  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(userId, page, limit)

    // 캔버스 피드를 타임라인 피드로 변환
    const timelineFeeds = feeds.map(convertCanvasToTimelineFeed)

    // 시간순 정렬 (최신순)
    const sortedPosts = timelineFeeds.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    await simulateNetworkDelay(200)

    return {
      posts: sortedPosts,
      hasMore: feeds.length === limit,
      total: feeds.length
    }
  } catch (error) {
    console.error('Failed to get user feed history:', error)
    throw new TimelineApiError('사용자 피드 히스토리를 불러오는데 실패했습니다.')
  }
}

// 해시태그별 피드 가져오기
export const getFeedsByHashtag = async (
  hashtag: string,
  page: number = 1,
  limit: number = TIMELINE_CONFIG.DEFAULT_LIMIT
): Promise<TimelineResponse> => {
  if (!hashtag?.trim()) {
    throw new TimelineApiError('해시태그가 필요합니다.', 'MISSING_HASHTAG')
  }

  if (page < 1 || limit < 1 || limit > TIMELINE_CONFIG.MAX_LIMIT) {
    throw new TimelineApiError('유효하지 않은 페이지 매개변수입니다.', 'INVALID_PAGINATION')
  }

  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 1000)
    
    // 캔버스 피드를 타임라인 피드로 변환
    const timelineFeeds = feeds.map(convertCanvasToTimelineFeed)
    
    // 해시태그로 필터링
    const filteredFeeds = timelineFeeds.filter(feed =>
      feed.hashtags?.some(tag => 
        tag.toLowerCase().includes(hashtag.toLowerCase())
      )
    )

    // 시간순 정렬 (최신순)
    const sortedPosts = filteredFeeds.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // 페이징 처리
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedPosts = sortedPosts.slice(startIndex, endIndex)

    await simulateNetworkDelay(250)

    return {
      posts: paginatedPosts,
      hasMore: endIndex < sortedPosts.length,
      total: sortedPosts.length
    }
  } catch (error) {
    console.error('Failed to get feeds by hashtag:', error)
    throw new TimelineApiError('해시태그별 피드를 불러오는데 실패했습니다.')
  }
}

// 트렌딩 해시태그 가져오기
export const getTrendingHashtags = async (
  limit: number = 10
): Promise<{ tag: string; count: number }[]> => {
  if (limit < 1 || limit > 100) {
    throw new TimelineApiError('제한 수는 1-100 사이여야 합니다.', 'INVALID_LIMIT')
  }

  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 1000)
    
    // 캔버스 피드를 타임라인 피드로 변환
    const timelineFeeds = feeds.map(convertCanvasToTimelineFeed)
    
    // 해시태그 빈도수 계산
    const hashtagCount: Record<string, number> = {}
    
    timelineFeeds.forEach(feed => {
      if (feed.hashtags) {
        feed.hashtags.forEach(tag => {
          const normalizedTag = tag.toLowerCase()
          hashtagCount[normalizedTag] = (hashtagCount[normalizedTag] || 0) + 1
        })
      }
    })

    // 빈도순 정렬
    const sortedTags = Object.entries(hashtagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    await simulateNetworkDelay(200)
    return sortedTags
  } catch (error) {
    console.error('Failed to get trending hashtags:', error)
    throw new TimelineApiError('트렌딩 해시태그를 불러오는데 실패했습니다.')
  }
}

// 타임라인 통계 정보
export const getTimelineStats = async (): Promise<{
  totalPosts: number
  followingCount: number
  avgPostsPerDay: number
}> => {
  try {
    const currentUserId = getCurrentUserId()
    const relations = getFollowRelations()
    
    // 팔로잉 수
    const followingCount = relations.filter((r: any) => r.followerId === currentUserId).length
    
    // 팔로잉한 사용자들의 게시물 수 계산
    const followingIds = relations
      .filter((r: any) => r.followerId === currentUserId)
      .map((r: any) => r.followingId)
    
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    let totalPosts = 0
    
    for (const followingId of followingIds) {
      try {
        const { feeds } = await getFeeds(followingId, 1, 100)
        totalPosts += feeds.length
      } catch (error) {
        console.warn(`Failed to get feeds for user ${followingId}:`, error)
      }
    }
    
    // 대략적인 일평균 게시물 수 (지난 30일 기준)
    const avgPostsPerDay = Math.round(totalPosts / 30)

    await simulateNetworkDelay(150)
    
    return {
      totalPosts,
      followingCount,
      avgPostsPerDay
    }
  } catch (error) {
    console.error('Failed to get timeline stats:', error)
    throw new TimelineApiError('타임라인 통계를 불러오는데 실패했습니다.')
  }
}

// 타임라인 피드 좋아요 토글
export const toggleTimelineFeedLike = async (timelineFeedId: string): Promise<TimelineFeedItem> => {
  try {
    // 원본 캔버스 피드 ID 추출
    const canvasFeedId = timelineFeedId.replace('timeline_', '')
    
    // 원본 캔버스 피드 좋아요 토글
    const feedModule = await import('./feed')
    const toggleFeedLike = feedModule.toggleFeedLike
    const updatedCanvasFeed = await toggleFeedLike(canvasFeedId)
    
    // 타임라인 피드로 변환하여 반환
    return convertCanvasToTimelineFeed(updatedCanvasFeed)
  } catch (error) {
    console.error('Failed to toggle timeline feed like:', error)
    throw new TimelineApiError('좋아요 처리에 실패했습니다.')
  }
}

// 타임라인 피드 가시성 업데이트
export const updateFeedVisibility = async (
  timelineFeedId: string,
  visibility: TimelineFeedItem['visibility']
): Promise<TimelineFeedItem> => {
  try {
    const timelineFeeds = getTimelineFeeds()
    const feedIndex = timelineFeeds.findIndex(feed => feed.id === timelineFeedId)
    
    if (feedIndex === -1) {
      throw new TimelineApiError('피드를 찾을 수 없습니다.', 'FEED_NOT_FOUND')
    }

    const currentUserId = getCurrentUserId()
    const feed = timelineFeeds[feedIndex]
    
    if (feed.authorId !== currentUserId) {
      throw new TimelineApiError('피드를 수정할 권한이 없습니다.', 'UNAUTHORIZED')
    }

    // 가시성 업데이트
    const updatedFeed: TimelineFeedItem = {
      ...feed,
      visibility,
      updatedAt: new Date().toISOString()
    }

    timelineFeeds[feedIndex] = updatedFeed
    SafeStorage.setItem(STORAGE_KEYS.TIMELINE_FEEDS, JSON.stringify(timelineFeeds))

    await simulateNetworkDelay(100)
    return updatedFeed
  } catch (error) {
    if (error instanceof TimelineApiError) {
      throw error
    }
    console.error('Failed to update feed visibility:', error)
    throw new TimelineApiError('피드 가시성 업데이트에 실패했습니다.')
  }
}
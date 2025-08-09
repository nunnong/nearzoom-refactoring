// src/lib/api/feed.ts

import { FeedElement, UserFeed } from '@/lib/types/feed'

// 🔥 기존 타입과 호환되는 인터페이스로 수정
interface CanvasFeedItem extends UserFeed {
  // UserFeed를 확장하여 호환성 확보
  elements: FeedElement[]
  
  // 작성자 정보 (추가)
  authorId: string
  authorName: string
  authorAvatar?: string
  
  // 상호작용 (추가)
  likesCount: number
  commentsCount?: number
}

interface CreateFeedData {
  name: string  // title 대신 name 사용 (UserFeed와 호환)
  description?: string
  canvasWidth?: number
  canvasHeight?: number
  backgroundColor?: string
  backgroundImageUrl?: string
  isPublic?: boolean
}

interface UpdateFeedData extends Partial<CreateFeedData> {
  elements?: FeedElement[]
  totalHeight?: number
}

// 🔥 API 응답 타입
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface PaginatedResponse<T> {
  items: T[]
  hasMore: boolean
  total: number
  page: number
  limit: number
}

// LocalStorage 키 상수
const FEEDS_KEY = 'canvas_feeds_v2'  // 버전 업데이트
const USER_FEEDS_KEY = 'user_canvas_feeds_v2'
const USER_LIKES_KEY = 'user_likes_v2'
const CURRENT_USER_KEY = 'current_user_id'

// 🔥 성능을 위한 캐시
let feedsCache: CanvasFeedItem[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5분

// 🔥 localStorage 용량 체크 및 관리
const checkStorageQuota = (): boolean => {
  try {
    const testKey = 'storage_test'
    const testData = 'x'.repeat(1024) // 1KB 테스트
    localStorage.setItem(testKey, testData)
    localStorage.removeItem(testKey)
    return true
  } catch (error) {
    console.warn('Storage quota exceeded or unavailable')
    return false
  }
}

// 🔥 안전한 JSON 파싱
const safeJsonParse = <T>(jsonString: string | null, fallback: T): T => {
  if (!jsonString) return fallback
  
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('JSON parse error:', error)
    return fallback
  }
}

// 🔥 안전한 localStorage 저장
const safeStorageSet = (key: string, data: any): boolean => {
  try {
    if (!checkStorageQuota()) {
      // 용량 부족 시 오래된 데이터 정리
      cleanupOldData()
    }
    
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Storage save error:', error)
    return false
  }
}

// 🔥 오래된 데이터 정리
const cleanupOldData = (): void => {
  try {
    const feeds = getAllFeedsFromStorage()
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    
    // 1주일 이상 된 피드 중 좋아요가 적은 것들 제거
    const filteredFeeds = feeds.filter(feed => {
      const feedTime = new Date(feed.createdAt).getTime()
      return feedTime > oneWeekAgo || feed.likesCount > 5
    })
    
    if (filteredFeeds.length < feeds.length) {
      localStorage.setItem(FEEDS_KEY, JSON.stringify(filteredFeeds))
      console.log(`Cleaned up ${feeds.length - filteredFeeds.length} old feeds`)
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

// 현재 사용자 ID
const getCurrentUserId = (): string => {
  return localStorage.getItem(CURRENT_USER_KEY) || 'user_1'
}

// 🔥 캐시된 피드 가져오기
const getAllFeedsFromStorage = (forceRefresh: boolean = false): CanvasFeedItem[] => {
  const now = Date.now()
  
  if (!forceRefresh && feedsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return feedsCache
  }

  try {
    const feedsData = localStorage.getItem(FEEDS_KEY)
    feedsCache = safeJsonParse(feedsData, [])
    cacheTimestamp = now
    return feedsCache
  } catch (error) {
    console.error('Failed to get feeds from storage:', error)
    return []
  }
}

// 🔥 캐시 무효화
const invalidateCache = (): void => {
  feedsCache = null
  cacheTimestamp = 0
}

// 피드 목록 가져오기 (전체 또는 특정 사용자)
export const getFeeds = async (
  userId?: string,
  page: number = 1,
  limit: number = 12
): Promise<ApiResponse<PaginatedResponse<CanvasFeedItem>>> => {
  try {
    const allFeeds = getAllFeedsFromStorage()
    
    // 특정 사용자의 피드만 필터링
    const filteredFeeds = userId 
      ? allFeeds.filter(feed => feed.userId === userId)  // authorId 대신 userId 사용
      : allFeeds.filter(feed => feed.isPublic)  // 공개 피드만

    // 최신순 정렬
    filteredFeeds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // 페이징 처리
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedFeeds = filteredFeeds.slice(startIndex, endIndex)

    // 현재 사용자의 좋아요 상태 업데이트
    const currentUserId = getCurrentUserId()
    const likedFeeds = getUserLikedList(currentUserId)

    const feedsWithLikeStatus = paginatedFeeds.map(feed => ({
      ...feed,
      isLiked: likedFeeds.includes(feed.id)
    }))

    // 시뮬레이션된 지연
    await new Promise(resolve => setTimeout(resolve, 200))

    return {
      success: true,
      data: {
        items: feedsWithLikeStatus,
        hasMore: endIndex < filteredFeeds.length,
        total: filteredFeeds.length,
        page,
        limit
      }
    }
  } catch (error) {
    console.error('Failed to get feeds:', error)
    return {
      success: false,
      error: '피드를 불러오는데 실패했습니다.'
    }
  }
}

// 단일 피드 가져오기
export const getFeed = async (feedId: string): Promise<ApiResponse<CanvasFeedItem>> => {
  try {
    const allFeeds = getAllFeedsFromStorage()
    const feed = allFeeds.find(feed => feed.id === feedId)
    
    if (!feed) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    // 좋아요 상태 업데이트
    const currentUserId = getCurrentUserId()
    const likedFeeds = getUserLikedList(currentUserId)

    return {
      success: true,
      data: {
        ...feed,
        isLiked: likedFeeds.includes(feed.id)
      }
    }
  } catch (error) {
    console.error('Failed to get feed:', error)
    return {
      success: false,
      error: '피드를 불러오는데 실패했습니다.'
    }
  }
}

// 새 피드 생성
export const createFeed = async (feedData: CreateFeedData): Promise<ApiResponse<CanvasFeedItem>> => {
  try {
    const currentUserId = getCurrentUserId()
    
    const newFeed: CanvasFeedItem = {
      id: generateFeedId(),
      userId: currentUserId,
      name: feedData.name,
      description: feedData.description || '',
      isPublic: feedData.isPublic ?? true,
      backgroundColor: feedData.backgroundColor || '#ffffff',
      backgroundImageUrl: feedData.backgroundImageUrl,
      totalHeight: feedData.canvasHeight || 1600,
      
      // 작성자 정보
      authorId: currentUserId,
      authorName: getUsernameFromStorage(currentUserId),
      authorAvatar: getUserAvatarFromStorage(currentUserId),
      
      // 빈 요소 배열로 시작
      elements: [],
      
      // 상호작용 초기값
      followersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      isFollowing: false,
      isLiked: false,
      
      // 시간 정보
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // 스토리지에 저장
    const saved = saveFeedToStorage(newFeed)
    if (!saved) {
      return {
        success: false,
        error: '저장 공간이 부족합니다. 일부 데이터를 삭제해주세요.'
      }
    }
    
    // 사용자별 피드 목록에 추가
    addFeedToUserList(currentUserId, newFeed.id)

    return {
      success: true,
      data: newFeed
    }
  } catch (error) {
    console.error('Failed to create feed:', error)
    return {
      success: false,
      error: '피드 생성에 실패했습니다.'
    }
  }
}

// 피드 업데이트
export const updateFeed = async (
  feedId: string, 
  updateData: UpdateFeedData
): Promise<ApiResponse<CanvasFeedItem>> => {
  try {
    const currentUserId = getCurrentUserId()
    const allFeeds = getAllFeedsFromStorage()
    const feedIndex = allFeeds.findIndex(feed => feed.id === feedId)
    
    if (feedIndex === -1) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    const existingFeed = allFeeds[feedIndex]
    
    // 권한 확인
    if (existingFeed.userId !== currentUserId) {
      return {
        success: false,
        error: '피드를 수정할 권한이 없습니다.'
      }
    }

    // 업데이트된 피드 생성
    const updatedFeed: CanvasFeedItem = {
      ...existingFeed,
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    // 스토리지 업데이트
    allFeeds[feedIndex] = updatedFeed
    const saved = safeStorageSet(FEEDS_KEY, allFeeds)
    
    if (!saved) {
      return {
        success: false,
        error: '저장에 실패했습니다.'
      }
    }

    invalidateCache()

    return {
      success: true,
      data: updatedFeed
    }
  } catch (error) {
    console.error('Failed to update feed:', error)
    return {
      success: false,
      error: '피드 업데이트에 실패했습니다.'
    }
  }
}

// 🔥 배경색 업데이트 (FeedEditor에서 필요)
export const updateFeedBackground = async (
  feedId: string,
  backgroundColor: string
): Promise<ApiResponse<CanvasFeedItem>> => {
  return updateFeed(feedId, { backgroundColor })
}

// 🔥 배경 이미지 업데이트
export const updateFeedBackgroundImage = async (
  feedId: string,
  backgroundImageUrl: string | undefined
): Promise<ApiResponse<CanvasFeedItem>> => {
  return updateFeed(feedId, { backgroundImageUrl })
}

// 피드에 요소 추가
export const addElementToFeed = async (
  feedId: string,
  element: Omit<FeedElement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<FeedElement>> => {
  try {
    const feedResponse = await getFeed(feedId)
    if (!feedResponse.success || !feedResponse.data) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    const feed = feedResponse.data

    // 🔥 타입별로 새 요소 생성 (타입 안전성 확보)
    const newElement: FeedElement = {
      ...element,
      id: generateElementId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as FeedElement

    // 피드에 요소 추가
    const updatedElements = [...feed.elements, newElement]
    const updateResponse = await updateFeed(feedId, { elements: updatedElements })

    if (!updateResponse.success) {
      return {
        success: false,
        error: updateResponse.error
      }
    }

    return {
      success: true,
      data: newElement
    }
  } catch (error) {
    console.error('Failed to add element to feed:', error)
    return {
      success: false,
      error: '요소 추가에 실패했습니다.'
    }
  }
}

// 🔥 타입 안전한 요소 업데이트 함수
export const updateElementInFeed = async (
  feedId: string,
  elementId: string,
  updateData: Partial<FeedElement>
): Promise<ApiResponse<FeedElement>> => {
  try {
    const feedResponse = await getFeed(feedId)
    if (!feedResponse.success || !feedResponse.data) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    const feed = feedResponse.data
    const elementIndex = feed.elements.findIndex(el => el.id === elementId)
    
    if (elementIndex === -1) {
      return {
        success: false,
        error: '요소를 찾을 수 없습니다.'
      }
    }

    const existingElement = feed.elements[elementIndex]

    // 🔥 타입별 안전한 업데이트 처리 - Object.assign 사용
    const baseUpdate = {
      ...existingElement,
      updatedAt: new Date().toISOString()
    }

    let updatedElement: FeedElement

    switch (existingElement.type) {
      case 'PHOTO':
        updatedElement = Object.assign(baseUpdate, updateData, { type: 'PHOTO' }) as FeedElement
        break

      case 'STICKER':
        updatedElement = Object.assign(baseUpdate, updateData, { type: 'STICKER' }) as FeedElement
        break

      case 'TEXT':
        updatedElement = Object.assign(baseUpdate, updateData, { type: 'TEXT' }) as FeedElement
        break

      case 'DRAWING':
        updatedElement = Object.assign(baseUpdate, updateData, { type: 'DRAWING' }) as FeedElement
        break

      default:
        // 알 수 없는 타입의 경우 기본 처리
        updatedElement = Object.assign(baseUpdate, updateData) as FeedElement
    }

    // 요소 배열 업데이트
    const updatedElements = [...feed.elements]
    updatedElements[elementIndex] = updatedElement

    const updateResponse = await updateFeed(feedId, { elements: updatedElements })

    if (!updateResponse.success) {
      return {
        success: false,
        error: updateResponse.error
      }
    }

    return {
      success: true,
      data: updatedElement
    }
  } catch (error) {
    console.error('Failed to update element:', error)
    return {
      success: false,
      error: '요소 업데이트에 실패했습니다.'
    }
  }
}

// 🔥 다중 요소 업데이트 (성능 최적화)
export const updateMultipleElements = async (
  feedId: string,
  updates: Array<{ elementId: string; updateData: Partial<FeedElement> }>
): Promise<ApiResponse<FeedElement[]>> => {
  try {
    const feedResponse = await getFeed(feedId)
    if (!feedResponse.success || !feedResponse.data) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    const feed = feedResponse.data
    const updatedElements = [...feed.elements]
    const resultElements: FeedElement[] = []

    // 모든 업데이트를 한 번에 처리
    for (const update of updates) {
      const elementIndex = updatedElements.findIndex(el => el.id === update.elementId)
      if (elementIndex !== -1) {
        const existingElement = updatedElements[elementIndex]
        
        // 🔥 Object.assign을 사용한 안전한 업데이트
        const baseUpdate = {
          ...existingElement,
          updatedAt: new Date().toISOString()
        }

        const updatedElement = Object.assign(
          baseUpdate,
          update.updateData,
          { type: existingElement.type } // 타입 고정
        ) as FeedElement

        updatedElements[elementIndex] = updatedElement
        resultElements.push(updatedElement)
      }
    }

    const updateResponse = await updateFeed(feedId, { elements: updatedElements })

    if (!updateResponse.success) {
      return {
        success: false,
        error: updateResponse.error
      }
    }

    return {
      success: true,
      data: resultElements
    }
  } catch (error) {
    console.error('Failed to update multiple elements:', error)
    return {
      success: false,
      error: '다중 요소 업데이트에 실패했습니다.'
    }
  }
}

// 피드에서 요소 삭제
export const removeElementFromFeed = async (
  feedId: string,
  elementId: string
): Promise<ApiResponse<void>> => {
  try {
    const feedResponse = await getFeed(feedId)
    if (!feedResponse.success || !feedResponse.data) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    const feed = feedResponse.data
    const updatedElements = feed.elements.filter(el => el.id !== elementId)
    
    const updateResponse = await updateFeed(feedId, { elements: updatedElements })

    if (!updateResponse.success) {
      return {
        success: false,
        error: updateResponse.error
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to remove element:', error)
    return {
      success: false,
      error: '요소 삭제에 실패했습니다.'
    }
  }
}

// 🔥 다중 요소 삭제
export const removeMultipleElements = async (
  feedId: string,
  elementIds: string[]
): Promise<ApiResponse<void>> => {
  try {
    const feedResponse = await getFeed(feedId)
    if (!feedResponse.success || !feedResponse.data) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    const feed = feedResponse.data
    const updatedElements = feed.elements.filter(el => !elementIds.includes(el.id))
    
    const updateResponse = await updateFeed(feedId, { elements: updatedElements })

    if (!updateResponse.success) {
      return {
        success: false,
        error: updateResponse.error
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to remove multiple elements:', error)
    return {
      success: false,
      error: '다중 요소 삭제에 실패했습니다.'
    }
  }
}

// 피드 삭제
export const deleteFeed = async (feedId: string): Promise<ApiResponse<void>> => {
  try {
    const currentUserId = getCurrentUserId()
    const allFeeds = getAllFeedsFromStorage()
    const feedIndex = allFeeds.findIndex(feed => feed.id === feedId)
    
    if (feedIndex === -1) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    const feed = allFeeds[feedIndex]
    
    // 권한 확인
    if (feed.userId !== currentUserId) {
      return {
        success: false,
        error: '피드를 삭제할 권한이 없습니다.'
      }
    }

    // 피드 삭제
    allFeeds.splice(feedIndex, 1)
    const saved = safeStorageSet(FEEDS_KEY, allFeeds)

    if (!saved) {
      return {
        success: false,
        error: '삭제에 실패했습니다.'
      }
    }

    // 사용자별 피드 목록에서도 제거
    removeFeedFromUserList(currentUserId, feedId)
    
    // 모든 사용자의 좋아요 목록에서 제거
    removeFromAllUserLikes(feedId)

    invalidateCache()

    return { success: true }
  } catch (error) {
    console.error('Failed to delete feed:', error)
    return {
      success: false,
      error: '피드 삭제에 실패했습니다.'
    }
  }
}

// 피드 좋아요 토글
export const toggleFeedLike = async (feedId: string): Promise<ApiResponse<CanvasFeedItem>> => {
  try {
    const currentUserId = getCurrentUserId()
    const allFeeds = getAllFeedsFromStorage()
    const feedIndex = allFeeds.findIndex(feed => feed.id === feedId)
    
    if (feedIndex === -1) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    const feed = allFeeds[feedIndex]
    const likedFeeds = getUserLikedList(currentUserId)
    const isCurrentlyLiked = likedFeeds.includes(feedId)
    
    // 좋아요 상태 토글
    const updatedFeed: CanvasFeedItem = {
      ...feed,
      isLiked: !isCurrentlyLiked,
      likesCount: isCurrentlyLiked 
        ? Math.max(0, feed.likesCount - 1)
        : feed.likesCount + 1,
      updatedAt: new Date().toISOString()
    }

    // 스토리지 업데이트
    allFeeds[feedIndex] = updatedFeed
    const saved = safeStorageSet(FEEDS_KEY, allFeeds)

    if (!saved) {
      return {
        success: false,
        error: '좋아요 처리에 실패했습니다.'
      }
    }

    // 사용자별 좋아요 목록 관리
    updateUserLikesList(currentUserId, feedId, !isCurrentlyLiked)

    invalidateCache()

    return {
      success: true,
      data: updatedFeed
    }
  } catch (error) {
    console.error('Failed to toggle feed like:', error)
    return {
      success: false,
      error: '좋아요 처리에 실패했습니다.'
    }
  }
}

// 🔥 피드 통계 조회
export const getFeedStats = async (feedId: string): Promise<ApiResponse<{
  totalElements: number
  elementsByType: Record<string, number>
  lastUpdated: string
  totalSize: string
}>> => {
  try {
    const feedResponse = await getFeed(feedId)
    if (!feedResponse.success || !feedResponse.data) {
      return {
        success: false,
        error: '피드를 찾을 수 없습니다.'
      }
    }

    const feed = feedResponse.data
    const elementsByType: Record<string, number> = {}
    
    feed.elements.forEach(element => {
      elementsByType[element.type] = (elementsByType[element.type] || 0) + 1
    })

    const feedSize = JSON.stringify(feed).length
    const sizeInKB = (feedSize / 1024).toFixed(2)

    return {
      success: true,
      data: {
        totalElements: feed.elements.length,
        elementsByType,
        lastUpdated: feed.updatedAt,
        totalSize: `${sizeInKB} KB`
      }
    }
  } catch (error) {
    console.error('Failed to get feed stats:', error)
    return {
      success: false,
      error: '통계 조회에 실패했습니다.'
    }
  }
}

// === Helper Functions ===

// 피드를 스토리지에 저장
const saveFeedToStorage = (feed: CanvasFeedItem): boolean => {
  try {
    const allFeeds = getAllFeedsFromStorage()
    allFeeds.push(feed)
    const saved = safeStorageSet(FEEDS_KEY, allFeeds)
    if (saved) {
      invalidateCache()
    }
    return saved
  } catch (error) {
    console.error('Failed to save feed to storage:', error)
    return false
  }
}

// ID 생성 함수들
const generateFeedId = (): string => {
  return `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const generateElementId = (): string => {
  return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 사용자 정보 함수들
const getUsernameFromStorage = (userId: string): string => {
  const usernames: Record<string, string> = {
    'user_1': 'artist_jane',
    'user_2': 'creative_kim',
    'user_3': 'photo_diary',
    'user_4': 'daily_canvas',
    'user_5': 'memory_keeper'
  }
  return usernames[userId] || `user_${userId.slice(-4)}`
}

const getUserAvatarFromStorage = (userId: string): string => {
  return `/api/placeholder/40/40?seed=${userId}`
}

// 사용자별 피드 관리
const addFeedToUserList = (userId: string, feedId: string): void => {
  try {
    const userFeeds = getUserFeedsList(userId)
    if (!userFeeds.includes(feedId)) {
      userFeeds.unshift(feedId)
      safeStorageSet(`${USER_FEEDS_KEY}_${userId}`, userFeeds)
    }
  } catch (error) {
    console.error('Failed to add feed to user list:', error)
  }
}

const removeFeedFromUserList = (userId: string, feedId: string): void => {
  try {
    const userFeeds = getUserFeedsList(userId)
    const filteredFeeds = userFeeds.filter(id => id !== feedId)
    safeStorageSet(`${USER_FEEDS_KEY}_${userId}`, filteredFeeds)
  } catch (error) {
    console.error('Failed to remove feed from user list:', error)
  }
}

const getUserFeedsList = (userId: string): string[] => {
  try {
    const userFeedsData = localStorage.getItem(`${USER_FEEDS_KEY}_${userId}`)
    return safeJsonParse(userFeedsData, [])
  } catch (error) {
    console.error('Failed to get user feeds list:', error)
    return []
  }
}

// 사용자별 좋아요 관리
const updateUserLikesList = (userId: string, feedId: string, isLiked: boolean): void => {
  try {
    const likedFeeds = getUserLikedList(userId)
    if (isLiked && !likedFeeds.includes(feedId)) {
      likedFeeds.push(feedId)
    } else if (!isLiked) {
      const index = likedFeeds.indexOf(feedId)
      if (index > -1) {
        likedFeeds.splice(index, 1)
      }
    }
    safeStorageSet(`${USER_LIKES_KEY}_${userId}`, likedFeeds)
  } catch (error) {
    console.error('Failed to update user likes list:', error)
  }
}

const getUserLikedList = (userId: string): string[] => {
  try {
    const likedData = localStorage.getItem(`${USER_LIKES_KEY}_${userId}`)
    return safeJsonParse(likedData, [])
  } catch (error) {
    console.error('Failed to get user liked list:', error)
    return []
  }
}

const removeFromAllUserLikes = (feedId: string): void => {
  // 간단한 구현: 현재 사용자만 처리
  const currentUserId = getCurrentUserId()
  const likedFeeds = getUserLikedList(currentUserId)
  const filteredLiked = likedFeeds.filter(id => id !== feedId)
  safeStorageSet(`${USER_LIKES_KEY}_${currentUserId}`, filteredLiked)
}

// 🔥 개발/테스트용 함수들

// 🔥 타입 안전한 더미 요소 생성 헬퍼
const createPhotoElement = (data: {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  photoId: string
  src: string
  alt: string
}): FeedElement => ({
  ...data,
  type: 'PHOTO',
  rotation: data.rotation || 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const createStickerElement = (data: {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  stickerUrl: string
  stickerType: 'emoji' | 'icon' | 'custom'
}): FeedElement => ({
  ...data,
  type: 'STICKER',
  rotation: data.rotation || 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const createTextElement = (data: {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  content: string
  fontSize: number
  fontFamily: string
  color: string
  textAlign: 'left' | 'center' | 'right'
}): FeedElement => ({
  ...data,
  type: 'TEXT',
  rotation: data.rotation || 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const createDrawingElement = (data: {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  svgData: string
  strokeWidth: number
  strokeColor: string
}): FeedElement => ({
  ...data,
  type: 'DRAWING',
  rotation: data.rotation || 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

// 초기 더미 데이터 생성
export const initializeDummyFeeds = (): void => {
  try {
    const existingFeeds = getAllFeedsFromStorage()
    if (existingFeeds.length === 0) {
      const dummyFeeds: CanvasFeedItem[] = [
        {
          id: 'feed_1',
          userId: 'user_1',
          name: '🌸 봄날의 추억',
          description: '벚꽃이 만개한 공원에서의 소중한 순간들',
          isPublic: true,
          backgroundColor: '#fff5f5',
          backgroundImageUrl: undefined,
          totalHeight: 1600,
          followersCount: 12,
          likesCount: 24,
          commentsCount: 8,
          isFollowing: false,
          isLiked: false,
          
          // 작성자 정보
          authorId: 'user_1',
          authorName: 'artist_jane',
          authorAvatar: '/api/placeholder/40/40?seed=user1',
          
          elements: [
            createPhotoElement({
              id: 'element_1',
              x: 100,
              y: 200,
              width: 400,
              height: 300,
              rotation: -5,
              zIndex: 1,
              photoId: 'photo_1',
              src: '/api/placeholder/400/300?seed=cherry',
              alt: '벚꽃 사진'
            }),
            createStickerElement({
              id: 'element_2',
              x: 300,
              y: 150,
              width: 60,
              height: 60,
              rotation: 15,
              zIndex: 2,
              stickerUrl: '/api/placeholder/60/60?seed=flower',
              stickerType: 'emoji'
            }),
            createTextElement({
              id: 'element_3',
              x: 200,
              y: 550,
              width: 300,
              height: 60,
              rotation: 0,
              zIndex: 3,
              content: '벚꽃이 참 예쁘네요 🌸',
              fontSize: 18,
              fontFamily: 'Arial, sans-serif',
              color: '#ff69b4',
              textAlign: 'left'
            })
          ],
          
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'feed_2',
          userId: 'user_2',
          name: '☕ 카페 일상',
          description: '오늘의 커피와 디저트 기록',
          isPublic: true,
          backgroundColor: '#f0f8ff',
          backgroundImageUrl: undefined,
          totalHeight: 1400,
          followersCount: 8,
          likesCount: 15,
          commentsCount: 3,
          isFollowing: false,
          isLiked: false,
          
          authorId: 'user_2',
          authorName: 'creative_kim',
          authorAvatar: '/api/placeholder/40/40?seed=user2',
          
          elements: [
            createPhotoElement({
              id: 'element_4',
              x: 150,
              y: 100,
              width: 300,
              height: 400,
              rotation: 2,
              zIndex: 1,
              photoId: 'photo_2',
              src: '/api/placeholder/300/400?seed=coffee',
              alt: '라떼 사진'
            }),
            createTextElement({
              id: 'element_5',
              x: 50,
              y: 520,
              width: 400,
              height: 40,
              rotation: -1,
              zIndex: 2,
              content: '오늘의 라떼는 정말 맛있었어요!',
              fontSize: 16,
              fontFamily: 'Arial, sans-serif',
              color: '#8B4513',
              textAlign: 'center'
            })
          ],
          
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'feed_3',
          userId: 'user_3',
          name: '🎨 오늘의 스케치',
          description: '일상 속 작은 아름다움을 그려보았어요',
          isPublic: true,
          backgroundColor: '#fffacd',
          backgroundImageUrl: undefined,
          totalHeight: 1800,
          followersCount: 20,
          likesCount: 35,
          commentsCount: 12,
          isFollowing: false,
          isLiked: false,
          
          authorId: 'user_3',
          authorName: 'photo_diary',
          authorAvatar: '/api/placeholder/40/40?seed=user3',
          
          elements: [
            createDrawingElement({
              id: 'element_6',
              x: 100,
              y: 150,
              width: 400,
              height: 300,
              rotation: 0,
              zIndex: 1,
              svgData: '<svg><path d="M10,50 Q50,10 100,50 T200,50" stroke="#2563eb" stroke-width="3" fill="none"/></svg>',
              strokeWidth: 3,
              strokeColor: '#2563eb'
            }),
            createStickerElement({
              id: 'element_7',
              x: 450,
              y: 120,
              width: 50,
              height: 50,
              rotation: -10,
              zIndex: 2,
              stickerUrl: '/api/placeholder/50/50?seed=paint',
              stickerType: 'icon'
            })
          ],
          
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3시간 전
          updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      const saved = safeStorageSet(FEEDS_KEY, dummyFeeds)
      if (saved) {
        console.log('Canvas feed dummy data initialized')
        invalidateCache()
      } else {
        console.error('Failed to save dummy data')
      }
    }
  } catch (error) {
    console.error('Failed to initialize dummy feeds:', error)
  }
}

// 스토리지 데이터 초기화 (개발/테스트용)
export const clearAllFeedData = (): void => {
  try {
    localStorage.removeItem(FEEDS_KEY)
    // 사용자별 데이터도 제거
    for (let i = 1; i <= 5; i++) {
      localStorage.removeItem(`${USER_FEEDS_KEY}_user_${i}`)
      localStorage.removeItem(`${USER_LIKES_KEY}_user_${i}`)
    }
    invalidateCache()
    console.log('All feed data cleared')
  } catch (error) {
    console.error('Failed to clear feed data:', error)
  }
}

// 🔥 데이터 내보내기 (백업용)
export const exportFeedData = (): string => {
  try {
    const allFeeds = getAllFeedsFromStorage()
    const exportData = {
      version: 'v2',
      timestamp: new Date().toISOString(),
      feeds: allFeeds,
      userFeeds: {} as Record<string, string[]>,
      userLikes: {} as Record<string, string[]>
    }

    // 사용자별 데이터도 포함
    for (let i = 1; i <= 5; i++) {
      const userId = `user_${i}`
      exportData.userFeeds[userId] = getUserFeedsList(userId)
      exportData.userLikes[userId] = getUserLikedList(userId)
    }

    return JSON.stringify(exportData, null, 2)
  } catch (error) {
    console.error('Failed to export feed data:', error)
    return '{}'
  }
}

// 🔥 데이터 가져오기 (복원용)
export const importFeedData = (jsonData: string): boolean => {
  try {
    const importData = JSON.parse(jsonData)
    
    if (!importData.feeds || !Array.isArray(importData.feeds)) {
      throw new Error('Invalid data format')
    }

    // 피드 데이터 복원
    const saved = safeStorageSet(FEEDS_KEY, importData.feeds)
    if (!saved) {
      throw new Error('Storage save failed')
    }

    // 사용자별 데이터 복원
    if (importData.userFeeds) {
      Object.entries(importData.userFeeds).forEach(([userId, feeds]) => {
        safeStorageSet(`${USER_FEEDS_KEY}_${userId}`, feeds)
      })
    }

    if (importData.userLikes) {
      Object.entries(importData.userLikes).forEach(([userId, likes]) => {
        safeStorageSet(`${USER_LIKES_KEY}_${userId}`, likes)
      })
    }

    invalidateCache()
    console.log('Feed data imported successfully')
    return true
  } catch (error) {
    console.error('Failed to import feed data:', error)
    return false
  }
}

// 🔥 저장소 상태 확인
export const getStorageInfo = (): {
  totalFeeds: number
  totalElements: number
  storageUsed: string
  cacheStatus: string
} => {
  try {
    const allFeeds = getAllFeedsFromStorage()
    const totalElements = allFeeds.reduce((sum, feed) => sum + feed.elements.length, 0)
    
    // 대략적인 저장소 사용량 계산
    const feedsData = localStorage.getItem(FEEDS_KEY) || ''
    const sizeInKB = (feedsData.length / 1024).toFixed(2)
    
    return {
      totalFeeds: allFeeds.length,
      totalElements,
      storageUsed: `${sizeInKB} KB`,
      cacheStatus: feedsCache ? 'Active' : 'Inactive'
    }
  } catch (error) {
    console.error('Failed to get storage info:', error)
    return {
      totalFeeds: 0,
      totalElements: 0,
      storageUsed: '0 KB',
      cacheStatus: 'Error'
    }
  }
}

// 🔥 캐시 수동 새로고침
export const refreshCache = (): void => {
  invalidateCache()
  getAllFeedsFromStorage(true)
  console.log('Cache refreshed')
}

// 🔥 현재 사용자 설정
export const setCurrentUser = (userId: string): void => {
  localStorage.setItem(CURRENT_USER_KEY, userId)
  invalidateCache() // 사용자 변경 시 캐시 무효화
}

// 🔥 전체 사용자 목록
export const getAllUsers = (): Array<{ id: string; name: string; avatar: string }> => {
  return [
    { id: 'user_1', name: 'artist_jane', avatar: '/api/placeholder/40/40?seed=user1' },
    { id: 'user_2', name: 'creative_kim', avatar: '/api/placeholder/40/40?seed=user2' },
    { id: 'user_3', name: 'photo_diary', avatar: '/api/placeholder/40/40?seed=user3' },
    { id: 'user_4', name: 'daily_canvas', avatar: '/api/placeholder/40/40?seed=user4' },
    { id: 'user_5', name: 'memory_keeper', avatar: '/api/placeholder/40/40?seed=user5' }
  ]
}
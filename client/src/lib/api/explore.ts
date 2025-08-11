// src/lib/api/explore.ts

// TimelineFeedItem을 탐색용으로 활용 (기존 FeedItem 대체)
export interface TimelineFeedItem {
  id: string
  title: string
  
  // 작성자 정보
  authorId: string
  authorName: string
  authorAvatar?: string
  
  // 타임라인 표시용 데이터
  previewImage?: string
  description?: string
  hashtags?: string[]
  
  // 상호작용
  likesCount: number
  isLiked: boolean
  commentsCount?: number
  
  // 시간 정보
  createdAt: string
  updatedAt: string
  
  // 원본 캔버스 피드와의 연결
  canvasFeedId: string
  
  // 타임라인 전용 설정
  visibility: 'public' | 'followers' | 'private'
  isPinned?: boolean
}

// 탐색 전용 피드 인터페이스
export interface ExploreFeed extends TimelineFeedItem {
  category?: string
  discoverScore: number // 탐색 추천 점수
}

export interface ExploreCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

export interface ExploreFilters {
  categories?: string[]
  minLikes?: number
  maxAge?: number // 일 단위
  excludeFollowing?: boolean
}

export interface UserProfile {
  id: string
  username: string
  displayName?: string
  avatar?: string
  bio?: string
  followersCount: number
  followingCount: number
  isFollowing: boolean
}

// 현재 사용자 ID 가져오기
const getCurrentUserId = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('current_user_id') || 'user_1'
  }
  return 'user_1'
}

// 탐색 카테고리 목록
export const getExploreCategories = (): ExploreCategory[] => {
  return [
    {
      id: 'popular',
      name: '인기',
      description: '가장 많은 사랑을 받은 피드들',
      icon: '🔥',
      color: 'bg-red-500'
    },
    {
      id: 'recent',
      name: '최신',
      description: '방금 올라온 따끈한 피드들',
      icon: '🆕',
      color: 'bg-blue-500'
    },
    {
      id: 'creative',
      name: '창작',
      description: '창의적이고 독특한 작품들',
      icon: '🎨',
      color: 'bg-purple-500'
    },
    {
      id: 'photography',
      name: '사진',
      description: '멋진 사진과 풍경들',
      icon: '📷',
      color: 'bg-green-500'
    },
    {
      id: 'lifestyle',
      name: '라이프스타일',
      description: '일상과 취미 공유',
      icon: '🌟',
      color: 'bg-yellow-500'
    },
    {
      id: 'random',
      name: '랜덤',
      description: '예상치 못한 발견의 재미',
      icon: '🎲',
      color: 'bg-gray-500'
    }
  ]
}

// 캔버스 피드를 타임라인 피드로 변환하는 헬퍼 함수
const convertCanvasToTimelineFeed = async (canvasFeedId: string): Promise<TimelineFeedItem | null> => {
  try {
    const feedModule = await import('./feed')
    const getFeed = feedModule.getFeed
    const canvasFeed = await getFeed(canvasFeedId)
    
    if (!canvasFeed) return null
    
    // 캔버스에서 대표 이미지 추출
    const photoElement = canvasFeed.elements.find((el: any) => el.type === 'PHOTO')
    const previewImage = photoElement?.photoData?.imageUrl || `/api/canvas-thumbnail/${canvasFeed.id}?w=400&h=300`
    
    // 해시태그 추출 (사진 태그에서)
    const hashtags = canvasFeed.elements
      .filter((el: any) => el.type === 'PHOTO' && el.photoData?.tags)
      .flatMap((el: any) => el.photoData!.tags)
      .filter((tag: string, index: number, self: string[]) => self.indexOf(tag) === index)
      .slice(0, 5)
    
    // 피드 설명 생성
    const elementCount = canvasFeed.elements.length
    const photoCount = canvasFeed.elements.filter((el: any) => el.type === 'PHOTO').length
    const drawingCount = canvasFeed.elements.filter((el: any) => el.type === 'DRAWING').length
    const stickerCount = canvasFeed.elements.filter((el: any) => el.type === 'STICKER').length
    
    const parts = []
    if (photoCount > 0) parts.push(`사진 ${photoCount}개`)
    if (drawingCount > 0) parts.push(`그림 ${drawingCount}개`)
    if (stickerCount > 0) parts.push(`스티커 ${stickerCount}개`)
    const description = parts.length > 0 ? parts.join(', ') + '로 구성된 캔버스' : '빈 캔버스'

    return {
      id: `timeline_${canvasFeed.id}`,
      title: canvasFeed.title,
      authorId: canvasFeed.authorId,
      authorName: canvasFeed.authorName,
      authorAvatar: canvasFeed.authorAvatar,
      previewImage,
      description,
      hashtags,
      likesCount: canvasFeed.likesCount,
      isLiked: canvasFeed.isLiked,
      commentsCount: 0,
      createdAt: canvasFeed.createdAt,
      updatedAt: canvasFeed.updatedAt,
      canvasFeedId: canvasFeed.id,
      visibility: 'public',
      isPinned: false
    }
  } catch (error) {
    console.error('Failed to convert canvas to timeline feed:', error)
    return null
  }
}

// 탐색 피드 가져오기
export const getExploreFeeds = async (
  category: string = 'popular',
  page: number = 1,
  limit: number = 20,
  filters: ExploreFilters = {}
): Promise<{ feeds: ExploreFeed[], hasMore: boolean, total: number }> => {
  try {
    const currentUserId = getCurrentUserId()
    let exploreFeeds: ExploreFeed[] = []

    switch (category) {
      case 'popular':
        exploreFeeds = await getPopularFeeds(currentUserId, filters)
        break
      case 'recent':
        exploreFeeds = await getRecentFeeds(currentUserId, filters)
        break
      case 'creative':
        exploreFeeds = await getCreativeFeeds(currentUserId, filters)
        break
      case 'photography':
        exploreFeeds = await getPhotographyFeeds(currentUserId, filters)
        break
      case 'lifestyle':
        exploreFeeds = await getLifestyleFeeds(currentUserId, filters)
        break
      case 'random':
        exploreFeeds = await getRandomExploreFeeds(currentUserId, filters)
        break
      default:
        exploreFeeds = await getPopularFeeds(currentUserId, filters)
    }

    // 페이징 처리
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedFeeds = exploreFeeds.slice(startIndex, endIndex)

    // 시뮬레이션된 지연
    await new Promise(resolve => setTimeout(resolve, 300))

    return {
      feeds: paginatedFeeds,
      hasMore: endIndex < exploreFeeds.length,
      total: exploreFeeds.length
    }
  } catch (error) {
    console.error('Failed to get explore feeds:', error)
    throw new Error('탐색 피드를 불러오는데 실패했습니다.')
  }
}

// 인기 피드 가져오기
const getPopularFeeds = async (
  userId: string,
  filters: ExploreFilters
): Promise<ExploreFeed[]> => {
  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 200)
    
    // 캔버스 피드를 타임라인 피드로 변환
    const timelineFeeds: TimelineFeedItem[] = []
    for (const canvasFeed of feeds) {
      if (canvasFeed.authorId !== userId) {
        const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
        if (timelineFeed) {
          timelineFeeds.push(timelineFeed)
        }
      }
    }
    
    let popularFeeds = timelineFeeds
      .filter((feed: TimelineFeedItem) => feed.visibility === 'public')
      .filter((feed: TimelineFeedItem) => applyFilters(feed, filters))
      .map((feed: TimelineFeedItem) => ({
        ...feed,
        category: 'popular',
        discoverScore: calculatePopularityScore(feed)
      }))

    return popularFeeds
      .sort((a, b) => b.discoverScore - a.discoverScore)
      .slice(0, 100)
  } catch (error) {
    console.error('Failed to get popular feeds:', error)
    return []
  }
}

// 최신 피드 가져오기
const getRecentFeeds = async (
  userId: string,
  filters: ExploreFilters
): Promise<ExploreFeed[]> => {
  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 200)
    
    const timelineFeeds: TimelineFeedItem[] = []
    for (const canvasFeed of feeds) {
      if (canvasFeed.authorId !== userId) {
        const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
        if (timelineFeed) {
          timelineFeeds.push(timelineFeed)
        }
      }
    }
    
    let recentFeeds = timelineFeeds
      .filter((feed: TimelineFeedItem) => feed.visibility === 'public')
      .filter((feed: TimelineFeedItem) => applyFilters(feed, filters))
      .map((feed: TimelineFeedItem) => ({
        ...feed,
        category: 'recent',
        discoverScore: calculateRecencyScore(feed)
      }))

    return recentFeeds
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100)
  } catch (error) {
    console.error('Failed to get recent feeds:', error)
    return []
  }
}

// 창작 피드 가져오기
const getCreativeFeeds = async (
  userId: string,
  filters: ExploreFilters
): Promise<ExploreFeed[]> => {
  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 200)
    
    const creativeKeywords = ['창작', '아트', '디자인', '그림', '작품', '만들기', '핸드메이드']
    const timelineFeeds: TimelineFeedItem[] = []
    
    for (const canvasFeed of feeds) {
      if (canvasFeed.authorId !== userId) {
        const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
        if (timelineFeed) {
          timelineFeeds.push(timelineFeed)
        }
      }
    }
    
    let creativeFeeds = timelineFeeds
      .filter((feed: TimelineFeedItem) => feed.visibility === 'public')
      .filter((feed: TimelineFeedItem) => {
        const hasCreativeContent = 
          feed.hashtags?.some((tag: string) => creativeKeywords.some((keyword: string) => tag.includes(keyword))) ||
          creativeKeywords.some((keyword: string) => feed.title?.toLowerCase().includes(keyword.toLowerCase())) ||
          creativeKeywords.some((keyword: string) => feed.description?.toLowerCase().includes(keyword.toLowerCase()))
        return hasCreativeContent && applyFilters(feed, filters)
      })
      .map((feed: TimelineFeedItem) => ({
        ...feed,
        category: 'creative',
        discoverScore: calculateCreativeScore(feed)
      }))

    return creativeFeeds
      .sort((a, b) => b.discoverScore - a.discoverScore)
      .slice(0, 100)
  } catch (error) {
    console.error('Failed to get creative feeds:', error)
    return []
  }
}

// 사진 피드 가져오기
const getPhotographyFeeds = async (
  userId: string,
  filters: ExploreFilters
): Promise<ExploreFeed[]> => {
  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 200)
    
    const photoKeywords = ['사진', '포토', '풍경', '여행', '셀카', '인물', '자연', '도시']
    const timelineFeeds: TimelineFeedItem[] = []
    
    for (const canvasFeed of feeds) {
      if (canvasFeed.authorId !== userId) {
        const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
        if (timelineFeed) {
          timelineFeeds.push(timelineFeed)
        }
      }
    }
    
    let photoFeeds = timelineFeeds
      .filter((feed: TimelineFeedItem) => feed.visibility === 'public')
      .filter((feed: TimelineFeedItem) => {
        const hasPhotoContent = 
          feed.hashtags?.some((tag: string) => photoKeywords.some((keyword: string) => tag.includes(keyword))) ||
          feed.previewImage // 미리보기 이미지가 있으면 사진 관련으로 간주
        return hasPhotoContent && applyFilters(feed, filters)
      })
      .map((feed: TimelineFeedItem) => ({
        ...feed,
        category: 'photography',
        discoverScore: calculatePhotoScore(feed)
      }))

    return photoFeeds
      .sort((a, b) => b.discoverScore - a.discoverScore)
      .slice(0, 100)
  } catch (error) {
    console.error('Failed to get photography feeds:', error)
    return []
  }
}

// 라이프스타일 피드 가져오기
const getLifestyleFeeds = async (
  userId: string,
  filters: ExploreFilters
): Promise<ExploreFeed[]> => {
  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 200)
    
    const lifestyleKeywords = ['일상', '라이프', '취미', '맛집', '카페', '운동', '독서', '음악']
    const timelineFeeds: TimelineFeedItem[] = []
    
    for (const canvasFeed of feeds) {
      if (canvasFeed.authorId !== userId) {
        const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
        if (timelineFeed) {
          timelineFeeds.push(timelineFeed)
        }
      }
    }
    
    let lifestyleFeeds = timelineFeeds
      .filter((feed: TimelineFeedItem) => feed.visibility === 'public')
      .filter((feed: TimelineFeedItem) => {
        const hasLifestyleContent = 
          feed.hashtags?.some((tag: string) => lifestyleKeywords.some((keyword: string) => tag.includes(keyword)))
        return hasLifestyleContent && applyFilters(feed, filters)
      })
      .map((feed: TimelineFeedItem) => ({
        ...feed,
        category: 'lifestyle',
        discoverScore: calculateLifestyleScore(feed)
      }))

    return lifestyleFeeds
      .sort((a, b) => b.discoverScore - a.discoverScore)
      .slice(0, 100)
  } catch (error) {
    console.error('Failed to get lifestyle feeds:', error)
    return []
  }
}

// 랜덤 탐색 피드 가져오기
const getRandomExploreFeeds = async (
  userId: string,
  filters: ExploreFilters
): Promise<ExploreFeed[]> => {
  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 100)
    
    const timelineFeeds: TimelineFeedItem[] = []
    for (const canvasFeed of feeds) {
      if (canvasFeed.authorId !== userId) {
        const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
        if (timelineFeed) {
          timelineFeeds.push(timelineFeed)
        }
      }
    }
    
    return timelineFeeds
      .filter((feed: TimelineFeedItem) => applyFilters(feed, filters))
      .map((feed: TimelineFeedItem) => ({
        ...feed,
        category: 'random',
        discoverScore: Math.random() * 100
      }))
      .sort(() => Math.random() - 0.5)
  } catch (error) {
    console.error('Failed to get random feeds:', error)
    return []
  }
}

// 필터 적용
const applyFilters = (feed: TimelineFeedItem, filters: ExploreFilters): boolean => {
  const { minLikes = 0, maxAge, excludeFollowing = false } = filters

  // 최소 좋아요 수 필터
  if (feed.likesCount < minLikes) {
    return false
  }

  // 최대 나이 필터
  if (maxAge) {
    const ageInDays = (Date.now() - new Date(feed.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (ageInDays > maxAge) {
      return false
    }
  }

  // 팔로잉 제외 필터 (실제로는 팔로우 관계 확인 필요)
  if (excludeFollowing) {
    // TODO: 구현 필요
  }

  return true
}

// 점수 계산 함수들
const calculatePopularityScore = (feed: TimelineFeedItem): number => {
  const likes = feed.likesCount || 0
  const comments = feed.commentsCount || 0
  const ageInHours = (Date.now() - new Date(feed.createdAt).getTime()) / (1000 * 60 * 60)
  
  // 시간 가중 인기도
  const timeWeight = Math.max(0.1, 1 / (1 + ageInHours / 24))
  const popularityScore = (likes * 2 + comments * 5) * timeWeight
  
  return Math.min(100, popularityScore)
}

const calculateRecencyScore = (feed: TimelineFeedItem): number => {
  const ageInHours = (Date.now() - new Date(feed.createdAt).getTime()) / (1000 * 60 * 60)
  
  if (ageInHours < 1) return 100
  if (ageInHours < 6) return 90
  if (ageInHours < 24) return 70
  if (ageInHours < 72) return 50
  
  return 20
}

const calculateCreativeScore = (feed: TimelineFeedItem): number => {
  let score = calculatePopularityScore(feed)
  
  // 해시태그가 많을수록 보너스
  if (feed.hashtags && feed.hashtags.length > 3) {
    score += (feed.hashtags.length - 3) * 3
  }
  
  // 설명이 있으면 보너스
  if (feed.description && feed.description.length > 10) {
    score += 10
  }
  
  return Math.min(100, score)
}

const calculatePhotoScore = (feed: TimelineFeedItem): number => {
  let score = calculatePopularityScore(feed)
  
  // 미리보기 이미지가 있으면 보너스
  if (feed.previewImage) {
    score += 20
  }
  
  return Math.min(100, score)
}

const calculateLifestyleScore = (feed: TimelineFeedItem): number => {
  let score = calculatePopularityScore(feed)
  
  // 설명이 있으면 보너스 (일상 공유는 보통 설명이 있음)
  if (feed.description && feed.description.length > 10) {
    score += 15
  }
  
  return Math.min(100, score)
}

// 추천 사용자 가져오기 (탐색용) - 간단한 더미 구현
export const getRecommendedUsers = async (
  limit: number = 10
): Promise<UserProfile[]> => {
  try {
    const currentUserId = getCurrentUserId()
    
    // 더미 사용자 데이터
    const dummyUsers: UserProfile[] = [
      {
        id: 'user_2',
        username: 'creative_kim',
        displayName: '김크리에이티브',
        avatar: '/api/placeholder/40/40?seed=user2',
        bio: '일상을 예술로 만드는 사람',
        followersCount: 142,
        followingCount: 89,
        isFollowing: false
      },
      {
        id: 'user_3',
        username: 'photo_diary',
        displayName: '포토다이어리',
        avatar: '/api/placeholder/40/40?seed=user3',
        bio: '사진으로 기록하는 삶',
        followersCount: 256,
        followingCount: 134,
        isFollowing: false
      },
      {
        id: 'user_4',
        username: 'daily_canvas',
        displayName: '데일리캔버스',
        avatar: '/api/placeholder/40/40?seed=user4',
        bio: '매일매일 새로운 캔버스',
        followersCount: 198,
        followingCount: 167,
        isFollowing: false
      },
      {
        id: 'user_5',
        username: 'memory_keeper',
        displayName: '메모리키퍼',
        avatar: '/api/placeholder/40/40?seed=user5',
        bio: '소중한 순간들을 모으는 사람',
        followersCount: 87,
        followingCount: 56,
        isFollowing: false
      }
    ]

    return dummyUsers
      .filter(user => user.id !== currentUserId)
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
  } catch (error) {
    console.error('Failed to get recommended users:', error)
    return []
  }
}

// 해시태그 자동완성
export const getHashtagSuggestions = async (
  query: string,
  limit: number = 10
): Promise<string[]> => {
  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 1000)
    
    // 모든 해시태그 수집
    const allHashtags = new Set<string>()
    
    for (const canvasFeed of feeds) {
      const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
      if (timelineFeed && timelineFeed.hashtags) {
        timelineFeed.hashtags.forEach((tag: string) => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            allHashtags.add(tag)
          }
        })
      }
    }

    // 빈도수 계산을 위한 카운터
    const hashtagCount: Record<string, number> = {}
    
    for (const canvasFeed of feeds) {
      const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
      if (timelineFeed && timelineFeed.hashtags) {
        timelineFeed.hashtags.forEach((tag: string) => {
          if (allHashtags.has(tag)) {
            hashtagCount[tag] = (hashtagCount[tag] || 0) + 1
          }
        })
      }
    }

    // 빈도순으로 정렬하여 반환
    return Array.from(allHashtags)
      .sort((a, b) => (hashtagCount[b] || 0) - (hashtagCount[a] || 0))
      .slice(0, limit)
  } catch (error) {
    console.error('Failed to get hashtag suggestions:', error)
    return []
  }
}

// 관련 피드 가져오기
export const getRelatedFeeds = async (
  feedId: string,
  limit: number = 10
): Promise<ExploreFeed[]> => {
  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 200)
    
    // timeline_ prefix 제거하여 원본 canvasFeedId 추출
    const canvasFeedId = feedId.startsWith('timeline_') ? feedId.replace('timeline_', '') : feedId
    const targetCanvasFeed = feeds.find((f: any) => f.id === canvasFeedId)
    
    if (!targetCanvasFeed) {
      return []
    }

    const targetTimelineFeed = await convertCanvasToTimelineFeed(targetCanvasFeed.id)
    if (!targetTimelineFeed) {
      return []
    }

    const currentUserId = getCurrentUserId()
    const relatedFeeds: ExploreFeed[] = []
    
    // 관련성 점수 계산
    for (const canvasFeed of feeds) {
      if (canvasFeed.id !== canvasFeedId && canvasFeed.authorId !== currentUserId) {
        const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
        if (timelineFeed && timelineFeed.visibility === 'public') {
          const exploreFeed: ExploreFeed = {
            ...timelineFeed,
            category: 'related',
            discoverScore: calculateRelatedScore(timelineFeed, targetTimelineFeed)
          }
          relatedFeeds.push(exploreFeed)
        }
      }
    }

    return relatedFeeds
      .sort((a, b) => b.discoverScore - a.discoverScore)
      .slice(0, limit)
  } catch (error) {
    console.error('Failed to get related feeds:', error)
    return []
  }
}

// 관련성 점수 계산
const calculateRelatedScore = (feed: TimelineFeedItem, targetFeed: TimelineFeedItem): number => {
  let score = 0

  // 해시태그 유사성
  const commonHashtags = feed.hashtags?.filter((tag: string) => 
    targetFeed.hashtags?.includes(tag)
  ) || []
  score += commonHashtags.length * 20

  // 작성자가 같으면 보너스
  if (feed.authorId === targetFeed.authorId) {
    score += 30
  }

  // 기본 인기도 점수도 반영
  score += calculatePopularityScore(feed) * 0.3

  return Math.min(100, score)
}

// 탐색 검색
export const searchExplore = async (
  query: string,
  category?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ feeds: ExploreFeed[], users: UserProfile[], hashtags: string[], hasMore: boolean }> => {
  try {
    const currentUserId = getCurrentUserId()
    
    // 피드 검색
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds } = await getFeeds(undefined, 1, 500)
    
    const searchTerms = query.toLowerCase().split(' ')
    const matchingFeeds: TimelineFeedItem[] = []
    
    for (const canvasFeed of feeds) {
      if (canvasFeed.authorId !== currentUserId) {
        const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
        if (timelineFeed && timelineFeed.visibility === 'public') {
          const searchableText = [
            timelineFeed.title || '',
            timelineFeed.description || '',
            ...(timelineFeed.hashtags || [])
          ].join(' ').toLowerCase()
          
          if (searchTerms.some((term: string) => searchableText.includes(term))) {
            matchingFeeds.push(timelineFeed)
          }
        }
      }
    }

    // 카테고리 필터 적용
    let filteredFeeds = matchingFeeds
    if (category && category !== 'all') {
      filteredFeeds = await filterByCategory(matchingFeeds, category, currentUserId)
    }

    // ExploreFeed로 변환
    const exploreFeeds: ExploreFeed[] = filteredFeeds.map((feed: TimelineFeedItem) => ({
      ...feed,
      category: category || 'search',
      discoverScore: calculateSearchScore(feed, query)
    })).sort((a, b) => b.discoverScore - a.discoverScore)

    // 사용자 검색
    const users = await getRecommendedUsers(10)
    const matchingUsers = users.filter((user: UserProfile) =>
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(query.toLowerCase())
    )

    // 해시태그 검색
    const hashtags = await getHashtagSuggestions(query, 10)

    // 페이징
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedFeeds = exploreFeeds.slice(startIndex, endIndex)

    return {
      feeds: paginatedFeeds,
      users: matchingUsers.slice(0, 5), // 상위 5명만
      hashtags: hashtags.slice(0, 5), // 상위 5개만
      hasMore: endIndex < exploreFeeds.length
    }
  } catch (error) {
    console.error('Failed to search explore:', error)
    throw new Error('탐색 검색에 실패했습니다.')
  }
}

// 카테고리별 필터링
const filterByCategory = async (
  feeds: TimelineFeedItem[], 
  category: string, 
  userId: string
): Promise<TimelineFeedItem[]> => {
  try {
    switch (category) {
      case 'creative': {
        const creativeFeeds = await getCreativeFeeds(userId, {})
        const creativeIds = new Set(creativeFeeds.map(f => f.id))
        return feeds.filter(f => creativeIds.has(f.id))
      }
      case 'photography': {
        const photoFeeds = await getPhotographyFeeds(userId, {})
        const photoIds = new Set(photoFeeds.map(f => f.id))
        return feeds.filter(f => photoIds.has(f.id))
      }
      case 'lifestyle': {
        const lifestyleFeeds = await getLifestyleFeeds(userId, {})
        const lifestyleIds = new Set(lifestyleFeeds.map(f => f.id))
        return feeds.filter(f => lifestyleIds.has(f.id))
      }
      default:
        return feeds
    }
  } catch (error) {
    console.error('Failed to filter by category:', error)
    return feeds
  }
}

// 검색 점수 계산
const calculateSearchScore = (feed: TimelineFeedItem, query: string): number => {
  let score = 0
  const queryTerms = query.toLowerCase().split(' ')
  
  // 제목에서 매치
  queryTerms.forEach((term: string) => {
    if (feed.title?.toLowerCase().includes(term)) {
      score += 30
    }
  })
  
  // 설명에서 매치
  queryTerms.forEach((term: string) => {
    if (feed.description?.toLowerCase().includes(term)) {
      score += 20
    }
  })
  
  // 해시태그에서 매치
  queryTerms.forEach((term: string) => {
    const matchingTags = feed.hashtags?.filter((tag: string) => 
      tag.toLowerCase().includes(term)
    ) || []
    score += matchingTags.length * 15
  })
  
  // 인기도도 반영
  score += calculatePopularityScore(feed) * 0.2
  
  return Math.min(100, score)
}

// 탐색 통계 가져오기
export const getExploreStats = async (): Promise<{
  totalFeeds: number
  totalUsers: number
  totalHashtags: number
  trendingHashtags: { tag: string, count: number }[]
}> => {
  try {
    const feedModule = await import('./feed')
    const getFeeds = feedModule.getFeeds
    const { feeds, total: totalFeeds } = await getFeeds(undefined, 1, 1000)
    const users = await getRecommendedUsers(1000)
    
    // 해시태그 통계
    const hashtagCount: Record<string, number> = {}
    
    for (const canvasFeed of feeds) {
      const timelineFeed = await convertCanvasToTimelineFeed(canvasFeed.id)
      if (timelineFeed && timelineFeed.hashtags) {
        timelineFeed.hashtags.forEach((tag: string) => {
          hashtagCount[tag] = (hashtagCount[tag] || 0) + 1
        })
      }
    }
    
    const trendingHashtags = Object.entries(hashtagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalFeeds,
      totalUsers: users.length,
      totalHashtags: Object.keys(hashtagCount).length,
      trendingHashtags
    }
  } catch (error) {
    console.error('Failed to get explore stats:', error)
    return {
      totalFeeds: 0,
      totalUsers: 0,
      totalHashtags: 0,
      trendingHashtags: []
    }
  }
}

// 탐색 피드 좋아요 토글
export const toggleExploreFeedLike = async (exploreFeedId: string): Promise<ExploreFeed> => {
  try {
    // timeline_ prefix 제거하여 원본 canvasFeedId 추출
    const canvasFeedId = exploreFeedId.startsWith('timeline_') 
      ? exploreFeedId.replace('timeline_', '') 
      : exploreFeedId
    
    // 원본 캔버스 피드 좋아요 토글
    const feedModule = await import('./feed')
    const toggleFeedLike = feedModule.toggleFeedLike
    const updatedCanvasFeed = await toggleFeedLike(canvasFeedId)
    
    // 타임라인 피드로 변환
    const timelineFeed = await convertCanvasToTimelineFeed(updatedCanvasFeed.id)
    
    if (!timelineFeed) {
      throw new Error('피드 변환에 실패했습니다.')
    }
    
    // ExploreFeed로 변환하여 반환
    return {
      ...timelineFeed,
      category: 'explore',
      discoverScore: calculatePopularityScore(timelineFeed)
    }
  } catch (error) {
    console.error('Failed to toggle explore feed like:', error)
    throw new Error('좋아요 처리에 실패했습니다.')
  }
}

// 탐색 카테고리별 피드 미리보기
export const getCategoryPreview = async (
  categoryId: string,
  limit: number = 6
): Promise<ExploreFeed[]> => {
  try {
    const currentUserId = getCurrentUserId()
    
    switch (categoryId) {
      case 'popular':
        return (await getPopularFeeds(currentUserId, {})).slice(0, limit)
      case 'recent':
        return (await getRecentFeeds(currentUserId, {})).slice(0, limit)
      case 'creative':
        return (await getCreativeFeeds(currentUserId, {})).slice(0, limit)
      case 'photography':
        return (await getPhotographyFeeds(currentUserId, {})).slice(0, limit)
      case 'lifestyle':
        return (await getLifestyleFeeds(currentUserId, {})).slice(0, limit)
      case 'random':
        return (await getRandomExploreFeeds(currentUserId, {})).slice(0, limit)
      default:
        return (await getPopularFeeds(currentUserId, {})).slice(0, limit)
    }
  } catch (error) {
    console.error('Failed to get category preview:', error)
    return []
  }
}
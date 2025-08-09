import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// 임시 타입 정의 (실제 타입 파일이 없는 경우)
interface TimelineUser {
  id: string
  name: string
  profileImage?: string
}

interface TimelineElement {
  id: string
  type: 'PHOTO' | 'TEXT' | 'VIDEO'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  photoId?: string
  src?: string
  alt?: string
  content?: string
  createdAt: string
  updatedAt: string
}

interface TimelinePost {
  id: string
  user: TimelineUser
  element: TimelineElement
  createdAt: string
  likesCount: number
  commentsCount?: number
  sharesCount?: number
  isLiked: boolean
  isBookmarked?: boolean
  isHidden?: boolean
  tags?: string[]
}

interface UseTimelineOptions {
  userId?: string
  initialPageSize?: number
  loadMorePageSize?: number
  enableRealtime?: boolean
  enableOptimisticUpdates?: boolean
  maxRetries?: number
  cacheTimeout?: number
}

interface TimelineFilters {
  dateRange?: { start: Date; end: Date }
  userIds?: string[]
  tags?: string[]
  postTypes?: TimelineElement['type'][]
  sortBy?: 'newest' | 'oldest' | 'popular' | 'relevance'
}

interface UseTimelineReturn {
  // 상태
  posts: TimelinePost[]
  filteredPosts: TimelinePost[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  filters: TimelineFilters
  
  // 데이터 로딩
  loadMorePosts: () => Promise<void>
  refreshTimeline: () => Promise<void>
  retryLoad: () => Promise<void>
  
  // 포스트 액션
  likePost: (postId: string) => Promise<void>
  unlikePost: (postId: string) => Promise<void>
  toggleLike: (postId: string) => Promise<void>
  bookmarkPost: (postId: string) => Promise<void>
  unbookmarkPost: (postId: string) => Promise<void>
  hidePost: (postId: string) => void
  reportPost: (postId: string, reason: string) => Promise<void>
  
  // 필터링 및 정렬
  setFilters: (filters: Partial<TimelineFilters>) => void
  clearFilters: () => void
  
  // 유틸리티
  clearError: () => void
  getPostById: (postId: string) => TimelinePost | undefined
  
  // 통계
  totalPosts: number
  likedPosts: number
  bookmarkedPosts: number
}

export const useTimeline = ({
  userId,
  initialPageSize = 8,
  loadMorePageSize = 5,
  enableRealtime = false,
  enableOptimisticUpdates = true,
  maxRetries = 3,
  cacheTimeout = 5 * 60 * 1000 // 5분
}: UseTimelineOptions = {}): UseTimelineReturn => {
  const [posts, setPosts] = useState<TimelinePost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [filters, setFiltersState] = useState<TimelineFilters>({ sortBy: 'newest' })
  const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set())
  
  // 요청 중복 방지 및 재시도 관리
  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)
  const lastFetchTime = useRef<number>(0)
  const cacheRef = useRef<Map<string, { data: TimelinePost[]; timestamp: number }>>(new Map())

  // Mock 타임라인 포스트 생성
  const generateMockPosts = useCallback((pageNum: number, count: number = 10): TimelinePost[] => {
    const mockPosts: TimelinePost[] = []
    
    const userNames = ['김다꾸', '이예쁜', '박감성', '정아름', '최귀염', '문달콤', '임포근', '송깜찍']
    const captions = [
      '오늘은 정말 좋은 날이었어요! ☀️',
      '친구들과 함께한 즐거운 시간 💕',
      '새로운 카페 발견! 분위기가 너무 좋아요 ☕',
      '감성 가득한 하루였습니다 ✨',
      '행복한 순간들의 기록 🌸',
      '일상 속 소소한 행복 찾기 🌿',
      '오늘의 기분 좋은 순간들 💫',
      '예쁜 것들로 가득한 하루 🎀'
    ]
    
    const tags = ['daily', 'photo', 'mood', 'friends', 'cafe', 'sunset', 'selfie', 'food']
    
    for (let i = 0; i < count; i++) {
      const postIndex = (pageNum - 1) * count + i
      const userIndex = postIndex % userNames.length
      const captionIndex = postIndex % captions.length
      
      const postTags = tags.slice(0, Math.floor(Math.random() * 3) + 1)
      
      mockPosts.push({
        id: `post-${postIndex}`,
        user: {
          id: `user-${userIndex}`,
          name: userNames[userIndex],
          profileImage: Math.random() > 0.3 ? `/api/placeholder/40/40?seed=user${userIndex}` : undefined,
        },
        element: {
          id: `element-${postIndex}`,
          type: 'PHOTO',
          x: 100,
          y: 100,
          width: 400,
          height: Math.floor(Math.random() * 300) + 300,
          rotation: 0,
          zIndex: 1,
          photoId: `photo-${postIndex}`,
          src: `/api/placeholder/400/${Math.floor(Math.random() * 300) + 300}?seed=post${postIndex}`,
          alt: captions[captionIndex],
          createdAt: new Date(Date.now() - postIndex * 1000 * 60 * 30).toISOString(),
          updatedAt: new Date(Date.now() - postIndex * 1000 * 60 * 30).toISOString(),
        },
        createdAt: new Date(Date.now() - postIndex * 1000 * 60 * 30).toISOString(),
        likesCount: Math.floor(Math.random() * 200) + 5,
        commentsCount: Math.floor(Math.random() * 50),
        sharesCount: Math.floor(Math.random() * 20),
        isLiked: Math.random() > 0.7,
        isBookmarked: Math.random() > 0.9,
        isHidden: false,
        tags: postTags
      })
    }
    
    return mockPosts
  }, [])

  // 캐시 확인
  const getCachedData = useCallback((key: string): TimelinePost[] | null => {
    const cached = cacheRef.current.get(key)
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data
    }
    return null
  }, [cacheTimeout])

  // 캐시 저장
  const setCachedData = useCallback((key: string, data: TimelinePost[]) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() })
  }, [])

  // API 요청 래퍼 (재시도 로직 포함)
  const fetchWithRetry = useCallback(async <T>(
    fetchFn: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> => {
    try {
      return await fetchFn()
    } catch (error) {
      if (retryCount < maxRetries && !(error instanceof Error && error.name === 'AbortError')) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
        return fetchWithRetry(fetchFn, retryCount + 1)
      }
      throw error
    }
  }, [maxRetries])

  // 초기 로드
  const loadInitialPosts = useCallback(async () => {
    // 중복 요청 방지
    if (Date.now() - lastFetchTime.current < 1000) return

    // 캐시 확인
    const cacheKey = `timeline-${userId || 'global'}-${page}`
    const cachedPosts = getCachedData(cacheKey)
    if (cachedPosts) {
      setPosts(cachedPosts)
      setIsLoading(false)
      return
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)
    lastFetchTime.current = Date.now()
    
    try {
      const initialPosts = await fetchWithRetry(async () => {
        // AbortSignal 체크
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Request was aborted')
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 10% 확률로 에러 시뮬레이션 (개발 중)
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          throw new Error('Network error simulation')
        }
        
        return generateMockPosts(1, initialPageSize)
      })
      
      setPosts(initialPosts)
      setPage(1)
      setHasMore(true)
      retryCountRef.current = 0
      
      // 캐시 저장
      setCachedData(cacheKey, initialPosts)
      
    } catch (err) {
      if (err instanceof Error && err.message !== 'Request was aborted') {
        setError(err.message || '타임라인 로드에 실패했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, page, initialPageSize, generateMockPosts, fetchWithRetry, getCachedData, setCachedData])

  // 초기 로드 실행
  useEffect(() => {
    loadInitialPosts()
  }, []) // 의존성에서 loadInitialPosts 제거하여 무한 루프 방지

  // 더 많은 포스트 로드
  const loadMorePosts = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    
    try {
      const nextPage = page + 1
      const newPosts = await fetchWithRetry(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (nextPage >= 8) { // 8페이지까지만
          setHasMore(false)
          return []
        }
        
        return generateMockPosts(nextPage, loadMorePageSize)
      })
      
      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts])
        setPage(nextPage)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '포스트 로드에 실패했습니다.')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoading, isLoadingMore, hasMore, page, loadMorePageSize, generateMockPosts, fetchWithRetry])

  // 낙관적 업데이트 헬퍼
  const optimisticUpdate = useCallback(<T extends keyof TimelinePost>(
    postId: string,
    field: T,
    value: TimelinePost[T],
    rollbackValue?: TimelinePost[T]
  ) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, [field]: value } : post
    ))

    return () => {
      if (rollbackValue !== undefined) {
        setPosts(prev => prev.map(post => 
          post.id === postId ? { ...post, [field]: rollbackValue } : post
        ))
      }
    }
  }, [])

  // 포스트 좋아요
  const likePost = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post || post.isLiked) return

    let rollback: (() => void) | null = null

    try {
      // 낙관적 업데이트
      if (enableOptimisticUpdates) {
        rollback = optimisticUpdate(postId, 'isLiked', true, false)
        optimisticUpdate(postId, 'likesCount', post.likesCount + 1, post.likesCount)
      }

      await fetchWithRetry(async () => {
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 5% 확률로 실패 시뮬레이션
        if (Math.random() < 0.05) {
          throw new Error('Like failed')
        }
      })

      // 성공 시 최종 상태 업데이트
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, isLiked: true, likesCount: post.likesCount + (post.isLiked ? 0 : 1) }
          : post
      ))
      
    } catch (err) {
      console.error('Like failed:', err)
      rollback?.()
    }
  }, [posts, enableOptimisticUpdates, optimisticUpdate, fetchWithRetry])

  // 포스트 좋아요 취소
  const unlikePost = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post || !post.isLiked) return

    let rollback: (() => void) | null = null

    try {
      if (enableOptimisticUpdates) {
        rollback = optimisticUpdate(postId, 'isLiked', false, true)
        optimisticUpdate(postId, 'likesCount', Math.max(0, post.likesCount - 1), post.likesCount)
      }

      await fetchWithRetry(async () => {
        await new Promise(resolve => setTimeout(resolve, 300))
        
        if (Math.random() < 0.05) {
          throw new Error('Unlike failed')
        }
      })

      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, isLiked: false, likesCount: Math.max(0, post.likesCount - (post.isLiked ? 1 : 0)) }
          : post
      ))
      
    } catch (err) {
      console.error('Unlike failed:', err)
      rollback?.()
    }
  }, [posts, enableOptimisticUpdates, optimisticUpdate, fetchWithRetry])

  // 좋아요 토글
  const toggleLike = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    if (post.isLiked) {
      await unlikePost(postId)
    } else {
      await likePost(postId)
    }
  }, [posts, likePost, unlikePost])

  // 북마크 관련 함수들
  const bookmarkPost = useCallback(async (postId: string) => {
    const rollback = optimisticUpdate(postId, 'isBookmarked', true, false)

    try {
      await fetchWithRetry(async () => {
        await new Promise(resolve => setTimeout(resolve, 300))
      })
    } catch (err) {
      console.error('Bookmark failed:', err)
      rollback()
    }
  }, [optimisticUpdate, fetchWithRetry])

  const unbookmarkPost = useCallback(async (postId: string) => {
    const rollback = optimisticUpdate(postId, 'isBookmarked', false, true)

    try {
      await fetchWithRetry(async () => {
        await new Promise(resolve => setTimeout(resolve, 300))
      })
    } catch (err) {
      console.error('Unbookmark failed:', err)
      rollback()
    }
  }, [optimisticUpdate, fetchWithRetry])

  // 포스트 숨기기
  const hidePost = useCallback((postId: string) => {
    setHiddenPosts(prev => new Set([...prev, postId]))
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, isHidden: true } : post
    ))
  }, [])

  // 포스트 신고
  const reportPost = useCallback(async (postId: string, reason: string) => {
    try {
      await fetchWithRetry(async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        console.log(`Reported post ${postId} for reason: ${reason}`)
      })
      
      // 신고 후 자동으로 숨기기
      hidePost(postId)
    } catch (err) {
      console.error('Report failed:', err)
      setError('신고 처리에 실패했습니다.')
    }
  }, [fetchWithRetry, hidePost])

  // 새로고침
  const refreshTimeline = useCallback(async () => {
    // 캐시 클리어
    cacheRef.current.clear()
    setPage(1)
    setHasMore(true)
    setHiddenPosts(new Set())
    await loadInitialPosts()
  }, [loadInitialPosts])

  // 재시도
  const retryLoad = useCallback(async () => {
    retryCountRef.current = 0
    await loadInitialPosts()
  }, [loadInitialPosts])

  // 필터링된 포스트
  const filteredPosts = useMemo(() => {
    let filtered = posts.filter(post => !hiddenPosts.has(post.id))

    // 날짜 필터
    if (filters.dateRange) {
      filtered = filtered.filter(post => {
        const postDate = new Date(post.createdAt)
        return postDate >= filters.dateRange!.start && postDate <= filters.dateRange!.end
      })
    }

    // 사용자 필터
    if (filters.userIds && filters.userIds.length > 0) {
      filtered = filtered.filter(post => filters.userIds!.includes(post.user.id))
    }

    // 태그 필터
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(post => 
        post.tags?.some(tag => filters.tags!.includes(tag))
      )
    }

    // 포스트 타입 필터
    if (filters.postTypes && filters.postTypes.length > 0) {
      filtered = filtered.filter(post => filters.postTypes!.includes(post.element.type))
    }

    // 정렬
    switch (filters.sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'popular':
        filtered.sort((a, b) => b.likesCount - a.likesCount)
        break
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }

    return filtered
  }, [posts, hiddenPosts, filters])

  // 필터 설정
  const setFilters = useCallback((newFilters: Partial<TimelineFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState({ sortBy: 'newest' })
  }, [])

  // 유틸리티 함수들
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const getPostById = useCallback((postId: string) => {
    return posts.find(post => post.id === postId)
  }, [posts])

  // 통계
  const totalPosts = posts.length
  const likedPosts = posts.filter(post => post.isLiked).length
  const bookmarkedPosts = posts.filter(post => post.isBookmarked).length

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // 상태
    posts,
    filteredPosts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    filters,
    
    // 데이터 로딩
    loadMorePosts,
    refreshTimeline,
    retryLoad,
    
    // 포스트 액션
    likePost,
    unlikePost,
    toggleLike,
    bookmarkPost,
    unbookmarkPost,
    hidePost,
    reportPost,
    
    // 필터링 및 정렬
    setFilters,
    clearFilters,
    
    // 유틸리티
    clearError,
    getPostById,
    
    // 통계
    totalPosts,
    likedPosts,
    bookmarkedPosts,
  }
}
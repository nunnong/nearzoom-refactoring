import { useState, useCallback, useEffect, useRef } from 'react'

interface FollowStats {
  followersCount: number
  followingCount: number
}

interface FollowState {
  isFollowing: boolean
  isFollowedBy: boolean
  stats?: FollowStats
}

interface UseFollowOptions {
  currentUserId?: string
  initialFollowingUsers?: string[]
  enableOptimisticUpdates?: boolean
  enableBatchOperations?: boolean
  maxRetries?: number
  retryDelay?: number
  onFollowSuccess?: (userId: string, stats?: FollowStats) => void
  onUnfollowSuccess?: (userId: string, stats?: FollowStats) => void
  onError?: (error: string, userId?: string) => void
  onStatsUpdate?: (userId: string, stats: FollowStats) => void
}

interface FollowOperation {
  userId: string
  action: 'follow' | 'unfollow'
  timestamp: number
  retryCount: number
}

interface UseFollowReturn {
  // 상태
  isLoading: boolean
  loadingUsers: Set<string>
  followingUsers: string[]
  followStates: Map<string, FollowState>
  error: string | null
  
  // 기본 작업
  followUser: (userId: string) => Promise<void>
  unfollowUser: (userId: string) => Promise<void>
  toggleFollow: (userId: string, currentlyFollowing?: boolean) => Promise<void>
  
  // 배치 작업
  followMultiple: (userIds: string[]) => Promise<void>
  unfollowMultiple: (userIds: string[]) => Promise<void>
  
  // 상태 확인
  isFollowing: (userId: string) => boolean
  isFollowedBy: (userId: string) => boolean
  getFollowStats: (userId: string) => FollowStats | undefined
  
  // 유틸리티
  refreshFollowState: (userId: string) => Promise<void>
  refreshAllFollowStates: () => Promise<void>
  clearError: () => void
  
  // 설정
  setFollowingUsers: (users: string[]) => void
  updateFollowState: (userId: string, state: Partial<FollowState>) => void
}

export const useFollow = (options: UseFollowOptions = {}): UseFollowReturn => {
  const {
    currentUserId,
    initialFollowingUsers = [],
    enableOptimisticUpdates = true,
    enableBatchOperations = true,
    maxRetries = 3,
    retryDelay = 1000,
    onFollowSuccess,
    onUnfollowSuccess,
    onError,
    onStatsUpdate
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set())
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set(initialFollowingUsers))
  const [followStates, setFollowStates] = useState<Map<string, FollowState>>(new Map())
  const [error, setError] = useState<string | null>(null)
  
  // 진행 중인 작업들을 추적
  const pendingOperations = useRef<Map<string, FollowOperation>>(new Map())
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 초기 팔로우 상태 로드
  useEffect(() => {
    if (currentUserId && initialFollowingUsers.length === 0) {
      loadInitialFollowStates()
    }
  }, [currentUserId])

  // 로딩 중인 사용자 추가/제거 헬퍼
  const addLoadingUser = useCallback((userId: string) => {
    setLoadingUsers(prev => new Set([...prev, userId]))
  }, [])

  const removeLoadingUser = useCallback((userId: string) => {
    setLoadingUsers(prev => {
      const newSet = new Set(prev)
      newSet.delete(userId)
      return newSet
    })
  }, [])

  // 초기 팔로우 상태 로드
  const loadInitialFollowStates = useCallback(async () => {
    if (!currentUserId) return

    setIsLoading(true)
    try {
      // Mock API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // TODO: 실제 API 호출
      // const { followingUsers, followStates } = await getFollowStatesAPI(currentUserId)
      
      // Mock 데이터
      const mockFollowingUsers = ['user1', 'user2', 'user3']
      const mockFollowStates = new Map([
        ['user1', { isFollowing: true, isFollowedBy: false, stats: { followersCount: 150, followingCount: 89 } }],
        ['user2', { isFollowing: true, isFollowedBy: true, stats: { followersCount: 234, followingCount: 156 } }],
        ['user3', { isFollowing: true, isFollowedBy: false, stats: { followersCount: 89, followingCount: 45 } }],
      ])

      setFollowingUsers(new Set(mockFollowingUsers))
      setFollowStates(mockFollowStates)
      
    } catch (error) {
      console.error('Failed to load initial follow states:', error)
      onError?.('팔로우 정보를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, onError])

  // 재시도 로직
  const retryOperation = useCallback(async (operation: FollowOperation) => {
    const { userId, action, retryCount } = operation
    
    if (retryCount >= maxRetries) {
      pendingOperations.current.delete(userId)
      removeLoadingUser(userId)
      onError?.(`${action === 'follow' ? '팔로우' : '언팔로우'}에 실패했습니다. (최대 재시도 횟수 초과)`, userId)
      return
    }

    const timeoutId = setTimeout(async () => {
      retryTimeouts.current.delete(userId)
      const updatedOperation = { ...operation, retryCount: retryCount + 1 }
      pendingOperations.current.set(userId, updatedOperation)
      
      if (action === 'follow') {
        await executeFollowOperation(userId)
      } else {
        await executeUnfollowOperation(userId)
      }
    }, retryDelay * Math.pow(2, retryCount)) // 지수 백오프

    retryTimeouts.current.set(userId, timeoutId)
  }, [maxRetries, retryDelay, onError, removeLoadingUser])

  // 팔로우 실행 로직
  const executeFollowOperation = useCallback(async (userId: string) => {
    const operation = pendingOperations.current.get(userId)
    if (!operation) return

    const abortController = new AbortController()
    abortControllers.current.set(userId, abortController)

    try {
      // Mock API 호출 시뮬레이션
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // 10% 확률로 실패 시뮬레이션
          if (Math.random() < 0.1) {
            reject(new Error('Network error'))
          } else {
            resolve(void 0)
          }
        }, 800)

        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout)
          reject(new Error('Operation was cancelled'))
        })
      })

      // 성공 시 상태 업데이트
      setFollowingUsers(prev => new Set([...prev, userId]))
      
      // Mock 통계 업데이트
      const mockStats: FollowStats = {
        followersCount: Math.floor(Math.random() * 500) + 50,
        followingCount: Math.floor(Math.random() * 200) + 20
      }

      setFollowStates(prev => new Map(prev).set(userId, {
        isFollowing: true,
        isFollowedBy: prev.get(userId)?.isFollowedBy || false,
        stats: mockStats
      }))

      pendingOperations.current.delete(userId)
      abortControllers.current.delete(userId)
      onFollowSuccess?.(userId, mockStats)
      onStatsUpdate?.(userId, mockStats)

    } catch (error) {
      abortControllers.current.delete(userId)
      
      if (error instanceof Error && error.message === 'Operation was cancelled') {
        pendingOperations.current.delete(userId)
        return
      }

      await retryOperation(operation)
    } finally {
      removeLoadingUser(userId)
    }
  }, [onFollowSuccess, onStatsUpdate, retryOperation, removeLoadingUser])

  // 언팔로우 실행 로직
  const executeUnfollowOperation = useCallback(async (userId: string) => {
    const operation = pendingOperations.current.get(userId)
    if (!operation) return

    const abortController = new AbortController()
    abortControllers.current.set(userId, abortController)

    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (Math.random() < 0.1) {
            reject(new Error('Network error'))
          } else {
            resolve(void 0)
          }
        }, 800)

        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout)
          reject(new Error('Operation was cancelled'))
        })
      })

      setFollowingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })

      const currentState = followStates.get(userId)
      const mockStats: FollowStats = {
        followersCount: Math.max(0, (currentState?.stats?.followersCount || 100) - 1),
        followingCount: currentState?.stats?.followingCount || 50
      }

      setFollowStates(prev => new Map(prev).set(userId, {
        isFollowing: false,
        isFollowedBy: prev.get(userId)?.isFollowedBy || false,
        stats: mockStats
      }))

      pendingOperations.current.delete(userId)
      abortControllers.current.delete(userId)
      onUnfollowSuccess?.(userId, mockStats)
      onStatsUpdate?.(userId, mockStats)

    } catch (error) {
      abortControllers.current.delete(userId)
      
      if (error instanceof Error && error.message === 'Operation was cancelled') {
        pendingOperations.current.delete(userId)
        return
      }

      await retryOperation(operation)
    } finally {
      removeLoadingUser(userId)
    }
  }, [followStates, onUnfollowSuccess, onStatsUpdate, retryOperation, removeLoadingUser])

  // 팔로우 함수
  const followUser = useCallback(async (userId: string) => {
    if (pendingOperations.current.has(userId)) return
    if (followingUsers.has(userId)) return

    setError(null)
    addLoadingUser(userId)

    // 낙관적 업데이트
    if (enableOptimisticUpdates) {
      setFollowingUsers(prev => new Set([...prev, userId]))
    }

    const operation: FollowOperation = {
      userId,
      action: 'follow',
      timestamp: Date.now(),
      retryCount: 0
    }

    pendingOperations.current.set(userId, operation)
    await executeFollowOperation(userId)
  }, [followingUsers, enableOptimisticUpdates, addLoadingUser, executeFollowOperation])

  // 언팔로우 함수
  const unfollowUser = useCallback(async (userId: string) => {
    if (pendingOperations.current.has(userId)) return
    if (!followingUsers.has(userId)) return

    setError(null)
    addLoadingUser(userId)

    // 낙관적 업데이트
    if (enableOptimisticUpdates) {
      setFollowingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }

    const operation: FollowOperation = {
      userId,
      action: 'unfollow',
      timestamp: Date.now(),
      retryCount: 0
    }

    pendingOperations.current.set(userId, operation)
    await executeUnfollowOperation(userId)
  }, [followingUsers, enableOptimisticUpdates, addLoadingUser, executeUnfollowOperation])

  // 토글 팔로우
  const toggleFollow = useCallback(async (userId: string, currentlyFollowing?: boolean) => {
    const isCurrentlyFollowing = currentlyFollowing ?? followingUsers.has(userId)
    
    if (isCurrentlyFollowing) {
      await unfollowUser(userId)
    } else {
      await followUser(userId)
    }
  }, [followingUsers, followUser, unfollowUser])

  // 배치 팔로우
  const followMultiple = useCallback(async (userIds: string[]) => {
    if (!enableBatchOperations) {
      // 배치 작업이 비활성화된 경우 순차 실행
      for (const userId of userIds) {
        await followUser(userId)
      }
      return
    }

    const validUserIds = userIds.filter(id => !followingUsers.has(id) && !pendingOperations.current.has(id))
    if (validUserIds.length === 0) return

    setError(null)
    validUserIds.forEach(addLoadingUser)

    // 낙관적 업데이트
    if (enableOptimisticUpdates) {
      setFollowingUsers(prev => new Set([...prev, ...validUserIds]))
    }

    await Promise.allSettled(validUserIds.map(userId => {
      const operation: FollowOperation = {
        userId,
        action: 'follow',
        timestamp: Date.now(),
        retryCount: 0
      }
      pendingOperations.current.set(userId, operation)
      return executeFollowOperation(userId)
    }))
  }, [enableBatchOperations, followingUsers, enableOptimisticUpdates, addLoadingUser, followUser, executeFollowOperation])

  // 배치 언팔로우
  const unfollowMultiple = useCallback(async (userIds: string[]) => {
    if (!enableBatchOperations) {
      for (const userId of userIds) {
        await unfollowUser(userId)
      }
      return
    }

    const validUserIds = userIds.filter(id => followingUsers.has(id) && !pendingOperations.current.has(id))
    if (validUserIds.length === 0) return

    setError(null)
    validUserIds.forEach(addLoadingUser)

    if (enableOptimisticUpdates) {
      setFollowingUsers(prev => {
        const newSet = new Set(prev)
        validUserIds.forEach(id => newSet.delete(id))
        return newSet
      })
    }

    await Promise.allSettled(validUserIds.map(userId => {
      const operation: FollowOperation = {
        userId,
        action: 'unfollow',
        timestamp: Date.now(),
        retryCount: 0
      }
      pendingOperations.current.set(userId, operation)
      return executeUnfollowOperation(userId)
    }))
  }, [enableBatchOperations, followingUsers, enableOptimisticUpdates, addLoadingUser, unfollowUser, executeUnfollowOperation])

  // 상태 확인 함수들
  const isFollowing = useCallback((userId: string) => {
    return followingUsers.has(userId)
  }, [followingUsers])

  const isFollowedBy = useCallback((userId: string) => {
    return followStates.get(userId)?.isFollowedBy || false
  }, [followStates])

  const getFollowStats = useCallback((userId: string) => {
    return followStates.get(userId)?.stats
  }, [followStates])

  // 새로고침 함수들
  const refreshFollowState = useCallback(async (userId: string) => {
    addLoadingUser(userId)
    try {
      // Mock API 호출
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockState: FollowState = {
        isFollowing: followingUsers.has(userId),
        isFollowedBy: Math.random() > 0.5,
        stats: {
          followersCount: Math.floor(Math.random() * 500) + 50,
          followingCount: Math.floor(Math.random() * 200) + 20
        }
      }

      setFollowStates(prev => new Map(prev).set(userId, mockState))
      if (mockState.stats) {
        onStatsUpdate?.(userId, mockState.stats)
      }
    } catch (error) {
      onError?.('팔로우 상태 새로고침에 실패했습니다.', userId)
    } finally {
      removeLoadingUser(userId)
    }
  }, [followingUsers, addLoadingUser, removeLoadingUser, onStatsUpdate, onError])

  const refreshAllFollowStates = useCallback(async () => {
    setIsLoading(true)
    try {
      await loadInitialFollowStates()
    } finally {
      setIsLoading(false)
    }
  }, [loadInitialFollowStates])

  // 유틸리티 함수들
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const setFollowingUsersExternal = useCallback((users: string[]) => {
    setFollowingUsers(new Set(users))
  }, [])

  const updateFollowState = useCallback((userId: string, state: Partial<FollowState>) => {
    setFollowStates(prev => {
      const currentState = prev.get(userId) || { isFollowing: false, isFollowedBy: false }
      return new Map(prev).set(userId, { ...currentState, ...state })
    })
  }, [])

  // 정리
  useEffect(() => {
    return () => {
      // 모든 진행 중인 작업 취소
      abortControllers.current.forEach(controller => controller.abort())
      abortControllers.current.clear()
      
      // 모든 재시도 타이머 정리
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout))
      retryTimeouts.current.clear()
      
      pendingOperations.current.clear()
    }
  }, [])

  return {
    // 상태
    isLoading,
    loadingUsers,
    followingUsers: Array.from(followingUsers),
    followStates,
    error,
    
    // 기본 작업
    followUser,
    unfollowUser,
    toggleFollow,
    
    // 배치 작업
    followMultiple,
    unfollowMultiple,
    
    // 상태 확인
    isFollowing,
    isFollowedBy,
    getFollowStats,
    
    // 유틸리티
    refreshFollowState,
    refreshAllFollowStates,
    clearError,
    
    // 설정
    setFollowingUsers: setFollowingUsersExternal,
    updateFollowState,
  }
}
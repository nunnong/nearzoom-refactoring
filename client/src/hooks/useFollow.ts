// src/hooks/useFollow.ts

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 API 및 타입 import
import {
  followUser as followUserAPI,
  unfollowUser as unfollowUserAPI,
  toggleFollow as toggleFollowAPI,
  checkFollowStatusByAccountName,
  getFollowStats as getFollowStatsAPI,
  getFollowing,
  getFollowers
} from '@/lib/api/follow'

import {
  getCurrentUser
} from '@/lib/api/feed'

import {
  BackendFollowCountsResponse,
  BackendUserProfileResponse
} from '@/lib/types/feed'

// ============================================================================
// 타입 정의 (백엔드 연동 단순화)
// ============================================================================

interface FollowStats {
  followersCount: number
  followingCount: number
}

interface FollowState {
  isFollowing: boolean
  stats?: FollowStats
}

interface UseFollowOptions {
  enableOptimisticUpdates?: boolean
  maxRetries?: number
  retryDelay?: number
  onFollowSuccess?: (accountName: string, stats?: FollowStats) => void
  onUnfollowSuccess?: (accountName: string, stats?: FollowStats) => void
  onError?: (error: string, accountName?: string) => void
  onStatsUpdate?: (accountName: string, stats: FollowStats) => void
}

interface FollowOperation {
  accountName: string
  action: 'follow' | 'unfollow'
  timestamp: number
  retryCount: number
}

interface UseFollowReturn {
  // 상태
  isLoading: boolean
  loadingUsers: Set<string>
  followStates: Map<string, FollowState>
  error: string | null
  
  // 기본 작업 (accountName 기반)
  followUser: (accountName: string) => Promise<void>
  unfollowUser: (accountName: string) => Promise<void>
  toggleFollow: (accountName: string, currentlyFollowing?: boolean) => Promise<void>
  
  // 상태 확인
  isFollowing: (accountName: string) => boolean
  getFollowStats: (accountName: string) => FollowStats | undefined
  
  // 유틸리티
  refreshFollowState: (accountName: string) => Promise<void>
  clearError: () => void
  
  // 설정
  updateFollowState: (accountName: string, state: Partial<FollowState>) => void
}

// ============================================================================
// 메인 훅
// ============================================================================

export const useFollow = (options: UseFollowOptions = {}): UseFollowReturn => {
  const {
    enableOptimisticUpdates = true,
    maxRetries = 3,
    retryDelay = 1000,
    onFollowSuccess,
    onUnfollowSuccess,
    onError,
    onStatsUpdate
  } = options

  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isLoading, setIsLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set())
  const [followStates, setFollowStates] = useState<Map<string, FollowState>>(new Map())
  const [error, setError] = useState<string | null>(null)
  
  // 진행 중인 작업들을 추적
  const pendingOperations = useRef<Map<string, FollowOperation>>(new Map())
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 인증 상태
  const { isAuthenticated } = useAuthStore()

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 로딩 중인 사용자 추가/제거 헬퍼
  const addLoadingUser = useCallback((accountName: string) => {
    setLoadingUsers(prev => new Set([...prev, accountName]))
  }, [])

  const removeLoadingUser = useCallback((accountName: string) => {
    setLoadingUsers(prev => {
      const newSet = new Set(prev)
      newSet.delete(accountName)
      return newSet
    })
  }, [])

  // ============================================================================
  // 재시도 로직
  // ============================================================================

  const retryOperation = useCallback(async (operation: FollowOperation) => {
    const { accountName, action, retryCount } = operation
    
    if (retryCount >= maxRetries) {
      pendingOperations.current.delete(accountName)
      removeLoadingUser(accountName)
      onError?.(`${action === 'follow' ? '팔로우' : '언팔로우'}에 실패했습니다. (최대 재시도 횟수 초과)`, accountName)
      return
    }

    const timeoutId = setTimeout(async () => {
      retryTimeouts.current.delete(accountName)
      const updatedOperation = { ...operation, retryCount: retryCount + 1 }
      pendingOperations.current.set(accountName, updatedOperation)
      
      if (action === 'follow') {
        await executeFollowOperation(accountName)
      } else {
        await executeUnfollowOperation(accountName)
      }
    }, retryDelay * Math.pow(2, retryCount)) // 지수 백오프

    retryTimeouts.current.set(accountName, timeoutId)
  }, [maxRetries, retryDelay, onError, removeLoadingUser])

  // ============================================================================
  // 백엔드 API 연동 - 팔로우 실행 로직
  // ============================================================================

  const executeFollowOperation = useCallback(async (accountName: string) => {
    const operation = pendingOperations.current.get(accountName)
    if (!operation) return

    const abortController = new AbortController()
    abortControllers.current.set(accountName, abortController)

    try {
      // 🔥 백엔드 API 호출 (POST /follows/{accountName})
      const result = await followUserAPI(accountName)

      if (result.success) {
        // 🔥 팔로우 후 통계 조회 (안전한 처리)
        let stats: FollowStats | undefined
        try {
          const statsResult = await getFollowStatsAPI(accountName)
          if (statsResult && statsResult.success && statsResult.data) {
            stats = {
              followersCount: statsResult.data.followersCount,
              followingCount: statsResult.data.followingCount
            }
          }
        } catch (statsError) {
          console.warn('Failed to get follow stats after follow:', statsError)
          // 통계 조회 실패는 무시하고 계속 진행
        }

        // 성공 시 상태 업데이트
        setFollowStates(prev => new Map(prev).set(accountName, {
          isFollowing: true,
          stats
        }))

        pendingOperations.current.delete(accountName)
        abortControllers.current.delete(accountName)
        
        onFollowSuccess?.(accountName, stats)
        if (stats) {
          onStatsUpdate?.(accountName, stats)
        }
      } else {
        throw new Error(result.error || '팔로우에 실패했습니다.')
      }

    } catch (error) {
      abortControllers.current.delete(accountName)
      
      if (error instanceof Error && error.message === 'Operation was cancelled') {
        pendingOperations.current.delete(accountName)
        return
      }

      console.error('Follow operation failed:', error)
      await retryOperation(operation)
    } finally {
      removeLoadingUser(accountName)
    }
  }, [onFollowSuccess, onStatsUpdate, retryOperation, removeLoadingUser])

  // ============================================================================
  // 백엔드 API 연동 - 언팔로우 실행 로직
  // ============================================================================

  const executeUnfollowOperation = useCallback(async (accountName: string) => {
    const operation = pendingOperations.current.get(accountName)
    if (!operation) return

    const abortController = new AbortController()
    abortControllers.current.set(accountName, abortController)

    try {
      // 🔥 백엔드 API 호출 (DELETE /follows/{accountName})
      const result = await unfollowUserAPI(accountName)

      if (result.success) {
        // 🔥 언팔로우 후 통계 조회 (안전한 처리)
        let stats: FollowStats | undefined
        try {
          const statsResult = await getFollowStatsAPI(accountName)
          if (statsResult && statsResult.success && statsResult.data) {
            stats = {
              followersCount: statsResult.data.followersCount,
              followingCount: statsResult.data.followingCount
            }
          }
        } catch (statsError) {
          console.warn('Failed to get follow stats after unfollow:', statsError)
          // 통계 조회 실패는 무시하고 계속 진행
        }

        // 성공 시 상태 업데이트
        setFollowStates(prev => new Map(prev).set(accountName, {
          isFollowing: false,
          stats
        }))

        pendingOperations.current.delete(accountName)
        abortControllers.current.delete(accountName)
        
        onUnfollowSuccess?.(accountName, stats)
        if (stats) {
          onStatsUpdate?.(accountName, stats)
        }
      } else {
        throw new Error(result.error || '언팔로우에 실패했습니다.')
      }

    } catch (error) {
      abortControllers.current.delete(accountName)
      
      if (error instanceof Error && error.message === 'Operation was cancelled') {
        pendingOperations.current.delete(accountName)
        return
      }

      console.error('Unfollow operation failed:', error)
      await retryOperation(operation)
    } finally {
      removeLoadingUser(accountName)
    }
  }, [onUnfollowSuccess, onStatsUpdate, retryOperation, removeLoadingUser])

  // ============================================================================
  // 공개 API 함수들
  // ============================================================================

  // 🔥 팔로우 함수 (백엔드 연동)
  const followUser = useCallback(async (accountName: string) => {
    if (!isAuthenticated) {
      onError?.('로그인이 필요합니다.', accountName)
      return
    }

    if (pendingOperations.current.has(accountName)) return
    
    // 이미 팔로우 중인지 확인
    const currentState = followStates.get(accountName)
    if (currentState?.isFollowing) return

    setError(null)
    addLoadingUser(accountName)

    // 낙관적 업데이트
    if (enableOptimisticUpdates) {
      setFollowStates(prev => new Map(prev).set(accountName, {
        isFollowing: true,
        stats: prev.get(accountName)?.stats
      }))
    }

    const operation: FollowOperation = {
      accountName,
      action: 'follow',
      timestamp: Date.now(),
      retryCount: 0
    }

    pendingOperations.current.set(accountName, operation)
    await executeFollowOperation(accountName)
  }, [isAuthenticated, followStates, enableOptimisticUpdates, addLoadingUser, executeFollowOperation, onError])

  // 🔥 언팔로우 함수 (백엔드 연동)
  const unfollowUser = useCallback(async (accountName: string) => {
    if (!isAuthenticated) {
      onError?.('로그인이 필요합니다.', accountName)
      return
    }

    if (pendingOperations.current.has(accountName)) return
    
    // 팔로우 중이 아닌지 확인
    const currentState = followStates.get(accountName)
    if (!currentState?.isFollowing) return

    setError(null)
    addLoadingUser(accountName)

    // 낙관적 업데이트
    if (enableOptimisticUpdates) {
      setFollowStates(prev => new Map(prev).set(accountName, {
        isFollowing: false,
        stats: prev.get(accountName)?.stats
      }))
    }

    const operation: FollowOperation = {
      accountName,
      action: 'unfollow',
      timestamp: Date.now(),
      retryCount: 0
    }

    pendingOperations.current.set(accountName, operation)
    await executeUnfollowOperation(accountName)
  }, [isAuthenticated, followStates, enableOptimisticUpdates, addLoadingUser, executeUnfollowOperation, onError])

  // 🔥 토글 팔로우 (백엔드 연동)
  const toggleFollow = useCallback(async (accountName: string, currentlyFollowing?: boolean) => {
    const currentState = followStates.get(accountName)
    const isCurrentlyFollowing = currentlyFollowing ?? currentState?.isFollowing ?? false
    
    if (isCurrentlyFollowing) {
      await unfollowUser(accountName)
    } else {
      await followUser(accountName)
    }
  }, [followStates, followUser, unfollowUser])

  // ============================================================================
  // 상태 확인 함수들
  // ============================================================================

  const isFollowing = useCallback((accountName: string) => {
    return followStates.get(accountName)?.isFollowing || false
  }, [followStates])

  const getFollowStats = useCallback((accountName: string): FollowStats | undefined => {
    return followStates.get(accountName)?.stats
  }, [followStates])

  // ============================================================================
  // 새로고침 함수들 (백엔드 연동)
  // ============================================================================

  // 🔥 팔로우 상태 새로고침 (백엔드 API 호출)
  const refreshFollowState = useCallback(async (accountName: string) => {
    if (!isAuthenticated) return

    addLoadingUser(accountName)
    try {
      // 🔥 백엔드에서 팔로우 상태 조회 (GET /follows/check/{accountName})
      const [followStatusResult, statsResult] = await Promise.all([
        checkFollowStatusByAccountName(accountName).catch(() => false),
        getFollowStatsAPI(accountName).catch(() => ({ success: false, data: null }))
      ])

      const isFollowing = followStatusResult || false
      const stats: FollowStats | undefined = statsResult && statsResult.success && statsResult.data ? {
        followersCount: statsResult.data.followersCount,
        followingCount: statsResult.data.followingCount
      } : undefined

      const newState: FollowState = {
        isFollowing,
        stats
      }

      setFollowStates(prev => new Map(prev).set(accountName, newState))
      
      if (stats) {
        onStatsUpdate?.(accountName, stats)
      }
    } catch (error) {
      console.error('Failed to refresh follow state:', error)
      onError?.('팔로우 상태 새로고침에 실패했습니다.', accountName)
    } finally {
      removeLoadingUser(accountName)
    }
  }, [isAuthenticated, addLoadingUser, removeLoadingUser, onStatsUpdate, onError])

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const updateFollowState = useCallback((accountName: string, state: Partial<FollowState>) => {
    setFollowStates(prev => {
      const currentState = prev.get(accountName) || { isFollowing: false }
      return new Map(prev).set(accountName, { ...currentState, ...state })
    })
  }, [])

  // ============================================================================
  // Cleanup
  // ============================================================================

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

  // ============================================================================
  // 반환 값
  // ============================================================================

  return {
    // 상태
    isLoading,
    loadingUsers,
    followStates,
    error,
    
    // 기본 작업 (accountName 기반)
    followUser,
    unfollowUser,
    toggleFollow,
    
    // 상태 확인
    isFollowing,
    getFollowStats,
    
    // 유틸리티
    refreshFollowState,
    clearError,
    
    // 설정
    updateFollowState,
  }
}
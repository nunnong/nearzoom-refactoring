// ============================================================================
// src/hooks/useFollow.ts - 백엔드 완벽 연동 버전 (아키텍처 원칙 100% 준수)
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 타입 import
import {
  type FollowCountsResponse,
  type UserProfileResponse,
  type ApiResponse,
} from '@/lib/types/feed'

// 🔥 API 함수들과 ApiResult 타입을 follow.ts에서 import
import {
  followUser as apiFollowUser,
  unfollowUser as apiUnfollowUser,
  checkFollowStatus,
  getFollowCounts,
  getFollowingList,
  getFollowersList,
  getMutualFollowsList,
  toggleFollowOptimistic,
  safeToggleFollow,
  checkMultipleFollowStatus,
  getMultipleFollowCounts,
  buildFollowMatrix,
  type ApiResult,
} from '@/lib/api/follow'

// 에러 처리 헬퍼
const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }

    switch (axiosError.response?.status) {
      case 401:
        return '로그인이 필요합니다.'
      case 403:
        return '접근 권한이 없습니다.'
      case 404:
        return '사용자를 찾을 수 없습니다.'
      case 409:
        return '이미 처리된 요청입니다.'
      case 500:
        return '서버 오류가 발생했습니다.'
      default:
        return '네트워크 오류가 발생했습니다.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

// ============================================================================
// 🎯 프론트엔드 타입 정의
// ============================================================================

interface FollowStats {
  followerCount: number
  followingCount: number
}

interface FollowState {
  isFollowing: boolean
  stats?: FollowStats
  lastUpdated?: string
  isStale?: boolean // 서버와 동기화가 필요한지 여부
}

interface UseFollowOptions {
  enableOptimisticUpdates?: boolean
  enableBatchOperations?: boolean // 배치 처리 활성화
  autoRefreshStats?: boolean // 자동 통계 새로고침
  onFollowSuccess?: (accountName: string, stats?: FollowStats) => void
  onUnfollowSuccess?: (accountName: string, stats?: FollowStats) => void
  onError?: (error: string, accountName?: string) => void
  onStatsUpdate?: (accountName: string, stats: FollowStats) => void
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
  toggleFollow: (
    accountName: string,
    currentlyFollowing?: boolean
  ) => Promise<void>
  safeToggle: (
    accountName: string,
    currentlyFollowing?: boolean
  ) => Promise<void>

  // 상태 확인
  isFollowing: (accountName: string) => boolean
  getFollowStats: (accountName: string) => FollowStats | undefined
  isStale: (accountName: string) => boolean

  // 목록 조회
  getFollowers: (accountName: string) => Promise<UserProfileResponse[]>
  getFollowing: (accountName: string) => Promise<UserProfileResponse[]>
  getMutualFollows: (accountName: string) => Promise<UserProfileResponse[]>

  // 🔥 배치 처리
  batchCheckFollowStatus: (
    accountNames: string[]
  ) => Promise<Record<string, boolean>>
  batchGetFollowCounts: (
    accountNames: string[]
  ) => Promise<Record<string, FollowStats>>
  buildUserFollowMatrix: (
    accountNames: string[]
  ) => Promise<
    Record<
      string,
      { isFollowing: boolean; followerCount: number; followingCount: number }
    >
  >

  // 유틸리티
  refreshFollowState: (accountName: string) => Promise<void>
  refreshFollowStats: (accountName: string) => Promise<void>
  clearError: () => void
  updateFollowState: (accountName: string, state: Partial<FollowState>) => void
  markAsStale: (accountName: string) => void
  syncWithServer: (accountName: string) => Promise<void>
}

// ============================================================================
// 🔥 백엔드 완전 연동된 팔로우 훅
// ============================================================================

export const useFollow = (options: UseFollowOptions = {}): UseFollowReturn => {
  const {
    enableOptimisticUpdates = true,
    enableBatchOperations = true,
    autoRefreshStats = true,
    onFollowSuccess,
    onUnfollowSuccess,
    onError,
    onStatsUpdate,
  } = options

  const router = useRouter()

  // ============================================================================
  // 상태 관리
  // ============================================================================

  // 🔐 무조건 로그인 필수: Zustand 상태 관리
  const { isAuthenticated, user } = useAuthStore()

  const [isLoading, setIsLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set())
  const [followStates, setFollowStates] = useState<Map<string, FollowState>>(
    new Map()
  )
  const [error, setError] = useState<string | null>(null)

  // 진행 중인 작업들을 추적
  const pendingOperations = useRef<Set<string>>(new Set())

  // 통계 새로고침 타이머
  const refreshTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 🔐 무조건 로그인 필수 - 미인증시 즉시 리다이렉트
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.warn('🔐 인증되지 않은 사용자 - 로그인 페이지로 리다이렉트')
      router.replace('/auth/login')
      return
    }
  }, [isAuthenticated, user, router])

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 🔐 인증 체크 헬퍼 - 모든 API 호출 전 필수
  const checkAuth = useCallback((): boolean => {
    if (!isAuthenticated || !user) {
      const errorMessage = '로그인이 필요합니다.'
      setError(errorMessage)
      onError?.(errorMessage)
      router.replace('/auth/login')
      return false
    }
    return true
  }, [isAuthenticated, user, onError, router])

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

  // 에러 처리 헬퍼
  const handleErrorLocal = useCallback(
    (err: unknown, context: string, accountName?: string) => {
      console.error(`Error in ${context}:`, err)
      const message = handleApiError(err)
      setError(message)
      onError?.(message, accountName)
    },
    [onError]
  )

  // 🔥 팔로우 통계만 새로고침
  const refreshFollowStats = useCallback(
    async (accountName: string) => {
      // 🔐 인증 확인
      if (!checkAuth()) return

      try {
        console.log('🔥 팔로우 통계 새로고침:', accountName)

        const result = await getFollowCounts(accountName)
        if (result.success && result.data) {
          const stats: FollowStats = {
            followerCount: result.data.followerCount,
            followingCount: result.data.followingCount,
          }

          setFollowStates(prev => {
            const current = prev.get(accountName) || { isFollowing: false }
            return new Map(prev).set(accountName, {
              ...current,
              stats,
              lastUpdated: new Date().toISOString(),
              isStale: false,
            })
          })

          onStatsUpdate?.(accountName, stats)

          console.log('🔥 팔로우 통계 새로고침 완료:', { accountName, stats })
        }
      } catch (err) {
        handleErrorLocal(err, '팔로우 통계 새로고침', accountName)
      }
    },
    [onStatsUpdate, handleErrorLocal, checkAuth]
  )

  // 통계 자동 새로고침 스케줄러
  const scheduleStatsRefresh = useCallback(
    (accountName: string) => {
      if (!autoRefreshStats) return

      // 기존 타이머 제거
      const existingTimer = refreshTimers.current.get(accountName)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // 30초 후 통계 새로고침
      const timer = setTimeout(() => {
        refreshFollowStats(accountName)
      }, 30000)

      refreshTimers.current.set(accountName, timer)
    },
    [autoRefreshStats, refreshFollowStats]
  )

  // ============================================================================
  // 🔥 백엔드 API 연동 - 팔로우 함수
  // ============================================================================

  const followUser = useCallback(
    async (accountName: string) => {
      // 🔐 인증 확인 (모든 API 호출 전 필수)
      if (!checkAuth()) return

      if (pendingOperations.current.has(accountName)) return

      // 이미 팔로우 중인지 확인
      const currentState = followStates.get(accountName)
      if (currentState?.isFollowing) {
        console.log('이미 팔로우 중입니다:', accountName)
        return
      }

      setError(null)
      addLoadingUser(accountName)
      pendingOperations.current.add(accountName)

      try {
        console.log('🔥 팔로우 시작:', accountName)

        if (enableOptimisticUpdates) {
          // 낙관적 업데이트 사용
          await toggleFollowOptimistic(
            accountName,
            false, // 현재 팔로우하지 않은 상태
            newState => {
              // 즉시 UI 업데이트
              setFollowStates(prev =>
                new Map(prev).set(accountName, {
                  isFollowing: newState,
                  stats: prev.get(accountName)?.stats,
                  lastUpdated: new Date().toISOString(),
                  isStale: false,
                })
              )
            },
            originalState => {
              // 실패 시 롤백
              setFollowStates(prev =>
                new Map(prev).set(accountName, {
                  isFollowing: originalState,
                  stats: prev.get(accountName)?.stats,
                  lastUpdated: new Date().toISOString(),
                  isStale: true,
                })
              )
            }
          )
        } else {
          // 일반 API 호출
          const result = await apiFollowUser(accountName)
          if (!result.success) {
            throw new Error(result.error || '팔로우에 실패했습니다.')
          }

          setFollowStates(prev =>
            new Map(prev).set(accountName, {
              isFollowing: true,
              stats: prev.get(accountName)?.stats,
              lastUpdated: new Date().toISOString(),
              isStale: false,
            })
          )
        }

        // 🔥 팔로우 후 통계 조회
        if (autoRefreshStats) {
          try {
            const statsResult = await getFollowCounts(accountName)
            if (statsResult.success && statsResult.data) {
              const stats: FollowStats = {
                followerCount: statsResult.data.followerCount,
                followingCount: statsResult.data.followingCount,
              }

              setFollowStates(prev => {
                const current = prev.get(accountName) || { isFollowing: true }
                return new Map(prev).set(accountName, { ...current, stats })
              })

              onStatsUpdate?.(accountName, stats)
            }
          } catch (statsError) {
            console.warn('Failed to get follow stats after follow:', statsError)
          }
        }

        console.log('🔥 팔로우 성공:', accountName)
        onFollowSuccess?.(accountName, followStates.get(accountName)?.stats)

        // 통계 자동 새로고침 스케줄
        scheduleStatsRefresh(accountName)
      } catch (err) {
        console.error('Follow operation failed:', err)
        handleErrorLocal(err, '팔로우', accountName)
      } finally {
        removeLoadingUser(accountName)
        pendingOperations.current.delete(accountName)
      }
    },
    [
      checkAuth,
      followStates,
      enableOptimisticUpdates,
      autoRefreshStats,
      addLoadingUser,
      removeLoadingUser,
      onFollowSuccess,
      onStatsUpdate,
      handleErrorLocal,
      scheduleStatsRefresh,
    ]
  )

  // ============================================================================
  // 🔥 백엔드 API 연동 - 언팔로우 함수
  // ============================================================================

  const unfollowUser = useCallback(
    async (accountName: string) => {
      // 🔐 인증 확인 (모든 API 호출 전 필수)
      if (!checkAuth()) return

      if (pendingOperations.current.has(accountName)) return

      // 팔로우 중이 아닌지 확인
      const currentState = followStates.get(accountName)
      if (!currentState?.isFollowing) {
        console.log('팔로우 중이 아닙니다:', accountName)
        return
      }

      setError(null)
      addLoadingUser(accountName)
      pendingOperations.current.add(accountName)

      try {
        console.log('🔥 언팔로우 시작:', accountName)

        if (enableOptimisticUpdates) {
          // 낙관적 업데이트 사용
          await toggleFollowOptimistic(
            accountName,
            true, // 현재 팔로우 중인 상태
            newState => {
              // 즉시 UI 업데이트
              setFollowStates(prev =>
                new Map(prev).set(accountName, {
                  isFollowing: newState,
                  stats: prev.get(accountName)?.stats,
                  lastUpdated: new Date().toISOString(),
                  isStale: false,
                })
              )
            },
            originalState => {
              // 실패 시 롤백
              setFollowStates(prev =>
                new Map(prev).set(accountName, {
                  isFollowing: originalState,
                  stats: prev.get(accountName)?.stats,
                  lastUpdated: new Date().toISOString(),
                  isStale: true,
                })
              )
            }
          )
        } else {
          // 일반 API 호출
          const result = await apiUnfollowUser(accountName)
          if (!result.success) {
            throw new Error(result.error || '언팔로우에 실패했습니다.')
          }

          setFollowStates(prev =>
            new Map(prev).set(accountName, {
              isFollowing: false,
              stats: prev.get(accountName)?.stats,
              lastUpdated: new Date().toISOString(),
              isStale: false,
            })
          )
        }

        // 🔥 언팔로우 후 통계 조회
        if (autoRefreshStats) {
          try {
            const statsResult = await getFollowCounts(accountName)
            if (statsResult.success && statsResult.data) {
              const stats: FollowStats = {
                followerCount: statsResult.data.followerCount,
                followingCount: statsResult.data.followingCount,
              }

              setFollowStates(prev => {
                const current = prev.get(accountName) || { isFollowing: false }
                return new Map(prev).set(accountName, { ...current, stats })
              })

              onStatsUpdate?.(accountName, stats)
            }
          } catch (statsError) {
            console.warn(
              'Failed to get follow stats after unfollow:',
              statsError
            )
          }
        }

        console.log('🔥 언팔로우 성공:', accountName)
        onUnfollowSuccess?.(accountName, followStates.get(accountName)?.stats)

        // 통계 자동 새로고침 스케줄
        scheduleStatsRefresh(accountName)
      } catch (err) {
        console.error('Unfollow operation failed:', err)
        handleErrorLocal(err, '언팔로우', accountName)
      } finally {
        removeLoadingUser(accountName)
        pendingOperations.current.delete(accountName)
      }
    },
    [
      checkAuth,
      followStates,
      enableOptimisticUpdates,
      autoRefreshStats,
      addLoadingUser,
      removeLoadingUser,
      onUnfollowSuccess,
      onStatsUpdate,
      handleErrorLocal,
      scheduleStatsRefresh,
    ]
  )

  // ============================================================================
  // 토글 팔로우
  // ============================================================================

  const toggleFollow = useCallback(
    async (accountName: string, currentlyFollowing?: boolean) => {
      const currentState = followStates.get(accountName)
      const isCurrentlyFollowing =
        currentlyFollowing ?? currentState?.isFollowing ?? false

      if (isCurrentlyFollowing) {
        await unfollowUser(accountName)
      } else {
        await followUser(accountName)
      }
    },
    [followStates, followUser, unfollowUser]
  )

  // 🔥 안전한 토글 (서버 상태 확인 후 토글)
  const safeToggle = useCallback(
    async (accountName: string, currentlyFollowing?: boolean) => {
      // 🔐 인증 확인
      if (!checkAuth()) return

      const currentState = followStates.get(accountName)
      const clientState =
        currentlyFollowing ?? currentState?.isFollowing ?? false

      try {
        addLoadingUser(accountName)

        const result = await safeToggleFollow(accountName, clientState)
        if (result.success) {
          setFollowStates(prev =>
            new Map(prev).set(accountName, {
              isFollowing: result.newState,
              stats: prev.get(accountName)?.stats,
              lastUpdated: new Date().toISOString(),
              isStale: false,
            })
          )

          if (result.newState) {
            onFollowSuccess?.(accountName)
          } else {
            onUnfollowSuccess?.(accountName)
          }
        } else {
          throw new Error(result.error || '팔로우 상태 변경에 실패했습니다.')
        }
      } catch (err) {
        handleErrorLocal(err, '안전한 팔로우 토글', accountName)
      } finally {
        removeLoadingUser(accountName)
      }
    },
    [
      followStates,
      addLoadingUser,
      removeLoadingUser,
      onFollowSuccess,
      onUnfollowSuccess,
      handleErrorLocal,
      checkAuth,
    ]
  )

  // ============================================================================
  // 상태 확인 함수들
  // ============================================================================

  const isFollowing = useCallback(
    (accountName: string) => {
      return followStates.get(accountName)?.isFollowing || false
    },
    [followStates]
  )

  const getFollowStats = useCallback(
    (accountName: string): FollowStats | undefined => {
      return followStates.get(accountName)?.stats
    },
    [followStates]
  )

  const isStale = useCallback(
    (accountName: string): boolean => {
      return followStates.get(accountName)?.isStale || false
    },
    [followStates]
  )

  // ============================================================================
  // 🔥 목록 조회 함수들 (백엔드 연동) - 타입 변환 처리
  // ============================================================================

  const getFollowers = useCallback(
    async (accountName: string): Promise<UserProfileResponse[]> => {
      // 🔐 인증 확인
      if (!checkAuth()) return []

      try {
        console.log('🔥 팔로워 목록 조회:', accountName)
        const result = await getFollowersList(accountName)
        if (result.success && result.data) {
          // 🔥 타입 변환: feed.ts 타입에 맞춰 변환
          return result.data.map(user => ({
            userId: user.userId,
            accountName: user.accountName,
            userName: user.userName,
            userEmail: user.userEmail,
            profileImage: user.profileImage ?? null, // undefined를 null로 변환
            prettyFace: user.prettyFace ?? null, // feed.ts에 맞춰 string | null
          }))
        } else {
          throw new Error(result.error || '팔로워 목록 조회에 실패했습니다.')
        }
      } catch (err) {
        handleErrorLocal(err, '팔로워 목록 조회', accountName)
        return []
      }
    },
    [handleErrorLocal, checkAuth]
  )

  const getFollowing = useCallback(
    async (accountName: string): Promise<UserProfileResponse[]> => {
      // 🔐 인증 확인
      if (!checkAuth()) return []

      try {
        console.log('🔥 팔로잉 목록 조회:', accountName)
        const result = await getFollowingList(accountName)
        if (result.success && result.data) {
          // 🔥 타입 변환: feed.ts 타입에 맞춰 변환
          return result.data.map(user => ({
            userId: user.userId,
            accountName: user.accountName,
            userName: user.userName,
            userEmail: user.userEmail,
            profileImage: user.profileImage ?? null, // undefined를 null로 변환
            prettyFace: user.prettyFace ?? null, // feed.ts에 맞춰 string | null
          }))
        } else {
          throw new Error(result.error || '팔로잉 목록 조회에 실패했습니다.')
        }
      } catch (err) {
        handleErrorLocal(err, '팔로잉 목록 조회', accountName)
        return []
      }
    },
    [handleErrorLocal, checkAuth]
  )

  const getMutualFollows = useCallback(
    async (accountName: string): Promise<UserProfileResponse[]> => {
      // 🔐 인증 확인
      if (!checkAuth()) return []

      try {
        const result = await getMutualFollowsList(accountName)
        if (result.success && result.data) {
          // 🔥 타입 변환: feed.ts 타입에 맞춰 변환
          return result.data.map(user => ({
            userId: user.userId,
            accountName: user.accountName,
            userName: user.userName,
            userEmail: user.userEmail,
            profileImage: user.profileImage ?? null, // undefined를 null로 변환
            prettyFace: user.prettyFace ?? null, // feed.ts에 맞춰 string | null
          }))
        } else {
          throw new Error(
            result.error || '상호 팔로우 목록 조회에 실패했습니다.'
          )
        }
      } catch (err) {
        handleErrorLocal(err, '상호 팔로우 목록 조회', accountName)
        return []
      }
    },
    [handleErrorLocal, checkAuth]
  )

  // ============================================================================
  // 🔥 배치 처리 함수들
  // ============================================================================

  const batchCheckFollowStatus = useCallback(
    async (accountNames: string[]): Promise<Record<string, boolean>> => {
      // 🔐 인증 확인
      if (!checkAuth()) return {}

      if (!enableBatchOperations) {
        // 배치 처리가 비활성화된 경우 개별 호출
        const results: Record<string, boolean> = {}
        for (const accountName of accountNames) {
          try {
            const result = await checkFollowStatus(accountName)
            results[accountName] = result.success
              ? (result.data ?? false)
              : false
          } catch (err) {
            results[accountName] = false
          }
        }
        return results
      }

      try {
        return await checkMultipleFollowStatus(accountNames)
      } catch (err) {
        handleErrorLocal(err, '배치 팔로우 상태 확인')
        return {}
      }
    },
    [enableBatchOperations, handleErrorLocal, checkAuth]
  )

  const batchGetFollowCounts = useCallback(
    async (accountNames: string[]): Promise<Record<string, FollowStats>> => {
      // 🔐 인증 확인
      if (!checkAuth()) return {}

      if (!enableBatchOperations) {
        // 배치 처리가 비활성화된 경우 개별 호출
        const results: Record<string, FollowStats> = {}
        for (const accountName of accountNames) {
          try {
            const result = await getFollowCounts(accountName)
            if (result.success && result.data) {
              results[accountName] = {
                followerCount: result.data.followerCount,
                followingCount: result.data.followingCount,
              }
            }
          } catch (err) {
            // 실패한 경우 기본값
            results[accountName] = { followerCount: 0, followingCount: 0 }
          }
        }
        return results
      }

      try {
        console.log('🔥 배치 팔로우 수 조회:', accountNames)
        const results = await getMultipleFollowCounts(accountNames)

        // FollowCountsResponse를 FollowStats로 변환
        const convertedResults: Record<string, FollowStats> = {}
        Object.entries(results).forEach(([accountName, counts]) => {
          convertedResults[accountName] = {
            followerCount: counts.followerCount,
            followingCount: counts.followingCount,
          }
        })

        return convertedResults
      } catch (err) {
        handleErrorLocal(err, '배치 팔로우 수 조회')
        return {}
      }
    },
    [enableBatchOperations, handleErrorLocal, checkAuth]
  )

  const buildUserFollowMatrix = useCallback(
    async (accountNames: string[]) => {
      // 🔐 인증 확인
      if (!checkAuth()) return {}

      try {
        console.log('🔥 팔로우 매트릭스 생성:', accountNames)
        return await buildFollowMatrix(accountNames)
      } catch (err) {
        handleErrorLocal(err, '팔로우 매트릭스 생성')
        return {}
      }
    },
    [handleErrorLocal, checkAuth]
  )

  // ============================================================================
  // 새로고침 함수들 (백엔드 연동)
  // ============================================================================

  // 🔥 팔로우 상태 새로고침 (백엔드 API 호출)
  const refreshFollowState = useCallback(
    async (accountName: string) => {
      // 🔐 인증 확인
      if (!checkAuth()) return

      addLoadingUser(accountName)
      try {
        console.log('🔥 팔로우 상태 새로고침:', accountName)

        // 🔥 백엔드에서 팔로우 상태와 통계 조회
        const [statusResult, countsResult] = await Promise.allSettled([
          checkFollowStatus(accountName),
          getFollowCounts(accountName),
        ])

        const isFollowingValue =
          statusResult.status === 'fulfilled' && statusResult.value.success
            ? (statusResult.value.data ?? false)
            : false

        const stats: FollowStats | undefined =
          countsResult.status === 'fulfilled' &&
          countsResult.value.success &&
          countsResult.value.data
            ? {
                followerCount: countsResult.value.data.followerCount,
                followingCount: countsResult.value.data.followingCount,
              }
            : undefined

        const newState: FollowState = {
          isFollowing: isFollowingValue,
          stats,
          lastUpdated: new Date().toISOString(),
          isStale: false,
        }

        setFollowStates(prev => new Map(prev).set(accountName, newState))

        if (stats) {
          onStatsUpdate?.(accountName, stats)
        }

        console.log('🔥 팔로우 상태 새로고침 완료:', {
          accountName,
          isFollowing: isFollowingValue,
          stats,
        })
      } catch (err) {
        handleErrorLocal(err, '팔로우 상태 새로고침', accountName)
      } finally {
        removeLoadingUser(accountName)
      }
    },
    [
      checkAuth,
      addLoadingUser,
      removeLoadingUser,
      onStatsUpdate,
      handleErrorLocal,
    ]
  )

  // 🔥 서버와 동기화
  const syncWithServer = useCallback(
    async (accountName: string) => {
      // 상태를 stale로 마킹하고 새로고침
      markAsStale(accountName)
      await refreshFollowState(accountName)
    },
    [refreshFollowState]
  )

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const updateFollowState = useCallback(
    (accountName: string, state: Partial<FollowState>) => {
      setFollowStates(prev => {
        const currentState = prev.get(accountName) || { isFollowing: false }
        return new Map(prev).set(accountName, {
          ...currentState,
          ...state,
          lastUpdated: new Date().toISOString(),
        })
      })
    },
    []
  )

  const markAsStale = useCallback((accountName: string) => {
    setFollowStates(prev => {
      const currentState = prev.get(accountName)
      if (currentState) {
        return new Map(prev).set(accountName, {
          ...currentState,
          isStale: true,
        })
      }
      return prev
    })
  }, [])

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      pendingOperations.current.clear()
      // 모든 타이머 정리
      refreshTimers.current.forEach(timer => clearTimeout(timer))
      refreshTimers.current.clear()
    }
  }, [])

  // ============================================================================
  // 🔐 미인증시 안전한 기본값 반환
  // ============================================================================

  if (!isAuthenticated || !user) {
    return {
      // 상태
      isLoading: false,
      loadingUsers: new Set(),
      followStates: new Map(),
      error: '로그인이 필요합니다.',

      // 기본 작업
      followUser: () => Promise.resolve(),
      unfollowUser: () => Promise.resolve(),
      toggleFollow: () => Promise.resolve(),
      safeToggle: () => Promise.resolve(),

      // 상태 확인
      isFollowing: () => false,
      getFollowStats: () => undefined,
      isStale: () => false,

      // 목록 조회
      getFollowers: () => Promise.resolve([]),
      getFollowing: () => Promise.resolve([]),
      getMutualFollows: () => Promise.resolve([]),

      // 배치 처리
      batchCheckFollowStatus: () => Promise.resolve({}),
      batchGetFollowCounts: () => Promise.resolve({}),
      buildUserFollowMatrix: () => Promise.resolve({}),

      // 유틸리티
      refreshFollowState: () => Promise.resolve(),
      refreshFollowStats: () => Promise.resolve(),
      clearError: () => {},
      updateFollowState: () => {},
      markAsStale: () => {},
      syncWithServer: () => Promise.resolve(),
    }
  }

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
    safeToggle,

    // 상태 확인
    isFollowing,
    getFollowStats,
    isStale,

    // 목록 조회
    getFollowers,
    getFollowing,
    getMutualFollows,

    // 🔥 배치 처리
    batchCheckFollowStatus,
    batchGetFollowCounts,
    buildUserFollowMatrix,

    // 유틸리티
    refreshFollowState,
    refreshFollowStats,
    clearError,
    updateFollowState,
    markAsStale,
    syncWithServer,
  }
}

// ============================================================================
// 🔥 편의 함수들 (특정 기능별 훅)
// ============================================================================

/**
 * 단일 사용자 팔로우 관리 훅
 */
export const useUserFollow = (
  accountName: string,
  options: UseFollowOptions = {}
) => {
  const follow = useFollow(options)

  return {
    isFollowing: follow.isFollowing(accountName),
    isLoading: follow.loadingUsers.has(accountName),
    stats: follow.getFollowStats(accountName),
    isStale: follow.isStale(accountName),

    follow: () => follow.followUser(accountName),
    unfollow: () => follow.unfollowUser(accountName),
    toggle: (currentState?: boolean) =>
      follow.toggleFollow(accountName, currentState),
    safeToggle: (currentState?: boolean) =>
      follow.safeToggle(accountName, currentState),

    refresh: () => follow.refreshFollowState(accountName),
    refreshStats: () => follow.refreshFollowStats(accountName),
    sync: () => follow.syncWithServer(accountName),

    error: follow.error,
    clearError: follow.clearError,
  }
}

/**
 * 배치 팔로우 관리 훅 (여러 사용자 동시 관리)
 */
export const useBatchFollow = (
  accountNames: string[],
  options: UseFollowOptions = {}
) => {
  const follow = useFollow({ ...options, enableBatchOperations: true })

  const batchRefreshAll = useCallback(async () => {
    const [followStatuses, followCounts] = await Promise.all([
      follow.batchCheckFollowStatus(accountNames),
      follow.batchGetFollowCounts(accountNames),
    ])

    // 상태 일괄 업데이트
    accountNames.forEach(accountName => {
      const isFollowing = followStatuses[accountName] || false
      const stats = followCounts[accountName]

      follow.updateFollowState(accountName, {
        isFollowing,
        stats,
        isStale: false,
      })
    })
  }, [accountNames, follow])

  const getFollowMatrix = useCallback(async () => {
    return await follow.buildUserFollowMatrix(accountNames)
  }, [accountNames, follow])

  return {
    followStates: new Map(
      accountNames
        .map(name => [name, follow.followStates.get(name)])
        .filter(([_, state]) => state !== undefined) as [string, FollowState][]
    ),
    loadingUsers: new Set(
      accountNames.filter(name => follow.loadingUsers.has(name))
    ),

    // 개별 조작
    follow: follow.followUser,
    unfollow: follow.unfollowUser,
    toggle: follow.toggleFollow,

    // 배치 조작
    batchRefreshAll,
    getFollowMatrix,

    // 유틸리티
    isFollowing: follow.isFollowing,
    getStats: follow.getFollowStats,
    error: follow.error,
    clearError: follow.clearError,
  }
}

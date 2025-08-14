// src/lib/api/follow.ts - 백엔드 완전 연동 버전

import api from '@/lib/axios'
import {
  type ApiResponse,
  type FollowCountsResponse,
  type UserProfileResponse,
  API_ENDPOINTS,
} from '../types/feed'

// ============================================================================
// 🎯 백엔드 연동 타입들 (내부 사용)
// ============================================================================

type Long = number | string

// 백엔드 응답 타입들
interface BackendFollowCountsResponse {
  followerCount: Long
  followingCount: Long
}

interface BackendUserProfileResponse {
  userId: Long
  accountName: string
  userName: string
  userEmail: string
  profileImage: string | null
  prettyFace: string | null
}

// UI 전용 확장 타입
interface UserProfile extends UserProfileResponse {
  postsCount?: number
  followersCount?: number
  followingCount?: number
  isFollowing?: boolean
  isMe?: boolean
  bio?: string
  joinedAt?: string
}

// ============================================================================
// 🔧 변환 함수들
// ============================================================================

const convertBackendUserProfile = (backendUser: BackendUserProfileResponse): UserProfileResponse => {
  return {
    userId: Number(backendUser.userId),
    accountName: backendUser.accountName,
    userName: backendUser.userName,
    userEmail: backendUser.userEmail,
    profileImage: backendUser.profileImage,
    prettyFace: backendUser.prettyFace
  }
}

const convertBackendFollowCounts = (backendCounts: BackendFollowCountsResponse): FollowCountsResponse => {
  return {
    followerCount: Number(backendCounts.followerCount),
    followingCount: Number(backendCounts.followingCount)
  }
}

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }

    switch (axiosError.response?.status) {
      case 401:
        return '토큰이 만료되었거나 인증에 실패했습니다.'
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
// 👥 팔로우 관련 API 함수들 (백엔드 완전 연동)
// ============================================================================

/**
 * 사용자 팔로우 (POST /follows/{accountName})
 * 백엔드: FollowController.follow()
 */
export const followUser = async (
  accountName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 사용자 팔로우 API 호출 ===', accountName)

    const response = await api.post<ApiResponse<void>>(
      `/follows/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로우에 실패했습니다.'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to follow user:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

/**
 * 사용자 언팔로우 (DELETE /follows/{accountName})
 * 백엔드: FollowController.unfollow()
 */
export const unfollowUser = async (
  accountName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 사용자 언팔로우 API 호출 ===', accountName)

    const response = await api.delete<ApiResponse<void>>(
      `/follows/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '언팔로우에 실패했습니다.'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to unfollow user:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

/**
 * 팔로우 상태 확인 (GET /follows/check/{accountName})
 * 백엔드: FollowController.isFollowing()
 */
export const checkFollowStatus = async (
  accountName: string
): Promise<{ success: boolean; data?: boolean; error?: string }> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 팔로우 상태 확인 API 호출 ===', accountName)

    const response = await api.get<ApiResponse<boolean>>(
      `/follows/check/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로우 상태 확인에 실패했습니다.'
      }
    }

    return {
      success: true,
      data: response.data.data ?? false
    }
  } catch (error) {
    console.error('Failed to check follow status:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

/**
 * 팔로우 수 조회 (GET /follows/count/{accountName})
 * 백엔드: FollowController.countFollow()
 */
export const getFollowCounts = async (
  accountName: string
): Promise<{ success: boolean; data?: FollowCountsResponse; error?: string }> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 팔로우 수 조회 API 호출 ===', accountName)

    const response = await api.get<ApiResponse<BackendFollowCountsResponse>>(
      `/follows/count/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로우 수 조회에 실패했습니다.'
      }
    }

    if (!response.data.data) {
      return {
        success: false,
        error: '팔로우 수 데이터가 없습니다.'
      }
    }

    const convertedCounts = convertBackendFollowCounts(response.data.data)

    return {
      success: true,
      data: convertedCounts
    }
  } catch (error) {
    console.error('Failed to get follow counts:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

/**
 * 팔로잉 목록 조회 (GET /follows/following/{accountName})
 * 백엔드: FollowController.getFollowing()
 */
export const getFollowingList = async (
  accountName: string
): Promise<{ success: boolean; data?: UserProfileResponse[]; error?: string }> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 팔로잉 목록 조회 API 호출 ===', accountName)

    const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
      `/follows/following/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로잉 목록 조회에 실패했습니다.'
      }
    }

    const followingData = response.data.data || []

    if (!Array.isArray(followingData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    const convertedUsers = followingData.map(convertBackendUserProfile)

    return {
      success: true,
      data: convertedUsers
    }
  } catch (error) {
    console.error('Failed to get following list:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

/**
 * 팔로워 목록 조회 (GET /follows/followers/{accountName})
 * 백엔드: FollowController.getFollowers()
 */
export const getFollowersList = async (
  accountName: string
): Promise<{ success: boolean; data?: UserProfileResponse[]; error?: string }> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 팔로워 목록 조회 API 호출 ===', accountName)

    const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
      `/follows/followers/${accountName}`
    )

    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로워 목록 조회에 실패했습니다.'
      }
    }

    const followersData = response.data.data || []

    if (!Array.isArray(followersData)) {
      return {
        success: false,
        error: '잘못된 응답 형식입니다.'
      }
    }

    const convertedUsers = followersData.map(convertBackendUserProfile)

    return {
      success: true,
      data: convertedUsers
    }
  } catch (error) {
    console.error('Failed to get followers list:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 🔧 편의 함수들
// ============================================================================

/**
 * 팔로우 토글 (현재 상태에 따라 팔로우/언팔로우)
 */
export const toggleFollow = async (
  accountName: string
): Promise<{ success: boolean; data?: { isFollowing: boolean }; error?: string }> => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 팔로우 토글 API 호출 ===', accountName)

    // 현재 팔로우 상태 확인
    const statusResult = await checkFollowStatus(accountName)
    if (!statusResult.success) {
      return {
        success: false,
        error: statusResult.error
      }
    }

    const isCurrentlyFollowing = statusResult.data ?? false

    // 토글 실행
    let result
    if (isCurrentlyFollowing) {
      result = await unfollowUser(accountName)
    } else {
      result = await followUser(accountName)
    }

    if (!result.success) {
      return result
    }

    return { 
      success: true, 
      data: { isFollowing: !isCurrentlyFollowing } 
    }
  } catch (error) {
    console.error('Failed to toggle follow:', error)
    return { 
      success: false, 
      error: handleApiError(error) 
    }
  }
}

/**
 * 낙관적 팔로우 토글 (즉시 UI 업데이트)
 */
export const toggleFollowOptimistic = async (
  accountName: string,
  isCurrentlyFollowing: boolean,
  onOptimisticUpdate: (newState: boolean) => void,
  onError: (originalState: boolean) => void
): Promise<void> => {
  // 즉시 UI 업데이트
  onOptimisticUpdate(!isCurrentlyFollowing)

  try {
    const result = isCurrentlyFollowing
      ? await unfollowUser(accountName)
      : await followUser(accountName)
      
    if (!result.success) {
      // 실패시 롤백
      onError(isCurrentlyFollowing)
      throw new Error(result.error)
    }
  } catch (error) {
    // 에러 발생시 롤백
    onError(isCurrentlyFollowing)
    throw error
  }
}

/**
 * 안전한 팔로우 토글 (중복 방지)
 */
export const safeToggleFollow = async (
  accountName: string,
  currentFollowState: boolean
): Promise<{ success: boolean; newState: boolean; error?: string }> => {
  try {
    // 현재 상태 재확인
    const statusCheck = await checkFollowStatus(accountName)
    if (!statusCheck.success) {
      return {
        success: false,
        newState: currentFollowState,
        error: statusCheck.error
      }
    }

    const actualCurrentState = statusCheck.data ?? false
    
    // 상태 동기화
    if (actualCurrentState !== currentFollowState) {
      return {
        success: true,
        newState: actualCurrentState,
        error: undefined
      }
    }

    // 토글 실행
    const toggleResult = await toggleFollow(accountName)
    
    if (!toggleResult.success) {
      return {
        success: false,
        newState: currentFollowState,
        error: toggleResult.error
      }
    }

    return {
      success: true,
      newState: toggleResult.data?.isFollowing ?? !currentFollowState,
      error: undefined
    }
  } catch (error) {
    return {
      success: false,
      newState: currentFollowState,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 🔥 배치 처리 함수들
// ============================================================================

/**
 * 여러 사용자의 팔로우 상태를 배치로 확인
 */
export const checkMultipleFollowStatus = async (
  accountNames: string[]
): Promise<Record<string, boolean>> => {
  const promises = accountNames.map(async (accountName) => {
    try {
      const result = await checkFollowStatus(accountName)
      return { accountName, isFollowing: result.success ? (result.data ?? false) : false }
    } catch (error) {
      console.error(`팔로우 상태 확인 실패 (accountName: ${accountName}):`, error)
      return { accountName, isFollowing: false }
    }
  })

  const results = await Promise.all(promises)

  return results.reduce((acc, { accountName, isFollowing }) => {
    acc[accountName] = isFollowing
    return acc
  }, {} as Record<string, boolean>)
}

/**
 * 팔로우 관계 매트릭스 생성
 */
export const buildFollowMatrix = async (
  accountNames: string[]
): Promise<Record<string, { isFollowing: boolean; followerCount: number; followingCount: number }>> => {
  const [followStatuses, followCounts] = await Promise.all([
    checkMultipleFollowStatus(accountNames),
    Promise.all(accountNames.map(async (accountName) => {
      try {
        const result = await getFollowCounts(accountName)
        return { 
          accountName, 
          counts: result.success ? result.data : { followerCount: 0, followingCount: 0 }
        }
      } catch (error) {
        return { 
          accountName, 
          counts: { followerCount: 0, followingCount: 0 }
        }
      }
    }))
  ])

  const matrix: Record<string, { isFollowing: boolean; followerCount: number; followingCount: number }> = {}
  
  followCounts.forEach(({ accountName, counts }) => {
    matrix[accountName] = {
      isFollowing: followStatuses[accountName] || false,
      followerCount: counts?.followerCount || 0,
      followingCount: counts?.followingCount || 0
    }
  })
  
  return matrix
}

// ============================================================================
// 🔥 에러 복구 및 재시도 로직
// ============================================================================

export const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await apiCall()
    } catch (error) {
      lastError = error

      if (i === maxRetries) break

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any
        if (axiosError.response?.status === 401) break
      }

      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)))
    }
  }

  throw lastError
}

export const getFollowCountsWithRetry = async (accountName: string) => {
  return withRetry(() => getFollowCounts(accountName), 3, 1000)
}

export const checkFollowStatusWithRetry = async (accountName: string) => {
  return withRetry(() => checkFollowStatus(accountName), 3, 1000)
}

// ============================================================================
// 📤 타입 내보내기 (충돌 없음)
// ============================================================================

export type {
  UserProfile as FollowUserProfile,
  FollowCountsResponse,
  UserProfileResponse
}
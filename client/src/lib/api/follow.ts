// =============================================
// 📁 lib/api/follow.ts - 타입 호환성 수정 버전
// =============================================

import api from '@/lib/axios'

// ============================================================================
// 🎯 타입 정의 - feed.ts와 호환되도록 수정
// ============================================================================

interface ApiResponse<T> {
  error: boolean
  message: string | null
  data: T
}

interface FollowCountsResponse {
  followerCount: number
  followingCount: number
}

// 🔥 feed.ts와 완전히 동일하게 수정
interface UserProfileResponse {
  userId: number
  accountName: string
  userName: string
  userEmail: string
  profileImage: string | null
  prettyFace: string | null  // 🔥 feed.ts에 맞춰 string | null로 변경
}

interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// 🔧 유틸리티 함수
// ============================================================================

const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }

    switch (axiosError.response?.status) {
      case 401:
        return '인증이 필요합니다. 다시 로그인해주세요.'
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

// 🔥 데이터 변환 헬퍼 함수 수정 - feed.ts 타입에 맞춤
const normalizeUserProfile = (user: any): UserProfileResponse => ({
  userId: user.userId,
  accountName: user.accountName,
  userName: user.userName,
  userEmail: user.userEmail,
  profileImage: user.profileImage ?? null, // 🔥 undefined를 null로 변환
  prettyFace: user.prettyFace ?? null      // 🔥 feed.ts에 맞춰 string | null
})

// ============================================================================
// 🔥 기본 Follow API 함수들
// ============================================================================

/**
 * 팔로우
 */
export const followUser = async (accountName: string): Promise<ApiResult<void>> => {
  try {
    console.log('🔥 팔로우:', accountName)
    
    const response = await api.post<ApiResponse<void>>(`/follows/${accountName}`)
    
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
 * 언팔로우
 */
export const unfollowUser = async (accountName: string): Promise<ApiResult<void>> => {
  try {
    console.log('🔥 언팔로우:', accountName)
    
    const response = await api.delete<ApiResponse<void>>(`/follows/${accountName}`)
    
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
 * 팔로우 상태 확인
 */
export const checkFollowStatus = async (accountName: string): Promise<ApiResult<boolean>> => {
  try {
    console.log('🔥 팔로우 상태 확인:', accountName)
    
    const response = await api.get<ApiResponse<boolean>>(`/follows/check/${accountName}`)
    
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로우 상태 확인에 실패했습니다.'
      }
    }
    
    return {
      success: true,
      data: response.data.data || false
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
 * 팔로우 수 조회
 */
export const getFollowCounts = async (accountName: string): Promise<ApiResult<FollowCountsResponse>> => {
  try {
    console.log('🔥 팔로우 수 조회:', accountName)
    
    const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${accountName}`)
    
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로우 수 조회에 실패했습니다.'
      }
    }
    
    return {
      success: true,
      data: response.data.data
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
 * 팔로잉 목록 조회 - 🔥 데이터 정규화 추가
 */
export const getFollowingList = async (accountName: string): Promise<ApiResult<UserProfileResponse[]>> => {
  try {
    console.log('🔥 팔로잉 목록 조회:', accountName)
    
    const response = await api.get<ApiResponse<any[]>>(`/follows/following/${accountName}`)
    
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로잉 목록 조회에 실패했습니다.'
      }
    }
    
    // 🔥 데이터 정규화
    const normalizedData = (response.data.data || []).map(normalizeUserProfile)
    
    return {
      success: true,
      data: normalizedData
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
 * 팔로워 목록 조회 - 🔥 데이터 정규화 추가
 */
export const getFollowersList = async (accountName: string): Promise<ApiResult<UserProfileResponse[]>> => {
  try {
    console.log('🔥 팔로워 목록 조회:', accountName)
    
    const response = await api.get<ApiResponse<any[]>>(`/follows/followers/${accountName}`)
    
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '팔로워 목록 조회에 실패했습니다.'
      }
    }
    
    // 🔥 데이터 정규화
    const normalizedData = (response.data.data || []).map(normalizeUserProfile)
    
    return {
      success: true,
      data: normalizedData
    }
  } catch (error) {
    console.error('Failed to get followers list:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

/**
 * 상호 팔로우 목록 조회 - 🔥 데이터 정규화 추가
 */
export const getMutualFollowsList = async (accountName: string): Promise<ApiResult<UserProfileResponse[]>> => {
  try {
    console.log('🔥 상호 팔로우 목록 조회:', accountName)
    
    const response = await api.get<ApiResponse<any[]>>(`/follows/mutual/${accountName}`)
    
    if (response.data.error) {
      return {
        success: false,
        error: response.data.message || '상호 팔로우 목록 조회에 실패했습니다.'
      }
    }
    
    // 🔥 데이터 정규화
    const normalizedData = (response.data.data || []).map(normalizeUserProfile)
    
    return {
      success: true,
      data: normalizedData
    }
  } catch (error) {
    console.error('Failed to get mutual follows list:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 🔥 고급 팔로우 함수들
// ============================================================================

/**
 * 낙관적 업데이트를 사용한 팔로우 토글
 */
export const toggleFollowOptimistic = async (
  accountName: string,
  currentlyFollowing: boolean,
  onOptimisticUpdate: (newState: boolean) => void,
  onRollback: (originalState: boolean) => void
): Promise<void> => {
  // 즉시 UI 업데이트
  const newState = !currentlyFollowing
  onOptimisticUpdate(newState)
  
  try {
    // 백엔드 API 호출
    if (currentlyFollowing) {
      const result = await unfollowUser(accountName)
      if (!result.success) {
        throw new Error(result.error)
      }
    } else {
      const result = await followUser(accountName)
      if (!result.success) {
        throw new Error(result.error)
      }
    }
  } catch (error) {
    // 실패 시 롤백
    onRollback(currentlyFollowing)
    throw error
  }
}

/**
 * 안전한 팔로우 토글 (서버 상태 확인 후 토글)
 */
export const safeToggleFollow = async (
  accountName: string,
  clientState: boolean
): Promise<{ success: boolean; newState: boolean; error?: string }> => {
  try {
    // 1. 서버에서 현재 상태 확인
    const statusResult = await checkFollowStatus(accountName)
    if (!statusResult.success) {
      return {
        success: false,
        newState: clientState,
        error: statusResult.error
      }
    }
    
    const serverState = statusResult.data || false
    
    // 2. 클라이언트와 서버 상태가 다르면 서버 상태를 우선
    const actualCurrentState = serverState
    
    // 3. 토글 실행
    if (actualCurrentState) {
      const result = await unfollowUser(accountName)
      return {
        success: result.success,
        newState: false,
        error: result.error
      }
    } else {
      const result = await followUser(accountName)
      return {
        success: result.success,
        newState: true,
        error: result.error
      }
    }
  } catch (error) {
    return {
      success: false,
      newState: clientState,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 🔥 배치 처리 함수들
// ============================================================================

/**
 * 여러 사용자의 팔로우 상태를 일괄 확인
 */
export const checkMultipleFollowStatus = async (accountNames: string[]): Promise<Record<string, boolean>> => {
  try {
    console.log('🔥 배치 팔로우 상태 확인:', accountNames)
    
    const results: Record<string, boolean> = {}
    
    const promises = accountNames.map(async (accountName) => {
      try {
        const result = await checkFollowStatus(accountName)
        return {
          accountName,
          isFollowing: result.success ? (result.data || false) : false
        }
      } catch (error) {
        return {
          accountName,
          isFollowing: false
        }
      }
    })
    
    const resolvedResults = await Promise.allSettled(promises)
    
    resolvedResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results[result.value.accountName] = result.value.isFollowing
      }
    })
    
    return results
  } catch (error) {
    console.error('Failed to check multiple follow status:', error)
    return {}
  }
}

/**
 * 여러 사용자의 팔로우 수를 일괄 조회
 */
export const getMultipleFollowCounts = async (accountNames: string[]): Promise<Record<string, FollowCountsResponse>> => {
  try {
    console.log('🔥 배치 팔로우 수 조회:', accountNames)
    
    const results: Record<string, FollowCountsResponse> = {}
    
    const promises = accountNames.map(async (accountName) => {
      try {
        const result = await getFollowCounts(accountName)
        return {
          accountName,
          counts: result.success && result.data ? result.data : { followerCount: 0, followingCount: 0 }
        }
      } catch (error) {
        return {
          accountName,
          counts: { followerCount: 0, followingCount: 0 }
        }
      }
    })
    
    const resolvedResults = await Promise.allSettled(promises)
    
    resolvedResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results[result.value.accountName] = result.value.counts
      }
    })
    
    return results
  } catch (error) {
    console.error('Failed to get multiple follow counts:', error)
    return {}
  }
}

/**
 * 팔로우 매트릭스 생성 (사용자들의 팔로우 관계 매트릭스)
 */
export const buildFollowMatrix = async (accountNames: string[]): Promise<Record<string, { isFollowing: boolean; followerCount: number; followingCount: number }>> => {
  try {
    console.log('🔥 팔로우 매트릭스 생성:', accountNames)
    
    const [followStatuses, followCounts] = await Promise.all([
      checkMultipleFollowStatus(accountNames),
      getMultipleFollowCounts(accountNames)
    ])
    
    const matrix: Record<string, { isFollowing: boolean; followerCount: number; followingCount: number }> = {}
    
    accountNames.forEach(accountName => {
      matrix[accountName] = {
        isFollowing: followStatuses[accountName] || false,
        followerCount: followCounts[accountName]?.followerCount || 0,
        followingCount: followCounts[accountName]?.followingCount || 0
      }
    })
    
    return matrix
  } catch (error) {
    console.error('Failed to build follow matrix:', error)
    return {}
  }
}

// ============================================================================
// 🔥 타입 exports
// ============================================================================

export type {
  ApiResponse,
  FollowCountsResponse,
  UserProfileResponse,
  ApiResult
}
// src/lib/api/follow.ts

import {
  BackendUserInfoResponse,
  BackendApiResponse,
  BackendFollowCountsResponse
} from '@/lib/types/feed'

import {
  getCurrentUser,
  handleApiError,
  fetchWithAuth
} from './feed'

// ============================================================================
// 백엔드 연동 타입들 (실제 백엔드 API에 맞춤)
// ============================================================================

// ✅ 백엔드 기반 사용자 프로필 (UserInfoResponse 확장)
export interface UserProfile {
  id: string
  username: string
  email: string
  avatar?: string
  prettyFace?: string  // ✅ 백엔드 UserInfoResponse에 있는 필드
  bio?: string
  feedsCount: number
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isFollowedBy: boolean
  joinedAt: string
}

// ============================================================================
// API 설정
// ============================================================================

const API_BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  return url.replace(/\/$/, '')
})()

const API_ENDPOINTS = {
  follows: '/follows',     // 팔로우 관계 관리
  users: '/users',         // 사용자 정보 (현재 백엔드에서 미지원)
} as const

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// ✅ 백엔드 UserInfoResponse를 UserProfile로 변환
const transformBackendUserToProfile = async (
  backendUser: BackendUserInfoResponse,
  userId: string,
  currentUserId?: string,
  followCounts?: BackendFollowCountsResponse
): Promise<UserProfile> => {
  try {
    // 팔로우 관계 확인 (자기 자신은 제외)
    const isFollowing = currentUserId && currentUserId !== userId 
      ? await checkFollowStatus(Number(userId)) 
      : false

    return {
      id: userId,
      username: backendUser.userName,
      email: backendUser.userEmail,
      avatar: backendUser.profileImage || undefined,
      prettyFace: backendUser.prettyFace || undefined,
      bio: '', // 백엔드에서 bio 필드 추가 필요
      feedsCount: 0, // 별도 API로 조회 필요
      followersCount: followCounts?.followerCount || 0,
      followingCount: followCounts?.followingCount || 0,
      isFollowing,
      isFollowedBy: false, // 역방향 팔로우 확인 API 없음
      joinedAt: new Date().toISOString() // 백엔드에서 가입일 필드 추가 필요
    }
  } catch (error) {
    console.error('Failed to transform user profile:', error)
    return {
      id: userId,
      username: backendUser.userName,
      email: backendUser.userEmail,
      avatar: backendUser.profileImage || undefined,
      prettyFace: backendUser.prettyFace || undefined,
      bio: '',
      feedsCount: 0,
      followersCount: followCounts?.followerCount || 0,
      followingCount: followCounts?.followingCount || 0,
      isFollowing: false,
      isFollowedBy: false,
      joinedAt: new Date().toISOString()
    }
  }
}

// ============================================================================
// 메인 API 함수들 (실제 백엔드 엔드포인트 기반)
// ============================================================================

// ✅ 사용자 팔로우 (POST /follows/{followeeId})
export const followUser = async (targetUserId: string): Promise<{
  success: boolean
  error?: string
}> => {
  try {
    if (!targetUserId?.trim()) {
      return {
        success: false,
        error: '유효하지 않은 사용자 ID입니다.'
      }
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: '로그인이 필요합니다.'
      }
    }

    if (currentUser.id === targetUserId) {
      return {
        success: false,
        error: '자기 자신을 팔로우할 수 없습니다.'
      }
    }

    // 이미 팔로우 중인지 확인
    const isAlreadyFollowing = await checkFollowStatus(Number(targetUserId))
    if (isAlreadyFollowing) {
      return {
        success: false,
        error: '이미 팔로우 중인 사용자입니다.'
      }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/${targetUserId}`, {
      method: 'POST'
    })

    const result: BackendApiResponse<null> = await response.json()

    if (result.error) {
      return {
        success: false,
        error: result.message || '팔로우 처리에 실패했습니다.'
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Failed to follow user:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 사용자 언팔로우 (DELETE /follows/{followeeId})
export const unfollowUser = async (targetUserId: string): Promise<{
  success: boolean
  error?: string
}> => {
  try {
    if (!targetUserId?.trim()) {
      return {
        success: false,
        error: '유효하지 않은 사용자 ID입니다.'
      }
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        success: false,
        error: '로그인이 필요합니다.'
      }
    }

    // 팔로우 중인지 확인
    const isFollowing = await checkFollowStatus(Number(targetUserId))
    if (!isFollowing) {
      return {
        success: false,
        error: '팔로우 관계를 찾을 수 없습니다.'
      }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/${targetUserId}`, {
      method: 'DELETE'
    })

    const result: BackendApiResponse<null> = await response.json()

    if (result.error) {
      return {
        success: false,
        error: result.message || '언팔로우 처리에 실패했습니다.'
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Failed to unfollow user:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로우 상태 확인 (GET /follows/check/{followeeId})
export const checkFollowStatus = async (followeeId: number): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/check/${followeeId}`)
    const result: BackendApiResponse<boolean> = await response.json()
    
    if (!result.error && typeof result.data === 'boolean') {
      return result.data
    }
    
    return false
  } catch (error) {
    console.error('Failed to check follow status:', error)
    return false
  }
}

// ✅ 팔로워 목록 조회 (GET /follows/followers/{userId})
export const getFollowers = async (
  userId: string
): Promise<{
  success: boolean
  data?: {
    users: UserProfile[]
    hasMore: boolean
    total: number
  }
  error?: string
}> => {
  try {
    if (!userId?.trim()) {
      return {
        success: false,
        error: '유효하지 않은 사용자 ID입니다.'
      }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/followers/${userId}`)
    const result: BackendApiResponse<BackendUserInfoResponse[]> = await response.json()

    if (result.error || !Array.isArray(result.data)) {
      return {
        success: false,
        error: result.message || '팔로워 목록을 불러오는데 실패했습니다.'
      }
    }

    const currentUser = await getCurrentUser()
    const users: UserProfile[] = []

    for (const userInfo of result.data) {
      // userId는 userEmail을 기반으로 추정 (실제로는 백엔드에서 userId 제공 필요)
      const userProfile = await transformBackendUserToProfile(
        userInfo,
        userInfo.userEmail, // 임시로 email을 ID로 사용
        currentUser?.id
      )
      users.push(userProfile)
    }

    return {
      success: true,
      data: {
        users,
        hasMore: false, // 백엔드에서 페이징 정보 없음
        total: users.length
      }
    }
  } catch (error) {
    console.error('Failed to get followers:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로잉 목록 조회 (GET /follows/following/{userId})
export const getFollowing = async (
  userId: string
): Promise<{
  success: boolean
  data?: {
    users: UserProfile[]
    hasMore: boolean
    total: number
  }
  error?: string
}> => {
  try {
    if (!userId?.trim()) {
      return {
        success: false,
        error: '유효하지 않은 사용자 ID입니다.'
      }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/following/${userId}`)
    const result: BackendApiResponse<BackendUserInfoResponse[]> = await response.json()

    if (result.error || !Array.isArray(result.data)) {
      return {
        success: false,
        error: result.message || '팔로잉 목록을 불러오는데 실패했습니다.'
      }
    }

    const currentUser = await getCurrentUser()
    const users: UserProfile[] = []

    for (const userInfo of result.data) {
      // userId는 userEmail을 기반으로 추정 (실제로는 백엔드에서 userId 제공 필요)
      const userProfile = await transformBackendUserToProfile(
        userInfo,
        userInfo.userEmail, // 임시로 email을 ID로 사용
        currentUser?.id
      )
      users.push(userProfile)
    }

    return {
      success: true,
      data: {
        users,
        hasMore: false, // 백엔드에서 페이징 정보 없음
        total: users.length
      }
    }
  } catch (error) {
    console.error('Failed to get following:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로우 통계 조회 (GET /follows/count/{userId})
export const getFollowStats = async (
  userId: string
): Promise<{
  success: boolean
  data?: {
    followersCount: number
    followingCount: number
  }
  error?: string
}> => {
  try {
    if (!userId?.trim()) {
      return {
        success: false,
        error: '유효하지 않은 사용자 ID입니다.'
      }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/count/${userId}`)
    const result: BackendApiResponse<BackendFollowCountsResponse> = await response.json()

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '팔로우 통계를 불러오는데 실패했습니다.'
      }
    }

    return {
      success: true,
      data: {
        followersCount: result.data.followerCount,
        followingCount: result.data.followingCount
      }
    }
  } catch (error) {
    console.error('Failed to get follow stats:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 편의 함수들
// ============================================================================

// ✅ 팔로우 토글 (팔로우/언팔로우 자동 전환)
export const toggleFollow = async (targetUserId: string): Promise<{
  success: boolean
  data?: { isFollowing: boolean }
  error?: string
}> => {
  try {
    const isCurrentlyFollowing = await checkFollowStatus(Number(targetUserId))
    
    let result
    if (isCurrentlyFollowing) {
      result = await unfollowUser(targetUserId)
    } else {
      result = await followUser(targetUserId)
    }

    if (!result.success) {
      return result
    }

    return {
      success: true,
      data: {
        isFollowing: !isCurrentlyFollowing
      }
    }
  } catch (error) {
    console.error('Failed to toggle follow:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 백엔드에서 현재 지원하지 않는 기능들
// ============================================================================

// ✅ 사용자 프로필 조회 (백엔드에 사용자 정보 API 없음)
export const getUserProfile = async (
  userId: string
): Promise<{
  success: boolean
  data?: UserProfile
  error?: string
}> => {
  return {
    success: false,
    error: '사용자 프로필 조회 API가 백엔드에서 지원되지 않습니다. /users/{userId} 엔드포인트가 필요합니다.'
  }
}

// ✅ 사용자 검색 (백엔드에 사용자 검색 API 없음)
export const searchUsers = async (
  query: string,
  cursor?: string,
  limit: number = 20
): Promise<{
  success: boolean
  data?: {
    users: UserProfile[]
    hasMore: boolean
    nextCursor?: string
    total: number
  }
  error?: string
}> => {
  return {
    success: false,
    error: '사용자 검색 API가 백엔드에서 지원되지 않습니다. /users/search 엔드포인트가 필요합니다.'
  }
}

// ✅ 추천 사용자 조회 (백엔드에 추천 API 없음)
export const getRecommendedUsers = async (
  limit: number = 10
): Promise<{
  success: boolean
  data?: UserProfile[]
  error?: string
}> => {
  return {
    success: false,
    error: '추천 사용자 API가 백엔드에서 지원되지 않습니다. /users/recommended 엔드포인트가 필요합니다.'
  }
}

// ✅ 나를 팔로우하는지 확인 (백엔드에 역방향 확인 API 없음)
export const checkIfFollowedBy = async (followerId: number): Promise<boolean> => {
  console.warn('checkIfFollowedBy: 역방향 팔로우 확인 API가 백엔드에서 지원되지 않습니다.')
  return false
}

// ✅ 상호 팔로우 확인 (역방향 API 없음으로 제한적 지원)
export const checkMutualFollow = async (userId: string): Promise<{
  success: boolean
  data?: {
    isFollowing: boolean
    isFollowedBy: boolean
    isMutual: boolean
  }
  error?: string
}> => {
  try {
    const isFollowing = await checkFollowStatus(Number(userId))
    
    return {
      success: true,
      data: {
        isFollowing,
        isFollowedBy: false, // 역방향 API 없음
        isMutual: false // 역방향 확인 불가로 항상 false
      }
    }
  } catch (error) {
    console.error('Failed to check mutual follow:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 호환성을 위한 레거시 함수들
// ============================================================================

// ✅ 기존 코드 호환성을 위한 함수들 (간단한 래퍼)
export const getFollowersLegacy = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ users: UserProfile[], hasMore: boolean, total: number }> => {
  const result = await getFollowers(userId)
  
  if (!result.success || !result.data) {
    return {
      users: [],
      hasMore: false,
      total: 0
    }
  }
  
  return {
    users: result.data.users,
    hasMore: result.data.hasMore,
    total: result.data.total
  }
}

export const getFollowingLegacy = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ users: UserProfile[], hasMore: boolean, total: number }> => {
  const result = await getFollowing(userId)
  
  if (!result.success || !result.data) {
    return {
      users: [],
      hasMore: false,
      total: 0
    }
  }
  
  return {
    users: result.data.users,
    hasMore: result.data.hasMore,
    total: result.data.total
  }
}

export const searchUsersLegacy = async (
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ users: UserProfile[], hasMore: boolean, total: number }> => {
  console.warn('searchUsersLegacy: 사용자 검색이 백엔드에서 지원되지 않습니다.')
  return {
    users: [],
    hasMore: false,
    total: 0
  }
}

export const getRecommendedUsersLegacy = async (
  limit: number = 10
): Promise<UserProfile[]> => {
  console.warn('getRecommendedUsersLegacy: 추천 사용자가 백엔드에서 지원되지 않습니다.')
  return []
}

export const getUserProfileLegacy = async (
  userId: string,
  viewerUserId?: string
): Promise<UserProfile | null> => {
  console.warn('getUserProfileLegacy: 사용자 프로필 조회가 백엔드에서 지원되지 않습니다.')
  return null
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

export const isUserProfile = (item: any): item is UserProfile => {
  return item && typeof item === 'object' && 'id' in item && 'username' in item
}

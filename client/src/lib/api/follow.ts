// src/lib/api/follow.ts

import {
  BackendApiResponse,
  BackendFollowCountsResponse
} from '@/lib/types/feed'

import {
  getCurrentUser,
  handleApiError,
  fetchWithAuth
} from './feed'

// 🔥 explore.ts의 searchUsers 재활용
import { 
  searchUsers as searchUsersFromExplore,
  BackendUserProfileResponse  // 🔥 새로운 타입 import
} from './explore'

// ============================================================================
// 타입 정의
// ============================================================================

export interface UserProfile {
  id: string          // accountName
  username: string    // 표시 이름
  email: string
  avatar?: string
  prettyFace?: string
  bio?: string
  feedsCount: number
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isFollowedBy: boolean
  joinedAt: string
}

// ============================================================================
// API 엔드포인트
// ============================================================================

const API_ENDPOINTS = {
  follows: '/follows',
  users: '/users'
} as const

// ============================================================================
// 유틸 - Backend → UserProfile 변환 (UserProfileResponse 사용)
// ============================================================================

const transformBackendUserToProfile = async (
  backendUser: BackendUserProfileResponse,  // 🔥 수정: UserProfileResponse 사용
  currentAccountName?: string,
  followCounts?: BackendFollowCountsResponse
): Promise<UserProfile> => {
  try {
    const isFollowing =
      currentAccountName && currentAccountName !== backendUser.accountName
        ? await checkFollowStatusByAccountName(backendUser.accountName)
        : false

    return {
      id: backendUser.accountName,
      username: backendUser.userName,
      email: backendUser.userEmail,
      avatar: backendUser.userProfileImage || undefined,
      prettyFace: backendUser.faceImageUrl || undefined,
      bio: '',
      feedsCount: 0,
      followersCount: followCounts?.followerCount || 0,
      followingCount: followCounts?.followingCount || 0,
      isFollowing,
      isFollowedBy: false,
      joinedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to transform user profile:', error)
    return {
      id: backendUser.accountName,
      username: backendUser.userName,
      email: backendUser.userEmail,
      avatar: backendUser.userProfileImage || undefined,
      prettyFace: backendUser.faceImageUrl || undefined,
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
// accountName 기반 API
// ============================================================================

// 🔍 팔로우 상태 확인
export const checkFollowStatusByAccountName = async (accountName: string): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(
      `${API_ENDPOINTS.follows}/check/${accountName}`
    )
    const result: BackendApiResponse<boolean> = await response.json()

    if (!result.error && typeof result.data === 'boolean') {
      return result.data
    }
    return false
  } catch (error) {
    console.error('Failed to check follow status by account name:', error)
    return false
  }
}

// ➕ 팔로우
export const followUser = async (targetAccountName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!targetAccountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: '로그인이 필요합니다.' }
    }
    if (currentUser.accountName === targetAccountName) {
      return { success: false, error: '자기 자신을 팔로우할 수 없습니다.' }
    }

    const isAlreadyFollowing = await checkFollowStatusByAccountName(targetAccountName)
    if (isAlreadyFollowing) {
      return { success: false, error: '이미 팔로우 중인 사용자입니다.' }
    }

    const response = await fetchWithAuth(
      `${API_ENDPOINTS.follows}/${targetAccountName}`,  // ✅ 올바른 경로
      { method: 'POST' }
    )
    const result: BackendApiResponse<null> = await response.json()

    if (result.error) {
      return { success: false, error: result.message || '팔로우 처리에 실패했습니다.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to follow user:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ➖ 언팔로우
export const unfollowUser = async (targetAccountName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!targetAccountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const isFollowing = await checkFollowStatusByAccountName(targetAccountName)
    if (!isFollowing) {
      return { success: false, error: '팔로우 관계를 찾을 수 없습니다.' }
    }

    const response = await fetchWithAuth(
      `${API_ENDPOINTS.follows}/${targetAccountName}`,  // ✅ 올바른 경로
      { method: 'DELETE' }
    )
    const result: BackendApiResponse<null> = await response.json()

    if (result.error) {
      return { success: false, error: result.message || '언팔로우 처리에 실패했습니다.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to unfollow user:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// 🔄 팔로우 토글
export const toggleFollow = async (targetAccountName: string): Promise<{ success: boolean; data?: { isFollowing: boolean }; error?: string }> => {
  try {
    const isCurrentlyFollowing = await checkFollowStatusByAccountName(targetAccountName)

    let result
    if (isCurrentlyFollowing) {
      result = await unfollowUser(targetAccountName)
    } else {
      result = await followUser(targetAccountName)
    }

    if (!result.success) {
      return result
    }

    return { success: true, data: { isFollowing: !isCurrentlyFollowing } }
  } catch (error) {
    console.error('Failed to toggle follow:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ============================================================================
// 목록 조회 계정명 기반 (UserProfileResponse 사용)
// ============================================================================

export const getFollowers = async (accountName: string) => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/followers/${accountName}`)
    const result: BackendApiResponse<BackendUserProfileResponse[]> = await response.json()  // 🔥 수정

    if (result.error || !Array.isArray(result.data)) {
      return { success: false, error: result.message || '팔로워 목록 조회 실패' }
    }

    const currentUser = await getCurrentUser()
    const users: UserProfile[] = []

    for (const userInfo of result.data) {
      const userProfile = await transformBackendUserToProfile(
        userInfo,
        currentUser?.accountName
      )
      users.push(userProfile)
    }

    return { success: true, data: { users, hasMore: false, total: users.length } }
  } catch (error) {
    console.error('Failed to get followers:', error)
    return { success: false, error: handleApiError(error) }
  }
}

export const getFollowing = async (accountName: string) => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/following/${accountName}`)
    const result: BackendApiResponse<BackendUserProfileResponse[]> = await response.json()  // 🔥 수정

    if (result.error || !Array.isArray(result.data)) {
      return { success: false, error: result.message || '팔로잉 목록 조회 실패' }
    }

    const currentUser = await getCurrentUser()
    const users: UserProfile[] = []

    for (const userInfo of result.data) {
      const userProfile = await transformBackendUserToProfile(
        userInfo,
        currentUser?.accountName
      )
      users.push(userProfile)
    }

    return { success: true, data: { users, hasMore: false, total: users.length } }
  } catch (error) {
    console.error('Failed to get following:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// 📊 팔로우 통계
export const getFollowStats = async (accountName: string) => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/count/${accountName}`)
    const result: BackendApiResponse<BackendFollowCountsResponse> = await response.json()

    if (result.error || !result.data) {
      return { success: false, error: result.message || '팔로우 통계 조회 실패' }
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
    return { success: false, error: handleApiError(error) }
  }
}

// ============================================================================
// 검색 - explore.ts 재활용
// ============================================================================

export const searchUsers = async (query: string, cursor?: string, limit = 20) => {
  return await searchUsersFromExplore(query, cursor, limit)
}
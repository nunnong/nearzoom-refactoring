// src/lib/api/follow.ts
import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/constants/api'
import {
  BackendApiResponse,
  BackendFollowCountsResponse,
  BackendUserInfoResponse
} from '@/lib/types/feed'

import { getCurrentUser, handleApiError } from './feed'

// ============================================================================
// 타입 정의 (내부용 - export 하지 않음)
// ============================================================================

// 🔥 백엔드 ApiResponse 타입 (feed.ts와 통일)
type ApiResponse<T> = BackendApiResponse<T>

// 🔥 내부 전용 타입 (export 제거)
interface UserProfile {
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
// 유틸 - Backend → UserProfile 변환
// ============================================================================

const transformBackendUserToProfile = async (
  backendUser: BackendUserInfoResponse,
  currentAccountName?: string,
  followCounts?: BackendFollowCountsResponse
): Promise<UserProfile> => {
  try {
    // 이메일에서 accountName 추출 (@ 앞부분)
    const accountName = backendUser.userEmail.split('@')[0]
    
    const isFollowing =
      currentAccountName && currentAccountName !== accountName
        ? await checkFollowStatusByAccountName(accountName)
        : false

    return {
      id: accountName,
      username: backendUser.userName,
      email: backendUser.userEmail,
      avatar: backendUser.profileImage || undefined,
      prettyFace: backendUser.prettyFace || undefined,
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
    const accountName = backendUser.userEmail.split('@')[0]
    return {
      id: accountName,
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
// accountName → userId 변환 헬퍼 (백엔드는 userId 사용)
// ============================================================================

const getAccountNameToUserIdMap = async (accountName: string): Promise<number | null> => {
  try {
    // 🔥 피드 검색 API를 활용해서 accountName으로 userId 찾기
    const response = await api.get<ApiResponse<any[]>>(`${API_ENDPOINTS.SEARCH_FEEDS}`, {
      params: { query: accountName, size: 1 }
    })
    
    const result = response.data
    if (!result.error && Array.isArray(result.data) && result.data.length > 0) {
      return result.data[0].authorId  // userId 반환
    }
    
    return null
  } catch (error) {
    console.error('Failed to get userId from accountName:', error)
    return null
  }
}

// ============================================================================
// 팔로우 상태 확인 (GET /follows/check/{followeeId})
// ============================================================================

export const checkFollowStatusByAccountName = async (accountName: string): Promise<boolean> => {
  try {
    console.log('=== 팔로우 상태 확인 API 호출 ===', accountName)
    
    // accountName으로 userId 찾기
    const userId = await getAccountNameToUserIdMap(accountName)
    if (!userId) {
      console.warn('사용자를 찾을 수 없음:', accountName)
      return false
    }

    const response = await api.get<ApiResponse<boolean>>(`${API_ENDPOINTS.FOLLOW_CHECK}/${userId}`)
    const result = response.data

    if (!result.error) {
      return result.data ?? false
    }
    return false
  } catch (error) {
    console.error('Failed to check follow status by account name:', error)
    return false
  }
}

// ============================================================================
// 팔로우 (POST /follows/{followeeId})
// ============================================================================

export const followUser = async (targetAccountName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!targetAccountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 팔로우 API 호출 ===', targetAccountName)

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: '로그인이 필요합니다.' }
    }
    if (currentUser.accountName === targetAccountName) {
      return { success: false, error: '자기 자신을 팔로우할 수 없습니다.' }
    }

    // accountName으로 userId 찾기
    const userId = await getAccountNameToUserIdMap(targetAccountName)
    if (!userId) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const isAlreadyFollowing = await checkFollowStatusByAccountName(targetAccountName)
    if (isAlreadyFollowing) {
      return { success: false, error: '이미 팔로우 중인 사용자입니다.' }
    }

    const response = await api.post<ApiResponse<void>>(`${API_ENDPOINTS.FOLLOWS}/${userId}`)
    const result = response.data

    if (!result.error) {
      return { success: true }
    }

    return { success: false, error: result.message || '팔로우 처리에 실패했습니다.' }
  } catch (error) {
    console.error('Failed to follow user:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ============================================================================
// 언팔로우 (DELETE /follows/{followeeId})
// ============================================================================

export const unfollowUser = async (targetAccountName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!targetAccountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 언팔로우 API 호출 ===', targetAccountName)

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // accountName으로 userId 찾기
    const userId = await getAccountNameToUserIdMap(targetAccountName)
    if (!userId) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const isFollowing = await checkFollowStatusByAccountName(targetAccountName)
    if (!isFollowing) {
      return { success: false, error: '팔로우 관계를 찾을 수 없습니다.' }
    }

    const response = await api.delete<ApiResponse<void>>(`${API_ENDPOINTS.FOLLOWS}/${userId}`)
    const result = response.data

    if (!result.error) {
      return { success: true }
    }

    return { success: false, error: result.message || '언팔로우 처리에 실패했습니다.' }
  } catch (error) {
    console.error('Failed to unfollow user:', error)
    return { success: false, error: handleApiError(error) }
  }
}

// ============================================================================
// 팔로우 토글
// ============================================================================

export const toggleFollow = async (targetAccountName: string): Promise<{ success: boolean; data?: { isFollowing: boolean }; error?: string }> => {
  try {
    console.log('=== 팔로우 토글 API 호출 ===', targetAccountName)
    
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
// 팔로워 목록 조회 (GET /follows/followers/{userId})
// ============================================================================

export const getFollowers = async (accountName: string) => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 팔로워 목록 조회 API 호출 ===', accountName)

    // accountName으로 userId 찾기
    const userId = await getAccountNameToUserIdMap(accountName)
    if (!userId) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const response = await api.get<ApiResponse<BackendUserInfoResponse[]>>(`${API_ENDPOINTS.FOLLOW_FOLLOWERS}/${userId}`)
    const result = response.data

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

// ============================================================================
// 팔로잉 목록 조회 (GET /follows/following/{userId})
// ============================================================================

export const getFollowing = async (accountName: string) => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 팔로잉 목록 조회 API 호출 ===', accountName)

    // accountName으로 userId 찾기
    const userId = await getAccountNameToUserIdMap(accountName)
    if (!userId) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const response = await api.get<ApiResponse<BackendUserInfoResponse[]>>(`${API_ENDPOINTS.FOLLOW_FOLLOWING}/${userId}`)
    const result = response.data

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

// ============================================================================
// 팔로우 통계 조회 (GET /follows/count/{userId})
// ============================================================================

export const getFollowStats = async (accountName: string) => {
  try {
    if (!accountName?.trim()) {
      return { success: false, error: '유효하지 않은 계정명입니다.' }
    }

    console.log('=== 팔로우 통계 조회 API 호출 ===', accountName)

    // accountName으로 userId 찾기
    const userId = await getAccountNameToUserIdMap(accountName)
    if (!userId) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const response = await api.get<ApiResponse<BackendFollowCountsResponse>>(`${API_ENDPOINTS.FOLLOW_COUNT}/${userId}`)
    const result = response.data

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
// 사용자 검색 (GET /feeds/search - accountName 기반)
// ============================================================================

export const searchUsers = async (
  query: string, 
  cursor?: string, 
  limit = 20
): Promise<{ 
  success: boolean; 
  data?: { 
    users: UserProfile[]; 
    hasMore: boolean; 
    total: number 
  }; 
  error?: string 
}> => {
  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: { users: [], hasMore: false, total: 0 }
      }
    }

    console.log('=== 사용자 검색 API 호출 ===', { query, limit })

    const params = {
      query: query.trim(),
      size: limit
    }

    const response = await api.get<ApiResponse<any[]>>(`${API_ENDPOINTS.SEARCH_FEEDS}`, { params })
    const result = response.data
    
    if (!result.error && Array.isArray(result.data)) {
      const currentUser = await getCurrentUser()
      const users: UserProfile[] = []

      // 중복 제거를 위한 Set
      const processedAccountNames = new Set<string>()

      for (const feedData of result.data) {
        const accountName = feedData.accountName
        
        // 중복 체크
        if (processedAccountNames.has(accountName)) {
          continue
        }
        processedAccountNames.add(accountName)

        // BackendUserInfoResponse 형태로 변환
        const userInfo: BackendUserInfoResponse = {
          userName: feedData.accountName,
          userEmail: `${accountName}@example.com`, // 임시 이메일
          profileImage: feedData.profileImage,
          prettyFace: ''
        }

        const userProfile = await transformBackendUserToProfile(
          userInfo,
          currentUser?.accountName
        )
        users.push(userProfile)
      }
      
      return {
        success: true,
        data: {
          users,
          hasMore: false,
          total: users.length
        }
      }
    }

    return {
      success: false,
      error: result.message || '사용자 검색에 실패했습니다.'
    }
  } catch (error) {
    console.error('Failed to search users:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ============================================================================
// 타입 내보내기 (제거 - 충돌 방지)
// ============================================================================

// export type 제거 - 내부에서만 사용
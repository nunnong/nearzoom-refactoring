// src/lib/api/follow.ts

import {
  BackendUserInfoResponse,
  BackendApiResponse
} from '@/lib/types/feed'

import {
  getCurrentUser,
  handleApiError,
  fetchWithAuth
} from './feed'

// ============================================================================
// 백엔드 연동 타입들
// ============================================================================

// ✅ 백엔드 기반 사용자 프로필 (UserInfoResponse 확장)
export interface UserProfile {
  id: string
  username: string
  email: string
  avatar?: string
  bio?: string
  feedsCount: number
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isFollowedBy: boolean
  joinedAt: string
}

// ✅ 백엔드 팔로우 관계 응답
export interface BackendFollowResponse {
  followerId: number
  followeeId: number
  createdAt: string
}

// ✅ 백엔드 팔로우 통계 응답
export interface BackendFollowStatsResponse {
  userId: number
  followersCount: number
  followingCount: number
}

// ✅ 백엔드 사용자 검색 응답
export interface BackendUserSearchResponse {
  users: {
    userId: number
    userInfo: BackendUserInfoResponse
    followStats?: BackendFollowStatsResponse
  }[]
  hasMore: boolean
  nextCursor?: number
  total: number
}

// ============================================================================
// API 설정
// ============================================================================

const API_BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  return url.replace(/\/$/, '')
})()

const API_ENDPOINTS = {
  follows: '/follows',              // 팔로우 관계 관리
  users: '/users',                  // 사용자 정보
  search: '/users/search',          // 사용자 검색
  recommended: '/users/recommended' // 추천 사용자
} as const

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// ✅ nextCursor 변환 유틸리티
const convertCursorToString = (cursor: number | string | null | undefined): string | undefined => {
  if (cursor === null || cursor === undefined) {
    return undefined
  }
  return cursor.toString()
}

// ✅ 백엔드 UserInfoResponse를 UserProfile로 변환
const transformBackendUserToProfile = async (
  backendUser: BackendUserInfoResponse,
  userId: string,
  currentUserId?: string,
  followStats?: BackendFollowStatsResponse
): Promise<UserProfile> => {
  try {
    // 팔로우 관계 확인
    const [isFollowing, isFollowedBy] = await Promise.all([
      currentUserId && currentUserId !== userId ? checkFollowStatus(Number(userId)) : Promise.resolve(false),
      currentUserId && currentUserId !== userId ? checkIfFollowedBy(Number(userId)) : Promise.resolve(false)
    ])

    return {
      id: userId,
      username: backendUser.userName,
      email: backendUser.userEmail,
      avatar: backendUser.userProfileImage || undefined,
      bio: '', // 백엔드에서 bio 필드 추가 필요
      feedsCount: 0, // 별도 API로 조회 필요
      followersCount: followStats?.followersCount || 0,
      followingCount: followStats?.followingCount || 0,
      isFollowing,
      isFollowedBy,
      joinedAt: new Date().toISOString() // 백엔드에서 가입일 필드 추가 필요
    }
  } catch (error) {
    console.error('Failed to transform user profile:', error)
    return {
      id: userId,
      username: backendUser.userName,
      email: backendUser.userEmail,
      avatar: backendUser.userProfileImage || undefined,
      bio: '',
      feedsCount: 0,
      followersCount: followStats?.followersCount || 0,
      followingCount: followStats?.followingCount || 0,
      isFollowing: false,
      isFollowedBy: false,
      joinedAt: new Date().toISOString()
    }
  }
}

// ============================================================================
// 메인 API 함수들
// ============================================================================

// ✅ 사용자 팔로우
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

    const result: BackendApiResponse<BackendFollowResponse> = await response.json()

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

// ✅ 사용자 언팔로우
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

// ✅ 팔로우 상태 확인
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

// ✅ 나를 팔로우하는지 확인
export const checkIfFollowedBy = async (followerId: number): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/check-reverse/${followerId}`)
    const result: BackendApiResponse<boolean> = await response.json()
    
    if (!result.error && typeof result.data === 'boolean') {
      return result.data
    }
    
    return false
  } catch (error) {
    console.error('Failed to check if followed by:', error)
    return false
  }
}

// ✅ 팔로워 목록 조회
export const getFollowers = async (
  userId: string,
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
  try {
    if (!userId?.trim()) {
      return {
        success: false,
        error: '유효하지 않은 사용자 ID입니다.'
      }
    }

    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())

    const url = `${API_ENDPOINTS.follows}/followers/${userId}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendUserSearchResponse> = await response.json()

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '팔로워 목록을 불러오는데 실패했습니다.'
      }
    }

    const currentUser = await getCurrentUser()
    const users: UserProfile[] = []

    for (const { userId: followerId, userInfo, followStats } of result.data.users) {
      const userProfile = await transformBackendUserToProfile(
        userInfo,
        followerId.toString(),
        currentUser?.id,
        followStats
      )
      users.push(userProfile)
    }

    return {
      success: true,
      data: {
        users,
        hasMore: result.data.hasMore,
        nextCursor: convertCursorToString(result.data.nextCursor),
        total: result.data.total
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

// ✅ 팔로잉 목록 조회
export const getFollowing = async (
  userId: string,
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
  try {
    if (!userId?.trim()) {
      return {
        success: false,
        error: '유효하지 않은 사용자 ID입니다.'
      }
    }

    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())

    const url = `${API_ENDPOINTS.follows}/following/${userId}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendUserSearchResponse> = await response.json()

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '팔로잉 목록을 불러오는데 실패했습니다.'
      }
    }

    const currentUser = await getCurrentUser()
    const users: UserProfile[] = []

    for (const { userId: followingId, userInfo, followStats } of result.data.users) {
      const userProfile = await transformBackendUserToProfile(
        userInfo,
        followingId.toString(),
        currentUser?.id,
        followStats
      )
      users.push(userProfile)
    }

    return {
      success: true,
      data: {
        users,
        hasMore: result.data.hasMore,
        nextCursor: convertCursorToString(result.data.nextCursor),
        total: result.data.total
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

// ✅ 사용자 프로필 조회
export const getUserProfile = async (
  userId: string
): Promise<{
  success: boolean
  data?: UserProfile
  error?: string
}> => {
  try {
    if (!userId?.trim()) {
      return {
        success: false,
        error: '유효하지 않은 사용자 ID입니다.'
      }
    }

    const response = await fetchWithAuth(`${API_ENDPOINTS.users}/${userId}`)
    const result: BackendApiResponse<BackendUserInfoResponse> = await response.json()

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '사용자 정보를 찾을 수 없습니다.'
      }
    }

    // 팔로우 통계 조회
    const statsResponse = await fetchWithAuth(`${API_ENDPOINTS.follows}/stats/${userId}`)
    const statsResult: BackendApiResponse<BackendFollowStatsResponse> = await statsResponse.json()

    const currentUser = await getCurrentUser()
    const userProfile = await transformBackendUserToProfile(
      result.data,
      userId,
      currentUser?.id,
      statsResult.data || undefined
    )

    return {
      success: true,
      data: userProfile
    }
  } catch (error) {
    console.error('Failed to get user profile:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 사용자 검색
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
  try {
    if (!query?.trim()) {
      return {
        success: true,
        data: {
          users: [],
          hasMore: false,
          nextCursor: undefined,
          total: 0
        }
      }
    }

    const params = new URLSearchParams()
    params.append('q', query.trim())
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())

    const url = `${API_ENDPOINTS.search}?${params.toString()}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendUserSearchResponse> = await response.json()

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '사용자 검색에 실패했습니다.'
      }
    }

    const currentUser = await getCurrentUser()
    const users: UserProfile[] = []

    for (const { userId, userInfo, followStats } of result.data.users) {
      const userProfile = await transformBackendUserToProfile(
        userInfo,
        userId.toString(),
        currentUser?.id,
        followStats
      )
      users.push(userProfile)
    }

    return {
      success: true,
      data: {
        users,
        hasMore: result.data.hasMore,
        nextCursor: convertCursorToString(result.data.nextCursor),
        total: result.data.total
      }
    }
  } catch (error) {
    console.error('Failed to search users:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 추천 사용자 조회
export const getRecommendedUsers = async (
  limit: number = 10
): Promise<{
  success: boolean
  data?: UserProfile[]
  error?: string
}> => {
  try {
    if (limit < 1 || limit > 50) {
      return {
        success: false,
        error: '유효하지 않은 제한 수입니다. (1-50)'
      }
    }

    const url = `${API_ENDPOINTS.recommended}?limit=${limit}`
    const response = await fetchWithAuth(url)
    const result: BackendApiResponse<BackendUserSearchResponse> = await response.json()

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '추천 사용자를 불러오는데 실패했습니다.'
      }
    }

    const currentUser = await getCurrentUser()
    const users: UserProfile[] = []

    for (const { userId, userInfo, followStats } of result.data.users) {
      const userProfile = await transformBackendUserToProfile(
        userInfo,
        userId.toString(),
        currentUser?.id,
        followStats
      )
      users.push(userProfile)
    }

    return {
      success: true,
      data: users
    }
  } catch (error) {
    console.error('Failed to get recommended users:', error)
    return {
      success: false,
      error: handleApiError(error)
    }
  }
}

// ✅ 팔로우 통계 조회
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

    const response = await fetchWithAuth(`${API_ENDPOINTS.follows}/stats/${userId}`)
    const result: BackendApiResponse<BackendFollowStatsResponse> = await response.json()

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.message || '팔로우 통계를 불러오는데 실패했습니다.'
      }
    }

    return {
      success: true,
      data: {
        followersCount: result.data.followersCount,
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

// ✅ 상호 팔로우 확인
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
    const [isFollowing, isFollowedBy] = await Promise.all([
      checkFollowStatus(Number(userId)),
      checkIfFollowedBy(Number(userId))
    ])

    return {
      success: true,
      data: {
        isFollowing,
        isFollowedBy,
        isMutual: isFollowing && isFollowedBy
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
// 호환성을 위한 레거시 함수들 (deprecated)
// ============================================================================

// ✅ 기존 코드 호환성을 위한 함수들 (간단한 래퍼)
export const getFollowersLegacy = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ users: UserProfile[], hasMore: boolean, total: number }> => {
  const result = await getFollowers(userId, undefined, limit)
  
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
  const result = await getFollowing(userId, undefined, limit)
  
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
  const result = await searchUsers(query, undefined, limit)
  
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

export const getRecommendedUsersLegacy = async (
  limit: number = 10
): Promise<UserProfile[]> => {
  const result = await getRecommendedUsers(limit)
  return result.data || []
}

export const getUserProfileLegacy = async (
  userId: string,
  viewerUserId?: string
): Promise<UserProfile | null> => {
  const result = await getUserProfile(userId)
  return result.data || null
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

export const isUserProfile = (item: any): item is UserProfile => {
  return item && typeof item === 'object' && 'id' in item && 'username' in item
}

// ============================================================================
// 개발용 함수들 (더 이상 사용되지 않음)
// ============================================================================

/**
 * @deprecated 백엔드 연동으로 더미 데이터가 필요하지 않습니다.
 */
export const initializeDummyUsers = (): void => {
  console.warn('initializeDummyUsers는 더 이상 사용되지 않습니다. 백엔드에서 실제 데이터를 제공합니다.')
}

/**
 * @deprecated 백엔드 연동으로 로컬 사용자 설정이 필요하지 않습니다.
 */
export const setCurrentUser = (userId: string): void => {
  console.warn('setCurrentUser는 더 이상 사용되지 않습니다. 인증 토큰을 통해 사용자를 식별합니다.')
}

/**
 * @deprecated 백엔드 연동으로 로컬 데이터 초기화가 필요하지 않습니다.
 */
export const clearAllData = (): void => {
  console.warn('clearAllData는 더 이상 사용되지 않습니다. 백엔드 데이터를 사용합니다.')
}
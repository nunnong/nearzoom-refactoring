// src/lib/api/follow.ts

export interface UserProfile {
  id: string
  username: string
  displayName: string
  avatar: string
  bio?: string
  feedCount: number
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isFollowedBy: boolean
  joinedAt: string
}

export interface FollowRelation {
  followerId: string
  followingId: string
  createdAt: string
}

// 상수 관리
const STORAGE_KEYS = {
  FOLLOW_RELATIONS: 'follow_relations',
  USER_PROFILES: 'user_profiles',
  CURRENT_USER_ID: 'current_user_id'
} as const

const DEFAULT_USERNAMES = [
  'photo_lover', 
  'creative_artist', 
  'memory_keeper', 
  'visual_storyteller', 
  'snapshot_master'
] as const

const DEFAULT_USER_BIOS = [
  '안녕하세요! 사진을 좋아하는 사용자입니다.',
  '창작과 예술을 사랑하는 아티스트 🎨',
  '소중한 순간들을 기록하고 보관해요 💝',
  '일상의 아름다운 순간을 담아요 📸',
  '시각적 이야기꾼입니다 ✨'
] as const

// 커스텀 에러 클래스
class FollowApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'FollowApiError'
  }
}

// Storage 유틸리티 (SSR 안전)
class SafeStorage {
  private static isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  }

  static getItem(key: string): string | null {
    if (!this.isClient()) return null
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error(`Failed to get item from storage: ${key}`, error)
      return null
    }
  }

  static setItem(key: string, value: string): void {
    if (!this.isClient()) return
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error(`Failed to set item in storage: ${key}`, error)
      throw new FollowApiError('스토리지 저장에 실패했습니다.')
    }
  }

  static removeItem(key: string): void {
    if (!this.isClient()) return
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove item from storage: ${key}`, error)
    }
  }
}

// 현재 사용자 ID 가져오기
const getCurrentUserId = (): string => {
  return SafeStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'user_1'
}

// 사용자 팔로우
export const followUser = async (targetUserId: string): Promise<void> => {
  if (!targetUserId?.trim()) {
    throw new FollowApiError('유효하지 않은 사용자 ID입니다.', 'INVALID_USER_ID')
  }

  try {
    const currentUserId = getCurrentUserId()
    
    if (currentUserId === targetUserId) {
      throw new FollowApiError('자기 자신을 팔로우할 수 없습니다.', 'SELF_FOLLOW')
    }

    const relations = getFollowRelations()
    const existingRelation = relations.find(
      r => r.followerId === currentUserId && r.followingId === targetUserId
    )

    if (existingRelation) {
      throw new FollowApiError('이미 팔로우 중인 사용자입니다.', 'ALREADY_FOLLOWING')
    }

    // 새 팔로우 관계 추가
    const newRelation: FollowRelation = {
      followerId: currentUserId,
      followingId: targetUserId,
      createdAt: new Date().toISOString()
    }

    relations.push(newRelation)
    saveFollowRelations(relations)

    // 팔로우/팔로워 수 업데이트
    await updateUserFollowCounts(currentUserId, targetUserId, 'follow')

    // 시뮬레이션된 지연
    await simulateNetworkDelay(200)
  } catch (error) {
    if (error instanceof FollowApiError) {
      throw error
    }
    console.error('Failed to follow user:', error)
    throw new FollowApiError('팔로우 처리 중 오류가 발생했습니다.')
  }
}

// 사용자 언팔로우
export const unfollowUser = async (targetUserId: string): Promise<void> => {
  if (!targetUserId?.trim()) {
    throw new FollowApiError('유효하지 않은 사용자 ID입니다.', 'INVALID_USER_ID')
  }

  try {
    const currentUserId = getCurrentUserId()
    const relations = getFollowRelations()
    
    const relationIndex = relations.findIndex(
      r => r.followerId === currentUserId && r.followingId === targetUserId
    )

    if (relationIndex === -1) {
      throw new FollowApiError('팔로우 관계를 찾을 수 없습니다.', 'RELATION_NOT_FOUND')
    }

    // 팔로우 관계 제거
    relations.splice(relationIndex, 1)
    saveFollowRelations(relations)

    // 팔로우/팔로워 수 업데이트
    await updateUserFollowCounts(currentUserId, targetUserId, 'unfollow')

    // 시뮬레이션된 지연
    await simulateNetworkDelay(200)
  } catch (error) {
    if (error instanceof FollowApiError) {
      throw error
    }
    console.error('Failed to unfollow user:', error)
    throw new FollowApiError('언팔로우 처리 중 오류가 발생했습니다.')
  }
}

// 팔로워 목록 가져오기
export const getFollowers = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ users: UserProfile[], hasMore: boolean, total: number }> => {
  if (!userId?.trim()) {
    throw new FollowApiError('유효하지 않은 사용자 ID입니다.', 'INVALID_USER_ID')
  }

  if (page < 1 || limit < 1 || limit > 100) {
    throw new FollowApiError('유효하지 않은 페이지 매개변수입니다.', 'INVALID_PAGINATION')
  }

  try {
    const relations = getFollowRelations()
    const currentUserId = getCurrentUserId()
    
    // 해당 사용자를 팔로우하는 사용자들의 ID
    const followerRelations = relations
      .filter(r => r.followingId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const followerIds = followerRelations.map(r => r.followerId)

    // 페이징 처리
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedIds = followerIds.slice(startIndex, endIndex)

    // 사용자 프로필 정보 가져오기 (배치 처리)
    const users = await getUserProfilesBatch(paginatedIds, currentUserId)

    // 시뮬레이션된 지연
    await simulateNetworkDelay(300)

    return {
      users,
      hasMore: endIndex < followerIds.length,
      total: followerIds.length
    }
  } catch (error) {
    if (error instanceof FollowApiError) {
      throw error
    }
    console.error('Failed to get followers:', error)
    throw new FollowApiError('팔로워 목록을 불러오는데 실패했습니다.')
  }
}

// 팔로잉 목록 가져오기
export const getFollowing = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ users: UserProfile[], hasMore: boolean, total: number }> => {
  if (!userId?.trim()) {
    throw new FollowApiError('유효하지 않은 사용자 ID입니다.', 'INVALID_USER_ID')
  }

  if (page < 1 || limit < 1 || limit > 100) {
    throw new FollowApiError('유효하지 않은 페이지 매개변수입니다.', 'INVALID_PAGINATION')
  }

  try {
    const relations = getFollowRelations()
    const currentUserId = getCurrentUserId()
    
    // 해당 사용자가 팔로우하는 사용자들의 ID
    const followingRelations = relations
      .filter(r => r.followerId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const followingIds = followingRelations.map(r => r.followingId)

    // 페이징 처리
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedIds = followingIds.slice(startIndex, endIndex)

    // 사용자 프로필 정보 가져오기 (배치 처리)
    const users = await getUserProfilesBatch(paginatedIds, currentUserId)

    // 시뮬레이션된 지연
    await simulateNetworkDelay(300)

    return {
      users,
      hasMore: endIndex < followingIds.length,
      total: followingIds.length
    }
  } catch (error) {
    if (error instanceof FollowApiError) {
      throw error
    }
    console.error('Failed to get following:', error)
    throw new FollowApiError('팔로잉 목록을 불러오는데 실패했습니다.')
  }
}

// 사용자 프로필 가져오기
export const getUserProfile = async (
  userId: string,
  viewerUserId?: string
): Promise<UserProfile | null> => {
  if (!userId?.trim()) {
    return null
  }

  try {
    const profiles = getUserProfiles()
    let profile = profiles[userId]
    
    if (!profile) {
      // 기본 프로필 생성
      profile = createDefaultProfile(userId)
      profiles[userId] = profile
      saveUserProfiles(profiles)
    }

    const currentUserId = viewerUserId || getCurrentUserId()
    const relations = getFollowRelations()

    // 팔로우 관계 확인
    const isFollowing = currentUserId !== userId && relations.some(
      r => r.followerId === currentUserId && r.followingId === userId
    )
    const isFollowedBy = currentUserId !== userId && relations.some(
      r => r.followerId === userId && r.followingId === currentUserId
    )

    // 팔로우 수 계산 (캐시된 값 사용하되, 실제 관계와 동기화)
    const followersCount = relations.filter(r => r.followingId === userId).length
    const followingCount = relations.filter(r => r.followerId === userId).length

    return {
      ...profile,
      followersCount,
      followingCount,
      isFollowing,
      isFollowedBy
    }
  } catch (error) {
    console.error('Failed to get user profile:', error)
    return null
  }
}

// 사용자 검색
export const searchUsers = async (
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ users: UserProfile[], hasMore: boolean, total: number }> => {
  if (!query?.trim()) {
    return { users: [], hasMore: false, total: 0 }
  }

  if (page < 1 || limit < 1 || limit > 100) {
    throw new FollowApiError('유효하지 않은 페이지 매개변수입니다.', 'INVALID_PAGINATION')
  }

  try {
    const profiles = getUserProfiles()
    const currentUserId = getCurrentUserId()
    const normalizedQuery = query.toLowerCase().trim()
    
    // 검색어로 필터링 (정확도 순으로 정렬)
    const filteredProfiles = Object.values(profiles)
      .filter(profile => {
        const usernameMatch = profile.username.toLowerCase().includes(normalizedQuery)
        const displayNameMatch = profile.displayName.toLowerCase().includes(normalizedQuery)
        const bioMatch = profile.bio?.toLowerCase().includes(normalizedQuery)
        return usernameMatch || displayNameMatch || bioMatch
      })
      .sort((a, b) => {
        // 정확도 기반 정렬
        const aUsernameExact = a.username.toLowerCase() === normalizedQuery
        const bUsernameExact = b.username.toLowerCase() === normalizedQuery
        if (aUsernameExact && !bUsernameExact) return -1
        if (!aUsernameExact && bUsernameExact) return 1

        const aUsernameStartsWith = a.username.toLowerCase().startsWith(normalizedQuery)
        const bUsernameStartsWith = b.username.toLowerCase().startsWith(normalizedQuery)
        if (aUsernameStartsWith && !bUsernameStartsWith) return -1
        if (!aUsernameStartsWith && bUsernameStartsWith) return 1

        return b.followersCount - a.followersCount // 팔로워 수 순
      })

    // 페이징 처리
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex)

    // 팔로우 관계 정보 추가
    const userIds = paginatedProfiles.map(p => p.id)
    const users = await getUserProfilesBatch(userIds, currentUserId)

    // 시뮬레이션된 지연
    await simulateNetworkDelay(300)

    return {
      users,
      hasMore: endIndex < filteredProfiles.length,
      total: filteredProfiles.length
    }
  } catch (error) {
    if (error instanceof FollowApiError) {
      throw error
    }
    console.error('Failed to search users:', error)
    throw new FollowApiError('사용자 검색에 실패했습니다.')
  }
}

// 추천 사용자 가져오기
export const getRecommendedUsers = async (
  limit: number = 10
): Promise<UserProfile[]> => {
  if (limit < 1 || limit > 50) {
    throw new FollowApiError('유효하지 않은 제한 수입니다.', 'INVALID_LIMIT')
  }

  try {
    const currentUserId = getCurrentUserId()
    const profiles = getUserProfiles()
    const relations = getFollowRelations()
    
    // 현재 사용자가 팔로우하지 않는 사용자들
    const followingIds = new Set(
      relations
        .filter(r => r.followerId === currentUserId)
        .map(r => r.followingId)
    )

    const notFollowingUsers = Object.values(profiles)
      .filter(profile => 
        profile.id !== currentUserId && 
        !followingIds.has(profile.id)
      )
      .sort((a, b) => b.followersCount - a.followersCount) // 인기도 순 정렬

    // 상위 인기 사용자와 랜덤 사용자 조합
    const topUsers = notFollowingUsers.slice(0, Math.floor(limit * 0.7))
    const remainingUsers = notFollowingUsers.slice(Math.floor(limit * 0.7))
    const randomUsers = remainingUsers
      .sort(() => Math.random() - 0.5)
      .slice(0, limit - topUsers.length)

    const recommendedUserIds = [...topUsers, ...randomUsers]
      .slice(0, limit)
      .map(user => user.id)

    // 팔로우 관계 정보 추가
    const users = await getUserProfilesBatch(recommendedUserIds, currentUserId)

    return users
  } catch (error) {
    console.error('Failed to get recommended users:', error)
    return []
  }
}

// === Helper Functions ===

// 배치로 사용자 프로필 가져오기 (성능 최적화)
const getUserProfilesBatch = async (
  userIds: string[],
  viewerUserId: string
): Promise<UserProfile[]> => {
  const profiles = getUserProfiles()
  const relations = getFollowRelations()

  // 팔로우 관계를 미리 계산 (O(n) 한 번만)
  const followingMap = new Map<string, boolean>()
  const followedByMap = new Map<string, boolean>()
  const followersCountMap = new Map<string, number>()
  const followingCountMap = new Map<string, number>()

  relations.forEach(relation => {
    if (relation.followerId === viewerUserId) {
      followingMap.set(relation.followingId, true)
    }
    if (relation.followingId === viewerUserId) {
      followedByMap.set(relation.followerId, true)
    }

    // 팔로워 수 계산
    const currentCount = followersCountMap.get(relation.followingId) || 0
    followersCountMap.set(relation.followingId, currentCount + 1)

    // 팔로잉 수 계산
    const currentFollowingCount = followingCountMap.get(relation.followerId) || 0
    followingCountMap.set(relation.followerId, currentFollowingCount + 1)
  })

  return userIds
    .map(userId => {
      let profile = profiles[userId]
      if (!profile) {
        profile = createDefaultProfile(userId)
        profiles[userId] = profile
      }

      return {
        ...profile,
        followersCount: followersCountMap.get(userId) || 0,
        followingCount: followingCountMap.get(userId) || 0,
        isFollowing: viewerUserId !== userId ? (followingMap.get(userId) || false) : false,
        isFollowedBy: viewerUserId !== userId ? (followedByMap.get(userId) || false) : false
      }
    })
    .filter(Boolean)
}

// 네트워크 지연 시뮬레이션
const simulateNetworkDelay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 팔로우 관계 가져오기
const getFollowRelations = (): FollowRelation[] => {
  try {
    const relationsData = SafeStorage.getItem(STORAGE_KEYS.FOLLOW_RELATIONS)
    return relationsData ? JSON.parse(relationsData) : []
  } catch (error) {
    console.error('Failed to get follow relations:', error)
    return []
  }
}

// 팔로우 관계 저장
const saveFollowRelations = (relations: FollowRelation[]): void => {
  try {
    SafeStorage.setItem(STORAGE_KEYS.FOLLOW_RELATIONS, JSON.stringify(relations))
  } catch (error) {
    console.error('Failed to save follow relations:', error)
    throw new FollowApiError('팔로우 관계 저장에 실패했습니다.')
  }
}

// 사용자 프로필들 가져오기
const getUserProfiles = (): Record<string, UserProfile> => {
  try {
    const profilesData = SafeStorage.getItem(STORAGE_KEYS.USER_PROFILES)
    return profilesData ? JSON.parse(profilesData) : {}
  } catch (error) {
    console.error('Failed to get user profiles:', error)
    return {}
  }
}

// 사용자 프로필들 저장
const saveUserProfiles = (profiles: Record<string, UserProfile>): void => {
  try {
    SafeStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles))
  } catch (error) {
    console.error('Failed to save user profiles:', error)
    throw new FollowApiError('사용자 프로필 저장에 실패했습니다.')
  }
}

// 기본 프로필 생성
const createDefaultProfile = (userId: string): UserProfile => {
  const randomUsernameIndex = Math.floor(Math.random() * DEFAULT_USERNAMES.length)
  const randomBioIndex = Math.floor(Math.random() * DEFAULT_USER_BIOS.length)
  const randomAvatarNumber = Math.floor(Math.random() * 5) + 1
  
  return {
    id: userId,
    username: `${DEFAULT_USERNAMES[randomUsernameIndex]}_${userId.slice(-4)}`,
    displayName: `User ${userId.slice(-4)}`,
    avatar: `/images/avatars/user${randomAvatarNumber}.jpg`,
    bio: DEFAULT_USER_BIOS[randomBioIndex],
    feedCount: 0,
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
    isFollowedBy: false,
    joinedAt: new Date().toISOString()
  }
}

// 팔로우 수 업데이트
const updateUserFollowCounts = async (
  followerId: string,
  followingId: string,
  action: 'follow' | 'unfollow'
): Promise<void> => {
  try {
    const profiles = getUserProfiles()
    let hasChanges = false
    
    // 팔로워 프로필 업데이트 (팔로잉 수)
    if (profiles[followerId]) {
      const delta = action === 'follow' ? 1 : -1
      const newCount = Math.max(0, profiles[followerId].followingCount + delta)
      if (profiles[followerId].followingCount !== newCount) {
        profiles[followerId].followingCount = newCount
        hasChanges = true
      }
    }

    // 팔로잉 프로필 업데이트 (팔로워 수)
    if (profiles[followingId]) {
      const delta = action === 'follow' ? 1 : -1
      const newCount = Math.max(0, profiles[followingId].followersCount + delta)
      if (profiles[followingId].followersCount !== newCount) {
        profiles[followingId].followersCount = newCount
        hasChanges = true
      }
    }

    if (hasChanges) {
      saveUserProfiles(profiles)
    }
  } catch (error) {
    console.error('Failed to update follow counts:', error)
    // 카운트 업데이트 실패는 치명적이지 않으므로 에러를 throw하지 않음
  }
}

// 초기 더미 데이터 생성 (개발용)
export const initializeDummyUsers = (): void => {
  try {
    const existingProfiles = getUserProfiles()
    if (Object.keys(existingProfiles).length === 0) {
      const dummyProfiles: Record<string, UserProfile> = {
        'user_1': {
          id: 'user_1',
          username: 'photo_lover_123',
          displayName: 'Photo Lover',
          avatar: '/images/avatars/user1.jpg',
          bio: '사진으로 세상을 담는 것을 좋아해요 📸',
          feedCount: 15,
          followersCount: 0,
          followingCount: 0,
          isFollowing: false,
          isFollowedBy: false,
          joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        'user_2': {
          id: 'user_2',
          username: 'creative_artist',
          displayName: 'Creative Artist',
          avatar: '/images/avatars/user2.jpg',
          bio: '창작과 예술을 사랑하는 아티스트 🎨',
          feedCount: 8,
          followersCount: 0,
          followingCount: 0,
          isFollowing: false,
          isFollowedBy: false,
          joinedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
        },
        'user_3': {
          id: 'user_3',
          username: 'memory_keeper',
          displayName: 'Memory Keeper',
          avatar: '/images/avatars/user3.jpg',
          bio: '소중한 순간들을 기록하고 보관해요 💝',
          feedCount: 22,
          followersCount: 0,
          followingCount: 0,
          isFollowing: false,
          isFollowedBy: false,
          joinedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
        },
        'user_4': {
          id: 'user_4',
          username: 'visual_storyteller',
          displayName: 'Visual Storyteller',
          avatar: '/images/avatars/user4.jpg',
          bio: '일상의 아름다운 순간을 담아요 📸',
          feedCount: 12,
          followersCount: 0,
          followingCount: 0,
          isFollowing: false,
          isFollowedBy: false,
          joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        'user_5': {
          id: 'user_5',
          username: 'snapshot_master',
          displayName: 'Snapshot Master',
          avatar: '/images/avatars/user5.jpg',
          bio: '시각적 이야기꾼입니다 ✨',
          feedCount: 18,
          followersCount: 0,
          followingCount: 0,
          isFollowing: false,
          isFollowedBy: false,
          joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
      
      saveUserProfiles(dummyProfiles)
      console.log('Dummy users initialized successfully')
    }
  } catch (error) {
    console.error('Failed to initialize dummy users:', error)
  }
}

// 현재 사용자 설정 (개발용)
export const setCurrentUser = (userId: string): void => {
  try {
    SafeStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId)
  } catch (error) {
    console.error('Failed to set current user:', error)
    throw new FollowApiError('현재 사용자 설정에 실패했습니다.')
  }
}

// 모든 데이터 초기화 (개발용)
export const clearAllData = (): void => {
  try {
    SafeStorage.removeItem(STORAGE_KEYS.FOLLOW_RELATIONS)
    SafeStorage.removeItem(STORAGE_KEYS.USER_PROFILES)
    SafeStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID)
    console.log('All data cleared successfully')
  } catch (error) {
    console.error('Failed to clear data:', error)
  }
}
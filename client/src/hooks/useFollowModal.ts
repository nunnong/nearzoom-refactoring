// src/hooks/useFollowModal.ts

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/axios'

// ============================================================================
// 타입 정의 (백엔드 연동)
// ============================================================================

interface ApiResponse<T> {
  error: boolean
  message: string
  data: T
}

// 백엔드 UserInfoResponse 타입
interface BackendUserInfoResponse {
  userName: string        // 사용자 이름
  userEmail: string       // 이메일
  profileImage?: string   // 프로필 이미지
  prettyFace?: string     // 예쁜 얼굴 이미지
}

// 프론트엔드에서 사용할 User 타입
interface User {
  id: string              // userEmail을 id로 사용
  username: string        // userName
  displayName: string     // userName
  email: string          // userEmail
  profileImageUrl?: string // profileImage
  prettyFaceUrl?: string  // prettyFace
  isFollowing?: boolean   // 팔로우 상태
}

// 팔로우 통계 (백엔드 FollowCountsResponse)
interface FollowStats {
  followerCount: number   // 팔로워 수
  followingCount: number  // 팔로잉 수
}

// API 엔드포인트
const API_ENDPOINTS = {
  FOLLOWERS: '/follows/followers',    // GET /follows/followers/{userId}
  FOLLOWING: '/follows/following',    // GET /follows/following/{userId}
  FOLLOW: '/follows',                 // POST /follows/{followeeId}
  FOLLOW_CHECK: '/follows/check',     // GET /follows/check/{followeeId}
  FOLLOW_COUNT: '/follows/count',     // GET /follows/count/{userId}
} as const

// ============================================================================
// 메인 훅 인터페이스
// ============================================================================

export interface UseFollowModalReturn {
  // 기본 상태
  isOpen: boolean
  modalType: 'followers' | 'following'
  targetUserId: string
  
  // 데이터
  users: User[]
  followStats: FollowStats | null
  loading: boolean
  error: string | null
  hasMore: boolean
  
  // 모달 제어
  openFollowerModal: (userId: string) => void
  openFollowingModal: (userId: string) => void
  closeModal: () => void
  
  // 데이터 관리
  loadUsers: () => Promise<void>
  refreshUsers: () => Promise<void>
  loadMoreUsers: () => Promise<void>
  
  // 팔로우 액션 (userId 기반)
  followUser: (userId: string) => Promise<void>
  unfollowUser: (userId: string) => Promise<void>
  toggleFollow: (userId: string) => Promise<void>
  
  // 유틸리티
  clearError: () => void
  getUserById: (userId: string) => User | undefined
  isUserFollowing: (userId: string) => boolean
}

// ============================================================================
// 메인 훅
// ============================================================================

export const useFollowModal = (): UseFollowModalReturn => {
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isOpen, setIsOpen] = useState(false)
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers')
  const [targetUserId, setTargetUserId] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [followStats, setFollowStats] = useState<FollowStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  
  // 요청 관리
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)
  
  // 인증 상태
  const { isAuthenticated } = useAuthStore()

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 에러 처리 헬퍼
  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      if (err.message.includes('401')) {
        return '로그인이 필요합니다.'
      } else if (err.message.includes('403')) {
        return '권한이 없습니다.'
      } else if (err.message.includes('404')) {
        return '사용자를 찾을 수 없습니다.'
      } else if (err.message.includes('Network Error')) {
        return '네트워크 연결을 확인해주세요.'
      }
      return err.message
    }
    return '알 수 없는 오류가 발생했습니다.'
  }, [])

  // 백엔드 응답을 User 타입으로 변환
  const transformBackendUser = useCallback((backendUser: BackendUserInfoResponse): User => {
    return {
      id: backendUser.userEmail,                    // 이메일을 고유 ID로 사용
      username: backendUser.userName,               // 사용자명
      displayName: backendUser.userName,            // 표시명
      email: backendUser.userEmail,                 // 이메일
      profileImageUrl: backendUser.profileImage,    // 프로필 이미지
      prettyFaceUrl: backendUser.prettyFace,        // 예쁜 얼굴 이미지
      isFollowing: false                            // 초기값, 별도로 조회 필요
    }
  }, [])

  // userId를 숫자로 변환 (백엔드는 Long userId 사용)
  const parseUserId = useCallback((userId: string): number => {
    const parsed = parseInt(userId, 10)
    if (isNaN(parsed)) {
      throw new Error('유효하지 않은 사용자 ID입니다.')
    }
    return parsed
  }, [])

  // ============================================================================
  // 백엔드 API 연동 - 팔로워/팔로잉 목록 조회
  // ============================================================================

  const loadUsers = useCallback(async () => {
    if (!isAuthenticated || !targetUserId) {
      setError('로그인이 필요하거나 대상 사용자가 지정되지 않았습니다.')
      return
    }

    // 중복 요청 방지
    if (loadingRef.current) return
    loadingRef.current = true

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const numericUserId = parseUserId(targetUserId)
      let endpoint: string

      if (modalType === 'followers') {
        // 🔥 GET /follows/followers/{userId}
        endpoint = `${API_ENDPOINTS.FOLLOWERS}/${numericUserId}`
      } else {
        // 🔥 GET /follows/following/{userId}
        endpoint = `${API_ENDPOINTS.FOLLOWING}/${numericUserId}`
      }

      console.log(`=== ${modalType} 목록 로딩 시작 ===`, { targetUserId, endpoint })

      const response = await api.get<ApiResponse<BackendUserInfoResponse[]>>(endpoint, {
        signal: abortControllerRef.current.signal
      })

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      // 백엔드 데이터를 프론트엔드 User 타입으로 변환
      const transformedUsers = response.data.data.map(transformBackendUser)

      // 각 사용자의 팔로우 상태를 확인해야 하지만, 백엔드에서 userId 기반이므로
      // 여기서는 일단 기본값으로 설정하고, 필요시 별도 API 호출
      setUsers(transformedUsers)
      setHasMore(false) // 백엔드에서 페이징을 지원하지 않는 것으로 보임

      console.log(`=== ${modalType} 목록 로딩 완료 ===`, {
        count: transformedUsers.length,
        users: transformedUsers
      })

      // 🔥 팔로우 통계도 함께 조회 (GET /follows/count/{userId})
      try {
        const statsResponse = await api.get<ApiResponse<FollowStats>>(
          `${API_ENDPOINTS.FOLLOW_COUNT}/${numericUserId}`,
          { signal: abortControllerRef.current.signal }
        )

        if (!statsResponse.data.error && statsResponse.data.data) {
          setFollowStats(statsResponse.data.data)
          console.log('팔로우 통계 로딩 완료:', statsResponse.data.data)
        }
      } catch (statsError) {
        console.warn('팔로우 통계 로딩 실패:', statsError)
        // 통계 조회 실패는 무시하고 계속 진행
      }

    } catch (err) {
      // 요청이 취소된 경우는 에러로 처리하지 않음
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      console.error(`${modalType} 목록 로딩 실패:`, err)
      setError(handleApiError(err))
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [isAuthenticated, targetUserId, modalType, parseUserId, transformBackendUser, handleApiError])

  // ============================================================================
  // 백엔드 API 연동 - 팔로우/언팔로우 액션
  // ============================================================================

  // 🔥 팔로우 (POST /follows/{followeeId})
  const followUser = useCallback(async (userId: string) => {
    if (!isAuthenticated) {
      setError('로그인이 필요합니다.')
      return
    }

    try {
      const numericUserId = parseUserId(userId)
      
      console.log('=== 팔로우 시작 ===', { userId, numericUserId })

      const response = await api.post<ApiResponse<void>>(
        `${API_ENDPOINTS.FOLLOW}/${numericUserId}`
      )

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      // 낙관적 업데이트: 해당 사용자의 팔로우 상태 변경
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, isFollowing: true }
          : user
      ))

      // 팔로우 통계 업데이트 (팔로워 수 +1)
      if (followStats) {
        setFollowStats(prev => prev ? {
          ...prev,
          followerCount: prev.followerCount + 1
        } : null)
      }

      console.log('=== 팔로우 성공 ===', { userId })

    } catch (err) {
      console.error('팔로우 실패:', err)
      setError(handleApiError(err))
    }
  }, [isAuthenticated, parseUserId, followStats, handleApiError])

  // 🔥 언팔로우 (DELETE /follows/{followeeId})
  const unfollowUser = useCallback(async (userId: string) => {
    if (!isAuthenticated) {
      setError('로그인이 필요합니다.')
      return
    }

    try {
      const numericUserId = parseUserId(userId)
      
      console.log('=== 언팔로우 시작 ===', { userId, numericUserId })

      const response = await api.delete<ApiResponse<void>>(
        `${API_ENDPOINTS.FOLLOW}/${numericUserId}`
      )

      if (response.data.error) {
        throw new Error(response.data.message)
      }

      // 낙관적 업데이트: 해당 사용자의 팔로우 상태 변경
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, isFollowing: false }
          : user
      ))

      // 팔로우 통계 업데이트 (팔로워 수 -1)
      if (followStats) {
        setFollowStats(prev => prev ? {
          ...prev,
          followerCount: Math.max(0, prev.followerCount - 1)
        } : null)
      }

      console.log('=== 언팔로우 성공 ===', { userId })

    } catch (err) {
      console.error('언팔로우 실패:', err)
      setError(handleApiError(err))
    }
  }, [isAuthenticated, parseUserId, followStats, handleApiError])

  // 🔥 토글 팔로우
  const toggleFollow = useCallback(async (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) {
      console.warn('사용자를 찾을 수 없습니다:', userId)
      return
    }

    if (user.isFollowing) {
      await unfollowUser(userId)
    } else {
      await followUser(userId)
    }
  }, [users, followUser, unfollowUser])

  // ============================================================================
  // 모달 제어
  // ============================================================================

  const openFollowerModal = useCallback((userId: string) => {
    setTargetUserId(userId)
    setModalType('followers')
    setIsOpen(true)
    setUsers([])
    setFollowStats(null)
    setError(null)
    
    console.log('=== 팔로워 모달 열기 ===', { userId })
  }, [])

  const openFollowingModal = useCallback((userId: string) => {
    setTargetUserId(userId)
    setModalType('following')
    setIsOpen(true)
    setUsers([])
    setFollowStats(null)
    setError(null)
    
    console.log('=== 팔로잉 모달 열기 ===', { userId })
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setTargetUserId('')
    setUsers([])
    setFollowStats(null)
    setError(null)
    
    // 진행 중인 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    console.log('=== 모달 닫기 ===')
  }, [])

  // ============================================================================
  // 데이터 관리
  // ============================================================================

  const refreshUsers = useCallback(async () => {
    setUsers([])
    setFollowStats(null)
    setError(null)
    await loadUsers()
  }, [loadUsers])

  const loadMoreUsers = useCallback(async () => {
    // 백엔드에서 페이징을 지원하지 않으므로 구현하지 않음
    console.log('더 많은 사용자 로드는 백엔드에서 페이징을 지원하지 않습니다.')
  }, [])

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const getUserById = useCallback((userId: string): User | undefined => {
    return users.find(user => user.id === userId)
  }, [users])

  const isUserFollowing = useCallback((userId: string): boolean => {
    const user = users.find(u => u.id === userId)
    return user?.isFollowing || false
  }, [users])

  // ============================================================================
  // 모달이 열릴 때 자동으로 데이터 로드
  // ============================================================================

  useEffect(() => {
    if (isOpen && targetUserId) {
      loadUsers()
    }
  }, [isOpen, targetUserId, modalType, loadUsers])

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // ============================================================================
  // 반환 값
  // ============================================================================

  return {
    // 기본 상태
    isOpen,
    modalType,
    targetUserId,
    
    // 데이터
    users,
    followStats,
    loading,
    error,
    hasMore,
    
    // 모달 제어
    openFollowerModal,
    openFollowingModal,
    closeModal,
    
    // 데이터 관리
    loadUsers,
    refreshUsers,
    loadMoreUsers,
    
    // 팔로우 액션 (userId 기반)
    followUser,
    unfollowUser,
    toggleFollow,
    
    // 유틸리티
    clearError,
    getUserById,
    isUserFollowing,
  }
}
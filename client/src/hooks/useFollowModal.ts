// ============================================================================
// src/hooks/useFollowModal.ts - 완전 수정 버전
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

// 🔧 올바른 API 사용 - 인터셉터가 적용된 axios 인스턴스
import api from '@/lib/axios'

// 🔥 useFollow.ts와 동일한 타입 구조 사용
import {
  type FollowCountsResponse,
  type UserProfileResponse,
  type ApiResponse,
} from '@/lib/types/feed'

// ============================================================================
// 백엔드 API 응답 타입 정의
// ============================================================================

// 커서 기반 팔로우 목록 응답
interface FollowListResponse {
  users: UserProfileResponse[]
  hasNext: boolean
  nextCursor: number | null
}

// ============================================================================
// 프론트엔드 통합 타입 정의
// ============================================================================

// 프론트엔드에서 사용할 User 타입
interface FollowUser {
  id: string              // accountName을 id로 사용
  userId: number          // 백엔드 userId
  accountName: string     // 계정명
  username: string        // userName (표시명)
  displayName: string     // userName
  email: string          // userEmail
  profileImageUrl?: string // profileImage
  prettyFace?: string | null // prettyFace
  isFollowing?: boolean   // 팔로우 상태
}

// 팔로우 통계
interface FollowModalStats {
  followerCount: number   // 팔로워 수
  followingCount: number  // 팔로잉 수
}

// 무한스크롤 상태
interface FollowScrollState<T> {
  items: T[]
  loading: boolean
  error: string | null
  hasNext: boolean
  nextCursor: number | null
  isInitialLoad: boolean
  isLoadingMore: boolean
}

// ============================================================================
// 메인 훅 인터페이스
// ============================================================================

export interface UseFollowModalReturn {
  // 기본 상태
  isOpen: boolean
  modalType: 'followers' | 'following'
  targetAccountName: string
  
  // 무한스크롤 데이터
  users: FollowUser[]
  followStats: FollowModalStats | null
  loading: boolean
  error: string | null
  hasNext: boolean
  nextCursor: number | null
  isLoadingMore: boolean
  isInitialLoad: boolean
  
  // 모달 제어
  openFollowerModal: (accountName: string) => void
  openFollowingModal: (accountName: string) => void
  closeModal: () => void
  
  // 데이터 관리
  loadInitialUsers: () => Promise<void>
  loadMoreUsers: () => Promise<void>
  refreshUsers: () => Promise<void>
  
  // 팔로우 액션
  followUser: (accountName: string) => Promise<void>
  unfollowUser: (accountName: string) => Promise<void>
  toggleFollow: (accountName: string) => Promise<void>
  
  // 유틸리티
  clearError: () => void
  getUserByAccountName: (accountName: string) => FollowUser | undefined
  isUserFollowing: (accountName: string) => boolean
  retryLoad: () => Promise<void>
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const followModalAPI = {
  // 팔로워 목록 조회
  getFollowers: async (
    accountName: string,
    limit: number = 20,
    cursor?: number
  ): Promise<FollowListResponse> => {
    const params: Record<string, any> = { limit }
    if (cursor) params.cursor = cursor

    const response = await api.get<ApiResponse<FollowListResponse>>(
      `/follows/followers/${accountName}`,
      { params }
    )
    
    if (response.data.error || !response.data.data) {
      throw new Error(response.data.message || '팔로워 목록 조회에 실패했습니다.')
    }
    
    return response.data.data
  },

  // 팔로잉 목록 조회
  getFollowing: async (
    accountName: string,
    limit: number = 20,
    cursor?: number
  ): Promise<FollowListResponse> => {
    const params: Record<string, any> = { limit }
    if (cursor) params.cursor = cursor

    const response = await api.get<ApiResponse<FollowListResponse>>(
      `/follows/following/${accountName}`,
      { params }
    )
    
    if (response.data.error || !response.data.data) {
      throw new Error(response.data.message || '팔로잉 목록 조회에 실패했습니다.')
    }
    
    return response.data.data
  },

  // 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<FollowCountsResponse> => {
    const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${accountName}`)
    
    if (response.data.error || !response.data.data) {
      throw new Error(response.data.message || '팔로우 수 조회에 실패했습니다.')
    }
    
    return response.data.data
  },

  // 팔로우
  followUser: async (accountName: string): Promise<void> => {
    const response = await api.post<ApiResponse<void>>(`/follows/${accountName}`)
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우에 실패했습니다.')
    }
  },

  // 언팔로우
  unfollowUser: async (accountName: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/follows/${accountName}`)
    
    if (response.data.error) {
      throw new Error(response.data.message || '언팔로우에 실패했습니다.')
    }
  },

  // 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    const response = await api.get<ApiResponse<boolean>>(`/follows/check/${accountName}`)
    
    if (response.data.error) {
      console.warn('팔로우 상태 확인 실패:', response.data.message)
      return false
    }
    
    return response.data.data ?? false
  },
}

// ============================================================================
// 에러 처리 함수
// ============================================================================

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
// 무한스크롤 상태 관리 헬퍼
// ============================================================================

const createInitialScrollState = <T>(): FollowScrollState<T> => ({
  items: [],
  loading: false,
  error: null,
  hasNext: false,
  nextCursor: null,
  isInitialLoad: true,
  isLoadingMore: false,
})

// ============================================================================
// 메인 훅
// ============================================================================

export const useFollowModal = (): UseFollowModalReturn => {
  
  const router = useRouter()

  // 상태 관리
  const { isAuthenticated, user } = useAuthStore()
  
  const [isOpen, setIsOpen] = useState(false)
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers')
  const [targetAccountName, setTargetAccountName] = useState<string>('')
  const [followStats, setFollowStats] = useState<FollowModalStats | null>(null)
  
  // 무한스크롤 상태
  const [scrollState, setScrollState] = useState<FollowScrollState<FollowUser>>(
    createInitialScrollState<FollowUser>()
  )
  
  // 요청 관리
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingRef = useRef(false)

  // 🔐 미인증시 즉시 리다이렉트
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

  // 인증 체크 헬퍼
  const checkAuth = useCallback((): boolean => {
    if (!isAuthenticated || !user) {
      const errorMessage = '로그인이 필요합니다.'
      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        error: errorMessage,
        loading: false,
        isInitialLoad: false
      }))
      router.replace('/auth/login')
      return false
    }
    return true
  }, [isAuthenticated, user, router])

  // 백엔드 UserProfileResponse를 FollowUser 타입으로 변환
  const transformBackendUser = useCallback((backendUser: UserProfileResponse): FollowUser => {
    return {
      id: backendUser.accountName,
      userId: backendUser.userId,
      accountName: backendUser.accountName,
      username: backendUser.userName,
      displayName: backendUser.userName,
      email: backendUser.userEmail,
      profileImageUrl: backendUser.profileImage || undefined,
      prettyFace: backendUser.prettyFace || null,
      isFollowing: false
    }
  }, [])

  // 요청 취소 및 초기화
  const cancelPendingRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
  }, [])

  // 에러 처리 헬퍼
  const handleErrorLocal = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err)
    return handleApiError(err)
  }, [])

  // ============================================================================
  // 커서 기반 무한스크롤 - 초기 로드
  // ============================================================================

  const loadInitialUsers = useCallback(async () => {
    if (!checkAuth() || !targetAccountName) {
      return
    }

    if (loadingRef.current) return
    loadingRef.current = true

    cancelPendingRequests()

    setScrollState((prev: FollowScrollState<FollowUser>) => ({
      ...prev,
      loading: true,
      error: null,
      isInitialLoad: true,
      isLoadingMore: false
    }))

    try {
      let backendResponse: FollowListResponse

      if (modalType === 'followers') {
        backendResponse = await followModalAPI.getFollowers(targetAccountName, 20)
      } else {
        backendResponse = await followModalAPI.getFollowing(targetAccountName, 20)
      }

      const transformedUsers = backendResponse.users.map(transformBackendUser)

      // 팔로우 상태 확인 (최대 10개까지만)
      const usersToCheck = transformedUsers.slice(0, 10) 
      const usersWithFollowStatus = await Promise.allSettled(
        usersToCheck.map(async (user: FollowUser) => {
          try {
            const isFollowing = await followModalAPI.checkFollowStatus(user.accountName)
            return { ...user, isFollowing }
          } catch (error) {
            console.warn(`팔로우 상태 확인 실패: ${user.accountName}`, error)
            return { ...user, isFollowing: false }
          }
        })
      )

      // Promise.allSettled 결과 처리
      const checkedUsers = usersWithFollowStatus.map((result: PromiseSettledResult<FollowUser>, index: number) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          console.warn(`팔로우 상태 확인 실패: ${usersToCheck[index].accountName}`, result.reason)
          return { ...usersToCheck[index], isFollowing: false }
        }
      })

      // 나머지 사용자들은 기본값으로 설정
      const remainingUsers = transformedUsers.slice(10).map((user: FollowUser) => ({ ...user, isFollowing: false }))
      const allUsers = [...checkedUsers, ...remainingUsers]

      setScrollState({
        items: allUsers,
        loading: false,
        error: null,
        hasNext: backendResponse.hasNext,
        nextCursor: backendResponse.nextCursor,
        isInitialLoad: false,
        isLoadingMore: false
      })

      // 팔로우 통계도 함께 조회
      try {
        const statsResult = await followModalAPI.getFollowCounts(targetAccountName)
        setFollowStats({
          followerCount: statsResult.followerCount,
          followingCount: statsResult.followingCount
        })
      } catch (statsError) {
        console.warn('팔로우 통계 로딩 실패:', statsError)
      }

    } catch (err: any) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      console.error(`${modalType} 초기 로드 실패:`, err)
      const errorMessage = handleErrorLocal(err, `${modalType} 초기 로드`)
      
      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isInitialLoad: false,
        isLoadingMore: false
      }))
    } finally {
      loadingRef.current = false
    }
  }, [checkAuth, targetAccountName, modalType, transformBackendUser, cancelPendingRequests, handleErrorLocal])

  // ============================================================================
  // 커서 기반 무한스크롤 - 더 로드
  // ============================================================================

  const loadMoreUsers = useCallback(async () => {
    if (!checkAuth() || !targetAccountName || !scrollState.hasNext || scrollState.isLoadingMore || loadingRef.current) {
      return
    }

    loadingRef.current = true

    setScrollState((prev: FollowScrollState<FollowUser>) => ({
      ...prev,
      isLoadingMore: true,
      error: null
    }))

    try {
      let backendResponse: FollowListResponse

      if (modalType === 'followers') {
        backendResponse = await followModalAPI.getFollowers(targetAccountName, 20, scrollState.nextCursor || undefined)
      } else {
        backendResponse = await followModalAPI.getFollowing(targetAccountName, 20, scrollState.nextCursor || undefined)
      }

      const transformedUsers = backendResponse.users.map(transformBackendUser)

      // 팔로우 상태 확인 (최대 5개까지만)
      const usersToCheck = transformedUsers.slice(0, 5) 
      const usersWithFollowStatus = await Promise.allSettled(
        usersToCheck.map(async (user: FollowUser) => {
          try {
            const isFollowing = await followModalAPI.checkFollowStatus(user.accountName)
            return { ...user, isFollowing }
          } catch (error) {
            console.warn(`팔로우 상태 확인 실패: ${user.accountName}`, error)
            return { ...user, isFollowing: false }
          }
        })
      )

      // Promise.allSettled 결과 처리
      const checkedUsers = usersWithFollowStatus.map((result: PromiseSettledResult<FollowUser>, index: number) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          console.warn(`팔로우 상태 확인 실패: ${usersToCheck[index].accountName}`, result.reason)
          return { ...usersToCheck[index], isFollowing: false }
        }
      })

      // 나머지 사용자들은 기본값으로 설정
      const remainingUsers = transformedUsers.slice(5).map((user: FollowUser) => ({ ...user, isFollowing: false }))
      const newUsers = [...checkedUsers, ...remainingUsers]

      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        items: [...prev.items, ...newUsers],
        isLoadingMore: false,
        hasNext: backendResponse.hasNext,
        nextCursor: backendResponse.nextCursor
      }))

    } catch (err: any) {
      console.error(`${modalType} 더 로드 실패:`, err)
      const errorMessage = handleErrorLocal(err, `${modalType} 더 로드`)
      
      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        isLoadingMore: false,
        error: errorMessage
      }))
    } finally {
      loadingRef.current = false
    }
  }, [checkAuth, targetAccountName, modalType, scrollState.hasNext, scrollState.isLoadingMore, scrollState.nextCursor, transformBackendUser, handleErrorLocal])

  // ============================================================================
  // 새로고침
  // ============================================================================

  const refreshUsers = useCallback(async () => {
    setScrollState(createInitialScrollState<FollowUser>())
    setFollowStats(null)
    await loadInitialUsers()
  }, [loadInitialUsers])

  // ============================================================================
  // 팔로우/언팔로우 액션 (낙관적 업데이트)
  // ============================================================================

  const followUser = useCallback(async (accountName: string) => {
    if (!checkAuth()) {
      return
    }

    try {
      // 낙관적 업데이트: 즉시 UI 업데이트
      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        items: prev.items.map((user: FollowUser) => 
          user.accountName === accountName 
            ? { ...user, isFollowing: true }
            : user
        )
      }))

      // 백엔드 API 호출
      await followModalAPI.followUser(accountName)

      // 팔로우 통계 업데이트
      if (followStats && modalType === 'followers') {
        setFollowStats((prev: FollowModalStats | null) => prev ? {
          ...prev,
          followerCount: prev.followerCount + 1
        } : null)
      }

    } catch (err: any) {
      console.error('팔로우 실패:', err)
      
      // 실패 시 롤백
      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        items: prev.items.map((user: FollowUser) => 
          user.accountName === accountName 
            ? { ...user, isFollowing: false }
            : user
        ),
        error: handleErrorLocal(err, '팔로우')
      }))
    }
  }, [checkAuth, followStats, modalType, handleErrorLocal])

  const unfollowUser = useCallback(async (accountName: string) => {
    if (!checkAuth()) {
      return
    }

    try {
      // 낙관적 업데이트: 즉시 UI 업데이트
      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        items: prev.items.map((user: FollowUser) => 
          user.accountName === accountName 
            ? { ...user, isFollowing: false }
            : user
        )
      }))

      // 백엔드 API 호출
      await followModalAPI.unfollowUser(accountName)

      // 팔로우 통계 업데이트
      if (followStats && modalType === 'followers') {
        setFollowStats((prev: FollowModalStats | null) => prev ? {
          ...prev,
          followerCount: Math.max(0, prev.followerCount - 1)
        } : null)
      }

    } catch (err: any) {
      console.error('언팔로우 실패:', err)
      
      // 실패 시 롤백
      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        items: prev.items.map((user: FollowUser) => 
          user.accountName === accountName 
            ? { ...user, isFollowing: true }
            : user
        ),
        error: handleErrorLocal(err, '언팔로우')
      }))
    }
  }, [checkAuth, followStats, modalType, handleErrorLocal])

  // 토글 팔로우
  const toggleFollow = useCallback(async (accountName: string) => {
    const user = scrollState.items.find((u: FollowUser) => u.accountName === accountName)
    if (!user) {
      console.warn('사용자를 찾을 수 없습니다:', accountName)
      return
    }

    if (user.isFollowing) {
      await unfollowUser(accountName)
    } else {
      await followUser(accountName)
    }
  }, [scrollState.items, followUser, unfollowUser])

  // ============================================================================
  // 모달 제어
  // ============================================================================

  const openFollowerModal = useCallback((accountName: string) => {
    if (!checkAuth()) {
      return
    }

    setTargetAccountName(accountName)
    setModalType('followers')
    setIsOpen(true)
    setScrollState(createInitialScrollState<FollowUser>())
    setFollowStats(null)
  }, [checkAuth])

  const openFollowingModal = useCallback((accountName: string) => {
    if (!checkAuth()) {
      return
    }

    setTargetAccountName(accountName)
    setModalType('following')
    setIsOpen(true)
    setScrollState(createInitialScrollState<FollowUser>())
    setFollowStats(null)
  }, [checkAuth])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setTargetAccountName('')
    setScrollState(createInitialScrollState<FollowUser>())
    setFollowStats(null)
    
    // 진행 중인 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    loadingRef.current = false
  }, [])

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setScrollState((prev: FollowScrollState<FollowUser>) => ({ ...prev, error: null }))
  }, [])

  const getUserByAccountName = useCallback((accountName: string): FollowUser | undefined => {
    return scrollState.items.find((user: FollowUser) => user.accountName === accountName)
  }, [scrollState.items])

  const isUserFollowing = useCallback((accountName: string): boolean => {
    const user = scrollState.items.find((u: FollowUser) => u.accountName === accountName)
    return user?.isFollowing || false
  }, [scrollState.items])

  const retryLoad = useCallback(async () => {
    if (scrollState.isInitialLoad || (!scrollState.hasNext && scrollState.items.length === 0)) {
      await loadInitialUsers()
    } else {
      await loadMoreUsers()
    }
  }, [scrollState.isInitialLoad, scrollState.hasNext, scrollState.items.length, loadInitialUsers, loadMoreUsers])

  // ============================================================================
  // 모달이 열릴 때 자동으로 초기 데이터 로드
  // ============================================================================

  useEffect(() => {
    if (isOpen && targetAccountName && scrollState.isInitialLoad && isAuthenticated && user) {
      loadInitialUsers()
    }
  }, [isOpen, targetAccountName, scrollState.isInitialLoad, isAuthenticated, user, loadInitialUsers])

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      loadingRef.current = false
    }
  }, [])

  // ============================================================================
  // 미인증시 안전한 기본값 반환
  // ============================================================================

  if (!isAuthenticated || !user) {
    return {
      // 기본 상태
      isOpen: false,
      modalType: 'followers' as const,
      targetAccountName: '',
      
      // 무한스크롤 데이터
      users: [],
      followStats: null,
      loading: false,
      error: '로그인이 필요합니다.',
      hasNext: false,
      nextCursor: null,
      isLoadingMore: false,
      isInitialLoad: true,
      
      // 모달 제어
      openFollowerModal: () => {},
      openFollowingModal: () => {},
      closeModal: () => {},
      
      // 데이터 관리
      loadInitialUsers: () => Promise.resolve(),
      loadMoreUsers: () => Promise.resolve(),
      refreshUsers: () => Promise.resolve(),
      
      // 팔로우 액션
      followUser: () => Promise.resolve(),
      unfollowUser: () => Promise.resolve(),
      toggleFollow: () => Promise.resolve(),
      
      // 유틸리티
      clearError: () => {},
      getUserByAccountName: () => undefined,
      isUserFollowing: () => false,
      retryLoad: () => Promise.resolve(),
    }
  }

  // ============================================================================
  // 반환 값
  // ============================================================================

  return {
    // 기본 상태
    isOpen,
    modalType,
    targetAccountName,
    
    // 무한스크롤 데이터
    users: scrollState.items,
    followStats,
    loading: scrollState.loading,
    error: scrollState.error,
    hasNext: scrollState.hasNext,
    nextCursor: scrollState.nextCursor,
    isLoadingMore: scrollState.isLoadingMore,
    isInitialLoad: scrollState.isInitialLoad,
    
    // 모달 제어
    openFollowerModal,
    openFollowingModal,
    closeModal,
    
    // 데이터 관리
    loadInitialUsers,
    loadMoreUsers,
    refreshUsers,
    
    // 팔로우 액션
    followUser,
    unfollowUser,
    toggleFollow,
    
    // 유틸리티
    clearError,
    getUserByAccountName,
    isUserFollowing,
    retryLoad,
  }
}

// ============================================================================
// 편의 함수들
// ============================================================================

export const useUserFollowModal = (accountName: string) => {
  const modal = useFollowModal()
  
  return {
    // 기본 상태
    isOpen: modal.isOpen && modal.targetAccountName === accountName,
    users: modal.users,
    followStats: modal.followStats,
    loading: modal.loading,
    error: modal.error,
    hasNext: modal.hasNext,
    isLoadingMore: modal.isLoadingMore,
    
    // 모달 제어
    openFollowers: () => modal.openFollowerModal(accountName),
    openFollowing: () => modal.openFollowingModal(accountName),
    close: modal.closeModal,
    
    // 데이터 관리
    loadMore: modal.loadMoreUsers,
    refresh: modal.refreshUsers,
    retry: modal.retryLoad,
    
    // 팔로우 액션
    follow: (userAccountName: string) => modal.followUser(userAccountName),
    unfollow: (userAccountName: string) => modal.unfollowUser(userAccountName),
    toggle: (userAccountName: string) => modal.toggleFollow(userAccountName),
    
    // 유틸리티
    getUser: modal.getUserByAccountName,
    isFollowing: modal.isUserFollowing,
    clearError: modal.clearError,
  }
}

export const useFollowModalState = () => {
  const modal = useFollowModal()
  const { isAuthenticated } = useAuthStore()
  
  const safeOpenFollowerModal = useCallback((accountName: string) => {
    if (!isAuthenticated) {
      console.warn('로그인이 필요합니다.')
      return false
    }
    modal.openFollowerModal(accountName)
    return true
  }, [isAuthenticated, modal.openFollowerModal])
  
  const safeOpenFollowingModal = useCallback((accountName: string) => {
    if (!isAuthenticated) {
      console.warn('로그인이 필요합니다.')
      return false
    }
    modal.openFollowingModal(accountName)
    return true
  }, [isAuthenticated, modal.openFollowingModal])
  
  return {
    // 상태
    isOpen: modal.isOpen,
    modalType: modal.modalType,
    targetAccountName: modal.targetAccountName,
    isAuthenticated,
    
    // 안전한 모달 제어 (인증 체크 포함)
    openFollowerModal: safeOpenFollowerModal,
    openFollowingModal: safeOpenFollowingModal,
    closeModal: modal.closeModal,
    
    // 데이터
    users: modal.users,
    followStats: modal.followStats,
    loading: modal.loading,
    error: modal.error,
    hasNext: modal.hasNext,
    isLoadingMore: modal.isLoadingMore,
    
    // 액션
    loadMore: modal.loadMoreUsers,
    refresh: modal.refreshUsers,
    followUser: modal.followUser,
    unfollowUser: modal.unfollowUser,
    toggleFollow: modal.toggleFollow,
    
    // 유틸리티
    clearError: modal.clearError,
    getUserByAccountName: modal.getUserByAccountName,
    isUserFollowing: modal.isUserFollowing,
  }
}
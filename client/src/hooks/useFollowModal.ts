// ============================================================================
// src/hooks/useFollowModal.ts - 수정된 버전 (올바른 타입 적용)
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

// 🔧 올바른 API 사용 - 인터셉터가 적용된 axios 인스턴스
import api from '@/lib/axios'

// 🔥 올바른 타입 import
import {
  type FollowCountsResponse,
  type UserProfileResponse,
  type ApiResponse,
} from '@/lib/types/feed'

// ============================================================================
// 백엔드 API 응답 타입 정의 (커서 기반이 아닌 단순 목록)
// ============================================================================

// 🔥 실제 백엔드 팔로우 목록 응답 (커서 기반 X)
interface FollowListResponse {
  users: UserProfileResponse[]
  // 🔥 실제로는 커서 기반이 아닐 수 있음 - 백엔드 확인 필요
  hasNext?: boolean
  nextCursor?: number | null
  // 또는 단순히 전체 목록만 반환할 수도 있음
  totalCount?: number
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
// 백엔드 API 함수들 (안전한 데이터 처리 포함)
// ============================================================================

const followModalAPI = {
  // 팔로워 목록 조회
  getFollowers: async (
    accountName: string,
    limit: number = 20,
    cursor?: number
  ): Promise<FollowListResponse> => {
    try {
      const params: Record<string, any> = { limit }
      if (cursor) params.cursor = cursor

      console.log('🔍 팔로워 목록 API 호출:', { accountName, params })

      const response = await api.get<ApiResponse<UserProfileResponse[]>>(
        `/follows/followers/${accountName}`,
        { params }
      )
      
      console.log('🔍 팔로워 API 응답:', response.data)
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '팔로워 목록 조회에 실패했습니다.')
      }
      
      // 🔥 안전한 데이터 처리
      const users = Array.isArray(response.data.data) ? response.data.data : []
      
      return {
        users,
        hasNext: users.length === limit, // 간단한 hasNext 로직
        nextCursor: users.length > 0 ? users[users.length - 1].userId : null,
        totalCount: users.length
      }
    } catch (error) {
      console.error('❌ 팔로워 목록 조회 실패:', error)
      throw error
    }
  },

  // 팔로잉 목록 조회
  getFollowing: async (
    accountName: string,
    limit: number = 20,
    cursor?: number
  ): Promise<FollowListResponse> => {
    try {
      const params: Record<string, any> = { limit }
      if (cursor) params.cursor = cursor

      console.log('🔍 팔로잉 목록 API 호출:', { accountName, params })

      const response = await api.get<ApiResponse<UserProfileResponse[]>>(
        `/follows/following/${accountName}`,
        { params }
      )
      
      console.log('🔍 팔로잉 API 응답:', response.data)
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '팔로잉 목록 조회에 실패했습니다.')
      }
      
      // 🔥 안전한 데이터 처리
      const users = Array.isArray(response.data.data) ? response.data.data : []
      
      return {
        users,
        hasNext: users.length === limit, // 간단한 hasNext 로직
        nextCursor: users.length > 0 ? users[users.length - 1].userId : null,
        totalCount: users.length
      }
    } catch (error) {
      console.error('❌ 팔로잉 목록 조회 실패:', error)
      throw error
    }
  },

  // 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<FollowCountsResponse> => {
    try {
      const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${accountName}`)
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '팔로우 수 조회에 실패했습니다.')
      }
      
      return response.data.data
    } catch (error) {
      console.error('❌ 팔로우 수 조회 실패:', error)
      throw error
    }
  },

  // 팔로우
  followUser: async (accountName: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>(`/follows/${accountName}`)
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우에 실패했습니다.')
      }
    } catch (error) {
      console.error('❌ 팔로우 실패:', error)
      throw error
    }
  },

  // 언팔로우
  unfollowUser: async (accountName: string): Promise<void> => {
    try {
      const response = await api.delete<ApiResponse<void>>(`/follows/${accountName}`)
      
      if (response.data.error) {
        throw new Error(response.data.message || '언팔로우에 실패했습니다.')
      }
    } catch (error) {
      console.error('❌ 언팔로우 실패:', error)
      throw error
    }
  },

  // 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(`/follows/check/${accountName}`)
      
      if (response.data.error) {
        console.warn('팔로우 상태 확인 실패:', response.data.message)
        return false
      }
      
      return response.data.data ?? false
    } catch (error) {
      console.warn('팔로우 상태 확인 실패:', error)
      return false
    }
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

  // 🔐 미인증시 즉시 리다이렉트 제거 (모달에서는 불필요)
  // useEffect(() => {
  //   if (!isAuthenticated || !user) {
  //     console.warn('🔐 인증되지 않은 사용자')
  //     return
  //   }
  // }, [isAuthenticated, user])

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
      return false
    }
    return true
  }, [isAuthenticated, user])

  // 🔥 안전한 백엔드 UserProfileResponse를 FollowUser 타입으로 변환
  const transformBackendUser = useCallback((backendUser: UserProfileResponse): FollowUser | null => {
    try {
      // 필수 필드 검증
      if (!backendUser || !backendUser.accountName || !backendUser.userName) {
        console.warn('⚠️ 잘못된 사용자 데이터:', backendUser)
        return null
      }

      return {
        id: backendUser.accountName,
        userId: backendUser.userId || 0,
        accountName: backendUser.accountName,
        username: backendUser.userName,
        displayName: backendUser.userName,
        email: backendUser.userEmail || '',
        profileImageUrl: backendUser.profileImage || undefined,
        prettyFace: backendUser.prettyFace || null,
        isFollowing: false
      }
    } catch (error) {
      console.error('❌ 사용자 데이터 변환 실패:', error, backendUser)
      return null
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
  // 커서 기반 무한스크롤 - 초기 로드 (안전한 처리)
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
      console.log(`🔍 ${modalType} 초기 로드 시작:`, targetAccountName)

      let backendResponse: FollowListResponse

      if (modalType === 'followers') {
        backendResponse = await followModalAPI.getFollowers(targetAccountName, 20)
      } else {
        backendResponse = await followModalAPI.getFollowing(targetAccountName, 20)
      }

      console.log('🔍 백엔드 응답:', backendResponse)
      
      // 🔥 안전한 데이터 처리
      if (!backendResponse || !Array.isArray(backendResponse.users)) {
        console.warn('⚠️ 잘못된 API 응답:', backendResponse)
        setScrollState({
          items: [],
          loading: false,
          error: null,
          hasNext: false,
          nextCursor: null,
          isInitialLoad: false,
          isLoadingMore: false
        })
        
        // 빈 통계 설정
        setFollowStats({
          followerCount: 0,
          followingCount: 0
        })
        return
      }

      // 빈 배열인 경우 처리
      if (backendResponse.users.length === 0) {
        console.log('ℹ️ 팔로우 목록이 비어있음')
        setScrollState({
          items: [],
          loading: false,
          error: null,
          hasNext: false,
          nextCursor: null,
          isInitialLoad: false,
          isLoadingMore: false
        })
        
        // 통계 조회
        try {
          const statsResult = await followModalAPI.getFollowCounts(targetAccountName)
          setFollowStats(statsResult)
        } catch (statsError) {
          console.warn('⚠️ 팔로우 통계 로딩 실패:', statsError)
          setFollowStats({
            followerCount: 0,
            followingCount: 0
          })
        }
        return
      }

      // 🔥 안전한 변환 처리
      const transformedUsers = backendResponse.users
        .map(transformBackendUser)
        .filter((user): user is FollowUser => user !== null) // null 값 제거

      console.log('✅ 변환된 사용자 목록:', transformedUsers)

      if (transformedUsers.length === 0) {
        console.warn('⚠️ 변환 후 빈 목록')
        setScrollState({
          items: [],
          loading: false,
          error: '사용자 데이터를 처리할 수 없습니다.',
          hasNext: false,
          nextCursor: null,
          isInitialLoad: false,
          isLoadingMore: false
        })
        return
      }

      // 팔로우 상태 확인 (최대 5개까지만 - 성능 최적화)
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
      const allUsers = [...checkedUsers, ...remainingUsers]

      setScrollState({
        items: allUsers,
        loading: false,
        error: null,
        hasNext: backendResponse.hasNext || false,
        nextCursor: backendResponse.nextCursor || null,
        isInitialLoad: false,
        isLoadingMore: false
      })

      // 팔로우 통계도 함께 조회
      try {
        const statsResult = await followModalAPI.getFollowCounts(targetAccountName)
        setFollowStats(statsResult)
        console.log('✅ 팔로우 통계 로드 성공:', statsResult)
      } catch (statsError) {
        console.warn('⚠️ 팔로우 통계 로딩 실패:', statsError)
        // 기본값으로 설정
        setFollowStats({
          followerCount: modalType === 'followers' ? allUsers.length : 0,
          followingCount: modalType === 'following' ? allUsers.length : 0
        })
      }

      console.log(`✅ ${modalType} 초기 로드 완료:`, allUsers.length, '명')

    } catch (err: any) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      console.error(`❌ ${modalType} 초기 로드 실패:`, err)
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
  // 나머지 함수들은 동일하게 유지... (생략)
  // ============================================================================

  // 커서 기반 무한스크롤 - 더 로드
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

      const transformedUsers = backendResponse.users
        .map(transformBackendUser)
        .filter((user): user is FollowUser => user !== null)

      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        items: [...prev.items, ...transformedUsers],
        isLoadingMore: false,
        hasNext: backendResponse.hasNext || false,
        nextCursor: backendResponse.nextCursor || null
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

  // 새로고침
  const refreshUsers = useCallback(async () => {
    setScrollState(createInitialScrollState<FollowUser>())
    setFollowStats(null)
    await loadInitialUsers()
  }, [loadInitialUsers])

  // 팔로우/언팔로우 액션 (낙관적 업데이트)
  const followUser = useCallback(async (accountName: string) => {
    if (!checkAuth()) return

    try {
      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        items: prev.items.map((user: FollowUser) => 
          user.accountName === accountName 
            ? { ...user, isFollowing: true }
            : user
        )
      }))

      await followModalAPI.followUser(accountName)

      if (followStats && modalType === 'followers') {
        setFollowStats((prev: FollowModalStats | null) => prev ? {
          ...prev,
          followerCount: prev.followerCount + 1
        } : null)
      }

    } catch (err: any) {
      console.error('팔로우 실패:', err)
      
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
    if (!checkAuth()) return

    try {
      setScrollState((prev: FollowScrollState<FollowUser>) => ({
        ...prev,
        items: prev.items.map((user: FollowUser) => 
          user.accountName === accountName 
            ? { ...user, isFollowing: false }
            : user
        )
      }))

      await followModalAPI.unfollowUser(accountName)

      if (followStats && modalType === 'followers') {
        setFollowStats((prev: FollowModalStats | null) => prev ? {
          ...prev,
          followerCount: Math.max(0, prev.followerCount - 1)
        } : null)
      }

    } catch (err: any) {
      console.error('언팔로우 실패:', err)
      
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

  // 모달 제어
  const openFollowerModal = useCallback((accountName: string) => {
    if (!checkAuth()) return

    setTargetAccountName(accountName)
    setModalType('followers')
    setIsOpen(true)
    setScrollState(createInitialScrollState<FollowUser>())
    setFollowStats(null)
  }, [checkAuth])

  const openFollowingModal = useCallback((accountName: string) => {
    if (!checkAuth()) return

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
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    loadingRef.current = false
  }, [])

  // 유틸리티 함수들
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

  // 모달이 열릴 때 자동으로 초기 데이터 로드
  useEffect(() => {
    if (isOpen && targetAccountName && scrollState.isInitialLoad && isAuthenticated && user) {
      loadInitialUsers()
    }
  }, [isOpen, targetAccountName, scrollState.isInitialLoad, isAuthenticated, user, loadInitialUsers])

  // Cleanup
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
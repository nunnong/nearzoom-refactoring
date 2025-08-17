import { create } from 'zustand'

import type { AuthState, User } from '@/types/auth'
import { API_ENDPOINTS } from '@/constants/api'
import { api } from '@/lib/api'
import { tokenStorage, sessionManager, userTransformer } from '@/lib/auth'

interface AuthActions {
  setTokens: ({ accessToken }: { accessToken: string | null }) => void
  setUser: (user: User) => void
  setLoading: (isLoading: boolean) => void
  clearTokens: () => void
  initializeAuth: () => Promise<void>
  loadUserInfoInBackground: (token: string) => Promise<void>
  logout: () => Promise<void>
  logoutDueToInactivity: () => void
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // 상태
  accessToken: null,
  user: null,
  isLoading: false,
  isAuthenticated: false,

  setTokens: ({ accessToken }) => {
    set({
      accessToken,
      isAuthenticated: !!accessToken,
    })

    if (typeof window !== 'undefined') {
      if (accessToken) {
        tokenStorage.save(accessToken)
        sessionManager.saveTimestamp()
      } else {
        tokenStorage.remove()
        sessionManager.removeTimestamp()
      }
    }
  },

  setUser: user => {
    set({ user })
  },

  setLoading: isLoading => {
    set({ isLoading })
  },

  clearTokens: () => {
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    })

    if (typeof window !== 'undefined') {
      tokenStorage.remove()
      sessionManager.removeTimestamp()
    }
  },

  // 앱 시작 시 토큰 복원 및 검증
  initializeAuth: async () => {
    if (typeof window === 'undefined') return

    const startTime = performance.now()
    console.log('🚀 인증 초기화 시작:', new Date().toISOString())

    // 먼저 세션이 만료되었는지 확인
    if (sessionManager.isExpired()) {
      console.log('⏰ 세션이 만료됨, 자동 로그아웃')
      get().clearTokens()
      return
    }

    const tokenStartTime = performance.now()
    const savedToken = tokenStorage.get()
    const tokenEndTime = performance.now()
    console.log(
      `🔑 토큰 복원 시간: ${(tokenEndTime - tokenStartTime).toFixed(2)}ms`
    )

    if (!savedToken) {
      console.log('❌ 저장된 토큰 없음')
      set({ isLoading: false })
      return
    }

    // 🚀 1단계: 토큰만 먼저 설정 (즉시 인증 완료)
    console.log('✅ 토큰 발견, 즉시 인증 상태 설정')
    set({
      accessToken: savedToken,
      isAuthenticated: true,
      isLoading: false,
    })

    const tokenSetupTime = performance.now()
    console.log(
      `⚡ 토큰 설정 완료 시간: ${(tokenSetupTime - startTime).toFixed(2)}ms`
    )

    // 🚀 2단계: 백그라운드에서 사용자 정보 로드 (비동기)
    console.log('🔄 백그라운드에서 사용자 정보 로드 시작')
    get().loadUserInfoInBackground(savedToken)
  },

  // 백그라운드에서 사용자 정보 로드 (새로 추가)
  loadUserInfoInBackground: async (token: string) => {
    try {
      const userApiStartTime = performance.now()
      console.log('📡 사용자 정보 API 호출 시작')

      // 🚀 강제 타임아웃 구현 (10초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('사용자 정보 API 호출 타임아웃 (10초)'))
        }, 10000)
      })

      const apiPromise = api.get(API_ENDPOINTS.USER_INFO)

      // 🚀 경쟁: API 응답 vs 타임아웃
      const userResponse = (await Promise.race([
        apiPromise,
        timeoutPromise,
      ])) as any

      const userApiEndTime = performance.now()
      console.log(
        `📡 사용자 정보 API 응답 시간: ${(userApiEndTime - userApiStartTime).toFixed(2)}ms`
      )

      const rawData = userResponse.data.data || userResponse.data
      const userData = userTransformer.fromBackend(rawData)

      console.log('👤 사용자 정보 변환 완료:', userData.name || userData.email)

      // 사용자 정보만 업데이트 (인증 상태는 이미 true)
      set({ user: userData })

      const totalTime = performance.now()
      console.log(
        `🎉 백그라운드 사용자 정보 로드 완료! API 소요시간: ${(userApiEndTime - userApiStartTime).toFixed(2)}ms`
      )
    } catch (error: any) {
      console.error('❌ 백그라운드 사용자 정보 로드 실패:', error)

      // 🚀 타임아웃 에러 처리
      if (error.message?.includes('타임아웃')) {
        console.warn(
          '⚠️ 사용자 정보 API 타임아웃 - 인증 상태는 유지하되 사용자 정보는 로드 실패'
        )
        // 타임아웃 시에도 인증 상태는 유지
      } else {
        console.warn('⚠️ 사용자 정보 로드 실패했지만 인증 상태는 유지됨')
      }
    }
  },

  // 일반적인 로그아웃
  logout: async () => {
    try {
      // 서버에 로그아웃 요청 (refresh token 무효화)
      await api.post(API_ENDPOINTS.LOGOUT)
    } catch (error) {
    } finally {
      get().clearTokens()
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  },

  // 비활성화로 인한 자동 로그아웃
  logoutDueToInactivity: async () => {
    const state = get()

    // 이미 로그아웃 상태라면 중복 실행 방지
    if (!state.isAuthenticated) {
      return
    }

    try {
      // 서버에 로그아웃 요청하여 쿠키 삭제
      await api.post(API_ENDPOINTS.LOGOUT)
    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error)
    }

    get().clearTokens()
    if (typeof window !== 'undefined') {
      alert('2시간 동안 활동이 없어 자동으로 로그아웃되었습니다.')
      window.location.href = '/'
    }
  },
}))

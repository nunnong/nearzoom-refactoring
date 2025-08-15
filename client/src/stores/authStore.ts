import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'

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
  logout: () => Promise<void>
  logoutDueToInactivity: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
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

    // 먼저 세션이 만료되었는지 확인
    if (sessionManager.isExpired()) {
      console.log('세션이 만료됨, 자동 로그아웃')
      get().logoutDueToInactivity()
      return
    }

    const savedToken = tokenStorage.get()
    if (!savedToken) {
      set({ isLoading: false })
      return
    }

    set({ accessToken: savedToken, isLoading: true })

    try {
      // 토큰이 유효한지 사용자 정보로 검증
      const userResponse = await api.get(API_ENDPOINTS.USER_INFO)
      
      const rawData = userResponse.data.data || userResponse.data
      const userData = userTransformer.fromBackend(rawData)
      
      set({
        user: userData,
        isAuthenticated: true,
      })
    } catch (error) {
      get().clearTokens()
    } finally {
      set({ isLoading: false })
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
    })),
    {
      name: 'auth-store', // DevTools에서 표시될 이름
    }
  )
)

import { create } from 'zustand'
import type { AuthState, User } from '@/types/auth'
import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/constants/api'
import {
  saveAccessToken,
  getAccessToken,
  removeAccessToken,
} from '@/utils/localStorage'

interface AuthActions {
  setTokens: ({ accessToken }: { accessToken: string }) => void
  setUser: (user: User) => void
  setLoading: (isLoading: boolean) => void
  clearTokens: () => void
  initializeAuth: () => Promise<void>
  logout: () => Promise<void>
  logoutDueToInactivity: () => void
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // 상태
  accessToken: null,
  user: null,
  isLoading: false,
  isAuthenticated: false,

  // 액션들
  setTokens: ({ accessToken }) => {
    set({
      accessToken,
      isAuthenticated: !!accessToken,
    })

    if (typeof window !== 'undefined') {
      saveAccessToken(accessToken)
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
      removeAccessToken()
    }
  },

  // 앱 시작 시 토큰 복원 및 검증
  initializeAuth: async () => {
    if (typeof window === 'undefined') return

    const savedToken = getAccessToken()
    if (!savedToken) {
      set({ isLoading: false })
      return
    }

    set({ accessToken: savedToken, isLoading: true })

    try {
      // 토큰이 유효한지 사용자 정보로 검증
      const userResponse = await api.get(API_ENDPOINTS.USER_INFO)
      set({
        user: userResponse.data,
        isAuthenticated: true,
      })
    } catch (error) {
      console.error('토큰 검증 실패:', error)
      get().clearTokens()
    } finally {
      set({ isLoading: false })
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      // 서버에 로그아웃 요청 (refresh token 무효화)
      await api.post(API_ENDPOINTS.LOGOUT)
    } catch (error) {
      console.error('로그아웃 요청 실패:', error)
    } finally {
      get().clearTokens()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  },

  // 비활성화로 인한 로그아웃
  logoutDueToInactivity: () => {
    get().clearTokens()
    if (typeof window !== 'undefined') {
      alert('2시간 동안 활동이 없어 자동으로 로그아웃되었습니다.')
      window.location.href = '/'
    }
  },
}))

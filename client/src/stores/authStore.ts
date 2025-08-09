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
    console.log('setTokens 호출됨, 토큰:', accessToken)
    set({
      accessToken,
      isAuthenticated: !!accessToken,
    })
    console.log('상태 업데이트 완료, isAuthenticated:', !!accessToken)

    if (typeof window !== 'undefined') {
      saveAccessToken(accessToken)
      console.log('localStorage에 토큰 저장 완료')
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
    console.log('initializeAuth 시작')
    if (typeof window === 'undefined') return

    const savedToken = getAccessToken()
    console.log('저장된 토큰:', savedToken)
    if (!savedToken) {
      console.log('저장된 토큰이 없음')
      set({ isLoading: false })
      return
    }

    set({ accessToken: savedToken, isLoading: true })
    console.log('토큰 설정됨, 사용자 정보 검증 시작')

    try {
      // 토큰이 유효한지 사용자 정보로 검증
      const userResponse = await api.get(API_ENDPOINTS.USER_INFO)
      console.log('사용자 정보 응답:', userResponse.data)
      set({
        user: userResponse.data,
        isAuthenticated: true,
      })
      console.log('로그인 상태로 설정됨')
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
        window.location.href = '/'
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

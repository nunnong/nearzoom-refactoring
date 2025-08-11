import type { SocialType, TokenResponse } from '@/types/auth'
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api'
import { api } from '@/lib/api'

export const authService = {
  // 소셜 로그인 URL 생성
  getSocialLoginUrl: (provider: SocialType): string => {
    const providerLower = provider.toLowerCase()
    return `${API_BASE_URL}/oauth2/authorization/${providerLower}`
  },

  // Access Token 갱신
  refreshToken: async (): Promise<TokenResponse> => {
    const response = await api.post(API_ENDPOINTS.REFRESH)
    return response.data
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    await api.post(API_ENDPOINTS.LOGOUT)
  },

  // 토큰 검증 -> 앱 시작할 때
  validateToken: async () => {
    const response = await api.get(API_ENDPOINTS.USER_INFO)
    return response.data
  },
}

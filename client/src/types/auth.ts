// 소셜 로그인 타입
export type SocialType = 'GOOGLE' | 'KAKAO'

// 사용자 정보 타입
export interface User {
  id: number
  name: string
  email: string
  profileImage?: string
  socialType: SocialType
  createdAt: string
  updatedAt: string
}

// 인증 상태 타입
export interface AuthState {
  accessToken: string | null
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

// 토큰 응답 타입
export interface TokenResponse {
  accessToken: string
}

// 로그인 응답 타입
export interface LoginResponse {
  user: User
  accessToken: string
}

// API 에러 타입
export interface ApiError {
  message: string
  code?: string
  status?: number
}

/**
 * 인증 관련 유틸리티 함수들
 */

export interface UserInfo {
  id: string
  email: string
  name: string
  provider: 'kakao' | 'google'
  profileImage?: string
  accessToken: string
  refreshToken?: string
}

// 로컬스토리지 키 상수
const AUTH_KEYS = {
  USER_INFO: 'userInfo',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  IS_LOGGED_IN: 'isLoggedIn',
  USER_SELFIE: 'userSelfie',
  REFERENCE_IMAGE: 'referenceImage',
  IMAGES: 'images'
} as const

/**
 * 사용자 로그인 처리
 */
export const setUserAuth = (userInfo: UserInfo): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(AUTH_KEYS.USER_INFO, JSON.stringify(userInfo))
    localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, userInfo.accessToken)
    localStorage.setItem(AUTH_KEYS.IS_LOGGED_IN, 'true')
    
    if (userInfo.refreshToken) {
      localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, userInfo.refreshToken)
    }

    console.log('✅ User authentication set successfully')
  } catch (error) {
    console.error('❌ Failed to set user authentication:', error)
  }
}

/**
 * 사용자 로그아웃 처리 - 모든 인증 관련 데이터 삭제
 */
export const clearUserAuth = (): void => {
  if (typeof window === 'undefined') return

  try {
    // 인증 관련 데이터 삭제
    localStorage.removeItem(AUTH_KEYS.USER_INFO)
    localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(AUTH_KEYS.IS_LOGGED_IN)
    
    // 사용자 개인 데이터 삭제
    localStorage.removeItem(AUTH_KEYS.USER_SELFIE)
    localStorage.removeItem(AUTH_KEYS.REFERENCE_IMAGE)
    localStorage.removeItem(AUTH_KEYS.IMAGES)

    console.log('✅ User authentication cleared successfully')
  } catch (error) {
    console.error('❌ Failed to clear user authentication:', error)
  }
}

/**
 * 로그인 상태 확인
 */
export const isLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false

  try {
    const loginStatus = localStorage.getItem(AUTH_KEYS.IS_LOGGED_IN)
    const userInfo = localStorage.getItem(AUTH_KEYS.USER_INFO)
    const accessToken = localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN)
    
    return loginStatus === 'true' && !!userInfo && !!accessToken
  } catch (error) {
    console.error('❌ Failed to check login status:', error)
    return false
  }
}

/**
 * 현재 사용자 정보 가져오기
 */
export const getCurrentUser = (): UserInfo | null => {
  if (typeof window === 'undefined') return null

  try {
    const userInfoStr = localStorage.getItem(AUTH_KEYS.USER_INFO)
    if (!userInfoStr) return null

    return JSON.parse(userInfoStr) as UserInfo
  } catch (error) {
    console.error('❌ Failed to get current user:', error)
    return null
  }
}

/**
 * 액세스 토큰 가져오기
 */
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null

  try {
    return localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN)
  } catch (error) {
    console.error('❌ Failed to get access token:', error)
    return null
  }
}

/**
 * 토큰 갱신
 */
export const updateTokens = (accessToken: string, refreshToken?: string): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, accessToken)
    
    if (refreshToken) {
      localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, refreshToken)
    }

    // 사용자 정보의 토큰도 업데이트
    const userInfo = getCurrentUser()
    if (userInfo) {
      const updatedUserInfo = {
        ...userInfo,
        accessToken,
        refreshToken: refreshToken || userInfo.refreshToken
      }
      localStorage.setItem(AUTH_KEYS.USER_INFO, JSON.stringify(updatedUserInfo))
    }

    console.log('✅ Tokens updated successfully')
  } catch (error) {
    console.error('❌ Failed to update tokens:', error)
  }
}

/**
 * 소셜 로그인 처리 (카카오)
 */
export const handleKakaoLogin = async (): Promise<boolean> => {
  try {
    // TODO: 실제 카카오 로그인 API 호출
    console.log('🟡 Kakao login initiated')
    
    // 임시 데이터 (실제로는 API 응답에서 받아옴)
    const mockUserInfo: UserInfo = {
      id: 'kakao_' + Date.now(),
      email: 'user@kakao.com',
      name: '카카오 사용자',
      provider: 'kakao',
      profileImage: '',
      accessToken: 'kakao_access_token_' + Date.now(),
      refreshToken: 'kakao_refresh_token_' + Date.now()
    }

    setUserAuth(mockUserInfo)
    return true
  } catch (error) {
    console.error('❌ Kakao login failed:', error)
    return false
  }
}

/**
 * 소셜 로그인 처리 (구글)
 */
export const handleGoogleLogin = async (): Promise<boolean> => {
  try {
    // TODO: 실제 구글 로그인 API 호출
    console.log('🔵 Google login initiated')
    
    // 임시 데이터 (실제로는 API 응답에서 받아옴)
    const mockUserInfo: UserInfo = {
      id: 'google_' + Date.now(),
      email: 'user@gmail.com',
      name: '구글 사용자',
      provider: 'google',
      profileImage: '',
      accessToken: 'google_access_token_' + Date.now(),
      refreshToken: 'google_refresh_token_' + Date.now()
    }

    setUserAuth(mockUserInfo)
    return true
  } catch (error) {
    console.error('❌ Google login failed:', error)
    return false
  }
}
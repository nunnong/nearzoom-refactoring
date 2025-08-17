import axios from 'axios'
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api'
import type { ApiError } from '@/types/auth'
import { useAuthStore } from '@/stores/authStore'

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // 쿠키 포함
})

// 요청 인터셉터
api.interceptors.request.use(
  config => {
    // zustand에서 access token 가져오기
    if (typeof window !== 'undefined') {
      const { accessToken } = useAuthStore.getState()
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Refresh Token으로 Access Token 갱신
        const response = await axios.post(
          `${API_BASE_URL}${API_ENDPOINTS.REFRESH}`,
          {},
          { withCredentials: true }
        )

        const newAccessToken = response.data.accessToken

        // zustand store와 localStorage 업데이트
        if (typeof window !== 'undefined') {
          const { setTokens } = useAuthStore.getState()
          setTokens({ accessToken: newAccessToken })
        }

        // 원본 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api.request(originalRequest)
      } catch (refreshError) {
        // Refresh Token도 만료된 경우
        if (typeof window !== 'undefined') {
          const { clearTokens } = useAuthStore.getState()
          clearTokens()
          // 개발 환경에서는 강제 리다이렉트 대신 오류만 전달
          if (process.env.NODE_ENV !== 'development') {
            window.location.href = '/'
          }
        }
        return Promise.reject(refreshError)
      }
    }

    // 에러 형태 통일
    const apiError: ApiError = {
      message: error.response?.data?.message || '오류가 발생했습니다.',
      code: error.response?.data?.code,
      status: error.response?.status,
    }

    return Promise.reject(apiError)
  }
)

export default api

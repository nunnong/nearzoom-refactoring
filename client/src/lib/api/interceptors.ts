import axios from 'axios'
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api'
import type { ApiError } from '@/types/auth'
import { tokenStorage } from '@/lib/auth'
import api from './client'

// 요청 인터셉터
api.interceptors.request.use(
  config => {
    if (typeof window !== 'undefined') {
      const accessToken = tokenStorage.get()
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
        const response = await axios.post(
          `${API_BASE_URL}${API_ENDPOINTS.REFRESH}`,
          {},
          { withCredentials: true }
        )

        const newAccessToken = response.data.accessToken

        if (typeof window !== 'undefined') {
          tokenStorage.save(newAccessToken)
          
          // 스토어 업데이트 이벤트 발생
          window.dispatchEvent(new CustomEvent('token-refreshed', {
            detail: { accessToken: newAccessToken }
          }))
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api.request(originalRequest)
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          tokenStorage.remove()
          window.dispatchEvent(new CustomEvent('auth-logout'))
          window.location.href = '/'
        }
        return Promise.reject(refreshError)
      }
    }

    const apiError: ApiError = {
      message: error.response?.data?.message || '오류가 발생했습니다.',
      code: error.response?.data?.code,
      status: error.response?.status,
    }

    return Promise.reject(apiError)
  }
)
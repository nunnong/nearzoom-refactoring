import axios from 'axios'
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api'
import { tokenStorage } from '@/lib/auth'
import api from './client'

// �� 타임아웃 설정 (마이룸 API는 훨씬 긴 타임아웃 허용)
const TIMEOUT_MS = 15000 // 15초로 증가
const MYROOM_TIMEOUT_MS = 30000 // 마이룸 API는 30초
const MYROOM_PHOTOS_TIMEOUT_MS = 45000 // 마이룸 사진 API는 45초

// 요청 인터셉터
api.interceptors.request.use(
  config => {
    if (typeof window !== 'undefined') {
      const accessToken = tokenStorage.get()
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
    }

    // 🚀 마이룸 API는 더 긴 타임아웃 허용
    if (config.url?.includes('/myroom/photos')) {
      config.timeout = MYROOM_PHOTOS_TIMEOUT_MS
      console.log(
        '📸 마이룸 사진 API 타임아웃 설정:',
        MYROOM_PHOTOS_TIMEOUT_MS,
        'ms'
      )
    } else if (config.url?.includes('/myroom')) {
      config.timeout = MYROOM_TIMEOUT_MS
      console.log('🏠 마이룸 API 타임아웃 설정:', MYROOM_TIMEOUT_MS, 'ms')
    } else {
      config.timeout = TIMEOUT_MS
      console.log('🌐 일반 API 타임아웃 설정:', TIMEOUT_MS, 'ms')
    }

    // 🚀 추가 타임아웃 보장
    if (config.signal) {
      const controller = new AbortController()
      let timeout: number

      if (config.url?.includes('/myroom/photos')) {
        timeout = MYROOM_PHOTOS_TIMEOUT_MS
      } else if (config.url?.includes('/myroom')) {
        timeout = MYROOM_TIMEOUT_MS
      } else {
        timeout = TIMEOUT_MS
      }

      setTimeout(() => controller.abort(), timeout)
      config.signal = controller.signal
    }

    return config
  },
  error => {
    console.error('❌ 요청 인터셉터 에러:', error)
    return Promise.reject(error)
  }
)

// 응답 인터셉터
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    // 🚀 상세한 에러 정보 로깅
    console.error('🚨 API 인터셉터 에러 상세 정보:', {
      error,
      errorType: typeof error,
      errorKeys: error ? Object.keys(error) : 'undefined',
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStatus: error?.response?.status,
      errorResponse: error?.response?.data,
      errorConfig: error?.config,
      url: error?.config?.url,
      method: error?.config?.method,
    })

    // 🚀 타임아웃 에러 처리
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('⏰ API 요청 타임아웃:', error.config?.url)

      // 🚀 원본 에러 정보를 보존한 타임아웃 에러
      const timeoutError = new Error(
        '요청 시간이 초과되었습니다. 다시 시도해주세요.'
      )
      ;(timeoutError as any).code = 'TIMEOUT'
      ;(timeoutError as any).status = 408
      ;(timeoutError as any).originalError = error // 원본 에러 보존
      ;(timeoutError as any).config = error.config

      return Promise.reject(timeoutError)
    }

    // 🚀 네트워크 에러 처리
    if (!error.response) {
      console.error('🌐 네트워크 에러:', error)

      // 🚀 원본 에러 정보를 보존한 네트워크 에러
      const networkError = new Error('네트워크 연결을 확인해주세요.')
      ;(networkError as any).code = 'NETWORK_ERROR'
      ;(networkError as any).status = 0
      ;(networkError as any).originalError = error // 원본 에러 보존
      ;(networkError as any).config = error.config

      return Promise.reject(networkError)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        console.log('🔄 토큰 갱신 시도...')
        const refreshStartTime = performance.now()

        const response = await axios.post(
          `${API_BASE_URL}${API_ENDPOINTS.REFRESH}`,
          {},
          {
            withCredentials: true,
            timeout: TIMEOUT_MS, // 토큰 갱신도 타임아웃 설정
          }
        )

        const refreshEndTime = performance.now()
        console.log(
          `✅ 토큰 갱신 성공: ${(refreshEndTime - refreshStartTime).toFixed(2)}ms`
        )

        const newAccessToken = response.data.accessToken

        if (typeof window !== 'undefined') {
          tokenStorage.save(newAccessToken)

          // 스토어 업데이트 이벤트 발생
          window.dispatchEvent(
            new CustomEvent('token-refreshed', {
              detail: { accessToken: newAccessToken },
            })
          )
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api.request(originalRequest)
      } catch (refreshError) {
        console.error('❌ 토큰 갱신 실패:', refreshError)

        // 🚀 빠른 실패 처리
        if (typeof window !== 'undefined') {
          tokenStorage.remove()
          window.dispatchEvent(new CustomEvent('auth-logout'))

          // 즉시 로그인 페이지로 리다이렉트
          setTimeout(() => {
            window.location.href = '/'
          }, 100)
        }
        return Promise.reject(refreshError)
      }
    }

    // 🚀 기타 HTTP 에러 처리
    const apiError = new Error(error.response?.data?.message || '오류가 발생했습니다.')
    ;(apiError as any).code = error.response?.data?.code
    ;(apiError as any).status = error.response?.status
    ;(apiError as any).originalError = error // 원본 에러 보존
    ;(apiError as any).config = error.config
    ;(apiError as any).response = error.response?.data

    // 🚀 에러 로깅
    console.error(`❌ API 에러 [${error.response?.status}]:`, {
      url: error.config?.url,
      method: error.config?.method,
      error: apiError,
      response: error.response?.data,
    })

    return Promise.reject(apiError)
  }
)

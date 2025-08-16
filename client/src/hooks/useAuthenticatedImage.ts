import { useState, useEffect } from 'react'
import api from '@/lib/axios'
import { API_ENDPOINTS } from '@/constants/api'

interface UseAuthenticatedImageResult {
  imageSrc: string | null
  loading: boolean
  error: string | null
}

export const useAuthenticatedImage = (
  photoId: string
): UseAuthenticatedImageResult => {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Photo ID로 링크 가져오기
  useEffect(() => {
    if (!photoId) {
      setError('Photo ID가 필요합니다.')
      setLoading(false)
      return
    }

    const fetchImage = async () => {
      try {
        setLoading(true)
        setError(null)

        // 인증이 포함된 이미지 요청
        const response = await api.get(`${API_ENDPOINTS.PHOTOS}/${photoId}`, {
          responseType: 'blob', // 이미지 데이터를 blob으로 받기
          timeout: 15000, // 15초 타임아웃
        })

        // Blob을 Object URL로 변환
        const imageBlob = response.data
        const imageObjectURL = URL.createObjectURL(imageBlob)

        setImageSrc(imageObjectURL)

        // 메모리 누수 방지를 위해 cleanup 등록
        return () => {
          if (imageObjectURL) {
            URL.revokeObjectURL(imageObjectURL)
          }
        }
      } catch (err: any) {
        console.error('이미지 로드 실패:', {
          error: err,
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
          config: err?.config,
          photoId,
        })

        // 에러 타입별 처리
        if (err.response?.status === 401) {
          setError('로그인이 필요합니다.')
        } else if (err.response?.status === 403) {
          setError('접근 권한이 없습니다.')
        } else if (err.response?.status === 404) {
          setError('이미지를 찾을 수 없습니다.')
        } else if (err.response?.status === 502) {
          setError('이미지 서버에 일시적 문제가 발생했습니다.')
        } else if (err.code === 'ECONNABORTED') {
          setError('이미지 로드 시간이 초과되었습니다.')
        } else {
          setError('이미지를 불러오는데 실패했습니다.')
        }
      } finally {
        setLoading(false)
      }
    }

    let cleanup: (() => void) | undefined

    fetchImage().then(cleanupFn => {
      cleanup = cleanupFn
    })

    // cleanup 함수 반환
    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [photoId])

  return {
    imageSrc,
    loading,
    error,
  }
}

// hooks/useAuthenticatedImage.ts
import { useState, useEffect } from 'react'
import api from '@/lib/axios'

export const useAuthenticatedImage = (photoId: string) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!photoId) return

    const loadImage = async () => {
      try {
        setLoading(true)
        setError(false)

        console.log('🔄 이미지 로딩 시작:', photoId)
        console.log('📤 요청 URL:', `/myroom/image/${photoId}`)

        // 현재 인증 상태 확인
        const { useAuthStore } = await import('@/stores/authStore')
        const authState = useAuthStore.getState()
        console.log('🔑 인증 상태:', {
          isAuthenticated: authState.isAuthenticated,
          hasToken: !!authState.accessToken,
          tokenPreview: authState.accessToken?.substring(0, 20) + '...'
        })

        // 인증된 API 요청으로 이미지 바이너리 가져오기 (자동으로 Bearer 토큰 포함)
        const response = await api.get(`/myroom/image/${photoId}`, {
          responseType: 'blob' // 바이너리 데이터로 받기
        })

        console.log('✅ 응답 성공:', response.status)

        // Blob을 URL로 변환
        const imageBlob = response.data
        const imageUrl = URL.createObjectURL(imageBlob)
        
        setImageSrc(imageUrl)
      } catch (err: any) {
        console.error('이미지 로드 실패 - 상세 정보:')
        console.error('photoId:', photoId)
        console.error('요청 URL:', `/myroom/image/${photoId}`)
        console.error('에러 객체:', err)
        console.error('응답 상태:', err?.response?.status)
        console.error('응답 데이터:', err?.response?.data)
        console.error('에러 메시지:', err?.message)
        console.error('네트워크 에러:', err?.code)
        
        if (err.response?.status === 401) {
          console.warn('이미지 접근 권한 없음:', photoId)
        } else if (err.response?.status === 404) {
          console.warn('이미지를 찾을 수 없음:', photoId)
        }
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadImage()

    // 컴포넌트 언마운트 시 메모리 정리
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [photoId])

  return { imageSrc, loading, error }
}
'use client'

import Dashboard from '@/components/page/myroom/Dashboard'
import { useAuth } from '@/hooks/auth'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface ImageItem {
  id: string
  src: string
  alt: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
}

export default function MyRoom() {
  const { user, isAuthenticated } = useAuth()
  const [userImages, setUserImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()


  // 참조 사진 확인은 UploadSelfie 버튼 클릭 시에만 수행
  // 마이룸 진입은 항상 허용

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchUserImages = async () => {
      try {
        setLoading(true)
        
        // 백엔드에서 사용자별 이미지 데이터 가져오기
        const response = await api.get('/myroom/photos')
        
        // API 응답을 ImageItem 형식으로 변환
        const images = response.data.data?.map((item: any) => ({
          id: item.id || item.photoId,
          src: item.imageUrl || item.url,
          alt: item.title || `${user?.name}의 사진`,
          isLiked: item.isLiked || false,
          isEdited: item.isEdited || false,
          hashtags: item.hashtags || []
        })) || []

        setUserImages(images)
      } catch (error: any) {
        // 404나 데이터 없음 에러는 정상적인 상황으로 처리
        
        // 에러 시 빈 배열로 설정
        setUserImages([])
      } finally {
        setLoading(false)
      }
    }

    fetchUserImages()
  }, [isAuthenticated, user])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">로그인이 필요합니다.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  return <Dashboard images={userImages} userProfile={user} />
}
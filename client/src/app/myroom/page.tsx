'use client'

import Dashboard from '@/components/page/myroom/Dashboard'
import { useAuth } from '@/hooks/auth'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { myroomService, MyPhotoListCondition } from '@/services/myroomService'

interface ImageItem {
  id: string
  src: string
  alt: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
}

export default function MyRoom() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [userImages, setUserImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const router = useRouter()

  const fetchUserImages = async (condition: MyPhotoListCondition = {}) => {
    try {
      setLoading(true)
      
      // 기본값 설정
      const params: MyPhotoListCondition = {
        limit: 20,
        ...condition
      }
      
      // 백엔드에서 사용자별 이미지 데이터 가져오기
      const response = await myroomService.getPhotos(params)
      
      // API 응답을 ImageItem 형식으로 변환
      const images = response.photos?.map((item) => ({
        id: item.photoId.toString(),
        src: item.imageUrl,
        alt: item.title || `${user?.name}의 사진`,
        isLiked: item.isLiked,
        isEdited: item.isEdited,
        hashtags: item.hashtags || []
      })) || []

      setUserImages(images)
      setNextCursor(response.nextCursor || null)
      setHasMore(response.hasNext)
    } catch (error: any) {
      console.error('Failed to fetch images:', error)
      setUserImages([])
    } finally {
      setLoading(false)
    }
  }

  const loadMoreImages = async () => {
    if (!hasMore || !nextCursor) return

    try {
      const response = await myroomService.getPhotos({
        cursor: nextCursor,
        limit: 20
      })
      
      const newImages = response.photos?.map((item) => ({
        id: item.photoId.toString(),
        src: item.imageUrl,
        alt: item.title || `${user?.name}의 사진`,
        isLiked: item.isLiked,
        isEdited: item.isEdited,
        hashtags: item.hashtags || []
      })) || []

      setUserImages(prev => [...prev, ...newImages])
      setNextCursor(response.nextCursor || null)
      setHasMore(response.hasNext)
    } catch (error) {
      console.error('Failed to load more images:', error)
    }
  }

  useEffect(() => {
    // 인증 로딩이 완료되고 로그인된 상태일 때만 이미지 가져오기
    if (!authLoading && isAuthenticated && user) {
      fetchUserImages()
    }
  }, [authLoading, isAuthenticated, user?.id])

  // 인증 로딩 중이거나 사용자 정보가 없을 때
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

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
          <p className="text-gray-600">사진을 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  return (
    <Dashboard 
      images={userImages} 
      userProfile={user}
      onRefresh={fetchUserImages}
      onLoadMore={loadMoreImages}
      hasMore={hasMore}
    />
  )
}
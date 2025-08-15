'use client'


import Dashboard from '@/components/page/myroom/Dashboard'
import { useAuth } from '@/hooks/auth'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { myroomService, MyPhotoListCondition } from '@/services/myroomService'


interface ImageItem {
  photoId: string
  imgUrl: string
  isLiked?: boolean
  isEdited?: boolean
  editable?: number         
  hashtags?: string[]
  createdAt?: string        
  partnerEmails?: string    
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
      const images = response.photos?.map((item) => {
        const converted = {
          photoId: item.photoId.toString(),
          imgUrl: item.imageUrl,
          isLiked: Boolean(item.heart), // 0/1 → false/true 변환
          isEdited: (item.editable ?? true) === false,
          editable: item.editable ? 1 : 0, // true → 1, false → 0 변환
          hashtags: [],
          createdAt: item.createdAt,
          partnerEmails: item.partnerEmails
        }
        return converted
      }) || []

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
        photoId: item.photoId.toString(),
        imgUrl: item.imageUrl,
        isLiked: Boolean(item.heart), // 0/1 → false/true 변환
        isEdited: (item.editable ?? true) === false,
        editable: item.editable ? 1 : 0, // true → 1, false → 0 변환
        hashtags: [],
        createdAt: item.createdAt,
        partnerEmails: item.partnerEmails
      })) || []

      setUserImages(prev => [...prev, ...newImages])
      setNextCursor(response.nextCursor || null)
      setHasMore(response.hasNext)
    } catch (error) {
      console.error('Failed to load more images:', error)
    }
  }

  const handleLike = async (photoId: string): Promise<void> => {
    try {
      const targetImage = userImages.find(img => img.photoId === photoId)
      if (!targetImage) {
        console.error('❌ 이미지를 찾을 수 없음:', photoId)
        return
      }
      
      const newIsLiked = !targetImage.isLiked
      console.log('🔥 하트 상태 변경 시도:', { photoId, currentLiked: targetImage.isLiked, newLiked: newIsLiked })

      await myroomService.updateHeart({
        photoId: parseInt(photoId),
        heart: newIsLiked
      })

      setUserImages(prevImages =>
        prevImages.map(img =>
          img.photoId === photoId ? { ...img, isLiked: newIsLiked } : img
        )
      )

      console.log('✅ Heart update success:', { photoId, newLiked: newIsLiked })
    } catch (error) {
      console.error('❌ 하트 상태 업데이트 실패:', error)
      alert('좋아요 상태 변경에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleShareKakao = (photoId: string): void => {
    const targetImage = userImages.find(img => img.photoId === photoId)
    if (!targetImage) {
      console.error('Image not found:', photoId)
      return
    }

    if (typeof window !== 'undefined' && (window as any).Kakao && (window as any).Kakao.Share) {
      if (!(window as any).Kakao.isInitialized()) {
        console.error('Kakao SDK not initialized')
        alert('카카오톡 공유 기능을 사용할 수 없습니다.')
        return
      }

      try {
        (window as any).Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: '내가 그린 그림',
            description: '이어줌에서 함께 그린 특별한 추억이에요!',
            imageUrl: targetImage.imgUrl,
            link: {
              webUrl: window.location.href,
              mobileWebUrl: window.location.href,
            },
          },
        })
      } catch (error) {
        console.error('카카오톡 공유 실패:', error)
        alert('카카오톡 공유에 실패했습니다. 다시 시도해주세요.')
      }
    } else {
      console.error('Kakao SDK not loaded')
      alert('카카오톡 공유 기능을 사용할 수 없습니다.')
    }
  }

  const handleDelete = async (photoId: string): Promise<void> => {
    if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) {
      return
    }

    try {
      await myroomService.deletePhoto({
        photoId: parseInt(photoId)
      })

      setUserImages(prevImages => prevImages.filter(img => img.photoId !== photoId))
      
      console.log('✅ Delete success')
      alert('사진이 삭제되었습니다.')
    } catch (error) {
      console.error('❌ 사진 삭제 실패:', error)
      alert('사진 삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleEdit = async (photoId: string, editedImageUrl: string): Promise<void> => {
    const imageToEdit = userImages.find(img => img.photoId === photoId)

    if (imageToEdit && !imageToEdit.isEdited) {
      console.log(`🎨 Navigating to edit page for image ${photoId}`)
      
      const encodedSrc = encodeURIComponent(imageToEdit.imgUrl)
      const currentPath = window.location.pathname
      const encodedReturnUrl = encodeURIComponent(currentPath)
      router.push(
        `/drawing?id=${photoId}&src=${encodedSrc}&returnUrl=${encodedReturnUrl}&saveCallback=true`
      )
    } else if (imageToEdit?.isEdited) {
      alert('이미 편집된 사진은 다시 편집할 수 없습니다.')
    }
  }

  useEffect(() => {
    // 인증 로딩이 완료되고 로그인된 상태일 때만 이미지 가져오기
    if (!authLoading && isAuthenticated && user) {
      fetchUserImages()
    }
  }, [authLoading, isAuthenticated])

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
      onLike={handleLike}
      onShareKakao={handleShareKakao}
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  )
}
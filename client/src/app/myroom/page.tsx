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
      
      console.log('🔍 Fetching photos with condition:', params)
      
      // 백엔드에서 사용자별 이미지 데이터 가져오기
      const response = await myroomService.getPhotos(params)
      
      console.log('📦 API Response:', response)
      
      // 백엔드 응답을 ImageItem 형식으로 정확하게 변환
      const images = response.photos?.map((item) => {
        console.log('🔄 Converting item:', item)
        
        return {
          id: item.photoId.toString(),
          src: item.imageUrl,
          alt: `사진 ${item.photoId}`, // title 필드가 없으므로 간단한 대체 텍스트
          // 백엔드 응답 구조에 맞춰 변환
          isLiked: item.heart > 0, // Integer heart (0 또는 1) → boolean
          isEdited: !item.editable, // editable이 false면 편집됨을 의미
          hashtags: item.partnerEmails 
            ? item.partnerEmails.split(',').map(email => email.trim()).filter(email => email) 
            : [] // 콤마로 구분된 이메일 문자열을 배열로 변환
        }
      }) || []


      console.log('✅ Converted images:', images)


      setUserImages(images)
      setNextCursor(response.nextCursor)
      setHasMore(response.hasNext)
    } catch (error: any) {
      console.error('❌ Failed to fetch images:', error)
      
      // 더 자세한 에러 로깅
      if (error.response) {
        console.error('Error response data:', error.response.data)
        console.error('Error status:', error.response.status)
        console.error('Error headers:', error.response.headers)
      } else if (error.request) {
        console.error('Error request:', error.request)
      } else {
        console.error('Error message:', error.message)
      }
      
      setUserImages([])
      setHasMore(false)
      setNextCursor(null)
      
      // 사용자에게 에러 알림
      if (error.response?.status === 401) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.')
        router.push('/login')
      } else {
        alert('사진을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }


  const loadMoreImages = async () => {
    if (!hasMore || !nextCursor || loading) return


    try {
      console.log('📄 Loading more images with cursor:', nextCursor)
      
      const response = await myroomService.getPhotos({
        cursor: nextCursor,
        limit: 20
      })
      
      // 백엔드 응답을 ImageItem 형식으로 변환
      const newImages = response.photos?.map((item) => ({
        id: item.photoId.toString(),
        src: item.imageUrl,
        alt: `사진 ${item.photoId}`,
        isLiked: item.heart > 0, // Integer → boolean 변환
        isEdited: !item.editable, // editable 반대 값
        hashtags: item.partnerEmails 
          ? item.partnerEmails.split(',').map(email => email.trim()).filter(email => email)
          : []
      })) || []


      console.log('📄 Loaded more images:', newImages.length)


      setUserImages(prev => [...prev, ...newImages])
      setNextCursor(response.nextCursor)
      setHasMore(response.hasNext)
    } catch (error) {
      console.error('❌ Failed to load more images:', error)
      alert('추가 사진을 불러오는데 실패했습니다.')
    }
  }


  useEffect(() => {
    // 인증 로딩이 완료되고 로그인된 상태일 때만 이미지 가져오기
    if (!authLoading && isAuthenticated) {
      fetchUserImages()
    }
  }, [authLoading, isAuthenticated])


  // 인증되지 않은 경우 리다이렉트
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🚫 User not authenticated, redirecting to login')
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])


  // 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }


  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }


  // 사진 로딩 중
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
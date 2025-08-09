'use client'

import Dashboard from '@/components/page/myroom/Dashboard'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import api from '@/lib/axios'

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

  // 디버깅용 로그
  console.log('MyRoom - user full object:', JSON.stringify(user, null, 2))
  console.log('MyRoom - user name:', user?.name)
  console.log('MyRoom - user email:', user?.email)
  console.log('MyRoom - user socialType:', user?.socialType)
  console.log('MyRoom - userProfile prop 전달:', user)
  console.log('MyRoom - isAuthenticated:', isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchUserImages = async () => {
      try {
        setLoading(true)
        console.log('사용자별 이미지 데이터 요청 시작')
        
        // 백엔드에서 사용자별 이미지 데이터 가져오기
        const response = await api.get('/myroom/photos')
        console.log('사용자 이미지 응답:', response.data)
        
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
        console.log('사용자 이미지 로드 실패')
        console.log('Error object:', error)
        console.log('Error response:', error?.response)
        console.log('Error status:', error?.response?.status)
        console.log('Error data:', error?.response?.data)
        console.log('Error message:', error?.message)
        
        // 404나 데이터 없음 에러는 정상적인 상황으로 처리
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          console.log('사용자에게 저장된 이미지가 없습니다.')
        } else {
          console.log('API 요청 중 실제 에러 발생')
          console.log('- Status:', error?.response?.status)
          console.log('- URL:', error?.config?.url)
          console.log('- Method:', error?.config?.method)
          console.log('- Headers:', error?.config?.headers)
        }
        
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
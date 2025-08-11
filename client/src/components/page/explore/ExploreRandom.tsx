'use client'

import React, { useState, useEffect } from 'react'
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import RandomPhotoGrid from './RandomPhotoGrid'
import UserSearchBox from './UserSearchBox'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { PhotoElement } from '@/lib/types/feed'

interface RandomPhoto extends PhotoElement {
  user: {
    id: string
    name: string
    profileImage?: string
  }
}

interface ExploreRandomProps {
  className?: string
}

const ExploreRandom: React.FC<ExploreRandomProps> = ({ className = '' }) => {
  const [photos, setPhotos] = useState<RandomPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Mock 랜덤 사진 데이터 생성
  const generateRandomPhotos = (count: number = 20): RandomPhoto[] => {
    const randomPhotos: RandomPhoto[] = []
    
    for (let i = 0; i < count; i++) {
      const seed = Math.floor(Math.random() * 1000)
      const width = 200 + Math.floor(Math.random() * 200) // 200-400
      const height = 200 + Math.floor(Math.random() * 300) // 200-500
      
      randomPhotos.push({
        id: `random-${seed}`,
        type: 'PHOTO',
        x: 0,
        y: 0,
        width,
        height,
        rotation: 0,
        zIndex: 1,
        photoId: `photo-${seed}`,
        src: `/api/placeholder/${width}/${height}?seed=${seed}`,
        alt: [
          '예쁜 카페에서 ☕',
          '친구들과 함께한 하루 🌟',
          '오늘의 코디 💫',
          '맛있는 브런치 🥐',
          '산책하면서 찍은 풍경 🌿',
          '귀여운 강아지를 만났어요 🐕',
          '새로운 책과 함께 📚',
          '홈카페 시간 ☕',
          '좋은 날씨 🌤️',
          '감성 가득한 하루 ✨'
        ][i % 10],
        user: {
          id: `user-${seed}`,
          name: [
            '김다꾸', '이예쁜', '박귀염', '최감성', '정아름',
            '문달콤', '임포근', '송깜찍', '한귀엽', '조사랑'
          ][i % 10],
          profileImage: i % 3 === 0 ? `/api/placeholder/40/40?seed=${seed}` : undefined,
        },
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      })
    }
    
    return randomPhotos.sort(() => Math.random() - 0.5) // 섞기
  }

  // 랜덤 사진 로드
  const loadRandomPhotos = async () => {
    setIsLoading(true)
    
    // Mock API 호출 시뮬레이션
    setTimeout(() => {
      const newPhotos = generateRandomPhotos(24)
      setPhotos(newPhotos)
      setIsLoading(false)
    }, 800)
  }

  // 첫 로드
  useEffect(() => {
    loadRandomPhotos()
  }, [refreshKey]) // 🔥 의존성 배열에 refreshKey만 포함 (loadRandomPhotos 제거)

  // 새로고침
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // 사진 클릭 - 해당 사용자 피드로 이동
  const handlePhotoClick = (photo: RandomPhoto) => {
    console.log('Navigate to user feed:', photo.user.id)
    // TODO: 실제 네비게이션 구현
    // router.push(`/feed/${photo.user.id}`)
  }

  // 사용자 검색 결과
  const handleUserFound = (userId: string) => {
    console.log('Navigate to found user:', userId)
    // TODO: 실제 네비게이션 구현
    // router.push(`/feed/${userId}`)
  }

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Explore</h2>
            <p className="text-gray-600">다른 사용자들의 멋진 사진들을 발견해보세요</p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
        
        {/* 사용자 검색 */}
        <div className="mt-6">
          <UserSearchBox onUserFound={handleUserFound} />
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">새로운 사진들을 찾는 중...</p>
        </div>
      )}

      {/* 랜덤 사진 그리드 */}
      {!isLoading && photos.length > 0 && (
        <RandomPhotoGrid
          photos={photos}
          onPhotoClick={handlePhotoClick}
        />
      )}

      {/* 빈 상태 */}
      {!isLoading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">사진을 찾을 수 없어요</h3>
            <p className="mt-2 text-gray-500">새로고침 버튼을 눌러서 다시 시도해보세요!</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExploreRandom
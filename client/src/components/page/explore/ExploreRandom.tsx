'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import RandomPhotoGrid from './RandomPhotoGrid'
import UserSearchBox from './UserSearchBox'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { ExploreFeed, getExploreFeeds } from '@/lib/api/explore'

interface ExploreRandomProps {
  className?: string
}

const ExploreRandom: React.FC<ExploreRandomProps> = ({ className = '' }) => {
  const router = useRouter()
  const [feeds, setFeeds] = useState<ExploreFeed[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // 백엔드에서 랜덤 탐색 피드 로드
  const loadRandomFeeds = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await getExploreFeeds('random', undefined, 24)
      
      if (result.success && result.data) {
        setFeeds(result.data.feeds)
      } else {
        setError(result.error || '피드를 불러오는데 실패했습니다.')
        setFeeds([])
      }
    } catch (err) {
      console.error('Failed to load random feeds:', err)
      setError('네트워크 오류가 발생했습니다.')
      setFeeds([])
    } finally {
      setIsLoading(false)
    }
  }

  // 첫 로드 및 새로고침 시 실행
  useEffect(() => {
    loadRandomFeeds()
  }, [refreshKey])

  // 새로고침 핸들러
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // 피드 클릭 - 피드 상세 페이지로 이동
  const handleFeedClick = (feed: ExploreFeed) => {
    console.log('Navigate to feed detail:', feed.id)
    router.push(`/feed/${feed.id}`)
  }

  // 사용자 검색 결과 - 해당 사용자 프로필로 이동
  const handleUserFound = (userId: string) => {
    console.log('Navigate to user profile:', userId)
    router.push(`/profile/${userId}`)
  }

  // 작성자 클릭 - 사용자 프로필로 이동
  const handleAuthorClick = (authorId: string) => {
    console.log('Navigate to author profile:', authorId)
    router.push(`/profile/${authorId}`)
  }

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">랜덤 탐색</h2>
            <p className="text-gray-600">예상치 못한 놀라운 피드들을 발견해보세요</p>
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

      {/* 에러 상태 */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-500 text-lg font-medium mb-2">오류가 발생했습니다</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">새로운 피드들을 찾는 중...</p>
        </div>
      )}

      {/* 랜덤 피드 그리드 */}
      {!isLoading && !error && feeds.length > 0 && (
        <div>
          {/* 통계 정보 */}
          <div className="mb-6 text-sm text-gray-500">
            총 {feeds.length}개의 피드를 찾았습니다
          </div>
          
          <RandomPhotoGrid
            photos={feeds}
            onPhotoClick={handleFeedClick}
            onAuthorClick={handleAuthorClick}
          />
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && !error && feeds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">피드를 찾을 수 없어요</h3>
            <p className="mt-2 text-gray-500">새로고침 버튼을 눌러서 다시 시도해보세요!</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      )}

      {/* 디버그 정보 (개발 환경에서만) */}
      {process.env.NODE_ENV === 'development' && !isLoading && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">디버그 정보</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>로드된 피드 수: {feeds.length}</div>
            <div>에러 상태: {error || '없음'}</div>
            <div>새로고침 횟수: {refreshKey}</div>
            <div>API 소스: 백엔드 연동</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExploreRandom
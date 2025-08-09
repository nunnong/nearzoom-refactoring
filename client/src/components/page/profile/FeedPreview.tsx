'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { EyeIcon, PencilSquareIcon, HeartIcon, ShareIcon, UsersIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon, LockClosedIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import { UserFeed } from '@/lib/types/feed'

interface FeedPreviewProps {
  feed: UserFeed
  isOwnFeed: boolean
  onLikeChange?: (isLiked: boolean, likesCount: number) => void // ✅ 좋아요 상태 변경 콜백
  onFollowChange?: (isFollowing: boolean, followersCount: number) => void // ✅ 팔로우 상태 변경 콜백
  showActions?: boolean // ✅ 액션 버튼 표시 여부
  size?: 'sm' | 'md' | 'lg' // ✅ 크기 옵션
  className?: string
}

// ✅ 피드 요소 타입 정의
interface PreviewElement {
  id: string
  type: 'photo' | 'text' | 'sticker' | 'drawing'
  x: number
  y: number
  width: number
  height: number
  color?: string
}

const FeedPreview: React.FC<FeedPreviewProps> = ({
  feed,
  isOwnFeed,
  onLikeChange,
  onFollowChange,
  showActions = true,
  size = 'md',
  className = '',
}) => {
  const router = useRouter()
  const [isLiking, setIsLiking] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [localLiked, setLocalLiked] = useState(feed.isLiked)
  const [localLikesCount, setLocalLikesCount] = useState(feed.likesCount)

  // ✅ 크기별 스타일 정의
  const sizeConfig = useMemo(() => ({
    sm: {
      container: 'text-sm',
      title: 'text-base',
      preview: 'aspect-[3/2]',
      button: 'py-1.5 px-3 text-sm',
      padding: 'p-4',
    },
    md: {
      container: 'text-sm',
      title: 'text-lg',
      preview: 'aspect-[4/3]',
      button: 'py-2 px-4',
      padding: 'p-6',
    },
    lg: {
      container: 'text-base',
      title: 'text-xl',
      preview: 'aspect-[4/3]',
      button: 'py-3 px-6 text-lg',
      padding: 'p-8',
    },
  }), [])

  // ✅ 네비게이션 핸들러들
  const handleViewFullFeed = useCallback(() => {
    if (isOwnFeed) {
      router.push('/feed')
    } else {
      router.push(`/feed/${feed.userId}`)
    }
  }, [isOwnFeed, feed.userId, router])

  const handleEditFeed = useCallback(() => {
    router.push('/feed/edit')
  }, [router])

  // ✅ 좋아요 핸들러 개선
  const handleLike = useCallback(async () => {
    if (isLiking) return

    setIsLiking(true)
    const newLiked = !localLiked
    const newCount = newLiked ? localLikesCount + 1 : localLikesCount - 1

    // 즉시 UI 업데이트
    setLocalLiked(newLiked)
    setLocalLikesCount(newCount)

    try {
      // TODO: 실제 API 호출
      await new Promise(resolve => setTimeout(resolve, 300))
      
      onLikeChange?.(newLiked, newCount)
      console.log('Like/unlike feed:', feed.id, newLiked)
    } catch (error) {
      // 실패 시 롤백
      setLocalLiked(!newLiked)
      setLocalLikesCount(localLikesCount)
      console.error('Failed to like/unlike feed:', error)
    } finally {
      setIsLiking(false)
    }
  }, [isLiking, localLiked, localLikesCount, feed.id, onLikeChange])

  // ✅ 팔로우 핸들러
  const handleFollow = useCallback(async () => {
    if (isFollowing) return

    setIsFollowing(true)
    const newFollowing = !feed.isFollowing
    const newCount = newFollowing ? feed.followersCount + 1 : feed.followersCount - 1

    try {
      // TODO: 실제 API 호출
      await new Promise(resolve => setTimeout(resolve, 500))
      
      onFollowChange?.(newFollowing, newCount)
      console.log('Follow/unfollow user:', feed.userId, newFollowing)
    } catch (error) {
      console.error('Failed to follow/unfollow:', error)
    } finally {
      setIsFollowing(false)
    }
  }, [isFollowing, feed.isFollowing, feed.followersCount, feed.userId, onFollowChange])

  // ✅ 공유 핸들러
  const handleShare = useCallback(async () => {
    const url = isOwnFeed ? `${window.location.origin}/feed` : `${window.location.origin}/feed/${feed.userId}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: feed.name,
          text: feed.description,
          url: url,
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      // 클립보드에 복사
      try {
        await navigator.clipboard.writeText(url)
        // TODO: 토스트 메시지 표시
        console.log('URL copied to clipboard')
      } catch (error) {
        console.error('Failed to copy URL:', error)
      }
    }
  }, [isOwnFeed, feed.userId, feed.name, feed.description])

  // ✅ 미니 피드 프리뷰를 위한 가상 요소들 생성 (더 현실적)
  const previewElements = useMemo((): PreviewElement[] => [
    { id: '1', type: 'photo', x: 20, y: 30, width: 120, height: 80, color: 'from-blue-400 to-blue-600' },
    { id: '2', type: 'text', x: 160, y: 50, width: 100, height: 30 },
    { id: '3', type: 'sticker', x: 50, y: 130, width: 40, height: 40, color: 'from-yellow-300 to-yellow-500' },
    { id: '4', type: 'photo', x: 180, y: 120, width: 100, height: 120, color: 'from-purple-400 to-purple-600' },
    { id: '5', type: 'text', x: 30, y: 200, width: 150, height: 40 },
    { id: '6', type: 'sticker', x: 200, y: 260, width: 50, height: 50, color: 'from-pink-300 to-pink-500' },
    { id: '7', type: 'drawing', x: 120, y: 180, width: 80, height: 60, color: 'from-green-400 to-green-600' },
  ], [])

  // ✅ 수치 포맷팅
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }, [])

  const formatHeight = useCallback((height: number): string => {
    if (height >= 1000) return `${(height / 1000).toFixed(1)}k`
    return height.toString()
  }, [])

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md ${sizeConfig[size].container} ${className}`}>
      {/* 헤더 */}
      <div className={`${sizeConfig[size].padding} border-b border-gray-200`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className={`font-semibold text-gray-900 truncate ${sizeConfig[size].title}`}>
                {feed.name}
              </h3>
              {!feed.isPublic && (
                <LockClosedIcon className="w-4 h-4 text-gray-400" title="비공개 피드" />
              )}
            </div>
            {feed.description && (
              <p className="text-gray-500 mt-1 line-clamp-2">{feed.description}</p>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
              {/* 공유 버튼 */}
              <button
                onClick={handleShare}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                title="공유"
                aria-label="피드 공유"
              >
                <ShareIcon className="w-4 h-4 text-gray-600" />
              </button>

              {/* 좋아요 버튼 (다른 사람 피드인 경우만) */}
              {!isOwnFeed && (
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title={localLiked ? '좋아요 취소' : '좋아요'}
                  aria-label={localLiked ? '좋아요 취소' : '좋아요'}
                >
                  {localLiked ? (
                    <HeartSolidIcon className="w-4 h-4 text-red-500" />
                  ) : (
                    <HeartIcon className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              )}

              {/* 편집 버튼 (본인 피드인 경우만) */}
              {isOwnFeed && (
                <button
                  onClick={handleEditFeed}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                  title="피드 편집"
                  aria-label="피드 편집"
                >
                  <PencilSquareIcon className="w-4 h-4 text-gray-600" />
                </button>
              )}

              {/* 전체보기 버튼 */}
              <button
                onClick={handleViewFullFeed}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                title="전체 피드 보기"
                aria-label="전체 피드 보기"
              >
                <EyeIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 미니 피드 프리뷰 */}
      <div className={sizeConfig[size].padding}>
        <div 
          className={`relative w-full ${sizeConfig[size].preview} rounded-lg overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-300 transition-all duration-200 hover:shadow-sm`}
          style={{
            backgroundColor: feed.backgroundColor || '#f8fafc',
            backgroundImage: feed.backgroundImageUrl ? `url(${feed.backgroundImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={handleViewFullFeed}
        >
          {/* 배경 오버레이 */}
          <div className="absolute inset-0 bg-white/5" />
          
          {/* 가상 피드 요소들 */}
          {previewElements.map((element) => (
            <div
              key={element.id}
              className={`absolute rounded shadow-sm transition-transform hover:scale-105 ${
                element.type === 'photo' 
                  ? `bg-gradient-to-br ${element.color || 'from-blue-400 to-blue-600'}` 
                  : element.type === 'text'
                    ? 'bg-white border border-gray-200 flex items-center justify-center text-xs text-gray-600 font-medium'
                    : element.type === 'sticker'
                      ? `bg-gradient-to-br ${element.color || 'from-yellow-300 to-yellow-500'} rounded-full`
                      : `bg-gradient-to-br ${element.color || 'from-green-400 to-green-600'} rounded`
              }`}
              style={{
                left: `${(element.x / 300) * 100}%`,
                top: `${(element.y / 300) * 100}%`,
                width: `${(element.width / 300) * 100}%`,
                height: `${(element.height / 300) * 100}%`,
              }}
            >
              {element.type === 'photo' && (
                <div className="w-full h-full bg-white/20 rounded" />
              )}
              {element.type === 'text' && (
                <span className="text-center">텍스트</span>
              )}
              {element.type === 'drawing' && (
                <div className="w-full h-full bg-white/30 rounded flex items-center justify-center">
                  <svg className="w-1/2 h-1/2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center text-gray-700">
                <EyeIcon className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">전체 피드 보기</span>
              </div>
            </div>
          </div>
        </div>

        {/* 피드 통계 */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <UsersIcon className="w-4 h-4 mr-1" />
                <span>{formatNumber(feed.followersCount)}</span>
              </div>
              <div className="flex items-center">
                <HeartIcon className="w-4 h-4 mr-1" />
                <span>{formatNumber(localLikesCount)}</span>
              </div>
              <span>높이 {formatHeight(feed.totalHeight)}</span>
            </div>
            
            <div className="flex items-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                feed.isPublic 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {feed.isPublic ? '공개' : '비공개'}
              </span>
            </div>
          </div>

          {/* 최근 업데이트 */}
          <div className="text-xs text-gray-400">
            최근 업데이트: {new Date(feed.updatedAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      {showActions && (
        <div className={`${sizeConfig[size].padding} bg-gray-50 border-t border-gray-200`}>
          <div className="flex space-x-2">
            <button
              onClick={handleViewFullFeed}
              className={`flex-1 ${sizeConfig[size].button} bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors`}
            >
              {isOwnFeed ? '내 피드 보기' : '피드 둘러보기'}
            </button>
            
            {/* 팔로우 버튼 (다른 사람 피드인 경우만) */}
            {!isOwnFeed && (
              <button
                onClick={handleFollow}
                disabled={isFollowing}
                className={`${sizeConfig[size].button} ${
                  feed.isFollowing
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-white hover:bg-gray-50 text-blue-600 border border-blue-600'
                } rounded-lg font-medium transition-colors disabled:opacity-50`}
              >
                {isFollowing ? '처리중...' : feed.isFollowing ? '팔로잉' : '팔로우'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedPreview
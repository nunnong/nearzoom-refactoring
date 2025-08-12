// src/components/page/timeline/Timeline.tsx - 백엔드 API 연동 수정

'use client'

import React, { useState, useEffect } from 'react'
import { getFeeds, toggleFeedLike, handleApiError } from '@/lib/api/feed'

// 백엔드 API에서 실제로 사용할 수 있는 인터페이스만 import
interface CanvasFeedItem {
  id: string
  userId: string
  name: string
  description: string
  isPublic: boolean
  backgroundColor: string
  backgroundImageUrl?: string
  totalHeight: number
  authorId: string
  authorName: string
  authorAvatar?: string
  elements: any[]
  followersCount: number
  likesCount: number
  commentsCount?: number
  isFollowing: boolean
  isLiked: boolean
  createdAt: string
  updatedAt: string
}

export const Timeline: React.FC = () => {
  const [feeds, setFeeds] = useState<CanvasFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  // ⚠️ 현재 백엔드에는 피드 목록 API가 없으므로 임시 처리
  const loadFeeds = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true)
      const result = await getFeeds(undefined, pageNum, 12)
      
      if (result.success && result.data) {
        if (append) {
          setFeeds(prev => [...prev, ...result.data!.items])
        } else {
          setFeeds(result.data.items)
        }
        setHasMore(result.data.hasMore)
        setError(null)
      } else {
        // 백엔드에 피드 목록 API가 없는 경우 처리
        if (result.error?.includes('백엔드에 피드 목록 API가 필요')) {
          setError('피드 목록 기능은 아직 구현 중입니다.')
          setFeeds([])
          setHasMore(false)
        } else {
          setError(result.error || '피드를 불러오는데 실패했습니다.')
        }
      }
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  // 좋아요 토글 핸들러
  const handleLikeToggle = async (feed: CanvasFeedItem) => {
    try {
      // photoId 추출 (backgroundImageUrl에서 또는 별도 저장 필요)
      const photoIdMatch = feed.backgroundImageUrl?.match(/\/photos\/(\d+)/)
      if (!photoIdMatch) {
        console.error('PhotoId를 찾을 수 없습니다.')
        return
      }
      
      const photoId = parseInt(photoIdMatch[1])
      const result = await toggleFeedLike(photoId)
      
      if (result.success && result.data) {
        // 피드 목록에서 해당 피드의 좋아요 정보 업데이트
        setFeeds(prev => prev.map(f => 
          f.id === feed.id 
            ? {
                ...f,
                likesCount: result.data!.likesCount,
                isLiked: result.data!.isLiked
              }
            : f
        ))
      } else {
        console.error('좋아요 처리 실패:', result.error)
      }
    } catch (err) {
      console.error('좋아요 처리 중 오류:', handleApiError(err))
    }
  }

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadFeeds(1, false)
  }, [])

  // 더 많은 피드 로드
  const loadMoreFeeds = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadFeeds(nextPage, true)
    }
  }

  // 새로고침
  const refreshFeeds = () => {
    setPage(1)
    loadFeeds(1, false)
  }

  // 무한 스크롤
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000 &&
        hasMore &&
        !loading
      ) {
        loadMoreFeeds()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, page])

  // 로딩 상태
  if (loading && feeds.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">피드를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error && feeds.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={refreshFeeds}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 피드가 없는 경우 (백엔드 API 미구현 포함)
  if (feeds.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📷</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              아직 피드가 없습니다
            </h2>
            <p className="text-gray-600 mb-6">
              {error?.includes('구현 중') 
                ? '피드 목록 기능이 곧 추가될 예정입니다.'
                : '사용자들의 사진이 여기에 표시됩니다.'
              }
            </p>
            <button
              onClick={refreshFeeds}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">타임라인</h1>
            <button
              onClick={refreshFeeds}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 피드 목록 */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {feeds.map((feed) => (
            <div key={feed.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* 피드 헤더 */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  {/* ✅ 사용자 아바타 */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    {feed.authorAvatar ? (
                      <img
                        src={feed.authorAvatar}
                        alt={feed.authorName}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-white">
                        {feed.authorName.slice(-2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {feed.authorName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(feed.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* ✅ 피드 이미지 - backgroundImageUrl 사용 */}
              {feed.backgroundImageUrl && (
                <div className="relative aspect-square">
                  <img
                    src={feed.backgroundImageUrl}
                    alt={feed.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-image.jpg'
                    }}
                  />
                </div>
              )}

              {/* 피드 액션 버튼 */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-4">
                  {/* ✅ 좋아요 버튼 */}
                  <button
                    onClick={() => handleLikeToggle(feed)}
                    className={`flex items-center space-x-1 transition-colors ${
                      feed.isLiked 
                        ? 'text-red-500 hover:text-red-600' 
                        : 'text-gray-600 hover:text-red-500'
                    }`}
                  >
                    <svg className="w-6 h-6" fill={feed.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-sm font-medium">{feed.likesCount}</span>
                  </button>

                  {/* 댓글 버튼 */}
                  <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm font-medium">{feed.commentsCount || 0}</span>
                  </button>
                </div>
              </div>

              {/* 피드 정보 */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-2">{feed.name}</h3>
                {feed.description && (
                  <p className="text-sm text-gray-600 mb-2">{feed.description}</p>
                )}
                
                {/* 좋아요 수 및 기타 정보 */}
                <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                  <div className="flex items-center space-x-4">
                    {feed.likesCount > 0 && (
                      <span>좋아요 {feed.likesCount.toLocaleString()}개</span>
                    )}
                    {feed.commentsCount && feed.commentsCount > 0 && (
                      <span>댓글 {feed.commentsCount.toLocaleString()}개</span>
                    )}
                  </div>
                  {feed.isPublic && (
                    <span className="text-green-600 text-xs">공개</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 로딩 인디케이터 */}
        {loading && feeds.length > 0 && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">더 많은 피드를 불러오는 중...</p>
          </div>
        )}

        {/* 더 이상 로드할 피드가 없는 경우 */}
        {!hasMore && feeds.length > 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600">모든 피드를 확인했습니다.</p>
          </div>
        )}

        {/* 에러 메시지 (피드가 있는 상태에서) */}
        {error && feeds.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Timeline
// src/components/page/feed/FeedViewer.tsx
'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { HeartIcon, ShareIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// ✅ 백엔드 연동 API 사용
import { 
  getFeed, 
  deleteFeed, 
  toggleFeedLike,
  getCurrentUser,
  handleApiError
} from '@/lib/api/feed'

import {
  CanvasFeedItem
} from '@/lib/types/feed'

import {
  toggleFollow,
  getUserProfile,
  UserProfile
} from '@/lib/api/follow'

import {
  getExploreFeeds,
  getUserFeeds,
  ExploreFeed
} from '@/lib/api/explore'

// ✅ Feed 아이템 타입 (CanvasFeedItem 또는 ExploreFeed)
type FeedItem = CanvasFeedItem | ExploreFeed

interface FeedViewerProps {
  userId?: string // 특정 사용자의 피드를 볼 때
  isMyFeed?: boolean // 내 피드인지 여부
  feedId?: string // 단일 피드 조회
  className?: string
}

const FeedViewer: React.FC<FeedViewerProps> = ({ 
  userId, 
  isMyFeed = false,
  feedId,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  
  // ✅ 상태 관리
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>()

  // 현재 사용자 정보 로드
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('현재 사용자 정보 로드 실패:', error)
      }
    }
    loadCurrentUser()
  }, [])

  // ✅ 단일 피드 로드 (백엔드 API 사용)
  const loadSingleFeed = useCallback(async (targetFeedId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getFeed(targetFeedId)
      
      if (result.success && result.data) {
        setFeedItems([result.data])
        setHasMore(false)
      } else {
        setError(result.error || '피드를 불러오는데 실패했습니다.')
        setFeedItems([])
      }
    } catch (error) {
      console.error('피드 로드 실패:', error)
      setError(handleApiError(error))
      setFeedItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ✅ 사용자별 피드 목록 로드 (백엔드 API 사용)
  const loadUserFeeds = useCallback(async (targetUserId: string, cursor?: string) => {
    setIsLoading(true)
    if (!cursor) {
      setError(null)
      setFeedItems([])
    }

    try {
      const result = await getUserFeeds(targetUserId, cursor, 20)
      
      if (result.success && result.data) {
        const newFeeds = result.data.feeds
        
        if (cursor) {
          // 페이지네이션 - 기존 피드에 추가
          setFeedItems(prev => [...prev, ...newFeeds])
        } else {
          // 첫 로드 - 새로운 피드 설정
          setFeedItems(newFeeds)
        }
        
        setHasMore(result.data.hasMore)
        setNextCursor(result.data.nextCursor)
      } else {
        setError(result.error || '피드를 불러오는데 실패했습니다.')
        if (!cursor) setFeedItems([])
      }
    } catch (error) {
      console.error('사용자 피드 로드 실패:', error)
      setError(handleApiError(error))
      if (!cursor) setFeedItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ✅ 탐색 피드 목록 로드 (백엔드 API 사용)
  const loadExploreFeed = useCallback(async (cursor?: string) => {
    setIsLoading(true)
    if (!cursor) {
      setError(null)
      setFeedItems([])
    }

    try {
      const result = await getExploreFeeds('recent', cursor, 20)
      
      if (result.success && result.data) {
        const newFeeds = result.data.feeds
        
        if (cursor) {
          // 페이지네이션 - 기존 피드에 추가
          setFeedItems(prev => [...prev, ...newFeeds])
        } else {
          // 첫 로드 - 새로운 피드 설정
          setFeedItems(newFeeds)
        }
        
        setHasMore(result.data.hasMore)
        setNextCursor(result.data.nextCursor)
      } else {
        setError(result.error || '피드를 불러오는데 실패했습니다.')
        if (!cursor) setFeedItems([])
      }
    } catch (error) {
      console.error('탐색 피드 로드 실패:', error)
      setError(handleApiError(error))
      if (!cursor) setFeedItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ✅ 더 많은 피드 로드 (무한 스크롤)
  const loadMoreFeeds = useCallback(() => {
    if (!hasMore || isLoading || !nextCursor) return

    if (userId) {
      loadUserFeeds(userId, nextCursor)
    } else {
      loadExploreFeed(nextCursor)
    }
  }, [hasMore, isLoading, nextCursor, userId, loadUserFeeds, loadExploreFeed])

  // 초기 로드
  useEffect(() => {
    if (feedId) {
      // 단일 피드 조회
      loadSingleFeed(feedId)
    } else if (userId) {
      // 특정 사용자 피드 목록 조회
      loadUserFeeds(userId)
    } else {
      // 전체 탐색 피드 조회
      loadExploreFeed()
    }
  }, [feedId, userId, loadSingleFeed, loadUserFeeds, loadExploreFeed])

  // ✅ 스크롤 이벤트 처리 (무한 스크롤)
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !hasMore || isLoading) return

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

      // 80% 지점에서 다음 페이지 로드
      if (scrollPercentage > 0.8) {
        loadMoreFeeds()
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [hasMore, isLoading, loadMoreFeeds])

  // ✅ 피드 아이템 클릭 핸들러 (최신 데이터로 업데이트)
  const handleFeedClick = useCallback(async (feedItem: FeedItem) => {
    try {
      const result = await getFeed(feedItem.id)
      
      if (result.success && result.data) {
        setSelectedFeedItem(result.data)
      } else {
        setSelectedFeedItem(feedItem) // 실패시 기존 데이터로 표시
      }
    } catch (error) {
      console.error('피드 상세 조회 실패:', error)
      setSelectedFeedItem(feedItem)
    }
  }, [])

  // ✅ 좋아요 토글 (백엔드 API 사용)
  const handleLikeToggle = useCallback(async (feedItem: FeedItem, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!feedItem.photoId) {
      console.error('PhotoId가 없습니다.')
      return
    }

    const feedIndex = feedItems.findIndex(item => item.id === feedItem.id)
    if (feedIndex === -1) return

    const currentFeed = feedItems[feedIndex]
    const wasLiked = currentFeed.isLiked

    // 낙관적 업데이트
    setFeedItems(prev => prev.map(item => 
      item.id === feedItem.id 
        ? { 
            ...item, 
            isLiked: !wasLiked,
            likesCount: wasLiked ? Math.max(0, item.likesCount - 1) : item.likesCount + 1
          }
        : item
    ))

    // 선택된 피드도 업데이트
    if (selectedFeedItem?.id === feedItem.id) {
      setSelectedFeedItem(prev => prev ? {
        ...prev,
        isLiked: !wasLiked,
        likesCount: wasLiked ? Math.max(0, prev.likesCount - 1) : prev.likesCount + 1
      } : null)
    }

    try {
      const result = await toggleFeedLike(Number(feedItem.photoId))
      
      if (result.success && result.data) {
        // 실제 결과로 업데이트
        setFeedItems(prev => prev.map(item => 
          item.id === feedItem.id 
            ? { 
                ...item, 
                isLiked: result.data!.isLiked,
                likesCount: result.data!.likesCount
              }
            : item
        ))

        // 선택된 피드도 업데이트
        if (selectedFeedItem?.id === feedItem.id) {
          setSelectedFeedItem(prev => prev ? {
            ...prev,
            isLiked: result.data!.isLiked,
            likesCount: result.data!.likesCount
          } : null)
        }
      } else {
        throw new Error(result.error || '좋아요 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
      
      // 실패시 롤백
      setFeedItems(prev => prev.map(item => 
        item.id === feedItem.id 
          ? { 
              ...item, 
              isLiked: wasLiked,
              likesCount: wasLiked ? item.likesCount + 1 : Math.max(0, item.likesCount - 1)
            }
          : item
      ))

      if (selectedFeedItem?.id === feedItem.id) {
        setSelectedFeedItem(prev => prev ? {
          ...prev,
          isLiked: wasLiked,
          likesCount: wasLiked ? prev.likesCount + 1 : Math.max(0, prev.likesCount - 1)
        } : null)
      }
    }
  }, [feedItems, selectedFeedItem])

  // ✅ 팔로우 토글 (백엔드 API 사용)
  const handleFollowToggle = useCallback(async (feedItem: FeedItem, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!currentUser || feedItem.authorId === currentUser.id) return

    const feedIndex = feedItems.findIndex(item => item.authorId === feedItem.authorId)
    if (feedIndex === -1) return

    const currentFeed = feedItems[feedIndex]
    const wasFollowing = currentFeed.isFollowing

    // 낙관적 업데이트 (해당 작성자의 모든 피드)
    setFeedItems(prev => prev.map(item => 
      item.authorId === feedItem.authorId 
        ? { ...item, isFollowing: !wasFollowing }
        : item
    ))

    // 선택된 피드도 업데이트
    if (selectedFeedItem?.authorId === feedItem.authorId) {
      setSelectedFeedItem(prev => prev ? {
        ...prev,
        isFollowing: !wasFollowing
      } : null)
    }

    try {
      const result = await toggleFollow(feedItem.authorId)
      
      if (result.success && typeof result.data?.isFollowing === 'boolean') {
        // 실제 결과로 업데이트
        setFeedItems(prev => prev.map(item => 
          item.authorId === feedItem.authorId 
            ? { ...item, isFollowing: result.data!.isFollowing }
            : item
        ))

        // 선택된 피드도 업데이트
        if (selectedFeedItem?.authorId === feedItem.authorId) {
          setSelectedFeedItem(prev => prev ? {
            ...prev,
            isFollowing: result.data!.isFollowing
          } : null)
        }
      } else {
        throw new Error(result.error || '팔로우 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('팔로우 처리 실패:', error)
      
      // 실패시 롤백
      setFeedItems(prev => prev.map(item => 
        item.authorId === feedItem.authorId 
          ? { ...item, isFollowing: wasFollowing }
          : item
      ))

      if (selectedFeedItem?.authorId === feedItem.authorId) {
        setSelectedFeedItem(prev => prev ? {
          ...prev,
          isFollowing: wasFollowing
        } : null)
      }
    }
  }, [feedItems, selectedFeedItem, currentUser])

  // ✅ 피드 삭제 (백엔드 API 사용)
  const handleDelete = useCallback(async (feedItem: FeedItem, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const result = await deleteFeed(feedItem.id)
      
      if (result.success) {
        setFeedItems(prev => prev.filter(item => item.id !== feedItem.id))
        
        if (selectedFeedItem?.id === feedItem.id) {
          setSelectedFeedItem(null)
        }
      } else {
        throw new Error(result.error || '피드 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('피드 삭제 실패:', error)
      alert(handleApiError(error))
    }
  }, [selectedFeedItem])

  // ✅ 새로고침
  const handleRefresh = useCallback(() => {
    setNextCursor(undefined)
    setHasMore(true)
    
    if (feedId) {
      loadSingleFeed(feedId)
    } else if (userId) {
      loadUserFeeds(userId)
    } else {
      loadExploreFeed()
    }
  }, [feedId, userId, loadSingleFeed, loadUserFeeds, loadExploreFeed])

  // 가상화된 피드 아이템 렌더러
  const renderFeedItem = useCallback((item: FeedItem, index: number) => {
    const isOwnFeed = currentUser?.id === item.authorId

    return (
      <div
        key={item.id}
        className="relative group cursor-pointer bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
        onClick={() => handleFeedClick(item)}
      >
        {/* 피드 프리뷰 이미지 */}
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <img
            src={item.photoUrl || '/api/placeholder/400/400'}
            alt={item.name || '피드 이미지'}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/api/placeholder/400/400?text=Feed+Image'
            }}
          />
          
          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="flex space-x-4 text-white">
              <div className="flex items-center space-x-1">
                <HeartIcon className="h-6 w-6" />
                <span>{item.likesCount || 0}</span>
              </div>
            </div>
          </div>

          {/* 피드 타입 배지 (ExploreFeed인 경우) */}
          {'source' in item && (
            <div className="absolute top-2 left-2">
              <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                {item.source === 'popular' ? '🔥 인기' : 
                 item.source === 'recent' ? '🆕 최신' : 
                 item.source === 'recommended' ? '⭐ 추천' : '🎲 랜덤'}
              </span>
            </div>
          )}
        </div>

        {/* 피드 정보 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 flex-1">
              <img
                src={item.authorAvatar || '/api/placeholder/32/32'}
                alt={item.authorName || 'User'}
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/api/placeholder/32/32?text=U'
                }}
              />
              <span className="text-sm font-medium text-gray-900 truncate">
                {item.authorName || 'Unknown User'}
              </span>
              
              {/* 팔로우 버튼 */}
              {!isOwnFeed && (
                <button
                  onClick={(e) => handleFollowToggle(item, e)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors flex-shrink-0 ${
                    item.isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {item.isFollowing ? '팔로잉' : '팔로우'}
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {new Date(item.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          
          <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
            {item.name}
          </h3>
          
          {item.description && (
            <p className="text-xs text-gray-600 line-clamp-3 mb-2">
              {item.description}
            </p>
          )}
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center justify-between p-4 pt-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => handleLikeToggle(item, e)}
              className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
            >
              {item.isLiked ? (
                <HeartSolidIcon className="h-5 w-5 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
              <span className="text-sm">{item.likesCount || 0}</span>
            </button>
            
            <button className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors">
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>

          {isOwnFeed && (
            <button
              onClick={(e) => handleDelete(item, e)}
              className="text-xs text-red-600 hover:text-red-800 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
      </div>
    )
  }, [handleFeedClick, handleLikeToggle, handleFollowToggle, handleDelete, currentUser])

  // 로딩 상태 (첫 로드)
  if (isLoading && feedItems.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // 에러 상태 (첫 로드)
  if (error && feedItems.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-center ${className}`}>
        <div className="text-red-500 text-lg font-medium mb-2">오류가 발생했습니다</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    )
  }

  // 피드가 없는 경우
  if (feedItems.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-center ${className}`}>
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📷</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          피드가 없습니다
        </h2>
        <p className="text-gray-600 mb-4">
          {isMyFeed ? '첫 번째 피드를 만들어보세요!' : '아직 업로드된 피드가 없습니다.'}
        </p>
        <button 
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          새로고침
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`h-full overflow-y-auto ${className}`}>
      {/* 에러 경고 메시지 (부분 로드 성공) */}
      {error && feedItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 mx-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 피드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {feedItems.map((item, index) => renderFeedItem(item, index))}
      </div>

      {/* 무한 스크롤 로딩 */}
      {isLoading && feedItems.length > 0 && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* 더 이상 로드할 피드가 없는 경우 */}
      {!hasMore && feedItems.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          모든 피드를 불러왔습니다
        </div>
      )}

      {/* 피드 상세 모달 */}
      {selectedFeedItem && (
        <FeedDetailModal
          feedItem={selectedFeedItem}
          onClose={() => setSelectedFeedItem(null)}
          onLike={(item) => handleLikeToggle(item, { stopPropagation: () => {} } as React.MouseEvent)}
          onFollow={(item) => handleFollowToggle(item, { stopPropagation: () => {} } as React.MouseEvent)}
          onDelete={selectedFeedItem.authorId === currentUser?.id ? (item) => handleDelete(item, { stopPropagation: () => {} } as React.MouseEvent) : undefined}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  )
}

// ✅ 피드 상세 모달 컴포넌트
interface FeedDetailModalProps {
  feedItem: FeedItem
  onClose: () => void
  onLike: (item: FeedItem) => void
  onFollow: (item: FeedItem) => void
  onDelete?: (item: FeedItem) => void
  currentUserId?: string
}

const FeedDetailModal: React.FC<FeedDetailModalProps> = ({
  feedItem,
  onClose,
  onLike,
  onFollow,
  onDelete,
  currentUserId
}) => {
  const isOwnFeed = currentUserId === feedItem.authorId

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex">
          {/* 피드 이미지/캔버스 영역 */}
          <div className="flex-1 bg-black flex items-center justify-center min-h-[500px]">
            <img
              src={feedItem.photoUrl || '/api/placeholder/600/600'}
              alt={feedItem.name || '피드 이미지'}
              className="max-w-full max-h-[80vh] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/api/placeholder/600/600?text=Feed+Image'
              }}
            />
          </div>
          
          {/* 피드 정보 및 댓글 영역 */}
          <div className="w-80 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3 flex-1">
                <img
                  src={feedItem.authorAvatar || '/api/placeholder/40/40'}
                  alt={feedItem.authorName || 'User'}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/api/placeholder/40/40?text=U'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{feedItem.authorName || 'Unknown User'}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(feedItem.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                {/* 팔로우 버튼 */}
                {!isOwnFeed && (
                  <button
                    onClick={() => onFollow(feedItem)}
                    className={`text-sm px-3 py-1 rounded-full transition-colors flex-shrink-0 ${
                      feedItem.isFollowing
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {feedItem.isFollowing ? '팔로잉' : '팔로우'}
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 ml-2 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 피드 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              <h2 className="font-medium mb-2">{feedItem.name}</h2>
              {feedItem.description && (
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{feedItem.description}</p>
              )}

              {/* 피드 통계 정보 */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{feedItem.likesCount || 0}</div>
                  <div className="text-sm text-gray-500">좋아요</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{feedItem.followersCount || 0}</div>
                  <div className="text-sm text-gray-500">팔로워</div>
                </div>
              </div>

              {/* 피드 설정 정보 */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">공개 설정:</span>
                  <span className={feedItem.isPublic ? 'text-green-600' : 'text-orange-600'}>
                    {feedItem.isPublic ? '공개' : '비공개'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">배경색:</span>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: feedItem.backgroundColor }}
                    />
                    <span className="text-xs font-mono">{feedItem.backgroundColor}</span>
                  </div>
                </div>
                {'source' in feedItem && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">소스:</span>
                    <span className="text-gray-700 capitalize">{feedItem.source}</span>
                  </div>
                )}
                {'discoverScore' in feedItem && feedItem.discoverScore && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">발견 점수:</span>
                    <span className="text-gray-700">{Math.round(feedItem.discoverScore)}/100</span>
                  </div>
                )}
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => onLike(feedItem)}
                    className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
                  >
                    {feedItem.isLiked ? (
                      <HeartSolidIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <HeartIcon className="h-6 w-6" />
                    )}
                    <span>{feedItem.likesCount || 0}</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: feedItem.name,
                          text: feedItem.description,
                          url: window.location.href
                        })
                      } else {
                        navigator.clipboard.writeText(window.location.href)
                        alert('링크가 클립보드에 복사되었습니다!')
                      }
                    }}
                    className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors"
                  >
                    <ShareIcon className="h-6 w-6" />
                    <span className="text-sm">공유</span>
                  </button>
                </div>

                {onDelete && (
                  <button
                    onClick={() => onDelete(feedItem)}
                    className="text-red-600 hover:text-red-800 text-sm transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedViewer
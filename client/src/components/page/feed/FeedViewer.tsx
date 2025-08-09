// src/components/page/feed/FeedViewer.tsx
'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { HeartIcon, ChatBubbleOvalLeftIcon, ShareIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useFeedViewer } from '@/hooks/useFeedViewer'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { UserFeed, TimelinePost } from '@/lib/types/feed'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import VirtualizedList from '@/components/ui/VirtualizedList'

// ✅ 기존 타입을 확장해서 FeedItem 정의
interface FeedItem {
  id: string
  title?: string
  description?: string
  previewImage: string
  fullImage?: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
  hashtags?: string[]
  createdAt: string
  author: {
    id: string
    username: string
    avatar: string
  }
  feed?: UserFeed
}

interface FeedViewerProps {
  userId?: string // 특정 사용자의 피드를 볼 때
  isMyFeed?: boolean // 내 피드인지 여부
}

const FeedViewer: React.FC<FeedViewerProps> = ({ userId, isMyFeed = false }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null)
  
  const {
    feedItems,
    isLoading,
    hasMore,
    loadMore,
    likeFeed,
    saveFeed,
    deleteFeed
  } = useFeedViewer({ userId })

  // ✅ useInfiniteScroll을 올바른 인터페이스로 사용
  const { targetRef } = useInfiniteScroll({
    onIntersect: loadMore,
    threshold: 0.1,
    enabled: hasMore && !isLoading
  })

  // 피드 아이템 클릭 핸들러
  const handleFeedClick = useCallback((feedItem: FeedItem) => {
    setSelectedFeedItem(feedItem)
  }, [])

  // 좋아요 토글
  const handleLikeToggle = useCallback((feedId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    likeFeed(feedId)
  }, [likeFeed])

  // 피드 저장
  const handleSave = useCallback((feedId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    saveFeed(feedId)
  }, [saveFeed])

  // 피드 삭제 (내 피드인 경우만)
  const handleDelete = useCallback((feedId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteFeed(feedId)
    }
  }, [deleteFeed])

  // 가상화된 피드 아이템 렌더러
  const renderFeedItem = useCallback((item: FeedItem, index: number) => {
    // ✅ 안전한 타입 체크 추가
    const feedItem = item as any

    return (
      <div
        key={feedItem.id}
        className="relative group cursor-pointer bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
        onClick={() => handleFeedClick(feedItem)}
      >
        {/* 피드 프리뷰 이미지 */}
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <img
            src={feedItem.previewImage || '/api/placeholder/400/400'}
            alt={feedItem.title || '피드 이미지'}
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
                <span>{feedItem.likesCount || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <ChatBubbleOvalLeftIcon className="h-6 w-6" />
                <span>{feedItem.commentsCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 피드 정보 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <img
                src={feedItem.author?.avatar || '/api/placeholder/32/32'}
                alt={feedItem.author?.username || 'User'}
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/api/placeholder/32/32?text=U'
                }}
              />
              <span className="text-sm font-medium text-gray-900">
                {feedItem.author?.username || 'Unknown User'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {feedItem.createdAt ? new Date(feedItem.createdAt).toLocaleDateString() : ''}
            </span>
          </div>
          
          {feedItem.title && (
            <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
              {feedItem.title}
            </h3>
          )}
          
          {feedItem.description && (
            <p className="text-xs text-gray-600 line-clamp-3">
              {feedItem.description}
            </p>
          )}

          {/* 해시태그 */}
          {feedItem.hashtags && feedItem.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {feedItem.hashtags.slice(0, 3).map((tag: string, tagIndex: number) => (
                <span
                  key={tagIndex}
                  className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded"
                >
                  #{tag}
                </span>
              ))}
              {feedItem.hashtags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{feedItem.hashtags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center justify-between p-4 pt-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => handleLikeToggle(feedItem.id, e)}
              className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
            >
              {feedItem.isLiked ? (
                <HeartSolidIcon className="h-5 w-5 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
              <span className="text-sm">{feedItem.likesCount || 0}</span>
            </button>
            
            <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors">
              <ChatBubbleOvalLeftIcon className="h-5 w-5" />
              <span className="text-sm">{feedItem.commentsCount || 0}</span>
            </button>
            
            <button className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors">
              <ShareIcon className="h-5 w-5" />
            </button>
          </div>

          {isMyFeed && (
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => handleSave(feedItem.id, e)}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                저장
              </button>
              <button
                onClick={(e) => handleDelete(feedItem.id, e)}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }, [handleFeedClick, handleLikeToggle, handleSave, handleDelete, isMyFeed])

  if (isLoading && feedItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full">
      <VirtualizedList
        items={feedItems}
        renderItem={renderFeedItem}
        itemHeight={400} // 대략적인 아이템 높이
        containerHeight={600}
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={loadMore}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4"
      />

      {/* 무한 스크롤 타겟 */}
      {hasMore && (
        <div ref={targetRef} className="flex justify-center p-4">
          {isLoading && <LoadingSpinner />}
        </div>
      )}

      {/* 피드 상세 모달 */}
      {selectedFeedItem && (
        <FeedDetailModal
          feedItem={selectedFeedItem}
          onClose={() => setSelectedFeedItem(null)}
          onLike={(feedId) => likeFeed(feedId)}
          onSave={(feedId) => saveFeed(feedId)}
          onDelete={isMyFeed ? (feedId) => deleteFeed(feedId) : undefined}
        />
      )}
    </div>
  )
}

// 피드 상세 모달 컴포넌트
interface FeedDetailModalProps {
  feedItem: FeedItem
  onClose: () => void
  onLike: (feedId: string) => void
  onSave: (feedId: string) => void
  onDelete?: (feedId: string) => void
}

const FeedDetailModal: React.FC<FeedDetailModalProps> = ({
  feedItem,
  onClose,
  onLike,
  onSave,
  onDelete
}) => {
  // ✅ 안전한 타입 체크 추가
  const item = feedItem as any

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex">
          {/* 피드 이미지/캔버스 영역 */}
          <div className="flex-1 bg-black flex items-center justify-center">
            <img
              src={item.fullImage || item.previewImage || '/api/placeholder/600/600'}
              alt={item.title || '피드 이미지'}
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
              <div className="flex items-center space-x-3">
                <img
                  src={item.author?.avatar || '/api/placeholder/40/40'}
                  alt={item.author?.username || 'User'}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/api/placeholder/40/40?text=U'
                  }}
                />
                <div>
                  <div className="font-medium">{item.author?.username || 'Unknown User'}</div>
                  <div className="text-sm text-gray-500">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* 피드 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              {item.title && (
                <h2 className="font-medium mb-2">{item.title}</h2>
              )}
              {item.description && (
                <p className="text-gray-700 mb-4">{item.description}</p>
              )}
              
              {/* 해시태그 */}
              {item.hashtags && item.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {item.hashtags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 댓글 영역 - 추후 구현 */}
              <div className="text-sm text-gray-500">
                댓글 기능은 추후 구현 예정입니다.
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => onLike(item.id)}
                    className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
                  >
                    {item.isLiked ? (
                      <HeartSolidIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <HeartIcon className="h-6 w-6" />
                    )}
                    <span>{item.likesCount || 0}</span>
                  </button>
                  
                  <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors">
                    <ChatBubbleOvalLeftIcon className="h-6 w-6" />
                    <span>{item.commentsCount || 0}</span>
                  </button>
                  
                  <button className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors">
                    <ShareIcon className="h-6 w-6" />
                  </button>
                </div>

                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
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
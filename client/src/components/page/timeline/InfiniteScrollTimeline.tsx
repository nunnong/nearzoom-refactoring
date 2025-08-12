'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TimelinePost } from '@/lib/types/feed'
import TimelinePostComponent from './TimelinePost'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useTimeline } from '@/hooks/useTimeline'

interface InfiniteScrollTimelineProps {
  className?: string
}

const InfiniteScrollTimeline: React.FC<InfiniteScrollTimelineProps> = ({
  className = '',
}) => {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)
  
  const {
    posts,
    isLoading,
    hasMore,
    error,
    loadMorePosts,
    likePost,
    unlikePost,
  } = useTimeline()

  // 무한 스크롤 훅
  const { targetRef } = useInfiniteScroll({
    onIntersect: loadMorePosts,
    threshold: 0.1,
    enabled: !isLoading && hasMore,
  })

  const handleLike = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    if (post.isLiked) {
      unlikePost(postId)
    } else {
      likePost(postId)
    }
  }, [posts, likePost, unlikePost])

  const handleUserClick = useCallback((userId: string) => {
    router.push(`/profile/${userId}`)
  }, [router])

  const handleExploreClick = useCallback(() => {
    router.push('/explore')
  }, [router])

  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    try {
      // useTimeline 훅에 refetch가 없으므로 페이지 새로고침
      window.location.reload()
    } finally {
      setIsRetrying(false)
    }
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.054 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">타임라인 로드 오류</h3>
          <p className="mt-2 text-gray-500">{error}</p>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? '재시도 중...' : '다시 시도'}
          </button>
        </div>
      </div>
    )
  }

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">타임라인이 비어있어요</h3>
          <p className="mt-2 text-gray-500">
            다른 사용자들을 팔로우해서 그들의 최신 업데이트를 확인해보세요!
          </p>
          <button
            onClick={handleExploreClick}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            사람들 둘러보기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Timeline</h2>
        <p className="text-gray-600">팔로우한 친구들의 최신 업데이트</p>
      </div>

      {/* 초기 로딩 */}
      {isLoading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">타임라인을 불러오는 중...</p>
        </div>
      )}

      {/* 포스트 목록 */}
      <div className="space-y-8">
        {posts.map((post, index) => (
          <TimelinePostComponent
            key={`${post.id}-${index}`}
            post={post}
            onLike={handleLike}
            onUserClick={handleUserClick}
          />
        ))}
      </div>

      {/* 더 로딩 중 */}
      {isLoading && posts.length > 0 && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-3 text-gray-600">더 많은 포스트 로딩 중...</span>
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      {hasMore && !isLoading && (
        <div ref={targetRef} className="h-10" />
      )}

      {/* 끝 메시지 */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 border-t border-gray-200 mt-8">
          <p className="text-gray-500">모든 포스트를 확인했습니다! 🎉</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            맨 위로 이동
          </button>
        </div>
      )}
    </div>
  )
}

export default InfiniteScrollTimeline
'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TimelinePost } from '@/lib/types/timeline' // 🔥 올바른 import 경로
import TimelinePostComponent from './TimelinePost'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useTimeline } from '@/hooks/useTimeline'

interface InfiniteScrollTimelineProps {
  className?: string
  type?: 'timeline' | 'explore' // 🔥 type prop 추가
}

const InfiniteScrollTimeline: React.FC<InfiniteScrollTimelineProps> = ({
  className = '',
  type = 'timeline' // 🔥 기본값 설정
}) => {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)
  
  const {
    posts,
    isLoading,
    hasMore,
    error,
    loadMorePosts,
    refreshPosts, // 🔥 추가: 새로고침 함수
    likePost,
    unlikePost,
    retry // 🔥 추가: 재시도 함수
  } = useTimeline({ type }) // 🔥 type 전달

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

  // 🔥 사진 클릭 핸들러 추가
  const handlePhotoClick = useCallback((postId: string) => {
    router.push(`/photo/${postId}`)
  }, [router])

  const handleExploreClick = useCallback(() => {
    router.push('/explore')
  }, [router])

  // 🔥 수정: useTimeline의 retry 함수 사용
  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    try {
      await retry() // 🔥 훅의 retry 함수 사용
    } finally {
      setIsRetrying(false)
    }
  }, [retry])

  // 🔥 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    refreshPosts()
  }, [refreshPosts])

  // 에러 상태
  if (error && posts.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.054 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">타임라인 로드 오류</h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">{error}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? '재시도 중...' : '다시 시도'}
            </button>
            {type === 'timeline' && (
              <button
                onClick={handleExploreClick}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                둘러보기로 이동
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 빈 상태 (로딩 중이 아닐 때)
  if (posts.length === 0 && !isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {type === 'timeline' ? '타임라인이 비어있어요' : '탐색할 피드가 없어요'}
          </h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            {type === 'timeline' 
              ? '다른 사용자들을 팔로우해서 그들의 최신 업데이트를 확인해보세요!'
              : '새로운 피드가 곧 업데이트될 예정입니다.'
            }
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              새로고침
            </button>
            {type === 'timeline' && (
              <button
                onClick={handleExploreClick}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                사람들 둘러보기
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {type === 'timeline' ? 'Timeline' : 'Explore'}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <p className="text-gray-600 mt-2">
          {type === 'timeline' 
            ? '팔로우한 친구들의 최신 업데이트' 
            : '새로운 사람들과 콘텐츠 탐색'
          }
        </p>
      </div>

      {/* 초기 로딩 */}
      {isLoading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            {type === 'timeline' ? '타임라인을 불러오는 중...' : '피드를 탐색하는 중...'}
          </p>
        </div>
      )}

      {/* 포스트 목록 */}
      {posts.length > 0 && (
        <div className="space-y-8">
          {posts.map((post, index) => (
            <TimelinePostComponent
              key={`${post.id}-${index}`}
              post={post}
              onLike={handleLike}
              onUserClick={handleUserClick}
              onPhotoClick={handlePhotoClick} // 🔥 사진 클릭 핸들러 전달
            />
          ))}
        </div>
      )}

      {/* 더 로딩 중 */}
      {isLoading && posts.length > 0 && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-3 text-gray-600">더 많은 포스트 로딩 중...</span>
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      {hasMore && !isLoading && posts.length > 0 && (
        <div ref={targetRef} className="h-10" />
      )}

      {/* 끝 메시지 */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 border-t border-gray-200 mt-8">
          <p className="text-gray-500">
            {type === 'timeline' 
              ? '모든 포스트를 확인했습니다! 🎉' 
              : '모든 피드를 탐색했습니다! 🎉'
            }
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            맨 위로 이동
          </button>
        </div>
      )}

      {/* 에러 메시지 (포스트가 있는 상태에서) */}
      {error && posts.length > 0 && (
        <div className="text-center py-4 bg-red-50 rounded-lg mx-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium disabled:opacity-50"
          >
            {isRetrying ? '재시도 중...' : '다시 시도'}
          </button>
        </div>
      )}
    </div>
  )
}

export default InfiniteScrollTimeline
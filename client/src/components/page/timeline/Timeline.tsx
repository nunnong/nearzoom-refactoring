'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TimelinePost } from '@/lib/types/feed'
import TimelinePostComponent from './TimelinePost'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

interface TimelineProps {
  className?: string
}

const Timeline: React.FC<TimelineProps> = ({ className = '' }) => {
  const router = useRouter()
  const [posts, setPosts] = useState<TimelinePost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  // Mock 데이터 생성
  const generateMockPosts = (pageNum: number, count: number = 10): TimelinePost[] => {
    const mockPosts: TimelinePost[] = []
    
    for (let i = 0; i < count; i++) {
      const postId = `${pageNum}-${i}`
      mockPosts.push({
        id: postId,
        user: {
          id: `user${(pageNum + i) % 5 + 1}`,
          name: ['김다꾸', '이예쁜', '박귀염', '최감성', '정아름'][i % 5],
          profileImage: i % 3 === 0 ? `/api/placeholder/40/40?seed=${i}` : undefined,
        },
        element: {
          id: `element-${postId}`,
          type: 'PHOTO',
          x: 100 + (i * 50),
          y: 100 + (i * 30),
          width: 300,
          height: 400,
          rotation: 0,
          zIndex: 1,
          photoId: `photo-${postId}`,
          src: `/api/placeholder/300/400?seed=${pageNum * 10 + i}`,
          alt: `Photo ${postId}`,
          createdAt: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
          updatedAt: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
        },
        createdAt: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
        likesCount: Math.floor(Math.random() * 100),
        isLiked: Math.random() > 0.7,
      })
    }
    
    return mockPosts
  }

  // 첫 로드
  useEffect(() => {
    const loadInitialPosts = async () => {
      setIsLoading(true)
      
      // Mock API 호출 시뮬레이션
      setTimeout(() => {
        const initialPosts = generateMockPosts(1, 5)
        setPosts(initialPosts)
        setIsLoading(false)
      }, 800)
    }
    
    loadInitialPosts()
  }, [])

  // 더 많은 포스트 로드
  const loadMorePosts = useCallback(async () => {
    if (isLoading || !hasMore) return
    
    setIsLoading(true)
    
    // Mock API 호출 시뮬레이션
    setTimeout(() => {
      const nextPage = page + 1
      const newPosts = generateMockPosts(nextPage, 5)
      
      if (nextPage >= 5) { // 5페이지까지만
        setHasMore(false)
      }
      
      setPosts(prev => [...prev, ...newPosts])
      setPage(nextPage)
      setIsLoading(false)
    }, 1000)
  }, [page, isLoading, hasMore])

  // 무한 스크롤 훅 - enabled 옵션 추가
  const { targetRef } = useInfiniteScroll({
    onIntersect: loadMorePosts,
    threshold: 0.1,
    enabled: !isLoading && hasMore,
  })

  const handleLike = useCallback((postId: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1,
            }
          : post
      )
    )
  }, [])

  const handleUserClick = useCallback((userId: string) => {
    router.push(`/profile/${userId}`)
  }, [router])

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">타임라인을 불러오는 중...</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">타임라인이 비어있어요</h3>
          <p className="mt-2 text-gray-500">다른 사용자들을 팔로우해서 그들의 최신 업데이트를 확인해보세요!</p>
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

      {/* 포스트 목록 */}
      <div className="space-y-8">
        {posts.map((post) => (
          <TimelinePostComponent
            key={post.id}
            post={post}
            onLike={handleLike}
            onUserClick={handleUserClick}
          />
        ))}
      </div>

      {/* 로딩 더보기 */}
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

export default Timeline
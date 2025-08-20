'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserIcon } from '@heroicons/react/24/outline'
import { FeedLoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/stores/authStore'
import { profileAPI } from '@/lib/api/profile'
import RandomPhotoGrid from '@/components/page/explore/RandomPhotoGrid'
import { useInfiniteScrollTrigger } from '@/hooks/useInfiniteScroll'
import api from '@/lib/axios'

interface UserFeedTimelineProps {
  accountName: string;
  className?: string;
}

const UserFeedTimeline: React.FC<UserFeedTimelineProps> = ({ 
  accountName, 
  className = '' 
}) => {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)

  const isEmpty = !loading && posts.length === 0

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await profileAPI.getUserPosts(accountName, { limit: 12 })
      
      const transformedPosts = result.posts.map((post: any) => ({
        ...post,
        id: post.postId.toString(),
        photoUrl: post.imgUrl,
        authorId: post.authorAccountName,
        authorName: post.authorAccountName,
        authorAvatar: post.authorProfileImage,
        likesCount: post.likeCount,
        isLiked: post.isLikedByMe,
        source: 'user' as const,
      }))
      
      setPosts(transformedPosts)
      setHasNext(result.hasNext)
      setNextCursor(result.nextCursor)
      
    } catch (error: any) {
      console.error('게시물 로딩 실패:', error)
      setError(error.message || '게시물을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [accountName])

  const loadMore = useCallback(async () => {
    if (!hasNext || isLoadingMore) return

    try {
      setIsLoadingMore(true)
      
      const result = await profileAPI.getUserPosts(accountName, { 
        limit: 12, 
        cursor: nextCursor || undefined 
      })
      
      const transformedPosts = result.posts.map((post: any) => ({
        ...post,
        id: post.postId.toString(),
        photoUrl: post.imgUrl,
        authorId: post.authorAccountName,
        authorName: post.authorAccountName,
        authorAvatar: post.authorProfileImage,
        likesCount: post.likeCount,
        isLiked: post.isLikedByMe,
        source: 'user' as const,
      }))
      
      setPosts(prev => [...prev, ...transformedPosts])
      setHasNext(result.hasNext)
      setNextCursor(result.nextCursor)
      
    } catch (error: any) {
      console.error('추가 게시물 로딩 실패:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [accountName, hasNext, isLoadingMore, nextCursor])

  const refresh = useCallback(() => {
    setPosts([])
    setNextCursor(null)
    loadInitial()
  }, [loadInitial])

  const updateItem = useCallback((predicate: (item: any) => boolean, updater: (item: any) => any) => {
    setPosts(prev => prev.map(item => predicate(item) ? updater(item) : item))
  }, [])

  const handleLikeToggle = useCallback(async (post: any) => {
    if (!isAuthenticated) return;

    try {
      // 낙관적 업데이트
      updateItem(
        (item: any) => item.postId === post.postId,
        (item: any) => ({
          ...item,
          isLiked: !item.isLiked,
          likesCount: item.isLiked ? item.likesCount - 1 : item.likesCount + 1,
        })
      );

      if (post.isLiked) {
        await api.delete(`/likes/posts/${post.postId}`);
      } else {
        await api.post(`/likes/posts/${post.postId}`);
      }

      console.log(`✅ 좋아요 토글 성공: ${post.isLiked ? '취소' : '추가'}`);

    } catch (error) {
      console.error('좋아요 토글 실패:', error);
      // 에러 발생 시 UI 원상복구
      updateItem(
        (item: any) => item.postId === post.postId,
        (item: any) => ({
          ...item,
          isLiked: post.isLiked,
          likesCount: post.likesCount,
        })
      );
    }
  }, [updateItem, isAuthenticated]);

  const handlePostClick = useCallback((post: any) => {
    router.push(`/feeds/posts/${post.postId}`);
  }, [router]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const triggerRef = useInfiniteScrollTrigger(loadMore, hasNext && !isLoadingMore);

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <FeedLoadingSpinner size="lg" text="게시물을 불러오는 중..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없어요</h3>
          <p className="text-gray-500">이 사용자가 게시물을 올리면 여기에 표시됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <RandomPhotoGrid
        photos={posts}
        onPhotoClick={handlePostClick}
        onAuthorClick={() => {}}
        onLikeToggle={handleLikeToggle}
      />

      {hasNext && (
        <div ref={triggerRef as React.RefObject<HTMLDivElement>} className="flex items-center justify-center py-8">
          {isLoadingMore ? (
            <div className="flex flex-col items-center">
              <FeedLoadingSpinner size="md" />
              <p className="mt-2 text-gray-600 text-sm">더 많은 게시물을 불러오는 중...</p>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">
              스크롤하여 더 많은 게시물 보기
            </div>
          )}
        </div>
      )}

      {!hasNext && posts.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-gray-500 text-sm">모든 게시물을 확인했습니다!</p>
            <button
              onClick={refresh}
              className="mt-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFeedTimeline;

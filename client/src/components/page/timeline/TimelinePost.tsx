'use client'

import React, { useCallback } from 'react'
import { HeartIcon, ChatBubbleOvalLeftIcon, ShareIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { TimelinePost } from '@/lib/types/feed'

interface TimelinePostProps {
  post: TimelinePost
  onLike: (postId: string) => void
  onUserClick: (userId: string) => void
  className?: string
}

const TimelinePostComponent: React.FC<TimelinePostProps> = ({
  post,
  onLike,
  onUserClick,
  className = '',
}) => {
  const formatTimeAgo = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      
      if (diffInMinutes < 1) return '방금 전'
      if (diffInMinutes < 60) return `${diffInMinutes}분 전`
      
      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) return `${diffInHours}시간 전`
      
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) return `${diffInDays}일 전`
      
      return date.toLocaleDateString('ko-KR')
    } catch {
      return '알 수 없음'
    }
  }, [])

  const handleShare = useCallback(() => {
    // 기본 Web Share API 사용 또는 클립보드 복사
    if (navigator.share) {
      navigator.share({
        title: `${post.user.name}님의 포스트`,
        text: post.element.alt || '',
        url: window.location.href,
      }).catch(() => {
        // Share API 실패 시 클립보드 복사
        navigator.clipboard?.writeText(window.location.href)
      })
    } else {
      // Share API 미지원 시 클립보드 복사
      navigator.clipboard?.writeText(window.location.href)
    }
  }, [post.user.name, post.element.alt])

  const handleComment = useCallback(() => {
    // 댓글 기능은 아직 구현되지 않았으므로 일단 비워둠
    // 실제 구현 시 댓글 모달이나 페이지로 이동
  }, [])

  const handleLike = useCallback(() => {
    onLike(post.id)
  }, [onLike, post.id])

  const handleUserProfileClick = useCallback(() => {
    onUserClick(post.user.id)
  }, [onUserClick, post.user.id])

  return (
    <article className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* 헤더 - 사용자 정보 */}
      <div className="p-4">
        <div className="flex items-center">
          <button
            onClick={handleUserProfileClick}
            className="flex items-center space-x-3 hover:opacity-75 transition-opacity"
            aria-label={`${post.user.name}님의 프로필 보기`}
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {post.user.profileImage ? (
                <img
                  src={post.user.profileImage}
                  alt={post.user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {post.user.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">{post.user.name}</p>
              <p className="text-sm text-gray-500">{formatTimeAgo(post.createdAt)}</p>
            </div>
          </button>
        </div>
      </div>

      {/* 이미지 */}
      <div className="relative">
        <img
          src={post.element.src}
          alt={post.element.alt}
          className="w-full h-auto cursor-pointer"
          onClick={handleUserProfileClick}
        />
        
        {/* 이미지 위 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* 액션 버튼들 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              className="flex items-center space-x-1 group"
              aria-label={post.isLiked ? '좋아요 취소' : '좋아요'}
            >
              {post.isLiked ? (
                <HeartSolidIcon className="w-6 h-6 text-red-500" />
              ) : (
                <HeartIcon className="w-6 h-6 text-gray-700 group-hover:text-red-500 transition-colors" />
              )}
            </button>
            
            <button
              onClick={handleComment}
              className="flex items-center space-x-1 group"
              aria-label="댓글 달기"
            >
              <ChatBubbleOvalLeftIcon className="w-6 h-6 text-gray-700 group-hover:text-blue-500 transition-colors" />
            </button>
            
            <button
              onClick={handleShare}
              className="flex items-center space-x-1 group"
              aria-label="공유하기"
            >
              <ShareIcon className="w-6 h-6 text-gray-700 group-hover:text-green-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* 좋아요 수 */}
        <div className="mb-2">
          {post.likesCount > 0 && (
            <p className="font-semibold text-gray-900">
              좋아요 {post.likesCount.toLocaleString()}개
            </p>
          )}
        </div>

        {/* 캡션 (이미지 alt를 캡션으로 사용) */}
        {post.element.alt && (
          <div className="text-gray-900">
            <span className="font-semibold mr-2">{post.user.name}</span>
            <span>{post.element.alt}</span>
          </div>
        )}

        {/* 댓글 보기 */}
        <button 
          className="text-gray-500 text-sm mt-1 hover:text-gray-700 transition-colors"
          onClick={handleComment}
          aria-label="댓글 모두 보기"
        >
          댓글 모두 보기
        </button>
      </div>
    </article>
  )
}

export default TimelinePostComponent
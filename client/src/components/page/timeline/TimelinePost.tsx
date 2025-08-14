// src/components/page/timeline/TimelinePost.tsx - 백엔드 연동 완료

'use client'

import React, { useCallback } from 'react'
import { HeartIcon, ShareIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// ============================================================================
// 🔥 백엔드 연동 - TimelinePost 인터페이스 (InfiniteScrollTimeline과 일치)
// ============================================================================

interface TimelinePost {
  id: string;
  postId: number;
  photoId: number;
  imgUrl: string;                    // 백엔드 PostResponse.imgUrl
  caption: string;                   // 백엔드 PostResponse.caption
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;             // 백엔드 PostResponse.isLikedByMe
  authorId: number;                 // 백엔드 PostResponse.authorId
  authorAccountName: string;        // 백엔드 PostResponse.authorAccountName
  authorProfileImage?: string;      // 백엔드 PostResponse.authorProfileImage
  source: 'timeline' | 'explore';
  displayOrder?: number;
  timeAgo?: string;
  formattedLikeCount?: string;
}

interface TimelinePostProps {
  post: TimelinePost
  onLike: (postId: string) => void
  onUserClick: (accountName: string) => void // accountName을 전달
  onPhotoClick?: (postId: string) => void
  className?: string
}

// ============================================================================
// TimelinePost 컴포넌트 - 백엔드 연동 완료
// ============================================================================

const TimelinePostComponent: React.FC<TimelinePostProps> = ({
  post,
  onLike,
  onUserClick,
  onPhotoClick,
  className = '',
}) => {
  
  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================
  
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
      
      const diffInWeeks = Math.floor(diffInDays / 7)
      if (diffInWeeks < 4) return `${diffInWeeks}주 전`
      
      const diffInMonths = Math.floor(diffInDays / 30)
      if (diffInMonths < 12) return `${diffInMonths}개월 전`
      
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return '알 수 없음'
    }
  }, [])

  const formatLikeCount = useCallback((count: number): string => {
    if (count < 1000) return count.toString()
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`
    return `${(count / 1000000).toFixed(1)}m`
  }, [])

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `${post.authorAccountName}님의 포스트`, // ✅ 올바른 필드명
      text: post.caption || '사진을 확인해보세요!', // ✅ 올바른 필드명  
      url: `${window.location.origin}/feeds/posts/${post.postId}` // ✅ 백엔드 라우트와 일치
    }

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
        console.log('링크가 클립보드에 복사되었습니다!')
      }
    } catch (error) {
      console.error('공유 실패:', error)
    }
  }, [post.postId, post.authorAccountName, post.caption])

  const handleLike = useCallback(() => {
    onLike(post.id) // postId를 string으로 전달
  }, [onLike, post.id])

  const handleUserProfileClick = useCallback(() => {
    onUserClick(post.authorAccountName) // ✅ accountName 전달
  }, [onUserClick, post.authorAccountName])

  const handlePhotoClick = useCallback(() => {
    if (onPhotoClick) {
      onPhotoClick(post.id) // postId를 string으로 전달
    }
  }, [onPhotoClick, post.id])

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <article className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      {/* 헤더 - 사용자 정보 */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleUserProfileClick}
            className="flex items-center space-x-3 hover:opacity-75 transition-opacity group"
            aria-label={`${post.authorAccountName}님의 프로필 보기`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-blue-200 transition-all">
              {post.authorProfileImage ? ( // ✅ 올바른 필드명
                <img
                  src={post.authorProfileImage}
                  alt={post.authorAccountName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <span className="text-sm font-bold text-white">
                  {post.authorAccountName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {post.authorAccountName} {/* ✅ 올바른 필드명 */}
              </p>
              <p className="text-sm text-gray-500">
                {post.timeAgo || formatTimeAgo(post.createdAt)} {/* ✅ 미리 계산된 timeAgo 사용 */}
              </p>
            </div>
          </button>
          
          {/* 소스 표시 */}
          <div className="flex items-center space-x-2">
            {post.source === 'timeline' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                팔로잉
              </span>
            )}
            {post.source === 'explore' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                탐색
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 이미지 */}
      <div className="relative">
        <img
          src={post.imgUrl} // ✅ 올바른 필드명 (백엔드 PostResponse.imgUrl)
          alt={post.caption || '게시물 이미지'} // ✅ 올바른 필드명
          className="w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
          onClick={handlePhotoClick}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-image.jpg'
          }}
        />
        
        {/* 이미지 위 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
        
        {/* 이미지 클릭 힌트 */}
        {onPhotoClick && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
            <div className="bg-white/90 rounded-full p-2 shadow-lg">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼들 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            {/* 좋아요 버튼 */}
            <button
              onClick={handleLike}
              className="flex items-center space-x-1 group transition-all"
              aria-label={post.isLikedByMe ? '좋아요 취소' : '좋아요'} // ✅ 올바른 필드명
            >
              {post.isLikedByMe ? ( // ✅ 올바른 필드명
                <HeartSolidIcon className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
              ) : (
                <HeartIcon className="w-6 h-6 text-gray-700 group-hover:text-red-500 group-hover:scale-110 transition-all" />
              )}
            </button>
            
            {/* 공유 버튼 */}
            <button
              onClick={handleShare}
              className="flex items-center space-x-1 group transition-all"
              aria-label="공유하기"
            >
              <ShareIcon className="w-6 h-6 text-gray-700 group-hover:text-green-500 group-hover:scale-110 transition-all" />
            </button>
          </div>

          {/* 좋아요 수 표시 */}
          {post.likeCount > 0 && (
            <div className="text-sm text-gray-600">
              좋아요 {post.formattedLikeCount || formatLikeCount(post.likeCount)}개 {/* ✅ 미리 계산된 값 우선 사용 */}
            </div>
          )}
        </div>

        {/* 캡션 */}
        {post.caption && ( // ✅ 올바른 필드명
          <div className="text-gray-900">
            <span className="font-semibold mr-2">{post.authorAccountName}</span> {/* ✅ 올바른 필드명 */}
            <span className="whitespace-pre-wrap">{post.caption}</span> {/* ✅ 올바른 필드명 */}
          </div>
        )}

        {/* 좋아요 상태 표시 */}
        {post.isLikedByMe && ( // ✅ 올바른 필드명
          <div className="mt-2 text-sm text-red-600 font-medium">
            ❤️ 좋아요를 눌렀습니다
          </div>
        )}

        {/* 개발 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <div className="font-semibold mb-1">🔥 Post 개발 정보</div>
            <div>Post ID: {post.postId}</div>
            <div>Photo ID: {post.photoId}</div>
            <div>Author ID: {post.authorId}</div>
            <div>Account: {post.authorAccountName}</div>
            <div>Source: {post.source}</div>
            <div>Likes: {post.likeCount}</div>
            <div>Liked: {post.isLikedByMe ? 'Yes' : 'No'}</div>
            <div>Display Order: {post.displayOrder || 'N/A'}</div>
          </div>
        )}
      </div>
    </article>
  )
}

export default TimelinePostComponent
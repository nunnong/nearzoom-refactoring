// =============================================================================
// 📁 TimelinePost.tsx - 백엔드 완벽 연동 최종 버전
// =============================================================================

'use client'

import React, { useCallback, useState } from 'react'
import { HeartIcon, ShareIcon, ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// ============================================================================
// 백엔드 연동 - TimelinePost 인터페이스 (InfiniteScrollTimeline과 100% 일치)
// ============================================================================

interface TimelinePost {
  id: string;
  postId: number;                   // 🔥 PostResponse.postId (Long -> number)
  photoId: number;                  // 🔥 PostResponse.photoId (Long -> number)
  imgUrl: string;                   // 🔥 PostResponse.imgUrl
  caption: string;                  // 🔥 PostResponse.caption (null 허용)
  createdAt: string;                // 🔥 PostResponse.createdAt (LocalDateTime -> string)
  likeCount: number;                // 🔥 PostResponse.likeCount (long -> number)
  isLikedByMe: boolean;            // 🔥 PostResponse.isLikedByMe
  authorId: number;                // 🔥 PostResponse.authorId (Long -> number)
  authorAccountName: string;       // 🔥 PostResponse.authorAccountName
  authorProfileImage?: string;     // 🔥 PostResponse.authorProfileImage (nullable)
  source: 'timeline' | 'explore';
  displayOrder?: number;
  timeAgo?: string;
  formattedLikeCount?: string;
}

interface TimelinePostProps {
  post: TimelinePost;
  onLike: (postId: string) => void;
  onUserClick: (accountName: string) => void;
  onPhotoClick?: (postId: string) => void;
  onComment?: (postId: string) => void;
  className?: string;
  showActions?: boolean;
  showSource?: boolean;
}

// ============================================================================
// TimelinePost 컴포넌트 - 백엔드 연동 완료
// ============================================================================

function TimelinePostComponent({
  post,
  onLike,
  onUserClick,
  onPhotoClick,
  onComment,
  className = '',
  showActions = true,
  showSource = true,
}: TimelinePostProps): React.ReactElement {
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isImageError, setIsImageError] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================
  
  const formatTimeAgo = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return '방금 전';
      if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}시간 전`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}일 전`;
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) return `${diffInWeeks}주 전`;
      
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) return `${diffInMonths}개월 전`;
      
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '알 수 없음';
    }
  }, []);

  const formatLikeCount = useCallback((count: number): string => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1000000).toFixed(1)}m`;
  }, []);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleShare = useCallback(async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    
    const shareData = {
      title: `${post.authorAccountName}님의 포스트`,
      text: post.caption || '사진을 확인해보세요!',
      url: `${window.location.origin}/feeds/posts/${post.postId}`
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        // 토스트 메시지로 피드백 제공 (선택적)
        console.log('링크가 클립보드에 복사되었습니다!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('공유 실패:', error);
      }
    } finally {
      setIsSharing(false);
    }
  }, [post.postId, post.authorAccountName, post.caption, isSharing]);

  const handleLike = useCallback(() => {
    onLike(post.id); // postId를 string으로 전달
  }, [onLike, post.id]);

  const handleUserProfileClick = useCallback(() => {
    onUserClick(post.authorAccountName);
  }, [onUserClick, post.authorAccountName]);

  const handlePhotoClick = useCallback(() => {
    if (onPhotoClick) {
      onPhotoClick(post.id);
    }
  }, [onPhotoClick, post.id]);

  const handleCommentClick = useCallback(() => {
    if (onComment) {
      onComment(post.id);
    }
  }, [onComment, post.id]);

  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoading(false);
    setIsImageError(true);
  }, []);

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
              {post.authorProfileImage ? (
                <img
                  src={post.authorProfileImage}
                  alt={`${post.authorAccountName}님의 프로필`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
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
                {post.authorAccountName}
              </p>
              <p className="text-sm text-gray-500">
                {post.timeAgo || formatTimeAgo(post.createdAt)}
              </p>
            </div>
          </button>
          
          {/* 소스 표시 */}
          {showSource && (
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
          )}
        </div>
      </div>

      {/* 이미지 */}
      <div className="relative">
        {/* 로딩 스켈레톤 */}
        {isImageLoading && (
          <div className="w-full h-96 bg-gray-200 animate-pulse flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* 에러 상태 */}
        {isImageError && (
          <div className="w-full h-96 bg-gray-100 flex flex-col items-center justify-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.054 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-gray-500">이미지를 불러올 수 없습니다</p>
          </div>
        )}

        {/* 실제 이미지 */}
        <img
          src={post.imgUrl}
          alt={post.caption || '게시물 이미지'}
          className={`w-full h-auto cursor-pointer hover:opacity-95 transition-opacity ${isImageLoading || isImageError ? 'hidden' : ''}`}
          onClick={handlePhotoClick}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
        
        {/* 이미지 위 그라데이션 오버레이 */}
        {!isImageLoading && !isImageError && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
        )}
        
        {/* 이미지 클릭 힌트 */}
        {onPhotoClick && !isImageLoading && !isImageError && (
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
      {showActions && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              {/* 좋아요 버튼 */}
              <button
                onClick={handleLike}
                className="flex items-center space-x-1 group transition-all"
                aria-label={post.isLikedByMe ? '좋아요 취소' : '좋아요'}
              >
                {post.isLikedByMe ? (
                  <HeartSolidIcon className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
                ) : (
                  <HeartIcon className="w-6 h-6 text-gray-700 group-hover:text-red-500 group-hover:scale-110 transition-all" />
                )}
              </button>
              
              {/* 댓글 버튼 */}
              {onComment && (
                <button
                  onClick={handleCommentClick}
                  className="flex items-center space-x-1 group transition-all"
                  aria-label="댓글 달기"
                >
                  <ChatBubbleOvalLeftIcon className="w-6 h-6 text-gray-700 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                </button>
              )}
              
              {/* 공유 버튼 */}
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex items-center space-x-1 group transition-all disabled:opacity-50"
                aria-label="공유하기"
              >
                <ShareIcon className={`w-6 h-6 text-gray-700 group-hover:text-green-500 group-hover:scale-110 transition-all ${isSharing ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            {/* 좋아요 수 표시 */}
            {post.likeCount > 0 && (
              <div className="text-sm text-gray-600">
                좋아요 {post.formattedLikeCount || formatLikeCount(post.likeCount)}개
              </div>
            )}
          </div>

          {/* 캡션 */}
          {post.caption && (
            <div className="text-gray-900">
              <span className="font-semibold mr-2">{post.authorAccountName}</span>
              <span className="whitespace-pre-wrap break-words">{post.caption}</span>
            </div>
          )}

          {/* 좋아요 상태 표시 */}
          {post.isLikedByMe && (
            <div className="mt-2 text-sm text-red-600 font-medium flex items-center">
              <HeartSolidIcon className="w-4 h-4 mr-1" />
              좋아요를 눌렀습니다
            </div>
          )}
        </div>
      )}

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mx-4 mb-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <div className="font-semibold mb-1">🔥 Post 개발 정보</div>
          <div>Post ID: {post.postId}</div>
          <div>Photo ID: {post.photoId}</div>
          <div>Author ID: {post.authorId}</div>
          <div>Account: {post.authorAccountName}</div>
          <div>Source: {post.source}</div>
          <div>Likes: {post.likeCount}</div>
          <div>Liked: {post.isLikedByMe ? 'Yes' : 'No'}</div>
          <div>Display Order: {post.displayOrder || 'N/A'}</div>
          <div>Has Profile Image: {post.authorProfileImage ? 'Yes' : 'No'}</div>
        </div>
      )}
    </article>
  );
}

// ============================================================================
// 🔥 특화된 TimelinePost 컴포넌트들
// ============================================================================

// 간단한 TimelinePost (액션 버튼 없음)
export const SimpleTimelinePost: React.FC<Omit<TimelinePostProps, 'showActions'>> = (props) => {
  return <TimelinePostComponent {...props} showActions={false} />;
};

// 소스 태그 없는 TimelinePost
export const CleanTimelinePost: React.FC<Omit<TimelinePostProps, 'showSource'>> = (props) => {
  return <TimelinePostComponent {...props} showSource={false} />;
};

// 댓글 기능이 있는 TimelinePost
export const InteractiveTimelinePost: React.FC<TimelinePostProps> = (props) => {
  return <TimelinePostComponent {...props} onComment={props.onComment || (() => {})} />;
};

// ============================================================================
// 🔥 TimelinePost 관련 유틸리티 함수들
// ============================================================================

export const formatPostTimeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    return date.toLocaleDateString('ko-KR');
  } catch {
    return '알 수 없음';
  }
};

export const formatPostLikeCount = (count: number): string => {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}m`;
};

export const getShareUrl = (postId: number): string => {
  return `${window.location.origin}/feeds/posts/${postId}`;
};

// ============================================================================
// 🔥 백엔드 API 관련 타입 export
// ============================================================================

export type { TimelinePost, TimelinePostProps };

export default TimelinePostComponent;
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import Image from 'next/image'
import MyRoomHeader from '@/components/page/myroom/MyRoomHeader'
import { getFollowingTimeline } from '@/lib/api/timeline'

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', className = '', text }: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

// 안전한 이미지 컴포넌트 (배포 환경 대비)
const SafeImage = ({ src, alt, className, ...props }: {
  src: string;
  alt: string;
  className?: string;
  [key: string]: any;
}) => {
  const [useNextImage, setUseNextImage] = useState(true);
  const [imageError, setImageError] = useState(false);

  // next/image 에러 시 일반 img 태그로 fallback
  if (!useNextImage || imageError) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setImageError(true)}
        {...props}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={48}
      height={48}
      onError={() => setUseNextImage(false)}
      {...props}
    />
  );
};

// 타임라인 아이템 컴포넌트
const TimelineItem = ({ post }: { post: any }) => {
  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const router = useRouter()
  const { user } = useAuthStore() // 현재 사용자 정보 가져오기

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation() // 클릭 이벤트 전파 방지
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
  }

  const handlePostClick = () => {
    // 게시물을 클릭하면 게시물 상세 페이지로 이동
    router.push(`/feeds/posts/${post.postId}`)
  }

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation() // 클릭 이벤트 전파 방지
    // 사용자 클릭 시 [accountName] 라우팅으로 이동 (일관성 유지)
    const accountName = post.authorAccountName;
    if (accountName) {
      router.push(`/${accountName}`)
    }
  }

  return (
    <div 
      className="bg-white rounded-lg p-3 shadow-sm mb-3 max-w-lg mx-auto cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={handlePostClick}
    >
      {/* 사용자 정보 */}
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
          {post.authorProfileImage ? (
            <SafeImage
              src={post.authorProfileImage}
              alt={post.authorAccountName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <span className="text-gray-600 text-sm font-medium">
              {post.authorAccountName?.charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-xs">{post.authorAccountName}</h3>
          <p className="text-xs text-gray-500">{post.timeAgo}</p>
          {/* 사용자 메일 정보 (hover 시 표시) */}
          <p 
            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
            onClick={handleUserClick}
          >
            @{post.authorAccountName}
          </p>
        </div>
      </div>

      {/* 이미지 */}
      <div className="mb-2">
        <img
          src={post.imgUrl}
          alt={post.caption || '게시물'}
          className="w-full h-auto rounded-md max-h-64 object-cover"
        />
      </div>

      {/* 설명 */}
      {post.caption && (
        <p className="text-gray-700 mb-2 text-xs line-clamp-2">{post.caption}</p>
      )}

      {/* 액션 버튼들 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors text-xs ${
              isLiked
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg
              className={`w-3 h-3 ${isLiked ? 'fill-current' : 'stroke-current fill-none'}`}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="text-xs">{likeCount}</span>
          </button>

          <button className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors text-xs">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-xs">댓글</span>
          </button>

          <button className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors text-xs">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
            <span className="text-xs">공유</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Timeline 페이지 메인 컴포넌트
const TimelinePage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();
  const [timelinePosts, setTimelinePosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 팔로잉 타임라인 로딩
  const loadTimeline = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await getFollowingTimeline({ limit: 20 });
      
      if (result.success && result.data) {
        setTimelinePosts(result.data.posts);
      } else {
        setError(result.error || '타임라인을 불러오는데 실패했습니다.');
        console.error('❌ 타임라인 로딩 실패:', result.error);
      }
    } catch (error) {
      console.error('❌ 타임라인 로딩 중 에러:', error);
      setError('타임라인을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // 인증 상태 변경 시 타임라인 로딩
  useEffect(() => {
    if (isAuthenticated && user) {
      loadTimeline();
    }
  }, [isAuthenticated, user, loadTimeline]);

  // 🏗️ 인증 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner
          size="lg"
          text="인증 확인 중..."
        />
      </div>
    );
  }

  // 🏗️ 로그인하지 않은 경우
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">팔로잉 타임라인을 보려면 로그인해 주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MyRoomHeader
        user={{
          name: user.name,
          email: user.email,
          profileImage: user.profileImage
        }}
        onUploadSelfie={() => router.push('/upload-selfie')}
        onAccount={() => router.push('/profile')}
        onLogout={() => router.push('/')}
        onDeleteAccount={() => router.push('/profile')}
      />

      <main className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Timeline
            </h1>
            <p className="text-gray-600 text-sm">
              팔로우하는 사람들의 소식을 한눈에
            </p>
          </div>

          {/* 타임라인 컨텐츠 */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" text="타임라인을 불러오는 중..." />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">타임라인 로딩 실패</h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <button
                  onClick={loadTimeline}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  다시 시도
                </button>
              </div>
            ) : timelinePosts.length > 0 ? (
              timelinePosts.map((post) => (
                <TimelineItem key={post.postId} post={post} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">아직 팔로우하는 사용자가 없습니다</h3>
                <p className="text-gray-500 mb-6">사용자를 팔로우하여 타임라인을 채워보세요!</p>
                <button
                  onClick={() => router.push('/explore')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  사용자 탐색하기
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default TimelinePage
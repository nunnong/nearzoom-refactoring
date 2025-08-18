'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import MyRoomHeader from '@/components/page/myroom/MyRoomHeader'
import api from '@/lib/axios'

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

// Explore 게시물 아이템 컴포넌트 (깔끔한 그리드용)
const ExplorePostItem = ({ post }: { post: any }) => {
  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false)
  const router = useRouter()
  const { user } = useAuthStore() // 현재 사용자 정보 가져오기


  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation() // 클릭 이벤트 전파 방지
    setIsLiked(!isLiked)
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
      className="group relative overflow-hidden bg-black cursor-pointer"
      onClick={handlePostClick}
    >
      {/* 이미지 */}
      <div className="aspect-square overflow-hidden">
        <img
          src={post.imgUrl}
          alt={post.caption || '게시물'}
          className="w-full h-full object-cover"
        />
        
        {/* 호버 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
        
        {/* 좋아요 버튼 (호버 시 표시) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleLike}
            className="p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white/90 transition-colors shadow-lg"
          >
            <svg
              className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-current' : 'text-gray-700'}`}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>

        {/* 사용자 정보 (호버 시 표시) */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
            <p 
              className="text-white text-xs font-medium cursor-pointer hover:text-blue-300 transition-colors"
              onClick={handleUserClick}
            >
              @{post.authorAccountName || '사용자'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Explore 페이지 메인 컴포넌트
const ExplorePage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();
  const [explorePosts, setExplorePosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Explore 게시물 로딩
  const loadExplorePosts = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Explore API 호출 시작');
      
      // 🔥 직접 /feeds/explore API 사용
      const response = await api.get('/feeds/explore?limit=50');
      
      console.log('📡 Explore API 응답:', response.data);
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || 'Explore 게시물을 불러오는데 실패했습니다.');
      }
      
      const posts = response.data.data.posts || [];
      console.log(`✅ Explore 게시물 ${posts.length}개 로드 성공`);
      
      setExplorePosts(posts);
      
    } catch (error: any) {
      console.error('❌ Explore 게시물 로딩 중 에러:', error);
      setError(error.message || 'Explore 게시물을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // 인증 상태 변경 시 Explore 게시물 로딩
  useEffect(() => {
    if (isAuthenticated && user) {
      loadExplorePosts();
    }
  }, [isAuthenticated, user, loadExplorePosts]);

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
          <p className="text-gray-500 mb-6">탐색 페이지를 보려면 로그인해 주세요.</p>
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
    <div className="min-h-screen bg-black">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">
              Explore
            </h1>
            <p className="text-gray-400 text-sm">
              새로운 사용자와 흥미로운 게시물을 발견하세요
            </p>
          </div>

          {/* Explore 게시물 컨텐츠 */}
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" text="게시물을 불러오는 중..." />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">게시물 로딩 실패</h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <button
                  onClick={loadExplorePosts}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  다시 시도
                </button>
              </div>
            ) : explorePosts.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 max-w-4xl mx-auto">
                {explorePosts.map((post) => (
                  <ExplorePostItem key={post.postId} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
                <p className="text-gray-500 mb-6">곧 새로운 게시물들이 나타날 것입니다!</p>
                <button
                  onClick={loadExplorePosts}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  새로고침
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default ExplorePage
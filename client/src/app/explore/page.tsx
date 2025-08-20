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
      <div className={`animate-spin rounded-full border-b-2 border-white ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-300">{text}</p>}
    </div>
  );
};

// Explore 게시물 아이템 컴포넌트 (인스타그램 스타일 - 2열 그리드)
const ExplorePostItem = ({ post }: { post: any }) => {
  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const router = useRouter()
  const { user } = useAuthStore()

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      if (isLiked) {
        // 좋아요 취소
        await api.delete(`/likes/posts/${post.postId}`)
        setLikeCount((prev: number) => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가
        await api.post(`/likes/posts/${post.postId}`)
        setLikeCount((prev: number) => prev + 1)
      }
      setIsLiked(!isLiked)
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
    }
  }

  const handlePostClick = () => {
    router.push(`/feeds/posts/${post.postId}`)
  }

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const accountName = post.authorAccountName;
    if (accountName) {
      router.push(`/${accountName}`)
    }
  }

  return (
    <div className="group cursor-pointer">
      {/* 이미지 */}
      <div className="relative aspect-square overflow-hidden rounded-lg mb-2">
        <img
          src={post.imgUrl}
          alt={post.caption || '게시물'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onClick={handlePostClick}
        />
        
        {/* 호버 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
        
        {/* 좋아요 버튼 (호버 시 표시) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={handleLike}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg"
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
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
            <p 
              className="text-white text-xs font-medium cursor-pointer hover:text-blue-300 transition-colors"
              onClick={handleUserClick}
            >
              @{post.authorAccountName || '사용자'}
            </p>
          </div>
        </div>

        {/* 좋아요 수 (호버 시 표시) */}
        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="flex items-center space-x-1 text-white">
              <svg className="w-3 h-3 text-red-500 fill-current" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className="text-xs font-medium">{likeCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 캡션 - 이미지 아래에 직접 표시 */}
      {post.caption && (
        <div className="px-1">
          <p className="text-sm text-gray-900 leading-relaxed line-clamp-2">
            {post.caption}
          </p>
        </div>
      )}
    </div>
  )
}

// 메인 Explore 페이지 컴포넌트
const ExplorePage = () => {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore()
  const [explorePosts, setExplorePosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Explore 게시물 로드
  const loadExplorePosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get('/feeds/explore', {
        params: { limit: 50 } // 더 많은 게시물 로드
      })
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물을 불러올 수 없습니다.')
      }
      
      setExplorePosts(response.data.data.posts || [])
    } catch (err: any) {
      console.error('Explore 게시물 로드 실패:', err)
      setError(err.response?.data?.message || err.message || '게시물을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadExplorePosts()
    }
  }, [isAuthenticated, loadExplorePosts])

  // 인증되지 않은 경우
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-300 mb-6">탐색 페이지를 보려면 로그인해 주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* MyRoomHeader로 통일 */}
      <MyRoomHeader
        user={{
          name: user?.name || '',
          email: user?.email || '',
          profileImage: user?.profileImage || ''
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
            <div className="flex justify-center mb-2">
              <img 
                src="/random.svg" 
                alt="Random" 
                className="h-4 w-auto"
              />
            </div>
            <p className="text-gray-400 text-sm">
              무작위로 흥미로운 사진들을 만나보세요
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
                <h3 className="text-lg font-medium text-white mb-2">게시물 로딩 실패</h3>
                <p className="text-gray-300 mb-6">{error}</p>
                <button
                  onClick={loadExplorePosts}
                  className="px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-lg font-medium transition-colors"
                >
                  다시 시도
                </button>
              </div>
            ) : explorePosts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
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
                <h3 className="text-lg font-medium text-white mb-2">아직 게시물이 없습니다</h3>
                <p className="text-gray-300 mb-6">곧 새로운 게시물들이 나타날 것입니다!</p>
                <button
                  onClick={loadExplorePosts}
                  className="px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-lg font-medium transition-colors"
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
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import {
  HeartIcon,
  ShareIcon,
  BookmarkIcon,
  ArrowLeftIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import {
  HeartIcon as HeartSolidIcon,
  BookmarkIcon as BookmarkSolidIcon
} from '@heroicons/react/24/solid'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface PostData {
  id: string
  src: string
  alt: string
  isLiked?: boolean
  isSaved?: boolean
  likesCount?: number
  createdAt: string
  user: {
    id: string
    name: string
    profileImage?: string
  }
  caption?: string
  hashtags?: string[]
}

const PostDetailPage: React.FC = () => {
  const router = useRouter()
  const params = useParams()
  const { user: currentUser, isAuthenticated } = useAuth()
  const [post, setPost] = useState<PostData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  const postId = params.id as string

  // Mock 데이터 생성 (실제로는 API에서 가져올 데이터)
  const generateMockPost = (id: string): PostData => {
    const seed = parseInt(id.replace('random-', '')) || 1
    const width = 400
    const height = 300 + Math.floor(Math.random() * 200)
    
    return {
      id,
      src: `/api/placeholder/${width}/${height}?seed=${seed}`,
      alt: [
        '예쁜 카페에서 찍은 사진 ☕ 오늘 하루도 행복했어요!',
        '친구들과 함께한 즐거운 하루 🌟 추억이 가득해요',
        '오늘의 코디 완성! 💫 어떤가요?',
        '맛있는 브런치 타임 🥐 주말 아침의 여유',
        '산책하면서 만난 아름다운 풍경 🌿',
        '귀여운 강아지를 만났어요 🐕 너무 사랑스러워!',
        '새로운 책과 함께하는 독서 시간 📚',
        '홈카페로 만든 달콤한 시간 ☕',
        '좋은 날씨와 함께한 하루 🌤️',
        '감성 가득한 일상의 한 순간 ✨'
      ][seed % 10],
      isLiked: Math.random() > 0.5,
      isSaved: Math.random() > 0.7,
      likesCount: Math.floor(Math.random() * 100) + 1,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      user: {
        id: `user-${seed}`,
        name: [
          '김다꾸', '이예쁜', '박귀염', '최감성', '정아름',
          '문달콤', '임포근', '송깜찍', '한귀엽', '조사랑'
        ][seed % 10],
        profileImage: seed % 3 === 0 ? `/api/placeholder/40/40?seed=${seed}` : undefined,
      },
      caption: [
        '오늘 하루도 감사한 마음으로 ✨',
        '행복한 순간들을 기록해봐요 💕',
        '일상 속 작은 기쁨들 🌸',
        '좋은 사람들과 함께하는 시간 💖',
        '평범한 일상도 특별하게 📸',
        undefined, undefined, undefined // null 대신 undefined 사용
      ][seed % 8],
      hashtags: [
        ['일상', '행복', '감성'],
        ['카페', '브런치', '여유'],
        ['친구', '추억', '소중함'],
        ['독서', '책스타그램', '힐링'],
        ['산책', '자연', '힐링타임'],
        ['홈카페', '디저트', '달콤함']
      ][seed % 6]
    }
  }

  // 포스트 데이터 로드
  useEffect(() => {
    const loadPost = async () => {
      setIsLoading(true)
      
      // Mock API 호출 시뮬레이션
      setTimeout(() => {
        const mockPost = generateMockPost(postId)
        setPost(mockPost)
        setIsLoading(false)
      }, 500)
    }

    if (postId) {
      loadPost()
    }
  }, [postId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1일 전'
    if (diffDays < 7) return `${diffDays}일 전`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}주 전`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)}개월 전`
    return `${Math.ceil(diffDays / 365)}년 전`
  }

  const handleUserClick = () => {
    if (!post) return
    
    // 현재 로그인한 사용자와 같으면 /my로, 다르면 /profile/[userId]로
    if (currentUser && post.user.id === currentUser.id.toString()) {
      router.push('/my')
    } else {
      router.push(`/profile/${post.user.id}`)
    }
  }

  const handleLike = () => {
    if (!post) return
    
    setPost(prev => prev ? {
      ...prev,
      isLiked: !prev.isLiked,
      likesCount: (prev.likesCount || 0) + (prev.isLiked ? -1 : 1)
    } : null)
    
    // TODO: 실제 API 호출
    console.log('Like toggled for post:', post.id)
  }

  const handleSave = () => {
    if (!post) return
    
    setPost(prev => prev ? {
      ...prev,
      isSaved: !prev.isSaved
    } : null)
    
    // TODO: 실제 API 호출
    console.log('Save toggled for post:', post.id)
  }

  const handleShare = () => {
    if (navigator.share && post) {
      navigator.share({
        title: post.alt || '사진',
        text: post.caption || '',
        url: window.location.href
      })
    } else {
      // 폴백: 클립보드에 복사
      navigator.clipboard.writeText(window.location.href)
      alert('링크가 클립보드에 복사되었습니다!')
    }
  }

  const handleBack = () => {
    router.back()
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // 포스트를 찾을 수 없음
  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">게시물을 찾을 수 없습니다</h2>
          <p className="text-gray-500 mb-4">삭제되었거나 존재하지 않는 게시물입니다.</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            뒤로가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">게시물</h1>
          
          <button
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <EllipsisHorizontalIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-2xl mx-auto bg-white">
        {/* 사용자 정보 헤더 */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleUserClick}
            className="flex items-center space-x-3 hover:opacity-80 w-full text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
              {post.user.profileImage ? (
                <img
                  src={post.user.profileImage}
                  alt={post.user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  {post.user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold text-sm">{post.user.name}</div>
              <div className="text-xs text-gray-500">{formatDate(post.createdAt)}</div>
            </div>
          </button>
        </div>

        {/* 사진 */}
        <div className="relative">
          <img
            src={post.src}
            alt={post.alt}
            className="w-full h-auto object-cover"
            style={{ maxHeight: '80vh' }}
          />
        </div>

        {/* 액션 버튼들 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                className="hover:opacity-70 transition-opacity"
              >
                {post.isLiked ? (
                  <HeartSolidIcon className="w-6 h-6 text-red-500" />
                ) : (
                  <HeartIcon className="w-6 h-6" />
                )}
              </button>
              
              <button
                onClick={handleShare}
                className="hover:opacity-70 transition-opacity"
              >
                <ShareIcon className="w-6 h-6" />
              </button>
            </div>
            
            <button
              onClick={handleSave}
              className="hover:opacity-70 transition-opacity"
            >
              {post.isSaved ? (
                <BookmarkSolidIcon className="w-6 h-6" />
              ) : (
                <BookmarkIcon className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* 좋아요 수 */}
          {post.likesCount !== undefined && (
            <div className="mb-2">
              <span className="font-semibold text-sm">
                좋아요 {post.likesCount}개
              </span>
            </div>
          )}

          {/* 캡션 */}
          {post.caption && (
            <div className="mb-2">
              <span className="font-semibold text-sm mr-2">{post.user.name}</span>
              <span className="text-sm">{post.caption}</span>
            </div>
          )}

          {/* 해시태그 */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {post.hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="text-blue-600 text-sm hover:underline cursor-pointer"
                >
                  #{tag}
                </span>
              )              )}
            </div>
          )}
        </div>
      </main>

      {/* 더보기 옵션 드롭다운 */}
      {showMoreOptions && (
        <div className="fixed top-16 right-4 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[150px] z-50">
          <button 
            onClick={() => {
              handleShare()
              setShowMoreOptions(false)
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
          >
            링크 복사
          </button>
          <button 
            onClick={() => setShowMoreOptions(false)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
          >
            신고하기
          </button>
          <button 
            onClick={() => setShowMoreOptions(false)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-gray-500"
          >
            취소
          </button>
        </div>
      )}
    </div>
  )
}

export default PostDetailPage
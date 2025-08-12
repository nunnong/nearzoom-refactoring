'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  PencilSquareIcon,
  HeartIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import ProfileHeader from './ProfileHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProfileEditModal from './ProfileEditModal'

// 🔥 로컬 타입 정의
interface UserProfile {
  id: number
  name: string
  email: string
  profileImage?: string
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isFollowedBy: boolean
  feed: {
    id: string
    userId: string
    name: string
    description: string
    isPublic: boolean
    backgroundColor: string
    backgroundImageUrl?: string
    totalHeight: number
    followersCount: number
    likesCount: number
    isFollowing: boolean
    isLiked: boolean
    createdAt: string
    updatedAt: string
    posts: FeedPost[] // 피드에 포함된 포스트들
  }
}

// 🔥 피드 포스트 타입 정의 (다이어리 요소들)
interface FeedPost {
  id: string
  type: 'photo' | 'text' | 'sticker' | 'drawing'
  content: string // 이미지 URL, 텍스트 내용, 스티커 정보 등
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation?: number
  zIndex?: number
  createdAt: string
  likesCount: number
  isLiked: boolean
  photoId?: number
  metadata?: {
    caption?: string
    location?: string
    tags?: string[]
  }
}

interface MyProfileProps {
  userId?: string
  initialData?: UserProfile
  onProfileUpdate?: (profile: UserProfile) => void
  className?: string
  isOwnProfile?: boolean // 🔥 본인 프로필 여부
}

const MyProfile: React.FC<MyProfileProps> = ({
  userId: propUserId,
  initialData,
  onProfileUpdate,
  className = '',
  isOwnProfile = true, // 🔥 기본값: 본인 프로필
}) => {
  const router = useRouter()
  const { user: currentUser, isAuthenticated } = useAuth()

  const userId = propUserId || (currentUser ? String(currentUser.id) : '1')

  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false) // 프로필 편집 모달

  // 🔥 로그인하지 않은 경우 처리 (본인 프로필일 때만)
  if (isOwnProfile && (!isAuthenticated || !currentUser)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-4">내 프로필을 보려면 로그인해주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  // ✅ Mock 포스트 데이터 생성
  const generateMockPosts = useCallback((): FeedPost[] => {
    const posts: FeedPost[] = []
    const postCount = Math.floor(Math.random() * 8) + 4 // 4-12개 포스트

    for (let i = 0; i < postCount; i++) {
      const postTypes: FeedPost['type'][] = ['photo', 'text', 'sticker']
      const type = postTypes[Math.floor(Math.random() * postTypes.length)]

      posts.push({
        id: `post-${userId}-${i}`, // 🔥 userId 포함
        type,
        content: type === 'photo'
          ? `/api/placeholder/300/300?seed=post${userId}${i}`
          : type === 'text'
            ? `오늘의 일기 ${i + 1} ✨`
            : '🌟', // sticker
        position: {
          x: Math.random() * 300,
          y: Math.random() * 500 + i * 100
        },
        size: type === 'photo'
          ? { width: 200, height: 200 }
          : type === 'text'
            ? { width: 150, height: 80 }
            : { width: 60, height: 60 },
        rotation: Math.random() * 20 - 10, // -10도 ~ 10도
        zIndex: i,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        likesCount: Math.floor(Math.random() * 50) + 5,
        isLiked: Math.random() > 0.5,
        photoId: type === 'photo' ? (100000 + i) : undefined,
        metadata: type === 'photo' ? {
          caption: `멋진 순간 ${i + 1}`,
          location: '서울, 대한민국',
          tags: ['일상', '기록', '추억']
        } : undefined
      })
    }

    return posts
  }, [userId])

  // ✅ Mock 사용자 프로필 로드
  const loadUserProfile = useCallback(async () => {
    if (initialData) return

    setIsLoading(true)
    setError(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 🔥 타인 프로필일 경우 Mock 데이터 다르게 생성
      const mockProfile: UserProfile = {
        id: Number(userId),
        name: isOwnProfile
          ? (currentUser?.name || '사용자')
          : `사용자${userId}`,
        email: isOwnProfile
          ? (currentUser?.email || 'user@example.com')
          : `user${userId}@example.com`,
        profileImage: isOwnProfile
          ? (currentUser?.profileImage || `/api/placeholder/120/120?seed=${userId}`)
          : `/api/placeholder/120/120?seed=user${userId}`,
        followersCount: Math.floor(Math.random() * 500) + 50,
        followingCount: Math.floor(Math.random() * 200) + 30,
        isFollowing: !isOwnProfile ? (Math.random() > 0.5) : false, // 🔥 본인이 아닐 때만 팔로우 상태
        isFollowedBy: !isOwnProfile ? (Math.random() > 0.5) : false,
        feed: {
          id: `feed-${userId}`,
          userId: userId,
          name: isOwnProfile
            ? `${currentUser?.name || '사용자'}의 다이어리 ✨`
            : `사용자${userId}의 다이어리 ✨`,
          description: '일상의 소중한 순간들을 기록하는 공간입니다.',
          isPublic: true,
          backgroundColor: '#fef7f0',
          backgroundImageUrl: Math.random() > 0.5 ? `/api/placeholder/400/600?seed=bg${userId}` : undefined,
          totalHeight: 800, // 고정 높이
          followersCount: Math.floor(Math.random() * 500) + 50,
          likesCount: Math.floor(Math.random() * 1000) + 100,
          isFollowing: false,
          isLiked: false,
          createdAt: '2024-01-15',
          updatedAt: new Date().toISOString(),
          posts: generateMockPosts()
        }
      }

      setUserProfile(mockProfile)
      onProfileUpdate?.(mockProfile)
    } catch (err) {
      console.error('Failed to load profile:', err)
      setError('프로필을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [userId, currentUser, initialData, generateMockPosts, onProfileUpdate, isOwnProfile])

  // 초기 로드
  useEffect(() => {
    if (userId) {
      loadUserProfile()
    }
  }, [userId, loadUserProfile])

  // ✅ 네비게이션 핸들러들
  const handleEditFeed = useCallback(() => {
    router.push('/my/edit')    // ✅ 요구사항 경로
  }, [router])

  const handleSettings = useCallback(() => {
    setIsProfileEditOpen(true) // 모달 열기
  }, [])

  const handleRetry = useCallback(() => {
    loadUserProfile()
  }, [loadUserProfile])

  // 🔥 포스트 클릭 핸들러 - PostDetailPage로 이동
  const handlePostClick = useCallback((post: FeedPost) => {
    if (post.type === 'photo' && post.photoId) {
      router.push(`/photo/${post.photoId}`)   // ✅ 사진 단일 페이지
    }
  }, [router])

  // ✅ 포스트 좋아요 핸들러
  const handlePostLike = useCallback((postId: string) => {
    setUserProfile(prev => {
      if (!prev) return null

      const updatedPosts = prev.feed.posts.map(post =>
        post.id === postId
          ? {
            ...post,
            isLiked: !post.isLiked,
            likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
          }
          : post
      )

      return {
        ...prev,
        feed: {
          ...prev.feed,
          posts: updatedPosts
        }
      }
    })
  }, [])

  // ✅ 프로필 편집 모달 닫기
  const closeProfileEditModal = useCallback(() => {
    setIsProfileEditOpen(false)
  }, [])

  // ✅ 프로필 정보 업데이트
  const handleProfileSave = useCallback((data: { name: string; description: string }) => {
    setUserProfile(prev => {
      if (!prev) return null

      const updatedProfile = {
        ...prev,
        name: data.name,
        feed: {
          ...prev.feed,
          name: `${data.name}의 다이어리 ✨`,
          description: data.description
        }
      }

      onProfileUpdate?.(updatedProfile)
      return updatedProfile
    })
  }, [onProfileUpdate])

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">프로필을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">오류가 발생했습니다</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">프로필을 찾을 수 없습니다</h3>
          <p className="text-gray-500 mt-2">다시 시도해주세요.</p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* 🔥 프로필 헤더 */}
      <ProfileHeader
        user={userProfile}
        isOwnProfile={isOwnProfile}
        onEditClick={handleSettings}
        currentUserId={currentUser?.id || 0}
      />

      {/* 🔥 피드 편집 버튼 - 본인 프로필일 때만 표시 */}
      {isOwnProfile && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleEditFeed}
            className="inline-flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <PencilSquareIcon className="h-5 w-5 mr-2" />
            <span>피드 편집하기</span>
          </button>
        </div>
      )}

      {/* 🔥 다이어리식 피드 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* 피드 헤더 */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{userProfile.feed.name}</h2>
          <p className="text-gray-600 text-sm">{userProfile.feed.description}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center">
              <HeartIcon className="w-4 h-4 mr-1" />
              {userProfile.feed.likesCount}
            </span>
            <span className="flex items-center">
              <EyeIcon className="w-4 h-4 mr-1" />
              {userProfile.feed.followersCount}
            </span>
          </div>
        </div>

        {/* 다이어리 캔버스 */}
        <div
          className="relative overflow-hidden"
          style={{
            backgroundColor: userProfile.feed.backgroundColor,
            backgroundImage: userProfile.feed.backgroundImageUrl ? `url(${userProfile.feed.backgroundImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '600px',
            height: `${userProfile.feed.totalHeight}px`
          }}
        >
          {/* 배경 이미지 오버레이 */}
          {userProfile.feed.backgroundImageUrl && (
            <div className="absolute inset-0 bg-white bg-opacity-30" />
          )}

          {/* 포스트들 렌더링 */}
          {userProfile.feed.posts.map((post) => (
            <div
              key={post.id}
              className="absolute cursor-pointer transition-transform hover:scale-105"
              style={{
                left: `${post.position.x}px`,
                top: `${post.position.y}px`,
                width: `${post.size.width}px`,
                height: `${post.size.height}px`,
                transform: `rotate(${post.rotation || 0}deg)`,
                zIndex: post.zIndex || 0,
              }}
              onClick={() => handlePostClick(post)}
            >
              {post.type === 'photo' && (
                <div className="relative w-full h-full group">
                  <img
                    src={post.content}
                    alt="피드 이미지"
                    className="w-full h-full object-cover rounded-lg shadow-md border-2 border-white"
                  />
                  {/* 호버 오버레이 */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium">
                      <HeartIcon className="w-5 h-5 inline mr-1" />
                      {post.likesCount}
                    </div>
                  </div>
                </div>
              )}

              {post.type === 'text' && (
                <div className="bg-white bg-opacity-90 rounded-lg p-3 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                  <p className="text-gray-800 text-sm font-medium">{post.content}</p>
                </div>
              )}

              {post.type === 'sticker' && (
                <div className="text-4xl hover:scale-110 transition-transform">
                  {post.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 🔥 프로필 편집 모달 - 본인 프로필일 때만 표시 */}
      {isOwnProfile && (
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={closeProfileEditModal}
          currentName={userProfile?.name || ''}
          currentDescription={userProfile?.feed.description || ''}
          profileImage={userProfile?.profileImage}
          onSave={handleProfileSave}
        />
      )}
    </div>
  )
}

export default MyProfile
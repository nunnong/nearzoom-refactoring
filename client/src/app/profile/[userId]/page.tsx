'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import {
  ArrowLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface UserProfileData {
  id: string
  name: string
  email?: string
  profileImage?: string
  bio?: string
  postsCount: number
  followersCount: number
  followingCount: number
  isFollowing?: boolean
}

interface PostData {
  id: string
  src: string
  alt: string
  isLiked?: boolean
  isSaved?: boolean
  likesCount?: number
  commentsCount?: number
  createdAt: string
  user: {
    id: string
    name: string
    profileImage?: string
  }
  caption?: string
  hashtags?: string[]
}

const UserProfilePage: React.FC = () => {
  const router = useRouter()
  const params = useParams()
  const { user: currentUser, isAuthenticated } = useAuth()
  
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null)
  const [userPosts, setUserPosts] = useState<PostData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  
  const userId = params.userId as string

  // Mock 사용자 데이터 생성
  const generateMockUserProfile = (id: string): UserProfileData => {
    const seed = parseInt(id.replace('user-', '')) || 1
    const names = [
      '김다꾸', '이예쁜', '박귀염', '최감성', '정아름',
      '문달콤', '임포근', '송깜찍', '한귀엽', '조사랑'
    ]
    const bios = [
      '일상의 소중한 순간들을 기록합니다 ✨',
      '카페 투어가 취미인 감성러 ☕',
      '책과 커피를 사랑하는 사람 📚',
      '여행과 사진을 좋아해요 📸',
      '맛집 탐방이 인생의 낙 🍽️',
      '반려동물과 함께하는 일상 🐕',
      '음악과 함께하는 일상 🎵',
      '운동을 사랑하는 사람 💪'
    ]
    
    return {
      id,
      name: names[seed % names.length],
      email: `${names[seed % names.length].toLowerCase()}@example.com`,
      profileImage: seed % 3 === 0 ? `/api/placeholder/120/120?seed=${seed}` : undefined,
      bio: seed % 4 === 0 ? undefined : bios[seed % bios.length],
      postsCount: Math.floor(Math.random() * 50) + 5,
      followersCount: Math.floor(Math.random() * 1000) + 10,
      followingCount: Math.floor(Math.random() * 500) + 5,
      isFollowing: Math.random() > 0.5
    }
  }

  // Mock 사용자 게시물 생성
  const generateMockUserPosts = (userId: string, count: number = 12): PostData[] => {
    const posts: PostData[] = []
    const seed = parseInt(userId.replace('user-', '')) || 1
    
    for (let i = 0; i < count; i++) {
      const postSeed = seed * 100 + i
      const width = 300 + Math.floor(Math.random() * 100)
      const height = 300 + Math.floor(Math.random() * 200)
      
      posts.push({
        id: `post-${postSeed}`,
        src: `/api/placeholder/${width}/${height}?seed=${postSeed}`,
        alt: [
          '예쁜 카페에서 찍은 사진',
          '친구들과 함께한 하루',
          '오늘의 코디',
          '맛있는 브런치',
          '산책 중 만난 풍경',
          '홈카페 시간',
          '새로운 책과 함께',
          '반려동물과의 시간',
          '감성 가득한 일상',
          '여행 중 한 컷'
        ][i % 10],
        isLiked: Math.random() > 0.5,
        isSaved: Math.random() > 0.7,
        likesCount: Math.floor(Math.random() * 100) + 1,
        commentsCount: Math.floor(Math.random() * 20),
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        user: {
          id: userId,
          name: userProfile?.name || '사용자',
          profileImage: userProfile?.profileImage
        },
        caption: i % 3 === 0 ? [
          '오늘도 행복한 하루 ✨',
          '소중한 순간들',
          '일상 속 작은 기쁨',
          '감사한 마음으로',
          '평범한 일상도 특별하게'
        ][i % 5] : undefined,
        hashtags: i % 4 === 0 ? [
          ['일상', '행복'],
          ['카페', '여유'],
          ['친구', '추억'],
          ['감성', '힐링']
        ][i % 4] : undefined
      })
    }
    
    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // 데이터 로드
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true)
      
      // Mock API 호출 시뮬레이션
      setTimeout(() => {
        const profile = generateMockUserProfile(userId)
        setUserProfile(profile)
        
        // 항상 게시물 표시 (모든 계정이 공개)
        const posts = generateMockUserPosts(userId, profile.postsCount)
        setUserPosts(posts)
        
        setIsLoading(false)
      }, 800)
    }

    if (userId) {
      loadUserData()
    }
  }, [userId])

  const handleBack = () => {
    router.back()
  }

  const handleFollow = () => {
    if (!userProfile) return
    
    setUserProfile(prev => prev ? {
      ...prev,
      isFollowing: !prev.isFollowing,
      followersCount: prev.followersCount + (prev.isFollowing ? -1 : 1)
    } : null)
    
    // TODO: 실제 API 호출
    console.log('Follow toggled for user:', userId)
  }

  const handleShare = () => {
    if (navigator.share && userProfile) {
      navigator.share({
        title: `${userProfile.name}님의 프로필`,
        text: userProfile.bio || '',
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('링크가 클립보드에 복사되었습니다!')
    }
  }

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`)
  }

  const handlePostLike = (postId: string) => {
    setUserPosts(prev => prev.map(post => 
      post.id === postId ? {
        ...post,
        isLiked: !post.isLiked,
        likesCount: (post.likesCount || 0) + (post.isLiked ? -1 : 1)
      } : post
    ))
    
    // TODO: 실제 API 호출
    console.log('Post liked:', postId)
  }

  const handleUserClick = () => {
    // 이미 해당 사용자 프로필 페이지에 있으므로 아무것도 하지 않음
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // 사용자를 찾을 수 없음
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">사용자를 찾을 수 없습니다</h2>
          <p className="text-gray-500 mb-4">존재하지 않는 사용자입니다.</p>
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
          
          <h1 className="text-lg font-semibold text-gray-900">{userProfile.name}</h1>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto">
        {/* 프로필 정보 */}
        <div className="bg-white p-6 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            {/* 프로필 이미지 */}
            <div className="w-20 h-20 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* 사용자 정보 */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{userProfile.name}</h2>
              
              {userProfile.bio && (
                <p className="text-gray-600 text-sm mb-4">{userProfile.bio}</p>
              )}

              {/* 통계 */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{userProfile.postsCount}</div>
                  <div className="text-gray-500">게시물</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{userProfile.followersCount}</div>
                  <div className="text-gray-500">팔로워</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{userProfile.followingCount}</div>
                  <div className="text-gray-500">팔로잉</div>
                </div>
              </div>
            </div>
          </div>

          {/* 액션 버튼들 */}
          {isAuthenticated && currentUser && currentUser.id.toString() !== userId && (
            <div className="mt-4 flex items-center space-x-3">
              <button
                onClick={handleFollow}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  userProfile.isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {userProfile.isFollowing ? (
                  <>
                    <UserMinusIcon className="w-4 h-4 mr-2 inline" />
                    팔로잉
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="w-4 h-4 mr-2 inline" />
                    팔로우
                  </>
                )}
              </button>
              
              <button className="py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                메시지
              </button>
            </div>
          )}
        </div>

        {/* 게시물 섹션 */}
        <div className="p-6">
          {userPosts.length > 0 ? (
            // 게시물 그리드
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handlePostClick(post.id)}
                >
                  {/* 사진 */}
                  <div className="relative">
                    <img
                      src={post.src}
                      alt={post.alt}
                      className="w-full h-48 object-cover"
                    />
                    
                    {/* 좋아요 수 오버레이 */}
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                      ❤️ {post.likesCount || 0}
                    </div>
                  </div>

                  {/* 캡션 */}
                  {post.caption && (
                    <div className="p-3">
                      <p className="text-sm text-gray-600 line-clamp-2">{post.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // 게시물 없음
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
              <p className="text-gray-500">{userProfile.name}님이 사진을 공유하면 여기에 표시됩니다.</p>
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
            프로필 공유
          </button>
          <button 
            onClick={() => setShowMoreOptions(false)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
          >
            신고하기
          </button>
          <button 
            onClick={() => setShowMoreOptions(false)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
          >
            차단하기
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

export default UserProfilePage
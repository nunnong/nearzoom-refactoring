'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProfileHeader from './ProfileHeader'
import FeedPreview from './FeedPreview'
import FollowButton from '../follow/FollowButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { UserProfile as UserProfileType } from '@/lib/types/feed'

interface UserProfileProps {
  userId: string
  currentUserId: string
  className?: string
}

const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  currentUserId,
  className = '',
}) => {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)

  // Mock 사용자 프로필 로드
  useEffect(() => {
    const loadUserProfile = async () => {
      setIsLoading(true)
      
      // Mock API 호출 시뮬레이션
      setTimeout(() => {
        const userNames = ['이예쁜', '박감성', '정아름', '최귀염', '문달콤']
        const feedNames = ['감성 가득한 일상 🌸', '소소한 행복 찾기 ✨', '오늘도 좋은 하루 💫', '예쁜 것들 모음 💖', '달콤한 순간들 🍯']
        const descriptions = [
          '매일매일 작은 행복을 찾아가며 살고 있어요',
          '일상 속 소소한 감동들을 기록하는 공간입니다',
          '좋은 사람들과 함께하는 즐거운 하루하루',
          '예쁘고 귀여운 것들로 가득한 나만의 공간',
          '달콤하고 따뜻한 순간들의 기록장'
        ]
        
        const randomIndex = parseInt(userId.slice(-1)) % userNames.length
        const mockProfile: UserProfileType = {
          id: userId,
          name: userNames[randomIndex],
          email: `${userNames[randomIndex].toLowerCase()}@example.com`,
          profileImage: Math.random() > 0.3 ? `/api/placeholder/120/120?seed=${userId}` : undefined,
          feed: {
            id: `feed-${userId}`,
            userId: userId,
            name: feedNames[randomIndex],
            description: descriptions[randomIndex],
            isPublic: Math.random() > 0.2, // 80% 공개
            backgroundColor: ['#fef7f0', '#f0f9ff', '#f7fee7', '#fdf4ff', '#fff7ed'][randomIndex],
            backgroundImageUrl: Math.random() > 0.5 ? `/api/placeholder/800/600?seed=bg${userId}` : undefined,
            totalHeight: Math.floor(Math.random() * 8000) + 2000,
            followersCount: Math.floor(Math.random() * 500) + 20,
            likesCount: Math.floor(Math.random() * 1000) + 50,
            isFollowing: Math.random() > 0.5,
            isLiked: Math.random() > 0.7,
            createdAt: '2024-01-01',
            updatedAt: '2024-08-07',
          },
          followersCount: Math.floor(Math.random() * 500) + 20,
          followingCount: Math.floor(Math.random() * 200) + 10,
          isFollowing: Math.random() > 0.5,
          isFollowedBy: Math.random() > 0.6,
        }
        
        setUserProfile(mockProfile)
        setIsFollowing(mockProfile.isFollowing)
        setIsLoading(false)
      }, 1000)
    }
    
    if (userId && userId !== currentUserId) {
      loadUserProfile()
    }
  }, [userId, currentUserId])

  const handleViewFeed = () => {
    router.push(`/feed/${userId}`)
  }

  const handleFollowChange = (following: boolean) => {
    setIsFollowing(following)
    // 팔로워 수 업데이트
    if (userProfile) {
      setUserProfile(prev => prev ? {
        ...prev,
        followersCount: following ? prev.followersCount + 1 : prev.followersCount - 1,
        isFollowing: following,
      } : null)
    }
  }

  // 본인 프로필인 경우 내 프로필 컴포넌트로 리다이렉트
  if (userId === currentUserId) {
    router.push('/profile')
    return null
  }

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

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">프로필을 찾을 수 없습니다</h3>
          <p className="text-gray-500 mt-2">존재하지 않는 사용자이거나 접근할 수 없습니다.</p>
        </div>
      </div>
    )
  }

  // 비공개 피드이고 팔로우하지 않은 경우
  const isPrivateAndNotFollowing = !userProfile.feed.isPublic && !userProfile.isFollowing

  if (isPrivateAndNotFollowing) {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        {/* 🔥 여기 수정: currentUserId 전달 */}
        <ProfileHeader
          user={userProfile}
          isOwnProfile={false}
          currentUserId={currentUserId}
        />

        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">비공개 계정</h3>
            <p className="text-gray-600 mb-6">이 사용자의 피드는 비공개로 설정되어 있습니다. 팔로우 요청을 보내보세요!</p>
            
            <FollowButton
              userId={userId}
              isFollowing={isFollowing}
              isFollowedBy={userProfile.isFollowedBy}
              onFollowChange={handleFollowChange}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* 🔥 프로필 헤더 - 여기도 수정: currentUserId 전달 */}
      <ProfileHeader
        user={userProfile}
        isOwnProfile={false}
        currentUserId={currentUserId}
      />

      {/* 액션 버튼들 */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <button
          onClick={handleViewFeed}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          피드 보기
        </button>
        
        <FollowButton
          userId={userId}
          isFollowing={isFollowing}
          isFollowedBy={userProfile.isFollowedBy}
          onFollowChange={handleFollowChange}
        />
      </div>

      {/* 피드 미리보기 */}
      <FeedPreview
        feed={userProfile.feed}
        isOwnFeed={false}
      />
    </div>
  )
}

export default UserProfile
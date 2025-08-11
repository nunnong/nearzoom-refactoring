'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { HeartIcon, UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useParams } from 'next/navigation'
import EnhancedHeader from '@/components/ui/EnhancedHeader'
import SideList from '@/components/page/myroom/SideList' // 🔥 경로 수정: my-room → myroom
import FeedViewer from '@/components/page/feed/FeedViewer'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { UserInfo } from '@/utils/auth'

// 🔥 완전한 UserInfo 타입 (provider, accessToken 추가)
const mockCurrentUser: UserInfo = {
  id: '1',
  name: '김다꾸',
  email: 'user@example.com',
  profileImage: undefined,
  provider: 'kakao', // 🔥 추가
  accessToken: 'mock_access_token' // 🔥 추가
}

interface UserFeedInfo {
  id: string
  name: string
  email: string
  profileImage?: string
  feedName: string
  feedDescription: string
  followersCount: number
  followingCount: number
  postsCount: number
  isFollowing: boolean
  isLiked: boolean
  isPublic: boolean
}

const UserFeedPage: React.FC = () => {
  const params = useParams()
  const userId = params.userId as string
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [userInfo, setUserInfo] = useState<UserFeedInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const currentUser = mockCurrentUser

  // Mock 사용자 정보 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      setIsLoading(true)
      
      // Mock API 호출 시뮬레이션
      setTimeout(() => {
        const mockUserInfo: UserFeedInfo = {
          id: userId,
          name: ['이예쁜', '박감성', '정아름', '최귀염', '문달콤'][Math.floor(Math.random() * 5)],
          email: `user${userId}@example.com`,
          profileImage: Math.random() > 0.5 ? `/api/placeholder/80/80?seed=${userId}` : undefined,
          feedName: '내 소중한 다이어리 ✨',
          feedDescription: '일상의 소중한 순간들을 기록하는 공간입니다',
          followersCount: Math.floor(Math.random() * 500) + 50,
          followingCount: Math.floor(Math.random() * 200) + 20,
          postsCount: Math.floor(Math.random() * 100) + 10,
          isFollowing: Math.random() > 0.5,
          isLiked: Math.random() > 0.7,
          isPublic: Math.random() > 0.2, // 80% 공개
        }
        
        setUserInfo(mockUserInfo)
        setIsFollowing(mockUserInfo.isFollowing)
        setIsLiked(mockUserInfo.isLiked)
        setIsLoading(false)
      }, 1000)
    }
    
    if (userId) {
      loadUserInfo()
    }
  }, [userId])

  const handleUploadSelfie = (): void => {
    const currentPath = window.location.pathname
    const returnUrl = encodeURIComponent(currentPath)
    window.location.href = `/upload-selfie?returnUrl=${returnUrl}`
  }

  const handleAccount = (): void => {
    console.log('Account settings')
  }

  const handleFollow = async () => {
    setIsFollowing(prev => !prev)
    // TODO: 실제 팔로우 API 호출
    console.log(isFollowing ? 'Unfollow' : 'Follow', userId)
  }

  const handleLike = async () => {
    setIsLiked(prev => !prev)
    // TODO: 실제 좋아요 API 호출
    console.log(isLiked ? 'Unlike' : 'Like', userId)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">피드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">피드를 찾을 수 없습니다</h2>
          <p className="text-gray-600">존재하지 않거나 비공개 피드입니다.</p>
        </div>
      </div>
    )
  }

  // 비공개 피드이고 팔로우하지 않은 경우
  if (!userInfo.isPublic && !userInfo.isFollowing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SideList
          isOpen={isSidebarOpen}
          userProfile={currentUser}
          onUploadSelfie={handleUploadSelfie}
          onAccount={handleAccount}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          <EnhancedHeader
            title={userInfo.feedName}
            userProfile={currentUser}
            onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            showNavigation={true}
          />

          <main className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-20 h-20 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
                {userInfo.profileImage ? (
                  <img src={userInfo.profileImage} alt={userInfo.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-gray-600">{userInfo.name.charAt(0)}</span>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">{userInfo.name}</h2>
              <p className="text-gray-600 mb-6">이 계정은 비공개 피드입니다.</p>
              
              <button
                onClick={handleFollow}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                팔로우 요청
              </button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SideList
        isOpen={isSidebarOpen}
        userProfile={currentUser}
        onUploadSelfie={handleUploadSelfie}
        onAccount={handleAccount}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <EnhancedHeader
          title={userInfo.feedName}
          userProfile={currentUser}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          showNavigation={true}
        >
          {/* 사용자 정보 및 액션 버튼들 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {userInfo.profileImage ? (
                  <img src={userInfo.profileImage} alt={userInfo.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-gray-600">{userInfo.name.charAt(0)}</span>
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                <p className="text-xs text-gray-500">{userInfo.followersCount} 팔로워</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* 팔로우 버튼 */}
              <button
                onClick={handleFollow}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isFollowing
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinusIcon className="h-4 w-4 mr-1" />
                    <span className="hidden sm:block">팔로잉</span>
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-4 w-4 mr-1" />
                    <span className="hidden sm:block">팔로우</span>
                  </>
                )}
              </button>

              {/* 좋아요 버튼 */}
              <button
                onClick={handleLike}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
              >
                {isLiked ? (
                  <HeartSolidIcon className="h-4 w-4 text-red-500" />
                ) : (
                  <HeartIcon className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </EnhancedHeader>

        <main className="h-[calc(100vh-120px)]">
          <FeedViewer 
            userId={userId}
            // 🔥 isEditable 속성 제거 (FeedViewer Props에 없음)
          />
        </main>
      </div>
    </div>
  )
}

export default UserFeedPage
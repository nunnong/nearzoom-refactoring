'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { HeartIcon, UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import EnhancedHeader from '@/components/ui/EnhancedHeader'
import SideList from '@/components/page/myroom/SideList'
import FeedViewer from '@/components/page/feed/FeedViewer'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// ✅ 백엔드 연동 임포트
import { 
  getUserFeeds, 
  toggleFeedLike,
  checkFollowStatus 
} from '@/lib/api/feed'
import { 
  getFollowStats,
  toggleFollow 
} from '@/lib/api/follow'

// ✅ 백엔드 연동 타입 (간소화)
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
}

const UserFeedPage: React.FC = () => {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const { user: currentUser, isAuthenticated } = useAuth()
  
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [userInfo, setUserInfo] = useState<UserFeedInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ 본인 피드 접근 시 /my로 리다이렉트
  useEffect(() => {
    if (isAuthenticated && currentUser && String(currentUser.id) === String(userId)) {
      router.push('/my')
      return
    }
  }, [isAuthenticated, currentUser, userId, router])

  // ✅ 백엔드 API로 사용자 정보 로드
  useEffect(() => {
    // 본인 피드인 경우 로딩하지 않음 (리다이렉트됨)
    if (isAuthenticated && currentUser && String(currentUser.id) === String(userId)) {
      return
    }

    const loadUserInfo = async () => {
      if (!userId) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        // 1. 팔로우 통계 조회
        const followStatsResult = await getFollowStats(userId)
        const followStats = followStatsResult.success ? followStatsResult.data : null

        // 2. 팔로우 상태 확인
        const isCurrentlyFollowing = await checkFollowStatus(Number(userId))

        // 3. 사용자 피드 정보 조회 (첫 번째 피드만 사용해서 사용자 정보 추출)
        const userFeedsResult = await getUserFeeds(Number(userId), undefined, undefined, 1)
        
        if (!userFeedsResult.success || !userFeedsResult.data?.items.length) {
          // 피드가 없는 사용자인 경우 기본 정보 생성
          const mockUserInfo: UserFeedInfo = {
            id: userId,
            name: `User ${userId}`,
            email: `user${userId}@example.com`,
            profileImage: undefined,
            feedName: '피드',
            feedDescription: '아직 게시물이 없습니다.',
            followersCount: followStats?.followersCount || 0,
            followingCount: followStats?.followingCount || 0,
            postsCount: 0,
            isFollowing: isCurrentlyFollowing,
          }
          
          setUserInfo(mockUserInfo)
          setIsFollowing(isCurrentlyFollowing)
        } else {
          // 첫 번째 피드에서 사용자 정보 추출
          const firstFeed = userFeedsResult.data.items[0]
          
          const userFeedInfo: UserFeedInfo = {
            id: userId,
            name: firstFeed.userName || firstFeed.authorName || `User ${userId}`,
            email: `${firstFeed.userName || 'user'}@example.com`, // 실제 이메일 API 필요
            profileImage: firstFeed.authorAvatar,
            feedName: `${firstFeed.userName || firstFeed.authorName}님의 피드`,
            feedDescription: firstFeed.description || '소중한 순간들을 기록하는 공간입니다.',
            followersCount: followStats?.followersCount || 0,
            followingCount: followStats?.followingCount || 0,
            postsCount: userFeedsResult.data.items.length,
            isFollowing: isCurrentlyFollowing,
          }
          
          setUserInfo(userFeedInfo)
          setIsFollowing(isCurrentlyFollowing)
        }
        
      } catch (error) {
        console.error('Failed to load user info:', error)
        setError('사용자 정보를 불러오는데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (userId && isAuthenticated && currentUser) {
      loadUserInfo()
    }
  }, [userId, isAuthenticated, currentUser])

  const handleUploadSelfie = (): void => {
    const currentPath = window.location.pathname
    const returnUrl = encodeURIComponent(currentPath)
    window.location.href = `/upload-selfie?returnUrl=${returnUrl}`
  }

  const handleAccount = (): void => {
    console.log('Account settings')
  }

  // ✅ 백엔드 API 팔로우 처리
  const handleFollow = async () => {
    if (!userId) return
    
    try {
      const result = await toggleFollow(userId) // ✅ string으로 전달
      
      if (result.success && typeof result.data === 'boolean') {
        const newFollowingStatus = result.data
        setIsFollowing(newFollowingStatus)
        
        // 팔로우 상태 변경 시 팔로워 수 업데이트
        if (userInfo) {
          setUserInfo(prev => {
            if (!prev) return null
            return {
              ...prev,
              followersCount: newFollowingStatus 
                ? prev.followersCount + 1 
                : Math.max(0, prev.followersCount - 1),
              isFollowing: newFollowingStatus
            }
          })
        }
      } else {
        console.error('Follow toggle failed:', result.error)
        // 에러 발생 시 토스트 메시지 등 표시 가능
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
      // 에러 발생 시 UI 피드백 제공
    }
  }

  // 🔥 로그인하지 않은 경우
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-4">피드를 보려면 로그인해주세요.</p>
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">피드를 찾을 수 없습니다</h2>
          <p className="text-gray-600">존재하지 않거나 접근할 수 없는 피드입니다.</p>
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
          title={`${userInfo.name}님의 피드`}
          userProfile={currentUser}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          showNavigation={true}
        >
          {/* 사용자 정보 및 액션 버튼들 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {userInfo.profileImage ? (
                  <img 
                    src={userInfo.profileImage} 
                    alt={userInfo.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-600">
                    {userInfo.name.charAt(0)}
                  </span>
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
                disabled={isLoading}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
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
            </div>
          </div>
        </EnhancedHeader>

        <main className="h-[calc(100vh-120px)]">
          <FeedViewer userId={userId} />
        </main>
      </div>
    </div>
  )
}

export default UserFeedPage
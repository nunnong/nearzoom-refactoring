'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  PencilSquareIcon, 
  CogIcon, 
  EyeIcon, 
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import ProfileHeader from './ProfileHeader'
import FeedPreview from './FeedPreview'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { UserProfile } from '@/lib/types/feed'

interface MyProfileProps {
  userId: string
  initialData?: UserProfile // ✅ 초기 데이터 지원
  onProfileUpdate?: (profile: UserProfile) => void // ✅ 프로필 업데이트 콜백
  className?: string
}

// ✅ 활동 통계 타입 정의
interface ActivityStats {
  weeklyNewFollowers: number
  weeklyLikes: number
  weeklyVisitors: number
  monthlyGrowth: number
  engagementRate: number
  peakActivityHour: number
}

// ✅ 탭 타입 정의
type TabType = 'feed' | 'stats' | 'activity'

const MyProfile: React.FC<MyProfileProps> = ({
  userId,
  initialData,
  onProfileUpdate,
  className = '',
}) => {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [activeTab, setActiveTab] = useState<TabType>('feed')
  const [error, setError] = useState<string | null>(null)
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null)

  // ✅ Mock 활동 통계 생성
  const generateActivityStats = useCallback((): ActivityStats => ({
    weeklyNewFollowers: Math.floor(Math.random() * 20) + 5,
    weeklyLikes: Math.floor(Math.random() * 50) + 10,
    weeklyVisitors: Math.floor(Math.random() * 100) + 30,
    monthlyGrowth: Math.floor(Math.random() * 30) + 5,
    engagementRate: Math.random() * 10 + 2,
    peakActivityHour: Math.floor(Math.random() * 12) + 9, // 9-21시
  }), [])

  // ✅ Mock 사용자 프로필 로드 함수 분리
  const loadUserProfile = useCallback(async () => {
    if (initialData) return

    setIsLoading(true)
    setError(null)
    
    try {
      // Mock API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockProfile: UserProfile = {
        id: userId,
        name: '김다꾸',
        email: 'user@example.com',
        profileImage: `/api/placeholder/120/120?seed=${userId}`,
        feed: {
          id: 'feed-1',
          userId: userId,
          name: '내 소중한 다이어리 ✨',
          description: '일상의 소중한 순간들을 기록하는 공간입니다. 매일매일 새로운 이야기로 가득 채워나가고 있어요!',
          isPublic: true,
          backgroundColor: '#fef7f0',
          backgroundImageUrl: Math.random() > 0.5 ? `/api/placeholder/800/600?seed=bg${userId}` : undefined,
          totalHeight: Math.floor(Math.random() * 8000) + 3000,
          followersCount: Math.floor(Math.random() * 500) + 50,
          likesCount: Math.floor(Math.random() * 1000) + 100,
          isFollowing: false,
          isLiked: false,
          createdAt: '2024-01-15',
          updatedAt: new Date().toISOString(),
        },
        followersCount: Math.floor(Math.random() * 500) + 50,
        followingCount: Math.floor(Math.random() * 200) + 30,
        isFollowing: false,
        isFollowedBy: false,
      }
      
      setUserProfile(mockProfile)
      setActivityStats(generateActivityStats())
      onProfileUpdate?.(mockProfile)
    } catch (err) {
      console.error('Failed to load profile:', err)
      setError('프로필을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [userId, initialData, generateActivityStats, onProfileUpdate])

  // 초기 로드
  useEffect(() => {
    if (userId) {
      loadUserProfile()
    }
  }, [userId, loadUserProfile])

  // ✅ 네비게이션 핸들러들
  const handleEditFeed = useCallback(() => {
    router.push('/feed/edit')
  }, [router])

  const handleViewFeed = useCallback(() => {
    router.push('/feed')
  }, [router])

  const handleSettings = useCallback(() => {
    console.log('Open profile settings')
    // TODO: 프로필 설정 모달 구현
    router.push('/settings/profile')
  }, [router])

  // 🔥 팔로워/팔로잉 핸들러 제거 - 이제 ProfileHeader에서 모달로 처리
  // const handleViewFollowers = useCallback(() => {
  //   router.push('/profile/followers')
  // }, [router])

  // const handleViewFollowing = useCallback(() => {
  //   router.push('/profile/following')
  // }, [router])

  // ✅ 프로필 업데이트 핸들러
  const handleProfileUpdate = useCallback((updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile)
    onProfileUpdate?.(updatedProfile)
  }, [onProfileUpdate])

  // ✅ 재시도 핸들러
  const handleRetry = useCallback(() => {
    loadUserProfile()
  }, [loadUserProfile])

  // ✅ 탭 정보
  const tabs = useMemo(() => [
    { key: 'feed' as const, label: '피드 미리보기', icon: EyeIcon },
    { key: 'stats' as const, label: '통계', icon: ChartBarIcon },
    { key: 'activity' as const, label: '활동', icon: ArrowTrendingUpIcon },
  ], [])

  // ✅ 수치 포맷팅
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }, [])

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

  // 프로필이 없는 경우
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
      {/* 🔥 프로필 헤더 - currentUserId 추가 */}
      <ProfileHeader
        user={userProfile}
        isOwnProfile={true}
        onEditClick={handleSettings}
        currentUserId={userId} // 🆕 추가
      />

      {/* 액션 버튼들 */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <button
          onClick={handleViewFeed}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <EyeIcon className="h-5 w-5 mr-2" />
          <span>내 피드 보기</span>
        </button>
        
        <button
          onClick={handleEditFeed}
          className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <PencilSquareIcon className="h-5 w-5 mr-2" />
          <span>피드 편집</span>
        </button>
        
        <button
          onClick={handleSettings}
          className="inline-flex items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          <CogIcon className="h-5 w-5 mr-2" />
          <span>설정</span>
        </button>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'feed' && (
        <FeedPreview
          feed={userProfile.feed}
          isOwnFeed={true}
          onLikeChange={(isLiked, likesCount) => {
            setUserProfile(prev => prev ? {
              ...prev,
              feed: { ...prev.feed, isLiked, likesCount }
            } : null)
          }}
          size="lg"
        />
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* 주요 통계 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">주요 통계</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* 🔥 팔로워 클릭 제거 - 이제 ProfileHeader에서 모달로 처리 */}
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {formatNumber(userProfile.feed.followersCount)}
                </div>
                <div className="text-sm text-gray-500 flex items-center justify-center">
                  <UsersIcon className="w-4 h-4 mr-1" />
                  팔로워
                </div>
              </div>
              
              {/* 🔥 팔로잉 클릭 제거 - 이제 ProfileHeader에서 모달로 처리 */}
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {formatNumber(userProfile.followingCount)}
                </div>
                <div className="text-sm text-gray-500">팔로잉</div>
              </div>
              
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {formatNumber(userProfile.feed.likesCount)}
                </div>
                <div className="text-sm text-gray-500 flex items-center justify-center">
                  <HeartIcon className="w-4 h-4 mr-1" />
                  받은 좋아요
                </div>
              </div>
              
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {Math.round(userProfile.feed.totalHeight / 1000)}k
                </div>
                <div className="text-sm text-gray-500">피드 높이</div>
              </div>
            </div>
          </div>

          {/* 이번 주 활동 */}
          {activityStats && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">이번 주 활동</h4>
                <CalendarIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">새로운 팔로워</span>
                  <span className="font-semibold text-green-600">+{activityStats.weeklyNewFollowers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">받은 좋아요</span>
                  <span className="font-semibold text-red-600">+{activityStats.weeklyLikes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">피드 방문자</span>
                  <span className="font-semibold text-blue-600">{activityStats.weeklyVisitors}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">참여율</span>
                  <span className="font-semibold text-purple-600">{activityStats.engagementRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && activityStats && (
        <div className="space-y-6">
          {/* 월간 성장률 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">월간 성장</h3>
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-600">+{activityStats.monthlyGrowth}%</div>
                <div className="text-sm text-gray-500">지난 달 대비 팔로워 증가</div>
              </div>
            </div>
          </div>

          {/* 활동 시간 분석 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">활동 패턴</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">최고 활동 시간</span>
                  <span className="font-semibold">{activityStats.peakActivityHour}:00</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(activityStats.peakActivityHour / 24) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">주중</div>
                  <div className="text-sm text-gray-600">주로 활동하는 시간</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">저녁</div>
                  <div className="text-sm text-gray-600">피크 시간대</div>
                </div>
              </div>
            </div>
          </div>

          {/* 피드 인사이트 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">피드 인사이트</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                <span>최근 활동이 활발해졌어요!</span>
              </div>
              <div className="flex items-center text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                <span>팔로워들의 참여도가 높아지고 있어요</span>
              </div>
              <div className="flex items-center text-purple-600">
                <div className="w-2 h-2 bg-purple-600 rounded-full mr-2"></div>
                <span>새로운 팔로워 유입이 증가했어요</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyProfile
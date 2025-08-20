'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  UserIcon, 
  ArrowLeftIcon, 
  ShareIcon
} from '@heroicons/react/24/outline'
import { 
  UserIcon as UserSolidIcon
} from '@heroicons/react/24/solid'
import { FeedLoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/stores/authStore'
import { userProfileAPI } from '@/components/page/profile/UserProfile'
import ProfileInfo from '@/components/page/profile/ProfileInfo'

interface UserProfile {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  joinedAt?: string;
  location?: string;
  website?: string;
}

interface PostResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string | null;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorAccountName: string;
}

const UserFeedTimeline: React.FC<{ accountName: string; className?: string }> = ({ 
  accountName, 
  className = '' 
}) => {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [posts, setPosts] = useState<PostResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // userProfileAPI 사용
      const userPosts = await userProfileAPI.getUserPosts(accountName, 100)
      setPosts(userPosts)
      
    } catch (err: any) {
      console.error('게시물 로드 실패:', err)
      setError(err.message || '게시물을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [accountName])

  const handlePostClick = useCallback((post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`)
  }, [router])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <FeedLoadingSpinner size="lg" text="게시물을 불러오는 중..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">게시물 로딩 실패</h3>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={loadPosts}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserIcon className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
        <p className="text-gray-500 mb-6">첫 번째 게시물을 올려보세요!</p>
        <button
          onClick={() => router.push('/upload-photo')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          게시물 작성하기
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-1 max-w-4xl mx-auto">
        {posts.map((post: PostResponse) => (
          <div 
            key={post.postId} 
            className="group relative overflow-hidden bg-black cursor-pointer"
            onClick={() => handlePostClick(post)}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={post.imgUrl}
                alt={post.caption || '게시물'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />
              
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="flex items-center space-x-2 text-white">
                    <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium">{post.likeCount}</span>
                  </div>
                </div>
              </div>

              {post.caption && (
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 max-w-32">
                    <p className="text-white text-xs leading-relaxed line-clamp-2">
                      {post.caption}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const MyPage = () => {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 프로필 데이터 로드 - userProfileAPI 사용
  const loadProfile = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. 사용자 프로필 정보 조회 (userProfileAPI 사용) - 내 프로필 조회
      const profileResponse = await userProfileAPI.getMyProfile()
      
      // 2. 팔로우 통계 조회 (userProfileAPI 사용)
      const followData = await userProfileAPI.getFollowStats(user.accountName)
      
      // 3. 게시물 수 조회 (userProfileAPI 사용) - 더 안전한 방법
      const postCount = await userProfileAPI.getPostCount(user.accountName)

      const userProfile: UserProfile = {
        ...profileResponse,
        profileImage: profileResponse.userProfileImage || undefined,
        followerCount: followData.followerCount,
        followingCount: followData.followingCount,
        postCount: postCount,
        joinedAt: new Date().toISOString() // 기본값으로 현재 시간 사용
      }

      setProfile(userProfile)

    } catch (err: any) {
      console.error('프로필 로드 실패:', err)
      setError(err.message || '프로필을 불러올 수 없습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadProfile()
    }
  }, [loadProfile, isAuthenticated, authLoading])

  const goBack = () => {
    router.push('/myroom')
  }

  const handleShare = async () => {
    if (!profile) return
    
    const url = `${window.location.origin}/my`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.userName} (@${profile.accountName})`,
          text: `${profile.userName}님의 프로필을 확인해보세요!`,
          url: url,
        });
      } catch (error) {
        console.log('공유 취소됨');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        console.log('링크가 클립보드에 복사되었습니다!');
      } catch (error) {
        console.error('클립보드 복사 실패:', error);
      }
    }
  }

  const handleEdit = () => {
    router.push('/profile')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FeedLoadingSpinner size="lg" text="인증 확인 중..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">내 프로필을 보시려면 먼저 로그인해주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FeedLoadingSpinner size="lg" text="프로필 로드 중..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">프로필 로드 실패</h2>
          <p className="text-gray-500 mb-6">{error || '프로필을 불러올 수 없습니다.'}</p>
          <button
            onClick={loadProfile}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={goBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="font-medium hidden sm:block">My Room</span>
            </button>

            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">내 프로필</h1>
              <p className="text-xs text-gray-500">{profile.postCount || 0}개 게시물</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="공유"
              >
                <ShareIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <ProfileInfo
          profile={profile}
          onFollowToggle={() => {}} // 팔로우 기능 비활성화
          onEdit={() => {}} // 편집 기능 비활성화
          isFollowLoading={false} // 로딩 상태 비활성화
          hideStats={true} // 통계 정보 숨김
          hideEdit={true} // 편집 버튼 숨김
        />
      </div>

      <main className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">게시물</h2>
          </div>
          
          <UserFeedTimeline 
            accountName={profile.accountName}
            className="py-0"
          />
        </div>
      </main>

      <div className="h-20 md:hidden"></div>
    </div>
  );
};

export default MyPage;

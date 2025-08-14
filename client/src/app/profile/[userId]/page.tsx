'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import {
  ArrowLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  UserMinusIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// ============================================================================
// 🔥 백엔드 API 연동
// ============================================================================
import api from '@/lib/axios'

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

// ============================================================================
// 🔥 백엔드 API 응답 타입 (완전 호환)
// ============================================================================

// API 응답 타입
interface ApiResponse<T> {
  error: boolean
  message: string
  data: T
}

// 백엔드 User 엔티티 기반 타입
interface UserProfileResponse {
  userId: number
  userName: string
  userEmail: string
  accountName: string
  profileImage: string
  prettyFace: string | null
}

// 백엔드 FeedDetailResponse 타입
interface FeedDetailResponse {
  feedId: number
  imgUrl: string
  caption: string
  authorId: number
  accountName: string
  profileImage: string
  createdAt: string
  liked: boolean
}

// 백엔드 FollowCountsResponse 타입
interface FollowCountsResponse {
  followerCount: number
  followingCount: number
}

// 프론트엔드에서 사용할 통합 타입
interface UserProfileData extends UserProfileResponse {
  postsCount: number
  followersCount: number
  followingCount: number
  isFollowing?: boolean
}

// ============================================================================
// 🔥 백엔드 API 함수들 - 완벽한 아키텍처 적용
// ============================================================================

// 사용자 프로필 조회 (백엔드에 해당 API가 있다고 가정)
const getUserProfile = async (userId: number): Promise<UserProfileResponse> => {
  try {
    const response = await api.get<ApiResponse<UserProfileResponse>>(`/users/${userId}`)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch user profile:', error)
    throw error
  }
}

// 팔로우 통계 조회 (백엔드 FollowController.countFollow)
const getFollowStats = async (userId: number): Promise<FollowCountsResponse> => {
  try {
    const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${userId}`)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch follow stats:', error)
    throw error
  }
}

// 팔로우 상태 확인 (백엔드 FollowController.isFollowing)
const checkFollowStatus = async (followeeId: number): Promise<boolean> => {
  try {
    const response = await api.get<ApiResponse<boolean>>(`/follows/check/${followeeId}`)
    
    if (response.data.error) {
      return false
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to check follow status:', error)
    return false
  }
}

// 사용자 피드 조회 (백엔드 FeedController.userFeeds)
const getUserFeeds = async (userId: number, size: number = 20): Promise<FeedDetailResponse[]> => {
  try {
    const response = await api.get<ApiResponse<FeedDetailResponse[]>>(`/feeds/users/${userId}?size=${size}`)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch user feeds:', error)
    throw error
  }
}

// 팔로우 (백엔드 FollowController.follow)
const followUser = async (followeeId: number): Promise<void> => {
  try {
    await api.post<ApiResponse<void>>(`/follows/${followeeId}`)
  } catch (error: any) {
    console.error('Failed to follow user:', error)
    throw error
  }
}

// 언팔로우 (백엔드 FollowController.unfollow)
const unfollowUser = async (followeeId: number): Promise<void> => {
  try {
    await api.delete<ApiResponse<void>>(`/follows/${followeeId}`)
  } catch (error: any) {
    console.error('Failed to unfollow user:', error)
    throw error
  }
}

// 좋아요 토글 (백엔드 LikesController.like/unlike)
const toggleLike = async (feedId: number, isCurrentlyLiked: boolean): Promise<void> => {
  try {
    if (isCurrentlyLiked) {
      await api.delete<ApiResponse<void>>(`/likes/${feedId}`)
    } else {
      await api.post<ApiResponse<void>>(`/likes/${feedId}`)
    }
  } catch (error: any) {
    console.error('Failed to toggle like:', error)
    throw error
  }
}

const UserProfilePage: React.FC = () => {
  const router = useRouter()
  const params = useParams()
  const { user: currentUser, isAuthenticated } = useAuth()
  
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null)
  const [userPosts, setUserPosts] = useState<FeedDetailResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [postsError, setPostsError] = useState<string | null>(null)
  
  // 🔥 URL에서 userId 추출
  const targetUserId = Number(params.userId)

  // ============================================================================
  // 🔥 본인 프로필 접근 시 /my로 리다이렉트
  // ============================================================================
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const currentUserId = (currentUser as any)?.userId || (currentUser as any)?.id
      if (currentUserId === targetUserId) {
        router.push('/my')
        return
      }
    }
  }, [isAuthenticated, currentUser, targetUserId, router])

  // ============================================================================
  // 🔥 데이터 로딩 함수들
  // ============================================================================

  // 사용자 프로필 데이터 로드
  const loadUserProfile = async () => {
    if (!targetUserId || isNaN(targetUserId)) {
      setError('잘못된 사용자 ID입니다.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. 사용자 기본 정보 조회
      const userProfileResponse = await getUserProfile(targetUserId)
      
      // 2. 팔로우 통계 조회
      const statsResult = await getFollowStats(targetUserId)
      
      // 3. 팔로우 상태 확인 (로그인한 경우만)
      let isFollowing = false
      if (isAuthenticated) {
        try {
          isFollowing = await checkFollowStatus(targetUserId)
        } catch (e) {
          console.warn('팔로우 상태 확인 실패:', e)
        }
      }

      // 4. 통합된 프로필 데이터 생성
      const profileData: UserProfileData = {
        ...userProfileResponse,
        postsCount: 0, // 게시물 로드 후 업데이트
        followersCount: statsResult.followerCount,
        followingCount: statsResult.followingCount,
        isFollowing: isFollowing
      }

      setUserProfile(profileData)

    } catch (error: any) {
      console.error('사용자 프로필 로드 실패:', error)
      
      // 백엔드 에러 메시지 처리
      let errorMessage = '사용자 프로필을 불러오는데 실패했습니다.'
      if (error?.response?.status === 404) {
        errorMessage = '존재하지 않는 사용자입니다.'
      } else if (error?.response?.status === 403) {
        errorMessage = '이 사용자의 프로필을 볼 권한이 없습니다.'
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 사용자 게시물 로드
  const loadUserPosts = async () => {
    if (!userProfile) return

    setPostsLoading(true)
    setPostsError(null)

    try {
      const feeds = await getUserFeeds(userProfile.userId, 20)
      setUserPosts(feeds)
      
      // 게시물 수 업데이트
      setUserProfile(prev => prev ? { ...prev, postsCount: feeds.length } : null)

    } catch (error: any) {
      console.error('사용자 게시물 로드 실패:', error)
      
      let errorMessage = '게시물을 불러오는데 실패했습니다.'
      if (error?.response?.status === 403) {
        errorMessage = '이 사용자의 게시물을 볼 권한이 없습니다.'
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setPostsError(errorMessage)
    } finally {
      setPostsLoading(false)
    }
  }

  // ============================================================================
  // useEffect 훅들
  // ============================================================================

  // 프로필 데이터 로드
  useEffect(() => {
    // 본인 프로필인 경우 로딩하지 않음 (리다이렉트됨)
    if (isAuthenticated && currentUser) {
      const currentUserId = (currentUser as any)?.userId || (currentUser as any)?.id
      if (currentUserId === targetUserId) {
        return
      }
    }

    loadUserProfile()
  }, [targetUserId, isAuthenticated])

  // 게시물 로드 (프로필 로드 후)
  useEffect(() => {
    if (userProfile) {
      loadUserPosts()
    }
  }, [userProfile?.userId])

  // ============================================================================
  // 🔥 이벤트 핸들러들
  // ============================================================================

  const handleBack = () => {
    router.back()
  }

  // 팔로우 토글 (백엔드 연동)
  const handleFollow = async () => {
    if (!userProfile || !isAuthenticated) return

    setFollowLoading(true)
    try {
      if (userProfile.isFollowing) {
        await unfollowUser(targetUserId)
        setUserProfile(prev => prev ? {
          ...prev,
          isFollowing: false,
          followersCount: Math.max(0, prev.followersCount - 1)
        } : null)
      } else {
        await followUser(targetUserId)
        setUserProfile(prev => prev ? {
          ...prev,
          isFollowing: true,
          followersCount: prev.followersCount + 1
        } : null)
      }
    } catch (error: any) {
      console.error('팔로우 처리 실패:', error)
      
      let errorMessage = '팔로우 처리에 실패했습니다.'
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      alert(errorMessage)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleShare = () => {
    if (navigator.share && userProfile) {
      navigator.share({
        title: `${userProfile.userName}님의 프로필`,
        text: `@${userProfile.accountName}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('링크가 클립보드에 복사되었습니다!')
    }
  }

  // 게시물 클릭 - feedId 기반으로 상세 페이지로 이동
  const handlePostClick = (post: FeedDetailResponse) => {
    router.push(`/feeds/${post.feedId}`)
  }

  // 게시물 좋아요 (백엔드 연동)
  const handlePostLike = async (post: FeedDetailResponse) => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      // 낙관적 업데이트
      setUserPosts(prev => prev.map(p => 
        p.feedId === post.feedId 
          ? { ...p, liked: !p.liked }
          : p
      ))

      await toggleLike(post.feedId, post.liked)
      
    } catch (error: any) {
      console.error('좋아요 처리 실패:', error)
      
      // 실패 시 롤백
      setUserPosts(prev => prev.map(p => 
        p.feedId === post.feedId 
          ? { ...p, liked: post.liked }
          : p
      ))
      
      const errorMessage = error?.response?.data?.message || '좋아요 처리에 실패했습니다.'
      alert(errorMessage)
    }
  }

  // 에러 재시도
  const handleRetry = () => {
    setError(null)
    loadUserProfile()
  }

  // ============================================================================
  // 🔥 렌더링
  // ============================================================================

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={handleBack}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              뒤로가기
            </button>
          </div>
        </div>
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

  // 로그인하지 않은 경우 (읽기 권한이므로 로그인 없이도 볼 수 있지만 인터랙션 제한)
  const canInteract = isAuthenticated && currentUser

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
          
          <h1 className="text-lg font-semibold text-gray-900">{userProfile.userName}</h1>
          
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
                  alt={userProfile.userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  {userProfile.userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* 사용자 정보 */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{userProfile.userName}</h2>
              <p className="text-gray-500 text-sm mb-2">@{userProfile.accountName}</p>
              <p className="text-gray-500 text-sm mb-4">{userProfile.userEmail}</p>

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

          {/* AI 보정 이미지 표시 (있는 경우) */}
          {userProfile.prettyFace && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">AI 보정 이미지</h3>
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={userProfile.prettyFace}
                  alt="AI 보정된 얼굴"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* 액션 버튼들 - 로그인한 경우만 표시 */}
          {canInteract && (
            <div className="mt-4 flex items-center space-x-3">
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  userProfile.isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {followLoading ? (
                  <LoadingSpinner size="sm" className="mx-auto" />
                ) : userProfile.isFollowing ? (
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

          {/* 로그인하지 않은 경우 안내 */}
          {!canInteract && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                팔로우하고 상호작용하려면 <button onClick={() => router.push('/login')} className="text-blue-600 hover:text-blue-700 font-medium underline">로그인</button>이 필요합니다.
              </p>
            </div>
          )}
        </div>

        {/* 게시물 섹션 */}
        <div className="p-6">
          {/* 에러 표시 */}
          {postsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{postsError}</p>
              <button
                onClick={() => loadUserPosts()}
                className="mt-2 text-red-600 hover:text-red-800 font-medium"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* 로딩 상태 */}
          {postsLoading && (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-600">게시물을 불러오는 중...</p>
            </div>
          )}

          {/* 게시물 목록 */}
          {!postsLoading && userPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPosts.map((post) => (
                <div
                  key={post.feedId}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
                  {/* 게시물 이미지 */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={post.imgUrl}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/300/300?seed=${post.feedId}`;
                      }}
                    />
                    
                    {/* 좋아요 버튼 - 로그인한 경우만 표시 */}
                    {canInteract && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePostLike(post)
                        }}
                        className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white/90 transition-colors"
                      >
                        {post.liked ? (
                          <HeartSolidIcon className="w-5 h-5 text-red-500" />
                        ) : (
                          <HeartIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    )}

                    {/* 로그인하지 않은 경우 좋아요 표시만 */}
                    {!canInteract && post.liked && (
                      <div className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full">
                        <HeartSolidIcon className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                  </div>

                  {/* 게시물 정보 */}
                  <div className="p-3">
                    {post.caption && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{post.caption}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                      {post.liked && (
                        <span className="flex items-center text-red-500">
                          <HeartSolidIcon className="h-3 w-3 mr-1" />
                          좋아요
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !postsLoading ? (
            // 게시물 없음
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
              <p className="text-gray-500">{userProfile.userName}님이 사진을 공유하면 여기에 표시됩니다.</p>
            </div>
          ) : null}
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
          {canInteract && (
            <>
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
            </>
          )}
          <button 
            onClick={() => setShowMoreOptions(false)}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-gray-500"
          >
            취소
          </button>
        </div>
      )}

      {/* 하단 고정 액션 바 (모바일) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        {canInteract ? (
          <div className="flex space-x-3">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                userProfile.isFollowing
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {followLoading ? (
                <LoadingSpinner size="sm" className="mx-auto" />
              ) : userProfile.isFollowing ? (
                '팔로잉'
              ) : (
                '팔로우'
              )}
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700">
              메시지
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium"
          >
            로그인하여 팔로우하기
          </button>
        )}
      </div>

      {/* 모바일 하단 액션 바 공간 확보 */}
      <div className="md:hidden h-20"></div>
    </div>
  )
}

export default UserProfilePage
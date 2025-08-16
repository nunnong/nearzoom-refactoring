// src/app/[accountName]/page.tsx

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  UserIcon, 
  ArrowLeftIcon, 
  CogIcon,
  ShareIcon,
  EllipsisHorizontalIcon 
} from '@heroicons/react/24/outline'
import { 
  UserIcon as UserSolidIcon,
  HeartIcon as HeartSolidIcon 
} from '@heroicons/react/24/solid'
import { FeedLoadingSpinner } from '@/components/ui/LoadingSpinner'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

// 🔥 기존 무한스크롤 훅들 활용 - 백엔드 API 맞춤
import { 
  useUserFeedInfiniteScroll,
  useInfiniteScrollTrigger 
} from '@/hooks/useInfiniteScroll'

// 🔥 기존 컴포넌트들 활용
import RandomPhotoGrid from '@/components/page/explore/RandomPhotoGrid'

// ============================================================================
// 타입 정의
// ============================================================================

interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

interface UserProfile {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
  joinedAt?: string;
  location?: string;
  website?: string;
}

// 커서 페이지네이션 파라미터 타입
interface CursorPaginationParams {
  limit?: number;
  cursor?: number | null;
}

// ============================================================================
// API 함수들
// ============================================================================

const profileAPI = {
  // 🔥 백엔드 API와 완전 일치: GET /feeds/users/account/{accountName}
  getUserProfile: async (accountName: string): Promise<UserProfile> => {
    // @ 기호 제거 (URL에서 온 경우)
    const cleanAccountName = accountName.replace(/^@/, '');
    
    try {
      console.log(`🔍 사용자 프로필 조회: ${cleanAccountName}`);
      console.log(`🔍 API 요청 URL: /feeds/users/account/${cleanAccountName}?limit=1`);
      
      // 🔥 백엔드 FeedController.getUserFeedByAccountName 사용
      const response = await api.get<ApiResponse<any>>(`/feeds/users/account/${cleanAccountName}?limit=1`);
      
      console.log(`📡 API 응답:`, response.data);
      
      if (response.data.error || !response.data.data) {
        const errorMsg = response.data.message || '사용자를 찾을 수 없습니다.';
        console.error(`❌ API 에러 응답:`, { error: response.data.error, message: errorMsg });
        throw new Error(errorMsg);
      }
      
      const feedData = response.data.data;
      console.log(`✅ 사용자 프로필 조회 성공:`, feedData);
      
      // FeedWithPostsResponse를 UserProfile로 변환
      return {
        userId: feedData.userId,
        accountName: feedData.accountName,
        userName: feedData.userName,
        userEmail: feedData.userEmail || '',
        profileImage: feedData.profileImage,
        prettyFace: feedData.prettyFace,
        bio: feedData.bio,
        followerCount: feedData.followerCount || 0,
        followingCount: feedData.followingCount || 0,
        postCount: feedData.postCount || 0,
        isFollowing: feedData.isFollowing || false,
        isOwnProfile: feedData.isOwnProfile || false,
        joinedAt: feedData.joinedAt,
        location: feedData.location,
        website: feedData.website,
      };
      
    } catch (error: any) {
      console.error(`❌ 사용자 프로필 조회 실패:`, {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // 더 구체적인 에러 메시지 제공
      if (error.response?.status === 404) {
        throw new Error(`사용자 ${cleanAccountName}을(를) 찾을 수 없습니다.`);
      } else if (error.response?.status === 401) {
        throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
      } else if (error.response?.status >= 500) {
        throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
      }
    }
  },

  // 🔥 백엔드 API와 완전 일치: POST /follows/{accountName}
  followUser: async (accountName: string): Promise<void> => {
    try {
      console.log(`🔄 팔로우 요청: @${accountName}`);
      await api.post(`/follows/${accountName}`);
      console.log(`✅ 팔로우 성공`);
    } catch (error) {
      console.error('❌ 팔로우 실패:', error);
      throw error;
    }
  },

  // 🔥 백엔드 API와 완전 일치: DELETE /follows/{accountName}
  unfollowUser: async (accountName: string): Promise<void> => {
    try {
      console.log(`🔄 언팔로우 요청: @${accountName}`);
      await api.delete(`/follows/${accountName}`);
      console.log(`✅ 언팔로우 성공`);
    } catch (error) {
      console.error('❌ 언팔로우 실패:', error);
      throw error;
    }
  },

  // 🔥 백엔드 API와 완전 일치: GET /follows/check/{accountName}
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(`/follows/check/${accountName}`);
      return response.data.data || false;
    } catch (error) {
      console.error('팔로우 상태 확인 실패:', error);
      return false;
    }
  },

  // 🔥 백엔드 API와 완전 일치: GET /follows/count/{accountName}
  getFollowCounts: async (accountName: string): Promise<{ followerCount: number; followingCount: number }> => {
    try {
      const response = await api.get<ApiResponse<any>>(`/follows/count/${accountName}`);
      return response.data.data || { followerCount: 0, followingCount: 0 };
    } catch (error) {
      console.error('팔로우 수 조회 실패:', error);
      return { followerCount: 0, followingCount: 0 };
    }
  }
};

// ============================================================================
// UserFeedTimeline 컴포넌트
// ============================================================================

interface UserFeedTimelineProps {
  accountName: string;
  className?: string;
}

const UserFeedTimeline: React.FC<UserFeedTimelineProps> = ({ 
  accountName, 
  className = '' 
}) => {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  // 🔥 기존 useUserFeedInfiniteScroll 훅 활용
  const {
    items: posts,
    loading,
    error,
    hasNext,
    isLoadingMore,
    isEmpty,
    loadInitial,
    loadMore,
    refresh,
    updateItem,
  } = useUserFeedInfiniteScroll(accountName, {
    enableDebug: process.env.NODE_ENV === 'development',
    transformData: (post: any) => ({
      ...post,
      id: post.postId.toString(),
      photoUrl: post.imgUrl,
      authorId: post.authorAccountName,
      authorName: post.authorAccountName,
      authorAvatar: post.authorProfileImage,
      likesCount: post.likeCount,
      isLiked: post.isLikedByMe,
      source: 'user' as const,
    }),
  })

  // 🔥 백엔드 API와 완전 일치: POST /likes/posts/{postId}
  const handleLikeToggle = useCallback(async (post: any) => {
    if (!isAuthenticated) return;

    try {
      // 낙관적 업데이트
      updateItem(
        (item: any) => item.postId === post.postId,
        (item: any) => ({
          ...item,
          isLiked: !item.isLiked,
          likesCount: item.isLiked ? item.likesCount - 1 : item.likesCount + 1,
        })
      );

      // 🔥 백엔드 LikesController API 사용
      if (post.isLiked) {
        // 좋아요 취소: DELETE /likes/posts/{postId}
        await api.delete(`/likes/posts/${post.postId}`);
      } else {
        // 좋아요: POST /likes/posts/{postId}
        await api.post(`/likes/posts/${post.postId}`);
      }

      console.log(`✅ 좋아요 토글 성공: ${post.isLiked ? '취소' : '추가'}`);

    } catch (error) {
      console.error('좋아요 토글 실패:', error);
      // 에러 발생 시 UI 원상복구
      updateItem(
        (item: any) => item.postId === post.postId,
        (item: any) => ({
          ...item,
          isLiked: post.isLiked,
          likesCount: post.likesCount,
        })
      );
    }
  }, [updateItem, isAuthenticated]);

  const handlePostClick = useCallback((post: any) => {
    router.push(`/post/${post.postId}`);
  }, [router]);

  // 초기 로드
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // 무한스크롤 트리거
  const triggerRef = useInfiniteScrollTrigger(loadMore, hasNext && !isLoadingMore);

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <FeedLoadingSpinner size="lg" text="게시물을 불러오는 중..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없어요</h3>
          <p className="text-gray-500">이 사용자가 게시물을 올리면 여기에 표시됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 🔥 기존 RandomPhotoGrid 컴포넌트 재사용 */}
      <RandomPhotoGrid
        photos={posts}
        onPhotoClick={handlePostClick}
        onAuthorClick={() => {}} // 이미 프로필 페이지이므로 비활성화
        onLikeToggle={handleLikeToggle}
      />

      {/* 무한스크롤 트리거 */}
      {hasNext && (
        <div ref={triggerRef as React.RefObject<HTMLDivElement>} className="flex items-center justify-center py-8">
          {isLoadingMore ? (
            <div className="flex flex-col items-center">
              <FeedLoadingSpinner size="md" />
              <p className="mt-2 text-gray-600 text-sm">더 많은 게시물을 불러오는 중...</p>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">
              스크롤하여 더 많은 게시물 보기
            </div>
          )}
        </div>
      )}

      {/* 더 이상 로드할 게시물이 없을 때 */}
      {!hasNext && posts.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-gray-500 text-sm">모든 게시물을 확인했습니다!</p>
            <button
              onClick={refresh}
              className="mt-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// UserProfilePage 컴포넌트
// ============================================================================

const UserProfilePage: React.FC = () => {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  // URL 파라미터에서 accountName 추출
  const accountName = typeof params.accountName === 'string' 
    ? params.accountName 
    : '';

  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  // ============================================================================
  // 프로필 데이터 로드
  // ============================================================================

  useEffect(() => {
    const loadProfile = async () => {
      if (!accountName) {
        setError('유효하지 않은 사용자명입니다.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const profileData = await profileAPI.getUserProfile(accountName);
        setProfile(profileData);
        
      } catch (error: any) {
        console.error('프로필 로드 실패:', error);
        setError(error.message || '사용자를 찾을 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [accountName]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleFollowToggle = useCallback(async () => {
    if (!profile || !isAuthenticated || isFollowLoading) return;

    try {
      setIsFollowLoading(true);
      
      if (profile.isFollowing) {
        await profileAPI.unfollowUser(profile.accountName);
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: false,
          followerCount: Math.max((prev.followerCount || 0) - 1, 0)
        } : null);
      } else {
        await profileAPI.followUser(profile.accountName);
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: true,
          followerCount: (prev.followerCount || 0) + 1
        } : null);
      }
      
    } catch (error) {
      console.error('팔로우 토글 실패:', error);
      // TODO: 사용자에게 에러 메시지 표시
    } finally {
      setIsFollowLoading(false);
    }
  }, [profile, isAuthenticated, isFollowLoading]);

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/explore');
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${profile?.accountName}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.userName} (@${profile?.accountName})`,
          text: `${profile?.userName}님의 프로필을 확인해보세요!`,
          url: url,
        });
      } catch (error) {
        console.log('공유 취소됨');
      }
    } else {
      // Fallback: 클립보드에 복사
      try {
        await navigator.clipboard.writeText(url);
        // TODO: 토스트 메시지 표시
        console.log('링크가 클립보드에 복사되었습니다!');
      } catch (error) {
        console.error('클립보드 복사 실패:', error);
      }
    }
  };

  // ============================================================================
  // 렌더링 조건부 처리
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FeedLoadingSpinner 
          size="lg" 
          text="프로필 로드 중..."
        />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">사용자를 찾을 수 없습니다</h2>
          <p className="text-gray-500 mb-6">{error || '존재하지 않는 사용자입니다.'}</p>
          <div className="space-y-3">
            <button
              onClick={goBack}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              돌아가기
            </button>
            <button
              onClick={() => router.push('/explore')}
              className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              탐색으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 뒤로가기 */}
            <button
              onClick={goBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="font-medium hidden sm:block">뒤로</span>
            </button>

            {/* 프로필 제목 */}
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">@{profile.accountName}</h1>
              <p className="text-xs text-gray-500">{profile.postCount || 0}개 게시물</p>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="공유"
              >
                <ShareIcon className="h-5 w-5" />
              </button>
              
              {profile.isOwnProfile && (
                <button
                  onClick={() => router.push('/profile')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  title="프로필 편집"
                >
                  <CogIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 프로필 정보 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6">
            {/* 프로필 이미지 */}
            <div className="flex justify-center sm:justify-start mb-4 sm:mb-0">
              <div className="relative">
                <img
                  src={profile.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.userName)}&size=120&background=random`}
                  alt={profile.userName}
                  className="h-24 w-24 sm:h-32 sm:w-32 rounded-full ring-4 ring-white shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.userName)}&size=120&background=random`;
                  }}
                />
                {profile.isOwnProfile && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-1">
                    <UserSolidIcon className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* 프로필 정보 */}
            <div className="flex-1 text-center sm:text-left">
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile.userName}</h1>
                <p className="text-gray-600 mb-2">@{profile.accountName}</p>
                
                {profile.bio && (
                  <p className="text-gray-700 mb-3 leading-relaxed">{profile.bio}</p>
                )}

                {/* 추가 정보 */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-gray-500">
                  {profile.location && (
                    <span className="flex items-center">
                      📍 {profile.location}
                    </span>
                  )}
                  {profile.website && (
                    <a 
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      🔗 {profile.website}
                    </a>
                  )}
                  {profile.joinedAt && (
                    <span>
                      📅 {new Date(profile.joinedAt).getFullYear()}년 가입
                    </span>
                  )}
                </div>
              </div>

              {/* 통계 */}
              <div className="flex justify-center sm:justify-start space-x-6 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{profile.postCount || 0}</div>
                  <div className="text-sm text-gray-600">게시물</div>
                </div>
                <button className="text-center hover:bg-gray-50 px-2 py-1 rounded transition-colors">
                  <div className="text-xl font-bold text-gray-900">{profile.followerCount || 0}</div>
                  <div className="text-sm text-gray-600">팔로워</div>
                </button>
                <button className="text-center hover:bg-gray-50 px-2 py-1 rounded transition-colors">
                  <div className="text-xl font-bold text-gray-900">{profile.followingCount || 0}</div>
                  <div className="text-sm text-gray-600">팔로잉</div>
                </button>
              </div>

              {/* 팔로우 버튼 */}
              {isAuthenticated && !profile.isOwnProfile && (
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    profile.isFollowing
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isFollowLoading 
                    ? '처리중...' 
                    : profile.isFollowing 
                      ? '팔로잉' 
                      : '팔로우'
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 사용자의 게시물 타임라인 */}
      <main className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">게시물</h2>
          </div>
          
          {/* 🔥 사용자 피드 타임라인 컴포넌트 */}
          <UserFeedTimeline 
            accountName={profile.accountName}
            className="py-0"
          />
        </div>
      </main>

      {/* 모바일 하단 공간 */}
      <div className="h-20 md:hidden"></div>
    </div>
  );
};

export default UserProfilePage;
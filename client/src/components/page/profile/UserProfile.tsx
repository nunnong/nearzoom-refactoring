'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProfileHeader from './ProfileHeader'
import FeedPreview from './FeedPreview'
import FollowButton from '../follow/FollowButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 🔥 백엔드 연동 - axios 인스턴스 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의 (실제 백엔드 구조와 완벽 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// FeedWithPostsResponse.java 기반
interface FeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  isFollowing: boolean;
}

// PostResponse.java 기반
interface PostResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string | null;
  displayOrder: number | null;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
}

// FollowCountsResponse.java 기반
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// UserProfileResponse.java 기반 (User 도메인)
interface UserProfileResponse {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage: string | null;
  prettyFace: string | null;
}

// 프론트엔드 통합 UserProfile 타입
interface UserProfile {
  id: number;              // 백엔드 userId (Long)
  accountName: string;     
  name: string;            // userName
  email: string;           // userEmail
  profileImage?: string;   // profileImage
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;   // 향후 구현
  feedsCount: number;      // posts 개수
  posts: PostResponse[];   // 실제 게시물들
  feed: {                  // ProfileHeader 호환을 위한 feed 객체
    id: string;
    name: string;
    description: string;
    isPublic: boolean;
    backgroundColor: string;
    backgroundImageUrl?: string;
    likesCount: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface UserProfileProps {
  userId?: string | number;  // string 또는 number 허용
  accountName?: string;      // accountName으로도 조회 가능
  currentUserId?: string | number;
  className?: string;
}

// ============================================================================
// 백엔드 API 엔드포인트 상수
// ============================================================================

const USER_PROFILE_ENDPOINTS = {
  // FeedController 엔드포인트들
  GET_USER_FEED_BY_ID: (userId: number) => `/feeds/users/${userId}`,
  GET_USER_FEED_BY_ACCOUNT: (accountName: string) => `/feeds/users/account/${accountName}`,
  SEARCH_FEEDS: '/feeds/search',
  
  // FollowController 엔드포인트들
  FOLLOW_BY_ACCOUNT: (accountName: string) => `/follows/${accountName}`,
  UNFOLLOW_BY_ACCOUNT: (accountName: string) => `/follows/${accountName}`,
  CHECK_FOLLOW_BY_ACCOUNT: (accountName: string) => `/follows/check/${accountName}`,
  FOLLOW_COUNTS_BY_ACCOUNT: (accountName: string) => `/follows/count/${accountName}`,
  MUTUAL_FOLLOWS_BY_ACCOUNT: (accountName: string) => `/follows/mutual/${accountName}`,
};

// ============================================================================
// 백엔드 API 함수들 (실제 구현된 API만 사용)
// ============================================================================

const userProfileAPI = {
  // 🔥 GET /feeds/users/{userId} - 특정 사용자의 피드 조회 (게시물 포함)
  getUserFeedById: async (userId: number): Promise<FeedWithPostsResponse> => {
    try {
      const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
        USER_PROFILE_ENDPOINTS.GET_USER_FEED_BY_ID(userId)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '사용자 피드를 가져올 수 없습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to get user feed by ID:', error);
      throw error;
    }
  },

  // 🔥 GET /feeds/users/account/{accountName} - 계정명으로 사용자 피드 조회
  getUserFeedByAccountName: async (accountName: string): Promise<FeedWithPostsResponse> => {
    try {
      const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
        USER_PROFILE_ENDPOINTS.GET_USER_FEED_BY_ACCOUNT(accountName)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '사용자를 찾을 수 없습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to get user feed by account name:', error);
      throw error;
    }
  },

  // 🔥 GET /follows/count/{accountName} - 계정명으로 팔로우 수 조회
  getFollowCountsByAccountName: async (accountName: string): Promise<FollowCountsResponse> => {
    try {
      const response = await api.get<ApiResponse<FollowCountsResponse>>(
        USER_PROFILE_ENDPOINTS.FOLLOW_COUNTS_BY_ACCOUNT(accountName)
      );
      
      if (response.data.error) {
        console.warn('Failed to get follow counts:', response.data.message);
        return { followerCount: 0, followingCount: 0 };
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to get follow counts:', error);
      return { followerCount: 0, followingCount: 0 };
    }
  },

  // 🔥 GET /follows/check/{accountName} - 계정명으로 팔로우 상태 확인
  checkFollowStatusByAccountName: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(
        USER_PROFILE_ENDPOINTS.CHECK_FOLLOW_BY_ACCOUNT(accountName)
      );
      
      if (response.data.error) {
        console.warn('Failed to check follow status:', response.data.message);
        return false;
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to check follow status:', error);
      return false;
    }
  },

  // 🔥 POST/DELETE /follows/{accountName} - 팔로우/언팔로우 (계정명 기반)
  toggleFollowByAccountName: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    try {
      console.log('=== 팔로우 토글 시작 ===', { accountName, isCurrentlyFollowing });
      
      if (isCurrentlyFollowing) {
        // DELETE /follows/{accountName}
        const response = await api.delete<ApiResponse<void>>(
          USER_PROFILE_ENDPOINTS.UNFOLLOW_BY_ACCOUNT(accountName)
        );
        
        if (response.data.error) {
          throw new Error(response.data.message || '언팔로우에 실패했습니다.');
        }
      } else {
        // POST /follows/{accountName}
        const response = await api.post<ApiResponse<void>>(
          USER_PROFILE_ENDPOINTS.FOLLOW_BY_ACCOUNT(accountName)
        );
        
        if (response.data.error) {
          throw new Error(response.data.message || '팔로우에 실패했습니다.');
        }
      }
      
      console.log('=== 팔로우 토글 성공 ===', { accountName, newFollowing: !isCurrentlyFollowing });
      
    } catch (error) {
      console.error('🔥 Failed to toggle follow:', error);
      throw error;
    }
  },

  // 🔥 GET /feeds/search - 검색으로 사용자 찾기 (accountName → userId 변환용)
  searchUserByAccountName: async (accountName: string): Promise<{ userId: number; accountName: string } | null> => {
    try {
      const response = await api.get<ApiResponse<FeedWithPostsResponse[]>>(
        `${USER_PROFILE_ENDPOINTS.SEARCH_FEEDS}?query=${encodeURIComponent(accountName)}&size=1`
      );
      
      if (response.data.error || response.data.data.length === 0) {
        return null;
      }
      
      const firstFeed = response.data.data[0];
      return {
        userId: firstFeed.userId,
        accountName: firstFeed.accountName
      };
    } catch (error) {
      console.error('Failed to search user by accountName:', error);
      return null;
    }
  },

  // 🔥 상호 팔로우 목록 조회 (새로 추가된 API)
  getMutualFollowsByAccountName: async (accountName: string): Promise<UserProfileResponse[]> => {
    try {
      const response = await api.get<ApiResponse<UserProfileResponse[]>>(
        USER_PROFILE_ENDPOINTS.MUTUAL_FOLLOWS_BY_ACCOUNT(accountName)
      );
      
      if (response.data.error) {
        console.warn('Failed to get mutual follows:', response.data.message);
        return [];
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to get mutual follows:', error);
      return [];
    }
  }
};

// ============================================================================
// UserProfile 컴포넌트
// ============================================================================

const UserProfile: React.FC<UserProfileProps> = ({
  userId: propUserId,
  accountName: propAccountName,
  currentUserId,
  className = '',
}) => {
  const router = useRouter()
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  // ============================================================================
  // 백엔드 연동 - 사용자 프로필 로드
  // ============================================================================

  const loadUserProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let targetAccountName: string | null = null;
      let targetUserId: number | null = null;

      // 1. accountName 및 userId 결정
      if (propAccountName) {
        targetAccountName = propAccountName;
      } else if (propUserId) {
        // userId로 accountName 찾기 (검색 API 활용)
        const userIdNum = typeof propUserId === 'string' ? parseInt(propUserId) : propUserId;
        if (isNaN(userIdNum)) {
          throw new Error('올바르지 않은 사용자 ID입니다.');
        }
        targetUserId = userIdNum;
        
        // userId로 직접 피드 조회 시도
        const feedData = await userProfileAPI.getUserFeedById(userIdNum);
        targetAccountName = feedData.accountName;
      } else {
        throw new Error('사용자 정보가 필요합니다.');
      }

      if (!targetAccountName) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      console.log('=== UserProfile 로드 시작 ===', { 
        targetAccountName, 
        targetUserId: targetUserId || 'from accountName' 
      });

      // 2. 병렬로 데이터 로드 (accountName 기반)
      const [feedData, followCounts, followStatus] = await Promise.allSettled([
        userProfileAPI.getUserFeedByAccountName(targetAccountName),
        userProfileAPI.getFollowCountsByAccountName(targetAccountName),
        userProfileAPI.checkFollowStatusByAccountName(targetAccountName)
      ]);

      // 3. 피드 데이터 확인
      if (feedData.status === 'rejected') {
        throw new Error('사용자 피드를 불러올 수 없습니다.');
      }

      const userFeedData = feedData.value;
      
      // 4. 팔로우 정보 추출
      const followCountsData = followCounts.status === 'fulfilled' 
        ? followCounts.value 
        : { followerCount: 0, followingCount: 0 };
      
      const isFollowing = followStatus.status === 'fulfilled' ? followStatus.value : false;

      // 5. UserProfile 객체 생성
      const profileData: UserProfile = {
        id: userFeedData.userId,
        accountName: userFeedData.accountName,
        name: userFeedData.accountName, // TODO: 실제 userName 필드 추가 필요
        email: `${userFeedData.accountName}@example.com`, // TODO: 실제 이메일 API 필요
        profileImage: userFeedData.profileImage || undefined,
        followersCount: followCountsData.followerCount,
        followingCount: followCountsData.followingCount,
        isFollowing: isFollowing,
        isFollowedBy: false, // TODO: 역팔로우 상태 API 필요
        feedsCount: userFeedData.posts.length,
        posts: userFeedData.posts,
        feed: {
          id: `feed-${userFeedData.feedId}`,
          name: `${userFeedData.accountName}의 피드`,
          description: userFeedData.posts[0]?.caption || '피드 설명이 없습니다.',
          isPublic: true, // 🔥 모든 계정이 공개계정으로 설정
          backgroundColor: '#ffffff',
          backgroundImageUrl: userFeedData.posts[0]?.imgUrl,
          likesCount: userFeedData.posts.reduce((sum, post) => sum + post.likeCount, 0), // 모든 게시물의 좋아요 합계
          createdAt: userFeedData.createdAt,
          updatedAt: userFeedData.createdAt, // TODO: 업데이트 시간 API 필요
        }
      };

      console.log('✅ UserProfile 로드 완료:', {
        userId: profileData.id,
        accountName: profileData.accountName,
        postsCount: profileData.posts.length,
        followersCount: profileData.followersCount,
        isFollowing: profileData.isFollowing
      });
      
      setUserProfile(profileData);

    } catch (err) {
      console.error('❌ Failed to load user profile:', err);
      const errorMessage = err instanceof Error ? err.message : '프로필을 불러오는데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [propUserId, propAccountName]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    // 본인 프로필인 경우 체크
    const isOwnProfile = (
      (propUserId && currentUserId && propUserId.toString() === currentUserId.toString()) ||
      false
    );

    if (isOwnProfile) {
      router.push('/profile');
      return;
    }

    loadUserProfile();
  }, [propUserId, propAccountName, currentUserId, router, loadUserProfile]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleViewFeed = useCallback(() => {
    if (userProfile) {
      router.push(`/feed/${userProfile.accountName}`); // accountName 기반으로 라우팅
    }
  }, [router, userProfile]);

  // 🔥 백엔드 연동 팔로우 토글 핸들러 (accountName 기반)
  const handleFollowChange = useCallback(async (newFollowing: boolean) => {
    if (!userProfile || isFollowLoading) return;

    const originalFollowing = userProfile.isFollowing;
    const originalCount = userProfile.followersCount;
    
    setIsFollowLoading(true);

    try {
      console.log('=== 팔로우 변경 시작 ===', { 
        accountName: userProfile.accountName, 
        originalFollowing,
        newFollowing 
      });

      // 낙관적 업데이트 - UI 즉시 반영
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: newFollowing,
        followersCount: newFollowing 
          ? prev.followersCount + 1 
          : Math.max(0, prev.followersCount - 1)
      } : null);

      // 🔥 실제 백엔드 API 호출 (accountName 기반)
      await userProfileAPI.toggleFollowByAccountName(userProfile.accountName, originalFollowing);

      console.log('✅ 팔로우 변경 성공:', {
        accountName: userProfile.accountName,
        newFollowing
      });

    } catch (error) {
      console.error('❌ Failed to toggle follow:', error);
      
      // 에러 발생시 롤백
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      } : null);
      
      // 사용자에게 에러 알림 (선택적)
      alert(error instanceof Error ? error.message : '팔로우 처리에 실패했습니다.');
    } finally {
      setIsFollowLoading(false);
    }
  }, [userProfile, isFollowLoading]);

  // 게시물 클릭 핸들러
  const handlePostClick = useCallback((postId: number) => {
    router.push(`/feeds/posts/${postId}`);
  }, [router]);

  const handleRetry = useCallback(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // ============================================================================
  // 렌더링 - 로딩 상태
  // ============================================================================

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

  // ============================================================================
  // 렌더링 - 에러 상태
  // ============================================================================

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
          <p className="text-gray-500 mt-2">존재하지 않는 사용자이거나 접근할 수 없습니다.</p>
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

  // ============================================================================
  // 렌더링 - 비공개 피드 처리 (현재는 모든 피드가 공개)
  // ============================================================================

  const isPrivateAndNotFollowing = !userProfile.feed.isPublic && !userProfile.isFollowing

  if (isPrivateAndNotFollowing) {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        <ProfileHeader
          user={userProfile}
          isOwnProfile={false}
          currentUserId={currentUserId}
          onFollowClick={() => handleFollowChange(!userProfile.isFollowing)}
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
              userId={userProfile.id}
              accountName={userProfile.accountName}
              initialIsFollowing={userProfile.isFollowing}
              isFollowedBy={userProfile.isFollowedBy}
              onFollowChange={handleFollowChange}
              disabled={isFollowLoading}
            />
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* 🔥 프로필 헤더 - 백엔드 연동 완료 */}
      <ProfileHeader
        user={userProfile}
        isOwnProfile={false}
        currentUserId={currentUserId}
        onFollowClick={() => handleFollowChange(!userProfile.isFollowing)}
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
          userId={userProfile.id}
          accountName={userProfile.accountName}
          initialIsFollowing={userProfile.isFollowing}
          isFollowedBy={userProfile.isFollowedBy}
          onFollowChange={handleFollowChange}
          disabled={isFollowLoading}
        />
      </div>

      {/* 🔥 게시물 미리보기 - 백엔드 실제 데이터 사용 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {userProfile.name}의 게시물
          </h2>
          <p className="text-gray-600 text-sm">총 {userProfile.feedsCount}개의 게시물</p>
        </div>

        <div className="p-6">
          {userProfile.posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProfile.posts.slice(0, 6).map((post) => ( // 최대 6개만 미리보기
                <div
                  key={post.postId}
                  className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => handlePostClick(post.postId)}
                >
                  {/* 게시물 이미지 */}
                  <div className="relative w-full h-48 bg-gray-200">
                    <img
                      src={post.imgUrl}
                      alt={post.caption || '게시물 이미지'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/placeholder.png'; // 기본 이미지로 대체
                      }}
                    />
                    
                    {/* 호버 오버레이 */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center">
                        <div className="flex items-center justify-center space-x-4">
                          <span className="flex items-center">
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            {post.likeCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 게시물 정보 */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                      {post.caption || '제목 없음'}
                    </h3>
                    
                    {/* 게시물 통계 */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center">
                        <svg className={`w-4 h-4 mr-1 ${post.isLikedByMe ? 'text-red-500 fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {post.likeCount}
                      </span>
                      <span>
                        {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-500">게시물이 없습니다.</p>
            </div>
          )}

          {/* 더 보기 버튼 */}
          {userProfile.posts.length > 6 && (
            <div className="text-center mt-6">
              <button
                onClick={handleViewFeed}
                className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                모든 게시물 보기 ({userProfile.feedsCount}개)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔥 UserProfile 개발 정보</div>
          <div>사용자 ID: {userProfile.id}</div>
          <div>계정명: {userProfile.accountName}</div>
          <div>게시물 수: {userProfile.posts.length}</div>
          <div>팔로워: {userProfile.followersCount}</div>
          <div>팔로잉: {userProfile.followingCount}</div>
          <div>팔로우 상태: {userProfile.isFollowing ? 'Yes' : 'No'}</div>
          <div>로딩 중: {isFollowLoading ? 'Yes' : 'No'}</div>
          <div>Props ID: {propUserId || 'None'}</div>
          <div>Props Account: {propAccountName || 'None'}</div>
        </div>
      )}
    </div>
  )
}

export default UserProfile


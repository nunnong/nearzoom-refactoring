'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProfileHeader from './ProfileHeader'
import FeedPreview from './FeedPreview'
import FollowButton from '../follow/FollowButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의 (MyProfile과 동일)
// ============================================================================

// FeedDetailResponse.java 기반
interface FeedDetailResponse {
  feedId: number;
  imgUrl: string;
  caption: string;
  authorId: number;
  accountName: string;
  profileImage: string;
  createdAt: string;
  liked: boolean;
}

// FollowCountsResponse.java 기반
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// UserProfile 타입 (ProfileHeader와 동일)
interface UserProfile {
  id: number;              // 백엔드 userId (Long)
  accountName: string;     
  name: string;
  email: string;
  profileImage?: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
  feedsCount: number;
  feeds: FeedDetailResponse[];
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
// 백엔드 API 함수들 (MyProfile과 동일한 구조)
// ============================================================================

const userProfileAPI = {
  // GET /feeds/users/{userId} - 특정 사용자의 피드 목록
  getUserFeeds: async (userId: number, size: number = 20): Promise<FeedDetailResponse[]> => {
    const response = await api.get<ApiResponse<FeedDetailResponse[]>>(
      `/feeds/users/${userId}?size=${size}`
    );
    return response.data.data;
  },

  // GET /follows/count/{userId} - 팔로우 수 조회  
  getFollowCounts: async (userId: number): Promise<FollowCountsResponse> => {
    const response = await api.get<ApiResponse<FollowCountsResponse>>(
      `/follows/count/${userId}`
    );
    return response.data.data;
  },

  // GET /follows/check/{followeeId} - 팔로우 상태 확인
  checkFollowStatus: async (followeeId: number): Promise<boolean> => {
    const response = await api.get<ApiResponse<boolean>>(
      `/follows/check/${followeeId}`
    );
    return response.data.data;
  },

  // GET /feeds/search - 검색으로 accountName → userId 찾기
  searchUserByAccountName: async (accountName: string): Promise<number | null> => {
    try {
      const response = await api.get<ApiResponse<FeedDetailResponse[]>>(
        `/feeds/search?query=${encodeURIComponent(accountName)}&size=1`
      );
      const feeds = response.data.data;
      return feeds.length > 0 ? feeds[0].authorId : null;
    } catch (error) {
      console.error('Failed to find user by accountName:', error);
      return null;
    }
  },

  // POST/DELETE /follows/{followeeId} - 팔로우/언팔로우
  toggleFollow: async (userId: number, isCurrentlyFollowing: boolean): Promise<void> => {
    if (isCurrentlyFollowing) {
      await api.delete(`/follows/${userId}`);
    } else {
      await api.post(`/follows/${userId}`);
    }
  },
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

  // ============================================================================
  // 백엔드 연동 - 사용자 프로필 로드
  // ============================================================================

  const loadUserProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let targetUserId: number | null = null;

      // 1. userId 결정 (string → number 변환 포함)
      if (propUserId) {
        if (typeof propUserId === 'string') {
          targetUserId = parseInt(propUserId);
          if (isNaN(targetUserId)) {
            throw new Error('올바르지 않은 사용자 ID입니다.');
          }
        } else {
          targetUserId = propUserId;
        }
      } else if (propAccountName) {
        // accountName으로 userId 찾기
        targetUserId = await userProfileAPI.searchUserByAccountName(propAccountName);
        if (!targetUserId) {
          throw new Error(`사용자 '${propAccountName}'을 찾을 수 없습니다.`);
        }
      } else {
        throw new Error('사용자 정보가 필요합니다.');
      }

      console.log('=== UserProfile 로드 시작 ===', { targetUserId, propAccountName });

      // 2. 병렬로 데이터 로드
      const [userFeeds, followCounts, followStatus] = await Promise.all([
        userProfileAPI.getUserFeeds(targetUserId).catch(() => []), // 피드 없으면 빈 배열
        userProfileAPI.getFollowCounts(targetUserId).catch(() => ({ followerCount: 0, followingCount: 0 })),
        userProfileAPI.checkFollowStatus(targetUserId).catch(() => false)
      ]);

      // 3. 사용자 정보 구성 (첫 번째 피드에서 추출)
      const firstFeed = userFeeds[0];
      if (!firstFeed) {
        throw new Error('사용자 정보를 찾을 수 없습니다. (피드가 없음)');
      }

      // 4. UserProfile 객체 생성
      const profileData: UserProfile = {
        id: targetUserId,
        accountName: firstFeed.accountName,
        name: firstFeed.accountName, // TODO: 실제 userName 필드 필요
        email: `${firstFeed.accountName}@example.com`, // TODO: 실제 이메일 API 필요
        profileImage: firstFeed.profileImage || undefined,
        followersCount: followCounts.followerCount,
        followingCount: followCounts.followingCount,
        isFollowing: followStatus,
        isFollowedBy: false, // TODO: 역팔로우 상태 API 필요
        feedsCount: userFeeds.length,
        feeds: userFeeds,
        feed: {
          id: `feed-${targetUserId}`,
          name: `${firstFeed.accountName}의 피드`,
          description: firstFeed.caption || '피드 설명이 없습니다.',
          isPublic: true, // 🔥 모든 계정이 공개계정
          backgroundColor: '#ffffff',
          backgroundImageUrl: firstFeed.imgUrl,
          likesCount: userFeeds.filter(f => f.liked).length, // 좋아요한 피드 수로 계산
          createdAt: firstFeed.createdAt,
          updatedAt: firstFeed.createdAt, // TODO: 업데이트 시간 API 필요
        }
      };

      console.log('UserProfile 로드 완료:', profileData);
      setUserProfile(profileData);

    } catch (err) {
      console.error('Failed to load user profile:', err);
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
      router.push(`/feed/${userProfile.id}`);
    }
  }, [router, userProfile]);

  // 🔥 백엔드 연동 팔로우 토글 핸들러
  const handleFollowChange = useCallback(async (following: boolean) => {
    if (!userProfile) return;

    try {
      await userProfileAPI.toggleFollow(userProfile.id, userProfile.isFollowing);
      
      // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: following,
        followersCount: following 
          ? prev.followersCount + 1 
          : prev.followersCount - 1
      } : null);

    } catch (error) {
      console.error('Failed to toggle follow:', error);
      // 에러 발생시 UI는 이미 변경되었으므로 되돌리기
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: !following,
        followersCount: following 
          ? prev.followersCount - 1 
          : prev.followersCount + 1
      } : null);
    }
  }, [userProfile]);

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
  // 렌더링 - 비공개 피드 처리
  // ============================================================================

  const isPrivateAndNotFollowing = !userProfile.feed.isPublic && !userProfile.isFollowing

  if (isPrivateAndNotFollowing) {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
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
              userId={userProfile.id}
              initialIsFollowing={userProfile.isFollowing} // isFollowing → initialIsFollowing
              isFollowedBy={userProfile.isFollowedBy}
              onFollowChange={handleFollowChange}
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
          initialIsFollowing={userProfile.isFollowing} // isFollowing → initialIsFollowing
          isFollowedBy={userProfile.isFollowedBy}
          onFollowChange={handleFollowChange}
        />
      </div>

      {/* 🔥 피드 미리보기 - 백엔드 데이터 사용 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {userProfile.name}의 피드
          </h2>
          <p className="text-gray-600 text-sm">총 {userProfile.feedsCount}개의 피드</p>
        </div>

        <div className="p-6">
          {userProfile.feeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProfile.feeds.slice(0, 6).map((feed) => ( // 최대 6개만 미리보기
                <div
                  key={feed.feedId}
                  className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/feed/${feed.feedId}`)}
                >
                  {/* 피드 이미지 */}
                  {feed.imgUrl && (
                    <div className="w-full h-48 mb-3 rounded-lg overflow-hidden">
                      <img
                        src={feed.imgUrl}
                        alt={feed.caption || '피드 이미지'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* 피드 정보 */}
                  <h3 className="font-medium text-gray-900 mb-1">
                    {feed.caption || '제목 없음'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {feed.accountName}
                  </p>
                  
                  {/* 피드 통계 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                      <svg className={`w-3 h-3 mr-1 ${feed.liked ? 'text-red-500 fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {feed.liked ? '좋아함' : '좋아요'}
                    </span>
                    <span>
                      {new Date(feed.createdAt).toLocaleDateString()}
                    </span>
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
              <p className="text-gray-500">피드가 없습니다.</p>
            </div>
          )}

          {/* 더 보기 버튼 */}
          {userProfile.feeds.length > 6 && (
            <div className="text-center mt-6">
              <button
                onClick={handleViewFeed}
                className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                모든 피드 보기 ({userProfile.feedsCount}개)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfile
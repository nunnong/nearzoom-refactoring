'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  PencilSquareIcon,
  HeartIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import ProfileHeader from './ProfileHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProfileEditModal from './ProfileEditModal'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의
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

// 🔥 프론트엔드 UserProfile 타입 (ProfileHeader와 동일)
interface UserProfile {
  id: number              // 백엔드 userId (Long)
  accountName: string     
  name: string
  email: string
  profileImage?: string
  prettyFace?: string
  followersCount: number
  followingCount: number
  isFollowing: boolean
  isFollowedBy: boolean
  feedsCount: number
  feeds: FeedDetailResponse[] // 🔥 백엔드 피드 데이터 직접 사용
}

interface MyProfileProps {
  userId?: number;         // 🔥 백엔드 userId 사용
  accountName?: string;    
  initialData?: UserProfile;
  onProfileUpdate?: (profile: UserProfile) => void;
  className?: string;
  isOwnProfile?: boolean;
}

// ============================================================================
// 백엔드 API 함수들 (인터셉터 통해 자동 토큰 처리)
// ============================================================================

const profileAPI = {
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
};

// ============================================================================
// MyProfile 컴포넌트
// ============================================================================

const MyProfile: React.FC<MyProfileProps> = ({
  userId: propUserId,      
  accountName: propAccountName,
  initialData,
  onProfileUpdate,
  className = '',
  isOwnProfile = true,
}) => {
  const router = useRouter()
  const { user: currentUser, isAuthenticated } = useAuth()

  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)
  const [feedsLoading, setFeedsLoading] = useState(false)

  // ============================================================================
  // 백엔드 연동 - 프로필 데이터 로드
  // ============================================================================

  const loadUserProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let targetUserId: number | null = null;

      // 1. userId 결정
      if (propUserId) {
        targetUserId = propUserId;
      } else if (propAccountName) {
        // accountName으로 userId 찾기
        targetUserId = await profileAPI.searchUserByAccountName(propAccountName);
        if (!targetUserId) {
          throw new Error(`사용자 '${propAccountName}'을 찾을 수 없습니다.`);
        }
      } else if (isOwnProfile && currentUser) {
        // 본인 프로필 - 현재 사용자 ID 사용 (string → number 변환)
        const currentUserId = currentUser?.id;
        if (typeof currentUserId === 'string') {
          targetUserId = parseInt(currentUserId);
        } else if (typeof currentUserId === 'number') {
          targetUserId = currentUserId;
        }
        
        if (!targetUserId || isNaN(targetUserId)) {
          throw new Error('현재 사용자 ID가 올바르지 않습니다.');
        }
      } else {
        throw new Error('사용자 정보를 확인할 수 없습니다.');
      }

      console.log('=== 프로필 로드 시작 ===', { targetUserId, isOwnProfile });

      // 2. 병렬로 데이터 로드
      const [userFeeds, followCounts, followStatus] = await Promise.all([
        profileAPI.getUserFeeds(targetUserId).catch(() => []), // 피드 없으면 빈 배열
        profileAPI.getFollowCounts(targetUserId).catch(() => ({ followerCount: 0, followingCount: 0 })),
        !isOwnProfile ? profileAPI.checkFollowStatus(targetUserId).catch(() => false) : Promise.resolve(false)
      ]);

      // 3. 사용자 정보 구성 (첫 번째 피드에서 추출 또는 기본값)
      const firstFeed = userFeeds[0];
      let accountName: string = propAccountName || '';
      let userName: string = propAccountName || '';
      let profileImage: string | undefined;

      if (firstFeed) {
        accountName = firstFeed.accountName;
        userName = firstFeed.accountName; // TODO: 실제 userName 필드 필요
        profileImage = firstFeed.profileImage || undefined;
      } else if (isOwnProfile && currentUser) {
        const userAny = currentUser as any;
        accountName = userAny.accountName || currentUser.email || '';
        userName = userAny.name || currentUser.email || '';
      } else {
        accountName = accountName || `user${targetUserId}`;
        userName = userName || `사용자${targetUserId}`;
      }

      // 4. UserProfile 객체 생성
      const profileData: UserProfile = {
        id: targetUserId,
        accountName: accountName,
        name: userName,
        email: isOwnProfile && currentUser ? (currentUser.email || '') : `${accountName}@example.com`,
        profileImage: profileImage,
        prettyFace: undefined,
        followersCount: followCounts.followerCount,
        followingCount: followCounts.followingCount,
        isFollowing: followStatus,
        isFollowedBy: false, // TODO: 역팔로우 상태 API 필요
        feedsCount: userFeeds.length,
        feeds: userFeeds
      };

      console.log('프로필 로드 완료:', profileData);

      setUserProfile(profileData);
      onProfileUpdate?.(profileData);

    } catch (err) {
      console.error('Failed to load profile:', err);
      const errorMessage = err instanceof Error ? err.message : '프로필을 불러오는데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [propUserId, propAccountName, isOwnProfile, currentUser, onProfileUpdate]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (!initialData) {
      loadUserProfile();
    }
  }, [loadUserProfile, initialData]);

  // ============================================================================
  // 인증 확인 (본인 프로필일 때)
  // ============================================================================

  if (isOwnProfile && (!isAuthenticated || !currentUser)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-4">내 프로필을 보려면 로그인해주세요.</p>
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

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleEditFeed = useCallback(() => {
    router.push('/my/edit')
  }, [router])

  const handleSettings = useCallback(() => {
    setIsProfileEditOpen(true)
  }, [])

  const handleRetry = useCallback(() => {
    loadUserProfile()
  }, [loadUserProfile])

  // 🔥 피드 클릭 핸들러 (백엔드 feedId 사용)
  const handleFeedClick = useCallback((feed: FeedDetailResponse) => {
    router.push(`/feed/${feed.feedId}`) // feedId로 상세 페이지 이동
  }, [router])

  // 🔥 팔로우 토글 핸들러
  const handleFollowToggle = useCallback(async () => {
    if (!userProfile || isOwnProfile) return;

    try {
      if (userProfile.isFollowing) {
        await api.delete(`/follows/${userProfile.id}`);
      } else {
        await api.post(`/follows/${userProfile.id}`);
      }

      // 상태 업데이트
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: !prev.isFollowing,
        followersCount: prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
      } : null);

    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  }, [userProfile, isOwnProfile]);

  // 🔥 프로필 편집 저장 (백엔드 연동)
  const handleProfileSave = useCallback(async (data: { name: string; description: string }) => {
    try {
      // TODO: 프로필 업데이트 API 호출
      // await api.put('/user/profile', { name: data.name, bio: data.description });
      
      console.log('프로필 업데이트 (현재 미구현):', data);

      // 로컬 상태 업데이트
      setUserProfile(prev => {
        if (!prev) return null;

        const updatedProfile = {
          ...prev,
          name: data.name,
        };

        onProfileUpdate?.(updatedProfile);
        return updatedProfile;
      });

      setIsProfileEditOpen(false);

    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  }, [onProfileUpdate]);

  const closeProfileEditModal = useCallback(() => {
    setIsProfileEditOpen(false);
  }, []);

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

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* 🔥 프로필 헤더 - ProfileHeader 타입에 맞춰 수정 */}
      <ProfileHeader
        user={{
          id: userProfile.id, // number 타입 그대로
          name: userProfile.name,
          email: userProfile.email,
          accountName: userProfile.accountName, // accountName 추가
          profileImage: userProfile.profileImage,
          followersCount: userProfile.followersCount,
          followingCount: userProfile.followingCount,
          isFollowing: userProfile.isFollowing,
          isFollowedBy: userProfile.isFollowedBy,
          feed: {
            id: `feed-${userProfile.id}`,
            name: `${userProfile.name}의 피드`,
            description: '내 소중한 이야기들',
            isPublic: true,
            backgroundColor: '#ffffff',
            backgroundImageUrl: undefined,
            likesCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }}
        isOwnProfile={isOwnProfile}
        onEditClick={handleSettings}
        onFollowClick={handleFollowToggle}
        currentUserId={(() => {
          const userId = currentUser?.id;
          if (typeof userId === 'string') {
            return parseInt(userId) || 0;
          } else if (typeof userId === 'number') {
            return userId;
          }
          return 0;
        })()}
      />

      {/* 🔥 피드 편집 버튼 - 본인 프로필일 때만 표시 */}
      {isOwnProfile && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleEditFeed}
            className="inline-flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <PencilSquareIcon className="h-5 w-5 mr-2" />
            <span>피드 편집하기</span>
          </button>
        </div>
      )}

      {/* 🔥 피드 목록 (백엔드 데이터) */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* 피드 헤더 */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {userProfile.name}의 피드
          </h2>
          <p className="text-gray-600 text-sm">총 {userProfile.feedsCount}개의 피드</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center">
              <HeartIcon className="w-4 h-4 mr-1" />
              팔로워 {userProfile.followersCount}
            </span>
            <span className="flex items-center">
              <EyeIcon className="w-4 h-4 mr-1" />
              팔로잉 {userProfile.followingCount}
            </span>
          </div>
        </div>

        {/* 피드 그리드 */}
        <div className="p-6">
          {userProfile.feeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProfile.feeds.map((feed) => (
                <div
                  key={feed.feedId}
                  className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleFeedClick(feed)}
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
                      <HeartIcon className={`w-3 h-3 mr-1 ${feed.liked ? 'text-red-500 fill-current' : ''}`} />
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
              <p className="text-gray-500">
                {isOwnProfile ? '아직 피드가 없습니다. 첫 번째 피드를 만들어보세요!' : '피드가 없습니다.'}
              </p>
              {isOwnProfile && (
                <button
                  onClick={handleEditFeed}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  피드 만들기
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🔥 프로필 편집 모달 - 본인 프로필일 때만 표시 */}
      {isOwnProfile && (
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={closeProfileEditModal}
          currentName={userProfile?.name || ''}
          currentDescription=""
          profileImage={userProfile?.profileImage}
          onSave={handleProfileSave}
        />
      )}
    </div>
  )
}

export default MyProfile
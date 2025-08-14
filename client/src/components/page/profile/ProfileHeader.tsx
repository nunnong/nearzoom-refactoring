// =============================================================================
// 📁 ProfileHeader.tsx - 백엔드 완벽 연동 버전 (상호 팔로우 API 포함)
// =============================================================================

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { CalendarDaysIcon, MapPinIcon, UserIcon, CogIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { useFollowModal } from '@/hooks/useFollowModal'
import FollowListModal from '@/components/ui/FollowListModal'

// 🔥 백엔드 연동 - axios 인스턴스 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의 (Java 백엔드와 완벽 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
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
  id: number;               // 백엔드 userId (Long)
  name: string;            // userName
  email: string;           // userEmail
  accountName: string;     // accountName
  profileImage?: string;   // profileImage
  followersCount: number;  // 팔로워 수
  followingCount: number;  // 팔로잉 수
  isFollowing: boolean;    // 현재 사용자가 이 사용자를 팔로우하는지
  isFollowedBy: boolean;   // 이 사용자가 현재 사용자를 팔로우하는지 (향후 구현)
  feed: {
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

interface ProfileHeaderProps {
  user: UserProfile;
  isOwnProfile: boolean;
  onEditClick?: () => void;
  onFollowClick?: () => void;
  className?: string;
  currentUserId?: string | number;
}

// ============================================================================
// 백엔드 API 엔드포인트 상수
// ============================================================================

const PROFILE_HEADER_ENDPOINTS = {
  // FollowController 엔드포인트들
  FOLLOW_BY_ACCOUNT: (accountName: string) => `/follows/${accountName}`,
  UNFOLLOW_BY_ACCOUNT: (accountName: string) => `/follows/${accountName}`,
  CHECK_FOLLOW_BY_ACCOUNT: (accountName: string) => `/follows/check/${accountName}`,
  FOLLOW_COUNTS_BY_ACCOUNT: (accountName: string) => `/follows/count/${accountName}`,
  FOLLOWERS_BY_ACCOUNT: (accountName: string) => `/follows/followers/${accountName}`,
  FOLLOWING_BY_ACCOUNT: (accountName: string) => `/follows/following/${accountName}`,
  
  // 🔥 새로 추가된 상호 팔로우 API
  MUTUAL_FOLLOWS_BY_ACCOUNT: (accountName: string) => `/follows/mutual/${accountName}`,
  
  // User 관련 엔드포인트들 (향후 구현)
  USER_PROFILE: (userId: number) => `/users/${userId}`,
};

// ============================================================================
// 백엔드 API 함수들 (실제 구현된 API만 사용)
// ============================================================================

const profileHeaderAPI = {
  // 🔥 POST /follows/{accountName} - 팔로우
  followUser: async (accountName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post<ApiResponse<void>>(
        PROFILE_HEADER_ENDPOINTS.FOLLOW_BY_ACCOUNT(accountName)
      );
      
      if (response.data.error) {
        return {
          success: false,
          error: response.data.message || '팔로우에 실패했습니다.'
        };
      }
      
      return { success: true };
    } catch (error) {
      console.error('🔥 Failed to follow user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '팔로우에 실패했습니다.'
      };
    }
  },

  // 🔥 DELETE /follows/{accountName} - 언팔로우
  unfollowUser: async (accountName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.delete<ApiResponse<void>>(
        PROFILE_HEADER_ENDPOINTS.UNFOLLOW_BY_ACCOUNT(accountName)
      );
      
      if (response.data.error) {
        return {
          success: false,
          error: response.data.message || '언팔로우에 실패했습니다.'
        };
      }
      
      return { success: true };
    } catch (error) {
      console.error('🔥 Failed to unfollow user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '언팔로우에 실패했습니다.'
      };
    }
  },

  // 🔥 팔로우 토글 (기존 상태에 따라 팔로우/언팔로우)
  toggleFollowByAccountName: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    try {
      console.log('=== 팔로우 토글 시작 ===', { accountName, isCurrentlyFollowing });
      
      const result = isCurrentlyFollowing
        ? await profileHeaderAPI.unfollowUser(accountName)
        : await profileHeaderAPI.followUser(accountName);

      if (!result.success) {
        throw new Error(result.error || '팔로우 처리에 실패했습니다.');
      }
      
      console.log('=== 팔로우 토글 성공 ===', { accountName, newFollowing: !isCurrentlyFollowing });
      
    } catch (error) {
      console.error('🔥 Failed to toggle follow:', error);
      throw error;
    }
  },

  // 🔥 GET /follows/check/{accountName} - 계정명으로 팔로우 상태 확인
  checkFollowStatusByAccountName: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(
        PROFILE_HEADER_ENDPOINTS.CHECK_FOLLOW_BY_ACCOUNT(accountName)
      );
      
      if (response.data.error) {
        console.warn('Failed to check follow status:', response.data.message);
        return false;
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error('🔥 Failed to check follow status:', error);
      return false;
    }
  },

  // 🔥 GET /follows/count/{accountName} - 계정명으로 팔로우 수 조회
  getFollowCountsByAccountName: async (accountName: string): Promise<FollowCountsResponse> => {
    try {
      const response = await api.get<ApiResponse<FollowCountsResponse>>(
        PROFILE_HEADER_ENDPOINTS.FOLLOW_COUNTS_BY_ACCOUNT(accountName)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우 수 조회에 실패했습니다.');
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error('🔥 Failed to get follow counts:', error);
      return { followerCount: 0, followingCount: 0 };
    }
  },

  // 🔥 GET /follows/mutual/{accountName} - 상호 팔로우 목록 조회 (새로 구현됨!)
  getMutualFollowsByAccountName: async (accountName: string): Promise<UserProfileResponse[]> => {
    try {
      const response = await api.get<ApiResponse<UserProfileResponse[]>>(
        PROFILE_HEADER_ENDPOINTS.MUTUAL_FOLLOWS_BY_ACCOUNT(accountName)
      );
      
      if (response.data.error) {
        console.warn('Failed to get mutual follows:', response.data.message);
        return [];
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error('🔥 Failed to get mutual follows:', error);
      return [];
    }
  },

  // 🔥 상호 팔로우 여부 확인 (상호 팔로우 목록이 비어있지 않은지 체크)
  checkMutualFollowByAccountName: async (accountName: string): Promise<boolean> => {
    try {
      const mutualFollows = await profileHeaderAPI.getMutualFollowsByAccountName(accountName);
      return mutualFollows.length > 0;
      
    } catch (error) {
      console.error('🔥 Failed to check mutual follow:', error);
      return false;
    }
  }
};

// ============================================================================
// ProfileHeader 컴포넌트
// ============================================================================

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  isOwnProfile,
  onEditClick,
  onFollowClick,
  className = '',
  currentUserId,
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [localFollowState, setLocalFollowState] = useState({
    isFollowing: user.isFollowing,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
  });
  const [isMutualFollow, setIsMutualFollow] = useState(false);
  const [mutualFollowCount, setMutualFollowCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 팔로우 모달 훅 사용 (accountName 기반)
  const {
    isOpen,
    modalType,
    targetAccountName,
    openFollowerModal,
    openFollowingModal,
    closeModal,
  } = useFollowModal();

  // 모달용 타겟 사용자 ID는 targetAccountName에서 추출
  const modalTargetUserId = targetAccountName;

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 토스트 메시지 표시
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 안전한 날짜 처리
  const getFormattedDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return '알 수 없음';
    }
  }, []);

  // ============================================================================
  // 초기화 및 데이터 로드
  // ============================================================================

  // 팔로우 상태 및 상호 팔로우 확인
  useEffect(() => {
    if (!isOwnProfile && isAuthenticated && user.accountName) {
      const loadFollowData = async () => {
        try {
          const [followCounts, mutualFollows] = await Promise.allSettled([
            profileHeaderAPI.getFollowCountsByAccountName(user.accountName),
            profileHeaderAPI.getMutualFollowsByAccountName(user.accountName)
          ]);

          // 팔로우 수 업데이트
          if (followCounts.status === 'fulfilled') {
            setLocalFollowState(prev => ({
              ...prev,
              followersCount: followCounts.value.followerCount,
              followingCount: followCounts.value.followingCount,
            }));
          }

          // 🔥 상호 팔로우 데이터 업데이트 (실제 백엔드 API 사용)
          if (mutualFollows.status === 'fulfilled') {
            const mutualFollowsList = mutualFollows.value;
            setMutualFollowCount(mutualFollowsList.length);
            setIsMutualFollow(mutualFollowsList.length > 0);
            
            console.log('🔥 상호 팔로우 데이터 로드:', {
              accountName: user.accountName,
              mutualCount: mutualFollowsList.length,
              hasMutualFollows: mutualFollowsList.length > 0
            });
          }

        } catch (error) {
          console.error('Failed to load follow data:', error);
        }
      };

      loadFollowData();
    }
  }, [user.accountName, isOwnProfile, isAuthenticated]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 🔥 백엔드 연동 - 팔로우 토글 핸들러
  const handleFollowToggle = useCallback(async () => {
    if (isOwnProfile || isFollowLoading || !isAuthenticated) {
      if (!isAuthenticated) {
        showToast('로그인이 필요합니다.');
      }
      return;
    }

    const originalFollowing = localFollowState.isFollowing;
    const originalCount = localFollowState.followersCount;

    setIsFollowLoading(true);

    try {
      console.log('=== 팔로우 토글 시작 ===', { 
        accountName: user.accountName, 
        currentFollowing: originalFollowing 
      });

      // 낙관적 업데이트
      const newFollowing = !originalFollowing;
      const newCount = newFollowing ? originalCount + 1 : Math.max(0, originalCount - 1);
      
      setLocalFollowState(prev => ({
        ...prev,
        isFollowing: newFollowing,
        followersCount: newCount
      }));

      // 🔥 실제 백엔드 API 호출 (accountName 기반)
      await profileHeaderAPI.toggleFollowByAccountName(user.accountName, originalFollowing);

      console.log('=== 팔로우 토글 성공 ===', { 
        accountName: user.accountName, 
        newFollowing 
      });

      // 부모 컴포넌트에 알림
      onFollowClick?.();

      // 성공 메시지 표시
      showToast(newFollowing ? '팔로우했습니다!' : '언팔로우했습니다.');

      // 🔥 상호 팔로우 상태 재확인 (실제 백엔드 API 사용)
      if (newFollowing) {
        try {
          const mutualFollows = await profileHeaderAPI.getMutualFollowsByAccountName(user.accountName);
          setMutualFollowCount(mutualFollows.length);
          setIsMutualFollow(mutualFollows.length > 0);
          
          console.log('🔥 팔로우 후 상호 팔로우 재확인:', {
            accountName: user.accountName,
            mutualCount: mutualFollows.length,
            hasMutualFollows: mutualFollows.length > 0
          });
        } catch (error) {
          console.warn('상호 팔로우 상태 재확인 실패:', error);
        }
      } else {
        setIsMutualFollow(false);
        setMutualFollowCount(0);
      }

    } catch (error) {
      console.error('Failed to toggle follow:', error);
      
      // 실패 시 롤백
      setLocalFollowState(prev => ({
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      }));
      
      const errorMessage = error instanceof Error ? error.message : '팔로우 처리에 실패했습니다.';
      showToast(errorMessage);
    } finally {
      setIsFollowLoading(false);
    }
  }, [user.accountName, localFollowState.isFollowing, isOwnProfile, isFollowLoading, isAuthenticated, onFollowClick, showToast]);

  // 🔥 프로필 설정 페이지로 이동 (톱니바퀴 버튼)
  const handleProfileSettings = useCallback(() => {
    router.push('/profile'); // 프로필 설정 전용 페이지로 이동
  }, [router]);

  // 팔로워 버튼 클릭 핸들러 (accountName 기반)
  const handleFollowersClick = useCallback(() => {
    openFollowerModal(user.accountName);
  }, [openFollowerModal, user.accountName]);

  // 팔로잉 버튼 클릭 핸들러 (accountName 기반)
  const handleFollowingClick = useCallback(() => {
    openFollowingModal(user.accountName);
  }, [openFollowingModal, user.accountName]);

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8 ${className}`}>
        {/* 배경 이미지 */}
        <div 
          className="h-32 bg-gradient-to-r from-blue-400 to-purple-500 relative"
          style={{
            backgroundColor: user.feed.backgroundColor || '#f3f4f6',
            backgroundImage: user.feed.backgroundImageUrl ? `url(${user.feed.backgroundImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* 설정 버튼 (본인 프로필인 경우만) - 우상단에 위치 */}
          {isOwnProfile && (
            <button
              onClick={handleProfileSettings}
              className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-2 rounded-full shadow-md transition-all duration-200 hover:shadow-lg"
              title="프로필 설정"
              aria-label="프로필 설정"
            >
              <CogIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="relative px-6 pb-6">
          {/* 프로필 이미지 */}
          <div className="flex items-end justify-between -mt-12">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  
                  {/* 이미지 로드 실패 시 또는 이미지가 없을 때 표시될 fallback */}
                  <div className={`w-full h-full flex items-center justify-center text-gray-400 ${user.profileImage ? 'hidden' : ''}`}>
                    <UserIcon className="w-12 h-12" />
                  </div>
                </div>
              </div>

              {/* 온라인 상태 표시 (본인 프로필인 경우만) */}
              {isOwnProfile && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            {/* 🔥 액션 버튼들 */}
            <div className="flex items-center space-x-3">
              {/* 팔로우/언팔로우 버튼 (타인 프로필이고 로그인된 경우만) */}
              {!isOwnProfile && isAuthenticated && (
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    localFollowState.isFollowing
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                  }`}
                >
                  {isFollowLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                      {localFollowState.isFollowing ? '언팔로우 중...' : '팔로우 중...'}
                    </div>
                  ) : (
                    localFollowState.isFollowing ? '팔로잉' : '팔로우'
                  )}
                </button>
              )}

              {/* 편집 버튼 (본인 프로필인 경우만) */}
              {isOwnProfile && onEditClick && (
                <button
                  onClick={onEditClick}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  프로필 편집
                </button>
              )}

              {/* 로그인이 안된 경우 안내 버튼 */}
              {!isOwnProfile && !isAuthenticated && (
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  로그인하여 팔로우
                </button>
              )}
            </div>
          </div>

          {/* 사용자 정보 */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{user.name}</h1>
              
              {/* 계정 상태 배지 */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {user.feed.isPublic ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    공개
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                    비공개
                  </span>
                )}
                
                {isOwnProfile && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    내 프로필
                  </span>
                )}
              </div>
            </div>

            {/* 🔥 계정명 표시 */}
            <p className="text-gray-600 mb-1 truncate">
              @{user.accountName}
            </p>

            {/* 피드 설명 */}
            <div className="mt-4">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{user.feed.name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                {user.feed.description || '아직 설명이 없습니다.'}
              </p>
            </div>

            {/* 추가 정보 */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <CalendarDaysIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">{getFormattedDate(user.feed.createdAt)}부터 시작</span>
              </div>
              
              <div className="flex items-center">
                <MapPinIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">Seoul, Korea</span>
              </div>
            </div>

            {/* 🔥 팔로우 통계 (백엔드 실시간 데이터 반영) */}
            <div className="mt-4 flex items-center space-x-6">
              {/* 팔로잉 버튼 */}
              <button 
                onClick={handleFollowingClick}
                className="hover:underline hover:bg-gray-50 px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label={`${localFollowState.followingCount}명의 팔로잉 목록 보기`}
              >
                <span className="font-semibold text-gray-900">{localFollowState.followingCount.toLocaleString()}</span>
                <span className="text-gray-500 ml-1">팔로잉</span>
              </button>
              
              {/* 팔로워 버튼 (로컬 상태 반영) */}
              <button 
                onClick={handleFollowersClick}
                className="hover:underline hover:bg-gray-50 px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label={`${localFollowState.followersCount}명의 팔로워 목록 보기`}
              >
                <span className="font-semibold text-gray-900">{localFollowState.followersCount.toLocaleString()}</span>
                <span className="text-gray-500 ml-1">팔로워</span>
              </button>

              {/* 좋아요 */}
              <div>
                <span className="font-semibold text-gray-900">{user.feed.likesCount.toLocaleString()}</span>
                <span className="text-gray-500 ml-1">좋아요</span>
              </div>
            </div>

            {/* 🔥 상호 팔로우 표시 (백엔드 실제 API 데이터 기반) */}
            {!isOwnProfile && localFollowState.isFollowing && isMutualFollow && (
              <div className="mt-3">
                <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  서로 팔로우 중 ({mutualFollowCount}명 공통)
                </span>
              </div>
            )}

            {/* 팔로우됨 표시 */}
            {!isOwnProfile && user.isFollowedBy && !localFollowState.isFollowing && (
              <div className="mt-3">
                <span className="inline-flex items-center px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded">
                  나를 팔로우함
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 팔로우 모달 */}
      <FollowListModal
        userId={modalTargetUserId}
        type={modalType}
        isOpen={isOpen}
        onClose={closeModal}
        currentUserId={currentUserId ? String(currentUserId) : undefined}
      />

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium shadow-lg transition-all duration-300">
            {toastMessage}
          </div>
        </div>
      )}

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔥 개발 정보</div>
          <div>사용자 ID: {user.id}</div>
          <div>계정명: {user.accountName}</div>
          <div>팔로워: {localFollowState.followersCount}</div>
          <div>팔로잉: {localFollowState.followingCount}</div>
          <div>팔로우 상태: {localFollowState.isFollowing ? 'Yes' : 'No'}</div>
          <div>상호 팔로우: {isMutualFollow ? 'Yes' : 'No'}</div>
          <div>상호 팔로우 수: {mutualFollowCount}</div>
          <div>본인 프로필: {isOwnProfile ? 'Yes' : 'No'}</div>
          <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
        </div>
      )}
    </>
  );
};

export default ProfileHeader;


// =============================================================================
// 📁 ProfileHeader.tsx - 완전한 아키텍처 원칙 준수 + 인증 보호 + 무한스크롤
// =============================================================================

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import type { JSX } from 'react'
import { 
  CalendarDaysIcon, 
  MapPinIcon, 
  UserIcon, 
  CogIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { useFollowModal } from '@/hooks/useFollowModal'
import FollowListModal from '@/components/ui/FollowListModal'

// 🔥 백엔드 연동 - 인터셉터가 적용된 axios 인스턴스
import api from '@/lib/axios'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 100% 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 FollowCountsResponse.java 기반 (백엔드와 완전 일치)
interface FollowCountsResponse {
  followerCount: number;  // long -> number
  followingCount: number; // long -> number
}

// 🔥 UserProfileResponse.java 기반 (User 도메인)
interface UserProfileResponse {
  userId: number;                    // Long -> number
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage: string | null;
  prettyFace: string | null;
}

// 🔥 MyFeedStatsResponse.java 기반 (피드 통계)
interface MyFeedStatsResponse {
  postCount: number;      // long -> number
  totalLikes: number;     // long -> number  
  followerCount: number;  // long -> number
  followingCount: number; // long -> number
}

// 🔥 커서 기반 팔로우 목록 응답
interface FollowListResponse {
  users: UserProfileResponse[];
  hasNext: boolean;
  nextCursor: number | null;
}

// 프론트엔드 통합 UserProfile 타입
interface UserProfile {
  id: number;
  name: string;
  email: string;
  accountName: string;
  profileImage?: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
  feed: {
    id: string;
    name: string;
    description: string;
    isPublic: boolean;
    backgroundColor: string;
    backgroundImageUrl?: string;
    likesCount: number;
    postCount: number;
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
// 백엔드 API 함수들 (커서 기반 무한스크롤 + 자동 인증 처리)
// ============================================================================

const profileHeaderAPI = {
  // 🔥 POST /follows/{accountName} - 팔로우
  followUser: async (accountName: string): Promise<void> => {
    console.log('🔥 API 요청 - POST /follows/' + accountName);
    
    const response = await api.post<ApiResponse<void>>(`/follows/${accountName}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 팔로우 성공');
  },

  // 🔥 DELETE /follows/{accountName} - 언팔로우
  unfollowUser: async (accountName: string): Promise<void> => {
    console.log('🔥 API 요청 - DELETE /follows/' + accountName);
    
    const response = await api.delete<ApiResponse<void>>(`/follows/${accountName}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '언팔로우에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 언팔로우 성공');
  },

  // 🔥 GET /follows/check/{accountName} - 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    console.log('🔥 API 요청 - GET /follows/check/' + accountName);
    
    const response = await api.get<ApiResponse<boolean>>(`/follows/check/${accountName}`);
    
    if (response.data.error) {
      console.warn('팔로우 상태 확인 실패:', response.data.message);
      return false;
    }
    
    console.log('🔥 API 응답 - 팔로우 상태:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<FollowCountsResponse> => {
    console.log('🔥 API 요청 - GET /follows/count/' + accountName);
    
    const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${accountName}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우 수 조회에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 팔로우 수:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /follows/mutual/{accountName}?limit=10&cursor=123 - 상호 팔로우 목록 (커서 기반)
  getMutualFollows: async (
    accountName: string, 
    limit: number = 20, 
    cursor?: number
  ): Promise<FollowListResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /follows/mutual/' + accountName, params);
    
    const response = await api.get<ApiResponse<FollowListResponse>>(
      `/follows/mutual/${accountName}`,
      { params }
    );
    
    if (response.data.error) {
      console.warn('상호 팔로우 조회 실패:', response.data.message);
      return { users: [], hasNext: false, nextCursor: null };
    }
    
    console.log('🔥 API 응답 - 상호 팔로우:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /follows/followers/{accountName}?limit=10&cursor=123 - 팔로워 목록 (커서 기반)
  getFollowers: async (
    accountName: string, 
    limit: number = 20, 
    cursor?: number
  ): Promise<FollowListResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /follows/followers/' + accountName, params);
    
    const response = await api.get<ApiResponse<FollowListResponse>>(
      `/follows/followers/${accountName}`,
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로워 목록 조회에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 팔로워 목록:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /follows/following/{accountName}?limit=10&cursor=123 - 팔로잉 목록 (커서 기반)
  getFollowing: async (
    accountName: string, 
    limit: number = 20, 
    cursor?: number
  ): Promise<FollowListResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /follows/following/' + accountName, params);
    
    const response = await api.get<ApiResponse<FollowListResponse>>(
      `/follows/following/${accountName}`,
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로잉 목록 조회에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 팔로잉 목록:', response.data.data);
    return response.data.data;
  },

  // 🔥 팔로우 토글 (기존 상태에 따라 팔로우/언팔로우)
  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    if (isCurrentlyFollowing) {
      await profileHeaderAPI.unfollowUser(accountName);
    } else {
      await profileHeaderAPI.followUser(accountName);
    }
  },
};

// ============================================================================
// 인증 보호 컴포넌트
// ============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  className?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  className = '' 
}): JSX.Element => {
  const { isAuthenticated, isLoading, handleLogin } = useAuth();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">인증 상태를 확인하는 중...</p>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-64 text-center p-8 ${className}`}>
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <LockClosedIcon className="h-10 w-10 text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          로그인이 필요합니다
        </h2>
        
        <p className="text-gray-600 mb-6 max-w-md">
          프로필을 보시려면 먼저 로그인해주세요. <br />
          로그인 후 모든 기능을 이용할 수 있습니다.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleLogin}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인하러 가기
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5 inline mr-2" />
            새로고침
          </button>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>안전한 서비스:</strong> 모든 기능은 로그인한 사용자만 이용할 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ============================================================================
// ProfileHeader 컴포넌트
// ============================================================================

function ProfileHeader({
  user,
  isOwnProfile,
  onEditClick,
  onFollowClick,
  className = '',
  currentUserId,
}: ProfileHeaderProps): JSX.Element {
  const router = useRouter();
  const { isAuthenticated, handleLogin } = useAuth();
  
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
  const [error, setError] = useState<string | null>(null);

  // 팔로우 모달 훅 사용
  const {
    isOpen,
    modalType,
    targetAccountName,
    openFollowerModal,
    openFollowingModal,
    closeModal,
  } = useFollowModal();

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 토스트 메시지 표시
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 에러 처리
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('404') || err.message.includes('Not Found')) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
    showToast(errorMessage, 'error');
    
    if (errorMessage.includes('인증이 만료') || errorMessage.includes('권한이 없')) {
      setTimeout(() => handleLogin(), 2000);
    }
    
    setTimeout(() => setError(null), 5000);
  }, [showToast, handleLogin]);

  // 안전한 날짜 처리
  const getFormattedDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return '알 수 없음';
    }
  }, []);

  // ============================================================================
  // 초기화 및 데이터 로드 (인증된 사용자만)
  // ============================================================================

  // 팔로우 상태 및 상호 팔로우 확인
  useEffect(() => {
    if (!isOwnProfile && isAuthenticated && user.accountName) {
      const loadFollowData = async () => {
        try {
          console.log('🔥 팔로우 데이터 로드 시작:', user.accountName);

          // 병렬로 데이터 로드
          const [followCountsResult, mutualFollowsResult, followStatusResult] = await Promise.allSettled([
            profileHeaderAPI.getFollowCounts(user.accountName),
            profileHeaderAPI.getMutualFollows(user.accountName, 20),
            profileHeaderAPI.checkFollowStatus(user.accountName)
          ]);

          // 팔로우 수 업데이트
          if (followCountsResult.status === 'fulfilled') {
            setLocalFollowState(prev => ({
              ...prev,
              followersCount: followCountsResult.value.followerCount,
              followingCount: followCountsResult.value.followingCount,
            }));
          }

          // 팔로우 상태 업데이트
          if (followStatusResult.status === 'fulfilled') {
            setLocalFollowState(prev => ({
              ...prev,
              isFollowing: followStatusResult.value,
            }));
          }

          // 상호 팔로우 데이터 업데이트
          if (mutualFollowsResult.status === 'fulfilled') {
            const mutualFollowsData = mutualFollowsResult.value;
            setMutualFollowCount(mutualFollowsData.users.length);
            setIsMutualFollow(mutualFollowsData.users.length > 0);
            
            console.log('🔥 상호 팔로우 데이터 로드 완료:', {
              accountName: user.accountName,
              mutualCount: mutualFollowsData.users.length,
              hasMutualFollows: mutualFollowsData.users.length > 0,
              hasNext: mutualFollowsData.hasNext
            });
          }

          console.log('🔥 팔로우 데이터 로드 완료');

        } catch (err) {
          console.error('팔로우 데이터 로드 실패:', err);
          handleError(err, '팔로우 데이터 로드');
        }
      };

      loadFollowData();
    }
  }, [user.accountName, isOwnProfile, isAuthenticated, handleError]);

  // ============================================================================
  // 이벤트 핸들러들 (인증된 사용자만)
  // ============================================================================

  // 🔥 백엔드 연동 - 팔로우 토글 핸들러
  const handleFollowToggle = useCallback(async () => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }

    if (isOwnProfile || isFollowLoading) {
      return;
    }

    const originalFollowing = localFollowState.isFollowing;
    const originalCount = localFollowState.followersCount;

    setIsFollowLoading(true);
    setError(null);

    try {
      console.log('🔥 팔로우 토글 시작:', { 
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

      // 🔥 실제 백엔드 API 호출 (자동 인증 처리)
      await profileHeaderAPI.toggleFollow(user.accountName, originalFollowing);

      console.log('🔥 팔로우 토글 성공:', { 
        accountName: user.accountName, 
        newFollowing 
      });

      // 부모 컴포넌트에 알림
      if (onFollowClick) {
        onFollowClick();
      }

      // 성공 메시지 표시
      showToast(newFollowing ? '팔로우했습니다!' : '언팔로우했습니다!');

      // 🔥 상호 팔로우 상태 재확인 (커서 기반)
      if (newFollowing) {
        try {
          const mutualFollows = await profileHeaderAPI.getMutualFollows(user.accountName, 20);
          setMutualFollowCount(mutualFollows.users.length);
          setIsMutualFollow(mutualFollows.users.length > 0);
          
          console.log('🔥 팔로우 후 상호 팔로우 재확인:', {
            accountName: user.accountName,
            mutualCount: mutualFollows.users.length,
            hasMutualFollows: mutualFollows.users.length > 0,
            hasNext: mutualFollows.hasNext
          });
        } catch (mutualError) {
          console.warn('상호 팔로우 상태 재확인 실패:', mutualError);
        }
      } else {
        setIsMutualFollow(false);
        setMutualFollowCount(0);
      }

    } catch (error: any) {
      console.error('팔로우 토글 실패:', error);
      
      // 실패 시 롤백
      setLocalFollowState(prev => ({
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      }));
      
      // 인증 관련 에러 처리
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '팔로우 토글');
      } else {
        handleError(error, '팔로우 토글');
      }
    } finally {
      setIsFollowLoading(false);
    }
  }, [
    user.accountName, 
    localFollowState.isFollowing, 
    localFollowState.followersCount,
    isOwnProfile, 
    isFollowLoading, 
    isAuthenticated, 
    onFollowClick, 
    showToast, 
    handleError,
    handleLogin
  ]);

  // 프로필 설정 페이지로 이동
  const handleProfileSettings = useCallback(() => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }
    router.push('/profile');
  }, [router, isAuthenticated, showToast, handleLogin]);

  // 팔로워 버튼 클릭 핸들러
  const handleFollowersClick = useCallback(() => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }
    openFollowerModal(user.accountName);
  }, [openFollowerModal, user.accountName, isAuthenticated, showToast, handleLogin]);

  // 팔로잉 버튼 클릭 핸들러
  const handleFollowingClick = useCallback(() => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }
    openFollowingModal(user.accountName);
  }, [openFollowingModal, user.accountName, isAuthenticated, showToast, handleLogin]);

  // ============================================================================
  // 렌더링 (AuthGuard로 보호)
  // ============================================================================

  const renderContent = (): JSX.Element => (
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
        {/* 설정 버튼 (본인 프로필인 경우만) */}
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

          {/* 액션 버튼들 */}
          <div className="flex items-center space-x-3">
            {/* 팔로우/언팔로우 버튼 (타인 프로필인 경우만) */}
            {!isOwnProfile && (
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

          {/* 팔로우 통계 (백엔드 실시간 데이터 반영) */}
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
            
            {/* 팔로워 버튼 */}
            <button 
              onClick={handleFollowersClick}
              className="hover:underline hover:bg-gray-50 px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label={`${localFollowState.followersCount}명의 팔로워 목록 보기`}
            >
              <span className="font-semibold text-gray-900">{localFollowState.followersCount.toLocaleString()}</span>
              <span className="text-gray-500 ml-1">팔로워</span>
            </button>

            {/* 게시물 수 */}
            <div>
              <span className="font-semibold text-gray-900">{user.feed.postCount.toLocaleString()}</span>
              <span className="text-gray-500 ml-1">게시물</span>
            </div>

            {/* 좋아요 수 */}
            <div>
              <span className="font-semibold text-gray-900">{user.feed.likesCount.toLocaleString()}</span>
              <span className="text-gray-500 ml-1">좋아요</span>
            </div>
          </div>

          {/* 상호 팔로우 표시 (백엔드 실제 API 데이터 기반) */}
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
  );

  return (
    <AuthGuard className={className}>
      {renderContent()}
      
      {/* 팔로우 모달 - 커서 기반 무한스크롤 지원 */}
      {isOpen && targetAccountName && (
        <FollowListModal
          accountName={targetAccountName}
          type={modalType}
          isOpen={isOpen}
          onClose={closeModal}
        />
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium shadow-lg transition-all duration-300">
            {error}
          </div>
        </div>
      )}

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
          <div>게시물: {user.feed.postCount}</div>
          <div>좋아요: {user.feed.likesCount}</div>
          <div>팔로우 상태: {localFollowState.isFollowing ? 'Yes' : 'No'}</div>
          <div>상호 팔로우: {isMutualFollow ? 'Yes' : 'No'}</div>
          <div>상호 팔로우 수: {mutualFollowCount}</div>
          <div>본인 프로필: {isOwnProfile ? 'Yes' : 'No'}</div>
          <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
          <div>로딩: {isFollowLoading ? 'Yes' : 'No'}</div>
        </div>
      )}
    </AuthGuard>
  );
}

// ============================================================================
// 🔥 헬퍼 함수들 - 백엔드 응답을 UserProfile로 변환
// ============================================================================

export const convertToUserProfile = (
  userResponse: UserProfileResponse,
  followCounts: FollowCountsResponse,
  feedStats: MyFeedStatsResponse,
  isFollowing: boolean = false,
  isFollowedBy: boolean = false,
  feedData?: {
    name: string;
    description: string;
    isPublic: boolean;
    backgroundColor: string;
    backgroundImageUrl?: string;
    createdAt: string;
    updatedAt: string;
  }
): UserProfile => {
  return {
    id: userResponse.userId,
    name: userResponse.userName,
    email: userResponse.userEmail,
    accountName: userResponse.accountName,
    profileImage: userResponse.profileImage || undefined,
    followersCount: followCounts.followerCount,
    followingCount: followCounts.followingCount,
    isFollowing,
    isFollowedBy,
    feed: {
      id: userResponse.userId.toString(),
      name: feedData?.name || `${userResponse.userName}의 피드`,
      description: feedData?.description || `${userResponse.userName}님의 피드입니다.`,
      isPublic: feedData?.isPublic ?? true,
      backgroundColor: feedData?.backgroundColor || '#f3f4f6',
      backgroundImageUrl: feedData?.backgroundImageUrl,
      likesCount: feedStats.totalLikes,
      postCount: feedStats.postCount,
      createdAt: feedData?.createdAt || new Date().toISOString(),
      updatedAt: feedData?.updatedAt || new Date().toISOString(),
    },
  };
};

// ============================================================================
// 🔥 커스텀 훅 - ProfileHeader 상태 관리 (인증 보호)
// ============================================================================

export const useProfileHeader = (initialUser: UserProfile) => {
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, handleLogin } = useAuth();

  const updateUser = useCallback((updatedUser: UserProfile) => {
    setUser(updatedUser);
  }, []);

  const refreshFollowData = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    if (!user.accountName) return;

    setIsLoading(true);
    setError(null);

    try {
      const [followCounts, mutualFollows] = await Promise.all([
        profileHeaderAPI.getFollowCounts(user.accountName),
        profileHeaderAPI.getMutualFollows(user.accountName, 20)
      ]);

      setUser(prev => ({
        ...prev,
        followersCount: followCounts.followerCount,
        followingCount: followCounts.followingCount,
      }));

      return {
        followCounts,
        mutualFollowsCount: mutualFollows.users.length,
        hasMutualFollows: mutualFollows.users.length > 0,
        hasNext: mutualFollows.hasNext
      };

    } catch (err: any) {
      let errorMessage = '팔로우 데이터 새로고침에 실패했습니다.';
      
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
        setTimeout(() => handleLogin(), 2000);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user.accountName, isAuthenticated, handleLogin]);

  const toggleFollow = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    if (!user.accountName) return;

    const originalFollowing = user.isFollowing;
    const originalCount = user.followersCount;

    try {
      // 낙관적 업데이트
      const newFollowing = !originalFollowing;
      const newCount = newFollowing ? originalCount + 1 : Math.max(0, originalCount - 1);
      
      setUser(prev => ({
        ...prev,
        isFollowing: newFollowing,
        followersCount: newCount
      }));

      // 실제 API 호출 (자동 인증 처리)
      await profileHeaderAPI.toggleFollow(user.accountName, originalFollowing);

      return { success: true, newFollowing };

    } catch (err: any) {
      // 실패 시 롤백
      setUser(prev => ({
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      }));

      let errorMessage = '팔로우 처리에 실패했습니다.';
      
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
        setTimeout(() => handleLogin(), 2000);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user.accountName, user.isFollowing, user.followersCount, isAuthenticated, handleLogin]);

  return {
    user,
    updateUser,
    refreshFollowData,
    toggleFollow,
    isLoading,
    error,
    setError
  };
};

// ============================================================================
// 🔥 백엔드 API 관련 타입 및 상수 export
// ============================================================================

export type { 
  UserProfile, 
  UserProfileResponse, 
  FollowCountsResponse, 
  MyFeedStatsResponse,
  FollowListResponse,
  ApiResponse 
};

export { profileHeaderAPI };

export default ProfileHeader;
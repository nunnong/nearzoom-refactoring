// =============================================================================
// 📁 FollowButton.tsx - 백엔드 완전 연동 및 커서 무한스크롤 최적화 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/auth/useAuth'

// 🔥 백엔드 연동
import api from '@/lib/axios'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 완전 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 FollowCountsResponse.java 기반 (백엔드와 100% 일치)
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// ============================================================================
// Props 타입 정의 (accountName 기반으로 완전 변경)
// ============================================================================

interface FollowButtonProps {
  userId?: number;                // 🔥 선택적으로 변경 (accountName 우선 사용)
  accountName: string;            // 🔥 필수 속성 (백엔드 API가 accountName 기반)
  initialIsFollowing?: boolean;   // 🔥 선택적으로 변경 (서버에서 다시 확인)
  isFollowedBy?: boolean;         // 상호 팔로우 여부
  onFollowChange?: (newFollowing: boolean, accountName: string) => Promise<void>;
  onCountsUpdate?: (counts: FollowCountsResponse) => void; // 🔥 팔로우 수 업데이트 콜백
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  showCounts?: boolean;           // 🔥 팔로우 수 표시 여부
  autoRefresh?: boolean;          // 🔥 자동으로 팔로우 상태 새로고침 여부
}

// ============================================================================
// 백엔드 API 함수들 (실제 Java Controller 엔드포인트)
// ============================================================================

const followAPI = {
  // 🔥 POST /follows/{accountName} - 팔로우
  followUser: async (accountName: string): Promise<void> => {
    console.log('🔥 API 요청 - POST /follows/' + accountName);

    const response = await api.post<ApiResponse<void>>(`/follows/${accountName}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 팔로우 완료');
  },

  // 🔥 DELETE /follows/{accountName} - 언팔로우
  unfollowUser: async (accountName: string): Promise<void> => {
    console.log('🔥 API 요청 - DELETE /follows/' + accountName);

    const response = await api.delete<ApiResponse<void>>(`/follows/${accountName}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '언팔로우에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 언팔로우 완료');
  },

  // 🔥 GET /follows/check/{accountName} - 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    console.log('🔥 API 요청 - GET /follows/check/' + accountName);

    try {
      const response = await api.get<ApiResponse<boolean>>(`/follows/check/${accountName}`);
      
      if (response.data.error) {
        console.warn('팔로우 상태 확인 실패:', response.data.message);
        return false; // 에러 시 팔로우하지 않은 것으로 간주
      }
      
      console.log('🔥 API 응답 - 팔로우 상태:', response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('팔로우 상태 확인 실패:', error);
      return false;
    }
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
};

// ============================================================================
// FollowButton 컴포넌트 (백엔드 완전 연동)
// ============================================================================

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  accountName,
  initialIsFollowing,
  isFollowedBy = false,
  onFollowChange,
  onCountsUpdate,
  disabled = false,
  size = 'md',
  variant = 'primary',
  className = '',
  showCounts = false,
  autoRefresh = true,
}) => {
  const { user, isAuthenticated } = useAuth();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [followCounts, setFollowCounts] = useState<FollowCountsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 현재 사용자 여부 확인
  const isCurrentUser = useCallback(() => {
    const userObj = user as any;
    return userObj?.accountName === accountName || userObj?.userId === userId;
  }, [user, accountName, userId]);

  // 에러 처리
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('로그인이 필요')) {
        errorMessage = '로그인이 필요합니다.';
      } else if (err.message.includes('403') || err.message.includes('권한이 없습니다')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('404') || err.message.includes('찾을 수 없습니다')) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
    
    // 에러 자동 제거
    setTimeout(() => setError(null), 3000);
  }, []);

  // ============================================================================
  // 백엔드 API 연동 - 초기화
  // ============================================================================

  useEffect(() => {
    // 자동 새로고침이 비활성화되어 있고 initialIsFollowing이 제공된 경우 스킵
    if (!autoRefresh && initialIsFollowing !== undefined) {
      setIsFollowing(initialIsFollowing);
      return;
    }

    // 현재 사용자는 자기 자신을 팔로우할 수 없음
    if (isCurrentUser()) {
      return;
    }

    // 로그인하지 않은 경우 스킵
    if (!isAuthenticated) {
      return;
    }

    const initializeFollowStatus = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        console.log('🔥 팔로우 상태 초기화 시작:', accountName);

        // 🔥 백엔드에서 실제 팔로우 상태 확인
        const actualFollowStatus = await followAPI.checkFollowStatus(accountName);
        setIsFollowing(actualFollowStatus);

        // 🔥 팔로우 수 조회 (선택적)
        if (showCounts) {
          const counts = await followAPI.getFollowCounts(accountName);
          setFollowCounts(counts);
          
          if (onCountsUpdate) {
            onCountsUpdate(counts);
          }
        }

        console.log('🔥 팔로우 상태 초기화 완료:', {
          accountName,
          isFollowing: actualFollowStatus,
          counts: followCounts
        });

      } catch (err) {
        console.error('팔로우 상태 초기화 실패:', err);
        handleError(err, '팔로우 상태 초기화');
        
        // 실패 시 fallback으로 initialIsFollowing 사용
        if (initialIsFollowing !== undefined) {
          setIsFollowing(initialIsFollowing);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeFollowStatus();
  }, [
    accountName, 
    autoRefresh, 
    initialIsFollowing, 
    isAuthenticated, 
    isCurrentUser, 
    showCounts, 
    onCountsUpdate, 
    handleError
  ]);

  // ============================================================================
  // 백엔드 API 연동 - 팔로우 토글
  // ============================================================================

  const handleFollowToggle = useCallback(async () => {
    if (disabled || isLoading || isCurrentUser() || !isAuthenticated) {
      if (!isAuthenticated) {
        setError('로그인이 필요합니다.');
      }
      return;
    }

    const newFollowingState = !isFollowing;
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔥 팔로우 토글 시작:', { 
        accountName, 
        currentState: isFollowing, 
        newState: newFollowingState 
      });

      // 낙관적 업데이트
      setIsFollowing(newFollowingState);

      if (newFollowingState) {
        // 🔥 팔로우 API 호출
        await followAPI.followUser(accountName);
      } else {
        // 🔥 언팔로우 API 호출
        await followAPI.unfollowUser(accountName);
      }

      console.log('🔥 팔로우 토글 성공:', { 
        accountName, 
        newState: newFollowingState 
      });

      // 🔥 팔로우 수 업데이트 (선택적)
      if (showCounts) {
        try {
          const updatedCounts = await followAPI.getFollowCounts(accountName);
          setFollowCounts(updatedCounts);
          
          if (onCountsUpdate) {
            onCountsUpdate(updatedCounts);
          }
        } catch (countsError) {
          console.warn('팔로우 수 업데이트 실패:', countsError);
          // 팔로우 수 업데이트 실패는 무시 (메인 액션은 성공)
        }
      }

      // 부모 컴포넌트에 변경사항 알림
      if (onFollowChange) {
        try {
          await onFollowChange(newFollowingState, accountName);
        } catch (callbackError) {
          console.warn('onFollowChange 콜백 실패:', callbackError);
          // 콜백 실패는 무시 (메인 액션은 성공)
        }
      }

    } catch (err) {
      console.error('🔥 팔로우 토글 실패:', err);
      
      // 실패 시 롤백
      setIsFollowing(isFollowing);
      handleError(err, '팔로우 토글');
    } finally {
      setIsLoading(false);
    }
  }, [
    disabled, 
    isLoading, 
    isCurrentUser, 
    isAuthenticated, 
    isFollowing, 
    accountName, 
    showCounts, 
    onCountsUpdate, 
    onFollowChange, 
    handleError
  ]);

  // ============================================================================
  // 스타일링
  // ============================================================================

  // 크기별 스타일
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  // 아이콘 크기
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // 변형별 스타일
  const getVariantClasses = () => {
    if (isFollowing) {
      // 팔로잉 상태 (언팔로우 버튼)
      switch (variant) {
        case 'primary':
          return 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-300 hover:border-red-300';
        case 'secondary':
          return 'bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300';
        case 'outline':
          return 'bg-transparent hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300';
        default:
          return 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-300 hover:border-red-300';
      }
    } else {
      // 팔로우 대기 상태 (팔로우 버튼)
      switch (variant) {
        case 'primary':
          return 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700';
        case 'secondary':
          return 'bg-gray-600 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-700';
        case 'outline':
          return 'bg-transparent hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-blue-600 hover:border-blue-700';
        default:
          return 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700';
      }
    }
  };

  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
    relative
  `.trim();

  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${getVariantClasses()}
    ${className}
  `.trim();

  // ============================================================================
  // 렌더링 조건
  // ============================================================================

  // 현재 사용자는 자기 자신을 팔로우할 수 없음
  if (isCurrentUser()) {
    return null;
  }

  // 로그인하지 않은 경우 비활성화된 버튼 표시
  const isButtonDisabled = disabled || isLoading || isInitializing || !isAuthenticated;

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <div className="relative">
      <button
        onClick={handleFollowToggle}
        disabled={isButtonDisabled}
        className={buttonClasses}
        aria-label={isFollowing ? `${accountName} 언팔로우` : `${accountName} 팔로우`}
        title={
          !isAuthenticated ? '로그인이 필요합니다' :
          isFollowing ? '클릭하여 언팔로우' : '클릭하여 팔로우'
        }
      >
        {/* 로딩 인디케이터 */}
        {(isLoading || isInitializing) ? (
          <>
            <div className={`border-2 border-current border-t-transparent rounded-full animate-spin mr-2 ${iconSizes[size]}`} />
            {isInitializing ? '확인 중...' : isFollowing ? '언팔로우 중...' : '팔로우 중...'}
          </>
        ) : (
          <>
            {/* 아이콘과 텍스트 */}
            {isFollowing ? (
              <>
                <UserMinusIcon className={`${iconSizes[size]} mr-2`} />
                {size === 'sm' ? '팔로잉' : '팔로잉'}
              </>
            ) : (
              <>
                <UserPlusIcon className={`${iconSizes[size]} mr-2`} />
                {size === 'sm' ? '팔로우' : '팔로우'}
              </>
            )}

            {/* 상호 팔로우 표시 */}
            {isFollowing && isFollowedBy && size !== 'sm' && (
              <span className="ml-2 text-xs opacity-75" title="상호 팔로우">
                ↔
              </span>
            )}

            {/* 팔로우 수 표시 (선택적) */}
            {showCounts && followCounts && size !== 'sm' && (
              <span className="ml-2 text-xs opacity-75">
                ({followCounts.followerCount})
              </span>
            )}
          </>
        )}
      </button>

      {/* 에러 메시지 툴팁 */}
      {error && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
          <div className="bg-red-600 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-600 rotate-45"></div>
            {error}
          </div>
        </div>
      )}

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute -bottom-20 left-0 bg-black bg-opacity-80 text-white text-xs rounded p-2 z-40 whitespace-nowrap">
          <div className="font-semibold">🔥 팔로우 버튼 디버그</div>
          <div>Account: {accountName}</div>
          <div>Following: {isFollowing ? 'Yes' : 'No'}</div>
          <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          <div>Initializing: {isInitializing ? 'Yes' : 'No'}</div>
          <div>Auth: {isAuthenticated ? 'Yes' : 'No'}</div>
          <div>Current User: {isCurrentUser() ? 'Yes' : 'No'}</div>
          {followCounts && (
            <div>Followers: {followCounts.followerCount}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FollowButton;
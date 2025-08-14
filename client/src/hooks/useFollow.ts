// src/hooks/useFollow.ts - 백엔드 완벽 연동 버전

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 🔥 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// timeline.ts에서 백엔드 엔드포인트 가져오기
import { TIMELINE_ENDPOINTS } from '@/lib/types/timeline'

// ============================================================================
// 백엔드 API 응답 타입 정의 (실제 백엔드 구조와 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// FollowCountsResponse.java와 일치
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// UserProfileResponse.java와 일치 (팔로워/팔로잉 목록용)
interface UserProfileResponse {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage: string | null;
  prettyFace: boolean;
}

// ============================================================================
// 프론트엔드 타입 정의
// ============================================================================

interface FollowStats {
  followerCount: number;
  followingCount: number;
}

interface FollowState {
  isFollowing: boolean;
  stats?: FollowStats;
}

interface UseFollowOptions {
  enableOptimisticUpdates?: boolean;
  onFollowSuccess?: (accountName: string, stats?: FollowStats) => void;
  onUnfollowSuccess?: (accountName: string, stats?: FollowStats) => void;
  onError?: (error: string, accountName?: string) => void;
  onStatsUpdate?: (accountName: string, stats: FollowStats) => void;
}

interface UseFollowReturn {
  // 상태
  isLoading: boolean;
  loadingUsers: Set<string>;
  followStates: Map<string, FollowState>;
  error: string | null;
  
  // 기본 작업 (accountName 기반)
  followUser: (accountName: string) => Promise<void>;
  unfollowUser: (accountName: string) => Promise<void>;
  toggleFollow: (accountName: string, currentlyFollowing?: boolean) => Promise<void>;
  
  // 상태 확인
  isFollowing: (accountName: string) => boolean;
  getFollowStats: (accountName: string) => FollowStats | undefined;
  
  // 목록 조회
  getFollowers: (accountName: string) => Promise<UserProfileResponse[]>;
  getFollowing: (accountName: string) => Promise<UserProfileResponse[]>;
  
  // 유틸리티
  refreshFollowState: (accountName: string) => Promise<void>;
  refreshFollowStats: (accountName: string) => Promise<void>;
  clearError: () => void;
  updateFollowState: (accountName: string, state: Partial<FollowState>) => void;
}

// ============================================================================
// 백엔드 API 함수들 (실제 엔드포인트 사용)
// ============================================================================

const followAPI = {
  // 🔥 POST /follows/{accountName} - 팔로우
  followUser: async (accountName: string): Promise<void> => {
    const response = await api.post<ApiResponse<void>>(
      TIMELINE_ENDPOINTS.FOLLOW_USER(accountName)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우에 실패했습니다.');
    }
  },

  // 🔥 DELETE /follows/{accountName} - 언팔로우
  unfollowUser: async (accountName: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(
      TIMELINE_ENDPOINTS.UNFOLLOW_USER(accountName)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '언팔로우에 실패했습니다.');
    }
  },

  // 🔥 GET /follows/check/{accountName} - 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    const response = await api.get<ApiResponse<boolean>>(
      TIMELINE_ENDPOINTS.CHECK_FOLLOW(accountName)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우 상태 확인에 실패했습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<FollowCountsResponse> => {
    const response = await api.get<ApiResponse<FollowCountsResponse>>(
      `/follows/count/${accountName}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우 수 조회에 실패했습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /follows/followers/{accountName} - 팔로워 목록 조회
  getFollowers: async (accountName: string): Promise<UserProfileResponse[]> => {
    const response = await api.get<ApiResponse<UserProfileResponse[]>>(
      `/follows/followers/${accountName}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로워 목록 조회에 실패했습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /follows/following/{accountName} - 팔로잉 목록 조회
  getFollowing: async (accountName: string): Promise<UserProfileResponse[]> => {
    const response = await api.get<ApiResponse<UserProfileResponse[]>>(
      `/follows/following/${accountName}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로잉 목록 조회에 실패했습니다.');
    }
    
    return response.data.data;
  },
};

// ============================================================================
// 메인 훅 (백엔드 완벽 연동)
// ============================================================================

export const useFollow = (options: UseFollowOptions = {}): UseFollowReturn => {
  const {
    enableOptimisticUpdates = true,
    onFollowSuccess,
    onUnfollowSuccess,
    onError,
    onStatsUpdate
  } = options;

  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const [followStates, setFollowStates] = useState<Map<string, FollowState>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  // 진행 중인 작업들을 추적
  const pendingOperations = useRef<Set<string>>(new Set());

  // 인증 상태
  const { isAuthenticated } = useAuthStore();

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 로딩 중인 사용자 추가/제거 헬퍼
  const addLoadingUser = useCallback((accountName: string) => {
    setLoadingUsers(prev => new Set([...prev, accountName]));
  }, []);

  const removeLoadingUser = useCallback((accountName: string) => {
    setLoadingUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(accountName);
      return newSet;
    });
  }, []);

  // 에러 처리 헬퍼
  const handleError = useCallback((err: unknown, context: string, accountName?: string) => {
    console.error(`Error in ${context}:`, err);
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    setError(message);
    onError?.(message, accountName);
  }, [onError]);

  // ============================================================================
  // 백엔드 API 연동 - 팔로우 함수
  // ============================================================================

  const followUser = useCallback(async (accountName: string) => {
    if (!isAuthenticated) {
      onError?.('로그인이 필요합니다.', accountName);
      return;
    }

    if (pendingOperations.current.has(accountName)) return;
    
    // 이미 팔로우 중인지 확인
    const currentState = followStates.get(accountName);
    if (currentState?.isFollowing) return;

    setError(null);
    addLoadingUser(accountName);
    pendingOperations.current.add(accountName);

    // 낙관적 업데이트
    if (enableOptimisticUpdates) {
      setFollowStates(prev => new Map(prev).set(accountName, {
        isFollowing: true,
        stats: prev.get(accountName)?.stats
      }));
    }

    try {
      console.log(`=== 팔로우 시작 ===`, { accountName });

      // 🔥 백엔드 API 호출 (POST /follows/{accountName})
      await followAPI.followUser(accountName);

      console.log(`=== 팔로우 성공 ===`, { accountName });

      // 🔥 팔로우 후 통계 조회
      let stats: FollowStats | undefined;
      try {
        const countsResult = await followAPI.getFollowCounts(accountName);
        stats = {
          followerCount: countsResult.followerCount,
          followingCount: countsResult.followingCount
        };
      } catch (statsError) {
        console.warn('Failed to get follow stats after follow:', statsError);
        // 통계 조회 실패는 무시하고 계속 진행
      }

      // 성공 시 상태 업데이트 (낙관적 업데이트가 아닌 경우에만)
      if (!enableOptimisticUpdates) {
        setFollowStates(prev => new Map(prev).set(accountName, {
          isFollowing: true,
          stats
        }));
      } else if (stats) {
        // 낙관적 업데이트를 했더라도 통계는 업데이트
        setFollowStates(prev => {
          const current = prev.get(accountName) || { isFollowing: true };
          return new Map(prev).set(accountName, { ...current, stats });
        });
      }

      onFollowSuccess?.(accountName, stats);
      if (stats) {
        onStatsUpdate?.(accountName, stats);
      }

    } catch (err) {
      console.error('Follow operation failed:', err);
      
      // 실패 시 낙관적 업데이트 롤백
      if (enableOptimisticUpdates) {
        setFollowStates(prev => new Map(prev).set(accountName, {
          isFollowing: false,
          stats: prev.get(accountName)?.stats
        }));
      }
      
      handleError(err, '팔로우', accountName);
    } finally {
      removeLoadingUser(accountName);
      pendingOperations.current.delete(accountName);
    }
  }, [isAuthenticated, followStates, enableOptimisticUpdates, addLoadingUser, removeLoadingUser, onFollowSuccess, onStatsUpdate, handleError, onError]);

  // ============================================================================
  // 백엔드 API 연동 - 언팔로우 함수
  // ============================================================================

  const unfollowUser = useCallback(async (accountName: string) => {
    if (!isAuthenticated) {
      onError?.('로그인이 필요합니다.', accountName);
      return;
    }

    if (pendingOperations.current.has(accountName)) return;
    
    // 팔로우 중이 아닌지 확인
    const currentState = followStates.get(accountName);
    if (!currentState?.isFollowing) return;

    setError(null);
    addLoadingUser(accountName);
    pendingOperations.current.add(accountName);

    // 낙관적 업데이트
    if (enableOptimisticUpdates) {
      setFollowStates(prev => new Map(prev).set(accountName, {
        isFollowing: false,
        stats: prev.get(accountName)?.stats
      }));
    }

    try {
      console.log(`=== 언팔로우 시작 ===`, { accountName });

      // 🔥 백엔드 API 호출 (DELETE /follows/{accountName})
      await followAPI.unfollowUser(accountName);

      console.log(`=== 언팔로우 성공 ===`, { accountName });

      // 🔥 언팔로우 후 통계 조회
      let stats: FollowStats | undefined;
      try {
        const countsResult = await followAPI.getFollowCounts(accountName);
        stats = {
          followerCount: countsResult.followerCount,
          followingCount: countsResult.followingCount
        };
      } catch (statsError) {
        console.warn('Failed to get follow stats after unfollow:', statsError);
        // 통계 조회 실패는 무시하고 계속 진행
      }

      // 성공 시 상태 업데이트 (낙관적 업데이트가 아닌 경우에만)
      if (!enableOptimisticUpdates) {
        setFollowStates(prev => new Map(prev).set(accountName, {
          isFollowing: false,
          stats
        }));
      } else if (stats) {
        // 낙관적 업데이트를 했더라도 통계는 업데이트
        setFollowStates(prev => {
          const current = prev.get(accountName) || { isFollowing: false };
          return new Map(prev).set(accountName, { ...current, stats });
        });
      }

      onUnfollowSuccess?.(accountName, stats);
      if (stats) {
        onStatsUpdate?.(accountName, stats);
      }

    } catch (err) {
      console.error('Unfollow operation failed:', err);
      
      // 실패 시 낙관적 업데이트 롤백
      if (enableOptimisticUpdates) {
        setFollowStates(prev => new Map(prev).set(accountName, {
          isFollowing: true,
          stats: prev.get(accountName)?.stats
        }));
      }
      
      handleError(err, '언팔로우', accountName);
    } finally {
      removeLoadingUser(accountName);
      pendingOperations.current.delete(accountName);
    }
  }, [isAuthenticated, followStates, enableOptimisticUpdates, addLoadingUser, removeLoadingUser, onUnfollowSuccess, onStatsUpdate, handleError, onError]);

  // ============================================================================
  // 토글 팔로우
  // ============================================================================

  const toggleFollow = useCallback(async (accountName: string, currentlyFollowing?: boolean) => {
    const currentState = followStates.get(accountName);
    const isCurrentlyFollowing = currentlyFollowing ?? currentState?.isFollowing ?? false;
    
    if (isCurrentlyFollowing) {
      await unfollowUser(accountName);
    } else {
      await followUser(accountName);
    }
  }, [followStates, followUser, unfollowUser]);

  // ============================================================================
  // 상태 확인 함수들
  // ============================================================================

  const isFollowing = useCallback((accountName: string) => {
    return followStates.get(accountName)?.isFollowing || false;
  }, [followStates]);

  const getFollowStats = useCallback((accountName: string): FollowStats | undefined => {
    return followStates.get(accountName)?.stats;
  }, [followStates]);

  // ============================================================================
  // 목록 조회 함수들 (백엔드 연동)
  // ============================================================================

  const getFollowers = useCallback(async (accountName: string): Promise<UserProfileResponse[]> => {
    try {
      console.log(`=== 팔로워 목록 조회 ===`, { accountName });
      return await followAPI.getFollowers(accountName);
    } catch (err) {
      handleError(err, '팔로워 목록 조회', accountName);
      return [];
    }
  }, [handleError]);

  const getFollowing = useCallback(async (accountName: string): Promise<UserProfileResponse[]> => {
    try {
      console.log(`=== 팔로잉 목록 조회 ===`, { accountName });
      return await followAPI.getFollowing(accountName);
    } catch (err) {
      handleError(err, '팔로잉 목록 조회', accountName);
      return [];
    }
  }, [handleError]);

  // ============================================================================
  // 새로고침 함수들 (백엔드 연동)
  // ============================================================================

  // 🔥 팔로우 상태 새로고침 (백엔드 API 호출)
  const refreshFollowState = useCallback(async (accountName: string) => {
    if (!isAuthenticated) return;

    addLoadingUser(accountName);
    try {
      console.log(`=== 팔로우 상태 새로고침 ===`, { accountName });

      // 🔥 백엔드에서 팔로우 상태와 통계 조회
      const [isFollowingResult, countsResult] = await Promise.allSettled([
        followAPI.checkFollowStatus(accountName),
        followAPI.getFollowCounts(accountName)
      ]);

      const isFollowing = isFollowingResult.status === 'fulfilled' ? isFollowingResult.value : false;
      const stats: FollowStats | undefined = countsResult.status === 'fulfilled' ? {
        followerCount: countsResult.value.followerCount,
        followingCount: countsResult.value.followingCount
      } : undefined;

      const newState: FollowState = {
        isFollowing,
        stats
      };

      setFollowStates(prev => new Map(prev).set(accountName, newState));
      
      if (stats) {
        onStatsUpdate?.(accountName, stats);
      }

      console.log(`=== 팔로우 상태 새로고침 완료 ===`, { accountName, isFollowing, stats });
    } catch (err) {
      handleError(err, '팔로우 상태 새로고침', accountName);
    } finally {
      removeLoadingUser(accountName);
    }
  }, [isAuthenticated, addLoadingUser, removeLoadingUser, onStatsUpdate, handleError]);

  // 🔥 팔로우 통계만 새로고침
  const refreshFollowStats = useCallback(async (accountName: string) => {
    try {
      console.log(`=== 팔로우 통계 새로고침 ===`, { accountName });
      
      const countsResult = await followAPI.getFollowCounts(accountName);
      const stats: FollowStats = {
        followerCount: countsResult.followerCount,
        followingCount: countsResult.followingCount
      };

      setFollowStates(prev => {
        const current = prev.get(accountName) || { isFollowing: false };
        return new Map(prev).set(accountName, { ...current, stats });
      });
      
      onStatsUpdate?.(accountName, stats);
      
      console.log(`=== 팔로우 통계 새로고침 완료 ===`, { accountName, stats });
    } catch (err) {
      handleError(err, '팔로우 통계 새로고침', accountName);
    }
  }, [onStatsUpdate, handleError]);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const updateFollowState = useCallback((accountName: string, state: Partial<FollowState>) => {
    setFollowStates(prev => {
      const currentState = prev.get(accountName) || { isFollowing: false };
      return new Map(prev).set(accountName, { ...currentState, ...state });
    });
  }, []);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      pendingOperations.current.clear();
    };
  }, []);

  // ============================================================================
  // 반환 값
  // ============================================================================

  return {
    // 상태
    isLoading,
    loadingUsers,
    followStates,
    error,
    
    // 기본 작업 (accountName 기반)
    followUser,
    unfollowUser,
    toggleFollow,
    
    // 상태 확인
    isFollowing,
    getFollowStats,
    
    // 목록 조회
    getFollowers,
    getFollowing,
    
    // 유틸리티
    refreshFollowState,
    refreshFollowStats,
    clearError,
    updateFollowState,
  };
};

// ============================================================================
// 🔥 추가: 백엔드 에러 처리를 위한 유틸리티
// ============================================================================

export type FollowError = 
  | 'UNAUTHORIZED'              // 로그인이 필요합니다
  | 'USER_NOT_FOUND'           // 사용자를 찾을 수 없습니다
  | 'ALREADY_FOLLOWING'        // 이미 팔로우 중입니다
  | 'NOT_FOLLOWING'            // 팔로우 중이 아닙니다
  | 'SELF_FOLLOW'              // 자기 자신을 팔로우할 수 없습니다
  | 'NETWORK_ERROR'            // 네트워크 오류
  | 'UNKNOWN_ERROR';           // 알 수 없는 오류

// 백엔드 에러를 타입별로 분류하는 유틸리티
export const classifyFollowError = (error: Error): FollowError => {
  const message = error.message.toLowerCase();
  
  if (message.includes('로그인이 필요') || message.includes('unauthorized')) return 'UNAUTHORIZED';
  if (message.includes('사용자를 찾을 수 없습니다') || message.includes('user not found')) return 'USER_NOT_FOUND';
  if (message.includes('이미 팔로우') || message.includes('already following')) return 'ALREADY_FOLLOWING';
  if (message.includes('팔로우 중이 아닙니다') || message.includes('not following')) return 'NOT_FOLLOWING';
  if (message.includes('자기 자신') || message.includes('self follow')) return 'SELF_FOLLOW';
  if (message.includes('network') || message.includes('timeout')) return 'NETWORK_ERROR';
  
  return 'UNKNOWN_ERROR';
};
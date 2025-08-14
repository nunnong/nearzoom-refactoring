// src/hooks/useFollowModal.ts - 백엔드 완벽 연동 버전

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

// UserProfileResponse.java와 일치 (팔로워/팔로잉 목록용)
interface UserProfileResponse {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage: string | null;
  prettyFace: boolean;
}

// FollowCountsResponse.java와 일치
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// ============================================================================
// 프론트엔드 타입 정의
// ============================================================================

// 프론트엔드에서 사용할 User 타입 (UserProfileResponse 기반)
interface User {
  id: string;              // accountName을 id로 사용
  userId: number;          // 백엔드 userId (API 호출용)
  accountName: string;     // 계정명
  username: string;        // userName (표시명)
  displayName: string;     // userName
  email: string;          // userEmail
  profileImageUrl?: string; // profileImage
  prettyFace?: boolean;    // prettyFace
  isFollowing?: boolean;   // 팔로우 상태 (별도 조회 필요)
}

// 팔로우 통계
interface FollowStats {
  followerCount: number;   // 팔로워 수
  followingCount: number;  // 팔로잉 수
}

// ============================================================================
// 메인 훅 인터페이스
// ============================================================================

export interface UseFollowModalReturn {
  // 기본 상태
  isOpen: boolean;
  modalType: 'followers' | 'following';
  targetAccountName: string;  // accountName 기반으로 변경
  
  // 데이터
  users: User[];
  followStats: FollowStats | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // 모달 제어 (accountName 기반)
  openFollowerModal: (accountName: string) => void;
  openFollowingModal: (accountName: string) => void;
  closeModal: () => void;
  
  // 데이터 관리
  loadUsers: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  loadMoreUsers: () => Promise<void>;
  
  // 팔로우 액션 (accountName 기반)
  followUser: (accountName: string) => Promise<void>;
  unfollowUser: (accountName: string) => Promise<void>;
  toggleFollow: (accountName: string) => Promise<void>;
  
  // 유틸리티
  clearError: () => void;
  getUserByAccountName: (accountName: string) => User | undefined;
  isUserFollowing: (accountName: string) => boolean;
}

// ============================================================================
// 백엔드 API 함수들 (실제 엔드포인트 사용)
// ============================================================================

const followModalAPI = {
  // 🔥 GET /follows/followers/{accountName} - 팔로워 목록
  getFollowers: async (accountName: string): Promise<UserProfileResponse[]> => {
    const response = await api.get<ApiResponse<UserProfileResponse[]>>(
      `/follows/followers/${accountName}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로워 목록 조회에 실패했습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /follows/following/{accountName} - 팔로잉 목록
  getFollowing: async (accountName: string): Promise<UserProfileResponse[]> => {
    const response = await api.get<ApiResponse<UserProfileResponse[]>>(
      `/follows/following/${accountName}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로잉 목록 조회에 실패했습니다.');
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
};

// ============================================================================
// 메인 훅 (백엔드 완벽 연동)
// ============================================================================

export const useFollowModal = (): UseFollowModalReturn => {
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following'>('followers');
  const [targetAccountName, setTargetAccountName] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  
  // 요청 관리
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  
  // 인증 상태
  const { isAuthenticated } = useAuthStore();

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 에러 처리 헬퍼
  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('로그인이 필요')) {
        return '로그인이 필요합니다.';
      } else if (err.message.includes('403') || err.message.includes('권한이 없습니다')) {
        return '권한이 없습니다.';
      } else if (err.message.includes('404') || err.message.includes('사용자를 찾을 수 없습니다')) {
        return '사용자를 찾을 수 없습니다.';
      } else if (err.message.includes('Network Error') || err.message.includes('network')) {
        return '네트워크 연결을 확인해주세요.';
      }
      return err.message;
    }
    return '알 수 없는 오류가 발생했습니다.';
  }, []);

  // 🔥 백엔드 UserProfileResponse를 User 타입으로 변환
  const transformBackendUser = useCallback((backendUser: UserProfileResponse): User => {
    return {
      id: backendUser.accountName,              // accountName을 고유 ID로 사용
      userId: backendUser.userId,               // 백엔드 userId
      accountName: backendUser.accountName,     // 계정명
      username: backendUser.userName,           // 사용자명
      displayName: backendUser.userName,        // 표시명
      email: backendUser.userEmail,             // 이메일
      profileImageUrl: backendUser.profileImage || undefined, // 프로필 이미지
      prettyFace: backendUser.prettyFace,       // 예쁜 얼굴 여부
      isFollowing: false                        // 초기값, 별도로 조회 필요
    };
  }, []);

  // ============================================================================
  // 백엔드 API 연동 - 팔로워/팔로잉 목록 조회
  // ============================================================================

  const loadUsers = useCallback(async () => {
    if (!isAuthenticated || !targetAccountName) {
      setError('로그인이 필요하거나 대상 사용자가 지정되지 않았습니다.');
      return;
    }

    // 중복 요청 방지
    if (loadingRef.current) return;
    loadingRef.current = true;

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      console.log(`=== ${modalType} 목록 로딩 시작 ===`, { targetAccountName });

      let backendUsers: UserProfileResponse[];

      if (modalType === 'followers') {
        // 🔥 GET /follows/followers/{accountName}
        backendUsers = await followModalAPI.getFollowers(targetAccountName);
      } else {
        // 🔥 GET /follows/following/{accountName}
        backendUsers = await followModalAPI.getFollowing(targetAccountName);
      }

      // 백엔드 데이터를 프론트엔드 User 타입으로 변환
      const transformedUsers = backendUsers.map(transformBackendUser);

      // 🔥 각 사용자의 팔로우 상태 확인 (병렬 처리)
      const usersWithFollowStatus = await Promise.all(
        transformedUsers.map(async (user) => {
          try {
            const isFollowing = await followModalAPI.checkFollowStatus(user.accountName);
            return { ...user, isFollowing };
          } catch (error) {
            console.warn(`팔로우 상태 확인 실패: ${user.accountName}`, error);
            return { ...user, isFollowing: false }; // 실패 시 기본값
          }
        })
      );

      setUsers(usersWithFollowStatus);
      setHasMore(false); // 백엔드에서 페이징을 지원하지 않는 것으로 보임

      console.log(`=== ${modalType} 목록 로딩 완료 ===`, {
        count: usersWithFollowStatus.length,
        users: usersWithFollowStatus
      });

      // 🔥 팔로우 통계도 함께 조회 (GET /follows/count/{accountName})
      try {
        const statsResult = await followModalAPI.getFollowCounts(targetAccountName);
        setFollowStats({
          followerCount: statsResult.followerCount,
          followingCount: statsResult.followingCount
        });
        console.log('팔로우 통계 로딩 완료:', statsResult);
      } catch (statsError) {
        console.warn('팔로우 통계 로딩 실패:', statsError);
        // 통계 조회 실패는 무시하고 계속 진행
      }

    } catch (err) {
      // 요청이 취소된 경우는 에러로 처리하지 않음
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error(`${modalType} 목록 로딩 실패:`, err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [isAuthenticated, targetAccountName, modalType, transformBackendUser, handleApiError]);

  // ============================================================================
  // 백엔드 API 연동 - 팔로우/언팔로우 액션
  // ============================================================================

  // 🔥 팔로우 (POST /follows/{accountName})
  const followUser = useCallback(async (accountName: string) => {
    if (!isAuthenticated) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      console.log('=== 팔로우 시작 ===', { accountName });

      // 🔥 백엔드 API 호출
      await followModalAPI.followUser(accountName);

      // 낙관적 업데이트: 해당 사용자의 팔로우 상태 변경
      setUsers(prev => prev.map(user => 
        user.accountName === accountName 
          ? { ...user, isFollowing: true }
          : user
      ));

      // 팔로우 통계 업데이트 (타겟 사용자의 팔로워 수 +1)
      // 주의: 내가 다른 사람을 팔로우하면, 그 사람의 팔로워 수가 증가
      if (followStats && modalType === 'followers') {
        setFollowStats(prev => prev ? {
          ...prev,
          followerCount: prev.followerCount + 1
        } : null);
      }

      console.log('=== 팔로우 성공 ===', { accountName });

    } catch (err) {
      console.error('팔로우 실패:', err);
      setError(handleApiError(err));
    }
  }, [isAuthenticated, followStats, modalType, handleApiError]);

  // 🔥 언팔로우 (DELETE /follows/{accountName})
  const unfollowUser = useCallback(async (accountName: string) => {
    if (!isAuthenticated) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      console.log('=== 언팔로우 시작 ===', { accountName });

      // 🔥 백엔드 API 호출
      await followModalAPI.unfollowUser(accountName);

      // 낙관적 업데이트: 해당 사용자의 팔로우 상태 변경
      setUsers(prev => prev.map(user => 
        user.accountName === accountName 
          ? { ...user, isFollowing: false }
          : user
      ));

      // 팔로우 통계 업데이트 (타겟 사용자의 팔로워 수 -1)
      if (followStats && modalType === 'followers') {
        setFollowStats(prev => prev ? {
          ...prev,
          followerCount: Math.max(0, prev.followerCount - 1)
        } : null);
      }

      console.log('=== 언팔로우 성공 ===', { accountName });

    } catch (err) {
      console.error('언팔로우 실패:', err);
      setError(handleApiError(err));
    }
  }, [isAuthenticated, followStats, modalType, handleApiError]);

  // 🔥 토글 팔로우
  const toggleFollow = useCallback(async (accountName: string) => {
    const user = users.find(u => u.accountName === accountName);
    if (!user) {
      console.warn('사용자를 찾을 수 없습니다:', accountName);
      return;
    }

    if (user.isFollowing) {
      await unfollowUser(accountName);
    } else {
      await followUser(accountName);
    }
  }, [users, followUser, unfollowUser]);

  // ============================================================================
  // 모달 제어 (accountName 기반)
  // ============================================================================

  const openFollowerModal = useCallback((accountName: string) => {
    setTargetAccountName(accountName);
    setModalType('followers');
    setIsOpen(true);
    setUsers([]);
    setFollowStats(null);
    setError(null);
    
    console.log('=== 팔로워 모달 열기 ===', { accountName });
  }, []);

  const openFollowingModal = useCallback((accountName: string) => {
    setTargetAccountName(accountName);
    setModalType('following');
    setIsOpen(true);
    setUsers([]);
    setFollowStats(null);
    setError(null);
    
    console.log('=== 팔로잉 모달 열기 ===', { accountName });
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setTargetAccountName('');
    setUsers([]);
    setFollowStats(null);
    setError(null);
    
    // 진행 중인 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    console.log('=== 모달 닫기 ===');
  }, []);

  // ============================================================================
  // 데이터 관리
  // ============================================================================

  const refreshUsers = useCallback(async () => {
    setUsers([]);
    setFollowStats(null);
    setError(null);
    await loadUsers();
  }, [loadUsers]);

  const loadMoreUsers = useCallback(async () => {
    // 백엔드에서 페이징을 지원하지 않으므로 구현하지 않음
    console.log('더 많은 사용자 로드는 백엔드에서 페이징을 지원하지 않습니다.');
  }, []);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getUserByAccountName = useCallback((accountName: string): User | undefined => {
    return users.find(user => user.accountName === accountName);
  }, [users]);

  const isUserFollowing = useCallback((accountName: string): boolean => {
    const user = users.find(u => u.accountName === accountName);
    return user?.isFollowing || false;
  }, [users]);

  // ============================================================================
  // 모달이 열릴 때 자동으로 데이터 로드
  // ============================================================================

  useEffect(() => {
    if (isOpen && targetAccountName) {
      loadUsers();
    }
  }, [isOpen, targetAccountName, modalType, loadUsers]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================================================
  // 반환 값
  // ============================================================================

  return {
    // 기본 상태
    isOpen,
    modalType,
    targetAccountName,  // accountName 기반으로 변경
    
    // 데이터
    users,
    followStats,
    loading,
    error,
    hasMore,
    
    // 모달 제어 (accountName 기반)
    openFollowerModal,
    openFollowingModal,
    closeModal,
    
    // 데이터 관리
    loadUsers,
    refreshUsers,
    loadMoreUsers,
    
    // 팔로우 액션 (accountName 기반)
    followUser,
    unfollowUser,
    toggleFollow,
    
    // 유틸리티
    clearError,
    getUserByAccountName,  // accountName 기반으로 변경
    isUserFollowing,
  };
};

// ============================================================================
// 🔥 추가: 백엔드 에러 처리를 위한 유틸리티
// ============================================================================

export type FollowModalError = 
  | 'UNAUTHORIZED'              // 로그인이 필요합니다
  | 'USER_NOT_FOUND'           // 사용자를 찾을 수 없습니다
  | 'FOLLOW_FAILED'            // 팔로우/언팔로우 실패
  | 'NETWORK_ERROR'            // 네트워크 오류
  | 'UNKNOWN_ERROR';           // 알 수 없는 오류

// 백엔드 에러를 타입별로 분류하는 유틸리티
export const classifyFollowModalError = (error: Error): FollowModalError => {
  const message = error.message.toLowerCase();
  
  if (message.includes('로그인이 필요') || message.includes('unauthorized')) return 'UNAUTHORIZED';
  if (message.includes('사용자를 찾을 수 없습니다') || message.includes('user not found')) return 'USER_NOT_FOUND';
  if (message.includes('팔로우') || message.includes('follow')) return 'FOLLOW_FAILED';
  if (message.includes('network') || message.includes('timeout')) return 'NETWORK_ERROR';
  
  return 'UNKNOWN_ERROR';
};
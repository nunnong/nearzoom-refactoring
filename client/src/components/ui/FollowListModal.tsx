// src/components/ui/FollowListModal.tsx - 백엔드 연동 완료

'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import axios from 'axios';

// ============================================================================
// 백엔드 연동 설정
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 인증 토큰 인터셉터
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// 백엔드 연동 타입 정의 (백엔드 API 구조에 맞춤)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 UserProfileResponse와 정확히 일치 (FollowService에서 사용)
interface BackendUserProfileResponse {
  userId: number;
  accountName: string;    // 계정명 (ID 역할)
  userName: string;       // 실제 이름
  userEmail: string;      // 이메일
  profileImage?: string;  // 프로필 이미지
  prettyFace?: string;    // 예쁜 얼굴 이미지
}

// 프론트엔드에서 사용할 User 타입
interface User {
  id: string;              // accountName을 string ID로 사용
  userId: number;          // 실제 숫자 userId
  username: string;        // accountName
  displayName: string;     // userName
  email: string;          // userEmail
  profileImage?: string;   // profileImage
  prettyFaceUrl?: string;  // prettyFace
  isFollowing?: boolean;   // 팔로우 상태
  bio?: string;           // 임시 필드
}

interface FollowListModalProps {
  accountName: string;      // 🔥 변경: userId → accountName (백엔드 API가 accountName 기반)
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  currentUserAccountName?: string;   // 현재 로그인 사용자 accountName
}

// ============================================================================
// 백엔드 API 함수들 (FollowController 기반)
// ============================================================================

const followListAPI = {
  // 🔥 GET /follows/followers/{accountName} - 팔로워 목록 조회
  getFollowersByAccountName: async (accountName: string): Promise<BackendUserProfileResponse[]> => {
    try {
      const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
        `/follows/followers/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로워 목록을 가져올 수 없습니다.');
      }
      
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get followers:', error);
      throw error;
    }
  },

  // 🔥 GET /follows/following/{accountName} - 팔로잉 목록 조회
  getFollowingByAccountName: async (accountName: string): Promise<BackendUserProfileResponse[]> => {
    try {
      const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
        `/follows/following/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로잉 목록을 가져올 수 없습니다.');
      }
      
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get following:', error);
      throw error;
    }
  },

  // 🔥 POST /follows/{accountName} - 팔로우
  followByAccountName: async (accountName: string): Promise<void> => {
    try {
      const response = await api.post<ApiResponse<void>>(
        `/follows/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to follow user:', error);
      throw error;
    }
  },

  // 🔥 DELETE /follows/{accountName} - 언팔로우  
  unfollowByAccountName: async (accountName: string): Promise<void> => {
    try {
      const response = await api.delete<ApiResponse<void>>(
        `/follows/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '언팔로우에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to unfollow user:', error);
      throw error;
    }
  },

  // 🔥 GET /follows/check/{accountName} - 팔로우 상태 확인
  checkFollowStatusByAccountName: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(
        `/follows/check/${accountName}`
      );
      
      if (response.data.error) {
        return false;
      }
      
      return response.data.data || false;
    } catch (error) {
      console.warn('Failed to check follow status:', error);
      return false;
    }
  }
};

// ============================================================================
// FollowListModal 컴포넌트
// ============================================================================

const FollowListModal: React.FC<FollowListModalProps> = ({
  accountName,        // 🔥 변경: userId → accountName
  type,
  isOpen,
  onClose,
  currentUserAccountName
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingLoading, setFollowingLoading] = useState<Set<string>>(new Set());
  
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 백엔드 응답을 User 타입으로 변환
  const transformBackendUser = useCallback((backendUser: BackendUserProfileResponse): User => {
    return {
      id: backendUser.accountName,              // accountName을 고유 ID로 사용
      userId: backendUser.userId,               // 실제 숫자 userId
      username: backendUser.accountName,        // 계정명
      displayName: backendUser.userName,        // 실제 이름
      email: backendUser.userEmail,             // 이메일
      profileImage: backendUser.profileImage,   // 프로필 이미지
      prettyFaceUrl: backendUser.prettyFace,    // 예쁜 얼굴 이미지
      isFollowing: false,                       // 초기값, 별도로 조회 필요
      bio: `@${backendUser.accountName}`        // 간단한 bio
    };
  }, []);

  // ============================================================================
  // 백엔드 연동 - 팔로워/팔로잉 목록 로드
  // ============================================================================

  const loadUserList = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`=== ${type} 목록 로딩 시작 ===`, { accountName });

      // 🔥 백엔드 API 호출 (accountName 기반)
      let backendUsers: BackendUserProfileResponse[] = [];
      
      if (type === 'followers') {
        backendUsers = await followListAPI.getFollowersByAccountName(accountName);
      } else {
        backendUsers = await followListAPI.getFollowingByAccountName(accountName);
      }

      // 백엔드 응답을 User 타입으로 변환
      const transformedUsers = backendUsers.map(transformBackendUser);

      console.log(`✅ ${type} 목록 로딩 완료:`, {
        count: transformedUsers.length,
        users: transformedUsers.map(u => ({ accountName: u.username, name: u.displayName }))
      });

      // 🔥 각 사용자의 팔로우 상태 확인 (현재 로그인 사용자가 있는 경우만)
      if (currentUserAccountName && transformedUsers.length > 0 && isAuthenticated) {
        console.log('=== 팔로우 상태 확인 시작 ===');
        
        const followStatusPromises = transformedUsers.map(async (user) => {
          try {
            const isFollowing = await followListAPI.checkFollowStatusByAccountName(user.username);
            return { accountName: user.username, isFollowing };
          } catch (error) {
            console.warn(`Failed to check follow status for ${user.username}:`, error);
            return { accountName: user.username, isFollowing: false };
          }
        });

        const followStatuses = await Promise.all(followStatusPromises);
        
        // 팔로우 상태 업데이트
        const usersWithFollowStatus = transformedUsers.map(user => {
          const status = followStatuses.find(s => s.accountName === user.username);
          return {
            ...user,
            isFollowing: status?.isFollowing || false
          };
        });

        setUsers(usersWithFollowStatus);
        console.log('✅ 팔로우 상태 확인 완료');
      } else {
        setUsers(transformedUsers);
      }

    } catch (err) {
      console.error(`❌ ${type} 목록 로딩 실패:`, err);
      const errorMessage = err instanceof Error ? err.message : `${type} 목록을 불러오는데 실패했습니다.`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accountName, type, isOpen, currentUserAccountName, isAuthenticated, transformBackendUser]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    loadUserList();
  }, [loadUserList]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 사용자 클릭 시 해당 프로필로 이동
  const handleUserClick = useCallback((clickedUser: User) => {
    onClose(); // 모달 먼저 닫기
    
    // 🔥 accountName 기반 프로필 페이지로 이동
    router.push(`/feeds/users/account/${clickedUser.username}`);
  }, [onClose, router]);

  // 🔥 백엔드 연동 팔로우/언팔로우 토글
  const handleFollowToggle = useCallback(async (targetUser: User, isCurrentlyFollowing: boolean) => {
    if (!currentUserAccountName || !isAuthenticated) return;

    // 본인 팔로우 방지
    if (targetUser.username === currentUserAccountName) return;

    // 로딩 상태 설정
    setFollowingLoading(prev => new Set([...prev, targetUser.id]));

    try {
      console.log(`=== 팔로우 토글 시작 ===`, {
        targetAccountName: targetUser.username,
        isCurrentlyFollowing
      });

      // 🔥 백엔드 API 호출 (accountName 기반)
      if (isCurrentlyFollowing) {
        await followListAPI.unfollowByAccountName(targetUser.username);
      } else {
        await followListAPI.followByAccountName(targetUser.username);
      }

      // 성공 시 로컬 상태 업데이트
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === targetUser.id
            ? { ...user, isFollowing: !isCurrentlyFollowing }
            : user
        )
      );

      console.log(`✅ 팔로우 토글 성공:`, {
        targetAccountName: targetUser.username,
        newStatus: !isCurrentlyFollowing
      });

    } catch (err) {
      console.error('❌ 팔로우 상태 변경 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '팔로우 상태 변경에 실패했습니다.';
      setError(errorMessage);
      
      // 3초 후 에러 메시지 제거
      setTimeout(() => setError(null), 3000);
    } finally {
      // 로딩 상태 해제
      setFollowingLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUser.id);
        return newSet;
      });
    }
  }, [currentUserAccountName, isAuthenticated]);

  // 에러 클리어 및 재시도
  const handleRetry = useCallback(() => {
    setError(null);
    loadUserList();
  }, [loadUserList]);

  // ============================================================================
  // 렌더링 조건
  // ============================================================================

  if (!isOpen) return null;

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {type === 'followers' ? '팔로워' : '팔로잉'} {users.length > 0 && `(${users.length})`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="모달 닫기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">불러오는 중...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-red-500 mb-2 text-center px-4">{error}</div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <span>
                {type === 'followers' ? '팔로워가' : '팔로잉이'} 없습니다.
              </span>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {/* 프로필 이미지 */}
                  <div
                    className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0"
                    onClick={() => handleUserClick(user)}
                  >
                    {user.profileImage || user.prettyFaceUrl ? (
                      <img
                        src={user.profileImage || user.prettyFaceUrl}
                        alt={user.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                              ${user.displayName.charAt(0).toUpperCase()}
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 사용자 정보 */}
                  <div
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => handleUserClick(user)}
                  >
                    <div className="font-medium text-gray-900 truncate">
                      {user.displayName}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      @{user.username}
                    </div>
                    {user.email && (
                      <div className="text-xs text-gray-400 truncate">
                        {user.email}
                      </div>
                    )}
                  </div>

                  {/* 팔로우 버튼 (본인이 아니고, 로그인 상태인 경우만 표시) */}
                  {isAuthenticated && currentUserAccountName && user.username !== currentUserAccountName && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowToggle(user, user.isFollowing || false);
                      }}
                      disabled={followingLoading.has(user.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-50 flex-shrink-0 ${
                        user.isFollowing
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {followingLoading.has(user.id) ? (
                        <div className="flex items-center">
                          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1"></div>
                          처리중
                        </div>
                      ) : (
                        user.isFollowing ? '팔로잉' : '팔로우'
                      )}
                    </button>
                  )}

                  {/* 본인 표시 */}
                  {user.username === currentUserAccountName && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      나
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 - 백엔드 연동 정보 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-4 py-2 bg-blue-50 border-t text-xs text-blue-800">
            <div className="flex items-center justify-between">
              <span>✅ 백엔드 완전 연동 (accountName 기반)</span>
              <span>{users.length}명 표시</span>
            </div>
            <div className="mt-1 text-blue-600">
              대상: @{accountName} | 타입: {type}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowListModal;
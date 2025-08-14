'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios';

// ============================================================================
// 백엔드 연동 타입 정의
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// 백엔드 UserInfoResponse.java 기반
interface BackendUserInfoResponse {
  userName: string;        // 사용자 이름
  userEmail: string;       // 이메일
  profileImage?: string;   // 프로필 이미지
  prettyFace?: string;     // 예쁜 얼굴 이미지
}

// 프론트엔드에서 사용할 User 타입 (백엔드 응답 기반)
interface User {
  id: string;              // userEmail을 id로 사용
  username: string;        // userName
  displayName: string;     // userName
  email: string;          // userEmail
  profileImage?: string;   // profileImage
  prettyFaceUrl?: string;  // prettyFace
  isFollowing?: boolean;   // 팔로우 상태 (별도 조회 필요)
  bio?: string;           // 임시 필드 (현재 백엔드에 없음)
}

interface FollowListModalProps {
  userId: string;           // 대상 사용자 ID (숫자 문자열)
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;   // 현재 로그인 사용자 ID
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const followListAPI = {
  // GET /follows/followers/{userId} - 팔로워 목록 조회
  getFollowers: async (userId: number): Promise<BackendUserInfoResponse[]> => {
    const response = await api.get<ApiResponse<BackendUserInfoResponse[]>>(
      `/follows/followers/${userId}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
    
    return response.data.data;
  },

  // GET /follows/following/{userId} - 팔로잉 목록 조회
  getFollowing: async (userId: number): Promise<BackendUserInfoResponse[]> => {
    const response = await api.get<ApiResponse<BackendUserInfoResponse[]>>(
      `/follows/following/${userId}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
    
    return response.data.data;
  },

  // POST /follows/{followeeId} - 팔로우
  followUser: async (followeeId: number): Promise<void> => {
    const response = await api.post<ApiResponse<void>>(
      `/follows/${followeeId}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
  },

  // DELETE /follows/{followeeId} - 언팔로우  
  unfollowUser: async (followeeId: number): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(
      `/follows/${followeeId}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message);
    }
  },

  // GET /follows/check/{followeeId} - 팔로우 상태 확인
  checkFollowStatus: async (followeeId: number): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(
        `/follows/check/${followeeId}`
      );
      
      if (response.data.error) {
        return false;
      }
      
      return response.data.data;
    } catch (error) {
      console.warn('Failed to check follow status:', error);
      return false;
    }
  },

  // 이메일로 userId 찾기 (필요시 - 검색 API 활용)
  findUserIdByEmail: async (email: string): Promise<number | null> => {
    try {
      // 검색 API를 활용해서 이메일로 userId 찾기
      const response = await api.get<ApiResponse<any[]>>(
        `/feeds/search?query=${encodeURIComponent(email)}&size=1`
      );
      
      if (!response.data.error && response.data.data.length > 0) {
        return response.data.data[0].authorId;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to find userId by email:', error);
      return null;
    }
  },
};

// ============================================================================
// FollowListModal 컴포넌트
// ============================================================================

const FollowListModal: React.FC<FollowListModalProps> = ({
  userId,
  type,
  isOpen,
  onClose,
  currentUserId
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
  const transformBackendUser = useCallback((backendUser: BackendUserInfoResponse): User => {
    return {
      id: backendUser.userEmail,                    // 이메일을 고유 ID로 사용
      username: backendUser.userName,               // 사용자명
      displayName: backendUser.userName,            // 표시명
      email: backendUser.userEmail,                 // 이메일
      profileImage: backendUser.profileImage,       // 프로필 이미지
      prettyFaceUrl: backendUser.prettyFace,        // 예쁜 얼굴 이미지
      isFollowing: false,                           // 초기값, 별도로 조회 필요
      bio: `${backendUser.userName}님의 프로필`      // 임시 bio
    };
  }, []);

  // userId를 숫자로 변환
  const parseUserId = useCallback((userId: string): number => {
    const parsed = parseInt(userId, 10);
    if (isNaN(parsed)) {
      throw new Error('유효하지 않은 사용자 ID입니다.');
    }
    return parsed;
  }, []);

  // ============================================================================
  // 백엔드 연동 - 팔로워/팔로잉 목록 로드
  // ============================================================================

  const loadUserList = useCallback(async () => {
    if (!isOpen || !isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const numericUserId = parseUserId(userId);
      
      console.log(`=== ${type} 목록 로딩 시작 ===`, { userId: numericUserId });

      // 🔥 백엔드 API 호출
      let backendUsers: BackendUserInfoResponse[] = [];
      
      if (type === 'followers') {
        backendUsers = await followListAPI.getFollowers(numericUserId);
      } else {
        backendUsers = await followListAPI.getFollowing(numericUserId);
      }

      // 백엔드 응답을 User 타입으로 변환
      const transformedUsers = backendUsers.map(transformBackendUser);

      console.log(`=== ${type} 목록 로딩 완료 ===`, {
        count: transformedUsers.length,
        users: transformedUsers
      });

      // 🔥 각 사용자의 팔로우 상태 확인 (병렬 처리)
      if (currentUserId && transformedUsers.length > 0) {
        console.log('=== 팔로우 상태 확인 시작 ===');
        
        const followStatusPromises = transformedUsers.map(async (user) => {
          try {
            // 이메일로 userId 찾기
            const targetUserId = await followListAPI.findUserIdByEmail(user.email);
            if (targetUserId) {
              const isFollowing = await followListAPI.checkFollowStatus(targetUserId);
              return { userId: user.id, isFollowing };
            }
            return { userId: user.id, isFollowing: false };
          } catch (error) {
            console.warn(`Failed to check follow status for ${user.email}:`, error);
            return { userId: user.id, isFollowing: false };
          }
        });

        const followStatuses = await Promise.all(followStatusPromises);
        
        // 팔로우 상태 업데이트
        const usersWithFollowStatus = transformedUsers.map(user => {
          const status = followStatuses.find(s => s.userId === user.id);
          return {
            ...user,
            isFollowing: status?.isFollowing || false
          };
        });

        setUsers(usersWithFollowStatus);
        console.log('=== 팔로우 상태 확인 완료 ===');
      } else {
        setUsers(transformedUsers);
      }

    } catch (err) {
      console.error(`Failed to load ${type} list:`, err);
      const errorMessage = err instanceof Error ? err.message : `${type} 목록을 불러오는데 실패했습니다.`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, type, isOpen, isAuthenticated, currentUserId, parseUserId, transformBackendUser]);

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
  const handleUserClick = useCallback(async (clickedUser: User) => {
    onClose(); // 모달 먼저 닫기
    
    try {
      // 이메일로 userId 찾기
      const targetUserId = await followListAPI.findUserIdByEmail(clickedUser.email);
      if (targetUserId) {
        router.push(`/profile/${targetUserId}`); // userId 기반 프로필 페이지로 이동
      } else {
        console.warn('사용자 ID를 찾을 수 없습니다:', clickedUser.email);
        router.push(`/profile?email=${encodeURIComponent(clickedUser.email)}`); // 이메일 기반 fallback
      }
    } catch (error) {
      console.error('Failed to navigate to user profile:', error);
    }
  }, [onClose, router]);

  // 🔥 백엔드 연동 팔로우/언팔로우 토글
  const handleFollowToggle = useCallback(async (targetUser: User, isCurrentlyFollowing: boolean) => {
    if (!currentUserId || !isAuthenticated) return;

    // 로딩 상태 설정
    setFollowingLoading(prev => new Set([...prev, targetUser.id]));

    try {
      console.log(`=== 팔로우 토글 시작 ===`, {
        targetEmail: targetUser.email,
        isCurrentlyFollowing
      });

      // 이메일로 userId 찾기
      const targetUserId = await followListAPI.findUserIdByEmail(targetUser.email);
      if (!targetUserId) {
        throw new Error('대상 사용자 ID를 찾을 수 없습니다.');
      }

      // 🔥 백엔드 API 호출
      if (isCurrentlyFollowing) {
        await followListAPI.unfollowUser(targetUserId);
      } else {
        await followListAPI.followUser(targetUserId);
      }

      // 성공 시 로컬 상태 업데이트
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === targetUser.id
            ? { ...user, isFollowing: !isCurrentlyFollowing }
            : user
        )
      );

      console.log(`=== 팔로우 토글 성공 ===`, {
        targetUserId,
        newStatus: !isCurrentlyFollowing
      });

    } catch (err) {
      console.error('팔로우 상태 변경 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '팔로우 상태 변경에 실패했습니다.';
      setError(errorMessage);
    } finally {
      // 로딩 상태 해제
      setFollowingLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUser.id);
        return newSet;
      });
    }
  }, [currentUserId, isAuthenticated]);

  // 에러 클리어
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
            {type === 'followers' ? '팔로워' : '팔로잉'}
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
              <div className="text-red-500 mb-2">{error}</div>
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
                    {user.bio && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {user.bio}
                      </div>
                    )}
                  </div>

                  {/* 팔로우 버튼 (본인이 아닌 경우만 표시) */}
                  {isAuthenticated && currentUserId && user.email !== currentUserId && (
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔥 백엔드 연동 정보 */}
        <div className="px-4 py-2 bg-blue-50 border-t text-xs text-blue-800">
          <div className="flex items-center justify-between">
            <span>✅ 백엔드 완전 연동</span>
            <span>{users.length}명 표시</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
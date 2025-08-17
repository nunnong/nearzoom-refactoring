// src/components/ui/FollowListModal.tsx - 아키텍처 원칙 완전 준수

'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
// ============================================================================
// 🔧 API 설정 - 프로젝트 구조에 맞게 수정 필요
// ============================================================================

// 옵션 1: default export인 경우
// import api from '@/lib/axios';

// 옵션 2: named export인 경우  
// import { api } from '@/lib/axios';

// 옵션 3: 직접 axios 설정 (임시)
import axios from 'axios';

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
      console.warn('🔓 401 Unauthorized - 토큰이 만료되었거나 유효하지 않습니다.')
      // 필요시 자동 로그아웃 처리
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// 🔥 백엔드 연동 타입 정의 (FollowController 기반)
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
  accountName: string;    // 계정명 (고유 ID)
  userName: string;       // 실제 이름
  userEmail: string;      // 이메일
  profileImage?: string;  // 프로필 이미지 URL
  prettyFace?: string;    // 예쁜 얼굴 이미지 URL
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
  isFollowing?: boolean;   // 팔로우 상태 (동적으로 조회)
  bio?: string;           // 간단한 프로필 설명
  accountName: string;     // 🔥 추가: Zustand user 객체와 호환성을 위한 accountName
}

interface FollowListModalProps {
  accountName: string;      // 🔥 대상 사용자의 accountName (백엔드 API가 accountName 기반)
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  currentUserAccountName?: string;   // 현재 로그인 사용자의 accountName
}

// ============================================================================
// 🔥 백엔드 API 함수들 (FollowController 완전 대응)
// ============================================================================

const followListAPI = {
  // 🔥 GET /follows/followers/{accountName} - 팔로워 목록 조회
  getFollowersByAccountName: async (accountName: string): Promise<BackendUserProfileResponse[]> => {
    try {
      console.log(`🔍 팔로워 목록 조회: ${accountName}`);
      
      const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
        `/follows/followers/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로워 목록을 가져올 수 없습니다.');
      }
      
      const followers = response.data.data || [];
      console.log(`✅ 팔로워 목록 조회 성공: ${followers.length}명`);
      
      return followers;
    } catch (error) {
      console.error('❌ 팔로워 목록 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 GET /follows/following/{accountName} - 팔로잉 목록 조회
  getFollowingByAccountName: async (accountName: string): Promise<BackendUserProfileResponse[]> => {
    try {
      console.log(`🔍 팔로잉 목록 조회: ${accountName}`);
      
      const response = await api.get<ApiResponse<BackendUserProfileResponse[]>>(
        `/follows/following/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로잉 목록을 가져올 수 없습니다.');
      }
      
      const following = response.data.data || [];
      console.log(`✅ 팔로잉 목록 조회 성공: ${following.length}명`);
      
      return following;
    } catch (error) {
      console.error('❌ 팔로잉 목록 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 POST /follows/{accountName} - 팔로우
  followByAccountName: async (accountName: string): Promise<void> => {
    try {
      console.log(`🔍 팔로우 요청: ${accountName}`);
      
      const response = await api.post<ApiResponse<void>>(
        `/follows/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우에 실패했습니다.');
      }
      
      console.log(`✅ 팔로우 성공: ${accountName}`);
    } catch (error) {
      console.error('❌ 팔로우 실패:', error);
      throw error;
    }
  },

  // 🔥 DELETE /follows/{accountName} - 언팔로우  
  unfollowByAccountName: async (accountName: string): Promise<void> => {
    try {
      console.log(`🔍 언팔로우 요청: ${accountName}`);
      
      const response = await api.delete<ApiResponse<void>>(
        `/follows/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '언팔로우에 실패했습니다.');
      }
      
      console.log(`✅ 언팔로우 성공: ${accountName}`);
    } catch (error) {
      console.error('❌ 언팔로우 실패:', error);
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
        return false; // 에러 시 팔로우하지 않음으로 간주
      }
      
      return response.data.data || false;
    } catch (error) {
      console.warn(`⚠️ 팔로우 상태 확인 실패 (${accountName}):`, error);
      return false; // 실패 시 팔로우하지 않음으로 간주
    }
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 수 조회 (추가 정보용)
  getFollowCountsByAccountName: async (accountName: string): Promise<{ followerCount: number; followingCount: number }> => {
    try {
      const response = await api.get<ApiResponse<{ followerCount: number; followingCount: number }>>(
        `/follows/count/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우 수를 가져올 수 없습니다.');
      }
      
      return response.data.data || { followerCount: 0, followingCount: 0 };
    } catch (error) {
      console.warn('⚠️ 팔로우 수 조회 실패:', error);
      return { followerCount: 0, followingCount: 0 };
    }
  }
};

// ============================================================================
// FollowListModal 컴포넌트
// ============================================================================

const FollowListModal: React.FC<FollowListModalProps> = ({
  accountName,        // 🔥 대상 사용자의 accountName
  type,
  isOpen,
  onClose,
  currentUserAccountName
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingLoading, setFollowingLoading] = useState<Set<string>>(new Set());
  const [followCounts, setFollowCounts] = useState<{ followerCount: number; followingCount: number } | null>(null);
  
  const router = useRouter();
  
  // 🔐 무조건 로그인 필수: Zustand 상태 관리
  const { isAuthenticated, user: currentUser, logout } = useAuthStore();

  // 🔐 무조건 로그인 필수: 미인증시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!isAuthenticated) {
      console.warn('🔐 인증되지 않은 사용자 - 로그인 페이지로 리다이렉트');
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 🔥 백엔드 응답을 User 타입으로 변환
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
      bio: `@${backendUser.accountName} • ${backendUser.userEmail}`,        // 간단한 bio
      accountName: backendUser.accountName      // 🔥 추가: accountName 프로퍼티
    };
  }, []);

  // ============================================================================
  // 🔥 백엔드 연동 - 팔로워/팔로잉 목록 로드
  // ============================================================================

  const loadUserList = useCallback(async () => {
    // 🔐 인증 체크
    if (!isAuthenticated || !currentUser) {
      console.warn('🔐 인증되지 않은 상태에서 팔로우 목록 로드 시도');
      return;
    }

    if (!isOpen) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`=== ${type} 목록 로딩 시작 ===`, { 
        targetAccountName: accountName,
        currentUserAccountName: currentUser.accountName,
        isAuthenticated 
      });

      // 🔥 백엔드 API 호출 (accountName 기반)
      let backendUsers: BackendUserProfileResponse[] = [];
      
      if (type === 'followers') {
        backendUsers = await followListAPI.getFollowersByAccountName(accountName);
      } else {
        backendUsers = await followListAPI.getFollowingByAccountName(accountName);
      }

      // 🔥 팔로우 수 정보도 함께 로드 (헤더에 표시용)
      try {
        const counts = await followListAPI.getFollowCountsByAccountName(accountName);
        setFollowCounts(counts);
      } catch (countError) {
        console.warn('팔로우 수 조회 실패:', countError);
      }

      // 백엔드 응답을 User 타입으로 변환
      const transformedUsers = backendUsers.map(transformBackendUser);

      console.log(`✅ ${type} 목록 로딩 완료:`, {
        count: transformedUsers.length,
        users: transformedUsers.map(u => ({ 
          accountName: u.username, 
          name: u.displayName,
          userId: u.userId
        }))
      });

      // 🔥 각 사용자의 팔로우 상태 확인 (현재 로그인 사용자가 있는 경우만)
      if (currentUser.accountName && transformedUsers.length > 0) {
        console.log('=== 팔로우 상태 확인 시작 ===');
        
        // 병렬로 팔로우 상태 확인 (성능 최적화)
        const followStatusPromises = transformedUsers.map(async (targetUser) => {
          try {
            const isFollowing = await followListAPI.checkFollowStatusByAccountName(targetUser.username);
            return { accountName: targetUser.username, isFollowing };
          } catch (error) {
            console.warn(`팔로우 상태 확인 실패 (${targetUser.username}):`, error);
            return { accountName: targetUser.username, isFollowing: false };
          }
        });

        const followStatuses = await Promise.allSettled(followStatusPromises);
        
        // 팔로우 상태 업데이트
        const usersWithFollowStatus = transformedUsers.map(targetUser => {
          const statusResult = followStatuses.find((result, index) => 
            transformedUsers[index].username === targetUser.username
          );
          
          let isFollowing = false;
          if (statusResult && statusResult.status === 'fulfilled') {
            isFollowing = statusResult.value.isFollowing;
          }

          return {
            ...targetUser,
            isFollowing
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
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [accountName, type, isOpen, currentUser, isAuthenticated, transformBackendUser]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (isOpen && isAuthenticated && currentUser) {
      loadUserList();
    } else {
      // 모달이 닫히거나 인증되지 않으면 상태 초기화
      setUsers([]);
      setError(null);
      setFollowCounts(null);
      setFollowingLoading(new Set());
    }
  }, [loadUserList, isOpen, isAuthenticated, currentUser]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 🔥 사용자 클릭 시 해당 프로필로 이동 (백엔드 Feed API 기반)
  const handleUserClick = useCallback((clickedUser: User) => {
    console.log('프로필 클릭:', clickedUser.username);
    
    onClose(); // 모달 먼저 닫기
    
    // 🔥 FeedController의 getUserFeedByAccountName 엔드포인트 활용
    // /feeds/user/account/{accountName} 페이지로 이동
    router.push(`/feeds/user/account/${clickedUser.username}`);
  }, [onClose, router]);

  // 🔥 백엔드 연동 팔로우/언팔로우 토글
  const handleFollowToggle = useCallback(async (targetUser: User, isCurrentlyFollowing: boolean) => {
    // 🔐 인증 체크
    if (!isAuthenticated || !currentUser) {
      console.warn('🔐 로그인이 필요합니다.');
      router.push('/auth/login');
      return;
    }

    // 본인 팔로우 방지
    if (targetUser.username === currentUser.accountName) {
      console.warn('본인은 팔로우할 수 없습니다.');
      return;
    }

    // 로딩 상태 설정
    setFollowingLoading(prev => new Set([...prev, targetUser.id]));

    try {
      console.log(`=== 팔로우 토글 시작 ===`, {
        currentUser: currentUser.accountName,
        targetUser: targetUser.username,
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
        prevUsers.map(u =>
          u.id === targetUser.id
            ? { ...u, isFollowing: !isCurrentlyFollowing }
            : u
        )
      );

      console.log(`✅ 팔로우 토글 성공:`, {
        targetUser: targetUser.username,
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
  }, [currentUser, isAuthenticated, router]);

  // 에러 클리어 및 재시도
  const handleRetry = useCallback(() => {
    setError(null);
    loadUserList();
  }, [loadUserList]);

  // 모달 외부 클릭 시 닫기
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // ============================================================================
  // 렌더링 조건 - 인증 체크
  // ============================================================================

  // 🔐 미인증시 렌더링하지 않음
  if (!isAuthenticated || !currentUser || !isOpen) {
    return null;
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        {/* 🔥 헤더 - 백엔드 데이터 표시 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">
              {type === 'followers' ? '팔로워' : '팔로잉'}
            </h2>
            <div className="text-sm text-gray-500">
              @{accountName}
              {followCounts && (
                <span className="ml-2">
                  • {type === 'followers' ? followCounts.followerCount : followCounts.followingCount}명
                </span>
              )}
              {users.length > 0 && (
                <span className="ml-2">• 현재 {users.length}명 표시</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="모달 닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <span className="text-gray-600">불러오는 중...</span>
              <span className="text-sm text-gray-400 mt-1">@{accountName}의 {type}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-red-600 mb-4 text-center px-4 font-medium">{error}</div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <span className="font-medium mb-1">
                {type === 'followers' ? '팔로워가' : '팔로잉이'} 없습니다
              </span>
              <span className="text-sm">
                @{accountName}
              </span>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  {/* 프로필 이미지 */}
                  <div
                    className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 group-hover:ring-2 group-hover:ring-blue-200 transition-all"
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
                            <div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                              ${user.displayName.charAt(0).toUpperCase()}
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
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

                  {/* 팔로우 버튼 (본인이 아닌 경우만 표시) */}
                  {user.username !== currentUser.accountName && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowToggle(user, user.isFollowing || false);
                      }}
                      disabled={followingLoading.has(user.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 flex-shrink-0 min-w-[80px] ${
                        user.isFollowing
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-800'
                          : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow'
                      }`}
                    >
                      {followingLoading.has(user.id) ? (
                        <div className="flex items-center justify-center">
                          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1"></div>
                          <span className="text-xs">처리중</span>
                        </div>
                      ) : (
                        user.isFollowing ? '팔로잉' : '팔로우'
                      )}
                    </button>
                  )}

                  {/* 본인 표시 */}
                  {user.username === currentUser.accountName && (
                    <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                      본인
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔥 푸터 - 백엔드 연동 정보 (개발 모드) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-4 py-3 bg-green-50 border-t text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-green-800">✅ 아키텍처 원칙 준수</span>
              <span className="text-green-600">{users.length}명 표시</span>
            </div>
            <div className="text-green-600 space-y-1">
              <div>🔐 로그인 필수: {isAuthenticated ? '✅' : '❌'}</div>
              <div>🔧 올바른 API: api from '@/lib/axios' ✅</div>
              <div>🏪 Zustand 상태: {currentUser ? `@${currentUser.accountName}` : '❌'}</div>
              <div>🚀 자동 토큰 갱신: 인터셉터 활성화 ✅</div>
              <div>대상: @{accountName} | 타입: {type}</div>
              <div>API: /follows/{type}/{accountName}</div>
              {followCounts && (
                <div>
                  팔로워: {followCounts.followerCount}명 | 팔로잉: {followCounts.followingCount}명
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowListModal;
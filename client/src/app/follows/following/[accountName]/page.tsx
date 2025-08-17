// src/app/follows/following/[accountName]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeftIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/authStore';

// 🔧 올바른 API import
import api from '@/lib/axios';

// 타입 정의
interface BackendUserProfileResponse {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
}

interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', text }: { 
  size?: 'sm' | 'md' | 'lg'; 
  text?: string;
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

// FollowButton 컴포넌트
const FollowButton = ({ 
  accountName, 
  isFollowing, 
  onToggle, 
  loading 
}: {
  accountName: string;
  isFollowing: boolean;
  onToggle: () => void;
  loading: boolean;
}) => {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {loading ? '처리 중...' : isFollowing ? '언팔로우' : '팔로우'}
    </button>
  );
};

// API 함수들
const followingAPI = {
  // 팔로잉 목록 조회
  getFollowing: async (accountName: string): Promise<BackendUserProfileResponse[]> => {
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

  // 팔로우
  followUser: async (accountName: string): Promise<void> => {
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

  // 언팔로우
  unfollowUser: async (accountName: string): Promise<void> => {
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

  // 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(
        `/follows/check/${accountName}`
      );
      
      if (response.data.error) {
        return false;
      }
      
      return response.data.data || false;
    } catch (error) {
      console.warn(`⚠️ 팔로우 상태 확인 실패 (${accountName}):`, error);
      return false;
    }
  },

  // 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<{ followerCount: number; followingCount: number }> => {
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

export default function FollowingPage() {
  const router = useRouter();
  const params = useParams();
  
  // accountName이 배열일 수 있으므로 안전하게 처리
  const accountName = Array.isArray(params.accountName) 
    ? params.accountName[0] 
    : params.accountName;
  
  const { user, isAuthenticated } = useAuthStore();
  
  const [following, setFollowing] = useState<BackendUserProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  // accountName이 없으면 에러 처리
  if (!accountName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">잘못된 접근입니다</h2>
          <p className="text-gray-500 mb-6">올바른 사용자 계정명이 필요합니다.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  // 팔로잉 목록 로드
  const loadFollowing = async () => {
    if (!accountName) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 팔로잉 목록 로드:', accountName);
      
      // 팔로잉 목록과 팔로우 수를 병렬로 조회
      const [followingList, followCounts] = await Promise.allSettled([
        followingAPI.getFollowing(accountName),
        followingAPI.getFollowCounts(accountName)
      ]);
      
      if (followingList.status === 'fulfilled') {
        setFollowing(followingList.value);
        
        // 각 사용자의 팔로우 상태 확인 (현재 로그인한 사용자가 있는 경우)
        if (isAuthenticated && user && followingList.value.length > 0) {
          const followStatusPromises = followingList.value.map(async (followingUser) => {
            try {
              const isFollowing = await followingAPI.checkFollowStatus(followingUser.accountName);
              return { accountName: followingUser.accountName, isFollowing };
            } catch (error) {
              console.warn(`팔로우 상태 확인 실패 (${followingUser.accountName}):`, error);
              return { accountName: followingUser.accountName, isFollowing: false };
            }
          });

          const followStatuses = await Promise.allSettled(followStatusPromises);
          
          // 팔로우 상태를 사용자 객체에 추가
          const followingWithStatus = followingList.value.map(followingUser => {
            const statusResult = followStatuses.find((result, index) => 
              followingList.value[index].accountName === followingUser.accountName
            );
            
            let isFollowing = false;
            if (statusResult && statusResult.status === 'fulfilled') {
              isFollowing = statusResult.value.isFollowing;
            }

            return {
              ...followingUser,
              isFollowing
            };
          });

          setFollowing(followingWithStatus);
        }
      } else {
        throw new Error('팔로잉 목록을 불러오는데 실패했습니다.');
      }

      if (followCounts.status === 'fulfilled') {
        setTotalCount(followCounts.value.followingCount);
      } else {
        setTotalCount(followingList.status === 'fulfilled' ? followingList.value.length : 0);
      }

      console.log('✅ 팔로잉 목록 로드 완료:', followingList.status === 'fulfilled' ? followingList.value.length : 0);

    } catch (error: any) {
      console.error('❌ 팔로잉 목록 로드 실패:', error);
      
      let errorMessage = '팔로잉 목록을 불러오는데 실패했습니다.';
      
      if (error?.message?.includes('401')) {
        errorMessage = '로그인이 필요합니다.';
        router.push('/login');
        return;
      } else if (error?.message?.includes('404')) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    if (accountName && isAuthenticated) {
      loadFollowing();
    }
  }, [accountName, isAuthenticated]);

  // 팔로우 토글 처리
  const handleFollowToggle = async (followingAccountName: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // 현재 팔로우 상태 확인
    const currentUser = following.find(u => u.accountName === followingAccountName);
    const isCurrentlyFollowing = (currentUser as any)?.isFollowing || false;

    // 로딩 상태 설정
    setLoadingUsers(prev => new Set([...prev, followingAccountName]));

    try {
      if (isCurrentlyFollowing) {
        await followingAPI.unfollowUser(followingAccountName);
      } else {
        await followingAPI.followUser(followingAccountName);
      }
      
      // 팔로잉 목록의 상태 업데이트
      setFollowing(prev => 
        prev.map(followingUser => 
          followingUser.accountName === followingAccountName 
            ? { ...followingUser, isFollowing: !isCurrentlyFollowing }
            : followingUser
        )
      );
      
    } catch (error: any) {
      console.error('팔로우 토글 실패:', error);
      setError(error?.message || '팔로우 처리에 실패했습니다.');
    } finally {
      // 로딩 상태 해제
      setLoadingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(followingAccountName);
        return newSet;
      });
    }
  };

  // 프로필로 이동
  const handleProfileClick = (accountName: string) => {
    router.push(`/profile/${accountName}`);
  };

  // 렌더링
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">팔로잉 목록을 보려면 로그인해 주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="lg" 
          text="팔로잉 목록을 불러오는 중..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={loadFollowing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.back()}
              className="w-full px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              뒤로 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">팔로잉</h1>
                <p className="text-sm text-gray-500">@{accountName}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              총 {totalCount}명
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!following || following.length === 0 ? (
          <div className="text-center py-20">
            <UserIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              아직 팔로잉하는 사용자가 없습니다
            </h3>
            <p className="text-gray-500">
              @{accountName}님이 팔로우하는 사용자가 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {following.map((followingUser) => (
              <div
                key={followingUser.userId}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleProfileClick(followingUser.accountName)}
                    className="flex items-center space-x-3 flex-1 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <img
                      src={followingUser.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(followingUser.userName)}&size=48&background=random`}
                      alt={followingUser.userName}
                      className="h-12 w-12 rounded-full ring-2 ring-gray-100"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(followingUser.userName)}&size=48&background=random`;
                      }}
                    />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{followingUser.userName}</p>
                      <p className="text-sm text-gray-500">@{followingUser.accountName}</p>
                    </div>
                  </button>

                  {/* 팔로우 버튼 (자신이 아닌 경우만) */}
                  {user && followingUser.accountName !== (user as any)?.accountName && (
                    <FollowButton
                      accountName={followingUser.accountName}
                      isFollowing={(followingUser as any)?.isFollowing || false}
                      onToggle={() => handleFollowToggle(followingUser.accountName)}
                      loading={loadingUsers.has(followingUser.accountName)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
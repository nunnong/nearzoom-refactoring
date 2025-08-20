// =============================================================================
// /components/page/profile/UserProfile.tsx - 문법 오류 수정된 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { useRouter } from 'next/navigation'
import {
  LockClosedIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HeartIcon,
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// 올바른 아키텍처: api from '@/lib/axios' 사용
import api from '@/lib/axios'

// 올바른 아키텍처: Zustand 토큰 스토어
import { useAuthStore } from '@/stores/authStore'

// ============================================================================
// 백엔드 API 응답 타입 정의 (실제 백엔드와 일치)
// ============================================================================

interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 실제 백엔드 UserProfileResponse 타입
interface UserProfileResponse {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  userProfileImage: string | null;
  faceImageUrl: string | null;
}

//  실제 백엔드 PostResponse 타입
interface PostResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string | null;
  displayOrder: number | null;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
}

//  실제 백엔드 FollowCountsResponse 타입
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// PostListResponse 타입
interface PostListResponse {
  posts: PostResponse[];
  hasNext: boolean;
  nextCursor: number | null;
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

const safeGetFirstChar = (str: string | null | undefined, fallback: string = 'U'): string => {
  if (!str || typeof str !== 'string' || str.trim().length === 0) {
    return fallback.toUpperCase();
  }
  return str.trim().charAt(0).toUpperCase();
};

// ============================================================================
// 🔥 수정된 백엔드 API 함수들 (완전한 객체)
// ============================================================================

const userProfileAPI = {
  // 🔥 GET /user/my - 내 프로필 조회
  getMyProfile: async (): Promise<UserProfileResponse> => {
    console.log(`🔍 API 요청: GET /user/my`);
    
    try {
      const response = await api.get<ApiResponse<UserProfileResponse>>('/user/my');
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '내 프로필을 불러올 수 없습니다.');
      }
      
      console.log('✅ 내 프로필 조회 성공:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('❌ 내 프로필 조회 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      } else if (error.response?.status === 500) {
        throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
      
      throw new Error(error.response?.data?.message || '내 프로필을 불러올 수 없습니다.');
    }
  },

  // 🔥 GET /user/profile/{accountName} - 사용자 프로필 조회
  getUserByAccountName: async (accountName: string): Promise<UserProfileResponse> => {
    console.log(`🔍 API 요청: GET /user/profile/${accountName}`);
    
    try {
      const response = await api.get<ApiResponse<UserProfileResponse>>(
        `/user/profile/${accountName}`
      );
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '사용자 프로필을 불러올 수 없습니다.');
      }
      
      return response.data.data;
      
    } catch (error: any) {
      
      if (error.response?.status === 404) {
        throw new Error('사용자를 찾을 수 없습니다.');
      } else if (error.response?.status === 500) {
        throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
      
      throw new Error(error.response?.data?.message || '사용자 프로필을 불러올 수 없습니다.');
    }
  },

  // 🔥 사용자 게시물 조회 - Explore에서 필터링
  getUserPosts: async (accountName: string, limit: number = 20): Promise<PostResponse[]> => {
    
    try {
      const response = await api.get<ApiResponse<{ posts: PostResponse[], hasNext: boolean, nextCursor: number | null }>>('/feeds/explore', {
        params: { limit: limit * 3 }
      });
      
      if (response.data.error || !response.data.data) {
        console.warn('게시물 조회 실패, 빈 배열 반환');
        return [];
      }
      
      const userPosts = response.data.data.posts.filter(
        post => post.authorAccountName === accountName
      );
      
      const limitedPosts = userPosts.slice(0, limit);
      
      console.log(`✅ ${accountName}의 게시물 조회 성공: ${limitedPosts.length}개`);
      return limitedPosts;
      
    } catch (error: any) {
      console.error('❌ 사용자 게시물 조회 실패:', error);
      console.warn('게시물 조회에 실패했지만 빈 배열을 반환합니다.');
      return [];
    }
  },

  // 🔥 사용자 게시물 수 조회 - 간단한 카운트만
  getPostCount: async (accountName: string): Promise<number> => {
    console.log(`🔍 게시물 수 조회: ${accountName}`);
    
    try {
      // 더 많은 게시물을 가져와서 정확한 카운트
      const response = await api.get<ApiResponse<{ posts: PostResponse[], hasNext: boolean, nextCursor: number | null }>>('/feeds/explore', {
        params: { limit: 1000 } // 더 많은 게시물을 가져와서 정확한 카운트
      });
      
      if (response.data.error || !response.data.data) {
        console.warn('게시물 수 조회 실패, 기본값 0 반환');
        return 0;
      }
      
      console.log('📊 API 응답 데이터:', response.data.data);
      console.log('📝 전체 게시물 수:', response.data.data.posts.length);
      
      // 각 게시물의 authorAccountName 확인
      response.data.data.posts.forEach((post, index) => {
        console.log(`게시물 ${index + 1}:`, {
          postId: post.postId,
          authorAccountName: post.authorAccountName,
          caption: post.caption?.substring(0, 30) + '...'
        });
      });
      
      const userPostCount = response.data.data.posts.filter(
        post => post.authorAccountName === accountName
      ).length;
      
      console.log(`✅ ${accountName}의 게시물 수: ${userPostCount}개 (전체 ${response.data.data.posts.length}개 중)`);
      return userPostCount;
      
    } catch (error: any) {
      console.error('❌ 게시물 수 조회 실패:', error);
      console.warn('게시물 수 조회에 실패했지만 기본값 0을 반환합니다.');
      return 0;
    }
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 통계 조회
  getFollowStats: async (accountName: string): Promise<FollowCountsResponse> => {
    console.log(`🔍 팔로우 통계 조회 시도: ${accountName}`);
    
    // 여러 가능한 엔드포인트를 시도
    const endpoints = [
      `/follows/count/${accountName}`,
      `/user/my/follows/count`,
      `/follows/my/count`,
      `/user/${accountName}/follows/count`
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 시도 중: GET ${endpoint}`);
        
        const response = await api.get<ApiResponse<FollowCountsResponse>>(endpoint);
        
        if (response.data.error || !response.data.data) {
          console.warn(`${endpoint} 응답 오류, 다음 엔드포인트 시도`);
          continue;
        }
        
        console.log(`✅ 팔로우 통계 조회 성공 (${endpoint}):`, response.data.data);
        return response.data.data;
        
      } catch (error: any) {
        console.warn(`❌ ${endpoint} 실패:`, error.response?.status, error.response?.data?.message || error.message);
        
        // 404가 아닌 다른 오류는 다음 엔드포인트 시도
        if (error.response?.status !== 404) {
          continue;
        }
      }
    }
    
    // 모든 엔드포인트가 실패한 경우 기본값 반환
    console.warn('⚠️ 모든 팔로우 통계 엔드포인트 실패, 기본값 0 반환');
    return { followerCount: 0, followingCount: 0 };
  },

  // 🔥 팔로우/언팔로우 토글
  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    console.log(`🔍 ${isCurrentlyFollowing ? '언팔로우' : '팔로우'}: ${accountName}`);
    
    try {
      if (isCurrentlyFollowing) {
        await api.delete<ApiResponse<void>>(`/follows/${accountName}`);
      } else {
        await api.post<ApiResponse<void>>(`/follows/${accountName}`);
      }
      
      console.log(`✅ ${isCurrentlyFollowing ? '언팔로우' : '팔로우'} 성공`);
      
    } catch (error: any) {
      console.error('❌ 팔로우 처리 실패:', error);
      throw new Error(error.response?.data?.message || '팔로우 처리에 실패했습니다.');
    }
  },

  // 🔥 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(`/follows/check/${accountName}`);
      
      if (response.data.error) {
        return false;
      }
      
      return response.data.data || false;
      
    } catch (error: any) {
      console.error('❌ 팔로우 상태 확인 실패:', error);
      return false;
    }
  },

  // 🔥 POST /follows/{accountName} - 팔로우
  followUser: async (accountName: string): Promise<void> => {
    console.log(`🔍 팔로우: ${accountName}`);
    await api.post<ApiResponse<void>>(`/follows/${accountName}`);
  },

  // 🔥 DELETE /follows/{accountName} - 언팔로우
  unfollowUser: async (accountName: string): Promise<void> => {
    console.log(`🔍 언팔로우: ${accountName}`);
    await api.delete<ApiResponse<void>>(`/follows/${accountName}`);
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 게시물 좋아요 토글
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    console.log(`🔍 좋아요 ${isCurrentlyLiked ? '취소' : '추가'}: postId=${postId}`);
    
    try {
      if (isCurrentlyLiked) {
        await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`);
      } else {
        await api.post<ApiResponse<void>>(`/likes/posts/${postId}`);
      }
      
      console.log(`✅ 좋아요 ${isCurrentlyLiked ? '취소' : '추가'} 성공`);
    } catch (error: any) {
      console.error('❌ 좋아요 처리 실패:', error);
      throw error;
    }
  }
};

// ============================================================================
// LoadingSpinner 컴포넌트
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg className={`animate-spin ${sizeClasses[size]} text-blue-600`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
};

// ============================================================================
// UserProfile 컴포넌트
// ============================================================================

interface UserProfileProps {
  params: { accountName: string };
  className?: string;
  postsPerPage?: number;
  enableAutoLoad?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({
  params,
  className = '',
  postsPerPage = 12
}) => {
  const router = useRouter();
  const { accountName } = params;

  const {
    isAuthenticated,
    isLoading: authLoading,
    accessToken,
    logout
  } = useAuthStore();

  // 상태 관리
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [followStats, setFollowStats] = useState<FollowCountsResponse>({ 
    followerCount: 0, 
    followingCount: 0 
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 유틸리티 함수들
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    let errorMessage = '알 수 없는 오류가 발생했습니다.';

    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('로그인이 필요')) {
        errorMessage = '로그인이 필요합니다.';
        logout();
        router.replace('/login');
        return;
      } else if (err.message.includes('404') || err.message.includes('찾을 수 없습니다')) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else {
        errorMessage = err.message;
      }
    }

    setError(errorMessage);
    showToast(errorMessage, 'error');
  }, [logout, router, showToast]);

  // 프로필 데이터 로드
  const loadUserProfile = useCallback(async () => {
    if (!isAuthenticated || !accessToken || authLoading || !accountName) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      const userInfo = await userProfileAPI.getUserByAccountName(accountName);
      setUserProfile(userInfo);

      const [statsResult, followStatusResult, postsResult] = await Promise.allSettled([
        userProfileAPI.getFollowStats(accountName),
        userProfileAPI.checkFollowStatus(accountName),
        userProfileAPI.getUserPosts(accountName, postsPerPage)
      ]);

      if (statsResult.status === 'fulfilled') {
        setFollowStats(statsResult.value);
      }

      if (followStatusResult.status === 'fulfilled') {
        setIsFollowing(followStatusResult.value);
      }

      if (postsResult.status === 'fulfilled') {
        setPosts(postsResult.value);
      }


    } catch (err: any) {
      console.error(`❌ ${accountName}의 프로필 로드 실패:`, err);
      handleError(err, '프로필 로드');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken, authLoading, accountName, handleError, postsPerPage]);

  // 이벤트 핸들러들
  const handleFollowToggle = useCallback(async () => {
    if (!isAuthenticated || !accessToken || !userProfile) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    setIsFollowLoading(true);
    const originalFollowState = isFollowing;
    const originalFollowerCount = followStats.followerCount;

    try {
      setIsFollowing(!originalFollowState);
      setFollowStats(prev => ({
        ...prev,
        followerCount: Math.max(0, originalFollowerCount + (originalFollowState ? -1 : 1))
      }));

      if (originalFollowState) {
        await userProfileAPI.unfollowUser(userProfile.accountName);
        showToast('팔로우를 취소했습니다.');
      } else {
        await userProfileAPI.followUser(userProfile.accountName);
        showToast('팔로우했습니다!');
      }

    } catch (error: any) {
      setIsFollowing(originalFollowState);
      setFollowStats(prev => ({ ...prev, followerCount: originalFollowerCount }));
      handleError(error, '팔로우 토글');
    } finally {
      setIsFollowLoading(false);
    }
  }, [isAuthenticated, accessToken, userProfile, isFollowing, followStats.followerCount, showToast, handleError]);

  const handlePostLike = useCallback(async (post: PostResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated || !accessToken) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    const originalLiked = post.isLikedByMe;
    const originalCount = post.likeCount;

    try {
      const newLiked = !originalLiked;
      const newCount = Math.max(0, originalCount + (newLiked ? 1 : -1));

      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.postId === post.postId 
            ? { ...p, isLikedByMe: newLiked, likeCount: newCount }
            : p
        )
      );

      await userProfileAPI.togglePostLike(post.postId, originalLiked);
      showToast(newLiked ? '좋아요를 눌렀습니다!' : '좋아요를 취소했습니다!');

    } catch (error: any) {
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.postId === post.postId 
            ? { ...p, isLikedByMe: originalLiked, likeCount: originalCount }
            : p
        )
      );
      handleError(error, '좋아요 토글');
    }
  }, [isAuthenticated, accessToken, showToast, handleError]);

  const handlePostClick = useCallback((post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`);
  }, [router]);

  const handleViewFollowers = useCallback(() => {
    if (userProfile?.accountName) {
      router.push(`/follows/followers/${encodeURIComponent(userProfile.accountName)}`);
    }
  }, [router, userProfile]);

  const handleViewFollowing = useCallback(() => {
    if (userProfile?.accountName) {
      router.push(`/follows/following/${encodeURIComponent(userProfile.accountName)}`);
    }
  }, [router, userProfile]);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    setIsRefreshing(true);
    try {
      await loadUserProfile();
      showToast('프로필이 새로고침되었습니다!');
    } catch (err: any) {
      handleError(err, '프로필 새로고침');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadUserProfile, showToast, handleError, isAuthenticated, accessToken]);

  const handleRetry = useCallback(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // 초기 로드
  useEffect(() => {
    if (isAuthenticated && !authLoading && accountName) {
      loadUserProfile();
    }
  }, [loadUserProfile, isAuthenticated, authLoading, accountName]);

  // 렌더링 조건부 분기
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center p-8">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <LockClosedIcon className="h-10 w-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">로그인이 필요합니다</h2>
        <p className="text-gray-600 mb-6 max-w-md">사용자 프로필을 보시려면 먼저 로그인해주세요.</p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">{accountName}님의 프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">오류가 발생했습니다</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">사용자를 찾을 수 없습니다</h3>
          <p className="text-gray-500 mt-2">다시 시도해주세요.</p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* 프로필 헤더 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            {/* 프로필 이미지 */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
              {userProfile.userProfileImage ? (
                <img
                  src={userProfile.userProfileImage}
                  alt={userProfile.userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {safeGetFirstChar(userProfile.userName)}
                </span>
              )}
            </div>

            {/* 기본 정보 */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{userProfile.userName}</h1>
              <p className="text-gray-600 mb-1">@{userProfile.accountName}</p>
              <p className="text-sm text-gray-500">{userProfile.userEmail}</p>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                isFollowing
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isFollowLoading ? (
                <LoadingSpinner size="sm" />
              ) : isFollowing ? (
                <>
                  <UserMinusIcon className="h-4 w-4" />
                  <span>팔로잉</span>
                </>
              ) : (
                <>
                  <UserPlusIcon className="h-4 w-4" />
                  <span>팔로우</span>
                </>
              )}
            </button>
            <button
              onClick={refreshProfile}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 통계 정보 */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center pt-6 border-t border-gray-200">
          <div>
            <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
            <div className="text-sm text-gray-500">게시물</div>
          </div>
          <button
            onClick={handleViewFollowers}
            className="hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="text-2xl font-bold text-gray-900">{followStats.followerCount}</div>
            <div className="text-sm text-gray-500">팔로워</div>
          </button>
          <button
            onClick={handleViewFollowing}
            className="hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="text-2xl font-bold text-gray-900">{followStats.followingCount}</div>
            <div className="text-sm text-gray-500">팔로잉</div>
          </button>
        </div>
      </div>

      {/* 게시물 그리드 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{userProfile.userName}님의 게시물</h2>
          <span className="text-sm text-gray-500">{posts.length}개</span>
        </div>

        {posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {posts.map((post) => (
              <div 
                key={post.postId} 
                className="aspect-square relative group cursor-pointer"
                onClick={() => handlePostClick(post)}
              >
                <img
                  src={post.imgUrl}
                  alt={post.caption || '게시물'}
                  className="w-full h-full object-cover rounded-lg"
                />
                
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="flex items-center space-x-4 text-white">
                    <div className="flex items-center space-x-1">
                      <HeartIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">{post.likeCount}</span>
                    </div>
                    <button
                      onClick={(e) => handlePostLike(post, e)}
                      className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                    >
                      {post.isLikedByMe ? (
                        <HeartSolidIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <HeartIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {post.caption && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded truncate">
                      {post.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
            <p className="text-gray-500">@{userProfile.accountName}님이 게시물을 올리면 여기에 표시됩니다.</p>
          </div>
        )}
      </div>

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg ${
            toastMessage.type === 'success' 
              ? 'bg-green-500 text-white' 
              : toastMessage.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
          }`}>
            <p className="text-sm font-medium">{toastMessage.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default UserProfile;

// API 함수와 타입들도 export
export { userProfileAPI };
export type {
  UserProfileResponse,
  PostResponse,
  FollowCountsResponse,
  PostListResponse,
  ApiResponse
};
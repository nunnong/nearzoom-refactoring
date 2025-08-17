// =============================================================================
// 📁 UserProfile.tsx - 완전히 수정된 버전 (올바른 백엔드 API 엔드포인트)
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { JSX } from 'react'
import { useRouter } from 'next/navigation'
import {
  LockClosedIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  HeartIcon,
  EyeIcon,
  UsersIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// 🔥 올바른 아키텍처: api from '@/lib/axios' 사용 (인터셉터 + Zustand 토큰 + 자동 갱신)
import api from '@/lib/axios'

// 🔥 올바른 아키텍처: Zustand 토큰 스토어 (로그인 상태 관리)
import { useAuthStore } from '@/stores/authStore'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 완전 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 PostResponse.java 기반 (백엔드와 100% 일치)
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

// 🔥 백엔드 UserProfileResponse.java와 정확히 일치하는 타입
interface UserProfileResponse {
  // 사용자 기본 정보
  userId: number;
  accountName: string;
  name: string;
  email: string;
  profileImage: string | null;
  
  // 팔로우 관련 정보
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  
  // 게시물 관련 정보 (있다면)
  posts?: PostResponse[];
  totalLikes?: number;
  hasMorePosts?: boolean;
  nextPostCursor?: number | null;
}

// 프론트엔드 통합 UserProfile 타입
interface UserProfile {
  id: number;
  accountName: string;
  name: string;
  email: string;
  profileImage?: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  totalLikes: number;
  posts: PostResponse[];
  hasMorePosts: boolean;
  nextPostCursor: number | null;
  isLoadingMore: boolean;
}

interface UserProfileProps {
  // 🔥 동적 라우트에서 받는 props
  params?: {
    accountName?: string;
  };
  // 🔥 직접 전달받는 props (기존 호환성)
  userId?: number;
  accountName?: string;
  initialData?: UserProfile;
  onProfileUpdate?: (profile: UserProfile) => void;
  className?: string;
  postsPerPage?: number;
  enableAutoLoad?: boolean;
}

// ============================================================================
// 🔥 올바른 백엔드 API 함수들 (UserController.java와 완전 일치)
// ============================================================================

const profileAPI = {
  // 🔥 GET /user/profile/{accountName} - 백엔드 UserController와 완전 일치
  getUserProfile: async (accountName: string): Promise<UserProfileResponse> => {
    if (!accountName || typeof accountName !== 'string' || accountName.trim().length === 0) {
      throw new Error('유효하지 않은 계정명입니다.');
    }

    const cleanAccountName = accountName.trim();
    console.log('🔥 API 요청 - GET /user/profile/' + cleanAccountName);

    try {
      const response = await api.get<ApiResponse<UserProfileResponse>>(
        `/user/profile/${encodeURIComponent(cleanAccountName)}`,
        { timeout: 10000 }
      );

      console.log('🔥 사용자 프로필 Raw 응답:', response);
      
      if (!response) {
        throw new Error('서버 응답이 없습니다.');
      }

      if (!response.data) {
        throw new Error('응답 데이터가 없습니다.');
      }

      if (response.data.error === true) {
        const errorMessage = response.data.message || '사용자 프로필을 불러올 수 없습니다.';
        throw new Error(errorMessage);
      }

      if (!response.data.data) {
        throw new Error('사용자 프로필 데이터가 없습니다.');
      }

      const userData = response.data.data;

      // 필수 필드 검증
      if (!userData.userId && userData.userId !== 0) {
        throw new Error('사용자 ID가 없습니다.');
      }

      if (!userData.accountName) {
        throw new Error('계정명이 없습니다.');
      }

      console.log('🔥 API 응답 - 사용자 프로필 성공:', userData);
      return userData;

    } catch (error: any) {
      console.error('🚨 사용자 프로필 API 실패:', error);

      if (!error.response) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.');
        }
        if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
          throw new Error('네트워크 연결을 확인해주세요.');
        }
        throw new Error('서버와 연결할 수 없습니다.');
      }

      const status = error.response.status;
      const responseData = error.response.data;

      switch (status) {
        case 400:
          throw new Error('잘못된 요청입니다. 계정명을 확인해주세요.');
        case 401:
          throw new Error('로그인이 필요합니다.');
        case 403:
          throw new Error('이 사용자의 정보를 볼 권한이 없습니다.');
        case 404:
          throw new Error(`'${cleanAccountName}' 사용자를 찾을 수 없습니다.`);
        case 429:
          throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        case 500:
          throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        case 502:
        case 503:
        case 504:
          throw new Error('서비스가 일시적으로 이용할 수 없습니다.');
        default:
          const apiMessage = responseData?.message || responseData?.error;
          if (apiMessage && typeof apiMessage === 'string') {
            throw new Error(apiMessage);
          }
          throw new Error(`서버 오류 (${status}): 사용자 프로필을 불러올 수 없습니다.`);
      }
    }
  },

  // 🔥 GET /user/my - 현재 사용자 프로필 조회 (백엔드와 완전 일치)
  getCurrentUserProfile: async (): Promise<UserProfileResponse> => {
    console.log('🔥 API 요청 - GET /user/my');

    try {
      const response = await api.get<ApiResponse<UserProfileResponse>>(
        `/user/my`,
        { timeout: 10000 }
      );

      console.log('🔥 현재 사용자 프로필 Raw 응답:', response);
      
      if (!response?.data) {
        throw new Error('서버 응답이 없습니다.');
      }

      if (response.data.error === true) {
        throw new Error(response.data.message || '현재 사용자 프로필을 불러올 수 없습니다.');
      }

      if (!response.data.data) {
        throw new Error('현재 사용자 프로필 데이터가 없습니다.');
      }

      console.log('🔥 API 응답 - 현재 사용자 프로필 성공:', response.data.data);
      return response.data.data;

    } catch (error: any) {
      console.error('🚨 현재 사용자 프로필 API 실패:', error);

      if (!error.response) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('요청 시간이 초과되었습니다.');
        }
        throw new Error('네트워크 연결을 확인해주세요.');
      }

      const status = error.response.status;
      
      switch (status) {
        case 401:
          throw new Error('로그인이 필요합니다.');
        case 403:
          throw new Error('프로필에 접근할 권한이 없습니다.');
        default:
          throw new Error(error.response?.data?.message || '현재 사용자 프로필을 불러올 수 없습니다.');
      }
    }
  },

  // 🔥 POST/DELETE /follows/{accountName} - 팔로우 토글 (기존 유지)
  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    try {
      if (isCurrentlyFollowing) {
        console.log('🔥 API 요청 - DELETE /follows/' + accountName);
        const response = await api.delete<ApiResponse<void>>(`/follows/${accountName}`);
        if (response.data.error) {
          throw new Error(response.data.message || '언팔로우에 실패했습니다.');
        }
      } else {
        console.log('🔥 API 요청 - POST /follows/' + accountName);
        const response = await api.post<ApiResponse<void>>(`/follows/${accountName}`);
        if (response.data.error) {
          throw new Error(response.data.message || '팔로우에 실패했습니다.');
        }
      }
      console.log('🔥 API 응답 - 팔로우 토글 완료');

    } catch (error: any) {
      console.error('🚨 팔로우 토글 API 실패:', error);

      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }

      throw new Error(error.response?.data?.message || '팔로우 처리에 실패했습니다.');
    }
  },

  // 🔥 POST /posts/{postId}/like - 좋아요 토글 (기존 유지)
  togglePostLike: async (postId: number): Promise<{ isLiked: boolean; likeCount: number }> => {
    console.log('🔥 좋아요 토글 API 요청:', { postId });

    try {
      const response = await api.post<ApiResponse<{ isLiked: boolean; likeCount: number }>>(
        `/posts/${postId}/like`
      );

      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 처리에 실패했습니다.');
      }

      console.log('🔥 좋아요 토글 성공:', response.data.data);
      return response.data.data;

    } catch (error: any) {
      console.error('🚨 좋아요 토글 실패:', error);

      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }

      throw new Error(error.response?.data?.message || '좋아요 처리에 실패했습니다.');
    }
  }
};

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// 🔥 백엔드 UserProfileResponse를 UserProfile로 변환
const convertUserProfileResponseToUserProfile = (
  userProfileData: UserProfileResponse
): UserProfile => {
  return {
    id: userProfileData.userId || 0,
    accountName: userProfileData.accountName || '',
    name: userProfileData.name || '',
    email: userProfileData.email || '',
    profileImage: userProfileData.profileImage || undefined,
    followersCount: userProfileData.followersCount || 0,
    followingCount: userProfileData.followingCount || 0,
    isFollowing: userProfileData.isFollowing || false,
    totalLikes: userProfileData.totalLikes || 0,
    posts: userProfileData.posts || [],
    hasMorePosts: userProfileData.hasMorePosts || false,
    nextPostCursor: userProfileData.nextPostCursor || null,
    isLoadingMore: false
  };
};

// 🔥 동적 라우트 파라미터 처리 함수
const extractAccountName = (props: UserProfileProps): string | null => {
  if (props.params?.accountName) {
    return decodeURIComponent(props.params.accountName);
  }

  if (props.accountName) {
    return props.accountName;
  }

  return null;
};

// ============================================================================
// LoadingSpinner 컴포넌트
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = ''
}): JSX.Element => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        className={`animate-spin ${sizeClasses[size]} text-blue-600`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// ============================================================================
// UserProfile 메인 컴포넌트
// ============================================================================

const UserProfile: React.FC<UserProfileProps> = (props): JSX.Element => {
  const {
    userId: propUserId,
    initialData,
    onProfileUpdate,
    className = '',
    postsPerPage = 12,
    enableAutoLoad = true,
  } = props;

  const router = useRouter();

  // 🔥 Zustand 스토어 사용
  const {
    user: currentUser,
    isAuthenticated,
    isLoading: authLoading,
    accessToken,
    logout
  } = useAuthStore();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

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
        const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
        router.replace(`/login?redirect=${currentPath}`);
        return;
      } else if (err.message.includes('403') || err.message.includes('권한이 없습니다')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('404') || err.message.includes('찾을 수 없습니다')) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else if (err.message.includes('network') || err.message.includes('Network Error')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else {
        errorMessage = err.message;
      }
    }

    setError(errorMessage);
    showToast(errorMessage, 'error');
  }, [logout, router, showToast]);

  // ============================================================================
  // 🔥 수정된 프로필 로드 함수
  // ============================================================================

  const loadUserProfile = useCallback(async () => {
    if (!isAuthenticated || !accessToken || authLoading) {
      console.log('🔒 사용자가 인증되지 않음, 프로필 로딩 중단');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const targetAccountName = extractAccountName(props);
      
      if (!targetAccountName || targetAccountName.trim().length === 0) {
        throw new Error('계정명이 필요합니다.');
      }

      console.log('🔥 UserProfile 로드 시작:', { 
        targetAccountName: targetAccountName.trim(),
        user: currentUser?.accountName || currentUser?.email
      });

      // 🔥 올바른 백엔드 API 호출
      const userProfileData = await profileAPI.getUserProfile(targetAccountName.trim());

      // UserProfileResponse를 UserProfile 타입으로 변환
      const profileData = convertUserProfileResponseToUserProfile(userProfileData);

      setUserProfile(profileData);
      onProfileUpdate?.(profileData);

    } catch (err: any) {
      handleError(err, 'UserProfile 로드');
    } finally {
      setIsLoading(false);
    }
  }, [
    props, 
    isAuthenticated, 
    accessToken, 
    authLoading, 
    currentUser, 
    onProfileUpdate, 
    handleError
  ]);

  // ============================================================================
  // 추가 게시물 로드 (필요시 별도 API 구현)
  // ============================================================================

  const loadMorePosts = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    if (!userProfile || !userProfile.hasMorePosts || !userProfile.nextPostCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      // TODO: 백엔드에서 더 많은 게시물을 로드하는 API가 필요한 경우 구현
      // 현재는 단일 프로필 조회만 가능
      showToast('더 많은 게시물 로드 기능이 준비 중입니다.', 'info');

    } catch (err: any) {
      handleError(err, '추가 게시물 로드');
    } finally {
      setIsLoadingMore(false);
    }
  }, [userProfile, isLoadingMore, handleError, isAuthenticated, accessToken, showToast]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

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

  const handlePostClick = useCallback((post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`);
  }, [router]);

  const handleFollowToggle = useCallback(async () => {
    if (!userProfile || !isAuthenticated || !accessToken) {
      if (!isAuthenticated) {
        showToast('로그인이 필요합니다.', 'error');
      }
      return;
    }

    const originalFollowing = userProfile.isFollowing;
    const originalCount = userProfile.followersCount;

    try {
      const newFollowing = !originalFollowing;
      const newCount = newFollowing ? originalCount + 1 : Math.max(0, originalCount - 1);

      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: newFollowing,
        followersCount: newCount
      } : null);

      await profileAPI.toggleFollow(userProfile.accountName, originalFollowing);

      showToast(newFollowing ? '팔로우했습니다!' : '언팔로우했습니다!');

    } catch (error: any) {
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      } : null);

      handleError(error, '팔로우 토글');
    }
  }, [userProfile, isAuthenticated, accessToken, showToast, handleError]);

  const handlePostLike = useCallback(async (post: PostResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated || !accessToken) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    const originalLiked = post.isLikedByMe;
    const originalCount = post.likeCount;

    try {
      console.log('🔥 게시물 좋아요 토글 시작:', {
        postId: post.postId,
        currentLiked: originalLiked,
        user: currentUser?.accountName || currentUser?.email
      });

      // 낙관적 업데이트
      const newLiked = !originalLiked;
      const likeDiff = newLiked ? 1 : -1;
      const newCount = Math.max(0, originalCount + likeDiff);

      setUserProfile(prev => {
        if (!prev) return null;

        const updatedPosts = prev.posts.map(p =>
          p.postId === post.postId
            ? { ...p, isLikedByMe: newLiked, likeCount: newCount }
            : p
        );

        return {
          ...prev,
          posts: updatedPosts,
          totalLikes: Math.max(0, prev.totalLikes + likeDiff)
        };
      });

      // 백엔드 API 호출
      const result = await profileAPI.togglePostLike(post.postId);

      // 서버 응답으로 정확한 상태 업데이트
      setUserProfile(prev => {
        if (!prev) return null;

        const updatedPosts = prev.posts.map(p =>
          p.postId === post.postId
            ? { ...p, isLikedByMe: result.isLiked, likeCount: result.likeCount }
            : p
        );

        // 실제 서버 응답 기반으로 총 좋아요 수 계산
        const actualLikeDiff = (result.isLiked ? 1 : 0) - (originalLiked ? 1 : 0);

        return {
          ...prev,
          posts: updatedPosts,
          totalLikes: Math.max(0, prev.totalLikes + actualLikeDiff)
        };
      });

      console.log('🔥 게시물 좋아요 토글 성공:', result);
      showToast(result.isLiked ? '좋아요를 눌렀습니다!' : '좋아요를 취소했습니다!');

    } catch (error: any) {
      console.error('❌ 게시물 좋아요 토글 실패:', error);

      // 실패 시 롤백
      setUserProfile(prev => {
        if (!prev) return null;

        const updatedPosts = prev.posts.map(p =>
          p.postId === post.postId
            ? { ...p, isLikedByMe: originalLiked, likeCount: originalCount }
            : p
        );

        // 롤백 시 원래 상태로 복원
        const rollbackLikeDiff = (originalLiked ? 1 : 0) - (!originalLiked ? 1 : 0);

        return {
          ...prev,
          posts: updatedPosts,
          totalLikes: Math.max(0, prev.totalLikes + rollbackLikeDiff)
        };
      });

      handleError(error, '좋아요 토글');
    }
  }, [isAuthenticated, accessToken, currentUser, showToast, handleError]);

  // ============================================================================
  // useEffect 훅들
  // ============================================================================

  // 로그인 상태 확인
  useEffect(() => {
    console.log('🔍 UserProfile 로그인 상태 체크:', {
      isAuthenticated,
      hasAccessToken: !!accessToken,
      user: currentUser?.accountName || currentUser?.email
    });

    if (!isAuthenticated || !accessToken) {
      console.log('🚨 로그인이 필요합니다. 로그인 페이지로 리다이렉트...');
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?redirect=${currentPath}`);
      return;
    }

    console.log('✅ 로그인 상태 확인 완료. 프로필 조회 가능.');
  }, [isAuthenticated, accessToken, currentUser, router]);

  // 무한스크롤 - Intersection Observer
  useEffect(() => {
    if (!enableAutoLoad || !loadMoreRef.current || !isAuthenticated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && userProfile?.hasMorePosts && !isLoadingMore) {
          loadMorePosts();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px 0px'
      }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [enableAutoLoad, userProfile?.hasMorePosts, isLoadingMore, loadMorePosts, isAuthenticated]);

  // 초기 로드
  useEffect(() => {
    if (!initialData && isAuthenticated && !authLoading) {
      loadUserProfile();
    }
  }, [loadUserProfile, initialData, isAuthenticated, authLoading]);

  // ============================================================================
  // 렌더링 조건부 분기
  // ============================================================================

  // 인증 로딩 중
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

  // 인증되지 않음
  if (!isAuthenticated || !accessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center p-8">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <LockClosedIcon className="h-10 w-10 text-red-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          로그인이 필요합니다
        </h2>

        <p className="text-gray-600 mb-6 max-w-md">
          다른 사용자의 프로필을 보시려면 먼저 로그인해주세요. <br />
          로그인 후 모든 기능을 이용할 수 있습니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/login')}
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

  // 프로필 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">프로필을 불러오는 중...</p>
          {currentUser && (
            <p className="text-sm text-gray-500 mt-1">
              {currentUser.accountName || currentUser.email}님으로 로그인됨
            </p>
          )}
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
            {error.includes('로그인') && (
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                로그인하기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">프로필을 찾을 수 없습니다</h3>
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

  // ============================================================================
  // 메인 프로필 렌더링
  // ============================================================================

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* 프로필 헤더 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            {/* 프로필 이미지 */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile.name || '사용자'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>

            {/* 기본 정보 */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{userProfile.name || '이름 없음'}</h1>
              <p className="text-gray-600 mb-1">@{userProfile.accountName || '계정명 없음'}</p>
              <p className="text-sm text-gray-500">{userProfile.email || '이메일 없음'}</p>
              {currentUser && (
                <p className="text-sm text-green-600 mt-1">
                  @{currentUser.accountName || currentUser.email}로 로그인됨
                </p>
              )}
            </div>
          </div>

          {/* 팔로우 버튼 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleFollowToggle}
              className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${userProfile.isFollowing
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              <UsersIcon className="h-4 w-4 mr-2" />
              {userProfile.isFollowing ? '팔로잉' : '팔로우'}
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500 mb-1">{userProfile.totalLikes}</div>
            <div className="text-sm text-gray-600">총 좋아요</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{userProfile.followersCount}</div>
            <div className="text-sm text-gray-600">팔로워</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{userProfile.followingCount}</div>
            <div className="text-sm text-gray-600">팔로잉</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{userProfile.posts.length}</div>
            <div className="text-sm text-gray-600">게시물</div>
          </div>
        </div>
      </div>

      {/* 새로고침 버튼 */}
      <div className="flex justify-center mb-6">
        <button
          onClick={refreshProfile}
          disabled={isRefreshing || !isAuthenticated}
          className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      {/* 게시물 목록 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* 게시물 헤더 */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {userProfile.name || '사용자'}의 게시물
              </h2>
              <p className="text-gray-600 text-sm">
                총 {userProfile.posts.length}개의 게시물
                {userProfile.hasMorePosts && (
                  <span className="text-blue-500 ml-1">• 더 있음</span>
                )}
                {currentUser && (
                  <span className="text-green-600 ml-2">
                    • {currentUser.accountName || currentUser.email}님 전용
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 게시물 그리드 */}
        <div className="p-6">
          {userProfile.posts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userProfile.posts.map((post) => (
                  <div
                    key={post.postId}
                    className="group bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200"
                    onClick={() => handlePostClick(post)}
                  >
                    {/* 게시물 이미지 */}
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={post.imgUrl}
                        alt={post.caption || '게시물 이미지'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/api/placeholder/300/300?text=No+Image';
                        }}
                      />

                      {/* 호버 오버레이 */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-4 text-white">
                          <div className="flex items-center">
                            {post.isLikedByMe ? (
                              <HeartSolidIcon className="h-6 w-6 text-red-500" />
                            ) : (
                              <HeartIcon className="h-6 w-6" />
                            )}
                            <span className="ml-1 font-medium">{post.likeCount}</span>
                          </div>
                          <div className="flex items-center">
                            <EyeIcon className="h-6 w-6" />
                            <span className="ml-1 font-medium">보기</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 게시물 정보 */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {post.caption || '제목 없음'}
                      </h3>

                      {/* 게시물 통계 */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <button
                          onClick={(e) => handlePostLike(post, e)}
                          className="flex items-center hover:text-red-500 transition-colors"
                        >
                          {post.isLikedByMe ? (
                            <HeartSolidIcon className="h-4 w-4 text-red-500 mr-1" />
                          ) : (
                            <HeartIcon className="h-4 w-4 mr-1" />
                          )}
                          <span>{post.likeCount}</span>
                        </button>

                        <span>
                          {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* 작성자 정보 */}
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 mr-2">
                          {post.authorProfileImage ? (
                            <img
                              src={post.authorProfileImage}
                              alt={post.authorAccountName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              {post.authorAccountName ? post.authorAccountName.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-600">{post.authorAccountName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 무한스크롤 로딩 */}
              {userProfile.hasMorePosts && isAuthenticated && (
                <div className="mt-8">
                  {enableAutoLoad && (
                    <div ref={loadMoreRef} className="h-4" />
                  )}

                  {!enableAutoLoad && (
                    <div className="text-center">
                      <button
                        onClick={loadMorePosts}
                        disabled={isLoadingMore}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isLoadingMore ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                            로딩 중...
                          </>
                        ) : (
                          <>
                            <ChevronDownIcon className="h-4 w-4 mr-2" />
                            더 많은 게시물 보기
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {enableAutoLoad && isLoadingMore && (
                    <div className="flex justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
                        <span className="text-sm text-gray-600">더 많은 게시물을 불러오는 중...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 모든 게시물 로드 완료 */}
              {!userProfile.hasMorePosts && userProfile.posts.length > postsPerPage && (
                <div className="text-center py-8">
                  <p className="text-gray-500">모든 게시물을 확인했습니다 ✨</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <CameraIcon className="mx-auto h-12 w-12" />
              </div>
              <p className="text-gray-500 text-lg mb-2">게시물이 없습니다</p>
              <p className="text-gray-400 text-sm mb-6">아직 업로드된 게시물이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 새로고침 오버레이 */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />
              <span className="text-gray-700">프로필을 새로고침하는 중...</span>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all duration-300 ${toastMessage.type === 'success' ? 'bg-green-500' :
              toastMessage.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}>
            {toastMessage.message}
          </div>
        </div>
      )}

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && userProfile && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔥 UserProfile 디버그</div>
          <div>계정명: {extractAccountName(props)}</div>
          <div>사용자 ID: {userProfile.id}</div>
          <div>이름: {userProfile.name}</div>
          <div>이메일: {userProfile.email}</div>
          <div>게시물 수: {userProfile.posts.length}</div>
          <div>팔로워: {userProfile.followersCount}</div>
          <div>팔로잉: {userProfile.followingCount}</div>
          <div>총 좋아요: {userProfile.totalLikes}</div>
          <div>팔로우 상태: {userProfile.isFollowing ? 'Yes' : 'No'}</div>
          <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
          <div>더 있음: {userProfile.hasMorePosts ? 'Yes' : 'No'}</div>
          <div>다음 커서: {userProfile.nextPostCursor || 'None'}</div>
          <div>자동 로드: {enableAutoLoad ? 'Yes' : 'No'}</div>
          <div>로딩 중: {isLoadingMore ? 'Yes' : 'No'}</div>
          <div>현재 사용자: {currentUser?.accountName || currentUser?.email || 'None'}</div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;

// ============================================================================
// Export 추가 함수들
// ============================================================================

// 외부에서 사용할 수 있는 프로필 로더 함수
export const loadProfileByAccountName = async (accountName: string): Promise<UserProfile | null> => {
  try {
    const userProfileData = await profileAPI.getUserProfile(accountName);
    return convertUserProfileResponseToUserProfile(userProfileData);
  } catch (error) {
    console.error('Failed to load profile by account name:', error);
    return null;
  }
};

// 🔥 백엔드 API 함수들도 export (다른 컴포넌트에서 재사용 가능)
export { profileAPI };
export type {
  UserProfile,
  PostResponse,
  UserProfileResponse,
  ApiResponse
};
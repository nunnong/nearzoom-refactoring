// =============================================================================
// 📁 MyProfile.tsx - charAt() undefined 에러 수정 버전
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

// 🔥 내 피드 응답 타입 (MyFeedWithPostsResponse.java 기반)
interface MyFeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  hasNext: boolean;
  nextCursor: number | null;
}

// 🔥 UserResponse.java 기반 (사용자 정보)
interface UserResponse {
  userId: number;
  accountName: string;
  name: string;
  email: string;
  profileImage: string | null;
  createdAt: string;
}

// 🔥 UserInfoResponse.java 기반
interface UserInfoResponse {
  userName: string;
  userEmail: string;
  userProfileImage: string | null;
  faceImageUrl: string | null;
}

// 🔥 MyFeedStatsResponse.java 기반
interface MyFeedStatsResponse {
  postCount: number;
  totalLikes: number;
  followerCount: number;
  followingCount: number;
}

// 🔥 백엔드 UserProfileResponse 타입 (UserController 응답과 일치)
interface UserProfileResponse {
  userId: number;
  accountName: string;
  name: string;
  email: string;
  profileImage: string | null;

  // 팔로우 관련
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;

  // 게시물 관련 (UserProfileResponse에 포함된다면)
  posts?: PostResponse[];
  totalLikes?: number;
  hasMorePosts?: boolean;
  nextPostCursor?: number | null;
}

// ============================================================================
// 🔥 유틸리티 함수 - 안전한 문자열 처리
// ============================================================================

/**
 * 안전하게 문자열의 첫 번째 문자를 가져오는 함수
 * @param str - 처리할 문자열
 * @param fallback - 기본값 (기본: 'U')
 * @returns 첫 번째 문자 (대문자)
 */
const safeGetFirstChar = (str: string | null | undefined, fallback: string = 'U'): string => {
  if (!str || typeof str !== 'string' || str.trim().length === 0) {
    return fallback.toUpperCase();
  }
  return str.trim().charAt(0).toUpperCase();
};

/**
 * 안전하게 사용자 이름을 가져오는 함수
 * @param name - 사용자 이름
 * @param accountName - 계정명
 * @param email - 이메일
 * @returns 안전한 사용자 이름
 */
const safeGetDisplayName = (
  name?: string | null,
  accountName?: string | null,
  email?: string | null
): string => {
  if (name && name.trim()) return name.trim();
  if (accountName && accountName.trim()) return accountName.trim();
  if (email && email.trim()) return email.trim();
  return '사용자';
};

/**
 * 안전하게 계정명을 가져오는 함수
 * @param accountName - 계정명
 * @param email - 이메일
 * @returns 안전한 계정명
 */
const safeGetAccountName = (
  accountName?: string | null,
  email?: string | null
): string => {
  if (accountName && accountName.trim()) return accountName.trim();
  if (email && email.trim()) {
    // 이메일에서 @ 앞부분을 계정명으로 사용
    const emailPrefix = email.split('@')[0];
    if (emailPrefix) return emailPrefix;
  }
  return 'user';
};

// ============================================================================
// 🔥 백엔드 API 함수들 (수정됨 - 모든 필요한 메서드 포함)
// ============================================================================

const myProfileAPI = {
  // 🔥 GET /user/my - 내 프로필 조회 (UserController와 완전 일치)
  getMyProfile: async (): Promise<UserProfileResponse> => {
    console.log('🔥 API 요청 - GET /user/my');

    try {
      const response = await api.get<ApiResponse<UserProfileResponse>>('/user/my');

      if (!response?.data) {
        throw new Error('서버 응답이 없습니다.');
      }

      if (response.data.error === true) {
        throw new Error(response.data.message || '내 프로필을 불러올 수 없습니다.');
      }

      if (!response.data.data) {
        throw new Error('내 프로필 데이터가 없습니다.');
      }

      console.log('🔥 API 응답 - 내 프로필 성공:', response.data.data);
      return response.data.data;

    } catch (error: any) {
      console.error('🚨 내 프로필 API 실패:', error);

      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }

      throw new Error(error.response?.data?.message || '내 프로필을 불러올 수 없습니다.');
    }
  },

  // 🔥 GET /user/userInfo - 내 기본 정보 (기존 유지)
  getMyInfo: async (): Promise<UserInfoResponse> => {
    console.log('🔥 API 요청 - GET /user/userInfo');

    try {
      const response = await api.get<ApiResponse<UserInfoResponse>>('/user/userInfo');

      if (response.data.error) {
        throw new Error(response.data.message || '사용자 정보를 불러올 수 없습니다.');
      }

      console.log('🔥 API 응답 - 내 기본 정보:', response.data.data);
      return response.data.data;

    } catch (error: any) {
      console.error('🚨 내 정보 API 실패:', error);

      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }

      throw new Error(error.response?.data?.message || '사용자 정보를 불러올 수 없습니다.');
    }
  },

  // 🔥 GET /feeds/my - 내 피드 조회 (추가됨)
  getMyFeedWithPosts: async (
    limit: number = 10,
    cursor?: number
  ): Promise<MyFeedWithPostsResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /feeds/my', params);

    try {
      const response = await api.get<ApiResponse<MyFeedWithPostsResponse>>(
        '/feeds/my',
        { params }
      );

      if (response.data.error) {
        throw new Error(response.data.message || '내 피드 정보를 불러올 수 없습니다.');
      }

      console.log('🔥 API 응답 - 내 피드:', response.data.data);
      return response.data.data;

    } catch (error: any) {
      console.error('🚨 내 피드 API 실패:', error);

      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
      }

      if (error.response?.status === 404) {
        // 내 피드가 없는 경우 빈 피드 반환
        console.log('ℹ️ 내 피드가 없음, 빈 피드 반환');
        return {
          feedId: 0,
          userId: 0,
          accountName: '',
          profileImage: null,
          createdAt: new Date().toISOString(),
          posts: [],
          hasNext: false,
          nextCursor: null
        };
      }

      if (!error.response) {
        throw new Error('네트워크 연결을 확인해주세요.');
      }

      throw new Error(error.response?.data?.message || '내 피드 정보를 불러올 수 없습니다.');
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
// 프론트엔드 내부 타입 정의
// ============================================================================

interface MyProfileData {
  userInfo: UserResponse;
  feedData: MyFeedWithPostsResponse;
  stats: MyFeedStatsResponse;
}

interface MyProfileProps {
  className?: string;
  postsPerPage?: number;
  enableAutoLoad?: boolean;
}

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
// MyProfile 메인 컴포넌트
// ============================================================================

const MyProfile: React.FC<MyProfileProps> = ({
  className = '',
  postsPerPage = 12,
  enableAutoLoad = true,
}): JSX.Element => {
  const router = useRouter();

  // 🔥 올바른 아키텍처: Zustand 스토어 직접 사용
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

  const [profileData, setProfileData] = useState<MyProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        router.replace('/login');
        return;
      } else if (err.message.includes('403') || err.message.includes('권한이 없습니다')) {
        errorMessage = '권한이 없습니다.';
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
  // 🔥 로그인 상태 확인
  // ============================================================================

  useEffect(() => {
    console.log('🔍 MyProfile 로그인 상태 체크:', {
      isAuthenticated,
      hasAccessToken: !!accessToken,
      user: currentUser?.accountName || currentUser?.email
    });

    if (!isAuthenticated || !accessToken) {
      console.log('🚨 로그인이 필요합니다. 로그인 페이지로 리다이렉트...');
      router.replace('/login');
      return;
    }

    console.log('✅ 로그인 상태 확인 완료. 내 프로필 조회 가능.');
  }, [isAuthenticated, accessToken, currentUser, router]);

  // ============================================================================
  // 🔥 수정된 프로필 로드 함수 (안전한 데이터 처리)
  // ============================================================================

  const loadMyProfile = useCallback(async () => {
    if (!isAuthenticated || !accessToken || authLoading) {
      console.log('🔒 사용자가 인증되지 않음, 프로필 로딩 중단');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔥 내 프로필 로드 시작');

      // 🔥 /user/my 엔드포인트 하나로 모든 정보 조회
      const myProfileData = await myProfileAPI.getMyProfile();

      console.log('🔥 내 프로필 로드 완료:', myProfileData);

      // 🔥 안전한 데이터 처리로 UserProfileResponse를 내부 타입으로 변환
      const profileData: MyProfileData = {
        userInfo: {
          userId: myProfileData.userId || 0,
          accountName: safeGetAccountName(myProfileData.accountName, myProfileData.email),
          name: safeGetDisplayName(myProfileData.name, myProfileData.accountName, myProfileData.email),
          email: myProfileData.email || '',
          profileImage: myProfileData.profileImage,
          createdAt: new Date().toISOString()
        },
        feedData: {
          feedId: 0, // UserProfileResponse에 feedId가 없으면 0
          userId: myProfileData.userId || 0,
          accountName: safeGetAccountName(myProfileData.accountName, myProfileData.email),
          profileImage: myProfileData.profileImage,
          createdAt: new Date().toISOString(),
          posts: myProfileData.posts || [],
          hasNext: myProfileData.hasMorePosts || false,
          nextCursor: myProfileData.nextPostCursor || null
        },
        stats: {
          postCount: myProfileData.posts?.length || 0,
          totalLikes: myProfileData.totalLikes || 0,
          followerCount: myProfileData.followersCount || 0,
          followingCount: myProfileData.followingCount || 0
        }
      };

      setProfileData(profileData);

    } catch (err: any) {
      console.error('❌ 내 프로필 로드 실패:', err);
      handleError(err, '내 프로필 로드');
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    accessToken,
    authLoading,
    handleError
  ]);

  // ============================================================================
  // 추가 게시물 로드 (무한스크롤) - 🔥 타입 수정
  // ============================================================================

  const loadMorePosts = useCallback(async () => {
    if (!isAuthenticated || !accessToken || !profileData) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    if (!profileData.feedData.hasNext || !profileData.feedData.nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      console.log('🔥 추가 게시물 로드 시작:', {
        cursor: profileData.feedData.nextCursor
      });

      const moreFeedData = await myProfileAPI.getMyFeedWithPosts(
        postsPerPage,
        profileData.feedData.nextCursor
      );

      setProfileData(prev => {
        if (!prev) return null;

        return {
          ...prev,
          feedData: {
            ...prev.feedData,
            posts: [...prev.feedData.posts, ...moreFeedData.posts],
            hasNext: moreFeedData.hasNext,
            nextCursor: moreFeedData.nextCursor
          },
          stats: {
            ...prev.stats,
            postCount: prev.feedData.posts.length + moreFeedData.posts.length,
            // 🔥 타입 수정: PostResponse 타입 명시
            totalLikes: prev.stats.totalLikes + moreFeedData.posts.reduce((sum: number, post: PostResponse) => sum + post.likeCount, 0)
          }
        };
      });

      console.log('🔥 추가 게시물 로드 완료:', {
        newCount: moreFeedData.posts.length,
        hasMore: moreFeedData.hasNext
      });

    } catch (err: any) {
      console.error('❌ 추가 게시물 로드 실패:', err);
      handleError(err, '추가 게시물 로드');
    } finally {
      setIsLoadingMore(false);
    }
  }, [profileData, postsPerPage, isLoadingMore, handleError, isAuthenticated, accessToken, showToast]);

  // ============================================================================
  // 무한스크롤 - Intersection Observer
  // ============================================================================

  useEffect(() => {
    if (!enableAutoLoad || !loadMoreRef.current || !isAuthenticated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && profileData?.feedData.hasNext && !isLoadingMore) {
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
  }, [enableAutoLoad, profileData?.feedData.hasNext, isLoadingMore, loadMorePosts, isAuthenticated]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadMyProfile();
    }
  }, [loadMyProfile, isAuthenticated, authLoading]);

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
      console.log('🔥 내 프로필 새로고침 시작');
      await loadMyProfile();
      showToast('프로필이 새로고침되었습니다!');
    } catch (err: any) {
      console.error('❌ 프로필 새로고침 실패:', err);
      handleError(err, '프로필 새로고침');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMyProfile, showToast, handleError, isAuthenticated, accessToken]);

  const handleRetry = useCallback(() => {
    loadMyProfile();
  }, [loadMyProfile]);

  const handlePostClick = useCallback((post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`);
  }, [router]);

  // 게시물 좋아요 토글
  const handlePostLike = useCallback(async (post: PostResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated || !accessToken || !profileData) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    const originalLiked = post.isLikedByMe;
    const originalCount = post.likeCount;

    try {
      console.log('🔥 게시물 좋아요 토글 시작:', {
        postId: post.postId,
        currentLiked: originalLiked
      });

      // 낙관적 업데이트
      const newLiked = !originalLiked;
      const likeDiff = newLiked ? 1 : -1;
      const newCount = Math.max(0, originalCount + likeDiff);

      setProfileData(prev => {
        if (!prev) return null;

        const updatedPosts = prev.feedData.posts.map(p =>
          p.postId === post.postId
            ? { ...p, isLikedByMe: newLiked, likeCount: newCount }
            : p
        );

        return {
          ...prev,
          feedData: {
            ...prev.feedData,
            posts: updatedPosts
          },
          stats: {
            ...prev.stats,
            totalLikes: Math.max(0, prev.stats.totalLikes + likeDiff)
          }
        };
      });

      // 백엔드 API 호출
      const result = await myProfileAPI.togglePostLike(post.postId);

      // 서버 응답으로 정확한 상태 업데이트
      setProfileData(prev => {
        if (!prev) return null;

        const updatedPosts = prev.feedData.posts.map(p =>
          p.postId === post.postId
            ? { ...p, isLikedByMe: result.isLiked, likeCount: result.likeCount }
            : p
        );

        // 실제 서버 응답 기반으로 총 좋아요 수 계산
        const actualLikeDiff = (result.isLiked ? 1 : 0) - (originalLiked ? 1 : 0);

        return {
          ...prev,
          feedData: {
            ...prev.feedData,
            posts: updatedPosts
          },
          stats: {
            ...prev.stats,
            totalLikes: Math.max(0, prev.stats.totalLikes + actualLikeDiff)
          }
        };
      });

      console.log('🔥 게시물 좋아요 토글 성공:', result);
      showToast(result.isLiked ? '좋아요를 눌렀습니다!' : '좋아요를 취소했습니다!');

    } catch (error: any) {
      console.error('❌ 게시물 좋아요 토글 실패:', error);

      // 실패 시 롤백
      setProfileData(prev => {
        if (!prev) return null;

        const updatedPosts = prev.feedData.posts.map(p =>
          p.postId === post.postId
            ? { ...p, isLikedByMe: originalLiked, likeCount: originalCount }
            : p
        );

        const rollbackLikeDiff = (originalLiked ? 1 : 0) - (!originalLiked ? 1 : 0);

        return {
          ...prev,
          feedData: {
            ...prev.feedData,
            posts: updatedPosts
          },
          stats: {
            ...prev.stats,
            totalLikes: Math.max(0, prev.stats.totalLikes + rollbackLikeDiff)
          }
        };
      });

      handleError(error, '좋아요 토글');
    }
  }, [isAuthenticated, accessToken, profileData, showToast, handleError]);

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
          내 프로필을 보시려면 먼저 로그인해주세요.
        </p>

        <button
          onClick={() => router.push('/login')}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  // 프로필 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">내 프로필을 불러오는 중...</p>
          {currentUser && (
            <p className="text-sm text-gray-500 mt-1">
              {safeGetDisplayName(currentUser.name, currentUser.accountName, currentUser.email)}님
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

  if (!profileData) {
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
              {profileData.userInfo.profileImage ? (
                <img
                  src={profileData.userInfo.profileImage}
                  alt={profileData.userInfo.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {safeGetFirstChar(profileData.userInfo.name)}
                </span>
              )}
            </div>

            {/* 기본 정보 */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{profileData.userInfo.name}</h1>
              <p className="text-gray-600 mb-1">@{profileData.userInfo.accountName}</p>
              <p className="text-sm text-gray-500">{profileData.userInfo.email}</p>
              <p className="text-sm text-green-600 mt-1">내 프로필</p>
            </div>
          </div>

          {/* 프로필 편집 버튼 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/profile/edit')}
              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <UsersIcon className="h-4 w-4 mr-2" />
              프로필 편집
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500 mb-1">{profileData.stats.totalLikes}</div>
            <div className="text-sm text-gray-600">총 좋아요</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{profileData.stats.followerCount}</div>
            <div className="text-sm text-gray-600">팔로워</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{profileData.stats.followingCount}</div>
            <div className="text-sm text-gray-600">팔로잉</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{profileData.stats.postCount}</div>
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
                내 게시물
              </h2>
              <p className="text-gray-600 text-sm">
                총 {profileData.feedData.posts.length}개의 게시물
                {profileData.feedData.hasNext && (
                  <span className="text-blue-500 ml-1">• 더 있음</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 게시물 그리드 */}
        <div className="p-6">
          {profileData.feedData.posts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profileData.feedData.posts.map((post) => (
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
                              {safeGetFirstChar(post.authorAccountName)}
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
              {profileData.feedData.hasNext && isAuthenticated && (
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
              {!profileData.feedData.hasNext && profileData.feedData.posts.length > postsPerPage && (
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
              <p className="text-gray-400 text-sm mb-6">첫 번째 게시물을 업로드해보세요!</p>
              <button
                onClick={() => router.push('/feeds/create')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                게시물 작성하기
              </button>
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

    </div>
  );
};

// ============================================================================
// 🔥 기본 export 추가 (중요!)
// ============================================================================

export default MyProfile;

// ============================================================================
// Export 추가 함수들
// ============================================================================

// 🔥 백엔드 API 함수들도 export (다른 컴포넌트에서 재사용 가능)
export { myProfileAPI };
export type {
  MyProfileData,
  PostResponse,
  MyFeedWithPostsResponse,
  UserResponse,
  UserInfoResponse,
  MyFeedStatsResponse,
  UserProfileResponse,
  ApiResponse
};
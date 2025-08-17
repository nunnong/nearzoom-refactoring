// =============================================================================
// 📁 /components/page/profile/MyProfile.tsx - 완성된 버전
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
  PlusIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// 🔥 올바른 아키텍처: api from '@/lib/axios' 사용
import api from '@/lib/axios'

// 🔥 올바른 아키텍처: Zustand 토큰 스토어
import { useAuthStore } from '@/stores/authStore'

// 🔥 UploadSelfieModal 추가
import UploadSelfieModal from '@/components/page/myroom/UploadSelfieModal'

// ============================================================================
// 백엔드 API 응답 타입 정의 (실제 백엔드와 일치)
// ============================================================================

interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 실제 백엔드 UserProfileResponse 타입 (UserController.java 기반)
interface UserProfileResponse {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  userProfileImage: string | null;
  faceImageUrl: string | null;
}

// 🔥 실제 백엔드 PostResponse 타입 (FeedController.java 기반)
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

// 🔥 실제 백엔드 FollowCountsResponse 타입 (FollowController.java 기반)
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// 🔥 PostListResponse 타입 (FeedController.java 기반)
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

// ============================================================================
// 백엔드 API 함수들 (실제 엔드포인트 사용)
// ============================================================================

const myProfileAPI = {
  // 🔥 GET /user/my - 현재 사용자 정보 조회 (UserController 기반)
  getCurrentUser: async (): Promise<UserProfileResponse> => {
    console.log('🔍 API 요청: GET /user/my');
    
    try {
      const response = await api.get<ApiResponse<UserProfileResponse>>('/user/my');
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '사용자 정보를 불러올 수 없습니다.');
      }
      
      console.log('✅ 사용자 정보 조회 성공:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('❌ 사용자 정보 조회 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      throw new Error(error.response?.data?.message || '사용자 정보를 불러올 수 없습니다.');
    }
  },

  // 🔥 GET /feeds/explore로 내 게시물 조회 (프론트에서 필터링)
  getMyPosts: async (limit: number = 20, cursor?: number): Promise<PostResponse[]> => {
    console.log(`🔍 API 요청: 내 게시물 조회 (limit=${limit}, cursor=${cursor})`);
    
    try {
      // 1. 현재 사용자 정보 조회
      const userInfo = await myProfileAPI.getCurrentUser();
      const myAccountName = userInfo.accountName;
      
      // 2. Explore API에서 모든 게시물 조회 (충분히 많이 가져오기)
      const params: any = { limit: 100 }; // 내 게시물만 필터링할 것이므로 많이 가져옴
      if (cursor) params.cursor = cursor;
      
      const response = await api.get<ApiResponse<PostListResponse>>('/feeds/explore', { params });
      
      if (response.data.error || !response.data.data) {
        throw new Error(response.data.message || '게시물을 불러올 수 없습니다.');
      }
      
      // 3. 내 게시물만 필터링
      const myPosts = response.data.data.posts.filter(
        post => post.authorAccountName === myAccountName
      );
      
      // 4. limit 개수만큼만 반환
      const limitedPosts = myPosts.slice(0, limit);
      
      console.log(`✅ 내 게시물 조회 성공: 전체 ${response.data.data.posts.length}개 중 내 게시물 ${limitedPosts.length}개`);
      return limitedPosts;
      
    } catch (error: any) {
      console.error('❌ 내 게시물 조회 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      throw new Error(error.response?.data?.message || '게시물을 불러올 수 없습니다.');
    }
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 통계 조회
  getFollowStats: async (accountName: string): Promise<FollowCountsResponse> => {
    console.log(`🔍 API 요청: GET /follows/count/${accountName}`);
    
    try {
      const response = await api.get<ApiResponse<FollowCountsResponse>>(
        `/follows/count/${accountName}`
      );
      
      if (response.data.error || !response.data.data) {
        console.warn('팔로우 통계 조회 실패, 기본값 반환');
        return { followerCount: 0, followingCount: 0 };
      }
      
      console.log('✅ 팔로우 통계 조회 성공:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('❌ 팔로우 통계 조회 실패:', error);
      return { followerCount: 0, followingCount: 0 };
    }
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
      throw new Error(error.response?.data?.message || '좋아요 처리에 실패했습니다.');
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
// MyProfile 컴포넌트 Props
// ============================================================================

interface MyProfileProps {
  className?: string;
  postsPerPage?: number;
}

// ============================================================================
// MyProfile 메인 컴포넌트
// ============================================================================

const MyProfile: React.FC<MyProfileProps> = ({
  className = '',
  postsPerPage = 12,
}): JSX.Element => {
  const router = useRouter();

  // 🔥 Zustand 스토어에서 인증 상태 관리
  const {
    user: currentUser,
    isAuthenticated,
    isLoading: authLoading,
    accessToken,
    logout
  } = useAuthStore();

  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [followStats, setFollowStats] = useState<FollowCountsResponse>({ 
    followerCount: 0, 
    followingCount: 0 
  });
  const [isLoading, setIsLoading] = useState(true);
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
  // 프로필 데이터 로드
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
      console.log('🔥 내 프로필 데이터 로드 시작');

      // 1. 사용자 정보 먼저 조회
      const userInfo = await myProfileAPI.getCurrentUser();
      setUserProfile(userInfo);
      console.log('✅ 사용자 정보 로드 성공:', userInfo);

      // 2. 팔로우 통계와 게시물을 병렬로 조회
      const [statsResult, postsResult] = await Promise.allSettled([
        myProfileAPI.getFollowStats(userInfo.accountName),
        myProfileAPI.getMyPosts(postsPerPage)
      ]);

      // 팔로우 통계 처리
      if (statsResult.status === 'fulfilled') {
        setFollowStats(statsResult.value);
        console.log('✅ 팔로우 통계 로드 성공:', statsResult.value);
      } else {
        console.warn('팔로우 통계 조회 실패:', statsResult.reason);
        setFollowStats({ followerCount: 0, followingCount: 0 });
      }

      // 게시물 처리
      if (postsResult.status === 'fulfilled') {
        setPosts(postsResult.value);
        console.log(`✅ 게시물 로드 성공: ${postsResult.value.length}개`);
      } else {
        console.warn('게시물 조회 실패:', postsResult.reason);
        setPosts([]);
      }

      console.log('✅ 내 프로필 데이터 로드 완료');

    } catch (err: any) {
      console.error('❌ 내 프로필 로드 실패:', err);
      handleError(err, '내 프로필 로드');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken, authLoading, handleError, postsPerPage]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 🔥 수정: /myroom으로 리다이렉트
  const handleCreatePost = useCallback(() => {
    console.log('🔥 게시물 작성하기 클릭 - /myroom으로 이동');
    router.push('/myroom');
  }, [router]);

  // 🔥 수정: accountName으로 프로필 페이지 이동
  const handleViewProfile = useCallback(() => {
    if (userProfile?.accountName) {
      console.log(`🔥 프로필 보기 클릭 - /profile/${userProfile.accountName}으로 이동`);
      router.push(`/profile/${userProfile.accountName}`);
    }
  }, [router, userProfile]);

  // 게시물 상세로 이동
  const handlePostClick = useCallback((post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`);
  }, [router]);

  // 팔로워/팔로잉 목록 보기
  const handleViewFollowers = useCallback(() => {
    if (userProfile?.accountName) {
      router.push(`/follows/followers/${userProfile.accountName}`);
    }
  }, [router, userProfile]);

  const handleViewFollowing = useCallback(() => {
    if (userProfile?.accountName) {
      router.push(`/follows/following/${userProfile.accountName}`);
    }
  }, [router, userProfile]);

  // 게시물 좋아요 토글
  const handlePostLike = useCallback(async (post: PostResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated || !accessToken) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    const originalLiked = post.isLikedByMe;
    const originalCount = post.likeCount;

    try {
      // 낙관적 업데이트
      const newLiked = !originalLiked;
      const newCount = Math.max(0, originalCount + (newLiked ? 1 : -1));

      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.postId === post.postId 
            ? { ...p, isLikedByMe: newLiked, likeCount: newCount }
            : p
        )
      );

      // 백엔드 API 호출
      await myProfileAPI.togglePostLike(post.postId, originalLiked);

      console.log(`✅ 좋아요 ${originalLiked ? '취소' : '추가'} 성공: postId=${post.postId}`);
      showToast(newLiked ? '좋아요를 눌렀습니다!' : '좋아요를 취소했습니다!');

    } catch (error: any) {
      console.error('❌ 게시물 좋아요 토글 실패:', error);

      // 실패 시 롤백
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

  // 새로고침
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

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadMyProfile();
    }
  }, [loadMyProfile, isAuthenticated, authLoading]);

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
            <button onClick={handleViewProfile} className="focus:outline-none">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center hover:shadow-lg transition-shadow">
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
            </button>

            {/* 기본 정보 */}
            <div>
              <button 
                onClick={handleViewProfile}
                className="text-left hover:text-blue-600 transition-colors focus:outline-none"
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{userProfile.userName}</h1>
                <p className="text-gray-600 mb-1">@{userProfile.accountName}</p>
              </button>
              <p className="text-sm text-gray-500">{userProfile.userEmail}</p>
              <p className="text-sm text-green-600 mt-1">내 프로필</p>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCreatePost}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>새 게시물</span>
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
            <div className="text-2xl font-bold text-gray-900">
              {posts.length}
            </div>
            <div className="text-sm text-gray-500">게시물</div>
          </div>
          <button
            onClick={handleViewFollowers}
            className="hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="text-2xl font-bold text-gray-900">
              {followStats.followerCount}
            </div>
            <div className="text-sm text-gray-500">팔로워</div>
          </button>
          <button
            onClick={handleViewFollowing}
            className="hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="text-2xl font-bold text-gray-900">
              {followStats.followingCount}
            </div>
            <div className="text-sm text-gray-500">팔로잉</div>
          </button>
        </div>
      </div>

      {/* 게시물 그리드 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">내 게시물</h2>
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
                {/* 게시물 이미지 */}
                <img
                  src={post.imgUrl}
                  alt={post.caption || '게시물'}
                  className="w-full h-full object-cover rounded-lg"
                />
                
                {/* 호버 오버레이 */}
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

                {/* 캡션 (하단) */}
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
            <p className="text-gray-500 mb-4">첫 번째 게시물을 올려보세요!</p>
            <button
              onClick={handleCreatePost}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>게시물 작성하기</span>
            </button>
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

export default MyProfile;
// =============================================================================
// 📁 MyProfile.tsx - 완전한 백엔드 연동 + 인증 보호 + 커서 기반 무한스크롤
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { JSX } from 'react'
import {
  PencilSquareIcon,
  HeartIcon,
  EyeIcon,
  UsersIcon,
  CameraIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  LockClosedIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'

// 🔥 백엔드 연동 - 인터셉터가 적용된 axios 인스턴스
import api from '@/lib/axios'

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
  postId: number;              // 🔑 커서로 사용
  photoId: number;
  imgUrl: string;
  caption: string | null;
  displayOrder: number | null;
  createdAt: string;
  // 📊 좋아요 관련 정보
  likeCount: number;
  isLikedByMe: boolean;
  // 👤 작성자 정보
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
}

// 🔥 FeedWithPostsResponse.java 기반
interface FeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  isFollowing: boolean;
  // 📱 커서 기반 페이징 정보
  hasNext: boolean;
  nextCursor: number | null;
}

// 🔥 FollowCountsResponse.java 기반
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// 🔥 MyFeedStatsResponse.java 기반
interface MyFeedStatsResponse {
  postCount: number;
  totalLikes: number;
  followerCount: number;
  followingCount: number;
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

// 프론트엔드 통합 UserProfile 타입 (무한스크롤 지원)
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
  // 🔥 무한스크롤 관련
  hasMorePosts: boolean;
  nextPostCursor: number | null;
  isLoadingMore: boolean;
}

interface MyProfileProps {
  userId?: number;
  accountName?: string;
  initialData?: UserProfile;
  onProfileUpdate?: (profile: UserProfile) => void;
  className?: string;
  isOwnProfile?: boolean;
  postsPerPage?: number;
  enableAutoLoad?: boolean;
}

// ============================================================================
// 백엔드 API 함수들 (커서 기반 무한스크롤 + 자동 인증 처리)
// ============================================================================

const profileAPI = {
  // 🔥 GET /feeds/users/account/{accountName}?limit=10&cursor=12345
  getUserFeedWithPosts: async (
    accountName: string, 
    limit: number = 10, 
    cursor?: number
  ): Promise<FeedWithPostsResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /feeds/users/account/' + accountName, params);

    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      `/feeds/users/account/${accountName}`,
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '피드 정보를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 사용자 피드:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/users/{userId}?limit=10&cursor=12345
  getUserFeedWithPostsById: async (
    userId: number, 
    limit: number = 10, 
    cursor?: number
  ): Promise<FeedWithPostsResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    console.log('🔥 API 요청 - GET /feeds/users/' + userId, params);

    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      `/feeds/users/${userId}`,
      { params }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 피드를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 사용자 피드 (ID):', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/my-stats
  getMyFeedStats: async (): Promise<MyFeedStatsResponse> => {
    console.log('🔥 API 요청 - GET /feeds/my-stats');

    const response = await api.get<ApiResponse<MyFeedStatsResponse>>('/feeds/my-stats');
    
    if (response.data.error) {
      throw new Error(response.data.message || '통계를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 내 피드 통계:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /follows/count/{accountName}
  getFollowCounts: async (accountName: string): Promise<FollowCountsResponse> => {
    console.log('🔥 API 요청 - GET /follows/count/' + accountName);

    const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${accountName}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우 수를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 팔로우 수:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /follows/status/{accountName} - 팔로우 상태 확인
  getFollowStatus: async (accountName: string): Promise<{ isFollowing: boolean; isFollowedBy: boolean }> => {
    console.log('🔥 API 요청 - GET /follows/status/' + accountName);

    const response = await api.get<ApiResponse<{ isFollowing: boolean; isFollowedBy: boolean }>>(
      `/follows/status/${accountName}`
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우 상태를 확인할 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 팔로우 상태:', response.data.data);
    return response.data.data;
  },

  // 🔥 POST/DELETE /follows/{accountName} - 팔로우 토글
  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
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
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 게시물 좋아요 토글
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      console.log('🔥 API 요청 - DELETE /likes/posts/' + postId);
      const response = await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`);
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 취소에 실패했습니다.');
      }
    } else {
      console.log('🔥 API 요청 - POST /likes/posts/' + postId);
      const response = await api.post<ApiResponse<void>>(`/likes/posts/${postId}`);
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요에 실패했습니다.');
      }
    }
    console.log('🔥 API 응답 - 좋아요 토글 완료');
  },

  // 🔥 GET /users/me - 내 정보 조회
  getMyInfo: async (): Promise<UserResponse> => {
    console.log('🔥 API 요청 - GET /users/me');

    const response = await api.get<ApiResponse<UserResponse>>('/users/me');
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 정보를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 내 정보:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /users/account/{accountName} - 사용자 정보 조회
  getUserInfo: async (accountName: string): Promise<UserResponse> => {
    console.log('🔥 API 요청 - GET /users/account/' + accountName);

    const response = await api.get<ApiResponse<UserResponse>>(`/users/account/${accountName}`);
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 정보를 불러올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 사용자 정보:', response.data.data);
    return response.data.data;
  },

  // 🔥 PUT /users/me - 프로필 업데이트
  updateProfile: async (data: { name?: string; email?: string; profileImage?: string }): Promise<UserResponse> => {
    console.log('🔥 API 요청 - PUT /users/me', data);

    const response = await api.put<ApiResponse<UserResponse>>('/users/me', data);
    
    if (response.data.error) {
      throw new Error(response.data.message || '프로필 업데이트에 실패했습니다.');
    }
    
    console.log('🔥 API 응답 - 프로필 업데이트 완료:', response.data.data);
    return response.data.data;
  }
};

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// 🔥 백엔드 응답을 UserProfile로 변환
const convertToUserProfile = (
  feedData: FeedWithPostsResponse,
  userInfo: UserResponse,
  followCounts?: FollowCountsResponse,
  myStats?: MyFeedStatsResponse,
  isOwnProfile: boolean = false
): UserProfile => {
  const totalLikes = myStats?.totalLikes || feedData.posts.reduce((sum, post) => sum + post.likeCount, 0);
  
  return {
    id: feedData.userId,
    accountName: feedData.accountName,
    name: userInfo.name,
    email: userInfo.email,
    profileImage: userInfo.profileImage || undefined,
    followersCount: followCounts?.followerCount || myStats?.followerCount || 0,
    followingCount: followCounts?.followingCount || myStats?.followingCount || 0,
    isFollowing: feedData.isFollowing,
    totalLikes: totalLikes,
    posts: feedData.posts,
    // 🔥 무한스크롤 관련
    hasMorePosts: feedData.hasNext,
    nextPostCursor: feedData.nextCursor,
    isLoadingMore: false
  };
};

// 사용자 ID 추출 헬퍼
const extractUserId = (user: any): number => {
  if (typeof user?.userId === 'number') return user.userId;
  if (typeof user?.id === 'number') return user.id;
  if (typeof user?.userId === 'string') return parseInt(user.userId) || 0;
  if (typeof user?.id === 'string') return parseInt(user.id) || 0;
  return 0;
};

// ============================================================================
// 인증 보호 컴포넌트
// ============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  className?: string;
  requireOwnership?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  className = '', 
  requireOwnership = false 
}): JSX.Element => {
  const { isAuthenticated, isLoading, handleLogin } = useAuth();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">인증 상태를 확인하는 중...</p>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-64 text-center p-8 ${className}`}>
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <LockClosedIcon className="h-10 w-10 text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          로그인이 필요합니다
        </h2>
        
        <p className="text-gray-600 mb-6 max-w-md">
          {requireOwnership ? '내 프로필을 보시려면' : '프로필을 보시려면'} 먼저 로그인해주세요. <br />
          로그인 후 프로필을 관리하고 게시물을 확인할 수 있습니다.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleLogin}
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
              <strong>안전한 서비스:</strong> 모든 프로필 기능은 로그인한 사용자만 이용할 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
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
// ProfileEditModal 컴포넌트
// ============================================================================

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string }) => void;
  currentData: {
    name: string;
    email: string;
  };
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentData 
}): JSX.Element | null => {
  const [formData, setFormData] = useState(currentData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(currentData);
  }, [currentData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('프로필 저장 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">프로필 편집</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MyProfile 메인 컴포넌트
// ============================================================================

const MyProfile: React.FC<MyProfileProps> = ({
  userId: propUserId,
  accountName: propAccountName,
  initialData,
  onProfileUpdate,
  className = '',
  isOwnProfile = true,
  postsPerPage = 12,
  enableAutoLoad = true,
}): JSX.Element => {
  const router = useRouter();
  const { user: currentUser, isAuthenticated, handleLogin } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
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
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('404') || err.message.includes('Not Found')) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
    showToast(errorMessage, 'error');
    
    if (errorMessage.includes('인증이 만료') || errorMessage.includes('권한이 없')) {
      setTimeout(() => handleLogin(), 2000);
    }
  }, [showToast, handleLogin]);

  const getCurrentUserId = useCallback((): number => {
    return extractUserId(currentUser);
  }, [currentUser]);

  // ============================================================================
  // 백엔드 API 연동 - 프로필 데이터 로드
  // ============================================================================

  const loadUserProfile = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔒 사용자가 인증되지 않음, 프로필 로딩 중단');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔥 프로필 로드 시작:', { 
        propUserId, 
        propAccountName, 
        isOwnProfile,
        currentUser: currentUser?.accountName
      });

      let feedData: FeedWithPostsResponse;
      let userInfo: UserResponse;
      let followCounts: FollowCountsResponse | undefined;
      let myStats: MyFeedStatsResponse | undefined;

      if (isOwnProfile) {
        // 🔥 본인 프로필
        const currentUserId = getCurrentUserId();
        
        if (!currentUserId) {
          throw new Error('사용자 정보를 찾을 수 없습니다.');
        }

        // 내 정보, 통계, 피드 데이터 병렬 로드
        const [userResult, statsResult, feedResult] = await Promise.allSettled([
          profileAPI.getMyInfo(),
          profileAPI.getMyFeedStats(),
          profileAPI.getUserFeedWithPostsById(currentUserId, postsPerPage)
        ]);

        if (userResult.status === 'fulfilled') {
          userInfo = userResult.value;
        } else {
          throw new Error('사용자 정보를 불러올 수 없습니다.');
        }

        if (statsResult.status === 'fulfilled') {
          myStats = statsResult.value;
        }

        if (feedResult.status === 'fulfilled') {
          feedData = feedResult.value;
        } else {
          throw new Error('내 피드 정보를 불러올 수 없습니다.');
        }

      } else {
        // 🔥 다른 사용자 프로필
        if (propAccountName) {
          // accountName으로 조회
          const [userResult, feedResult, followResult] = await Promise.allSettled([
            profileAPI.getUserInfo(propAccountName),
            profileAPI.getUserFeedWithPosts(propAccountName, postsPerPage),
            profileAPI.getFollowCounts(propAccountName)
          ]);

          if (userResult.status === 'fulfilled') {
            userInfo = userResult.value;
          } else {
            throw new Error('사용자 정보를 불러올 수 없습니다.');
          }

          if (feedResult.status === 'fulfilled') {
            feedData = feedResult.value;
          } else {
            throw new Error('피드 정보를 불러올 수 없습니다.');
          }

          if (followResult.status === 'fulfilled') {
            followCounts = followResult.value;
          }
          
        } else if (propUserId) {
          // userId로 조회 (먼저 피드를 가져와서 accountName을 얻음)
          feedData = await profileAPI.getUserFeedWithPostsById(propUserId, postsPerPage);
          
          const [userResult, followResult] = await Promise.allSettled([
            profileAPI.getUserInfo(feedData.accountName),
            profileAPI.getFollowCounts(feedData.accountName)
          ]);

          if (userResult.status === 'fulfilled') {
            userInfo = userResult.value;
          } else {
            throw new Error('사용자 정보를 불러올 수 없습니다.');
          }

          if (followResult.status === 'fulfilled') {
            followCounts = followResult.value;
          }
        } else {
          throw new Error('사용자 정보가 부족합니다.');
        }
      }

      // UserProfile 객체 변환
      const profileData = convertToUserProfile(
        feedData,
        userInfo,
        followCounts,
        myStats,
        isOwnProfile
      );

      console.log('🔥 프로필 로드 완료:', profileData);

      setUserProfile(profileData);
      onProfileUpdate?.(profileData);

    } catch (err: any) {
      console.error('Failed to load profile:', err);
      
      // 인증 관련 에러 처리
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '프로필 로드');
      } else {
        handleError(err, '프로필 로드');
      }
    } finally {
      setIsLoading(false);
    }
  }, [propUserId, propAccountName, isOwnProfile, getCurrentUserId, isAuthenticated, onProfileUpdate, handleError, postsPerPage]);

  // ============================================================================
  // 백엔드 API 연동 - 추가 게시물 로드 (무한스크롤)
  // ============================================================================

  const loadMorePosts = useCallback(async () => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    if (!userProfile || !userProfile.hasMorePosts || !userProfile.nextPostCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      console.log('🔥 추가 게시물 로드 시작:', {
        accountName: userProfile.accountName,
        cursor: userProfile.nextPostCursor
      });

      let moreFeedData: FeedWithPostsResponse;

      if (isOwnProfile) {
        // 본인 프로필 - userId로 조회
        moreFeedData = await profileAPI.getUserFeedWithPostsById(
          userProfile.id,
          postsPerPage,
          userProfile.nextPostCursor
        );
      } else {
        // 다른 사용자 프로필 - accountName으로 조회
        moreFeedData = await profileAPI.getUserFeedWithPosts(
          userProfile.accountName,
          postsPerPage,
          userProfile.nextPostCursor
        );
      }

      // 🔥 기존 게시물과 합치기
      setUserProfile(prev => {
        if (!prev) return null;

        const updatedProfile: UserProfile = {
          ...prev,
          posts: [...prev.posts, ...moreFeedData.posts],
          hasMorePosts: moreFeedData.hasNext,
          nextPostCursor: moreFeedData.nextCursor,
          totalLikes: prev.totalLikes + moreFeedData.posts.reduce((sum, post) => sum + post.likeCount, 0)
        };

        onProfileUpdate?.(updatedProfile);
        return updatedProfile;
      });

      console.log('🔥 추가 게시물 로드 완료:', {
        newCount: moreFeedData.posts.length,
        hasMore: moreFeedData.hasNext
      });

    } catch (err: any) {
      console.error('추가 게시물 로드 실패:', err);
      
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '추가 게시물 로드');
      } else {
        handleError(err, '추가 게시물 로드');
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [userProfile, isOwnProfile, postsPerPage, isLoadingMore, onProfileUpdate, handleError, isAuthenticated, showToast]);

  // ============================================================================
  // 백엔드 API 연동 - 프로필 새로고침
  // ============================================================================

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }

    setIsRefreshing(true);
    
    try {
      console.log('🔥 프로필 새로고침 시작');
      await loadUserProfile();
      showToast('프로필이 새로고침되었습니다!');
    } catch (err: any) {
      console.error('프로필 새로고침 실패:', err);
      
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '프로필 새로고침');
      } else {
        handleError(err, '프로필 새로고침');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [loadUserProfile, showToast, handleError, isAuthenticated, handleLogin]);

  // ============================================================================
  // 무한스크롤 - Intersection Observer
  // ============================================================================

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

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (!initialData && isAuthenticated) {
      loadUserProfile();
    }
  }, [loadUserProfile, initialData, isAuthenticated]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleEditFeed = useCallback(() => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }
    router.push('/feed/create');
  }, [router, isAuthenticated, showToast, handleLogin]);

  const handleSettings = useCallback(() => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
      return;
    }
    setIsProfileEditOpen(true);
  }, [isAuthenticated, showToast, handleLogin]);

  const handleRetry = useCallback(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const handlePostClick = useCallback((post: PostResponse) => {
    router.push(`/post/${post.postId}`);
  }, [router]);

  // 🔥 팔로우 토글 핸들러
  const handleFollowToggle = useCallback(async () => {
    if (!userProfile || isOwnProfile || !isAuthenticated) {
      if (!isAuthenticated) {
        showToast('로그인이 필요합니다.', 'error');
        setTimeout(() => handleLogin(), 1500);
      }
      return;
    }

    const originalFollowing = userProfile.isFollowing;
    const originalCount = userProfile.followersCount;

    try {
      console.log('🔥 팔로우 토글 시작:', { 
        accountName: userProfile.accountName, 
        currentFollowing: originalFollowing 
      });

      // 낙관적 업데이트
      const newFollowing = !originalFollowing;
      const newCount = newFollowing ? originalCount + 1 : Math.max(0, originalCount - 1);
      
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: newFollowing,
        followersCount: newCount
      } : null);

      // 🔥 백엔드 API 호출
      await profileAPI.toggleFollow(userProfile.accountName, originalFollowing);

      console.log('🔥 팔로우 토글 성공:', { 
        accountName: userProfile.accountName, 
        newFollowing 
      });

      showToast(newFollowing ? '팔로우했습니다!' : '언팔로우했습니다!');

    } catch (error: any) {
      console.error('Failed to toggle follow:', error);
      
      // 실패 시 롤백
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      } : null);
      
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '팔로우 토글');
      } else {
        handleError(error, '팔로우 토글');
      }
    }
  }, [userProfile, isOwnProfile, isAuthenticated, showToast, handleError, handleLogin]);

  // 🔥 게시물 좋아요 토글
  const handlePostLike = useCallback(async (post: PostResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      setTimeout(() => handleLogin(), 1500);
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

      // 🔥 백엔드 API 호출
      await profileAPI.togglePostLike(post.postId, originalLiked);

      console.log('🔥 게시물 좋아요 토글 성공:', { 
        postId: post.postId, 
        newLiked 
      });

      showToast(newLiked ? '좋아요를 눌렀습니다!' : '좋아요를 취소했습니다!');

    } catch (error: any) {
      console.error('Failed to toggle post like:', error);
      
      // 실패 시 롤백
      setUserProfile(prev => {
        if (!prev) return null;
        
        const updatedPosts = prev.posts.map(p => 
          p.postId === post.postId 
            ? { ...p, isLikedByMe: originalLiked, likeCount: originalCount }
            : p
        );
        
        return {
          ...prev,
          posts: updatedPosts,
          totalLikes: Math.max(0, prev.totalLikes - (originalLiked ? -1 : 1))
        };
      });
      
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '좋아요 토글');
      } else {
        handleError(error, '좋아요 토글');
      }
    }
  }, [isAuthenticated, showToast, handleError, handleLogin]);

  // 🔥 프로필 편집 저장
  const handleProfileSave = useCallback(async (data: { name: string; email: string }) => {
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.', 'error');
      return;
    }

    try {
      console.log('🔥 프로필 업데이트 시작:', data);

      // 🔥 백엔드 API 호출
      const updatedUserInfo = await profileAPI.updateProfile(data);

      // 로컬 상태 업데이트
      setUserProfile(prev => {
        if (!prev) return null;

        const updatedProfile = {
          ...prev,
          name: updatedUserInfo.name,
          email: updatedUserInfo.email,
        };

        onProfileUpdate?.(updatedProfile);
        return updatedProfile;
      });

      setIsProfileEditOpen(false);
      showToast('프로필이 업데이트되었습니다!');

      console.log('🔥 프로필 업데이트 완료:', updatedUserInfo);

    } catch (error: any) {
      console.error('Failed to update profile:', error);
      
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '프로필 업데이트');
      } else {
        handleError(error, '프로필 업데이트');
      }
    }
  }, [onProfileUpdate, showToast, isAuthenticated, handleError]);

  const closeProfileEditModal = useCallback(() => {
    setIsProfileEditOpen(false);
  }, []);

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  const renderContent = (): JSX.Element => {
    // 로딩 상태
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">프로필을 불러오는 중...</p>
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
              {error.includes('인증') && (
                <button
                  onClick={handleLogin}
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

    // 메인 프로필 컨텐츠
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        {/* 🔥 프로필 헤더 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-6">
              {/* 프로필 이미지 */}
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                {userProfile.profileImage ? (
                  <img
                    src={userProfile.profileImage}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* 기본 정보 */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{userProfile.name}</h1>
                <p className="text-gray-600 mb-1">@{userProfile.accountName}</p>
                {currentUser && (
                  <p className="text-sm text-green-600">@{currentUser.accountName}로 로그인됨</p>
                )}
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center space-x-3">
              {isOwnProfile ? (
                <button
                  onClick={handleSettings}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  <PencilSquareIcon className="h-4 w-4 mr-2" />
                  편집
                </button>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    userProfile.isFollowing
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <UsersIcon className="h-4 w-4 mr-2" />
                  {userProfile.isFollowing ? '팔로잉' : '팔로우'}
                </button>
              )}
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

        {/* 🔥 새로고침 버튼 */}
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

        {/* 🔥 피드 편집 버튼 - 본인 프로필일 때만 표시 */}
        {isOwnProfile && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleEditFeed}
              className="inline-flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <PencilSquareIcon className="h-5 w-5 mr-2" />
              <span>새 게시물 만들기</span>
            </button>
          </div>
        )}

        {/* 🔥 게시물 목록 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* 게시물 헤더 */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {isOwnProfile ? '내 게시물' : `${userProfile.name}의 게시물`}
                </h2>
                <p className="text-gray-600 text-sm">
                  총 {userProfile.posts.length}개의 게시물
                  {userProfile.hasMorePosts && (
                    <span className="text-blue-500 ml-1">• 더 있음</span>
                  )}
                </p>
              </div>
              
              {isOwnProfile && (
                <button
                  onClick={handleEditFeed}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  새 게시물
                </button>
              )}
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
                        
                        {/* 작성자 정보 (다른 사람 프로필에서 보는 경우) */}
                        {!isOwnProfile && (
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
                                  {post.authorAccountName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-600">{post.authorAccountName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🔥 무한스크롤 로딩 표시 및 더보기 버튼 */}
                {userProfile.hasMorePosts && isAuthenticated && (
                  <div className="mt-8">
                    {/* 자동 로드용 참조 요소 */}
                    {enableAutoLoad && (
                      <div ref={loadMoreRef} className="h-4" />
                    )}
                    
                    {/* 수동 더보기 버튼 */}
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

                    {/* 로딩 스피너 (자동 로드 시) */}
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

                {/* 모든 게시물 로드 완료 메시지 */}
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
                <p className="text-gray-500 text-lg mb-2">
                  {isOwnProfile ? '아직 게시물이 없습니다' : '게시물이 없습니다'}
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  {isOwnProfile ? '첫 번째 게시물을 만들어보세요!' : '아직 업로드된 게시물이 없습니다.'}
                </p>
                {isOwnProfile && (
                  <button
                    onClick={handleEditFeed}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <CameraIcon className="h-5 w-5 mr-2" />
                    첫 게시물 만들기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 🔥 로딩 오버레이 (새로고침 시) */}
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

        {/* 개발 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && userProfile && (
          <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
            <div className="font-semibold mb-1">🔥 마이프로필 디버그</div>
            <div>사용자 ID: {userProfile.id}</div>
            <div>계정명: {userProfile.accountName}</div>
            <div>게시물 수: {userProfile.posts.length}</div>
            <div>팔로워: {userProfile.followersCount}</div>
            <div>팔로잉: {userProfile.followingCount}</div>
            <div>총 좋아요: {userProfile.totalLikes}</div>
            <div>본인 프로필: {isOwnProfile ? 'Yes' : 'No'}</div>
            <div>팔로우 상태: {userProfile.isFollowing ? 'Yes' : 'No'}</div>
            <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
            <div>사용자: {currentUser?.accountName || 'None'}</div>
            <div>더 있음: {userProfile.hasMorePosts ? 'Yes' : 'No'}</div>
            <div>다음 커서: {userProfile.nextPostCursor || 'None'}</div>
            <div>자동 로드: {enableAutoLoad ? 'Yes' : 'No'}</div>
            <div>페이지 크기: {postsPerPage}</div>
            <div>로딩 중: {isLoadingMore ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AuthGuard requireOwnership={isOwnProfile}>
      {renderContent()}
      
      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all duration-300 ${
            toastMessage.type === 'success' ? 'bg-green-500' : 
            toastMessage.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}>
            {toastMessage.message}
          </div>
        </div>
      )}

      {/* 🔥 프로필 편집 모달 */}
      {userProfile && (
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={closeProfileEditModal}
          onSave={handleProfileSave}
          currentData={{
            name: userProfile.name,
            email: userProfile.email
          }}
        />
      )}
    </AuthGuard>
  );
};

export default MyProfile;

// ============================================================================
// 🔥 추가 유틸리티 함수들 (export)
// ============================================================================

// 외부에서 사용할 수 있는 프로필 로더 함수
export const loadProfileByAccountName = async (accountName: string): Promise<UserProfile | null> => {
  try {
    const [userInfo, feedData, followCounts] = await Promise.allSettled([
      profileAPI.getUserInfo(accountName),
      profileAPI.getUserFeedWithPosts(accountName, 12),
      profileAPI.getFollowCounts(accountName)
    ]);

    if (userInfo.status === 'fulfilled' && feedData.status === 'fulfilled') {
      return convertToUserProfile(
        feedData.value,
        userInfo.value,
        followCounts.status === 'fulfilled' ? followCounts.value : undefined,
        undefined,
        false
      );
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load profile by account name:', error);
    return null;
  }
};

// 외부에서 사용할 수 있는 내 프로필 로더 함수
export const loadMyProfile = async (): Promise<UserProfile | null> => {
  try {
    const [userInfo, myStats] = await Promise.allSettled([
      profileAPI.getMyInfo(),
      profileAPI.getMyFeedStats()
    ]);

    if (userInfo.status === 'fulfilled') {
      const feedData = await profileAPI.getUserFeedWithPostsById(
        userInfo.value.userId, 
        12
      );

      return convertToUserProfile(
        feedData,
        userInfo.value,
        undefined,
        myStats.status === 'fulfilled' ? myStats.value : undefined,
        true
      );
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load my profile:', error);
    return null;
  }
};

// 🔥 백엔드 API 함수들도 export (다른 컴포넌트에서 재사용 가능)
export { profileAPI };
export type { 
  UserProfile, 
  PostResponse, 
  FeedWithPostsResponse, 
  FollowCountsResponse, 
  MyFeedStatsResponse,
  UserResponse,
  ApiResponse
};
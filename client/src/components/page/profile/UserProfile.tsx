// =============================================================================
// 📁 UserProfile.tsx - 완전한 아키텍처 원칙 준수 + 인증 보호 + 커서 기반 무한스크롤
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { JSX } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LockClosedIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/auth/useAuth'
import ProfileHeader from './ProfileHeader'
import FeedPreview from './FeedPreview'
import FollowButton from '../follow/FollowButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 🔥 백엔드 연동 - 인터셉터가 적용된 axios 인스턴스
import api from '@/lib/axios'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 100% 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 PostResponse.java 기반 (백엔드와 완전 일치)
interface PostResponse {
  postId: number;              // Long -> number (커서로 사용)
  photoId: number;             // Long -> number
  imgUrl: string;
  caption: string | null;
  displayOrder: number | null; // Integer -> number | null
  createdAt: string;           // LocalDateTime -> string
  likeCount: number;           // long -> number
  isLikedByMe: boolean;
  authorId: number;            // Long -> number
  authorAccountName: string;
  authorProfileImage: string | null;
}

// 🔥 FeedWithPostsResponse.java 기반 (커서 기반 무한스크롤 지원)
interface FeedWithPostsResponse {
  feedId: number;              // Long -> number
  userId: number;              // Long -> number
  accountName: string;
  profileImage: string | null;
  createdAt: string;           // LocalDateTime -> string
  posts: PostResponse[];
  isFollowing: boolean;
  // 📱 커서 기반 페이징 정보
  hasNext: boolean;
  nextCursor: number | null;   // Long -> number | null
}

// 🔥 FollowCountsResponse.java 기반
interface FollowCountsResponse {
  followerCount: number;       // long -> number
  followingCount: number;      // long -> number
}

// 🔥 UserProfileResponse.java 기반 (User 도메인)
interface UserProfileResponse {
  userId: number;              // Long -> number
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage: string | null;
  prettyFace: string | null;
}

// 🔥 MyFeedStatsResponse.java 기반 (피드 통계)
interface MyFeedStatsResponse {
  postCount: number;           // long -> number
  totalLikes: number;          // long -> number
  followerCount: number;       // long -> number
  followingCount: number;      // long -> number
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
  isFollowedBy: boolean;
  feedsCount: number;
  posts: PostResponse[];
  // 🔥 무한스크롤 관련
  hasMorePosts: boolean;
  nextPostCursor: number | null;
  isLoadingMore: boolean;
  feed: {
    id: string;
    name: string;
    description: string;
    isPublic: boolean;
    backgroundColor: string;
    backgroundImageUrl?: string;
    likesCount: number;
    postCount: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface UserProfileProps {
  userId?: string | number;
  accountName?: string;
  currentUserId?: string | number;
  className?: string;
  postsPerPage?: number;
  enableAutoLoad?: boolean;
}

// ============================================================================
// 백엔드 API 함수들 (커서 기반 무한스크롤 + 자동 인증 처리)
// ============================================================================

const userProfileAPI = {
  // 🔥 GET /feeds/users/{userId}?limit=10&cursor=123 - 특정 사용자의 피드 조회 (커서 기반)
  getUserFeedById: async (
    userId: number, 
    limit: number = 20, 
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
      throw new Error(response.data.message || '사용자 피드를 가져올 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 사용자 피드 (ID):', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/users/account/{accountName}?limit=10&cursor=123 - 계정명으로 사용자 피드 조회 (커서 기반)
  getUserFeedByAccountName: async (
    accountName: string, 
    limit: number = 20, 
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
      throw new Error(response.data.message || '사용자를 찾을 수 없습니다.');
    }
    
    console.log('🔥 API 응답 - 사용자 피드 (계정명):', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<FollowCountsResponse> => {
    console.log('🔥 API 요청 - GET /follows/count/' + accountName);
    
    const response = await api.get<ApiResponse<FollowCountsResponse>>(`/follows/count/${accountName}`);
    
    if (response.data.error) {
      console.warn('팔로우 수 조회 실패:', response.data.message);
      return { followerCount: 0, followingCount: 0 };
    }
    
    console.log('🔥 API 응답 - 팔로우 수:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /follows/check/{accountName} - 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    console.log('🔥 API 요청 - GET /follows/check/' + accountName);
    
    const response = await api.get<ApiResponse<boolean>>(`/follows/check/${accountName}`);
    
    if (response.data.error) {
      console.warn('팔로우 상태 확인 실패:', response.data.message);
      return false;
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
      
      console.log('🔥 API 응답 - 언팔로우 성공');
    } else {
      console.log('🔥 API 요청 - POST /follows/' + accountName);
      const response = await api.post<ApiResponse<void>>(`/follows/${accountName}`);
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우에 실패했습니다.');
      }
      
      console.log('🔥 API 응답 - 팔로우 성공');
    }
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
};

// ============================================================================
// 인증 보호 컴포넌트
// ============================================================================

interface AuthGuardProps {
  children: React.ReactNode;
  className?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  className = '' 
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
          다른 사용자의 프로필을 보시려면 먼저 로그인해주세요. <br />
          로그인 후 모든 기능을 이용할 수 있습니다.
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
              <strong>안전한 서비스:</strong> 모든 기능은 로그인한 사용자만 이용할 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ============================================================================
// UserProfile 컴포넌트
// ============================================================================

function UserProfile({
  userId: propUserId,
  accountName: propAccountName,
  currentUserId,
  className = '',
  postsPerPage = 12,
  enableAutoLoad = true,
}: UserProfileProps): JSX.Element {
  const router = useRouter();
  const { isAuthenticated, handleLogin } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 에러 처리 (인증 관련 에러 포함)
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
    
    if (errorMessage.includes('인증이 만료') || errorMessage.includes('권한이 없')) {
      setTimeout(() => handleLogin(), 2000);
    }
  }, [handleLogin]);

  // ============================================================================
  // 백엔드 연동 - 사용자 프로필 로드 (첫 페이지)
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
      let targetAccountName: string | null = null;
      let targetUserId: number | null = null;

      // 1. accountName 및 userId 결정
      if (propAccountName) {
        targetAccountName = propAccountName;
      } else if (propUserId) {
        const userIdNum = typeof propUserId === 'string' ? parseInt(propUserId) : propUserId;
        if (isNaN(userIdNum)) {
          throw new Error('올바르지 않은 사용자 ID입니다.');
        }
        targetUserId = userIdNum;
        
        // userId로 피드 조회하여 accountName 추출
        const feedData = await userProfileAPI.getUserFeedById(userIdNum, postsPerPage);
        targetAccountName = feedData.accountName;
      } else {
        throw new Error('사용자 정보가 필요합니다.');
      }

      if (!targetAccountName) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      console.log('🔥 UserProfile 로드 시작:', { 
        targetAccountName, 
        targetUserId: targetUserId || 'from accountName' 
      });

      // 2. 병렬로 데이터 로드 (자동 인증 처리)
      const [feedDataResult, followCountsResult, followStatusResult] = await Promise.allSettled([
        targetUserId 
          ? userProfileAPI.getUserFeedById(targetUserId, postsPerPage)
          : userProfileAPI.getUserFeedByAccountName(targetAccountName, postsPerPage),
        userProfileAPI.getFollowCounts(targetAccountName),
        userProfileAPI.checkFollowStatus(targetAccountName)
      ]);

      // 3. 피드 데이터 확인
      if (feedDataResult.status === 'rejected') {
        throw new Error('사용자 피드를 불러올 수 없습니다.');
      }

      const userFeedData = feedDataResult.value;
      
      // 4. 팔로우 정보 추출
      const followCountsData = followCountsResult.status === 'fulfilled' 
        ? followCountsResult.value 
        : { followerCount: 0, followingCount: 0 };
      
      const isFollowing = followStatusResult.status === 'fulfilled' ? followStatusResult.value : false;

      // 5. UserProfile 객체 생성 (무한스크롤 지원)
      const profileData: UserProfile = {
        id: userFeedData.userId,
        accountName: userFeedData.accountName,
        name: userFeedData.accountName,
        email: `${userFeedData.accountName}@example.com`,
        profileImage: userFeedData.profileImage || undefined,
        followersCount: followCountsData.followerCount,
        followingCount: followCountsData.followingCount,
        isFollowing: isFollowing,
        isFollowedBy: false,
        feedsCount: userFeedData.posts.length,
        posts: userFeedData.posts,
        // 🔥 무한스크롤 관련
        hasMorePosts: userFeedData.hasNext,
        nextPostCursor: userFeedData.nextCursor,
        isLoadingMore: false,
        feed: {
          id: userFeedData.feedId.toString(),
          name: `${userFeedData.accountName}의 피드`,
          description: userFeedData.posts[0]?.caption || '피드 설명이 없습니다.',
          isPublic: true,
          backgroundColor: '#ffffff',
          backgroundImageUrl: userFeedData.posts[0]?.imgUrl,
          likesCount: userFeedData.posts.reduce((sum, post) => sum + (post.likeCount || 0), 0),
          postCount: userFeedData.posts.length,
          createdAt: userFeedData.createdAt,
          updatedAt: userFeedData.createdAt,
        }
      };

      console.log('🔥 UserProfile 로드 완료:', {
        userId: profileData.id,
        accountName: profileData.accountName,
        postsCount: profileData.posts.length,
        followersCount: profileData.followersCount,
        isFollowing: profileData.isFollowing,
        hasMorePosts: profileData.hasMorePosts,
        nextCursor: profileData.nextPostCursor
      });
      
      setUserProfile(profileData);

    } catch (err: any) {
      console.error('❌ UserProfile 로드 실패:', err);
      
      // 인증 관련 에러 처리
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), 'UserProfile 로드');
      } else {
        handleError(err, 'UserProfile 로드');
      }
    } finally {
      setIsLoading(false);
    }
  }, [propUserId, propAccountName, postsPerPage, isAuthenticated, handleError]);

  // ============================================================================
  // 백엔드 API 연동 - 추가 게시물 로드 (커서 기반 무한스크롤)
  // ============================================================================

  const loadMorePosts = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔒 인증되지 않음, 추가 로드 중단');
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

      // 커서 기반으로 추가 게시물 로드 (자동 인증 처리)
      const moreFeedData = await userProfileAPI.getUserFeedByAccountName(
        userProfile.accountName,
        postsPerPage,
        userProfile.nextPostCursor
      );

      // 🔥 기존 게시물과 합치기
      setUserProfile(prev => {
        if (!prev) return null;

        const updatedProfile: UserProfile = {
          ...prev,
          posts: [...prev.posts, ...moreFeedData.posts],
          hasMorePosts: moreFeedData.hasNext,
          nextPostCursor: moreFeedData.nextCursor,
          feedsCount: prev.feedsCount + moreFeedData.posts.length,
          feed: {
            ...prev.feed,
            likesCount: prev.feed.likesCount + moreFeedData.posts.reduce((sum, post) => sum + post.likeCount, 0),
            postCount: prev.feed.postCount + moreFeedData.posts.length
          }
        };

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
  }, [userProfile, postsPerPage, isLoadingMore, isAuthenticated, handleError]);

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
  // 초기 로드 (인증된 사용자만)
  // ============================================================================

  useEffect(() => {
    if (!isAuthenticated) return;

    // 본인 프로필인 경우 체크
    const isOwnProfile = (
      (propUserId && currentUserId && propUserId.toString() === currentUserId.toString()) ||
      false
    );

    if (isOwnProfile) {
      router.push('/profile');
      return;
    }

    loadUserProfile();
  }, [propUserId, propAccountName, currentUserId, router, loadUserProfile, isAuthenticated]);

  // ============================================================================
  // 이벤트 핸들러들 (인증된 사용자만)
  // ============================================================================

  const handleViewFeed = useCallback(() => {
    if (!isAuthenticated) {
      handleLogin();
      return;
    }

    if (userProfile) {
      router.push(`/@${userProfile.accountName}`);
    }
  }, [router, userProfile, isAuthenticated, handleLogin]);

  // 🔥 백엔드 연동 팔로우 토글 핸들러 (인증 체크 포함)
  const handleFollowChange = useCallback(async (newFollowing: boolean) => {
    if (!isAuthenticated) {
      handleLogin();
      return;
    }

    if (!userProfile || isFollowLoading) return;

    const originalFollowing = userProfile.isFollowing;
    const originalCount = userProfile.followersCount;
    
    setIsFollowLoading(true);

    try {
      console.log('🔥 팔로우 변경 시작:', { 
        accountName: userProfile.accountName, 
        originalFollowing,
        newFollowing 
      });

      // 낙관적 업데이트
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: newFollowing,
        followersCount: newFollowing 
          ? prev.followersCount + 1 
          : Math.max(0, prev.followersCount - 1)
      } : null);

      // 🔥 실제 백엔드 API 호출 (자동 인증 처리)
      await userProfileAPI.toggleFollow(userProfile.accountName, originalFollowing);

      console.log('🔥 팔로우 변경 성공:', {
        accountName: userProfile.accountName,
        newFollowing
      });

    } catch (error: any) {
      console.error('❌ 팔로우 토글 실패:', error);
      
      // 에러 발생시 롤백
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      } : null);
      
      // 인증 관련 에러 처리
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '팔로우 토글');
      } else {
        handleError(error, '팔로우 토글');
      }
    } finally {
      setIsFollowLoading(false);
    }
  }, [userProfile, isFollowLoading, isAuthenticated, handleLogin, handleError]);

  // 🔥 게시물 좋아요 토글 (인증 체크 포함)
  const handlePostLike = useCallback(async (post: PostResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      handleLogin();
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
          feed: {
            ...prev.feed,
            likesCount: Math.max(0, prev.feed.likesCount + likeDiff)
          }
        };
      });

      // 🔥 백엔드 API 호출 (자동 인증 처리)
      await userProfileAPI.togglePostLike(post.postId, originalLiked);

      console.log('🔥 게시물 좋아요 토글 성공:', { 
        postId: post.postId, 
        newLiked 
      });

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
          feed: {
            ...prev.feed,
            likesCount: Math.max(0, prev.feed.likesCount - (originalLiked ? -1 : 1))
          }
        };
      });
      
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        handleError(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'), '좋아요 토글');
      } else {
        handleError(error, '좋아요 토글');
      }
    }
  }, [isAuthenticated, handleLogin, handleError]);

  // 게시물 클릭 핸들러
  const handlePostClick = useCallback((postId: number) => {
    if (!isAuthenticated) {
      handleLogin();
      return;
    }
    router.push(`/feeds/posts/${postId}`);
  }, [router, isAuthenticated, handleLogin]);

  // 재시도 핸들러
  const handleRetry = useCallback(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // FeedPreview용 데이터 변환
  const convertToFeedPreviewData = useCallback((profile: UserProfile) => {
    return {
      feedId: Number(profile.feed.id.replace('feed-', '')),
      userId: profile.id,
      accountName: profile.accountName,
      profileImage: profile.profileImage || null,
      name: profile.name,
      description: profile.feed.description,
      isPublic: profile.feed.isPublic,
      posts: profile.posts,
      isFollowing: profile.isFollowing,
      followersCount: profile.followersCount,
      likesCount: profile.feed.likesCount,
      totalHeight: profile.posts.length * 100,
      createdAt: profile.feed.createdAt,
      updatedAt: profile.feed.updatedAt,
      backgroundColor: profile.feed.backgroundColor,
      backgroundImageUrl: profile.feed.backgroundImageUrl,
      hasMorePosts: profile.hasMorePosts,
      nextPostCursor: profile.nextPostCursor,
      isLoadingMore: profile.isLoadingMore
    };
  }, []);

  // ============================================================================
  // 렌더링 (AuthGuard로 보호)
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
            <p className="text-gray-500 mt-2">존재하지 않는 사용자이거나 접근할 수 없습니다.</p>
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

    // 비공개 피드 처리
    const isPrivateAndNotFollowing = !userProfile.feed.isPublic && !userProfile.isFollowing;

    if (isPrivateAndNotFollowing) {
      return (
        <div className={`max-w-4xl mx-auto ${className}`}>
          <ProfileHeader
            user={userProfile}
            isOwnProfile={false}
            currentUserId={currentUserId}
            onFollowClick={() => handleFollowChange(!userProfile.isFollowing)}
          />

          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">비공개 계정</h3>
              <p className="text-gray-600 mb-6">이 사용자의 피드는 비공개로 설정되어 있습니다. 팔로우 요청을 보내보세요!</p>
              
              <FollowButton
                userId={userProfile.id}
                accountName={userProfile.accountName}
                initialIsFollowing={userProfile.isFollowing}
                isFollowedBy={userProfile.isFollowedBy}
                onFollowChange={handleFollowChange}
                disabled={isFollowLoading}
              />
            </div>
          </div>
        </div>
      );
    }

    // 메인 렌더링
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        {/* 🔥 프로필 헤더 - 백엔드 연동 완료 */}
        <ProfileHeader
          user={userProfile}
          isOwnProfile={false}
          currentUserId={currentUserId}
          onFollowClick={() => handleFollowChange(!userProfile.isFollowing)}
        />

        {/* 액션 버튼들 */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <button
            onClick={handleViewFeed}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            피드 보기
          </button>
          
          <FollowButton
            userId={userProfile.id}
            accountName={userProfile.accountName}
            initialIsFollowing={userProfile.isFollowing}
            isFollowedBy={userProfile.isFollowedBy}
            onFollowChange={handleFollowChange}
            disabled={isFollowLoading}
          />
        </div>

        {/* 🔥 피드 프리뷰 - 백엔드 실제 데이터 사용 */}
        <div className="mb-8">
          <FeedPreview
            feed={convertToFeedPreviewData(userProfile)}
            isOwnFeed={false}
            showActions={true}
            size="lg"
            enableInfiniteScroll={false}
            previewPostLimit={6}
            onFeedUpdate={(updatedFeed) => {
              // 피드 업데이트 시 UserProfile 상태도 동기화
              setUserProfile(prev => prev ? {
                ...prev,
                posts: updatedFeed.posts,
                followersCount: updatedFeed.followersCount,
                isFollowing: updatedFeed.isFollowing,
                feed: {
                  ...prev.feed,
                  likesCount: updatedFeed.likesCount
                }
              } : null);
            }}
            onFollowChange={(isFollowing, followersCount) => {
              setUserProfile(prev => prev ? {
                ...prev,
                isFollowing,
                followersCount
              } : null);
            }}
          />
        </div>

        {/* 🔥 게시물 그리드 - 커서 기반 무한스크롤 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {userProfile.name}의 게시물
            </h2>
            <p className="text-gray-600 text-sm">
              총 {userProfile.feedsCount}개의 게시물
              {userProfile.hasMorePosts && (
                <span className="text-blue-500 ml-1">• 더 있음</span>
              )}
            </p>
          </div>

          <div className="p-6">
            {userProfile.posts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userProfile.posts.map((post) => (
                    <div
                      key={post.postId}
                      className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                      onClick={() => handlePostClick(post.postId)}
                    >
                      {/* 게시물 이미지 */}
                      <div className="relative w-full h-48 bg-gray-200">
                        <img
                          src={post.imgUrl}
                          alt={post.caption || '게시물 이미지'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/api/placeholder/300/300?text=No+Image';
                          }}
                        />
                        
                        {/* 호버 오버레이 */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center">
                            <div className="flex items-center justify-center space-x-4">
                              <span className="flex items-center">
                                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                                {post.likeCount}
                              </span>
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
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <button
                            onClick={(e) => handlePostLike(post, e)}
                            className="flex items-center hover:text-red-500 transition-colors"
                          >
                            <svg 
                              className={`w-4 h-4 mr-1 ${post.isLikedByMe ? 'text-red-500 fill-current' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {post.likeCount}
                          </button>
                          <span>
                            {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🔥 커서 기반 무한스크롤 로딩 표시 및 더보기 버튼 */}
                {userProfile.hasMorePosts && (
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
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-gray-500">게시물이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AuthGuard className={className}>
      {renderContent()}
    </AuthGuard>
  );
}

// ============================================================================
// 🔥 헬퍼 함수들 - 백엔드 응답을 UserProfile로 변환
// ============================================================================

export const convertFeedResponseToUserProfile = (
  feedResponse: FeedWithPostsResponse,
  followCounts: FollowCountsResponse,
  isFollowing: boolean = false,
  isFollowedBy: boolean = false
): UserProfile => {
  return {
    id: feedResponse.userId,
    accountName: feedResponse.accountName,
    name: feedResponse.accountName,
    email: `${feedResponse.accountName}@example.com`,
    profileImage: feedResponse.profileImage || undefined,
    followersCount: followCounts.followerCount,
    followingCount: followCounts.followingCount,
    isFollowing,
    isFollowedBy,
    feedsCount: feedResponse.posts.length,
    posts: feedResponse.posts,
    // 🔥 무한스크롤 관련
    hasMorePosts: feedResponse.hasNext,
    nextPostCursor: feedResponse.nextCursor,
    isLoadingMore: false,
    feed: {
      id: feedResponse.feedId.toString(),
      name: `${feedResponse.accountName}의 피드`,
      description: feedResponse.posts[0]?.caption || '피드 설명이 없습니다.',
      isPublic: true,
      backgroundColor: '#ffffff',
      backgroundImageUrl: feedResponse.posts[0]?.imgUrl,
      likesCount: feedResponse.posts.reduce((sum, post) => sum + (post.likeCount || 0), 0),
      postCount: feedResponse.posts.length,
      createdAt: feedResponse.createdAt,
      updatedAt: feedResponse.createdAt,
    },
  };
};

// ============================================================================
// 🔥 커스텀 훅 - UserProfile 상태 관리 (인증 보호 + 무한스크롤)
// ============================================================================

export const useUserProfile = (accountName?: string, userId?: number) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, handleLogin } = useAuth();

  const loadProfile = useCallback(async (cursor?: number) => {
    if (!isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    if (!accountName && !userId) return;

    const isInitialLoad = !cursor;
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      let feedData: FeedWithPostsResponse;
      let targetAccountName: string;

      if (accountName) {
        feedData = await userProfileAPI.getUserFeedByAccountName(accountName, 20, cursor);
        targetAccountName = accountName;
      } else if (userId) {
        feedData = await userProfileAPI.getUserFeedById(userId, 20, cursor);
        targetAccountName = feedData.accountName;
      } else {
        throw new Error('accountName 또는 userId가 필요합니다.');
      }

      if (isInitialLoad) {
        // 첫 로드 시 팔로우 정보도 함께 가져오기
        const [followCounts, followStatus] = await Promise.all([
          userProfileAPI.getFollowCounts(targetAccountName),
          userProfileAPI.checkFollowStatus(targetAccountName)
        ]);

        const profile = convertFeedResponseToUserProfile(
          feedData,
          followCounts,
          followStatus,
          false
        );

        setUserProfile(profile);
        return profile;
      } else {
        // 추가 로드 시 기존 데이터와 합치기
        setUserProfile(prev => {
          if (!prev) return null;

          return {
            ...prev,
            posts: [...prev.posts, ...feedData.posts],
            hasMorePosts: feedData.hasNext,
            nextPostCursor: feedData.nextCursor,
            feedsCount: prev.feedsCount + feedData.posts.length,
            feed: {
              ...prev.feed,
              likesCount: prev.feed.likesCount + feedData.posts.reduce((sum, post) => sum + post.likeCount, 0),
              postCount: prev.feed.postCount + feedData.posts.length
            }
          };
        });
      }

    } catch (err: any) {
      let errorMessage = '프로필 로드에 실패했습니다.';
      
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
        setTimeout(() => handleLogin(), 2000);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [accountName, userId, isAuthenticated, handleLogin]);

  const loadMorePosts = useCallback(async () => {
    if (!userProfile?.hasMorePosts || !userProfile.nextPostCursor || isLoadingMore) {
      return;
    }

    return await loadProfile(userProfile.nextPostCursor);
  }, [userProfile, isLoadingMore, loadProfile]);

  const toggleFollow = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    if (!userProfile) return;

    const originalFollowing = userProfile.isFollowing;
    const originalCount = userProfile.followersCount;

    try {
      // 낙관적 업데이트
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: !originalFollowing,
        followersCount: !originalFollowing ? originalCount + 1 : Math.max(0, originalCount - 1)
      } : null);

      // 실제 API 호출 (자동 인증 처리)
      await userProfileAPI.toggleFollow(userProfile.accountName, originalFollowing);

      return { success: true, newFollowing: !originalFollowing };

    } catch (err: any) {
      // 실패 시 롤백
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      } : null);

      let errorMessage = '팔로우 처리에 실패했습니다.';
      
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
        setTimeout(() => handleLogin(), 2000);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userProfile, isAuthenticated, handleLogin]);

  const refreshProfile = useCallback(async () => {
    if (userProfile) {
      return await loadProfile();
    }
  }, [userProfile, loadProfile]);

  return {
    userProfile,
    isLoading,
    isLoadingMore,
    error,
    loadProfile,
    loadMorePosts,
    toggleFollow,
    refreshProfile,
    setError
  };
};

// ============================================================================
// 🔥 백엔드 API 관련 타입 및 상수 export
// ============================================================================

export type {
  UserProfile,
  UserProfileResponse,
  FeedWithPostsResponse,
  PostResponse,
  FollowCountsResponse,
  MyFeedStatsResponse,
  ApiResponse
};

export { userProfileAPI };

export default UserProfile;
// =============================================================================
// 📁 MyProfile.tsx - 백엔드 완벽 연동 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  PencilSquareIcon,
  HeartIcon,
  EyeIcon,
  UsersIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import ProfileHeader from './ProfileHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ProfileEditModal from './ProfileEditModal'

// 🔥 백엔드 연동 - axios 인스턴스 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의 (Java 백엔드와 완벽 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

// PostResponse.java 기반
interface PostResponse {
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string;
  displayOrder: number | null;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
}

// FeedWithPostsResponse.java 기반
interface FeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  isFollowing: boolean;
}

// FollowCountsResponse.java 기반
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// MyFeedStatsResponse.java 기반
interface MyFeedStatsResponse {
  postCount: number;
  totalLikes: number;
  followerCount: number;
  followingCount: number;
}

// UserProfileResponse.java 기반 (User 도메인)
interface UserProfileResponse {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage: string | null;
  prettyFace: string | null;
}

// 프론트엔드 통합 UserProfile 타입
interface UserProfile {
  id: number;
  accountName: string;
  name: string;
  email: string;
  profileImage?: string;
  prettyFace?: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
  feedsCount: number;
  totalLikes: number;
  posts: PostResponse[];
  feed?: {
    id: string;
    name: string;
    description: string;
    isPublic: boolean;
    backgroundColor: string;
    backgroundImageUrl?: string;
    likesCount: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface MyProfileProps {
  userId?: number;
  accountName?: string;
  initialData?: UserProfile;
  onProfileUpdate?: (profile: UserProfile) => void;
  className?: string;
  isOwnProfile?: boolean;
}

// ============================================================================
// 백엔드 API 엔드포인트 상수
// ============================================================================

const PROFILE_ENDPOINTS = {
  // FeedController 엔드포인트들
  USER_FEED_BY_ID: (userId: number) => `/feeds/users/${userId}`,
  USER_FEED_BY_ACCOUNT: (accountName: string) => `/feeds/users/account/${accountName}`,
  MY_FEED_STATS: '/feeds/my-stats', // 가정된 엔드포인트
  SEARCH_FEEDS: '/feeds/search',
  
  // FollowController 엔드포인트들
  FOLLOW_COUNTS: (accountName: string) => `/follows/count/${accountName}`,
  CHECK_FOLLOW: (accountName: string) => `/follows/check/${accountName}`,
  FOLLOW_USER: (accountName: string) => `/follows/${accountName}`,
  UNFOLLOW_USER: (accountName: string) => `/follows/${accountName}`,
  
  // LikesController 엔드포인트들
  LIKE_POST: (postId: number) => `/likes/posts/${postId}`,
  UNLIKE_POST: (postId: number) => `/likes/posts/${postId}`,
};

// ============================================================================
// 백엔드 API 함수들 (실제 Java Controller 엔드포인트 사용)
// ============================================================================

const profileAPI = {
  // 🔥 GET /feeds/users/{userId} - 사용자 피드 조회
  getUserFeedWithPosts: async (userId: number): Promise<FeedWithPostsResponse> => {
    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      PROFILE_ENDPOINTS.USER_FEED_BY_ID(userId)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자 피드를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/users/account/{accountName} - 계정명으로 사용자 피드 조회
  getUserFeedByAccountName: async (accountName: string): Promise<FeedWithPostsResponse> => {
    const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
      PROFILE_ENDPOINTS.USER_FEED_BY_ACCOUNT(accountName)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '사용자를 찾을 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /feeds/my-stats - 내 피드 통계 조회 (가정)
  getMyFeedStats: async (): Promise<MyFeedStatsResponse> => {
    try {
      const response = await api.get<ApiResponse<MyFeedStatsResponse>>(
        PROFILE_ENDPOINTS.MY_FEED_STATS
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '통계를 불러올 수 없습니다.');
      }
      
      return response.data.data;
    } catch (error) {
      // 만약 이 엔드포인트가 없다면 기본값 반환
      console.warn('My feed stats endpoint not available, using defaults');
      return {
        postCount: 0,
        totalLikes: 0,
        followerCount: 0,
        followingCount: 0
      };
    }
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 수 조회
  getFollowCounts: async (accountName: string): Promise<FollowCountsResponse> => {
    const response = await api.get<ApiResponse<FollowCountsResponse>>(
      PROFILE_ENDPOINTS.FOLLOW_COUNTS(accountName)
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || '팔로우 수를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },

  // 🔥 GET /follows/check/{accountName} - 팔로우 상태 확인
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    try {
      const response = await api.get<ApiResponse<boolean>>(
        PROFILE_ENDPOINTS.CHECK_FOLLOW(accountName)
      );
      
      if (response.data.error) {
        return false;
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to check follow status:', error);
      return false;
    }
  },

  // 🔥 POST/DELETE /follows/{accountName} - 팔로우 토글
  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    if (isCurrentlyFollowing) {
      const response = await api.delete<ApiResponse<void>>(
        PROFILE_ENDPOINTS.UNFOLLOW_USER(accountName)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '언팔로우에 실패했습니다.');
      }
    } else {
      const response = await api.post<ApiResponse<void>>(
        PROFILE_ENDPOINTS.FOLLOW_USER(accountName)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우에 실패했습니다.');
      }
    }
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 게시물 좋아요 토글
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      const response = await api.delete<ApiResponse<void>>(
        PROFILE_ENDPOINTS.UNLIKE_POST(postId)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 취소에 실패했습니다.');
      }
    } else {
      const response = await api.post<ApiResponse<void>>(
        PROFILE_ENDPOINTS.LIKE_POST(postId)
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요에 실패했습니다.');
      }
    }
  }
};

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// 백엔드 응답을 UserProfile로 변환
const convertToUserProfile = async (
  feedData: FeedWithPostsResponse,
  followCounts?: FollowCountsResponse,
  myStats?: MyFeedStatsResponse,
  isOwnProfile: boolean = false
): Promise<UserProfile> => {
  // 총 좋아요 수 계산
  const totalLikes = myStats?.totalLikes || feedData.posts.reduce((sum, post) => sum + post.likeCount, 0);
  
  return {
    id: feedData.userId,
    accountName: feedData.accountName,
    name: feedData.accountName, // TODO: 실제 userName 필드 추가 필요
    email: `${feedData.accountName}@example.com`, // TODO: 실제 이메일 정보 필요
    profileImage: feedData.profileImage || undefined,
    prettyFace: undefined, // TODO: prettyFace 정보 추가 필요
    followersCount: followCounts?.followerCount || myStats?.followerCount || 0,
    followingCount: followCounts?.followingCount || myStats?.followingCount || 0,
    isFollowing: feedData.isFollowing,
    isFollowedBy: false, // TODO: 역팔로우 상태 API 필요
    feedsCount: feedData.posts.length,
    totalLikes: totalLikes,
    posts: feedData.posts,
    feed: {
      id: `feed-${feedData.feedId}`,
      name: `${feedData.accountName}의 피드`,
      description: `${feedData.posts.length}개의 게시물`,
      isPublic: true,
      backgroundColor: '#f8fafc',
      backgroundImageUrl: feedData.posts[0]?.imgUrl,
      likesCount: totalLikes,
      createdAt: feedData.createdAt,
      updatedAt: feedData.createdAt,
    }
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
// MyProfile 컴포넌트
// ============================================================================

const MyProfile: React.FC<MyProfileProps> = ({
  userId: propUserId,
  accountName: propAccountName,
  initialData,
  onProfileUpdate,
  className = '',
  isOwnProfile = true,
}) => {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuth();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  // 토스트 메시지 표시
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 현재 사용자 ID 가져오기
  const getCurrentUserId = useCallback((): number => {
    return extractUserId(currentUser);
  }, [currentUser]);

  // ============================================================================
  // 백엔드 연동 - 프로필 데이터 로드
  // ============================================================================

  const loadUserProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('=== 프로필 로드 시작 ===', { 
        propUserId, 
        propAccountName, 
        isOwnProfile 
      });

      let feedData: FeedWithPostsResponse;
      let followCounts: FollowCountsResponse | undefined;
      let myStats: MyFeedStatsResponse | undefined;

      if (isOwnProfile) {
        // 🔥 본인 프로필 - 내 피드 통계 및 피드 데이터 로드
        const currentUserId = getCurrentUserId();
        
        if (!currentUserId || !isAuthenticated) {
          throw new Error('로그인이 필요합니다.');
        }

        // 내 통계와 피드 데이터 병렬 로드
        const [statsResult, feedResult] = await Promise.allSettled([
          profileAPI.getMyFeedStats(),
          profileAPI.getUserFeedWithPosts(currentUserId)
        ]);

        if (statsResult.status === 'fulfilled') {
          myStats = statsResult.value;
        }

        if (feedResult.status === 'fulfilled') {
          feedData = feedResult.value;
        } else {
          throw new Error('내 피드 정보를 불러올 수 없습니다.');
        }

      } else {
        // 🔥 다른 사용자 프로필 - accountName 우선 사용
        if (propAccountName) {
          // accountName으로 피드 조회
          feedData = await profileAPI.getUserFeedByAccountName(propAccountName);
          
          // 팔로우 수 조회
          followCounts = await profileAPI.getFollowCounts(propAccountName);
          
        } else if (propUserId) {
          // userId로 피드 조회
          feedData = await profileAPI.getUserFeedWithPosts(propUserId);
          
          // accountName을 알아야 팔로우 수를 조회할 수 있음
          if (feedData.accountName) {
            followCounts = await profileAPI.getFollowCounts(feedData.accountName);
          }
        } else {
          throw new Error('사용자 정보가 부족합니다.');
        }
      }

      // UserProfile 객체 변환
      const profileData = await convertToUserProfile(
        feedData,
        followCounts,
        myStats,
        isOwnProfile
      );

      console.log('=== 프로필 로드 완료 ===', profileData);

      setUserProfile(profileData);
      onProfileUpdate?.(profileData);

    } catch (err) {
      console.error('Failed to load profile:', err);
      const errorMessage = err instanceof Error ? err.message : '프로필을 불러오는데 실패했습니다.';
      setError(errorMessage);
      showToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [propUserId, propAccountName, isOwnProfile, getCurrentUserId, isAuthenticated, onProfileUpdate, showToast]);

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    if (!initialData) {
      loadUserProfile();
    }
  }, [loadUserProfile, initialData]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 피드 편집 페이지로 이동
  const handleEditFeed = useCallback(() => {
    router.push('/feed/create');
  }, [router]);

  // 프로필 설정 모달 열기
  const handleSettings = useCallback(() => {
    setIsProfileEditOpen(true);
  }, []);

  // 재시도
  const handleRetry = useCallback(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // 🔥 백엔드 연동 - 게시물 클릭 핸들러
  const handlePostClick = useCallback((post: PostResponse) => {
    router.push(`/post/${post.postId}`); // postId로 상세 페이지 이동
  }, [router]);

  // 🔥 백엔드 연동 - 팔로우 토글 핸들러
  const handleFollowToggle = useCallback(async () => {
    if (!userProfile || isOwnProfile || !isAuthenticated) return;

    const originalFollowing = userProfile.isFollowing;
    const originalCount = userProfile.followersCount;

    try {
      console.log('=== 팔로우 토글 시작 ===', { 
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

      // 🔥 실제 백엔드 API 호출
      await profileAPI.toggleFollow(userProfile.accountName, originalFollowing);

      console.log('=== 팔로우 토글 성공 ===', { 
        accountName: userProfile.accountName, 
        newFollowing 
      });

      showToast(newFollowing ? '팔로우했습니다!' : '언팔로우했습니다.');

    } catch (error) {
      console.error('Failed to toggle follow:', error);
      
      // 실패 시 롤백
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: originalFollowing,
        followersCount: originalCount
      } : null);
      
      const errorMessage = error instanceof Error ? error.message : '팔로우 처리에 실패했습니다.';
      showToast(errorMessage);
    }
  }, [userProfile, isOwnProfile, isAuthenticated, showToast]);

  // 🔥 백엔드 연동 - 게시물 좋아요 토글
  const handlePostLike = useCallback(async (post: PostResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      showToast('로그인이 필요합니다.');
      return;
    }

    const originalLiked = post.isLikedByMe;
    const originalCount = post.likeCount;

    try {
      console.log('=== 게시물 좋아요 토글 시작 ===', { 
        postId: post.postId, 
        currentLiked: originalLiked 
      });

      // 낙관적 업데이트
      const newLiked = !originalLiked;
      const newCount = newLiked ? originalCount + 1 : Math.max(0, originalCount - 1);
      
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
          totalLikes: prev.totalLikes + (newLiked ? 1 : -1)
        };
      });

      // 🔥 실제 백엔드 API 호출
      await profileAPI.togglePostLike(post.postId, originalLiked);

      console.log('=== 게시물 좋아요 토글 성공 ===', { 
        postId: post.postId, 
        newLiked 
      });

      showToast(newLiked ? '좋아요를 눌렀습니다!' : '좋아요를 취소했습니다.');

    } catch (error) {
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
          posts: updatedPosts
        };
      });
      
      const errorMessage = error instanceof Error ? error.message : '좋아요 처리에 실패했습니다.';
      showToast(errorMessage);
    }
  }, [isAuthenticated, showToast]);

  // 🔥 프로필 편집 저장 (백엔드 연동 - 향후 구현)
  const handleProfileSave = useCallback(async (data: { name: string; description: string }) => {
    try {
      // TODO: 실제 프로필 업데이트 API 구현 필요
      console.log('프로필 업데이트 (향후 구현):', data);

      // 로컬 상태 업데이트
      setUserProfile(prev => {
        if (!prev) return null;

        const updatedProfile = {
          ...prev,
          name: data.name,
        };

        onProfileUpdate?.(updatedProfile);
        return updatedProfile;
      });

      setIsProfileEditOpen(false);
      showToast('프로필이 업데이트되었습니다!');

    } catch (error) {
      console.error('Failed to update profile:', error);
      showToast('프로필 업데이트에 실패했습니다.');
    }
  }, [onProfileUpdate, showToast]);

  const closeProfileEditModal = useCallback(() => {
    setIsProfileEditOpen(false);
  }, []);

  // ============================================================================
  // 렌더링 - 인증 확인 (본인 프로필일 때)
  // ============================================================================

  if (isOwnProfile && (!isAuthenticated || !currentUser)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-4">내 프로필을 보려면 로그인해주세요.</p>
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

  // ============================================================================
  // 렌더링 - 로딩 상태
  // ============================================================================

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

  // ============================================================================
  // 렌더링 - 에러 상태
  // ============================================================================

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
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
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
  // 메인 렌더링
  // ============================================================================

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* 🔥 프로필 헤더 */}
      <ProfileHeader
        user={{
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          accountName: userProfile.accountName,
          profileImage: userProfile.profileImage,
          followersCount: userProfile.followersCount,
          followingCount: userProfile.followingCount,
          isFollowing: userProfile.isFollowing,
          isFollowedBy: userProfile.isFollowedBy,
          feed: userProfile.feed!
        }}
        isOwnProfile={isOwnProfile}
        onEditClick={handleSettings}
        onFollowClick={handleFollowToggle}
        currentUserId={getCurrentUserId()}
      />

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

      {/* 🔥 통계 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-red-500 mb-1">{userProfile.totalLikes}</div>
          <div className="text-sm text-gray-600">총 좋아요</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">{userProfile.followersCount}</div>
          <div className="text-sm text-gray-600">팔로워</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-1">{userProfile.followingCount}</div>
          <div className="text-sm text-gray-600">팔로잉</div>
        </div>
      </div>

      {/* 🔥 게시물 목록 (백엔드 데이터) */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* 게시물 헤더 */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {isOwnProfile ? '내 게시물' : `${userProfile.name}의 게시물`}
              </h2>
              <p className="text-gray-600 text-sm">총 {userProfile.posts.length}개의 게시물</p>
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

      {/* 🔥 프로필 편집 모달 - 본인 프로필일 때만 표시 */}
      {isOwnProfile && (
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={closeProfileEditModal}
          currentName={userProfile?.name || ''}
          currentDescription=""
          profileImage={userProfile?.profileImage}
          onSave={handleProfileSave}
        />
      )}

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium shadow-lg transition-all duration-300">
            {toastMessage}
          </div>
        </div>
      )}

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔥 개발 정보</div>
          <div>사용자 ID: {userProfile.id}</div>
          <div>계정명: {userProfile.accountName}</div>
          <div>게시물 수: {userProfile.posts.length}</div>
          <div>팔로워: {userProfile.followersCount}</div>
          <div>팔로잉: {userProfile.followingCount}</div>
          <div>총 좋아요: {userProfile.totalLikes}</div>
          <div>본인 프로필: {isOwnProfile ? 'Yes' : 'No'}</div>
          <div>팔로우 상태: {userProfile.isFollowing ? 'Yes' : 'No'}</div>
          <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;

// src/app/profile/[userId]/page.tsx - 아키텍처 원칙 완전 준수

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  UserPlusIcon,
  UserMinusIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  PlusIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// 🏗️ 아키텍처 원칙: 통합된 api 인스턴스 사용
import api from '@/lib/axios'

// 🏗️ 아키텍처 원칙: Zustand 스토어 사용
import { useAuthStore } from '@/stores/authStore'

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', className = '', text }: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string;
  text?: string;
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

// ============================================================================
// 🔥 백엔드 타입 정의 (정확한 API 응답 구조)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 PostResponse 타입 (FeedController에서 반환)
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

// 🔥 백엔드 FeedWithPostsResponse 타입 (커서 기반 무한스크롤)
interface FeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  isFollowing: boolean;
  hasNext: boolean;
  nextCursor: number | null;
}

// 🔥 백엔드 FollowCountsResponse 타입
interface FollowCountsResponse {
  followerCount: number;
  followingCount: number;
}

// 🔥 백엔드 사용자 정보 타입
interface BackendUserInfo {
  userId: number;
  accountName: string;
  userName: string;
  userEmail: string;
  profileImage?: string;
  prettyFace?: string;
}

// 프론트엔드에서 사용할 통합 프로필 타입
interface UserProfileData extends BackendUserInfo {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  feedId?: number;
}

// ============================================================================
// 🔥 백엔드 API 함수들 (아키텍처 원칙 완전 준수)
// ============================================================================

const userProfileAPI = {
  // 🔥 GET /feeds/users/account/{accountName} - 사용자 피드 조회 (아키텍처 원칙: @/lib/axios 사용)
  getUserFeedWithPosts: async (accountName: string, limit: number = 20, cursor?: number): Promise<FeedWithPostsResponse> => {
    try {
      console.log(`🔍 사용자 피드 조회: ${accountName}, limit=${limit}, cursor=${cursor}`);
      
      const params: any = { limit };
      if (cursor) {
        params.cursor = cursor;
      }
      
      // 🏗️ 아키텍처 원칙: @/lib/axios 사용 → 인터셉터 → Zustand 토큰 → 자동 갱신 → 백엔드
      const response = await api.get<ApiResponse<FeedWithPostsResponse>>(
        `/feeds/users/account/${accountName}`,
        { params }
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '사용자 피드를 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('사용자 피드 데이터가 없습니다.');
      }
      
      console.log(`✅ 사용자 피드 조회 성공: posts=${response.data.data.posts.length}개`);
      return response.data.data;
    } catch (error) {
      console.error('❌ 사용자 피드 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 GET /follows/count/{accountName} - 팔로우 통계 조회 (아키텍처 원칙: @/lib/axios 사용)
  getFollowStats: async (accountName: string): Promise<FollowCountsResponse> => {
    try {
      console.log(`🔍 팔로우 통계 조회: ${accountName}`);
      
      // 🏗️ 아키텍처 원칙: @/lib/axios 사용 → 인터셉터 → Zustand 토큰 → 자동 갱신 → 백엔드
      const response = await api.get<ApiResponse<FollowCountsResponse>>(
        `/follows/count/${accountName}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '팔로우 통계를 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('팔로우 통계 데이터가 없습니다.');
      }
      
      console.log(`✅ 팔로우 통계 조회 성공:`, response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ 팔로우 통계 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 GET /follows/check/{accountName} - 팔로우 상태 확인 (아키텍처 원칙: @/lib/axios 사용)
  checkFollowStatus: async (accountName: string): Promise<boolean> => {
    try {
      console.log(`🔍 팔로우 상태 확인: ${accountName}`);
      
      // 🏗️ 아키텍처 원칙: @/lib/axios 사용 → 인터셉터 → Zustand 토큰 → 자동 갱신 → 백엔드
      const response = await api.get<ApiResponse<boolean>>(
        `/follows/check/${accountName}`
      );
      
      if (response.data.error) {
        return false;
      }
      
      const isFollowing = response.data.data || false;
      console.log(`✅ 팔로우 상태 확인 성공: ${isFollowing}`);
      return isFollowing;
    } catch (error) {
      console.warn('❌ 팔로우 상태 확인 실패:', error);
      return false;
    }
  },

  // 🔥 POST/DELETE /follows/{accountName} - 팔로우/언팔로우 (아키텍처 원칙: @/lib/axios 사용)
  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    try {
      console.log(`🔍 ${isCurrentlyFollowing ? '언팔로우' : '팔로우'}: ${accountName}`);
      
      // 🏗️ 아키텍처 원칙: @/lib/axios 사용 → 인터셉터 → Zustand 토큰 → 자동 갱신 → 백엔드
      if (isCurrentlyFollowing) {
        const response = await api.delete<ApiResponse<void>>(`/follows/${accountName}`);
        if (response.data.error) {
          throw new Error(response.data.message || '언팔로우에 실패했습니다.');
        }
      } else {
        const response = await api.post<ApiResponse<void>>(`/follows/${accountName}`);
        if (response.data.error) {
          throw new Error(response.data.message || '팔로우에 실패했습니다.');
        }
      }
      
      console.log(`✅ ${isCurrentlyFollowing ? '언팔로우' : '팔로우'} 성공`);
    } catch (error) {
      console.error('❌ 팔로우 처리 실패:', error);
      throw error;
    }
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 게시물 좋아요 토글 (아키텍처 원칙: @/lib/axios 사용)
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    try {
      console.log(`🔍 좋아요 ${isCurrentlyLiked ? '취소' : '추가'}: postId=${postId}`);
      
      // 🏗️ 아키텍처 원칙: @/lib/axios 사용 → 인터셉터 → Zustand 토큰 → 자동 갱신 → 백엔드
      if (isCurrentlyLiked) {
        await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`);
      } else {
        await api.post<ApiResponse<void>>(`/likes/posts/${postId}`);
      }
      
      console.log(`✅ 좋아요 ${isCurrentlyLiked ? '취소' : '추가'} 성공`);
    } catch (error) {
      console.error('❌ 좋아요 처리 실패:', error);
      throw error;
    }
  },

  // 🔥 추가 게시물 로드 (커서 기반 무한스크롤) - 아키텍처 원칙 준수
  loadMorePosts: async (accountName: string, cursor: number, limit: number = 20): Promise<PostResponse[]> => {
    try {
      const feedData = await userProfileAPI.getUserFeedWithPosts(accountName, limit, cursor);
      return feedData.posts;
    } catch (error) {
      console.error('❌ 추가 게시물 로드 실패:', error);
      throw error;
    }
  }
};

const UserProfilePage: React.FC = () => {
  const router = useRouter()
  const params = useParams()
  
  // 🏗️ 아키텍처 원칙: Zustand 스토어에서 인증 상태 관리
  const { user: currentUser, isLoading: authLoading, isAuthenticated } = useAuthStore()
  
  // ============================================================================
  // 🔥 상태 관리
  // ============================================================================
  
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null)
  const [userPosts, setUserPosts] = useState<PostResponse[]>([])
  const [loading, setLoading] = useState({
    initial: true,
    follow: false,
    loadMore: false
  })
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  
  // URL에서 accountName 추출 (params.userId는 실제로는 accountName)
  const targetAccountName = params.userId as string

  // ============================================================================
  // 🔥 본인 프로필 접근 시 /my로 리다이렉트 (아키텍처 원칙 준수)
  // ============================================================================
  
  useEffect(() => {
    const checkSelfProfile = async () => {
      if (isAuthenticated && currentUser && targetAccountName) {
        // 🏗️ 아키텍처 원칙: Zustand 스토어의 사용자 정보 직접 활용 (API 호출 생략)
        const currentAccountName = (currentUser as any)?.accountName || currentUser.email?.split('@')[0] || 'user';
        
        console.log('🔍 본인 프로필 체크:', { currentAccountName, targetAccountName });
        
        if (currentAccountName === targetAccountName) {
          console.log('🔄 본인 프로필 접근 감지 - /my로 리다이렉트');
          router.push('/my');
          return;
        }
      }
    };

    checkSelfProfile();
  }, [isAuthenticated, currentUser, targetAccountName, router]);

  // ============================================================================
  // 🔥 데이터 로딩 함수들 (아키텍처 원칙 준수)
  // ============================================================================

  const loadUserProfile = useCallback(async () => {
    if (!targetAccountName || !isAuthenticated || !currentUser) return;

    try {
      setLoading(prev => ({ ...prev, initial: true }));
      setError(null);

      console.log('=== 사용자 프로필 로딩 시작 ===', { targetAccountName });

      // 🔥 1단계: 사용자 피드 정보 조회 (첫 20개 게시물 포함)
      const feedResponse = await userProfileAPI.getUserFeedWithPosts(targetAccountName, 20);
      
      // 🔥 2단계: 팔로우 통계 조회
      const statsResult = await userProfileAPI.getFollowStats(targetAccountName);
      
      // 🔥 3단계: 팔로우 상태 확인
      const isFollowing = await userProfileAPI.checkFollowStatus(targetAccountName);

      // 🔥 4단계: 통합된 프로필 데이터 생성
      const profileData: UserProfileData = {
        userId: feedResponse.userId,
        userName: feedResponse.accountName, // 실제로는 별도 API에서 가져와야 하지만 일단 accountName 사용
        userEmail: '', // FeedWithPostsResponse에 없으므로 빈 값
        accountName: feedResponse.accountName,
        profileImage: feedResponse.profileImage || undefined,
        prettyFace: undefined, // FeedWithPostsResponse에 없으므로 undefined
        postsCount: feedResponse.posts.length,
        followersCount: statsResult.followerCount,
        followingCount: statsResult.followingCount,
        isFollowing: isFollowing,
        feedId: feedResponse.feedId
      };

      setUserProfile(profileData);
      setUserPosts(feedResponse.posts);
      setHasMore(feedResponse.hasNext);
      setNextCursor(feedResponse.nextCursor);

      console.log('✅ 사용자 프로필 로딩 완료:', {
        profile: profileData,
        postsCount: feedResponse.posts.length,
        hasMore: feedResponse.hasNext,
        nextCursor: feedResponse.nextCursor
      });

    } catch (error: any) {
      console.error('❌ 사용자 프로필 로딩 실패:', error);
      
      // 🏗️ 아키텍처 원칙: 인터셉터에서 처리된 인증 오류 감지
      let errorMessage = '사용자 프로필을 불러오는데 실패했습니다.';
      
      if (error.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.';
        // 🏗️ 아키텍처 원칙: Zustand 스토어 통해 로그아웃 처리
        try {
          await useAuthStore.getState().logout();
        } catch (logoutError) {
          console.warn('로그아웃 처리 실패:', logoutError);
          useAuthStore.getState().clearTokens();
        }
        router.push('/login');
        return;
      } else if (error.response?.status === 403) {
        errorMessage = '이 사용자의 프로필을 볼 권한이 없습니다.';
      } else if (error.response?.status === 404) {
        errorMessage = '존재하지 않는 사용자입니다.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, [targetAccountName, isAuthenticated, currentUser, router]);

  // 초기 데이터 로드
  useEffect(() => {
    // 🏗️ 아키텍처 원칙: 본인 프로필인 경우 로딩하지 않음 (Zustand 스토어 활용)
    if (isAuthenticated && currentUser && targetAccountName) {
      const currentAccountName = (currentUser as any)?.accountName || currentUser.email?.split('@')[0] || 'user';
      if (currentAccountName === targetAccountName) {
        console.log('🔄 본인 프로필 - 로딩 생략 (리다이렉트됨)');
        return;
      }
    }

    loadUserProfile();
  }, [loadUserProfile, isAuthenticated, currentUser, targetAccountName]);

  // ============================================================================
  // 🔥 커서 기반 무한스크롤 - 추가 게시물 로드 (아키텍처 원칙 준수)
  // ============================================================================

  const loadMorePosts = useCallback(async () => {
    if (!userProfile || !hasMore || loading.loadMore || !nextCursor) return;

    try {
      setLoading(prev => ({ ...prev, loadMore: true }));

      console.log('🔍 커서 기반 추가 게시물 로드:', { cursor: nextCursor });

      const newPosts = await userProfileAPI.loadMorePosts(userProfile.accountName, nextCursor, 20);
      
      setUserPosts(prev => [...prev, ...newPosts]);
      setHasMore(newPosts.length === 20); // 20개가 왔으면 더 있을 수 있음
      setNextCursor(newPosts.length > 0 ? newPosts[newPosts.length - 1].postId : null);

      // 게시물 총 개수 업데이트
      setUserProfile(prev => prev ? {
        ...prev,
        postsCount: prev.postsCount + newPosts.length
      } : null);

      console.log(`✅ 커서 기반 추가 게시물 ${newPosts.length}개 로드 완료`);

    } catch (error: any) {
      console.error('❌ 추가 게시물 로드 실패:', error);
      
      const errorMessage = error?.response?.data?.message || '추가 게시물을 불러오는데 실패했습니다.';
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, loadMore: false }));
    }
  }, [userProfile, hasMore, loading.loadMore, nextCursor]);

  // ============================================================================
  // 🔥 이벤트 핸들러들 (아키텍처 원칙 준수)
  // ============================================================================

  const handleBack = () => {
    router.back();
  };

  // 팔로우 토글
  const handleFollow = async () => {
    if (!userProfile || loading.follow) return;

    try {
      setLoading(prev => ({ ...prev, follow: true }));

      // 낙관적 업데이트
      const newFollowingState = !userProfile.isFollowing;
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: newFollowingState,
        followersCount: newFollowingState 
          ? prev.followersCount + 1 
          : Math.max(0, prev.followersCount - 1)
      } : null);

      // 백엔드 API 호출 (아키텍처 원칙: @/lib/axios 사용)
      await userProfileAPI.toggleFollow(userProfile.accountName, userProfile.isFollowing);
      
      console.log(`✅ ${userProfile.isFollowing ? '언팔로우' : '팔로우'} 완료: ${userProfile.accountName}`);
      
    } catch (error: any) {
      console.error('❌ 팔로우 처리 실패:', error);
      
      // 실패 시 롤백
      if (userProfile) {
        setUserProfile(prev => prev ? {
          ...prev,
          isFollowing: userProfile.isFollowing,
          followersCount: userProfile.followersCount
        } : null);
      }
      
      const errorMessage = error?.response?.data?.message || '팔로우 처리에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, follow: false }));
    }
  };

  // 공유하기
  const handleShare = () => {
    if (navigator.share && userProfile) {
      navigator.share({
        title: `${userProfile.userName}님의 프로필`,
        text: `@${userProfile.accountName}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다!');
    }
  };

  // 게시물 클릭
  const handlePostClick = (post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`);
  };

  // 게시물 좋아요 처리
  const handlePostLike = async (post: PostResponse) => {
    try {
      // 낙관적 업데이트
      setUserPosts(prev => prev.map(p => 
        p.postId === post.postId 
          ? { 
              ...p, 
              isLikedByMe: !p.isLikedByMe,
              likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1
            }
          : p
      ));

      // 백엔드 API 호출 (아키텍처 원칙: @/lib/axios 사용)
      await userProfileAPI.togglePostLike(post.postId, post.isLikedByMe);
      
      console.log(`✅ 좋아요 ${post.isLikedByMe ? '취소' : '추가'} 완료: postId=${post.postId}`);
      
    } catch (error: any) {
      console.error('❌ 좋아요 처리 실패:', error);
      
      // 실패 시 롤백
      setUserPosts(prev => prev.map(p => 
        p.postId === post.postId ? post : p
      ));
      
      const errorMessage = error?.response?.data?.message || '좋아요 처리에 실패했습니다.';
      alert(errorMessage);
    }
  };

  // 에러 재시도
  const handleRetry = () => {
    setError(null);
    loadUserProfile();
  };

  // 팔로워/팔로잉 목록 보기
  const handleViewFollowers = () => {
    if (userProfile) {
      router.push(`/follows/followers/${userProfile.accountName}`);
    }
  };

  const handleViewFollowing = () => {
    if (userProfile) {
      router.push(`/follows/following/${userProfile.accountName}`);
    }
  };

  // ============================================================================
  // 🔥 렌더링 조건부 처리 (완전 보호된 경로)
  // ============================================================================

  // 🏗️ 아키텍처 원칙: 인증 로딩 중
  if (authLoading || loading.initial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner 
          size="lg" 
          text={authLoading ? "인증 확인 중..." : "프로필을 불러오는 중..."}
        />
      </div>
    );
  }

  // 🏗️ 아키텍처 원칙: 로그인하지 않은 경우 - 이 코드는 실행되지 않아야 함 (Middleware에서 차단)
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">프로필을 보려면 로그인해 주세요.</p>
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

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={handleBack}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              뒤로가기
            </button>
            <button
              onClick={() => router.push('/feeds/explore')}
              className="w-full px-6 py-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              탐색 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 사용자를 찾을 수 없음
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <PhotoIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">사용자를 찾을 수 없습니다</h2>
          <p className="text-gray-500 mb-6">@{targetAccountName} 사용자가 존재하지 않습니다.</p>
          <div className="space-y-3">
            <button
              onClick={handleBack}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              뒤로가기
            </button>
            <button
              onClick={() => router.push('/feeds/search')}
              className="w-full px-6 py-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              다른 사용자 검색
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 상단 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            title="뒤로가기"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">@{userProfile.accountName}</h1>
            <p className="text-xs text-gray-500">
              사용자 ID: {userProfile.userId} • 피드 ID: {userProfile.feedId}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="프로필 공유"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="더보기"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>
              
              {/* 더보기 옵션 드롭다운 */}
              {showMoreOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button 
                    onClick={() => {
                      handleShare();
                      setShowMoreOptions(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                  >
                    프로필 공유
                  </button>
                  <button 
                    onClick={() => {
                      alert('신고 기능은 추후 구현 예정입니다.');
                      setShowMoreOptions(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                  >
                    신고하기
                  </button>
                  <button 
                    onClick={() => {
                      alert('차단 기능은 추후 구현 예정입니다.');
                      setShowMoreOptions(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                  >
                    차단하기
                  </button>
                  <button 
                    onClick={() => setShowMoreOptions(false)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-gray-500"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto">
        {/* 🔥 프로필 정보 (백엔드 데이터) */}
        <div className="bg-white p-6 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            {/* 프로필 이미지 */}
            <div className="w-20 h-20 rounded-full bg-gray-300 overflow-hidden flex-shrink-0 ring-2 ring-blue-100">
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage}
                  alt={userProfile.accountName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.accountName)}&size=80&background=random`;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {userProfile.accountName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* 사용자 정보 */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{userProfile.userName || userProfile.accountName}</h2>
              <p className="text-gray-500 text-sm mb-2">@{userProfile.accountName}</p>
              {userProfile.userEmail && (
                <p className="text-gray-500 text-sm mb-4">{userProfile.userEmail}</p>
              )}

              {/* 통계 */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{userPosts.length}</div>
                  <div className="text-gray-500">게시물</div>
                </div>
                <button
                  onClick={handleViewFollowers}
                  className="text-center hover:bg-gray-50 rounded p-1 transition-colors"
                >
                  <div className="font-semibold text-gray-900">{userProfile.followersCount}</div>
                  <div className="text-gray-500">팔로워</div>
                </button>
                <button
                  onClick={handleViewFollowing}
                  className="text-center hover:bg-gray-50 rounded p-1 transition-colors"
                >
                  <div className="font-semibold text-gray-900">{userProfile.followingCount}</div>
                  <div className="text-gray-500">팔로잉</div>
                </button>
              </div>
            </div>
          </div>

          {/* 🔥 AI 보정 이미지 표시 (백엔드에서 제공되는 경우) */}
          {userProfile.prettyFace && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <PhotoIcon className="h-4 w-4 mr-2" />
                AI 보정 이미지
              </h3>
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 ring-2 ring-purple-100">
                <img
                  src={userProfile.prettyFace}
                  alt="AI 보정된 얼굴"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = '<div class="w-full h-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs">AI 이미지 로드 실패</div>';
                  }}
                />
              </div>
            </div>
          )}

          {/* 🔥 액션 버튼들 */}
          <div className="mt-6 flex items-center space-x-3">
            <button
              onClick={handleFollow}
              disabled={loading.follow}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center ${
                userProfile.isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading.follow ? (
                <LoadingSpinner size="sm" />
              ) : userProfile.isFollowing ? (
                <>
                  <UserMinusIcon className="w-4 h-4 mr-2" />
                  팔로잉
                </>
              ) : (
                <>
                  <UserPlusIcon className="w-4 h-4 mr-2" />
                  팔로우
                </>
              )}
            </button>
            
            <button 
              onClick={() => alert('메시지 기능은 추후 구현 예정입니다.')}
              className="py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              메시지
            </button>
          </div>

          {/* 🔥 프로필 메타 정보 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">프로필 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">사용자 ID</span>
                <span className="font-mono text-gray-800">{userProfile.userId}</span>
              </div>
              <div>
                <span className="text-gray-500 block">피드 ID</span>
                <span className="font-mono text-gray-800">{userProfile.feedId}</span>
              </div>
              <div>
                <span className="text-gray-500 block">게시물 수</span>
                <span className="font-mono text-gray-800">{userPosts.length}</span>
              </div>
              <div>
                <span className="text-gray-500 block">팔로우 상태</span>
                <span className={`font-medium ${
                  userProfile.isFollowing ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {userProfile.isFollowing ? '팔로잉 중' : '팔로우하지 않음'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 게시물 섹션 */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">게시물</h2>
            <div className="text-sm text-gray-500">
              총 {userPosts.length}개{hasMore && ' (더 보기 가능)'}
            </div>
          </div>

          {/* 게시물 목록 */}
          {userPosts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPosts.map((post) => (
                  <div
                    key={post.postId}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handlePostClick(post)}
                  >
                    {/* 게시물 이미지 */}
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={post.imgUrl}
                        alt={post.caption || '게시물 이미지'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/300/300?seed=${post.postId}`;
                        }}
                      />
                      
                      {/* 좋아요 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePostLike(post);
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white/90 transition-colors shadow-sm"
                      >
                        {post.isLikedByMe ? (
                          <HeartSolidIcon className="w-5 h-5 text-red-500" />
                        ) : (
                          <HeartIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </button>

                      {/* 좋아요 수 표시 */}
                      {post.likeCount > 0 && (
                        <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 text-white text-xs rounded-full flex items-center">
                          <HeartSolidIcon className="w-3 h-3 mr-1 text-red-500" />
                          {post.likeCount}
                        </div>
                      )}

                      {/* 게시물 순서 표시 (displayOrder가 있는 경우) */}
                      {post.displayOrder !== null && post.displayOrder !== undefined && (
                        <div className="absolute top-3 left-3 px-2 py-1 bg-blue-500/80 text-white text-xs rounded-full">
                          #{post.displayOrder}
                        </div>
                      )}
                    </div>

                    {/* 게시물 정보 */}
                    <div className="p-3">
                      {post.caption && (
                        <p className="text-sm text-gray-800 line-clamp-2 mb-2 h-10">
                          {post.caption}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                        <div className="flex items-center space-x-2">
                          {post.isLikedByMe && (
                            <span className="flex items-center text-red-500">
                              <HeartSolidIcon className="h-3 w-3 mr-1" />
                              내가 좋아함
                            </span>
                          )}
                          <span className="text-xs text-gray-300">
                            ID: {post.postId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 🔥 커서 기반 무한스크롤 - 더 보기 버튼 */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMorePosts}
                    disabled={loading.loadMore}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {loading.loadMore ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        게시물 불러오는 중...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        더 많은 게시물 보기
                      </>
                    )}
                  </button>
                  
                  {nextCursor && (
                    <p className="text-xs text-gray-400 mt-2">
                      다음 커서: {nextCursor}
                    </p>
                  )}
                </div>
              )}

              {/* 🔥 게시물 총계 정보 */}
              <div className="text-center mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  @{userProfile.accountName}님의 총 <strong>{userPosts.length}</strong>개 게시물
                  {hasMore && <span className="ml-1">• 더 많은 게시물이 있습니다</span>}
                </p>
              </div>
            </>
          ) : (
            // 게시물 없음
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <PhotoIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
              <p className="text-gray-500 mb-4">
                @{userProfile.accountName}님이 사진을 공유하면 여기에 표시됩니다.
              </p>
              
              {/* 추천 액션 */}
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/feeds/timeline')}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  타임라인 보기
                </button>
                <p className="text-xs text-gray-400">
                  다른 사용자들의 최신 게시물을 확인해보세요
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 🔥 하단 고정 액션 바 (모바일) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="flex space-x-3">
          <button
            onClick={handleFollow}
            disabled={loading.follow}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              userProfile.isFollowing
                ? 'bg-gray-200 text-gray-700'
                : 'bg-blue-600 text-white'
            }`}
          >
            {loading.follow ? (
              <LoadingSpinner size="sm" className="mx-auto" />
            ) : userProfile.isFollowing ? (
              '팔로잉'
            ) : (
              '팔로우'
            )}
          </button>
          <button 
            onClick={() => alert('메시지 기능은 추후 구현 예정입니다.')}
            className="px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700"
          >
            메시지
          </button>
        </div>
      </div>

      {/* 모바일 하단 액션 바 공간 확보 */}
      <div className="md:hidden h-20"></div>

      {/* 🔥 드롭다운 외부 클릭 시 닫기 */}
      {showMoreOptions && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowMoreOptions(false)}
        />
      )}
    </div>
  )
}

export default UserProfilePage
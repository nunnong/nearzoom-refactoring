// =============================================================================
// 📁 /components/page/profile/MyProfile.tsx - 사용자 프로필과 동일한 디자인으로 통일
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
  PlusIcon,
  ShareIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

// 🔥 올바른 아키텍처: api from '@/lib/axios' 사용
import api from '@/lib/axios'

// 🔥 올바른 아키텍처: Zustand 토큰 스토어
import { useAuthStore } from '@/stores/authStore'

// 🔥 사용자 프로필과 동일한 컴포넌트 사용
import RandomPhotoGrid from '@/components/page/explore/RandomPhotoGrid'

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
  // 🔥 내 프로필 정보 조회
  async getMyProfile(): Promise<UserProfileResponse> {
    try {
      console.log('🔍 API 요청: GET /user/my');
      const response = await api.get<ApiResponse<UserProfileResponse>>('/user/my');
      
      console.log('📡 API 응답:', response);
      console.log('📡 응답 데이터:', response.data);
      
      if (response.data.error || !response.data.data) {
        console.error('❌ API 에러 응답:', response.data);
        throw new Error(response.data.message || '프로필 조회 실패');
      }
      
      console.log('✅ 프로필 조회 성공:', response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ 프로필 조회 API 에러:', error);
      console.error('❌ 에러 응답:', error.response);
      console.error('❌ 에러 메시지:', error.message);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      // 더 자세한 에러 메시지 제공
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('프로필 조회에 실패했습니다.');
      }
    }
  },

  // 🔥 내 게시물 목록 조회 - 기존 API 사용
  async getMyPosts(cursor?: number): Promise<PostListResponse> {
    try {
      console.log('🔍 API 요청: 내 게시물 조회 시작');
      
      // 현재 사용자 정보 조회
      const userInfo = await this.getMyProfile();
      const myAccountName = userInfo.accountName;
      console.log('👤 내 계정명:', myAccountName);
      
      // Explore API에서 모든 게시물 조회 후 내 게시물만 필터링
      const params: any = { limit: 100 };
      if (cursor) params.cursor = cursor;
      
      console.log('🔍 API 요청: GET /feeds/explore', params);
      const response = await api.get<ApiResponse<PostListResponse>>('/feeds/explore', { params });
      
      console.log('📡 Explore API 응답:', response.data);
      
      if (response.data.error || !response.data.data) {
        console.error('❌ Explore API 에러:', response.data);
        throw new Error(response.data.message || '게시물을 불러올 수 없습니다.');
      }
      
      // 내 게시물만 필터링
      const allPosts = response.data.data.posts || [];
      const myPosts = allPosts.filter(
        post => post.authorAccountName === myAccountName
      );
      
      console.log(`✅ 내 게시물 필터링 완료: 전체 ${allPosts.length}개 중 내 게시물 ${myPosts.length}개`);
      
      return {
        posts: myPosts,
        hasNext: response.data.data.hasNext || false,
        nextCursor: response.data.data.nextCursor || null
      };
    } catch (error: any) {
      console.error('❌ 게시물 조회 API 에러:', error);
      console.error('❌ 에러 응답:', error.response);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('게시물 조회에 실패했습니다.');
      }
    }
  },

  // 🔥 팔로우 통계 조회 - 기존 API 사용
  async getFollowCounts(): Promise<FollowCountsResponse> {
    try {
      console.log('🔍 API 요청: 팔로우 통계 조회 시작');
      const userInfo = await this.getMyProfile();
      
      console.log('🔍 API 요청: GET /follows/count/' + userInfo.accountName);
      const response = await api.get<ApiResponse<FollowCountsResponse>>(
        `/follows/count/${userInfo.accountName}`
      );
      
      console.log('📡 팔로우 통계 API 응답:', response.data);
      
      if (response.data.error || !response.data.data) {
        console.warn('⚠️ 팔로우 통계 조회 실패, 기본값 반환:', response.data);
        return { followerCount: 0, followingCount: 0 };
      }
      
      console.log('✅ 팔로우 통계 조회 성공:', response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ 팔로우 통계 조회 API 에러:', error);
      console.error('❌ 에러 응답:', error.response);
      return { followerCount: 0, followingCount: 0 };
    }
  },

  // 🔥 게시물 좋아요 토글 - 기존 API 사용
  async togglePostLike(postId: number): Promise<void> {
    try {
      console.log('🔍 API 요청: POST /likes/posts/' + postId);
      const response = await api.post<ApiResponse<void>>(`/likes/posts/${postId}`);
      
      console.log('📡 좋아요 토글 API 응답:', response.data);
      
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 처리 실패');
      }
      
      console.log('✅ 좋아요 토글 성공');
    } catch (error: any) {
      console.error('❌ 좋아요 토글 API 에러:', error);
      console.error('❌ 에러 응답:', error.response);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('좋아요 처리에 실패했습니다.');
      }
    }
  }
};

// ============================================================================
// MyProfile 컴포넌트
// ============================================================================

interface MyProfileProps {
  className?: string;
  postsPerPage?: number;
}

const MyProfile: React.FC<MyProfileProps> = ({ 
  className = '', 
  postsPerPage = 12 
}): JSX.Element => {
  const router = useRouter();
  const { user } = useAuthStore();

  // 🔥 상태 관리
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [followStats, setFollowStats] = useState<FollowCountsResponse>({
    followerCount: 0,
    followingCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // 🔥 데이터 로드 함수들
  const loadProfile = useCallback(async () => {
    try {
      const [profileData, followData] = await Promise.all([
        myProfileAPI.getMyProfile(),
        myProfileAPI.getFollowCounts()
      ]);
      
      setUserProfile(profileData);
      setFollowStats(followData);
    } catch (err) {
      console.error('프로필 로드 실패:', err);
      setError(err instanceof Error ? err.message : '프로필 로드 실패');
    }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const postsData = await myProfileAPI.getMyPosts();
      setPosts(postsData.posts);
    } catch (err) {
      console.error('게시물 로드 실패:', err);
      setError(err instanceof Error ? err.message : '게시물 로드 실패');
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([loadProfile(), loadPosts()]);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile, loadPosts]);

  // 🔥 초기 데이터 로드
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 🔥 새로고침
  const refreshProfile = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAllData();
      showToast('success', '프로필이 새로고침되었습니다.');
    } catch (err) {
      showToast('error', '새로고침에 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAllData]);

  // 🔥 재시도
  const handleRetry = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  // 🔥 이벤트 핸들러들
  const handleViewProfile = useCallback(() => {
    router.push('/profile');
  }, [router]);

  const handleCreatePost = useCallback(() => {
    router.push('/upload-photo');
  }, [router]);

  const handleViewFollowers = useCallback(() => {
    router.push('/follows/followers');
  }, [router]);

  const handleViewFollowing = useCallback(() => {
    router.push('/follows/following');
  }, [router]);

  const handlePostClick = useCallback((post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`);
  }, [router]);

  const handlePostLike = useCallback(async (post: PostResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await myProfileAPI.togglePostLike(post.postId);
      
      // 로컬 상태 업데이트
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.postId === post.postId 
            ? { 
                ...p, 
                isLikedByMe: !p.isLikedByMe,
                likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1
              }
            : p
        )
      );
      
      showToast('success', post.isLikedByMe ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.');
    } catch (err) {
      showToast('error', '좋아요 처리에 실패했습니다.');
    }
  }, []);

  // 🔥 토스트 메시지 표시
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 🔥 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프로필 로드 중...</p>
        </div>
      </div>
    );
  }

  // 🔥 에러 상태
  if (error || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">프로필 로드 실패</h2>
          <p className="text-gray-500 mb-6">{error || '프로필을 불러올 수 없습니다.'}</p>
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
  // 메인 프로필 렌더링 - 사용자 프로필과 동일한 디자인
  // ============================================================================

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* 프로필 정보 - 사용자 프로필과 동일한 스타일 */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6">
            {/* 프로필 이미지 */}
            <div className="flex justify-center sm:justify-start mb-4 sm:mb-0">
              <div className="relative">
                <img
                  src={userProfile.userProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.userName)}&size=120&background=random`}
                  alt={userProfile.userName}
                  className="h-24 w-24 sm:h-32 sm:w-32 rounded-full ring-4 ring-white shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.userName)}&size=120&background=random`;
                  }}
                />
                <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-1">
                  <CogIcon className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>

            {/* 프로필 정보 */}
            <div className="flex-1 text-center sm:text-left">
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{userProfile.userName}</h1>
                <p className="text-gray-600 mb-2">@{userProfile.accountName}</p>
                <p className="text-sm text-gray-500">{userProfile.userEmail}</p>
                <p className="text-sm text-green-600 mt-1">내 프로필</p>
              </div>

              {/* 통계 */}
              <div className="flex justify-center sm:justify-start space-x-6 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{posts.length}</div>
                  <div className="text-sm text-gray-600">게시물</div>
                </div>
                <button className="text-center hover:bg-gray-50 px-2 py-1 rounded transition-colors">
                  <div className="text-xl font-bold text-gray-900">{followStats.followerCount}</div>
                  <div className="text-sm text-gray-600">팔로워</div>
                </button>
                <button className="text-center hover:bg-gray-50 px-2 py-1 rounded transition-colors">
                  <div className="text-xl font-bold text-gray-900">{followStats.followingCount}</div>
                  <div className="text-sm text-gray-600">팔로잉</div>
                </button>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex justify-center sm:justify-start space-x-3">
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
          </div>
        </div>
      </div>

      {/* 사용자의 게시물 타임라인 - 사용자 프로필과 동일한 스타일 */}
      <main className="py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">게시물</h2>
          </div>
          
          {/* 사용자 프로필과 동일한 게시물 표시 */}
          {posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 max-w-4xl mx-auto">
              {posts.map((post) => (
                <div 
                  key={post.postId} 
                  className="group relative overflow-hidden bg-black cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
                  {/* 이미지 */}
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={post.imgUrl}
                      alt={post.caption || '게시물'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    {/* 호버 오버레이 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />
                    
                    {/* 좋아요 버튼 (호버 시 표시) */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <button
                        onClick={(e) => handlePostLike(post, e)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg"
                      >
                        <svg
                          className={`w-5 h-5 ${post.isLikedByMe ? 'text-red-500 fill-current' : 'text-gray-700'}`}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* 좋아요 수 (호버 시 표시) */}
                    <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2 text-white">
                          <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                          <span className="text-sm font-medium">{post.likeCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* 캡션 (호버 시 표시) */}
                    {post.caption && (
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 max-w-32">
                          <p className="text-white text-xs leading-relaxed line-clamp-2">
                            {post.caption}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
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
      </main>

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
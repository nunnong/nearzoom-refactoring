// src/app/post/[id]/page.tsx - 올바른 아키텍처 적용

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import { HeartIcon } from '@heroicons/react/24/outline';

// 🏗️ 올바른 아키텍처: 통합된 api 인스턴스 사용
import api from '@/lib/axios';

// 🏗️ 올바른 아키텍처: Zustand 스토어 사용
import { useAuthStore } from '@/stores/authStore';

// ============================================================================
// 🔥 백엔드 타입 정의 (정확한 PostDetailResponse)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T | null;
}

// 🔥 백엔드 PostDetailResponse 타입 (FeedController.getPostDetail)
interface PostDetailResponse {
  // 게시물 정보
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string;
  createdAt: string;

  // 좋아요 정보
  likeCount: number;
  isLikedByMe: boolean;

  // 작성자 정보 (피드 접근용)
  authorId: number;
  authorAccountName: string;
  authorProfileImage: string | null;
  authorFeedId: number;

  // 현재 사용자와의 관계
  isMyPost: boolean;          // 내 게시물인지
  isFollowingAuthor: boolean; // 작성자를 팔로우하는지
}

// 🔥 백엔드 UpdatePostRequest 타입
interface UpdatePostRequest {
  caption: string;
}

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
// 🔥 백엔드 API 함수들 (올바른 아키텍처 적용)
// ============================================================================

const postDetailAPI = {
  // 🔥 GET /feeds/posts/{postId} - 게시물 상세 조회
  getPostDetail: async (postId: number): Promise<PostDetailResponse> => {
    try {
      console.log(`🔍 게시물 상세 조회: postId=${postId}`);
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
      const response = await api.get<ApiResponse<PostDetailResponse>>(
        `/feeds/posts/${postId}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물을 가져올 수 없습니다.');
      }
      
      if (!response.data.data) {
        throw new Error('게시물 데이터가 없습니다.');
      }
      
      console.log(`✅ 게시물 상세 조회 성공:`, response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ 게시물 상세 조회 실패:', error);
      throw error;
    }
  },

  // 🔥 POST/DELETE /likes/posts/{postId} - 게시물 좋아요 토글
  togglePostLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    try {
      console.log(`🔍 좋아요 ${isCurrentlyLiked ? '취소' : '추가'}: postId=${postId}`);
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
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

  // 🔥 PUT /feeds/posts/{postId} - 게시물 수정
  updatePost: async (postId: number, request: UpdatePostRequest): Promise<void> => {
    try {
      console.log(`🔍 게시물 수정: postId=${postId}`, request);
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
      const response = await api.put<ApiResponse<void>>(
        `/feeds/posts/${postId}`,
        request
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물 수정에 실패했습니다.');
      }
      
      console.log(`✅ 게시물 수정 성공`);
    } catch (error) {
      console.error('❌ 게시물 수정 실패:', error);
      throw error;
    }
  },

  // 🔥 DELETE /feeds/posts/{postId} - 게시물 삭제
  deletePost: async (postId: number): Promise<void> => {
    try {
      console.log(`🔍 게시물 삭제: postId=${postId}`);
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
      const response = await api.delete<ApiResponse<void>>(
        `/feeds/posts/${postId}`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '게시물 삭제에 실패했습니다.');
      }
      
      console.log(`✅ 게시물 삭제 성공`);
    } catch (error) {
      console.error('❌ 게시물 삭제 실패:', error);
      throw error;
    }
  },

  // 🔥 POST/DELETE /follows/{accountName} - 팔로우/언팔로우
  toggleFollow: async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
    try {
      console.log(`🔍 ${isCurrentlyFollowing ? '언팔로우' : '팔로우'}: ${accountName}`);
      
      // 🏗️ 올바른 아키텍처: @/lib/axios 사용 (자동 토큰 처리)
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
  }
};

export default function PostDetailPage() {
  // 🏗️ 올바른 아키텍처: Zustand 스토어에서 인증 상태 관리
  const { user, isLoading: authLoading, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  
  // URL 파라미터에서 게시물 ID 추출
  const postId = params?.id ? Number(params.id) : null;

  // ============================================================================
  // 🔥 상태 관리
  // ============================================================================
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState({
    initial: true,
    like: false,
    follow: false,
    edit: false,
    delete: false
  });
  const [error, setError] = useState<string | null>(null);
  
  // 편집 관련 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [showActions, setShowActions] = useState(false);

  // ============================================================================
  // 🔥 백엔드 데이터 로딩
  // ============================================================================

  const loadPostDetail = useCallback(async () => {
    if (!postId || !isAuthenticated || !user) return;

    try {
      setLoading(prev => ({ ...prev, initial: true }));
      setError(null);

      console.log('=== 게시물 상세 로딩 시작 ===', { postId });

      const postDetail = await postDetailAPI.getPostDetail(postId);
      setPost(postDetail);
      setEditCaption(postDetail.caption || '');

      console.log('✅ 게시물 상세 로딩 완료:', postDetail);

    } catch (error: any) {
      console.error('❌ 게시물 상세 로딩 실패:', error);
      
      // 백엔드 에러 메시지 처리
      let errorMessage = '게시물을 불러오는데 실패했습니다.';
      
      if (error.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.';
        router.push('/login');
        return;
      } else if (error.response?.status === 403) {
        errorMessage = '이 게시물에 접근할 권한이 없습니다.';
      } else if (error.response?.status === 404) {
        errorMessage = '존재하지 않는 게시물입니다.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, [postId, isAuthenticated, user, router]);

  // 초기 데이터 로드
  useEffect(() => {
    loadPostDetail();
  }, [loadPostDetail]);

  // ============================================================================
  // 🔥 이벤트 핸들러들
  // ============================================================================

  // 좋아요 토글
  const handleLike = async () => {
    if (!post || loading.like) return;

    try {
      setLoading(prev => ({ ...prev, like: true }));

      // 낙관적 업데이트
      const newLikedState = !post.isLikedByMe;
      const newLikeCount = newLikedState ? post.likeCount + 1 : post.likeCount - 1;
      
      setPost({
        ...post,
        isLikedByMe: newLikedState,
        likeCount: newLikeCount
      });

      // 백엔드 API 호출
      await postDetailAPI.togglePostLike(post.postId, post.isLikedByMe);
      
      console.log(`✅ 좋아요 ${post.isLikedByMe ? '취소' : '추가'} 완료: postId=${post.postId}`);
      
    } catch (error: any) {
      console.error('❌ 좋아요 처리 실패:', error);
      
      // 실패 시 롤백
      if (post) {
        setPost({
          ...post,
          isLikedByMe: post.isLikedByMe,
          likeCount: post.likeCount
        });
      }
      
      const errorMessage = error?.response?.data?.message || '좋아요 처리에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, like: false }));
    }
  };

  // 팔로우 토글
  const handleFollow = async () => {
    if (!post || loading.follow) return;

    try {
      setLoading(prev => ({ ...prev, follow: true }));

      // 낙관적 업데이트
      const newFollowingState = !post.isFollowingAuthor;
      setPost({
        ...post,
        isFollowingAuthor: newFollowingState
      });

      // 백엔드 API 호출
      await postDetailAPI.toggleFollow(post.authorAccountName, post.isFollowingAuthor);
      
      console.log(`✅ ${post.isFollowingAuthor ? '언팔로우' : '팔로우'} 완료: ${post.authorAccountName}`);
      
    } catch (error: any) {
      console.error('❌ 팔로우 처리 실패:', error);
      
      // 실패 시 롤백
      if (post) {
        setPost({
          ...post,
          isFollowingAuthor: post.isFollowingAuthor
        });
      }
      
      const errorMessage = error?.response?.data?.message || '팔로우 처리에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, follow: false }));
    }
  };

  // 게시물 수정
  const handleEdit = async () => {
    if (!post || loading.edit || !editCaption.trim()) return;

    try {
      setLoading(prev => ({ ...prev, edit: true }));

      // 백엔드 API 호출
      await postDetailAPI.updatePost(post.postId, { 
        caption: editCaption.trim() 
      });
      
      // 성공 시 로컬 상태 업데이트
      setPost({
        ...post,
        caption: editCaption.trim()
      });
      
      setIsEditing(false);
      setShowActions(false);
      
      console.log('✅ 게시물 수정 완료:', post.postId);
      
    } catch (error: any) {
      console.error('❌ 게시물 수정 실패:', error);
      
      const errorMessage = error?.response?.data?.message || '게시물 수정에 실패했습니다.';
      alert(errorMessage);
      
      // 실패 시 원래 캡션으로 복원
      setEditCaption(post.caption || '');
    } finally {
      setLoading(prev => ({ ...prev, edit: false }));
    }
  };

  // 게시물 삭제
  const handleDelete = async () => {
    if (!post || loading.delete) return;

    const confirmDelete = confirm('정말로 이 게시물을 삭제하시겠습니까?\n\n삭제된 게시물은 복구할 수 없습니다.');
    if (!confirmDelete) return;

    try {
      setLoading(prev => ({ ...prev, delete: true }));

      // 백엔드 API 호출
      await postDetailAPI.deletePost(post.postId);
      
      console.log('✅ 게시물 삭제 완료:', post.postId);
      
      // 삭제 후 내 페이지로 이동
      alert('게시물이 삭제되었습니다.');
      router.push('/my');
      
    } catch (error: any) {
      console.error('❌ 게시물 삭제 실패:', error);
      
      const errorMessage = error?.response?.data?.message || '게시물 삭제에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  // 작성자 프로필로 이동
  const handleAuthorClick = () => {
    if (!post) return;
    router.push(`/feeds/users/account/${post.authorAccountName}`);
  };

  // 뒤로가기
  const handleBack = () => {
    router.back();
  };

  // 네비게이션
  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  // 편집 취소
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditCaption(post?.caption || '');
    setShowActions(false);
  };

  // 에러 재시도
  const handleRetry = () => {
    setError(null);
    loadPostDetail();
  };

  // 네비게이션 메뉴 항목들
  const navigationItems = [
    {
      name: 'Timeline',
      href: '/feeds/timeline',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon,
      current: false
    },
    {
      name: 'Explore',
      href: '/feeds/explore',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassSolidIcon,
      current: false
    },
    {
      name: 'My Profile',
      href: '/my',
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      current: false
    },
    {
      name: 'My Room',
      href: '/myroom',
      icon: CalendarIcon,
      activeIcon: CalendarSolidIcon,
      current: false
    }
  ];

  // ============================================================================
  // 🔥 렌더링 조건부 처리 (완전 보호된 경로)
  // ============================================================================

  // 🏗️ 아키텍처 원칙: 인증 로딩 중
  if (authLoading || loading.initial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="lg" 
          text={authLoading ? "인증 확인 중..." : "게시물을 불러오는 중..."}
        />
      </div>
    );
  }

  // 🏗️ 아키텍처 원칙: 로그인하지 않은 경우 - 이 코드는 실행되지 않아야 함 (Middleware에서 차단)
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <UserIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-6">게시물을 보려면 로그인해 주세요.</p>
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

  // 잘못된 게시물 ID
  if (!postId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <PhotoIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">잘못된 접근입니다</h2>
          <p className="text-gray-500 mb-6">유효하지 않은 게시물 ID입니다.</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/feeds/timeline')}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              타임라인으로 이동
            </button>
            <button
              onClick={() => router.push('/my')}
              className="w-full px-6 py-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              내 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
              onClick={() => router.push('/feeds/timeline')}
              className="w-full px-6 py-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              타임라인으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 네비게이션 헤더 */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 뒤로가기 버튼 & 제목 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="뒤로가기"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">게시물</h1>
                {post && (
                  <p className="text-xs text-gray-500">
                    ID: {post.postId} • @{post.authorAccountName}
                  </p>
                )}
              </div>
            </div>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.map((item) => {
                  const Icon = item.current ? item.activeIcon : item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title={item.name}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center space-x-2">
              {/* 내 게시물인 경우 편집/삭제 버튼 */}
              {post?.isMyPost && (
                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    title="게시물 옵션"
                  >
                    <EllipsisHorizontalIcon className="h-5 w-5" />
                  </button>
                  
                  {showActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowActions(false);
                        }}
                        disabled={loading.edit}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span>캡션 편집</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={loading.delete}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>{loading.delete ? '삭제 중...' : '게시물 삭제'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 모바일 메뉴 버튼 */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="h-6 w-6" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 네비게이션 메뉴 */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
              {navigationItems.map((item) => {
                const Icon = item.current ? item.activeIcon : item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center space-x-3 ${
                      item.current
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 🔥 게시물 상세 (백엔드 데이터) */}
        {post && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* 작성자 정보 헤더 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleAuthorClick}
                  className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                >
                  <img
                    src={post.authorProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorAccountName)}&size=40&background=random`}
                    alt={post.authorAccountName}
                    className="h-10 w-10 rounded-full ring-2 ring-gray-100"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorAccountName)}&size=40&background=random`;
                    }}
                  />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">@{post.authorAccountName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </button>

                {/* 팔로우 버튼 (내 게시물이 아닌 경우) */}
                {!post.isMyPost && (
                  <button
                    onClick={handleFollow}
                    disabled={loading.follow}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 ${
                      post.isFollowingAuthor
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {loading.follow ? (
                      <LoadingSpinner size="sm" />
                    ) : post.isFollowingAuthor ? (
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
                )}

                {/* 내 게시물 표시 */}
                {post.isMyPost && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    내 게시물
                  </span>
                )}
              </div>
            </div>

            {/* 게시물 이미지 */}
            <div className="relative">
              <img
                src={post.imgUrl}
                alt={post.caption || '게시물 이미지'}
                className="w-full h-auto max-h-screen object-contain bg-gray-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://picsum.photos/600/600?seed=${post.postId}`;
                }}
                style={{ aspectRatio: 'auto' }}
              />
              
              {/* 이미지 정보 오버레이 */}
              <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                Photo ID: {post.photoId}
              </div>
            </div>

            {/* 좋아요 & 액션 바 */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleLike}
                  disabled={loading.like}
                  className="flex items-center space-x-2 text-gray-600 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {post.isLikedByMe ? (
                    <HeartSolidIcon className="h-6 w-6 text-red-500" />
                  ) : (
                    <HeartIcon className="h-6 w-6" />
                  )}
                  <span className="font-medium">{post.likeCount}개의 좋아요</span>
                  {loading.like && <LoadingSpinner size="sm" />}
                </button>

                {/* 게시물 메타 정보 */}
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  <span>Post ID: {post.postId}</span>
                  <span>Feed ID: {post.authorFeedId}</span>
                </div>
              </div>
            </div>

            {/* 캡션 섹션 */}
            <div className="p-4">
              {isEditing ? (
                // 편집 모드
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-caption" className="block text-sm font-medium text-gray-700 mb-2">
                      캡션 편집
                    </label>
                    <textarea
                      id="edit-caption"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="이 순간에 대해 이야기해보세요..."
                      maxLength={200}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-sm ${editCaption.length > 180 ? 'text-red-500' : 'text-gray-500'}`}>
                        {editCaption.length}/200자
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={handleCancelEdit}
                      disabled={loading.edit}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleEdit}
                      disabled={loading.edit || !editCaption.trim() || editCaption.trim() === post.caption}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {loading.edit ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          저장 중...
                        </>
                      ) : (
                        '저장'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                // 표시 모드
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed flex-1">
                      {post.caption || (
                        <span className="text-gray-400 italic">캡션이 없습니다.</span>
                      )}
                    </p>
                    
                    {/* 편집 버튼 (내 게시물인 경우) */}
                    {post.isMyPost && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="ml-3 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        title="캡션 편집"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 게시물 상세 정보 */}
            <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 text-sm">
                <div>
                  <span className="text-gray-500 block">게시물 ID</span>
                  <span className="font-mono text-gray-800">{post.postId}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">사진 ID</span>
                  <span className="font-mono text-gray-800">{post.photoId}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">작성자 ID</span>
                  <span className="font-mono text-gray-800">{post.authorId}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">피드 ID</span>
                  <span className="font-mono text-gray-800">{post.authorFeedId}</span>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
                <p>
                  <strong>게시 시간:</strong> {new Date(post.createdAt).toLocaleString('ko-KR')}
                </p>
                <p className="mt-1">
                  <strong>관계:</strong> 
                  {post.isMyPost && <span className="ml-1 text-blue-600">내 게시물</span>}
                  {!post.isMyPost && post.isFollowingAuthor && <span className="ml-1 text-green-600">팔로잉 중</span>}
                  {!post.isMyPost && !post.isFollowingAuthor && <span className="ml-1 text-gray-400">팔로우하지 않음</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 추천 액션 (게시물이 로드된 경우) */}
        {post && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">추천 액션</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleAuthorClick}
                className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <UserIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">작성자 프로필</p>
                  <p className="text-xs text-gray-500">@{post.authorAccountName}</p>
                </div>
              </button>
              
              <button
                onClick={() => router.push('/feeds/timeline')}
                className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <HomeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">타임라인</p>
                  <p className="text-xs text-gray-500">최신 게시물 보기</p>
                </div>
              </button>
              
              <button
                onClick={() => router.push('/feeds/explore')}
                className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">탐색</p>
                  <p className="text-xs text-gray-500">새로운 게시물 발견</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 🔥 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 py-2">
          {navigationItems.map((item) => {
            const Icon = item.current ? item.activeIcon : item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center py-2 px-1 transition-colors ${
                  item.current
                    ? 'text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 모바일 하단 네비게이션 공간 확보 */}
      <div className="md:hidden h-20"></div>

      {/* 🔥 액션 메뉴 오버레이 (외부 클릭 시 닫기) */}
      {showActions && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}
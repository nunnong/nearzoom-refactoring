'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
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
  UserMinusIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import { HeartIcon } from '@heroicons/react/24/outline';

// ============================================================================
// 🔥 백엔드 API 연동 - 정확한 타입 정의
// ============================================================================
import api from '@/lib/axios'

// 백엔드 API 응답 타입
interface ApiResponse<T> {
  error: boolean
  message: string
  data: T
}

// 🔥 백엔드 PostDetailResponse 타입에 정확히 맞춤
interface PostDetailResponse {
  // 게시물 정보
  postId: number
  photoId: number
  imgUrl: string
  caption: string
  createdAt: string

  // 좋아요 정보
  likeCount: number
  isLikedByMe: boolean

  // 작성자 정보 (피드 접근용)
  authorId: number
  authorAccountName: string
  authorProfileImage: string
  authorFeedId: number

  // 현재 사용자와의 관계
  isMyPost: boolean          // 내 게시물인지
  isFollowingAuthor: boolean  // 작성자를 팔로우하는지
}

// 게시물 수정 요청 타입
interface UpdatePostRequest {
  caption: string
}

// LoadingSpinner 컴포넌트
const LoadingSpinner = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

// ============================================================================
// 🔥 백엔드 API 함수들 - 정확한 엔드포인트 사용
// ============================================================================

// 🔥 게시물 상세 조회 (FeedController.getPostDetail)
const getPostDetail = async (postId: number): Promise<PostDetailResponse> => {
  try {
    const response = await api.get<ApiResponse<PostDetailResponse>>(`/feeds/posts/${postId}`)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch post detail:', error)
    throw error
  }
}

// 🔥 게시물 좋아요 토글 (LikesController.likePost/unlikePost)
const togglePostLike = async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
  try {
    if (isCurrentlyLiked) {
      // 좋아요 취소
      await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`)
    } else {
      // 좋아요 추가
      await api.post<ApiResponse<void>>(`/likes/posts/${postId}`)
    }
  } catch (error: any) {
    console.error('Failed to toggle like:', error)
    throw error
  }
}

// 🔥 게시물 수정 (FeedController.updatePost)
const updatePost = async (postId: number, request: UpdatePostRequest): Promise<void> => {
  try {
    await api.put<ApiResponse<void>>(`/feeds/posts/${postId}`, request)
  } catch (error: any) {
    console.error('Failed to update post:', error)
    throw error
  }
}

// 🔥 게시물 삭제 (FeedController.deletePost)
const deletePost = async (postId: number): Promise<void> => {
  try {
    await api.delete<ApiResponse<void>>(`/feeds/posts/${postId}`)
  } catch (error: any) {
    console.error('Failed to delete post:', error)
    throw error
  }
}

// 🔥 팔로우/언팔로우 (FollowController.follow/unfollow)
const toggleFollow = async (accountName: string, isCurrentlyFollowing: boolean): Promise<void> => {
  try {
    if (isCurrentlyFollowing) {
      // 언팔로우
      await api.delete<ApiResponse<void>>(`/follows/${accountName}`)
    } else {
      // 팔로우
      await api.post<ApiResponse<void>>(`/follows/${accountName}`)
    }
  } catch (error: any) {
    console.error('Failed to toggle follow:', error)
    throw error
  }
}

export default function PostDetailPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const postId = params?.id ? Number(params.id) : null;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState({ initial: true, action: false });
  const [error, setError] = useState<string | null>(null);
  
  // 편집 관련 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [showActions, setShowActions] = useState(false);

  // ============================================================================
  // 🔥 백엔드 데이터 로딩
  // ============================================================================

  useEffect(() => {
    const loadPostDetail = async () => {
      if (!postId || !isAuthenticated) return;

      try {
        setLoading({ initial: true, action: false });
        setError(null);

        const postDetail = await getPostDetail(postId);
        setPost(postDetail);
        setEditCaption(postDetail.caption || '');

        console.log('게시물 상세 로드 완료:', postDetail);

      } catch (error: any) {
        console.error('게시물 상세 로드 실패:', error);
        
        let errorMessage = '게시물을 불러오는데 실패했습니다.';
        if (error?.response?.status === 401) {
          errorMessage = '로그인이 필요합니다.';
          router.push('/login');
          return;
        } else if (error?.response?.status === 403) {
          errorMessage = '접근 권한이 없습니다.';
        } else if (error?.response?.status === 404) {
          errorMessage = '게시물을 찾을 수 없습니다.';
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
      } finally {
        setLoading({ initial: false, action: false });
      }
    };

    loadPostDetail();
  }, [postId, isAuthenticated, router]);

  // ============================================================================
  // 🔥 이벤트 핸들러들
  // ============================================================================

  // 좋아요 토글
  const handleLike = async () => {
    if (!post || loading.action) return;

    try {
      setLoading(prev => ({ ...prev, action: true }));

      // 낙관적 업데이트
      const newLikedState = !post.isLikedByMe;
      const newLikeCount = newLikedState ? post.likeCount + 1 : post.likeCount - 1;
      
      setPost({
        ...post,
        isLikedByMe: newLikedState,
        likeCount: newLikeCount
      });

      // 백엔드 API 호출
      await togglePostLike(post.postId, post.isLikedByMe);
      
      console.log(`좋아요 ${post.isLikedByMe ? '취소' : '추가'} 완료:`, post.postId);
      
    } catch (error: any) {
      console.error('좋아요 처리 실패:', error);
      
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
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // 팔로우 토글
  const handleFollow = async () => {
    if (!post || loading.action) return;

    try {
      setLoading(prev => ({ ...prev, action: true }));

      // 낙관적 업데이트
      setPost({
        ...post,
        isFollowingAuthor: !post.isFollowingAuthor
      });

      // 백엔드 API 호출
      await toggleFollow(post.authorAccountName, post.isFollowingAuthor);
      
      console.log(`${post.isFollowingAuthor ? '언팔로우' : '팔로우'} 완료:`, post.authorAccountName);
      
    } catch (error: any) {
      console.error('팔로우 처리 실패:', error);
      
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
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // 게시물 수정
  const handleEdit = async () => {
    if (!post || loading.action || !editCaption.trim()) return;

    try {
      setLoading(prev => ({ ...prev, action: true }));

      // 백엔드 API 호출
      await updatePost(post.postId, { caption: editCaption.trim() });
      
      // 성공 시 로컬 상태 업데이트
      setPost({
        ...post,
        caption: editCaption.trim()
      });
      
      setIsEditing(false);
      setShowActions(false);
      
      console.log('게시물 수정 완료:', post.postId);
      
    } catch (error: any) {
      console.error('게시물 수정 실패:', error);
      
      const errorMessage = error?.response?.data?.message || '게시물 수정에 실패했습니다.';
      alert(errorMessage);
      
      // 실패 시 원래 캡션으로 복원
      setEditCaption(post.caption || '');
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  // 게시물 삭제
  const handleDelete = async () => {
    if (!post || loading.action) return;

    const confirmDelete = confirm('정말로 이 게시물을 삭제하시겠습니까?');
    if (!confirmDelete) return;

    try {
      setLoading(prev => ({ ...prev, action: true }));

      // 백엔드 API 호출
      await deletePost(post.postId);
      
      console.log('게시물 삭제 완료:', post.postId);
      
      // 삭제 후 내 페이지로 이동
      router.push('/my');
      
    } catch (error: any) {
      console.error('게시물 삭제 실패:', error);
      
      const errorMessage = error?.response?.data?.message || '게시물 삭제에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
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
    window.location.reload();
  };

  // 네비게이션 메뉴 항목들
  const navigationItems = [
    {
      name: 'Timeline',
      href: '/timeline',
      icon: HomeIcon,
      activeIcon: HomeSolidIcon,
      current: false
    },
    {
      name: 'Explore',
      href: '/explore',
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
  // 🔥 렌더링 조건부 처리
  // ============================================================================

  // 로딩 상태
  if (authLoading || loading.initial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">게시물을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-4">게시물을 보려면 로그인해 주세요.</p>
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
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">잘못된 접근입니다</h2>
          <p className="text-gray-500 mb-4">유효하지 않은 게시물 ID입니다.</p>
          <button
            onClick={() => router.push('/timeline')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            타임라인으로 이동
          </button>
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
              <h1 className="text-lg font-semibold text-gray-900">게시물</h1>
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
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span>편집</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={loading.action}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>삭제</span>
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
        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-red-600 hover:text-red-800 font-medium"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 게시물 상세 */}
        {post && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* 작성자 정보 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleAuthorClick}
                  className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                >
                  <img
                    src={post.authorProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorAccountName)}&size=40&background=random`}
                    alt={post.authorAccountName}
                    className="h-10 w-10 rounded-full"
                  />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{post.authorAccountName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </button>

                {/* 팔로우 버튼 (내 게시물이 아닌 경우) */}
                {!post.isMyPost && (
                  <button
                    onClick={handleFollow}
                    disabled={loading.action}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      post.isFollowingAuthor
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50`}
                  >
                    {loading.action ? (
                      <LoadingSpinner size="sm" />
                    ) : post.isFollowingAuthor ? (
                      <>
                        <UserMinusIcon className="h-4 w-4" />
                        <span>언팔로우</span>
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="h-4 w-4" />
                        <span>팔로우</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 게시물 이미지 */}
            <div className="relative">
              <img
                src={post.imgUrl}
                alt={post.caption || '게시물 이미지'}
                className="w-full h-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://picsum.photos/600/600?seed=${post.postId}`;
                }}
              />
            </div>

            {/* 좋아요 & 액션 */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={handleLike}
                  disabled={loading.action}
                  className="flex items-center space-x-2 text-gray-600 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {post.isLikedByMe ? (
                    <HeartSolidIcon className="h-6 w-6 text-red-500" />
                  ) : (
                    <HeartIcon className="h-6 w-6" />
                  )}
                  <span className="font-medium">{post.likeCount}</span>
                </button>
              </div>

              {/* 캡션 */}
              <div className="mb-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="캡션을 입력하세요..."
                      maxLength={200}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {editCaption.length}/200
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleEdit}
                          disabled={loading.action || !editCaption.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                        >
                          {loading.action ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {post.caption || '캡션이 없습니다.'}
                  </p>
                )}
              </div>

              {/* 게시물 정보 */}
              <div className="text-sm text-gray-500 pt-3 border-t border-gray-100">
                <p>
                  {new Date(post.createdAt).toLocaleString('ko-KR')}에 게시됨
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 py-2">
          {navigationItems.map((item) => {
            const Icon = item.current ? item.activeIcon : item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center py-2 px-1 ${
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

      {/* 액션 메뉴 오버레이 (모바일에서 외부 클릭 시 닫기) */}
      {showActions && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}
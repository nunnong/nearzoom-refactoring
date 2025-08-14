'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { useRouter } from 'next/navigation'
import { 
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon,
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolidIcon,
  MagnifyingGlassIcon as MagnifyingGlassSolidIcon,
  UserIcon as UserSolidIcon,
  CalendarIcon as CalendarSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid'

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

// 🔥 백엔드 PostResponse 타입에 정확히 맞춤
interface PostResponse {
  postId: number
  photoId: number
  imgUrl: string
  caption: string
  displayOrder: number
  createdAt: string
  likeCount: number
  isLikedByMe: boolean
  authorId: number
  authorAccountName: string
  authorProfileImage: string
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

// 🔥 팔로잉 타임라인 조회 (FeedController.getTimelinePosts)
const getTimelinePosts = async (size: number = 20): Promise<PostResponse[]> => {
  try {
    const response = await api.get<ApiResponse<PostResponse[]>>(`/feeds/timeline?size=${size}`)
    
    if (response.data.error) {
      throw new Error(response.data.message)
    }
    
    return response.data.data
  } catch (error: any) {
    console.error('Failed to fetch timeline posts:', error)
    throw error
  }
}

// 🔥 게시물 좋아요 토글 (LikesController.likePost/unlikePost)
const togglePostLike = async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
  try {
    if (isCurrentlyLiked) {
      await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`)
    } else {
      await api.post<ApiResponse<void>>(`/likes/posts/${postId}`)
    }
  } catch (error: any) {
    console.error('Failed to toggle like:', error)
    throw error
  }
}

// Timeline 컴포넌트
const Timeline: React.FC = () => {
  const [posts, setPosts] = useState<PostResponse[]>([])
  const [loading, setLoading] = useState({ initial: true, loadMore: false })
  const [error, setError] = useState<string | null>(null)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const router = useRouter()

  // ============================================================================
  // 🔥 백엔드 데이터 로딩
  // ============================================================================

  useEffect(() => {
    loadTimelinePosts()
  }, [])

  const loadTimelinePosts = async () => {
    try {
      setLoading({ initial: true, loadMore: false })
      setError(null)

      const timelinePosts = await getTimelinePosts(20)
      setPosts(timelinePosts)
      setHasMorePosts(timelinePosts.length >= 20)

      console.log('타임라인 게시물 로드 완료:', timelinePosts.length)

    } catch (error: any) {
      console.error('타임라인 로드 실패:', error)
      
      let errorMessage = '타임라인을 불러오는데 실패했습니다.'
      if (error?.response?.status === 401) {
        errorMessage = '로그인이 필요합니다.'
      } else if (error?.response?.status === 403) {
        errorMessage = '타임라인에 접근할 권한이 없습니다.'
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading({ initial: false, loadMore: false })
    }
  }

  // 더 많은 게시물 로드 (미래 구현용)
  const loadMorePosts = async () => {
    if (!hasMorePosts || loading.loadMore) return

    try {
      setLoading(prev => ({ ...prev, loadMore: true }))
      
      // 현재는 페이지네이션이 없으므로 단순히 더 많은 게시물 요청
      const morePosts = await getTimelinePosts(40)
      
      if (morePosts.length > posts.length) {
        setPosts(morePosts)
        setHasMorePosts(morePosts.length >= 40)
      } else {
        setHasMorePosts(false)
      }
      
    } catch (error: any) {
      console.error('추가 게시물 로드 실패:', error)
    } finally {
      setLoading(prev => ({ ...prev, loadMore: false }))
    }
  }

  // ============================================================================
  // 🔥 이벤트 핸들러들
  // ============================================================================

  // 좋아요 토글
  const handleLike = async (post: PostResponse) => {
    try {
      // 낙관적 업데이트
      setPosts(prev => prev.map(p => 
        p.postId === post.postId 
          ? { 
              ...p, 
              isLikedByMe: !p.isLikedByMe,
              likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1
            }
          : p
      ))

      // 백엔드 API 호출
      await togglePostLike(post.postId, post.isLikedByMe)
      
      console.log(`좋아요 ${post.isLikedByMe ? '취소' : '추가'} 완료:`, post.postId)
      
    } catch (error: any) {
      console.error('좋아요 처리 실패:', error)
      
      // 실패 시 롤백
      setPosts(prev => prev.map(p => 
        p.postId === post.postId 
          ? post  // 원래 상태로 복원
          : p
      ))
      
      const errorMessage = error?.response?.data?.message || '좋아요 처리에 실패했습니다.'
      alert(errorMessage)
    }
  }

  // 게시물 상세로 이동
  const handlePostClick = (post: PostResponse) => {
    router.push(`/feeds/posts/${post.postId}`)
  }

  // 작성자 프로필로 이동
  const handleAuthorClick = (post: PostResponse) => {
    router.push(`/feeds/users/account/${post.authorAccountName}`)
  }

  // 공유 기능
  const handleShare = (post: PostResponse) => {
    if (navigator.share) {
      navigator.share({
        title: `${post.authorAccountName}님의 게시물`,
        text: post.caption || '게시물을 확인해보세요!',
        url: `${window.location.origin}/feeds/posts/${post.postId}`
      })
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/feeds/posts/${post.postId}`)
      alert('링크가 클립보드에 복사되었습니다!')
    }
  }

  // 에러 재시도
  const handleRetry = () => {
    setError(null)
    loadTimelinePosts()
  }

  // ============================================================================
  // 🔥 렌더링
  // ============================================================================

  if (loading.initial) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">타임라인을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <HomeIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">타임라인이 비어있습니다</h3>
          <p className="text-gray-500 mb-6">
            팔로우하는 사용자가 없거나 아직 게시물이 없습니다.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/explore')}
              className="block w-full sm:w-auto sm:inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다른 사용자 탐색하기
            </button>
            <button
              onClick={() => router.push('/myroom')}
              className="block w-full sm:w-auto sm:inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              첫 게시물 만들기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {posts.map((post) => (
        <div key={post.postId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 게시물 헤더 */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleAuthorClick(post)}
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
              
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 게시물 이미지 */}
          <div className="relative">
            <img
              src={post.imgUrl}
              alt={post.caption || '게시물 이미지'}
              className="w-full h-auto cursor-pointer"
              onClick={() => handlePostClick(post)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://picsum.photos/600/600?seed=${post.postId}`;
              }}
            />
          </div>

          {/* 게시물 액션 */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleLike(post)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
                >
                  {post.isLikedByMe ? (
                    <HeartSolidIcon className="h-6 w-6 text-red-500" />
                  ) : (
                    <HeartIcon className="h-6 w-6" />
                  )}
                  <span className="text-sm font-medium">{post.likeCount}</span>
                </button>
                
                <button
                  onClick={() => handlePostClick(post)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors"
                >
                  <ChatBubbleOvalLeftIcon className="h-6 w-6" />
                  <span className="text-sm">댓글</span>
                </button>
                
                <button
                  onClick={() => handleShare(post)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors"
                >
                  <ShareIcon className="h-6 w-6" />
                  <span className="text-sm">공유</span>
                </button>
              </div>
            </div>

            {/* 좋아요 수 */}
            {post.likeCount > 0 && (
              <p className="text-sm font-medium text-gray-900 mb-2">
                좋아요 {post.likeCount}개
              </p>
            )}

            {/* 캡션 */}
            {post.caption && (
              <div className="mb-2">
                <span className="font-medium text-gray-900 mr-2">{post.authorAccountName}</span>
                <span className="text-gray-800">{post.caption}</span>
              </div>
            )}

            {/* 게시 시간 */}
            <p className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>
      ))}

      {/* 더보기 버튼 */}
      {hasMorePosts && (
        <div className="text-center py-6">
          <button
            onClick={loadMorePosts}
            disabled={loading.loadMore}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading.loadMore ? (
              <>
                <LoadingSpinner size="sm" className="mr-2 inline" />
                로딩 중...
              </>
            ) : (
              '더 보기'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

const TimelinePage: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 🔥 요구사항대로 수정된 네비게이션 메뉴 항목들
  const navigationItems = [
    {
      name: 'Timeline',
      href: '/timeline',
      icon: HomeIcon, // 홈 아이콘으로 변경
      activeIcon: HomeSolidIcon,
      current: true, // 현재 페이지
      showLabel: false // 라벨 표시
    },
    {
      name: 'Explore',
      href: '/explore',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassSolidIcon,
      current: false,
      showLabel: false // 아이콘만 표시
    },
    {
      name: 'My Profile',
      href: '/my',
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      current: false,
      showLabel: false // 아이콘만 표시
    },
    {
      name: 'My Room',
      href: '/myroom', // URL 수정
      icon: CalendarIcon,
      activeIcon: CalendarSolidIcon,
      current: false,
      showLabel: true // 라벨 표시
    }
  ]

  // 네비게이션 핸들러
  const handleNavigation = (href: string) => {
    router.push(href)
    setIsMobileMenuOpen(false) // 모바일 메뉴 닫기
  }

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 경우
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500 mb-4">타임라인을 보려면 로그인해 주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 네비게이션 헤더 */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* MyDiary 브랜드 - 메인페이지로 이동 */}
            <div className="flex items-center">
              <button
                onClick={() => handleNavigation('/')}
                className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                📖 MyDiary
              </button>
            </div>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.map((item) => {
                  const Icon = item.current ? item.activeIcon : item.icon
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title={item.name} // 툴팁 추가
                    >
                      <Icon className="h-5 w-5" />
                      {/* showLabel이 true인 경우만 라벨 표시 */}
                      {item.showLabel && <span>{item.name}</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 사용자 정보 (데스크톱) */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img
                  src={(user as any)?.profileImage || user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&size=32&background=random`}
                  alt={user.name || 'User'}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {(user as any)?.userName || user.name || 'User'}
                </span>
              </div>
            </div>

            {/* 모바일 메뉴 버튼 */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
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

        {/* 🔥 모바일 네비게이션 메뉴 */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
              {/* 사용자 정보 */}
              <div className="flex items-center space-x-3 px-3 py-2 mb-3">
                <img
                  src={(user as any)?.profileImage || user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&size=40&background=random`}
                  alt={user.name || 'User'}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {(user as any)?.userName || user.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(user as any)?.userEmail || user.email || 'user@example.com'}
                  </div>
                </div>
              </div>

              {/* 네비게이션 항목들 - 모바일에서는 모든 라벨 표시 */}
              {navigationItems.map((item) => {
                const Icon = item.current ? item.activeIcon : item.icon
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
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 🔥 메인 컨텐츠 */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Timeline />
        </div>
      </main>

      {/* 🔥 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className={`grid grid-cols-${navigationItems.length} py-2`}>
          {navigationItems.map((item) => {
            const Icon = item.current ? item.activeIcon : item.icon
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
            )
          })}
        </div>
      </div>

      {/* 🔥 모바일 하단 네비게이션 공간 확보 */}
      <div className="md:hidden h-20"></div>
    </div>
  )
}

export default TimelinePage
// src/components/page/timeline/InfiniteScrollTimeline.tsx - 오류 수정 완료

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TimelinePostComponent from './TimelinePost'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

// 🔥 백엔드 연동 - 기존 타입 시스템 활용 (import 충돌 해결)
import type { 
  PostResponse, 
  ApiResponse
} from '@/lib/types/feed'
import axios from 'axios'

// ============================================================================
// 컴포넌트 Props 인터페이스
// ============================================================================

interface InfiniteScrollTimelineProps {
  className?: string
  type?: 'timeline' | 'explore' // timeline: 팔로잉 피드, explore: 랜덤 피드
}

// ============================================================================
// 백엔드 API 설정
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 인증 토큰 인터셉터
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const timelineAPI = {
  // 🔥 GET /feeds/timeline - 팔로잉하는 사용자들의 최신 게시물들 조회
  getTimelinePosts: async (size: number = 20): Promise<PostResponse[]> => {
    try {
      const response = await api.get<ApiResponse<PostResponse[]>>('/feeds/timeline', {
        params: { size }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get timeline posts:', error);
      throw error;
    }
  },

  // 🔥 GET /feeds/explore - 모든 사용자의 게시물 랜덤 조회
  getExplorePosts: async (size: number = 20): Promise<PostResponse[]> => {
    try {
      const response = await api.get<ApiResponse<PostResponse[]>>('/feeds/explore', {
        params: { size }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get explore posts:', error);
      throw error;
    }
  },

  // 🔥 POST /likes/posts/{postId} - 게시물에 좋아요
  likePost: async (postId: number): Promise<void> => {
    try {
      await api.post<ApiResponse<void>>(`/likes/posts/${postId}`);
    } catch (error) {
      console.error('Failed to like post:', error);
      throw error;
    }
  },

  // 🔥 DELETE /likes/posts/{postId} - 게시물 좋아요 취소
  unlikePost: async (postId: number): Promise<void> => {
    try {
      await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`);
    } catch (error) {
      console.error('Failed to unlike post:', error);
      throw error;
    }
  },

  // 🔥 GET /likes/posts/{postId}/count - 게시물 좋아요 수 조회
  getLikeCount: async (postId: number): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<number>>(`/likes/posts/${postId}/count`);
      return response.data.data || 0;
    } catch (error) {
      console.error('Failed to get like count:', error);
      return 0;
    }
  }
};

// ============================================================================
// TimelinePost 컴포넌트가 기대하는 인터페이스 (오류 해결)
// ============================================================================

interface TimelinePost {
  id: string;
  postId: number;
  photoId: number;
  imgUrl: string;        // imageUrl → imgUrl로 수정
  caption: string;       // content → caption으로 수정
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;  // isLiked → isLikedByMe로 수정
  authorId: number;      // 추가
  authorAccountName: string; // authorName → authorAccountName로 수정
  authorProfileImage?: string; // authorAvatar → authorProfileImage로 수정
  source: 'timeline' | 'explore';
  displayOrder?: number;
  timeAgo?: string;
  formattedLikeCount?: string;
}

// ============================================================================
// 유틸리티 함수들 (import 충돌 해결을 위해 로컬 정의)
// ============================================================================

// 시간 포맷팅 함수 (로컬 정의)
const formatTimeAgoLocal = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return '방금 전'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`
  
  return date.toLocaleDateString('ko-KR')
}

// 좋아요 수 포맷팅 함수 (로컬 정의)
const formatLikeCountLocal = (count: number): string => {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`
  return `${(count / 1000000).toFixed(1)}m`
}

// PostResponse를 TimelinePost로 변환 (필드명 수정)
const convertPostForTimeline = (post: PostResponse, type: 'timeline' | 'explore'): TimelinePost => {
  return {
    id: post.postId.toString(),
    postId: post.postId,
    photoId: post.photoId,
    imgUrl: post.imgUrl,                    // ✅ 올바른 필드명
    caption: post.caption || '',            // ✅ 올바른 필드명
    createdAt: post.createdAt,
    likeCount: post.likeCount,
    isLikedByMe: post.isLikedByMe,         // ✅ 올바른 필드명
    authorId: post.authorId,               // ✅ 추가된 필드
    authorAccountName: post.authorAccountName, // ✅ 올바른 필드명
    authorProfileImage: post.authorProfileImage || undefined, // ✅ 올바른 필드명
    source: type,
    displayOrder: post.displayOrder || undefined,
    timeAgo: formatTimeAgoLocal(post.createdAt),
    formattedLikeCount: formatLikeCountLocal(post.likeCount),
  };
};

// ============================================================================
// InfiniteScrollTimeline 컴포넌트
// ============================================================================

const InfiniteScrollTimeline: React.FC<InfiniteScrollTimelineProps> = ({
  className = '',
  type = 'explore'
}) => {
  const router = useRouter()
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // ============================================================================
  // 백엔드 연동 - 데이터 로드 함수들
  // ============================================================================

  // 초기 게시물 로드
  const loadInitialPosts = useCallback(async () => {
    setIsInitialLoading(true);
    setLoading(true);
    setError(null);

    try {
      console.log(`=== ${type} 초기 로드 시작 ===`);
      
      const apiCall = type === 'timeline' 
        ? timelineAPI.getTimelinePosts(20)
        : timelineAPI.getExplorePosts(20);
      
      const postsData = await apiCall;
      const convertedPosts = postsData.map(post => convertPostForTimeline(post, type));
      
      console.log(`✅ ${type} 초기 로드 완료:`, {
        count: convertedPosts.length,
        hasMore: convertedPosts.length >= 20
      });

      setPosts(convertedPosts);
      setHasMore(convertedPosts.length >= 20);
      setPage(1);
      
    } catch (err) {
      console.error(`❌ ${type} 초기 로드 실패:`, err);
      setError('게시물을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [type]);

  // 추가 게시물 로드 (무한 스크롤용)
  const loadMorePosts = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`=== ${type} 추가 로드 시작 (페이지: ${page}) ===`);
      
      // 현재는 랜덤 데이터를 다시 가져옴 (explore는 항상 새로운 데이터)
      const apiCall = type === 'timeline' 
        ? timelineAPI.getTimelinePosts(20)
        : timelineAPI.getExplorePosts(20);
      
      const newPostsData = await apiCall;
      const newConvertedPosts = newPostsData.map(post => convertPostForTimeline(post, type));
      
      // 중복 제거
      const existingPostIds = new Set(posts.map(p => p.postId));
      const uniqueNewPosts = newConvertedPosts.filter(post => !existingPostIds.has(post.postId));
      
      console.log(`✅ ${type} 추가 로드 완료:`, {
        newCount: newConvertedPosts.length,
        uniqueNewCount: uniqueNewPosts.length,
        totalCount: posts.length + uniqueNewPosts.length
      });

      if (uniqueNewPosts.length > 0) {
        setPosts(prev => [...prev, ...uniqueNewPosts]);
      } else {
        setHasMore(false);
      }
      
      setPage(prev => prev + 1);
      
    } catch (err) {
      console.error(`❌ ${type} 추가 로드 실패:`, err);
      setError('더 많은 게시물을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [type, loading, hasMore, posts, page]);

  // 새로고침
  const refreshPosts = useCallback(async () => {
    setPosts([]);
    setHasMore(true);
    setError(null);
    setPage(0);
    await loadInitialPosts();
  }, [loadInitialPosts]);

  // ============================================================================
  // 좋아요 처리 함수들
  // ============================================================================

  // 좋아요 토글 (낙관적 업데이트)
  const toggleLike = useCallback(async (postIdStr: string) => {
    const postId = parseInt(postIdStr);
    const post = posts.find(p => p.postId === postId);
    if (!post) return;

    const wasLiked = post.isLikedByMe;
    
    // 낙관적 업데이트
    setPosts(prevPosts => prevPosts.map(p => 
      p.postId === postId 
        ? { 
            ...p, 
            isLikedByMe: !wasLiked, 
            likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1,
            formattedLikeCount: formatLikeCountLocal(wasLiked ? p.likeCount - 1 : p.likeCount + 1)
          }
        : p
    ));

    try {
      console.log(`=== 좋아요 토글 시작 ===`, { postId, wasLiked });
      
      // 🔥 실제 백엔드 API 호출
      if (wasLiked) {
        await timelineAPI.unlikePost(postId);
      } else {
        await timelineAPI.likePost(postId);
      }

      console.log(`✅ 좋아요 토글 성공:`, { postId, newLiked: !wasLiked });

      // 실제 좋아요 수 다시 가져오기 (선택적)
      try {
        const actualLikeCount = await timelineAPI.getLikeCount(postId);
        setPosts(prevPosts => prevPosts.map(p => 
          p.postId === postId 
            ? { 
                ...p, 
                likeCount: actualLikeCount,
                formattedLikeCount: formatLikeCountLocal(actualLikeCount)
              }
            : p
        ));
      } catch (countError) {
        console.warn('좋아요 수 업데이트 실패:', countError);
      }

    } catch (error) {
      console.error('❌ 좋아요 토글 실패:', error);
      
      // 실패 시 롤백 - 원래 상태로 되돌리기
      setPosts(prevPosts => prevPosts.map(p => 
        p.postId === postId 
          ? { 
              ...p, 
              isLikedByMe: wasLiked, 
              likeCount: post.likeCount,
              formattedLikeCount: formatLikeCountLocal(post.likeCount)
            }
          : p
      ));
      
      setError('좋아요 처리 중 오류가 발생했습니다.');
      
      // 3초 후 에러 메시지 제거
      setTimeout(() => setError(null), 3000);
    }
  }, [posts]);

  // ============================================================================
  // 무한 스크롤 훅
  // ============================================================================

  const { targetRef } = useInfiniteScroll({
    onIntersect: loadMorePosts,
    threshold: 0.1,
    enabled: !loading && hasMore && posts.length > 0,
  });

  // ============================================================================
  // 초기 로드
  // ============================================================================

  useEffect(() => {
    loadInitialPosts();
  }, [loadInitialPosts]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleLike = useCallback((postId: string) => {
    toggleLike(postId);
  }, [toggleLike]);

  const handleUserClick = useCallback((accountName: string) => {
    router.push(`/profile/${accountName}`);
  }, [router]);

  const handlePhotoClick = useCallback((postId: string) => {
    router.push(`/feeds/posts/${postId}`);
  }, [router]);

  const handleExploreClick = useCallback(() => {
    router.push('/explore');
  }, [router]);

  const handleRetry = useCallback(async () => {
    if (posts.length === 0) {
      await loadInitialPosts();
    } else {
      await loadMorePosts();
    }
  }, [posts.length, loadInitialPosts, loadMorePosts]);

  const handleRefresh = useCallback(() => {
    refreshPosts();
  }, [refreshPosts]);

  // ============================================================================
  // 렌더링 - 에러 상태
  // ============================================================================

  if (error && posts.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.054 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {type === 'timeline' ? '타임라인 로드 오류' : '탐색 피드 로드 오류'}
          </h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">{error}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            {type === 'timeline' && (
              <button
                onClick={handleExploreClick}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                둘러보기로 이동
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // 렌더링 - 빈 상태
  // ============================================================================

  if (posts.length === 0 && !isInitialLoading) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {type === 'timeline' ? '타임라인이 비어있어요' : '탐색할 피드가 없어요'}
          </h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            {type === 'timeline' 
              ? '다른 사용자들을 팔로우해서 그들의 최신 업데이트를 확인해보세요!'
              : '새로운 피드가 곧 업데이트될 예정입니다.'
            }
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              새로고침
            </button>
            {type === 'timeline' && (
              <button
                onClick={handleExploreClick}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                사람들 둘러보기
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {type === 'timeline' ? 'Timeline' : 'Explore'}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isInitialLoading}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <p className="text-gray-600 mt-2">
          {type === 'timeline' 
            ? '팔로우한 친구들의 최신 업데이트' 
            : '새로운 사람들과 콘텐츠 탐색'
          }
        </p>
      </div>

      {/* 초기 로딩 */}
      {isInitialLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            {type === 'timeline' ? '타임라인을 불러오는 중...' : '피드를 탐색하는 중...'}
          </p>
        </div>
      )}

      {/* 포스트 목록 */}
      {posts.length > 0 && (
        <div className="space-y-8">
          {posts.map((post, index) => (
            <TimelinePostComponent
              key={`${post.postId}-${index}`}
              post={post}
              onLike={handleLike}
              onUserClick={handleUserClick}
              onPhotoClick={handlePhotoClick}
            />
          ))}
        </div>
      )}

      {/* 더 로딩 중 */}
      {loading && posts.length > 0 && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-3 text-gray-600">더 많은 포스트 로딩 중...</span>
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      {hasMore && !loading && posts.length > 0 && (
        <div ref={targetRef} className="h-10" />
      )}

      {/* 끝 메시지 */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 border-t border-gray-200 mt-8">
          <p className="text-gray-500">
            {type === 'timeline' 
              ? '모든 포스트를 확인했습니다! 🎉' 
              : '모든 피드를 탐색했습니다! 🎉'
            }
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            맨 위로 이동
          </button>
        </div>
      )}

      {/* 에러 메시지 (포스트가 있는 상태에서) */}
      {error && posts.length > 0 && (
        <div className="text-center py-4 bg-red-50 rounded-lg mx-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-30 max-w-xs">
          <div className="font-semibold mb-1">🔥 Timeline 개발 정보</div>
          <div>타입: {type}</div>
          <div>게시물 수: {posts.length}</div>
          <div>페이지: {page}</div>
          <div>더 있음: {hasMore ? 'Yes' : 'No'}</div>
          <div>로딩 중: {loading ? 'Yes' : 'No'}</div>
          <div>초기 로딩: {isInitialLoading ? 'Yes' : 'No'}</div>
          <div>에러: {error ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  )
}

export default InfiniteScrollTimeline
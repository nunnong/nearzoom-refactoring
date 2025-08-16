// =============================================================================
// 📁 InfiniteScrollTimeline.tsx - 백엔드 완벽 연동 최종 버전
// =============================================================================

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import TimelinePostComponent from './TimelinePost'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 🔥 백엔드 연동
import api from '@/lib/axios'

// ============================================================================
// 간단한 무한스크롤 훅 (로컬 정의)
// ============================================================================

interface UseInfiniteScrollOptions {
  onIntersect: () => void | Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

const useInfiniteScrollLocal = ({ onIntersect, threshold = 0.1, enabled = true }: UseInfiniteScrollOptions) => {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !targetRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onIntersect();
        }
      },
      { threshold }
    );

    observer.observe(targetRef.current);

    return () => observer.disconnect();
  }, [onIntersect, threshold, enabled]);

  return { targetRef };
};

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
  postId: number;              // Long -> number
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

// 🔥 PostListResponse.java 기반 (마이룸과 동일한 구조)
interface PostListResponse {
  posts: PostResponse[];
  hasNext: boolean;
  nextCursor: number | null;   // Long -> number | null
}

// TimelinePost 컴포넌트가 기대하는 인터페이스
interface TimelinePost {
  id: string;
  postId: number;
  photoId: number;
  imgUrl: string;
  caption: string;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  authorId: number;
  authorAccountName: string;
  authorProfileImage?: string;
  source: 'timeline' | 'explore';
  displayOrder?: number;
  timeAgo?: string;
  formattedLikeCount?: string;
}

interface InfiniteScrollTimelineProps {
  className?: string;
  type?: 'timeline' | 'explore'; // timeline: 팔로잉 피드, explore: 랜덤 피드
}

// ============================================================================
// 백엔드 API 함수들 (실제 구현된 엔드포인트만 사용)
// ============================================================================

const timelineAPI = {
  // 🔥 GET /feeds/timeline?limit=20&cursor=123 - 팔로잉하는 사용자들의 최신 게시물들 조회
  getTimelinePosts: async (limit: number = 20, cursor?: number): Promise<PostListResponse> => {
    console.log('🔥 API 요청 - GET /feeds/timeline', { limit, cursor });

    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    const response = await api.get<ApiResponse<PostListResponse>>('/feeds/timeline', { params });

    if (response.data.error) {
      throw new Error(response.data.message || '타임라인을 불러올 수 없습니다.');
    }

    console.log('🔥 API 응답 - 타임라인:', response.data.data);
    return response.data.data;
  },

  // 🔥 GET /feeds/explore?limit=20&cursor=123 - 모든 사용자의 게시물 랜덤 조회
  getExplorePosts: async (limit: number = 20, cursor?: number): Promise<PostListResponse> => {
    console.log('🔥 API 요청 - GET /feeds/explore', { limit, cursor });

    const params: Record<string, any> = { limit };
    if (cursor) params.cursor = cursor;

    const response = await api.get<ApiResponse<PostListResponse>>('/feeds/explore', { params });

    if (response.data.error) {
      throw new Error(response.data.message || '탐색 피드를 불러올 수 없습니다.');
    }

    console.log('🔥 API 응답 - 탐색 피드:', response.data.data);
    return response.data.data;
  },

  // 🔥 POST /likes/posts/{postId} - 게시물에 좋아요
  likePost: async (postId: number): Promise<void> => {
    console.log('🔥 API 요청 - POST /likes/posts/' + postId);

    const response = await api.post<ApiResponse<void>>(`/likes/posts/${postId}`);

    if (response.data.error) {
      throw new Error(response.data.message || '좋아요에 실패했습니다.');
    }

    console.log('🔥 API 응답 - 좋아요 성공');
  },

  // 🔥 DELETE /likes/posts/{postId} - 게시물 좋아요 취소
  unlikePost: async (postId: number): Promise<void> => {
    console.log('🔥 API 요청 - DELETE /likes/posts/' + postId);

    const response = await api.delete<ApiResponse<void>>(`/likes/posts/${postId}`);

    if (response.data.error) {
      throw new Error(response.data.message || '좋아요 취소에 실패했습니다.');
    }

    console.log('🔥 API 응답 - 좋아요 취소 성공');
  },

  // 🔥 GET /likes/posts/{postId}/count - 게시물 좋아요 수 조회
  getLikeCount: async (postId: number): Promise<number> => {
    console.log('🔥 API 요청 - GET /likes/posts/' + postId + '/count');

    const response = await api.get<ApiResponse<number>>(`/likes/posts/${postId}/count`);

    if (response.data.error) {
      console.warn('좋아요 수 조회 실패:', response.data.message);
      return 0;
    }

    console.log('🔥 API 응답 - 좋아요 수:', response.data.data);
    return response.data.data;
  },

  // 🔥 좋아요 토글 (기존 상태에 따라 좋아요/취소)
  toggleLike: async (postId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      await timelineAPI.unlikePost(postId);
    } else {
      await timelineAPI.likePost(postId);
    }
  },
};

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// 시간 포맷팅 함수
const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;

  return date.toLocaleDateString('ko-KR');
};

// 좋아요 수 포맷팅 함수
const formatLikeCount = (count: number): string => {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}m`;
};

// PostResponse를 TimelinePost로 변환
const convertPostForTimeline = (post: PostResponse, type: 'timeline' | 'explore'): TimelinePost => {
  return {
    id: post.postId.toString(),
    postId: post.postId,
    photoId: post.photoId,
    imgUrl: post.imgUrl,
    caption: post.caption || '',
    createdAt: post.createdAt,
    likeCount: post.likeCount,
    isLikedByMe: post.isLikedByMe,
    authorId: post.authorId,
    authorAccountName: post.authorAccountName,
    authorProfileImage: post.authorProfileImage || undefined,
    source: type,
    displayOrder: post.displayOrder || undefined,
    timeAgo: formatTimeAgo(post.createdAt),
    formattedLikeCount: formatLikeCount(post.likeCount),
  };
};

// ============================================================================
// InfiniteScrollTimeline 컴포넌트
// ============================================================================

function InfiniteScrollTimeline({
  className = '',
  type = 'explore'
}: InfiniteScrollTimelineProps): React.ReactElement {
  const router = useRouter();

  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  // ============================================================================
  // 에러 처리
  // ============================================================================

  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);

    let errorMessage = '알 수 없는 오류가 발생했습니다.';

    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage = '로그인이 필요합니다.';
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('404') || err.message.includes('Not Found')) {
        errorMessage = '데이터를 찾을 수 없습니다.';
      } else {
        errorMessage = err.message;
      }
    }

    setError(errorMessage);
  }, []);

  // ============================================================================
  // 백엔드 연동 - 데이터 로드 함수들 (커서 기반 무한스크롤)
  // ============================================================================

  // 초기 게시물 로드
  const loadInitialPosts = useCallback(async () => {
    setIsInitialLoading(true);
    setLoading(true);
    setError(null);

    try {
      console.log(`🔥 ${type} 초기 로드 시작`);

      const apiCall = type === 'timeline'
        ? timelineAPI.getTimelinePosts(20)
        : timelineAPI.getExplorePosts(20);

      const postsData = await apiCall;
      const convertedPosts = postsData.posts.map(post => convertPostForTimeline(post, type));

      console.log(`🔥 ${type} 초기 로드 완료:`, {
        count: convertedPosts.length,
        hasNext: postsData.hasNext,
        nextCursor: postsData.nextCursor
      });

      setPosts(convertedPosts);
      setHasMore(postsData.hasNext);
      setNextCursor(postsData.nextCursor);

    } catch (err) {
      console.error(`❌ ${type} 초기 로드 실패:`, err);
      handleError(err, `${type} 초기 로드`);
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [type, handleError]);

  // 추가 게시물 로드 (무한 스크롤용 - 커서 기반)
  const loadMorePosts = useCallback(async () => {
    if (loading || !hasMore || !nextCursor) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🔥 ${type} 추가 로드 시작 (커서: ${nextCursor})`);

      const apiCall = type === 'timeline'
        ? timelineAPI.getTimelinePosts(20, nextCursor)
        : timelineAPI.getExplorePosts(20, nextCursor);

      const newPostsData = await apiCall;
      const newConvertedPosts = newPostsData.posts.map(post => convertPostForTimeline(post, type));

      console.log(`🔥 ${type} 추가 로드 완료:`, {
        newCount: newConvertedPosts.length,
        totalCount: posts.length + newConvertedPosts.length,
        hasNext: newPostsData.hasNext,
        nextCursor: newPostsData.nextCursor
      });

      if (newConvertedPosts.length > 0) {
        setPosts(prev => [...prev, ...newConvertedPosts]);
      }

      setHasMore(newPostsData.hasNext);
      setNextCursor(newPostsData.nextCursor);

    } catch (err) {
      console.error(`❌ ${type} 추가 로드 실패:`, err);
      handleError(err, `${type} 추가 로드`);
    } finally {
      setLoading(false);
    }
  }, [type, loading, hasMore, nextCursor, posts.length, handleError]);

  // 새로고침
  const refreshPosts = useCallback(async () => {
    setPosts([]);
    setHasMore(true);
    setNextCursor(null);
    setError(null);
    await loadInitialPosts();
  }, [loadInitialPosts]);

  // ============================================================================
  // 좋아요 처리 함수들 (백엔드 연동)
  // ============================================================================

  // 좋아요 토글 (낙관적 업데이트 + 백엔드 동기화)
  const toggleLike = useCallback(async (postIdStr: string) => {
    const postId = parseInt(postIdStr);
    const post = posts.find(p => p.postId === postId);
    if (!post) return;

    const wasLiked = post.isLikedByMe;
    const originalLikeCount = post.likeCount;

    // 낙관적 업데이트
    const newLikeCount = wasLiked ? originalLikeCount - 1 : originalLikeCount + 1;

    setPosts(prevPosts => prevPosts.map(p =>
      p.postId === postId
        ? {
          ...p,
          isLikedByMe: !wasLiked,
          likeCount: newLikeCount,
          formattedLikeCount: formatLikeCount(newLikeCount)
        }
        : p
    ));

    try {
      console.log(`🔥 좋아요 토글 시작:`, { postId, wasLiked });

      // 🔥 실제 백엔드 API 호출
      await timelineAPI.toggleLike(postId, wasLiked);

      console.log(`🔥 좋아요 토글 성공:`, { postId, newLiked: !wasLiked });

      // 🔥 실제 좋아요 수 동기화 (선택적)
      try {
        const actualLikeCount = await timelineAPI.getLikeCount(postId);
        setPosts(prevPosts => prevPosts.map(p =>
          p.postId === postId
            ? {
              ...p,
              likeCount: actualLikeCount,
              formattedLikeCount: formatLikeCount(actualLikeCount)
            }
            : p
        ));
        console.log(`🔥 좋아요 수 동기화 완료:`, { postId, actualLikeCount });
      } catch (countError) {
        console.warn('좋아요 수 동기화 실패:', countError);
      }

    } catch (error) {
      console.error('❌ 좋아요 토글 실패:', error);

      // 실패 시 롤백
      setPosts(prevPosts => prevPosts.map(p =>
        p.postId === postId
          ? {
            ...p,
            isLikedByMe: wasLiked,
            likeCount: originalLikeCount,
            formattedLikeCount: formatLikeCount(originalLikeCount)
          }
          : p
      ));

      handleError(error, '좋아요 토글');

      // 3초 후 에러 메시지 제거
      setTimeout(() => setError(null), 3000);
    }
  }, [posts, handleError]);

  // ============================================================================
  // 무한 스크롤 훅 (로컬 정의 사용)
  // ============================================================================

  const { targetRef } = useInfiniteScrollLocal({
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
    router.push(`/profile/${accountName}`); // ✅ Timeline과 동일한 패턴
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

  // 맨 위로 이동
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    );
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
    );
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
            aria-label="새로고침"
          >
            <svg className={`w-5 h-5 ${isInitialLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            onClick={scrollToTop}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            맨 위로 이동
          </button>
        </div>
      )}

      {/* 에러 메시지 (포스트가 있는 상태에서) */}
      {error && posts.length > 0 && (
        <div className="text-center py-4 bg-red-50 rounded-lg mx-4 mt-4">
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
          <div>다음 커서: {nextCursor || 'None'}</div>
          <div>더 있음: {hasMore ? 'Yes' : 'No'}</div>
          <div>로딩 중: {loading ? 'Yes' : 'No'}</div>
          <div>초기 로딩: {isInitialLoading ? 'Yes' : 'No'}</div>
          <div>에러: {error ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 🔥 헬퍼 함수들 - export
// ============================================================================

export const convertPostResponseToTimelinePost = (
  post: PostResponse,
  type: 'timeline' | 'explore'
): TimelinePost => {
  return convertPostForTimeline(post, type);
};

// ============================================================================
// 🔥 커스텀 훅 - Timeline 상태 관리
// ============================================================================

export const useTimelinePosts = (type: 'timeline' | 'explore' = 'explore') => {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const loadPosts = useCallback(async (cursor?: number) => {
    setLoading(true);
    setError(null);

    try {
      const apiCall = type === 'timeline'
        ? timelineAPI.getTimelinePosts(20, cursor)
        : timelineAPI.getExplorePosts(20, cursor);

      const postsData = await apiCall;
      const convertedPosts = postsData.posts.map(post => convertPostForTimeline(post, type));

      if (cursor) {
        // 추가 로드
        setPosts(prev => [...prev, ...convertedPosts]);
      } else {
        // 초기 로드
        setPosts(convertedPosts);
      }

      setHasMore(postsData.hasNext);
      setNextCursor(postsData.nextCursor);

      return convertedPosts;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '게시물 로드에 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [type]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loading) return;
    return await loadPosts(nextCursor);
  }, [hasMore, nextCursor, loading, loadPosts]);

  const refresh = useCallback(async () => {
    setPosts([]);
    setHasMore(true);
    setNextCursor(null);
    setError(null);
    return await loadPosts();
  }, [loadPosts]);

  const updatePost = useCallback((postId: number, updates: Partial<TimelinePost>) => {
    setPosts(prev => prev.map(post =>
      post.postId === postId
        ? { ...post, ...updates }
        : post
    ));
  }, []);

  const togglePostLike = useCallback(async (postId: number) => {
    const post = posts.find(p => p.postId === postId);
    if (!post) return;

    const wasLiked = post.isLikedByMe;
    const originalLikeCount = post.likeCount;
    const newLikeCount = wasLiked ? originalLikeCount - 1 : originalLikeCount + 1;

    // 낙관적 업데이트
    updatePost(postId, {
      isLikedByMe: !wasLiked,
      likeCount: newLikeCount,
      formattedLikeCount: formatLikeCount(newLikeCount)
    });

    try {
      await timelineAPI.toggleLike(postId, wasLiked);

      // 실제 좋아요 수 동기화
      const actualLikeCount = await timelineAPI.getLikeCount(postId);
      updatePost(postId, {
        likeCount: actualLikeCount,
        formattedLikeCount: formatLikeCount(actualLikeCount)
      });

    } catch (error) {
      // 실패 시 롤백
      updatePost(postId, {
        isLikedByMe: wasLiked,
        likeCount: originalLikeCount,
        formattedLikeCount: formatLikeCount(originalLikeCount)
      });
      throw error;
    }
  }, [posts, updatePost]);

  return {
    posts,
    loading,
    error,
    hasMore,
    nextCursor,
    loadPosts,
    loadMore,
    refresh,
    updatePost,
    togglePostLike,
    setError
  };
};

// ============================================================================
// 🔥 백엔드 API 관련 타입 및 상수 export
// ============================================================================

export type {
  PostResponse,
  PostListResponse,
  TimelinePost,
  ApiResponse
};

export { timelineAPI, formatTimeAgo, formatLikeCount };

export default InfiniteScrollTimeline;
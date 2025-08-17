// src/components/page/explore/ExploreRandom.tsx - 수정된 프로필 클릭 핸들러 적용

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import RandomPhotoGrid from './RandomPhotoGrid'
import UserSearchBox from './UserSearchBox'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 🔥 올바른 아키텍처: api from '@/lib/axios' 사용 (인터셉터 + Zustand 토큰 + 자동 갱신)
import api from '@/lib/axios'

// 🔥 올바른 아키텍처: Zustand 토큰 스토어 (로그인 상태 관리)
import { useAuthStore } from '@/stores/authStore'

// 🔥 통합 프로필 라우팅 유틸리티 import
import { handleUserProfileClick } from '@/utils/profileNavigation'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 완전 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 백엔드 PostResponse 타입 (백엔드와 100% 일치)
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

// 🔥 백엔드 PostListResponse 타입 (마이룸과 동일한 구조)
interface PostListResponse {
  posts: PostResponse[];       // 게시물 목록
  hasNext: boolean;           // 다음 페이지 존재 여부
  nextCursor: number | null;  // 다음 커서 (마지막 postId)
}

// 프론트엔드에서 사용할 Explore 피드 타입
export interface ExploreFeed {
  id: string;               // postId를 문자열로 변환
  postId: number;           // 백엔드 postId
  name?: string;            // caption을 name으로 사용
  description?: string;     // caption을 description으로도 사용
  photoUrl: string;         // imgUrl
  authorId: string;         // authorAccountName을 id로 사용
  authorName: string;       // authorAccountName
  authorAvatar?: string;    // authorProfileImage
  createdAt: string;        // createdAt
  likesCount: number;       // likeCount
  followersCount: number;   // 기본값 0 (실제 데이터 없음)
  isLiked: boolean;         // isLikedByMe
  source: 'random' | 'popular' | 'recent' | 'recommended';
  discoverScore?: number;
}

interface ExploreRandomProps {
  className?: string;
}

// ============================================================================
// 백엔드 API 함수들 (커서 기반 무한스크롤 + 로그인 검증)
// ============================================================================

const exploreAPI = {
  // 🔥 GET /feeds/explore?limit=20&cursor=12345 - 백엔드 커서 방식 (로그인 필수)
  getExploreFeeds: async (limit: number = 20, cursor?: number): Promise<PostListResponse> => {
    const params: Record<string, any> = { limit };
    if (cursor) {
      params.cursor = cursor;
    }

    console.log('🔥 API 요청 (로그인 필수):', { endpoint: '/feeds/explore', params });

    try {
      // 🔥 올바른 아키텍처: api 인스턴스 사용 → 자동으로 인터셉터에서 토큰 처리 및 갱신
      const response = await api.get<ApiResponse<PostListResponse>>(
        '/feeds/explore',
        { params }
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || 'Explore 피드를 불러올 수 없습니다.');
      }
      
      console.log('🔥 API 응답 성공:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('🚨 API 요청 실패:', error);
      
      // 401 에러 시 로그인 페이지로 리다이렉트 (인터셉터에서 처리되지만 추가 처리)
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
      }
      
      // 403 에러 시 권한 없음
      if (error.response?.status === 403) {
        throw new Error('이 서비스를 이용할 권한이 없습니다.');
      }
      
      // 네트워크 에러
      if (!error.response) {
        throw new Error('네트워크 연결을 확인해주세요.');
      }
      
      // 기타 에러
      throw new Error(error.response?.data?.message || '서버 오류가 발생했습니다.');
    }
  },

  // 🔥 POST /posts/{postId}/like - 좋아요 토글 (로그인 필수)
  toggleLike: async (postId: number): Promise<{ isLiked: boolean; likeCount: number }> => {
    console.log('🔥 좋아요 토글 API 요청:', { postId });

    try {
      // 🔥 올바른 아키텍처: api 인스턴스 사용
      const response = await api.post<ApiResponse<{ isLiked: boolean; likeCount: number }>>(
        `/posts/${postId}/like`
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '좋아요 처리에 실패했습니다.');
      }
      
      console.log('🔥 좋아요 토글 성공:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('🚨 좋아요 토글 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      throw new Error(error.response?.data?.message || '좋아요 처리에 실패했습니다.');
    }
  },
};

// ============================================================================
// 디바이스별 최적화된 limit 계산
// ============================================================================

const getOptimalLimit = (): number => {
  if (typeof window === 'undefined') return 20;
  
  const width = window.innerWidth;
  
  if (width < 640) return 12;      // mobile
  if (width < 1024) return 18;     // tablet  
  return 24;                       // desktop
};

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// 🔥 PostResponse를 ExploreFeed로 변환
const transformPostToExploreFeed = (post: PostResponse): ExploreFeed => {
  return {
    id: post.postId.toString(),
    postId: post.postId,
    name: post.caption || undefined,
    description: post.caption || undefined,
    photoUrl: post.imgUrl,
    authorId: post.authorAccountName,
    authorName: post.authorAccountName,
    authorAvatar: post.authorProfileImage || undefined,
    createdAt: post.createdAt,
    likesCount: post.likeCount,
    followersCount: 0, // 백엔드에서 제공하지 않으므로 기본값
    isLiked: post.isLikedByMe,
    source: 'random',
    discoverScore: Math.random() * 100,
  };
};

// ============================================================================
// 메인 컴포넌트 (로그인 필수 + 백엔드 커서 무한스크롤 완전 연동)
// ============================================================================

const ExploreRandom: React.FC<ExploreRandomProps> = ({ className = '' }) => {
  const router = useRouter();
  
  // 🔥 올바른 아키텍처: Zustand 토큰 스토어에서 로그인 상태 확인
  const { 
    accessToken, 
    user,
    isLoading: authLoading,
    isAuthenticated,
    logout, 
    initializeAuth
  } = useAuthStore();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [feeds, setFeeds] = useState<ExploreFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
  // 무한스크롤을 위한 ref
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreElementRef = useRef<HTMLDivElement | null>(null);

  // ============================================================================
  // 🔥 로그인 상태 확인 및 리다이렉트
  // ============================================================================
  
  useEffect(() => {
    console.log('🔥 로그인 상태 체크:', {
      isAuthenticated,
      hasAccessToken: !!accessToken,
      user: user?.accountName
    });

    // 로그인 상태가 확인되었음을 표시
    setIsAuthChecked(true);

    console.log('✅ 로그인 상태 확인 완료. 서비스 이용 가능.');
  }, [isAuthenticated, accessToken, user, router]);

  // ============================================================================
  // 에러 처리 헬퍼
  // ============================================================================
  
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('로그인이 필요')) {
        errorMessage = '로그인이 필요합니다.';
        // 로그인 에러 시 자동 로그아웃 및 리다이렉트
        logout();
        const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
        router.replace(`/login?redirect=${currentPath}`);
        return;
      } else if (err.message.includes('403') || err.message.includes('권한이 없습니다')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('network') || err.message.includes('Network Error')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
  }, [logout, router]);

  // ============================================================================
  // 백엔드 API 연동 - 첫 페이지 로드 (로그인 필수)
  // ============================================================================
  
  const loadInitialFeeds = useCallback(async () => {
    // 로그인 상태가 확인되지 않았거나 로그인되지 않은 경우 로딩하지 않음
    if (!isAuthChecked || !isAuthenticated || !accessToken) {
      console.log('🚨 로그인 상태 미확인 또는 미로그인. 피드 로딩 스킵.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('=== 첫 페이지 로딩 시작 (로그인 사용자) ===', {
        user: user?.accountName,
        tokenPresent: !!accessToken
      });
      
      const limit = getOptimalLimit();
      
      // 🔥 백엔드 API 호출 (커서 없이 첫 페이지) - 인터셉터가 자동으로 토큰 처리
      const response = await exploreAPI.getExploreFeeds(limit);
      
      // 🔥 백엔드 PostResponse를 ExploreFeed로 변환
      const exploreFeeds = response.posts.map(transformPostToExploreFeed);
      
      setFeeds(exploreFeeds);
      setHasNext(response.hasNext);
      setNextCursor(response.nextCursor);
      
      console.log('=== 첫 페이지 로딩 완료 ===', {
        count: exploreFeeds.length,
        hasNext: response.hasNext,
        nextCursor: response.nextCursor,
        user: user?.accountName
      });
      
    } catch (err) {
      console.error('Failed to load initial feeds:', err);
      handleError(err, '첫 페이지 로딩');
      setFeeds([]);
      setHasNext(false);
      setNextCursor(null);
    } finally {
      setIsLoading(false);
    }
      }, [isAuthChecked, isAuthenticated, accessToken, user, handleError, refreshKey]);

  // ============================================================================
  // 백엔드 API 연동 - 다음 페이지 로드 (무한스크롤)
  // ============================================================================
  
  const loadMoreFeeds = useCallback(async () => {
    if (!hasNext || !nextCursor || isLoadingMore || !isAuthenticated || !accessToken) {
      return;
    }
    
    setIsLoadingMore(true);
    
    try {
      console.log('=== 다음 페이지 로딩 시작 (무한스크롤) ===', { 
        cursor: nextCursor,
        user: user?.accountName
      });
      
      const limit = getOptimalLimit();
      
      // 🔥 백엔드 API 호출 (커서 기반) - 인터셉터가 자동으로 토큰 처리
      const response = await exploreAPI.getExploreFeeds(limit, nextCursor);
      
      // 🔥 새로운 피드들을 기존 목록에 추가
      const newFeeds = response.posts.map(transformPostToExploreFeed);
      
      setFeeds(prev => [...prev, ...newFeeds]);
      setHasNext(response.hasNext);
      setNextCursor(response.nextCursor);
      
      console.log('=== 다음 페이지 로딩 완료 ===', {
        newCount: newFeeds.length,
        totalCount: feeds.length + newFeeds.length,
        hasNext: response.hasNext,
        nextCursor: response.nextCursor
      });
      
    } catch (err) {
      console.error('Failed to load more feeds:', err);
      handleError(err, '다음 페이지 로딩');
    } finally {
      setIsLoadingMore(false);
    }
      }, [hasNext, nextCursor, isLoadingMore, isAuthenticated, accessToken, user, feeds.length, handleError]);

  // ============================================================================
  // 무한스크롤 설정
  // ============================================================================
  
  useEffect(() => {
    if (!hasNext || isLoadingMore || !isAuthenticated) {
      return;
    }

    const loadMoreElement = loadMoreElementRef.current;
    if (!loadMoreElement) {
      return;
    }

    // Intersection Observer 설정
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          console.log('🔥 무한스크롤 트리거됨 (로그인 사용자)');
          loadMoreFeeds();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    observerRef.current.observe(loadMoreElement);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
      }, [hasNext, isLoadingMore, isAuthenticated, loadMoreFeeds]);

  // ============================================================================
  // 첫 로드 및 새로고침 시 실행 (로그인 상태 확인 후)
  // ============================================================================
  
  useEffect(() => {
    if (isAuthChecked && isAuthenticated && accessToken) {
      loadInitialFeeds();
    }
  }, [isAuthChecked, isAuthenticated, accessToken, refreshKey, loadInitialFeeds]);

  // ============================================================================
  // 화면 크기 변경 감지 (반응형 limit)
  // ============================================================================
  
  useEffect(() => {
    const handleResize = () => {
      // 로그인된 사용자만 화면 크기 변경에 반응
      if (isAuthenticated && accessToken) {
        console.log('🔥 화면 크기 변경 감지, 새로고침 (로그인 사용자)');
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
      }, [isAuthenticated, accessToken]);

  // ============================================================================
  // 이벤트 핸들러들 (🔥 수정된 프로필 클릭 핸들러 적용)
  // ============================================================================
  
  // 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    if (!isAuthenticated || !accessToken) {
      console.log('🚨 로그인이 필요합니다.');
      return;
    }
    console.log('=== Explore 새로고침 요청 (로그인 사용자) ===');
    setRefreshKey(prev => prev + 1);
  }, [isAuthenticated, accessToken]);

  // 🔥 피드 클릭 - 게시물 상세 페이지로 이동 (올바른 경로로 수정)
  const handleFeedClick = useCallback((feed: ExploreFeed) => {
    console.log('=== 게시물 클릭 ===', { 
      postId: feed.postId, 
      authorName: feed.authorName,
      user: user?.accountName 
    });
    // 🔥 올바른 경로로 수정: /feeds/posts/[id]
    router.push(`/feeds/posts/${feed.postId}`);
  }, [router, user]);

  // 🔥 사용자 검색 결과 - 통합 프로필 핸들러 사용
  const handleUserFound = useCallback((accountName: string) => {
    console.log('=== 사용자 검색 결과 클릭 ===', { 
      accountName, 
      currentUser: user?.accountName 
    });
    // 🔥 통합 프로필 핸들러 사용
    handleUserProfileClick(accountName, router, user, { debug: true });
  }, [router, user]);

  // 🔥 작성자 클릭 - 통합 프로필 핸들러 사용
  const handleAuthorClick = useCallback((authorAccountName: string) => {
    console.log('=== 작성자 클릭 ===', { 
      authorAccountName, 
      currentUser: user?.accountName 
    });
    // 🔥 통합 프로필 핸들러 사용
    handleUserProfileClick(authorAccountName, router, user, { debug: true });
  }, [router, user]);

  // 🔥 좋아요 토글 핸들러 (로그인 필수)
  const handleLikeToggle = useCallback(async (feed: ExploreFeed) => {
    if (!isAuthenticated || !accessToken) {
      console.log('🚨 좋아요를 위해서는 로그인이 필요합니다.');
      return;
    }

    try {
      console.log('🔥 좋아요 토글 시도:', { 
        postId: feed.postId, 
        currentLiked: feed.isLiked,
        user: user?.accountName
      });

      // 낙관적 업데이트 (UI 즉시 반영)
      setFeeds(prevFeeds => 
        prevFeeds.map(f => 
          f.postId === feed.postId 
            ? { 
                ...f, 
                isLiked: !f.isLiked, 
                likesCount: f.isLiked ? f.likesCount - 1 : f.likesCount + 1 
              }
            : f
        )
      );

      // 백엔드 API 호출
      const result = await exploreAPI.toggleLike(feed.postId);

      // 서버 응답으로 정확한 상태 업데이트
      setFeeds(prevFeeds => 
        prevFeeds.map(f => 
          f.postId === feed.postId 
            ? { 
                ...f, 
                isLiked: result.isLiked, 
                likesCount: result.likeCount 
              }
            : f
        )
      );

      console.log('✅ 좋아요 토글 성공:', result);

    } catch (error) {
      console.error('🚨 좋아요 토글 실패:', error);
      
      // 에러 발생 시 UI 원상복구
      setFeeds(prevFeeds => 
        prevFeeds.map(f => 
          f.postId === feed.postId 
            ? { 
                ...f, 
                isLiked: feed.isLiked, 
                likesCount: feed.likesCount 
              }
            : f
        )
      );

      // 에러 처리
      handleError(error, '좋아요 토글');
    }
      }, [isAuthenticated, accessToken, user, handleError]);

  // ============================================================================
  // 렌더링 (로그인 상태에 따른 조건부 렌더링)
  // ============================================================================

  // 로그인 상태 확인 중
  if (!isAuthChecked) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">로그인 상태를 확인하는 중...</p>
      </div>
    );
  }

  // 로그인되지 않은 경우 (리다이렉트 전까지 표시)
  if (!isAuthenticated || !accessToken) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <div className="text-gray-500 text-lg font-medium mb-2">로그인이 필요합니다</div>
          <p className="text-gray-600 mb-4">이 서비스를 이용하려면 로그인해주세요.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">탐색</h2>
            <p className="text-gray-600">
              모든 사용자의 다양한 게시물을 발견해보세요
              {user && (
                <span className="ml-2 text-sm text-blue-600">
                  • {user.accountName}님 환영합니다!
                </span>
              )}
            </p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
        
        {/* 사용자 검색 */}
        <div className="mt-6">
          <UserSearchBox onUserFound={handleUserFound} />
        </div>
      </div>

      {/* 에러 상태 */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <div className="text-red-500 text-lg font-medium mb-2">오류가 발생했습니다</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                다시 시도
              </button>
              {error.includes('로그인') && (
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 첫 로딩 상태 */}
      {isLoading && feeds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            새로운 게시물들을 찾는 중...
            {user && <span className="block text-sm text-gray-500 mt-1">{user.accountName}님을 위한 탐색 피드</span>}
          </p>
        </div>
      )}

      {/* 🔥 Masonry 그리드 - Instagram 스타일 */}
      {!isLoading && !error && feeds.length > 0 && (
        <div>
          {/* 통계 정보 */}
          <div className="mb-6 text-sm text-gray-500 flex items-center gap-4">
            <span>총 {feeds.length}개의 게시물</span>
            {hasNext && (
              <span className="text-blue-600">• 더 많은 게시물 로딩 가능</span>
            )}
            {user && (
              <span className="text-green-600">• {user.accountName}님 전용</span>
            )}
          </div>
          
          <RandomPhotoGrid
            photos={feeds}
            onPhotoClick={handleFeedClick}
            onAuthorClick={handleAuthorClick}
            onLikeToggle={handleLikeToggle}
            hasNextPage={hasNext}
            isLoadingMore={isLoadingMore}
            totalCount={feeds.length}
          />
          
          {/* 무한스크롤 트리거 요소 */}
          {hasNext && (
            <div
              ref={loadMoreElementRef}
              className="flex items-center justify-center py-8"
            >
              {isLoadingMore ? (
                <div className="flex flex-col items-center">
                  <LoadingSpinner size="md" />
                  <p className="mt-2 text-gray-600">더 많은 게시물을 불러오는 중...</p>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  스크롤하여 더 많은 게시물 보기
                </div>
              )}
            </div>
          )}
          
          {/* 더 이상 로드할 게시물이 없을 때 */}
          {!hasNext && feeds.length > 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-gray-500 text-sm">모든 게시물을 확인했습니다!</p>
                <button
                  onClick={handleRefresh}
                  className="mt-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                >
                  새로운 게시물 찾기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && !error && feeds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">게시물을 찾을 수 없어요</h3>
            <p className="mt-2 text-gray-500">새로고침 버튼을 눌러서 다시 시도해보세요!</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      )}

      {/* 로그아웃 버튼 (개발용) */}
      {process.env.NODE_ENV === 'development' && user && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors"
          >
            로그아웃 ({user.accountName})
          </button>
        </div>
      )}
    </div>
  )
}

export default ExploreRandom
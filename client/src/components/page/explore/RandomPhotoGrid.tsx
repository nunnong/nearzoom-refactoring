// =============================================================================
// 📁 RandomPhotoGrid.tsx - 올바른 아키텍처 원칙 완전 준수
// =============================================================================

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Masonry from 'react-masonry-css'
import { ExploreFeed } from './ExploreRandom'

// 🔥 올바른 아키텍처: api from '@/lib/axios' 사용 (인터셉터 + Zustand 토큰 + 자동 갱신)
import api from '@/lib/axios'

// 🔥 올바른 아키텍처: Zustand 토큰 스토어 (로그인 상태 관리)
import { useAuthStore } from '@/stores/authStore'

// ============================================================================
// 백엔드 API 응답 타입
// ============================================================================

interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// ============================================================================
// 컴포넌트 Props
// ============================================================================

interface RandomPhotoGridProps {
  photos: ExploreFeed[]
  onPhotoClick: (photo: ExploreFeed) => void
  onAuthorClick?: (authorId: string) => void
  onLikeToggle?: (photo: ExploreFeed) => void // 🔥 좋아요 토글 지원
  className?: string
  // 🔥 무한스크롤 관련 Props
  isLoadingMore?: boolean
  hasNextPage?: boolean
  onLoadMore?: () => void
  totalCount?: number
}

// ============================================================================
// 백엔드 좋아요 API 함수들 (로그인 필수)
// ============================================================================

const likesAPI = {
  // 🔥 POST /posts/{postId}/like - 좋아요 토글 (백엔드와 일치)
  toggleLike: async (postId: number): Promise<{ isLiked: boolean; likeCount: number }> => {
    console.log('🔥 좋아요 토글 API 요청:', { postId });

    try {
      // 🔥 올바른 아키텍처: api 인스턴스 사용 → 자동으로 인터셉터에서 토큰 처리 및 갱신
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
// 메인 컴포넌트 (로그인 필수 + 백엔드 완전 연동)
// ============================================================================

const RandomPhotoGrid: React.FC<RandomPhotoGridProps> = ({
  photos,
  onPhotoClick,
  onAuthorClick,
  onLikeToggle,
  className = '',
  isLoadingMore = false,
  hasNextPage = false,
  onLoadMore,
  totalCount,
}) => {
  // 🔥 올바른 아키텍처: Zustand 토큰 스토어에서 로그인 상태 확인
  const { 
    accessToken, 
    user,
    isAuthenticated,
    logout 
  } = useAuthStore();

  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [localPhotos, setLocalPhotos] = useState<ExploreFeed[]>(photos);
  const [likingPosts, setLikingPosts] = useState<Set<number>>(new Set());
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  
  // 무한스크롤 감지를 위한 ref
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // props 변경 시 로컬 상태 업데이트
  // ============================================================================
  
  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  // ============================================================================
  // 반응형 컬럼 설정 (디바이스별 최적화)
  // ============================================================================
  
  const breakpointColumnsObj = {
    default: 6,      // 매우 큰 화면
    1536: 5,         // 2xl
    1280: 4,         // xl
    1024: 3,         // lg
    768: 2,          // md
    640: 1,          // sm
  };

  // ============================================================================
  // 좋아요 처리 (로그인 필수 + 백엔드 연동)
  // ============================================================================
  
  const handleLikeToggle = useCallback(async (e: React.MouseEvent, feed: ExploreFeed) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    
    // 🔥 로그인 상태 확인
    if (!isAuthenticated || !accessToken) {
      console.log('🚨 좋아요를 위해서는 로그인이 필요합니다.');
      return;
    }
    
    const postId = feed.postId;
    
    // 중복 요청 방지
    if (likingPosts.has(postId)) {
      return;
    }
    
    setLikingPosts(prev => new Set([...prev, postId]));
    
    try {
      console.log('🔥 좋아요 토글 시도:', { 
        postId, 
        currentState: feed.isLiked,
        user: user?.accountName
      });
      
      // 낙관적 업데이트 (UI 즉시 반영)
      setLocalPhotos(prev => prev.map(photo => 
        photo.postId === postId 
          ? {
              ...photo,
              isLiked: !photo.isLiked,
              likesCount: photo.isLiked ? photo.likesCount - 1 : photo.likesCount + 1
            }
          : photo
      ));
      
      // 🔥 백엔드 API 호출 (인터셉터가 자동으로 토큰 처리)
      const result = await likesAPI.toggleLike(postId);
      
      // 서버 응답으로 정확한 상태 업데이트
      setLocalPhotos(prev => prev.map(photo => 
        photo.postId === postId 
          ? {
              ...photo,
              isLiked: result.isLiked,
              likesCount: result.likeCount
            }
          : photo
      ));
      
      // 🔥 부모 컴포넌트에도 변경사항 전파 (onLikeToggle이 있는 경우)
      if (onLikeToggle) {
        const updatedFeed = {
          ...feed,
          isLiked: result.isLiked,
          likesCount: result.likeCount
        };
        onLikeToggle(updatedFeed);
      }
      
      console.log('✅ 좋아요 토글 성공:', result);
      
    } catch (error: any) {
      console.error('❌ 좋아요 토글 실패:', error);
      
      // 에러 발생 시 UI 원상복구
      setLocalPhotos(prev => prev.map(photo => 
        photo.postId === postId 
          ? {
              ...photo,
              isLiked: feed.isLiked,
              likesCount: feed.likesCount
            }
          : photo
      ));
      
      // 인증 에러 처리
      if (error.message.includes('로그인이 필요')) {
        logout();
        // 로그인 페이지로 리다이렉트는 상위 컴포넌트에서 처리
      }
      
      // TODO: 토스트 메시지로 에러 표시
      console.error('좋아요 처리 중 오류가 발생했습니다:', error.message);
      
    } finally {
      setLikingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  }, [isAuthenticated, accessToken, user, likingPosts, onLikeToggle, logout]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================
  
  // 작성자 클릭 핸들러
  const handleAuthorClick = useCallback((e: React.MouseEvent, authorId: string) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    console.log('🔥 작성자 클릭:', { 
      authorId, 
      currentUser: user?.accountName 
    });
    onAuthorClick?.(authorId);
  }, [onAuthorClick, user]);

  // 이미지 로드 에러 핸들러
  const handleImageError = useCallback((feedId: string) => {
    setImageLoadErrors(prev => new Set([...prev, feedId]));
  }, []);

  // 이미지 크기 계산 (무한스크롤에 최적화)
  const getImageAspectRatio = useCallback((feed: ExploreFeed, index: number) => {
    // 시드 기반 랜덤으로 일관된 비율 생성
    const seed = feed.postId;
    const random1 = ((seed * 9301 + 49297) % 233280) / 233280;
    const random2 = ((seed * 9301 + 49297 + 1) % 233280) / 233280;
    
    const width = 200 + Math.floor(random1 * 150);  // 200-350
    const height = 250 + Math.floor(random2 * 200); // 250-450
    
    return `${width} / ${height}`;
  }, []);

  // ============================================================================
  // 무한스크롤 트리거 감지 (로그인된 사용자만)
  // ============================================================================
  
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger || !hasNextPage || isLoadingMore || !onLoadMore || !isAuthenticated) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          console.log('🔥 무한스크롤 트리거 - 더 많은 피드 로드 (로그인 사용자)');
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px', // 200px 전에 미리 로드
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isLoadingMore, onLoadMore, isAuthenticated]);

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <div className={`w-full ${className}`} ref={gridContainerRef}>
      {/* 피드 통계 정보 */}
      {totalCount !== undefined && (
        <div className="mb-6 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>총 {totalCount}개의 피드</span>
            <span>현재 {localPhotos.length}개 표시</span>
            {user && (
              <span className="text-blue-600">• {user.accountName}님 전용</span>
            )}
          </div>
          {hasNextPage && (
            <span className="text-blue-600">• 더 많은 피드 로딩 가능</span>
          )}
        </div>
      )}

      {/* Masonry 그리드 */}
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="-ml-4 flex w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {localPhotos.map((feed, index) => {
          const isLiking = likingPosts.has(feed.postId);
          const hasImageError = imageLoadErrors.has(feed.id);
          
          return (
            <div
              key={feed.id}
              className="group relative mb-4 overflow-hidden rounded-lg cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              onClick={() => onPhotoClick(feed)}
            >
              {/* 이미지 */}
              <div className="relative overflow-hidden">
                {!hasImageError ? (
                  <img
                    src={feed.photoUrl}
                    alt={feed.name || feed.description || `${feed.authorName}의 피드`}
                    className="w-full transition-all duration-300 ease-in-out group-hover:scale-105"
                    style={{
                      aspectRatio: getImageAspectRatio(feed, index),
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                    onError={() => handleImageError(feed.id)}
                  />
                ) : (
                  // 이미지 로드 실패 시 플레이스홀더
                  <div 
                    className="w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"
                    style={{
                      aspectRatio: getImageAspectRatio(feed, index),
                    }}
                  >
                    <div className="text-center text-gray-500">
                      <div className="text-2xl mb-2">📷</div>
                      <div className="text-xs">이미지를 불러올 수 없습니다</div>
                    </div>
                  </div>
                )}
                
                {/* 로딩 중일 때 스켈레톤 */}
                <div className="absolute inset-0 bg-gray-200 animate-pulse opacity-0 group-[.loading]:opacity-100 transition-opacity duration-300" />
              </div>

              {/* 호버 오버레이 */}
              <div className="absolute inset-0 bg-black/0 transition-all duration-300 ease-in-out group-hover:bg-black/40" />

              {/* 피드 정보 오버레이 */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* 작성자 정보 */}
                <div 
                  className="flex items-center space-x-2 mb-2 cursor-pointer hover:bg-white/10 rounded p-1 -m-1 transition-colors"
                  onClick={(e) => handleAuthorClick(e, feed.authorId)}
                >
                  {/* 프로필 이미지 */}
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {feed.authorAvatar ? (
                      <img
                        src={feed.authorAvatar}
                        alt={feed.authorName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `<span class="text-xs font-medium text-white">${feed.authorName.charAt(0).toUpperCase()}</span>`
                          }
                        }}
                      />
                    ) : (
                      <span className="text-xs font-medium text-white">
                        {feed.authorName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* 사용자명 */}
                  <span className="text-white text-sm font-medium truncate">
                    @{feed.authorName}
                  </span>
                </div>
                
                {/* 피드 제목/설명 */}
                {(feed.name || feed.description) && (
                  <p className="text-white/90 text-xs line-clamp-2 mb-2">
                    {feed.name || feed.description}
                  </p>
                )}

                {/* 피드 통계 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-white/80 text-xs">
                    {/* 좋아요 수 */}
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      <span>{feed.likesCount}</span>
                    </div>

                    {/* 작성 날짜 */}
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{new Date(feed.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* 🔥 좋아요 버튼 (로그인된 사용자만 표시) */}
                  {isAuthenticated && (
                    <button
                      onClick={(e) => handleLikeToggle(e, feed)}
                      disabled={isLiking}
                      className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
                        feed.isLiked 
                          ? 'bg-red-500 text-white scale-110' 
                          : 'bg-white/20 text-white hover:bg-white/30'
                      } ${isLiking ? 'animate-pulse' : ''}`}
                      title={feed.isLiked ? '좋아요 취소' : '좋아요'}
                    >
                      <svg 
                        className="w-4 h-4" 
                        fill={feed.isLiked ? "currentColor" : "none"} 
                        stroke="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* 피드 타입 배지 */}
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-black/60 rounded-full px-2 py-1 backdrop-blur-sm">
                  <span className="text-white text-xs font-medium">
                    {feed.source === 'popular' ? '🔥 인기' : 
                     feed.source === 'recent' ? '🆕 최신' : 
                     feed.source === 'recommended' ? '⭐ 추천' : '🎲 랜덤'}
                  </span>
                </div>
              </div>

              {/* 게시물 ID 표시 (개발 환경에서만) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-black/60 rounded px-2 py-1 backdrop-blur-sm">
                    <span className="text-white text-xs font-mono">
                      #{feed.postId}
                    </span>
                  </div>
                </div>
              )}

              {/* 좋아요 상태 표시 */}
              {feed.isLiked && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="bg-red-500/90 rounded-full p-2 backdrop-blur-sm">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              {/* 🔥 로그인 필요 상태 표시 (로그인되지 않은 경우) */}
              {!isAuthenticated && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-lg mb-1">🔒</div>
                    <div className="text-xs">로그인이 필요합니다</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Masonry>

      {/* 무한스크롤 트리거 요소 (로그인된 사용자만) */}
      {hasNextPage && isAuthenticated && (
        <div 
          ref={loadMoreTriggerRef}
          className="flex items-center justify-center py-8 mt-4"
        >
          {isLoadingMore ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">더 많은 피드를 불러오는 중...</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-400">스크롤하여 더 많은 피드 보기</p>
            </div>
          )}
        </div>
      )}

      {/* 더 이상 로드할 피드가 없을 때 */}
      {!hasNextPage && localPhotos.length > 0 && (
        <div className="flex items-center justify-center py-8 mt-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">🎉 모든 피드를 확인했습니다!</p>
            <p className="text-xs text-gray-400">새로고침하여 새로운 피드를 찾아보세요</p>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {localPhotos.length === 0 && !isLoadingMore && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">표시할 피드가 없습니다</h3>
            <p className="text-gray-500 text-sm">새로고침하거나 다른 카테고리를 시도해보세요</p>
            {!isAuthenticated && (
              <p className="text-blue-600 text-sm mt-2">로그인하여 더 많은 피드를 확인하세요!</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RandomPhotoGrid
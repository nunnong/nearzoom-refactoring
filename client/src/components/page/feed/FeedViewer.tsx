'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { HeartIcon, ShareIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 🔥 올바른 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// ============================================================================
// 백엔드 DTO 기반 타입 정의
// ============================================================================

// FeedDetailResponse.java 기반
interface FeedDetailResponse {
  feedId: number;
  imgUrl: string;
  caption: string;
  authorId: number;
  accountName: string;
  profileImage: string;
  createdAt: string;
  liked: boolean;
}

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string;
  data: T;
}

interface FeedViewerProps {
  userId?: number;          // 특정 사용자의 피드를 볼 때 (백엔드 userId)
  accountName?: string;     // 계정명으로 조회
  isMyFeed?: boolean;       // 내 피드인지 여부
  feedId?: number;          // 단일 피드 조회
  searchQuery?: string;     // 검색 쿼리
  type?: 'following' | 'random' | 'user' | 'search';  // 피드 타입
  className?: string;
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const feedViewerAPI = {
  // GET /feeds/users/{userId} - 특정 사용자 피드 목록
  getUserFeeds: async (userId: number, size: number = 20): Promise<FeedDetailResponse[]> => {
    const response = await api.get<ApiResponse<FeedDetailResponse[]>>(
      `/feeds/users/${userId}?size=${size}`
    );
    return response.data.data;
  },

  // GET /feeds/following - 팔로잉 피드 목록
  getFollowingFeeds: async (size: number = 20): Promise<FeedDetailResponse[]> => {
    const response = await api.get<ApiResponse<FeedDetailResponse[]>>(
      `/feeds/following?size=${size}`
    );
    return response.data.data;
  },

  // GET /feeds/random - 랜덤 피드 목록
  getRandomFeeds: async (size: number = 20): Promise<FeedDetailResponse[]> => {
    const response = await api.get<ApiResponse<FeedDetailResponse[]>>(
      `/feeds/random?size=${size}`
    );
    return response.data.data;
  },

  // GET /feeds/search - 피드 검색
  searchFeeds: async (query: string, size: number = 20): Promise<FeedDetailResponse[]> => {
    const response = await api.get<ApiResponse<FeedDetailResponse[]>>(
      `/feeds/search?query=${encodeURIComponent(query)}&size=${size}`
    );
    return response.data.data;
  },

  // GET /feeds/{feedId} - 단일 피드 조회
  getFeedDetail: async (feedId: number): Promise<FeedDetailResponse> => {
    const response = await api.get<ApiResponse<FeedDetailResponse>>(`/feeds/${feedId}`);
    return response.data.data;
  },

  // POST/DELETE /likes/{feedId} - 좋아요 토글
  toggleLike: async (feedId: number, isCurrentlyLiked: boolean): Promise<void> => {
    if (isCurrentlyLiked) {
      await api.delete(`/likes/${feedId}`);
    } else {
      await api.post(`/likes/${feedId}`);
    }
  },

  // POST/DELETE /follows/{followeeId} - 팔로우 토글
  toggleFollow: async (userId: number, isCurrentlyFollowing: boolean): Promise<void> => {
    if (isCurrentlyFollowing) {
      await api.delete(`/follows/${userId}`);
    } else {
      await api.post(`/follows/${userId}`);
    }
  },

  // GET /feeds/search - accountName으로 userId 찾기
  findUserIdByAccountName: async (accountName: string): Promise<number | null> => {
    try {
      const feeds = await feedViewerAPI.searchFeeds(accountName, 1);
      return feeds.length > 0 ? feeds[0].authorId : null;
    } catch (error) {
      console.error('Failed to find userId by accountName:', error);
      return null;
    }
  },
};

// ============================================================================
// FeedViewer 컴포넌트
// ============================================================================

const FeedViewer: React.FC<FeedViewerProps> = ({ 
  userId,
  accountName, 
  isMyFeed = false,
  feedId,
  searchQuery,
  type = 'following',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [feedItems, setFeedItems] = useState<FeedDetailResponse[]>([])
  const [selectedFeed, setSelectedFeed] = useState<FeedDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  // ============================================================================
  // 데이터 로드 함수들
  // ============================================================================

  // 피드 목록 로드
  const loadFeeds = useCallback(async (refresh: boolean = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      let feeds: FeedDetailResponse[] = [];

      if (feedId) {
        // 단일 피드 조회
        const feed = await feedViewerAPI.getFeedDetail(feedId);
        feeds = [feed];
      } else if (type === 'user' && userId) {
        // 특정 사용자 피드
        feeds = await feedViewerAPI.getUserFeeds(userId);
      } else if (type === 'user' && accountName) {
        // accountName으로 사용자 찾기
        const foundUserId = await feedViewerAPI.findUserIdByAccountName(accountName);
        if (foundUserId) {
          feeds = await feedViewerAPI.getUserFeeds(foundUserId);
        } else {
          throw new Error('사용자를 찾을 수 없습니다.');
        }
      } else if (type === 'following') {
        feeds = await feedViewerAPI.getFollowingFeeds();
      } else if (type === 'random') {
        feeds = await feedViewerAPI.getRandomFeeds();
      } else if (type === 'search' && searchQuery) {
        feeds = await feedViewerAPI.searchFeeds(searchQuery);
      }

      if (refresh) {
        setFeedItems(feeds);
      } else {
        setFeedItems(prev => [...prev, ...feeds]);
      }

      // 더 이상 로드할 피드가 없으면 hasMore를 false로 설정
      if (feeds.length < 20) {
        setHasMore(false);
      }

    } catch (err) {
      console.error('Failed to load feeds:', err);
      const errorMessage = err instanceof Error ? err.message : '피드를 불러오는데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [feedId, type, userId, accountName, searchQuery]);

  // 초기 로드
  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  // 피드 클릭 핸들러
  const handleFeedClick = useCallback((feed: FeedDetailResponse) => {
    setSelectedFeed(feed);
  }, []);

  // 🔥 백엔드 연동 - 좋아요 토글
  const handleLikeToggle = useCallback(async (feed: FeedDetailResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await feedViewerAPI.toggleLike(feed.feedId, feed.liked);
      
      // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
      setFeedItems(prev => prev.map(item => 
        item.feedId === feed.feedId 
          ? { ...item, liked: !item.liked }
          : item
      ));

      // 선택된 피드도 업데이트
      if (selectedFeed?.feedId === feed.feedId) {
        setSelectedFeed(prev => prev ? { ...prev, liked: !prev.liked } : null);
      }

    } catch (error) {
      console.error('Failed to toggle like:', error);
      // TODO: 에러 토스트 메시지 표시
    }
  }, [selectedFeed]);

  // 🔥 백엔드 연동 - 팔로우 토글 (authorId 사용)
  const handleFollowToggle = useCallback(async (feed: FeedDetailResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // TODO: 현재 팔로우 상태를 확인하는 API 필요
      // 임시로 false로 가정
      await feedViewerAPI.toggleFollow(feed.authorId, false);
      
      console.log('팔로우 토글 성공:', feed.accountName);
      // TODO: 팔로우 상태 업데이트 로직 필요

    } catch (error) {
      console.error('Failed to toggle follow:', error);
      // TODO: 에러 토스트 메시지 표시
    }
  }, []);

  // 새로고침
  const handleRefresh = useCallback(() => {
    setHasMore(true);
    loadFeeds(true);
  }, [loadFeeds]);

  // 공유 핸들러
  const handleShare = useCallback((feed: FeedDetailResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    const url = `${window.location.origin}/feed/${feed.feedId}`;
    
    if (navigator.share) {
      navigator.share({
        title: feed.caption || '피드',
        text: `${feed.accountName}의 피드`,
        url: url,
      }).catch(() => {
        // 공유 취소됨
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('링크가 클립보드에 복사되었습니다!');
      }).catch(() => {
        alert('링크 복사에 실패했습니다.');
      });
    }
  }, []);

  // ============================================================================
  // 렌더링 함수들
  // ============================================================================

  // 피드 아이템 렌더러
  const renderFeedItem = useCallback((feed: FeedDetailResponse, index: number) => {
    return (
      <div
        key={feed.feedId}
        className="relative group cursor-pointer bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
        onClick={() => handleFeedClick(feed)}
      >
        {/* 피드 이미지 */}
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <img
            src={feed.imgUrl || '/api/placeholder/400/400'}
            alt={feed.caption || '피드 이미지'}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/api/placeholder/400/400?text=Feed+Image';
            }}
          />
          
          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="flex space-x-4 text-white">
              <div className="flex items-center space-x-1">
                {feed.liked ? (
                  <HeartSolidIcon className="h-6 w-6 text-red-500" />
                ) : (
                  <HeartIcon className="h-6 w-6" />
                )}
                <span>{feed.liked ? '좋아요' : '좋아요'}</span>
              </div>
            </div>
          </div>

          {/* 피드 타입 배지 */}
          <div className="absolute top-2 left-2">
            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              {type === 'following' ? '👥 팔로잉' : 
               type === 'random' ? '🎲 랜덤' : 
               type === 'user' ? '👤 사용자' : '🔍 검색'}
            </span>
          </div>
        </div>

        {/* 피드 정보 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 flex-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                {feed.profileImage ? (
                  <img
                    src={feed.profileImage}
                    alt={feed.accountName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    {feed.accountName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-gray-900 truncate">
                {feed.accountName}
              </span>
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {new Date(feed.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          
          <p className="text-sm text-gray-800 line-clamp-2 mb-2">
            {feed.caption || '캡션이 없습니다'}
          </p>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center justify-between p-4 pt-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => handleLikeToggle(feed, e)}
              className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
            >
              {feed.liked ? (
                <HeartSolidIcon className="h-5 w-5 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
              <span className="text-sm">좋아요</span>
            </button>
            
            <button 
              onClick={(e) => handleShare(feed, e)}
              className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors"
            >
              <ShareIcon className="h-5 w-5" />
              <span className="text-sm">공유</span>
            </button>
          </div>
        </div>
      </div>
    );
  }, [handleFeedClick, handleLikeToggle, handleShare, type]);

  // ============================================================================
  // 렌더링
  // ============================================================================

  // 로딩 상태 (첫 로드)
  if (isLoading && feedItems.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 에러 상태 (첫 로드)
  if (error && feedItems.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-center ${className}`}>
        <div className="text-red-500 text-lg font-medium mb-2">오류가 발생했습니다</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => loadFeeds(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 피드가 없는 경우
  if (feedItems.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-center ${className}`}>
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📷</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          피드가 없습니다
        </h2>
        <p className="text-gray-600 mb-4">
          {isMyFeed ? '첫 번째 피드를 만들어보세요!' : '아직 업로드된 피드가 없습니다.'}
        </p>
        <button 
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`h-full overflow-y-auto ${className}`}>
      {/* 헤더 정보 */}
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {type === 'following' ? '팔로잉 피드' : 
               type === 'random' ? '랜덤 피드' : 
               type === 'user' ? `${accountName || '사용자'}의 피드` : 
               type === 'search' ? `"${searchQuery}" 검색 결과` : '피드'}
            </h1>
            <p className="text-sm text-gray-500">
              총 {feedItems.length}개의 피드
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? '새로고침...' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 에러 경고 메시지 (부분 로드 성공) */}
      {error && feedItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 mx-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-yellow-700 underline hover:text-yellow-900"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 피드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {feedItems.map((feed, index) => renderFeedItem(feed, index))}
      </div>

      {/* 피드 상세 모달 */}
      {selectedFeed && (
        <FeedDetailModal
          feed={selectedFeed}
          onClose={() => setSelectedFeed(null)}
          onLike={handleLikeToggle}
          onShare={handleShare}
        />
      )}
    </div>
  );
};

// ============================================================================
// 피드 상세 모달 컴포넌트
// ============================================================================

interface FeedDetailModalProps {
  feed: FeedDetailResponse;
  onClose: () => void;
  onLike: (feed: FeedDetailResponse, e: React.MouseEvent) => void;
  onShare: (feed: FeedDetailResponse, e: React.MouseEvent) => void;
}

const FeedDetailModal: React.FC<FeedDetailModalProps> = ({
  feed,
  onClose,
  onLike,
  onShare
}) => {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex">
          {/* 피드 이미지 영역 */}
          <div className="flex-1 bg-black flex items-center justify-center min-h-[500px]">
            <img
              src={feed.imgUrl || '/api/placeholder/600/600'}
              alt={feed.caption || '피드 이미지'}
              className="max-w-full max-h-[80vh] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/api/placeholder/600/600?text=Feed+Image';
              }}
            />
          </div>
          
          {/* 피드 정보 영역 */}
          <div className="w-80 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                  {feed.profileImage ? (
                    <img
                      src={feed.profileImage}
                      alt={feed.accountName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      {feed.accountName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{feed.accountName}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(feed.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 ml-2 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 피드 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-gray-700 whitespace-pre-wrap">
                {feed.caption || '캡션이 없습니다'}
              </p>

              {/* 피드 정보 */}
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">계정:</span>
                  <span className="text-gray-700">@{feed.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">작성일:</span>
                  <span className="text-gray-700">
                    {new Date(feed.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="border-t p-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={(e) => onLike(feed, e)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
                >
                  {feed.liked ? (
                    <HeartSolidIcon className="h-6 w-6 text-red-500" />
                  ) : (
                    <HeartIcon className="h-6 w-6" />
                  )}
                  <span>좋아요</span>
                </button>
                
                <button 
                  onClick={(e) => onShare(feed, e)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-green-500 transition-colors"
                >
                  <ShareIcon className="h-6 w-6" />
                  <span>공유</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedViewer
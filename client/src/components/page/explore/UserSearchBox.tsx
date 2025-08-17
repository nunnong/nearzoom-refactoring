// =============================================================================
// 📁 f.tsx - 올바른 아키텍처 원칙 완전 준수
// =============================================================================

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 🔥 올바른 아키텍처: api from '@/lib/axios' 사용 (인터셉터 + Zustand 토큰 + 자동 갱신)
import api from '@/lib/axios'

// 🔥 올바른 아키텍처: Zustand 토큰 스토어 (로그인 상태 관리)
import { useAuthStore } from '@/stores/authStore'

// ============================================================================
// 백엔드 API 응답 타입 정의 (백엔드와 완전 일치)
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 🔥 백엔드 FeedWithPostsResponse 타입 (백엔드와 100% 일치)
interface FeedWithPostsResponse {
  feedId: number;
  userId: number;
  accountName: string;
  profileImage: string | null;
  createdAt: string;
  posts: PostResponse[];
  isFollowing: boolean;
  // 📱 마이룸 방식: 페이징 정보
  hasNext: boolean;
  nextCursor: number | null;
}

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

// 🔥 백엔드 FeedSearchResponse 타입 (커서 기반 페이징)
interface FeedSearchResponse {
  feeds: FeedWithPostsResponse[];  // 검색된 피드들
  hasNext: boolean;                // 다음 페이지 존재 여부
  nextCursor: number | null;       // 다음 커서
}

// 프론트엔드에서 사용할 UserProfile 타입
export interface UserProfile {
  id: string;              // accountName을 id로 사용
  username: string;        // accountName
  email: string;           // 생성된 이메일
  bio?: string;            // 백엔드에서 제공하지 않음
  avatar?: string;         // profileImage
  followersCount: number;  // 기본값 0 (백엔드에서 별도 조회 필요)
  feedsCount: number;      // posts.length
  isFollowing: boolean;    // isFollowing
  isMe: boolean;           // 현재 사용자 여부
  userId: number;          // 백엔드 userId
  feedId: number;          // 백엔드 feedId
  cursor: number;          // 커서로 사용할 값 (userId)
}

interface UserSearchBoxProps {
  onUserFound: (accountName: string) => void;
  className?: string;
  maxResults?: number;     // 🔥 무한스크롤을 위한 한 번에 로드할 최대 결과 수
}

// ============================================================================
// 백엔드 API 함수들 (로그인 필수 + 커서 기반 무한스크롤)
// ============================================================================

const userSearchAPI = {
  // 🔥 GET /feeds/search?query=user&limit=10&cursor=12345 - 커서 기반 검색 (로그인 필수)
  searchUsers: async (
    query: string, 
    limit: number = 10, 
    cursor?: number
  ): Promise<FeedSearchResponse> => {
    const params: Record<string, any> = { query, limit };
    if (cursor) {
      params.cursor = cursor;
    }

    console.log('🔍 사용자 검색 API 요청 (로그인 필수):', { query, limit, cursor });

    try {
      // 🔥 올바른 아키텍처: api 인스턴스 사용 → 자동으로 인터셉터에서 토큰 처리 및 갱신
      const response = await api.get<ApiResponse<FeedSearchResponse>>(
        '/feeds/search',
        { params }
      );
      
      if (response.data.error) {
        throw new Error(response.data.message || '사용자 검색에 실패했습니다.');
      }
      
      console.log('🔍 사용자 검색 API 응답 성공:', response.data.data);
      return response.data.data;
      
    } catch (error: any) {
      console.error('🚨 사용자 검색 API 실패:', error);
      
      // 401 에러 시 로그인 페이지로 리다이렉트 (인터셉터에서 처리되지만 추가 처리)
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
      }
      
      // 403 에러 시 권한 없음
      if (error.response?.status === 403) {
        throw new Error('검색 권한이 없습니다.');
      }
      
      // 네트워크 에러
      if (!error.response) {
        throw new Error('네트워크 연결을 확인해주세요.');
      }
      
      // 기타 에러
      throw new Error(error.response?.data?.message || '사용자 검색에 실패했습니다.');
    }
  },
};

// ============================================================================
// 유틸리티 함수들
// ============================================================================

// 🔥 FeedWithPostsResponse를 UserProfile로 변환
const transformFeedToUserProfile = (
  feed: FeedWithPostsResponse, 
  currentUserAccountName?: string
): UserProfile => {
  return {
    id: feed.accountName,
    username: feed.accountName,
    email: `${feed.accountName}@nearzoom.com`, // 도메인 변경
    bio: undefined, // 백엔드에서 제공하지 않음
    avatar: feed.profileImage || undefined,
    followersCount: 0, // 백엔드에서 별도 조회 필요
    feedsCount: feed.posts?.length || 0,
    isFollowing: feed.isFollowing,
    isMe: currentUserAccountName === feed.accountName,
    userId: feed.userId,
    feedId: feed.feedId,
    cursor: feed.userId, // userId를 커서로 사용
  };
};

// ============================================================================
// 메인 컴포넌트 (로그인 필수 + 백엔드 커서 무한스크롤 완전 연동)
// ============================================================================

const UserSearchBox: React.FC<UserSearchBoxProps> = ({
  onUserFound,
  className = '',
  maxResults = 10,
}) => {
  const router = useRouter();
  
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
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🔥 무한스크롤 상태
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [totalSearched, setTotalSearched] = useState(0);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // 🔥 로그인 상태 확인
  // ============================================================================
  
  useEffect(() => {
    console.log('🔍 UserSearchBox 로그인 상태 체크:', {
      isAuthenticated,
      hasAccessToken: !!accessToken,
      user: user?.accountName
    });
  }, [isAuthenticated, accessToken, user]);

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
        errorMessage = '검색 권한이 없습니다.';
      } else if (err.message.includes('network') || err.message.includes('Network Error')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
  }, [logout, router]);

  // ============================================================================
  // 백엔드 API 연동 - 첫 페이지 검색 (로그인 필수)
  // ============================================================================
  
  const performInitialSearch = useCallback(async (searchQuery: string) => {
    // 로그인 상태 확인
    if (!isAuthenticated || !accessToken) {
      console.log('🚨 검색을 위해 로그인이 필요합니다.');
      setError('로그인이 필요합니다.');
      return;
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setError(null);
      setHasNextPage(false);
      setNextCursor(null);
      setTotalSearched(0);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      console.log('🔍 첫 페이지 검색 시작 (로그인 사용자):', {
        query: searchQuery,
        user: user?.accountName
      });

      // 🔥 백엔드 API 호출 (커서 없이 첫 페이지) - 인터셉터가 자동으로 토큰 처리
      const response = await userSearchAPI.searchUsers(searchQuery, maxResults);

      // 🔥 FeedWithPostsResponse를 UserProfile로 변환
      const userProfiles = response.feeds.map(feed => 
        transformFeedToUserProfile(feed, user?.accountName)
      );

      setSearchResults(userProfiles);
      setHasNextPage(response.hasNext);
      setNextCursor(response.nextCursor);
      setTotalSearched(userProfiles.length);
      setShowResults(true);
      
      console.log('✅ 첫 페이지 검색 완료:', {
        count: userProfiles.length,
        hasNext: response.hasNext,
        nextCursor: response.nextCursor,
        currentUser: user?.accountName
      });

    } catch (err) {
      console.error('❌ 검색 API 호출 실패:', err);
      handleError(err, '사용자 검색');
      setSearchResults([]);
      setHasNextPage(false);
      setNextCursor(null);
      setTotalSearched(0);
      setShowResults(true);
    } finally {
      setIsSearching(false);
    }
  }, [isAuthenticated, accessToken, user, maxResults, handleError]);

  // ============================================================================
  // 백엔드 API 연동 - 다음 페이지 로드 (무한스크롤)
  // ============================================================================
  
  const loadMoreResults = useCallback(async () => {
    if (!hasNextPage || !nextCursor || isLoadingMore || !query.trim() || !isAuthenticated || !accessToken) {
      return;
    }

    setIsLoadingMore(true);

    try {
      console.log('🔍 다음 페이지 로딩 시작 (무한스크롤):', { 
        cursor: nextCursor,
        user: user?.accountName
      });

      // 🔥 백엔드 API 호출 (커서 기반) - 인터셉터가 자동으로 토큰 처리
      const response = await userSearchAPI.searchUsers(query.trim(), maxResults, nextCursor);

      // 🔥 새로운 사용자들을 기존 목록에 추가
      const newUserProfiles = response.feeds.map(feed => 
        transformFeedToUserProfile(feed, user?.accountName)
      );

      setSearchResults(prev => [...prev, ...newUserProfiles]);
      setHasNextPage(response.hasNext);
      setNextCursor(response.nextCursor);
      setTotalSearched(prev => prev + newUserProfiles.length);

      console.log('✅ 다음 페이지 로딩 완료:', {
        newCount: newUserProfiles.length,
        totalCount: searchResults.length + newUserProfiles.length,
        hasNext: response.hasNext,
        nextCursor: response.nextCursor
      });

    } catch (err) {
      console.error('❌ 다음 페이지 로딩 실패:', err);
      handleError(err, '다음 페이지 로딩');
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNextPage, nextCursor, isLoadingMore, query, maxResults, isAuthenticated, accessToken, user, searchResults.length, handleError]);

  // ============================================================================
  // 무한스크롤 설정 (로그인된 사용자만)
  // ============================================================================
  
  useEffect(() => {
    if (!showResults || !hasNextPage || isLoadingMore || !isAuthenticated) {
      return;
    }

    const loadMoreElement = loadMoreTriggerRef.current;
    if (!loadMoreElement) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          console.log('🔍 무한스크롤 트리거됨 - 더 많은 사용자 로드 (로그인 사용자)');
          loadMoreResults();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [showResults, hasNextPage, isLoadingMore, isAuthenticated, loadMoreResults]);

  // ============================================================================
  // 디바운싱된 검색 실행
  // ============================================================================
  
  const debouncedSearch = useCallback((searchQuery: string) => {
    // 로그인 상태 확인
    if (!isAuthenticated || !accessToken) {
      console.log('🚨 검색을 위해 로그인이 필요합니다.');
      return;
    }

    // 이전 타이머 클리어
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 새로운 타이머 설정 (400ms 지연)
    searchTimeoutRef.current = setTimeout(() => {
      performInitialSearch(searchQuery);
    }, 400);
  }, [isAuthenticated, accessToken, performInitialSearch]);

  // ============================================================================
  // 컴포넌트 언마운트 시 타이머 클리어
  // ============================================================================
  
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 로그인 상태 확인
    if (!isAuthenticated || !accessToken) {
      console.log('🚨 검색을 위해 로그인이 필요합니다.');
      setError('로그인이 필요합니다.');
      return;
    }

    // 즉시 검색 (폼 제출 시)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    performInitialSearch(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // 로그인 상태 확인
    if (!isAuthenticated || !accessToken) {
      console.log('🚨 검색을 위해 로그인이 필요합니다.');
      setError('로그인이 필요합니다.');
      return;
    }
    
    // 디바운싱된 실시간 검색
    if (value.length >= 2) {
      debouncedSearch(value);
    } else {
      // 타이머 클리어
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      setError(null);
      setHasNextPage(false);
      setNextCursor(null);
      setTotalSearched(0);
    }
  };

  const handleUserSelect = (userProfile: UserProfile) => {
    console.log('👤 사용자 선택:', { 
      accountName: userProfile.id, 
      username: userProfile.username,
      selectedBy: user?.accountName
    });
    onUserFound(userProfile.id); // accountName 전달
    setQuery('');
    setShowResults(false);
    setSearchResults([]);
    setError(null);
    setHasNextPage(false);
    setNextCursor(null);
    setTotalSearched(0);
  };

  const handleBlur = () => {
    // 약간의 지연을 주어 클릭 이벤트가 먼저 처리되도록 함
    setTimeout(() => {
      setShowResults(false);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false);
      setQuery('');
      setError(null);
      setSearchResults([]);
      setHasNextPage(false);
      setNextCursor(null);
      setTotalSearched(0);
    }
  };

  const handleLoginClick = () => {
    const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
    router.push(`/login?redirect=${currentPath}`);
  };

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  const getUserDisplayName = (userProfile: UserProfile) => {
    return userProfile.username || userProfile.email.split('@')[0];
  };

  const formatFollowerCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toLocaleString();
  };

  // ============================================================================
  // 렌더링 (로그인 상태에 따른 조건부 렌더링)
  // ============================================================================

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (!isAuthenticated) {
                setError('로그인이 필요합니다.');
                setShowResults(true);
                return;
              }
              if (query.length >= 2 && searchResults.length > 0) {
                setShowResults(true);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={
              isAuthenticated 
                ? "사용자명(accountName)으로 검색... (최소 2글자)"
                : "로그인 후 사용자 검색이 가능합니다"
            }
            disabled={!isAuthenticated}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-colors ${
              !isAuthenticated 
                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                : 'border-gray-300'
            }`}
            autoComplete="off"
          />
          
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <LoadingSpinner size="sm" />
            ) : (
              <MagnifyingGlassIcon className={`h-5 w-5 ${!isAuthenticated ? 'text-gray-300' : 'text-gray-400'}`} />
            )}
          </div>

          {/* 🔥 로그인 상태 표시 */}
          {isAuthenticated && user && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-xs text-blue-600">
                {user.accountName}
              </span>
            </div>
          )}
        </div>
      </form>

      {/* 검색 결과 드롭다운 (로그인 상태에 따른 조건부 렌더링) */}
      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {!isAuthenticated ? (
            /* 로그인 필요 상태 */
            <div className="px-4 py-6 text-center">
              <div className="text-gray-500 text-lg mb-2">🔒</div>
              <div className="text-gray-700 text-sm font-medium mb-2">로그인이 필요합니다</div>
              <p className="text-sm text-gray-500 mb-4">
                사용자 검색을 위해서는 로그인해주세요
              </p>
              <button
                onClick={handleLoginClick}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
              >
                로그인하기
              </button>
            </div>
          ) : error ? (
            /* 에러 상태 */
            <div className="px-4 py-6 text-center">
              <div className="text-red-500 text-sm font-medium mb-1">검색 오류</div>
              <p className="text-sm text-gray-500 mb-2">{error}</p>
              {error.includes('로그인') ? (
                <button
                  onClick={handleLoginClick}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  로그인하기
                </button>
              ) : (
                <button
                  onClick={() => performInitialSearch(query)}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  다시 시도
                </button>
              )}
            </div>
          ) : searchResults.length > 0 ? (
            /* 검색 결과 목록 (무한스크롤) */
            <div>
              {/* 검색 통계 헤더 */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>{totalSearched}명의 사용자를 찾았습니다</span>
                    {user && (
                      <span className="text-blue-600">• {user.accountName}님 전용</span>
                    )}
                  </div>
                  {hasNextPage && (
                    <span className="text-blue-600">• 더 많은 결과 로딩 가능</span>
                  )}
                </div>
              </div>

              {/* 스크롤 가능한 결과 목록 */}
              <div 
                ref={resultsContainerRef}
                className="max-h-80 overflow-y-auto py-2"
              >
                <ul>
                  {searchResults.map((userProfile) => (
                    <li key={userProfile.id}>
                      <button
                        onClick={() => handleUserSelect(userProfile)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 transition-colors focus:outline-none group"
                      >
                        <div className="flex items-center space-x-3">
                          {/* 프로필 이미지 */}
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {userProfile.avatar ? (
                              <img
                                src={userProfile.avatar}
                                alt={getUserDisplayName(userProfile)}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span class="text-sm font-medium text-gray-600">${getUserDisplayName(userProfile).charAt(0).toUpperCase()}</span>`;
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-600">
                                {getUserDisplayName(userProfile).charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          
                          {/* 사용자 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-gray-900 truncate">
                                @{getUserDisplayName(userProfile)}
                              </p>
                              {userProfile.isFollowing && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  팔로잉
                                </span>
                              )}
                              {userProfile.isMe && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  나
                                </span>
                              )}
                            </div>
                            {userProfile.bio && (
                              <p className="text-sm text-gray-500 truncate">{userProfile.bio}</p>
                            )}
                            <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                              <span>팔로워 {formatFollowerCount(userProfile.followersCount)}명</span>
                              <span>•</span>
                              <span>피드 {userProfile.feedsCount}개</span>
                            </div>
                          </div>
                          
                          {/* 화살표 */}
                          <div className="text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors">
                            <svg 
                              className="w-5 h-5" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* 무한스크롤 트리거 요소 (로그인된 사용자만) */}
                {hasNextPage && isAuthenticated && (
                  <div 
                    ref={loadMoreTriggerRef}
                    className="flex items-center justify-center py-3 px-4"
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <LoadingSpinner size="sm" />
                        <span>더 많은 사용자를 불러오는 중...</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center">
                        스크롤하여 더 많은 사용자 보기
                      </div>
                    )}
                  </div>
                )}

                {/* 더 이상 로드할 사용자가 없을 때 */}
                {!hasNextPage && searchResults.length > 5 && (
                  <div className="flex items-center justify-center py-3 px-4">
                    <div className="text-xs text-gray-400 text-center">
                      🎉 모든 검색 결과를 확인했습니다!
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : !isSearching && query.length >= 2 ? (
            /* 검색 결과 없음 */
            <div className="px-4 py-6 text-center">
              <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                "{query}"와 일치하는 사용자를 찾을 수 없습니다
              </p>
              <p className="text-xs text-gray-400 mt-1">
                정확한 accountName을 입력해보세요
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* 검색 팁 (로그인 상태에 따른 조건부 표시) */}
      {query.length === 0 && showResults && isAuthenticated && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">검색 팁 ({user?.accountName})</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• 최소 2글자 이상 입력해주세요</li>
            <li>• 사용자의 accountName으로 검색됩니다</li>
            <li>• 스크롤하여 더 많은 결과를 볼 수 있습니다</li>
            <li>• ESC 키를 누르면 검색창이 닫힙니다</li>
            <li>• 로그인된 사용자만 검색 가능합니다</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserSearchBox;
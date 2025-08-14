// =============================================================================
// 📁 ExploreRandom.tsx - 백엔드 완벽 연동 버전
// =============================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import RandomPhotoGrid from './RandomPhotoGrid'
import UserSearchBox from './UserSearchBox'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 🔥 백엔드 연동 - api from '@/lib/axios' 사용
import api from '@/lib/axios'

// 🔥 timeline.ts에서 백엔드 타입과 엔드포인트 가져오기
import { 
  PostResponse,
  TIMELINE_ENDPOINTS,
  transformPostResponseToTimelinePost 
} from '@/lib/types/timeline'

// ============================================================================
// 백엔드 API 응답 타입 정의
// ============================================================================

// 백엔드 ApiResponse 표준 형식
interface ApiResponse<T> {
  error: boolean;
  message: string | null;
  data: T;
}

// 프론트엔드에서 사용할 Explore 피드 타입 (PostResponse 기반)
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
  source: 'random' | 'popular' | 'recent' | 'recommended'; // 기본값 'random'
  discoverScore?: number;   // 발견 점수 (선택적)
}

interface ExploreRandomProps {
  className?: string;
}

// ============================================================================
// 백엔드 API 함수들
// ============================================================================

const exploreAPI = {
  // 🔥 GET /feeds/explore - 모든 사용자의 게시물 랜덤 조회
  getExploreFeeds: async (size: number = 24): Promise<PostResponse[]> => {
    const response = await api.get<ApiResponse<PostResponse[]>>(
      TIMELINE_ENDPOINTS.EXPLORE,
      { params: { size } }
    );
    
    if (response.data.error) {
      throw new Error(response.data.message || 'Explore 피드를 불러올 수 없습니다.');
    }
    
    return response.data.data;
  },
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
    source: 'random', // 기본값
    discoverScore: Math.random() * 100, // 랜덤 점수
  };
};

// ============================================================================
// 메인 컴포넌트 (백엔드 완벽 연동)
// ============================================================================

const ExploreRandom: React.FC<ExploreRandomProps> = ({ className = '' }) => {
  const router = useRouter();
  
  // ============================================================================
  // 상태 관리
  // ============================================================================
  
  const [feeds, setFeeds] = useState<ExploreFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ============================================================================
  // 에러 처리 헬퍼
  // ============================================================================
  
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`Error in ${context}:`, err);
    
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    if (err instanceof Error) {
      if (err.message.includes('401') || err.message.includes('로그인이 필요')) {
        errorMessage = '로그인이 필요합니다.';
      } else if (err.message.includes('403') || err.message.includes('권한이 없습니다')) {
        errorMessage = '권한이 없습니다.';
      } else if (err.message.includes('network') || err.message.includes('Network Error')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      } else {
        errorMessage = err.message;
      }
    }
    
    setError(errorMessage);
  }, []);

  // ============================================================================
  // 백엔드 API 연동 - 랜덤 탐색 피드 로드
  // ============================================================================
  
  const loadRandomFeeds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('=== Explore 랜덤 피드 로딩 시작 ===');
      
      // 🔥 백엔드 API 호출 (GET /feeds/explore)
      const backendPosts = await exploreAPI.getExploreFeeds(24); // 24개 요청
      
      // 🔥 백엔드 PostResponse를 ExploreFeed로 변환
      const exploreFeeds = backendPosts.map(transformPostToExploreFeed);
      
      setFeeds(exploreFeeds);
      
      console.log('=== Explore 랜덤 피드 로딩 완료 ===', {
        count: exploreFeeds.length,
        feeds: exploreFeeds
      });
      
    } catch (err) {
      console.error('Failed to load random feeds:', err);
      handleError(err, 'Explore 랜덤 피드 로딩');
      setFeeds([]);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // ============================================================================
  // 첫 로드 및 새로고침 시 실행
  // ============================================================================
  
  useEffect(() => {
    loadRandomFeeds();
  }, [refreshKey, loadRandomFeeds]);

  // ============================================================================
  // 이벤트 핸들러들
  // ============================================================================
  
  // 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    console.log('=== Explore 새로고침 요청 ===');
    setRefreshKey(prev => prev + 1);
  }, []);

  // 피드 클릭 - 게시물 상세 페이지로 이동
  const handleFeedClick = useCallback((feed: ExploreFeed) => {
    console.log('=== 게시물 클릭 ===', { postId: feed.postId, authorName: feed.authorName });
    router.push(`/post/${feed.postId}`); // 🔥 게시물 상세 페이지로 이동
  }, [router]);

  // 사용자 검색 결과 - 해당 사용자 프로필로 이동
  const handleUserFound = useCallback((accountName: string) => {
    console.log('=== 사용자 검색 결과 클릭 ===', { accountName });
    router.push(`/@${accountName}`); // 🔥 사용자 프로필 페이지로 이동
  }, [router]);

  // 작성자 클릭 - 사용자 프로필로 이동
  const handleAuthorClick = useCallback((authorId: string) => {
    console.log('=== 작성자 클릭 ===', { authorId });
    router.push(`/@${authorId}`); // 🔥 작성자 프로필 페이지로 이동
  }, [router]);

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">랜덤 탐색</h2>
            <p className="text-gray-600">예상치 못한 놀라운 피드들을 발견해보세요</p>
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
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">새로운 피드들을 찾는 중...</p>
        </div>
      )}

      {/* 랜덤 피드 그리드 */}
      {!isLoading && !error && feeds.length > 0 && (
        <div>
          {/* 통계 정보 */}
          <div className="mb-6 text-sm text-gray-500">
            총 {feeds.length}개의 피드를 찾았습니다
          </div>
          
          <RandomPhotoGrid
            photos={feeds}
            onPhotoClick={handleFeedClick}
            onAuthorClick={handleAuthorClick}
          />
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && !error && feeds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">피드를 찾을 수 없어요</h3>
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

      {/* 디버그 정보 (개발 환경에서만) */}
      {process.env.NODE_ENV === 'development' && !isLoading && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">디버그 정보</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>로드된 피드 수: {feeds.length}</div>
            <div>에러 상태: {error || '없음'}</div>
            <div>새로고침 횟수: {refreshKey}</div>
            <div>API 소스: GET /feeds/explore (백엔드 연동)</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExploreRandom
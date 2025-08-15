// =============================================================================
// 📁 Timeline.tsx - 백엔드 연동 완료 (개선된 버전)
// =============================================================================

'use client'

import React, { useState, useCallback } from 'react'
import InfiniteScrollTimeline from './InfiniteScrollTimeline'
import { useAuth } from '@/hooks/auth/useAuth'

// ============================================================================
// 타입 정의
// ============================================================================

export interface TimelineProps {
  className?: string;
  type?: 'timeline' | 'explore';
  showHeader?: boolean;
  enablePullToRefresh?: boolean;
}

// ============================================================================
// Timeline 컴포넌트 (백엔드 연동 완료)
// ============================================================================

export const Timeline: React.FC<TimelineProps> = ({ 
  className = '',
  type = 'timeline',
  showHeader = true,
  enablePullToRefresh = true
}) => {
  const { isAuthenticated } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // ============================================================================
  // 이벤트 핸들러
  // ============================================================================

  // 타임라인 새로고침
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Pull-to-refresh 핸들러 (모바일 지원)
  const handlePullToRefresh = useCallback(() => {
    if (enablePullToRefresh) {
      handleRefresh();
    }
  }, [enablePullToRefresh, handleRefresh]);

  // ============================================================================
  // 조건부 렌더링 로직
  // ============================================================================

  // 로그인하지 않은 사용자가 timeline에 접근하는 경우
  if (type === 'timeline' && !isAuthenticated) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center max-w-md mx-auto px-6">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              타임라인을 보려면 로그인하세요
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              친구들의 최신 소식과 업데이트를 확인하려면 
              먼저 로그인이 필요합니다.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                로그인하기
              </button>
              
              <button
                onClick={() => window.location.href = '/explore'}
                className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                둘러보기로 이동
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* 선택적 헤더 */}
      {showHeader && (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">
                {type === 'timeline' ? '타임라인' : '탐색'}
              </h1>
              
              <div className="flex items-center space-x-2">
                {/* 새로고침 버튼 */}
                <button
                  onClick={handleRefresh}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="새로고침"
                  aria-label="타임라인 새로고침"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                {/* 타입 전환 버튼 */}
                {type === 'timeline' && (
                  <button
                    onClick={() => window.location.href = '/explore'}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    탐색
                  </button>
                )}
                
                {type === 'explore' && (
                  <button
                    onClick={() => window.location.href = '/timeline'}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    타임라인
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pull-to-refresh 영역 (모바일 지원) */}
      {enablePullToRefresh && (
        <div 
          className="touch-none select-none"
          onTouchStart={(e) => {
            // Pull-to-refresh 로직 구현 가능
            if (window.scrollY === 0) {
              // 최상단에서 아래로 당기기 시작
            }
          }}
        >
          {/* InfiniteScrollTimeline 컴포넌트 - 백엔드 API 연동 포함 */}
          <InfiniteScrollTimeline 
            key={refreshKey} // refreshKey로 강제 리렌더링
            type={type}
            className="py-6"
          />
        </div>
      )}

      {/* Pull-to-refresh 비활성화시 일반 렌더링 */}
      {!enablePullToRefresh && (
        <InfiniteScrollTimeline 
          key={refreshKey}
          type={type}
          className="py-6"
        />
      )}

      {/* 개발 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black bg-opacity-70 text-white text-xs rounded p-3 z-50 max-w-xs">
          <div className="font-semibold mb-1">🔥 Timeline 정보</div>
          <div>타입: {type}</div>
          <div>인증: {isAuthenticated ? 'Yes' : 'No'}</div>
          <div>헤더: {showHeader ? 'Yes' : 'No'}</div>
          <div>Pull-to-refresh: {enablePullToRefresh ? 'Yes' : 'No'}</div>
          <div>Refresh Key: {refreshKey}</div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 🔥 특화된 Timeline 컴포넌트들
// ============================================================================

// 사용자 타임라인 (팔로잉 피드)
export const UserTimeline: React.FC<Omit<TimelineProps, 'type'>> = (props) => {
  return <Timeline {...props} type="timeline" />;
};

// 탐색 타임라인 (모든 피드)
export const ExploreTimeline: React.FC<Omit<TimelineProps, 'type'>> = (props) => {
  return <Timeline {...props} type="explore" />;
};

// 풀스크린 타임라인 (헤더 없음)
export const FullscreenTimeline: React.FC<TimelineProps> = (props) => {
  return <Timeline {...props} showHeader={false} className="h-screen overflow-hidden" />;
};

// ============================================================================
// 🔥 Timeline 관련 유틸리티 함수들
// ============================================================================

export const getTimelineTitle = (type: 'timeline' | 'explore'): string => {
  return type === 'timeline' ? '타임라인' : '탐색';
};

export const getTimelineDescription = (type: 'timeline' | 'explore'): string => {
  return type === 'timeline' 
    ? '팔로우한 친구들의 최신 업데이트'
    : '새로운 사람들과 콘텐츠 탐색';
};

export const getTimelineEmptyMessage = (type: 'timeline' | 'explore'): string => {
  return type === 'timeline'
    ? '팔로우한 친구들의 새로운 소식이 없습니다.'
    : '탐색할 새로운 콘텐츠가 없습니다.';
};

export default Timeline;
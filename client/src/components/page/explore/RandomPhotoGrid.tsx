// =============================================================================
// 📁 RandomPhotoGrid.tsx - 백엔드 연동 버전
// =============================================================================

'use client'

import React from 'react'
import Masonry from 'react-masonry-css'
import { ExploreFeed } from './ExploreRandom' // 🔥 위에서 정의한 타입 사용

// ✅ 백엔드 연동된 타입 정의
interface RandomPhotoGridProps {
  photos: ExploreFeed[]
  onPhotoClick: (photo: ExploreFeed) => void
  onAuthorClick?: (authorId: string) => void
  className?: string
}

const RandomPhotoGrid: React.FC<RandomPhotoGridProps> = ({
  photos,
  onPhotoClick,
  onAuthorClick,
  className = '',
}) => {
  const breakpointColumnsObj = {
    default: 6,
    1536: 5,
    1280: 4,
    1024: 3,
    768: 2,
    640: 1,
  }

  // ✅ 작성자 클릭 핸들러
  const handleAuthorClick = (e: React.MouseEvent, authorId: string) => {
    e.stopPropagation() // 부모 클릭 이벤트 방지
    onAuthorClick?.(authorId)
  }

  // ✅ 이미지 크기 계산 (ExploreFeed 기반)
  const getImageAspectRatio = (feed: ExploreFeed) => {
    // 기본 비율이나 랜덤 비율 사용
    const width = 200 + Math.floor(Math.random() * 200) // 200-400
    const height = 200 + Math.floor(Math.random() * 300) // 200-500
    return `${width} / ${height}`
  }

  return (
    <div className={className}>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="-ml-4 flex w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {photos.map((feed) => (
          <div
            key={feed.id}
            className="group relative mb-4 overflow-hidden rounded-lg cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            onClick={() => onPhotoClick(feed)}
          >
            {/* 이미지 */}
            <img
              src={feed.photoUrl}
              alt={feed.name || feed.description || '사용자 피드'}
              className="w-full transition-all duration-300 ease-in-out group-hover:scale-105"
              style={{
                aspectRatio: getImageAspectRatio(feed),
                objectFit: 'cover',
              }}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/api/placeholder/300/200?text=Image+Not+Found'
              }}
            />

            {/* 호버 오버레이 */}
            <div className="absolute inset-0 bg-black/0 transition-all duration-300 ease-in-out group-hover:bg-black/40" />

            {/* 피드 정보 오버레이 */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                          parent.innerHTML = `<span class="text-xs font-medium text-white">${feed.authorName.charAt(0)}</span>`
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xs font-medium text-white">
                      {feed.authorName.charAt(0)}
                    </span>
                  )}
                </div>
                
                {/* 사용자명 */}
                <span className="text-white text-sm font-medium truncate">
                  {feed.authorName}
                </span>
              </div>
              
              {/* 피드 제목/설명 */}
              {(feed.name || feed.description) && (
                <p className="text-white/90 text-xs line-clamp-2">
                  {feed.name || feed.description}
                </p>
              )}

              {/* 피드 통계 */}
              <div className="flex items-center space-x-3 mt-2 text-white/80 text-xs">
                {/* 좋아요 수 */}
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span>{feed.likesCount}</span>
                </div>

                {/* 팔로워 수 */}
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.291a1 1 0 01-1.5 1.293l-1.5-1.5a1 1 0 011.414-1.414l1.5 1.5z" />
                  </svg>
                  <span>{feed.followersCount}</span>
                </div>

                {/* 탐색 점수 (개발 환경에서만) */}
                {process.env.NODE_ENV === 'development' && feed.discoverScore && (
                  <div className="flex items-center space-x-1">
                    <span>🎯</span>
                    <span>{Math.round(feed.discoverScore)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 피드 타입 배지 */}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-black/50 rounded-full px-2 py-1 backdrop-blur-sm">
                <span className="text-white text-xs font-medium">
                  {feed.source === 'popular' ? '🔥 인기' : 
                   feed.source === 'recent' ? '🆕 최신' : 
                   feed.source === 'recommended' ? '⭐ 추천' : '🎲 랜덤'}
                </span>
              </div>
            </div>

            {/* 클릭 효과 아이콘 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-black/50 rounded-full p-1.5 backdrop-blur-sm">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
            </div>

            {/* 좋아요 상태 표시 */}
            {feed.isLiked && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-red-500/90 rounded-full p-1 backdrop-blur-sm">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            {/* 로딩 스켈레톤 효과 */}
            <div className="absolute inset-0 bg-gray-200 animate-pulse opacity-0 group-[.loading]:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </Masonry>

      {/* 빈 상태 */}
      {photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">📷</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">표시할 피드가 없습니다</h3>
            <p className="text-gray-500 text-sm">새로고침하거나 다른 카테고리를 시도해보세요</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default RandomPhotoGrid
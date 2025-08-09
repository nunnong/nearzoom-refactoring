'use client'

import React from 'react'
import Masonry from 'react-masonry-css'
import { PhotoElement } from '@/lib/types/feed'

interface RandomPhoto extends PhotoElement {
  user: {
    id: string
    name: string
    profileImage?: string
  }
}

interface RandomPhotoGridProps {
  photos: RandomPhoto[]
  onPhotoClick: (photo: RandomPhoto) => void
  className?: string
}

const RandomPhotoGrid: React.FC<RandomPhotoGridProps> = ({
  photos,
  onPhotoClick,
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

  return (
    <div className={className}>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="-ml-4 flex w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative mb-4 overflow-hidden rounded-lg cursor-pointer"
            onClick={() => onPhotoClick(photo)}
          >
            {/* 이미지 */}
            <img
              src={photo.src}
              alt={photo.alt}
              className="w-full transition-all duration-300 ease-in-out group-hover:scale-105"
              style={{
                aspectRatio: `${photo.width} / ${photo.height}`,
                objectFit: 'cover',
              }}
              loading="lazy" // 🔥 성능 최적화 추가
              onError={(e) => {
                // 🔥 이미지 로드 실패 시 fallback
                const target = e.target as HTMLImageElement
                target.src = '/api/placeholder/300/200?text=Image+Not+Found'
              }}
            />

            {/* 호버 오버레이 */}
            <div className="absolute inset-0 bg-black/0 transition-all duration-300 ease-in-out group-hover:bg-black/40" />

            {/* 사용자 정보 오버레이 */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center space-x-2">
                {/* 프로필 이미지 */}
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {photo.user.profileImage ? (
                    <img
                      src={photo.user.profileImage}
                      alt={photo.user.name}
                      className="w-full h-full object-cover"
                      loading="lazy" // 🔥 프로필 이미지도 lazy loading
                      onError={(e) => {
                        // 🔥 프로필 이미지 로드 실패 시 fallback
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `<span class="text-xs font-medium text-white">${photo.user.name.charAt(0)}</span>`
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xs font-medium text-white">
                      {photo.user.name.charAt(0)}
                    </span>
                  )}
                </div>
                
                {/* 사용자명 */}
                <span className="text-white text-sm font-medium truncate">
                  {photo.user.name}
                </span>
              </div>
              
              {/* 캡션 */}
              {photo.alt && (
                <p className="text-white/90 text-xs mt-1 line-clamp-2">
                  {photo.alt}
                </p>
              )}
            </div>

            {/* 클릭 효과 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-black/50 rounded-full p-1.5 backdrop-blur-sm">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true" // 🔥 접근성 개선
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
          </div>
        ))}
      </Masonry>
    </div>
  )
}

export default RandomPhotoGrid
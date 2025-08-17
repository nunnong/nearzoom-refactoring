'use client'

import Image from 'next/image'

interface PhotoNavigatorProps {
  photos: string[]
  currentIndex: number
  completedPhotos: boolean[]
  className?: string
}

export default function PhotoNavigator({
  photos,
  currentIndex,
  completedPhotos,
  className = '',
}: PhotoNavigatorProps) {
  const currentPhoto = photos[currentIndex]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 진행 상황 표시 */}
      <div className="text-center">
        <h2 className="text-lg font-extrabold tracking-tight text-gray-900">
          사진 {currentIndex + 1} / {photos.length} 편집 중
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          선택한 순서대로 배경을 설정해주세요
        </p>
      </div>

      {/* 현재 사진 표시 */}
      <div className="relative mt-4">
        <div className="relative overflow-hidden rounded-lg shadow-lg w-80 h-80 mx-auto">
          <div className="aspect-square relative">
            <Image
              src={currentPhoto}
              alt={`사진 ${currentIndex + 1}`}
              fill
              className="rounded-lg object-cover"
              quality={95}
              priority
              unoptimized
            />
          </div>
          
          {/* 현재 편집 중 표시 */}
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-bold">
            편집 중
          </div>
        </div>
      </div>

      {/* 모든 사진 썸네일 진행 상황 */}
      <div className="flex justify-center space-x-2 mt-4">
        {photos.map((photo, index) => (
          <div 
            key={index} 
            className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 ${
              index === currentIndex 
                ? 'border-blue-500 shadow-md' 
                : index < currentIndex
                ? 'border-green-500' 
                : 'border-gray-300 opacity-50'
            }`}
          >
            <Image
              src={photo}
              alt={`사진 ${index + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
            
            {/* 완료 표시 */}
            {completedPhotos[index] && (
              <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            )}
            
            {/* 현재 편집 중 표시 */}
            {index === currentIndex && (
              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
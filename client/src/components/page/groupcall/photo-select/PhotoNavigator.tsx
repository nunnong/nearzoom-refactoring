'use client'

import Image from 'next/image'

interface PhotoNavigatorProps {
  photos: string[]
  currentIndex: number
  className?: string
}

export default function PhotoNavigator({
  photos,
  currentIndex,
  className = '',
}: PhotoNavigatorProps) {
  const currentPhoto = photos[currentIndex]
  // const isFirstPhoto = currentIndex === 0
  // const isLastPhoto = currentIndex === photos.length - 1

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 페이지 인디케이터 */}
      <div className="text-center mt-15">
        <h2 className="text-lg font-extrabold tracking-tight text-gray-900 text-center">
                      {currentIndex + 1} / {photos.length}
        </h2>
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center justify-center space-x-8">
        
        {/* 현재 사진 - 단순한 1:1 정사각형 */}
        <div className="relative mt-4">
          <div className="relative overflow-hidden rounded-lg shadow-lg w-80 h-80">
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
          </div>
        </div>

      </div>
    </div>
  )
}
'use client'

import Image from 'next/image'

interface PhotoNavigatorProps {
  photos: string[]
  currentIndex: number
  onPrevious: () => void
  onNext: () => void
  photoBackground?: {
    backgroundType: 'color' | 'prompt'
    backgroundValue: string
  }
  className?: string
}

export default function PhotoNavigator({
  photos,
  currentIndex,
  onPrevious,
  onNext,
  photoBackground,
  className = '',
}: PhotoNavigatorProps) {
  const currentPhoto = photos[currentIndex]
  const isFirstPhoto = currentIndex === 0
  const isLastPhoto = currentIndex === photos.length - 1

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 페이지 인디케이터 */}
      <div className="text-center">
        <span className="text-lg font-bold text-gray-700">
          {currentIndex + 1} / {photos.length}
        </span>
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center justify-center space-x-8">
        {/* 이전 버튼 */}
        <button
          onClick={onPrevious}
          disabled={isFirstPhoto}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
            isFirstPhoto
              ? 'cursor-not-allowed bg-gray-200 text-gray-400'
              : 'bg-[#2D3243] text-white shadow-lg hover:bg-[#C9D76D] hover:text-[#2D3243] active:scale-95'
          }`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* 현재 사진 */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-lg shadow-lg">
            {/* 배경 미리보기 */}
            {photoBackground && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor:
                    photoBackground.backgroundType === 'color'
                      ? photoBackground.backgroundValue
                      : '#f3f4f6',
                }}
              />
            )}

            {/* 프롬프트 배경인 경우 텍스트 표시 */}
            {photoBackground &&
              photoBackground.backgroundType === 'prompt' &&
              photoBackground.backgroundValue && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 p-4 text-sm text-white">
                  <span className="line-clamp-4 text-center">
                    {photoBackground.backgroundValue}
                  </span>
                </div>
              )}

            {/* 사진 */}
            <Image
              src={currentPhoto}
              alt={`사진 ${currentIndex + 1}`}
              width={288}
              height={288}
              className="relative z-10 rounded-lg object-cover"
              style={{
                mixBlendMode: photoBackground ? 'multiply' : 'normal',
              }}
              quality={95}
              priority
              unoptimized
            />
          </div>
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={onNext}
          disabled={isLastPhoto}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
            isLastPhoto
              ? 'cursor-not-allowed bg-gray-200 text-gray-400'
              : 'bg-[#2D3243] text-white shadow-lg hover:bg-[#C9D76D] hover:text-[#2D3243] active:scale-95'
          }`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import { XMarkIcon, ShareIcon } from '@heroicons/react/24/outline'

interface ImageItem {
  id: string
  src: string
  alt: string
}

interface ShareModalProps {
  isOpen: boolean
  image: ImageItem | null
  onClose: () => void
  onShareInstagram: (imageId: string) => void
  onShareKakao: (imageId: string) => void
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  image,
  onClose,
  onShareInstagram,
  onShareKakao,
}) => {
  if (!isOpen || !image) return null

  const handleInstagramShare = () => {
    onShareInstagram(image.id)
    onClose()
  }

  const handleKakaoShare = () => {
    onShareKakao(image.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <ShareIcon className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              공유하기
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Image Preview */}
          <div className="mb-4 flex justify-center">
            <div className="overflow-hidden rounded-lg">
              <img
                src={image.src}
                alt={image.alt}
                className="h-20 w-20 object-cover"
              />
            </div>
          </div>

          {/* Image Info */}
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-gray-900">
              "{image.alt}"
            </p>
            <p className="mt-1 text-xs text-gray-500">
              이 사진을 공유해보세요
            </p>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            {/* Instagram Share */}
            <button
              onClick={handleInstagramShare}
              className="flex w-full items-center space-x-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
                <img 
                  src="/instagram-logo.svg" 
                  alt="Instagram" 
                  className="h-6 w-6"
                />
              </div>
              <div>
                <p className="font-medium text-gray-900">인스타그램으로 공유</p>
                <p className="text-sm text-gray-500">스토리 또는 피드에 공유하기</p>
              </div>
            </button>

            {/* KakaoTalk Share */}
            <button
              onClick={handleKakaoShare}
              className="flex w-full items-center space-x-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400">
                <img 
                  src="/kakaologo.svg" 
                  alt="KakaoTalk" 
                  className="h-6 w-6"
                />
              </div>
              <div>
                <p className="font-medium text-gray-900">카카오톡으로 공유</p>
                <p className="text-sm text-gray-500">친구들과 대화방에 공유하기</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShareModal
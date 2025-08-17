'use client'

import {
  XMarkIcon,
  ShareIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import React from 'react'
import { useRouter } from 'next/navigation'

interface ImageItem {
  photoId: string
  imgUrl: string
  isLiked?: boolean
  isEdited?: boolean
  hashtags?: string[]
}

interface ShareModalProps {
  isOpen: boolean
  image: ImageItem | null
  onClose: () => void
  onShareKakao: (imageId: string) => void
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  image,
  onClose,
  onShareKakao,
}) => {
  const router = useRouter()

  if (!isOpen || !image) return null

  const handleKakaoShare = () => {
    onShareKakao(image.photoId)
    onClose()
  }

  const handleFeedCreate = () => {
    const params = new URLSearchParams({ photoId: String(image.photoId) })

    router.push(`/feed/edit?${params.toString()}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <ShareIcon className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">공유하기</h3>
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
                src={image.imgUrl}
                alt={image.imgUrl} // alt is removed from ImageItem, so pass imgUrl
                className="h-20 w-20 object-cover"
              />
            </div>
          </div>

          {/* Image Info */}
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-gray-900">
              "{image.imgUrl}"
            </p>
            <p className="mt-1 text-xs text-gray-500">이 사진을 공유해보세요</p>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            {/* Feed Create */}
            <button
              onClick={handleFeedCreate}
              className="flex w-full items-center space-x-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                <PencilSquareIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  피드 게시물 작성하기
                </p>
                <p className="text-sm text-gray-500">
                  사진과 함께 게시물을 작성해보세요
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShareModal
